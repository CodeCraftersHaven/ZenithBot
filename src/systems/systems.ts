import { capFirstLetter } from "#utils";
import { PrismaClient } from "@prisma/client";
import { Service } from "@sern/handler";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  EmbedBuilder,
  MessageActionRowComponentBuilder,
  TextChannel,
} from "discord.js";

export default class Systems {
  private db: PrismaClient = Service("@prisma/client");
  private c: Client = Service("@sern/client");
  private guildId: string;
  private channel!: TextChannel;
  private system: string;
  constructor(guildId: string, system: string, channel?: TextChannel) {
    this.guildId = guildId;
    this.system = system;
    this.channel = channel!;
  }
  async createPanel(
  ): Promise<string> {
    const existingChannel = await this.db.systems.findFirst({
      where: {
        id: this.guildId,
        systems: {
          some: {
            enabled: true,
            channels: {
              every: {
                id: this.channel.id,
              },
            },
          },
        },
      },
    });
    if (existingChannel) {
      return "This channel is already in use."
    }

    const existingSystems = await this.db.systems.findUnique({
      where: { id: this.guildId },
      select: { systems: true },
    });

    const systemExistsInChannel = existingSystems?.systems.some(
      (s) => s.name === this.system && s.channels.some((c) => c.id === this.channel.id),
    );

    if (systemExistsInChannel) {
      return "This system is already enabled in this channel."
    }

    const infoEmbed = new EmbedBuilder({
      title: "System Enabled!",
      fields: [
        {
          name: "Reason",
          value: `${capFirstLetter(this.system)} system has been set up in this channel.`,
        }
      ],
    });

    const infoButtons = ["🛑|Delete", "😍|Like", "🤮|Dislike"].map((button) => {
      const [emoji, name] = button.split("|");
      return new ButtonBuilder({
        style: name == "Delete" ? ButtonStyle.Danger : ButtonStyle.Primary,
        emoji,
        label: name,
        custom_id: `panel/${name.toLowerCase()}`,
      });
    });
    const infoRow = new ActionRowBuilder<ButtonBuilder>({
      components: infoButtons,
    });

    const embed: EmbedBuilder = new EmbedBuilder()
      .setTitle("Tickets")
      .setDescription("Click 📩 to open a ticket")
      .setColor("Random");
    const openTicket = new ButtonBuilder()
      .setCustomId("tickets/open")
      .setLabel("Open Ticket")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("📩");
    const checkTicket = new ButtonBuilder()
      .setCustomId("tickets/check")
      .setLabel("Check Ticket")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("✅");
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      openTicket,
      checkTicket,
    );

    try {
      if (this.system === "tickets") {
        await this.sendMessages(this.channel, [infoEmbed, infoRow], [embed, row]);
      } else {
        await this.sendMessages(this.channel, [infoEmbed, infoRow]);
      }

      await this.db.systems.update({
        where: { id: this.guildId },
        data: {
          systems: {
            updateMany: {
              where: { name: this.system },
              data: {
                enabled: true,
                name: this.system,
                channels: {
                  set: [
                    {
                      id: this.channel.id,
                      name: this.channel.name,
                    },
                  ],
                },
              },
            },
          },
        },
      });
    } catch (error: any) {
      return `Failed to update database or send panel(s) to <#${this.channel.id}>. Please let <@342314924804014081> know this error: 
        ${error.message}`
    }
    return `Enabled ${capFirstLetter(this.system)} system in <#${this.channel.id}>`
  }

  async clearPanel(): Promise<string> {
    const infoEmbed = new EmbedBuilder({
      title: "System Disabled!",
      fields: [
        {
          name: "Reason",
          value: `${capFirstLetter(this.system)} has been disabled for this server!`,
        }
      ],
    });
    const currentSystem = await this.db.systems.findMany({
      where: {
        id: this.guildId,
        systems: { some: { name: this.system, enabled: true } },
      },
    });
    const channelData = currentSystem[0]?.systems.find(
      (s) => s.name === this.system,
    )?.channels;
    channelData?.forEach(async (c) => {
      const channel = (await this.c.channels.fetch(c.id)) as TextChannel;
      await channel.messages.fetch({ limit: 100 }).then(async (messages) => {
        if (!messages) return;
        const clientMessages = messages.filter(
          (msg) => msg.author.id === this.c.user?.id && msg.embeds,
        );
        clientMessages.forEach(async (msg) => {
          if (msg && msg.deletable) {
            await msg.delete();
          }
        });
        const rep = await channel.send({ embeds: [infoEmbed] });
        setTimeout(async () => {
          await rep.delete();
        }, 6e4);
      });
    });

    await this.db.systems.update({
      where: { id: this.guildId },
      data: {
        systems: {
          updateMany: {
            where: { name: this.system },
            data: { enabled: false, channels: [] },
          },
        },
      },
    });


    return `Disabled ${capFirstLetter(this.system)} system`

  }
  async sendMessages(
    channel: TextChannel,
    ...pairs: [
      EmbedBuilder,
      ActionRowBuilder<MessageActionRowComponentBuilder>,
    ][]
  ) {
    for (const [embed, components] of pairs) {
      await channel.send({ embeds: [embed], components: [components] });
    }
  }
}

export type systems = typeof Systems;
