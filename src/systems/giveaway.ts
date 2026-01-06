import { PrismaClient } from "@prisma/client";
import { Service } from "@sern/handler";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  EmbedBuilder,
  TextChannel,
} from "discord.js";
import { createWriteStream } from "fs";

export default class Giveaways {
  private winner: string[] | null = null;
  private db: PrismaClient = Service("@prisma/client");
  private c: Client = Service("@sern/client");
  enabled: boolean;
  constructor(enabled: boolean = false) {
    this.enabled = enabled;
  }
  async addParticipantToDb(
    messageId: string,
    participant: Entry,
  ): Promise<void> {
    const existingParticipants = await this.getParticipantsFromDb(messageId);
    if (existingParticipants.some((p) => p.userId === participant.userId)) {
      return;
    }
    await this.db.giveaway.update({
      where: { messageId },
      data: { entries: { push: participant } },
    });
  }

  async removeParticipantFromDb(
    messageId: string,
    participant: Entry,
  ): Promise<void> {
    const giveaway = await this.getGiveaway(messageId)!;
    if (giveaway) {
      const existingParticipants = await this.getParticipantsFromDb(messageId);
      if (!existingParticipants.some((p) => p.userId === participant.userId)) {
        return;
      }
      const updatedParticipants = giveaway.entries.filter(
        (p) => p.userId !== participant.userId,
      );
      await this.db.giveaway.update({
        where: { messageId },
        data: { entries: updatedParticipants },
      });
    }
  }

  async getParticipantsFromDb(messageId: string): Promise<Entry[]> {
    const giveaway = await this.getGiveaway(messageId);
    return giveaway!.entries;
  }

  async drawWinnersFromDb(messageId: string, count: number): Promise<string[]> {
    const participants = (await this.getParticipantsFromDb(messageId)) || [];
    if (participants.length === 0 || count <= 0) {
      return [];
    }
    const winners = new Set<string>();
    while (winners.size < count && winners.size < participants.length) {
      const randomIndex = Math.floor(Math.random() * participants.length);
      winners.add(participants[randomIndex].userId);
    }
    this.winner = Array.from(winners).map((x) => `<@${x}>`);
    await this.db.giveaway.update({
      where: { messageId },
      data: { winners: Array.from(winners) },
    });
    return Array.from(winners);
  }

  async getGiveaway(messageId: string) {
    const giveaway = await this.db.giveaway.findUnique({
      where: { messageId },
    })!;
    return giveaway;
  }

  async deleteGiveaway(messageId: string, userId: string) {
    const giveaway = await this.getGiveaway(messageId);
    if (!giveaway) return;
    const interval = giveaway.interval;
    const channel = (await this.c.channels.fetch(
      giveaway.channelId,
    )) as TextChannel;
    const giveawayMessage = await channel.messages.fetch(giveaway.messageId);
    if (!giveawayMessage) return this.log("Giveaway message already deleted.");
    const host = giveawayMessage.embeds[0].footer?.text;
    if (userId !== host) {
      return clearTimeout(interval);
    }
  }
  async getGiveawayChannel(messageId: string) {
    const giveaway = await this.getGiveaway(messageId);

    return this.c.channels.cache.get(giveaway!.channelId) as TextChannel;
  }

  async rerollWinners(messageId: string): Promise<string[]> {
    const giveaway = await this.getGiveaway(messageId);
    if (!giveaway) {
      throw new Error("Giveaway not found");
    }
    const count = giveaway.winnerSize;
    const participants = await this.getParticipantsFromDb(messageId);
    if (participants.length === 0 || count <= 0) {
      return [];
    }

    const winners = new Set<string>();
    while (winners.size < count && winners.size < participants.length) {
      const randomIndex = Math.floor(Math.random() * participants.length);
      winners.add(participants[randomIndex].userId);
    }

    this.winner = Array.from(winners).map((x) => `<@${x}>`);
    await this.db.giveaway.update({
      where: { messageId },
      data: { winners: Array.from(winners) },
    });

    const channel = await this.getGiveawayChannel(messageId);
    const msg = await channel.messages.fetch(messageId);
    const embed = msg.embeds[0];
    const newEmbed = new EmbedBuilder(EmbedBuilder.from(embed).toJSON());

    const winnersField = embed.fields.find((f) =>
      f.name.toLowerCase().includes("winners"),
    );
    const endingField = embed.fields.find(
      (f) => f.name.toLowerCase() === "\u200b",
    );
    if (winnersField && endingField) {
      this.log(endingField);
      winnersField.value = this.winner.join(", ");
      endingField.value = "Already Ended";
      newEmbed.setFields(embed.fields);
      const claimButton = new ButtonBuilder({
        custom_id: "giveaways/claim",
        label: "Claim!",
        style: ButtonStyle.Success,
      });
      const reRollButton = new ButtonBuilder({
        custom_id: "giveaways/reroll",
        label: "Reroll Giveaway",
        style: ButtonStyle.Success,
      });
      const claimRow = [
        new ActionRowBuilder<ButtonBuilder>({
          components: [claimButton, reRollButton],
        }),
      ];
      await msg.edit({ embeds: [newEmbed], components: claimRow });
    }

    return Array.from(winners);
  }

  log(message: string | object) {
    const logFile = createWriteStream("response.log", { flags: "a" });
    const timestamp = new Date().toISOString();

    if (typeof message === "object") {
      logFile.write(`[${timestamp}] ${JSON.stringify(message, null, 2)}\n`);
    } else {
      console.log(message);
      logFile.write(`[${timestamp}] ${message}\n`);
    }
  }
  async createTimers(interval: number, options: Opts) {
    if (interval < 0) return;
    const claimButton = new ButtonBuilder({
      custom_id: "giveaways/claim",
      label: "Claim!",
      style: ButtonStyle.Success,
    });
    const reRollButton = new ButtonBuilder({
      custom_id: "giveaways/reroll",
      label: "Reroll Giveaway",
      style: ButtonStyle.Success,
    });
    const claimRow = new ActionRowBuilder<ButtonBuilder>({
      components: [claimButton, reRollButton],
    });

    return setTimeout(async () => {
      const giveawayWinners = await this.drawWinnersFromDb(
        options.messageId,
        options.winnerSize,
      );
      const channel = (await this.c.channels.fetch(
        options.channelId,
      )) as TextChannel;
      const msg = await channel?.messages
        .fetch(options.messageId)
        .catch(() => null);
      if (!msg) {
        this.log(`Message with ID ${options.messageId} not found.`);
        await this.db.giveaway.delete({
          where: { messageId: options.messageId },
        });
        return;
      }

      const winnerMentions = giveawayWinners.map((w) => `<@${w}>`).join(", ");

      const embed = msg.embeds[0];
      const newEmbed = new EmbedBuilder(EmbedBuilder.from(embed).toJSON());
      const winnersField = embed.fields.find((f) =>
        f.name.toLowerCase().includes("winners"),
      );
      if (winnersField) {
        this.log(winnersField);
        if (!giveawayWinners || giveawayWinners.length === 0) {
          const newFields = embed.fields.filter(
            (f) =>
              f.name.toLowerCase() !== "winners" &&
              !f.name.toLowerCase().includes(" "),
          );
          newEmbed.setTitle("Giveaway has Ended!");
          newEmbed.setFields(newFields);
          await msg.edit({ embeds: [newEmbed], components: [] }).then((m) =>
            setTimeout(async () => {
              await m.delete().catch(() => {});
              await this.db.giveaway.delete({ where: { messageId: m.id } });
            }, 5000),
          );
          return;
        } else if (giveawayWinners.length > 0) {
          winnersField.value = winnerMentions;
          newEmbed.setTitle("Giveaway has Ended!");
          newEmbed.setFields(embed.fields);
          return await msg.edit({ embeds: [newEmbed], components: [claimRow] });
        }
        return newEmbed;
      }
      clearTimeout(options.interval);
    }, interval);
  }
}
type Entry = { userId: string };
type Opts = {
  messageId: string;
  prize: string;
  winnerSize: number;
  channelId: string;
  host: string;
  interval: number;
};

export type giveaway = typeof Giveaways;
