import { capFirstLetter, logger } from "#utils";
import { PrismaClient } from "@prisma/client";
import { Service } from "@sern/handler";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Message,
  MessageActionRowComponentBuilder,
  TextChannel,
} from "discord.js";

export default class Systems {
  private db: PrismaClient = Service("@prisma/client");
  private guildId: string;
  private guildName: string;
  private channel!: TextChannel;
  private system: string;
  constructor(
    guildId: string,
    guildName: string,
    system: string,
    channel?: TextChannel,
  ) {
    this.guildId = guildId;
    this.system = system;
    this.guildName = guildName;
    this.channel = channel!;
  }
  async createPanel(): Promise<string> {
    try {
      const existingChannel = await this.db.systems.findFirst({
        where: {
          id: this.guildId,
          systems: {
            some: {
              enabled: true,
              channels: { some: { id: this.channel.id } },
            },
          },
        },
      });

      if (existingChannel) {
        return "This channel is already in use.";
      }

      const existingData = await this.db.systems.findUnique({
        where: { id: this.guildId },
        select: { systems: true },
      });

      let systems = existingData?.systems || [];
      const systemIndex = systems.findIndex((s) => s.name === this.system);
      const systemExistsInChannel =
        systemIndex !== -1 &&
        systems[systemIndex].channels.some((c) => c.id === this.channel.id);

      if (systemExistsInChannel) {
        return "This system is already enabled in this channel.";
      }

      const sentMessages = await this.formPanelEmbed();

      const messageIds = sentMessages.map((msg) => {
        return { id: msg.id };
      });

      if (systemIndex !== -1) {
        systems[systemIndex].enabled = true;
        const channelIndex = systems[systemIndex].channels.findIndex(
          (c) => c.id === this.channel.id,
        );

        if (channelIndex !== -1) {
          systems[systemIndex].channels[channelIndex].messages.push(
            ...messageIds,
          );
        } else {
          systems[systemIndex].channels.push({
            id: this.channel.id,
            name: this.channel.name,
            messages: messageIds,
          });
        }
      } else {
        systems.push({
          name: this.system,
          enabled: true,
          channels: [
            {
              id: this.channel.id,
              name: this.channel.name,
              messages: messageIds,
            },
          ],
        });
      }

      await this.db.systems
        .update({
          where: { id: this.guildId },
          data: { systems: { set: systems } },
        })
        .catch(async () => {
          await this.db.systems.create({
            data: { id: this.guildId, name: this.guildName, systems: systems },
          });
        });

      return `${capFirstLetter(this.system)} system has been enabled in <#${this.channel.id}>. Please update channel permissions if needed.`;
    } catch (error: any) {
      return `Failed to update database or send panel(s) to <#${this.channel.id}>. Error: ${error.message == "Missing Permissions"
          ? "I can't view that channel or send messages in that channel. Please update my roles/permissions to use that channel."
          : error.message
        }`;
    }
  }

  async clearPanel(): Promise<string> {
    try {
      const systemData = await this.db.systems.findFirst({
        where: { id: this.guildId },
        select: { systems: true },
      });

      if (!systemData) {
        return "No system data found for this guild.";
      }

      const systemIndex = systemData.systems.findIndex(
        (s) => s.name === this.system,
      );

      if (systemIndex === -1) {
        return "System not found.";
      }

      const channelIndex = systemData.systems[systemIndex].channels.findIndex(
        (c) => c.id === this.channel.id,
      );

      if (channelIndex === -1) {
        return "This channel does not have any stored messages.";
      }

      const messages =
        systemData.systems[systemIndex].channels[channelIndex].messages;

      if (messages.length) {
        for (const message of messages) {
          try {
            const msg = await this.channel.messages.fetch(message.id);
            if (msg) await msg.delete();
          } catch (error: any) {
            logger.warn(
              `Failed to delete message ${message}: ${error.message}`,
            );
          }
        }

        systemData.systems[systemIndex].channels[channelIndex].messages = [];
      }

      systemData.systems[systemIndex].enabled = false;
      systemData.systems[systemIndex].channels = [];

      await this.db.systems.update({
        where: { id: this.guildId },
        data: { systems: { set: systemData.systems } },
      });

      const confirmationEmbed = new EmbedBuilder()
        .setDescription(
          `✅ Successfully disabled the panel ${capFirstLetter(this.system)}.`,
        )
        .setColor("Green");

      const confirmationMessage = await this.channel.send({
        embeds: [confirmationEmbed],
      });

      setTimeout(() => {
        confirmationMessage.delete().catch(() => {
          return "System has been disabled.";
        });
      }, 60000);

      if (this.system === "autorole") {
        await this.db.autorole.delete({
          where: { id: this.guildId },
        });
      }

      return `Disabled panel in <#${this.channel.id}>.`;
    } catch (error: any) {
      console.error(error);
      return `Failed to disable panel. Error: ${error.message}`;
    }
  }

  async addChannel(): Promise<string> {
    try {
      const existingData = await this.db.systems.findFirst({
        where: {
          id: this.guildId,
          systems: { some: { enabled: true, name: this.system } },
        },
      });
      if (!existingData) {
        return "This system is not enabled in this guild.";
      }
      const systemIndex = existingData.systems.findIndex(
        (s) => s.name === this.system,
      );
      if (systemIndex === -1) {
        return "System not found.";
      }
      const channelIndex = existingData.systems[systemIndex].channels.findIndex(
        (c) => c.id === this.channel.id,
      );
      if (channelIndex !== -1) {
        return "This channel is already added to this system.";
      }

      const sentMessages = await this.formPanelEmbed();

      const messageIds = sentMessages.map((msg) => {
        return { id: msg.id };
      });

      existingData.systems[systemIndex].channels.push({
        id: this.channel.id,
        name: this.channel.name,
        messages: messageIds,
      });
      await this.db.systems.update({
        where: { id: this.guildId },
        data: { systems: { set: existingData.systems } },
      });
      return `Added <#${this.channel.id}> to the ${this.system} system.`;
    } catch (error: any) {
      return `Failed to add channel. Error: ${error.message}`;
    }
  }

  async removeChannel(): Promise<string> {
    try {
      const existingData = await this.db.systems.findFirst({
        where: {
          id: this.guildId,
          systems: { some: { enabled: true, name: this.system } },
        },
      });
      if (!existingData) {
        return "This system is not enabled in this guild.";
      }
      const systemIndex = existingData.systems.findIndex(
        (s) => s.name === this.system,
      );
      if (systemIndex === -1) {
        return "System not found.";
      }
      const channelIndex = existingData.systems[systemIndex].channels.findIndex(
        (c) => c.id === this.channel.id,
      );
      if (channelIndex === -1) {
        return "This channel is not added to this system.";
      }
      const messages =
        existingData.systems[systemIndex].channels[channelIndex].messages;
      if (messages.length) {
        for (const message of messages) {
          try {
            const msg = await this.channel.messages.fetch(message.id);
            if (msg) await msg.delete();
          } catch (error: any) {
            logger.warn(
              `Failed to delete message ${message.id}: ${error.message}`,
            );
          }
        }
      }
      const systems = JSON.parse(JSON.stringify(existingData.systems));
      systems[systemIndex].channels.splice(channelIndex, 1);
      if (systems[systemIndex].channels.length === 0) {
        systems[systemIndex].enabled = false;
      }
      await this.db.systems.update({
        where: { id: this.guildId },
        data: { systems: { set: systems } },
      });
      const confirmationEmbed = new EmbedBuilder()
        .setDescription(
          `✅ Successfully disabled the panel ${capFirstLetter(this.system)}.`,
        )
        .setColor("Green");

      const confirmationMessage = await this.channel.send({
        embeds: [confirmationEmbed],
      });

      setTimeout(() => {
        confirmationMessage.delete().catch(() => {
          return "System has been disabled.";
        });
      }, 60000);

      if (this.system === "autorole") {
        await this.db.autorole.delete({
          where: { id: this.guildId },
        });
      }
      
      return `Disabled panel in <#${this.channel.id}>.`;
    } catch (error: any) {
      return `Failed to remove channel. Error: ${error.message}`;
    }
  }

  private async formPanelEmbed() {
    const infoEmbed = new EmbedBuilder()
      .setTitle("System Enabled!")
      .setDescription(
        `${capFirstLetter(this.system)} system has been enabled in this channel.\nPlease send me your feedback with the buttons below!`,
      );

    const infoButtons = ["🛑|Delete", "😍|Like", "🤮|Dislike"].map((button) => {
      const [emoji, name] = button.split("|");
      return new ButtonBuilder({
        style: name === "Delete" ? ButtonStyle.Danger : ButtonStyle.Primary,
        emoji,
        label: name,
        custom_id: `panel/${name.toLowerCase()}`,
      });
    });

    const infoRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      ...infoButtons,
    );

    const ticketEmbed = new EmbedBuilder()
      .setTitle("Tickets")
      .setDescription("Click 📩 to open a ticket")
      .setColor("Random");

    const ticketButtons = ["📩|Open", "✅|Check"].map((button) => {
      const [emoji, name] = button.split("|");
      return new ButtonBuilder({
        style: name === "Open" ? ButtonStyle.Primary : ButtonStyle.Success,
        emoji,
        label: name,
        custom_id: `tickets/${name.toLowerCase()}`,
      });
    });

    const ticketRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      ...ticketButtons,
    );

    const autoroleEmbed = new EmbedBuilder()
      .setTitle("Auto Role")
      .setDescription("Click ⚙️ to set or update the auto role")
      .setColor("Random");

    const autoroleButtons = ["⚙️|Update", "✅|Check"].map((button) => {
      const [emoji, name] = button.split("|");
      return new ButtonBuilder({
        style: name === "Update" ? ButtonStyle.Primary : ButtonStyle.Success,
        emoji,
        label: name,
        custom_id: `autorole/${name.toLowerCase()}`,
      });
    });

    const autoroleRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      ...autoroleButtons,
    );

    const INFO: [
      EmbedBuilder,
      ActionRowBuilder<MessageActionRowComponentBuilder>,
    ] = [infoEmbed, infoRow],
      TICKET: [
        EmbedBuilder,
        ActionRowBuilder<MessageActionRowComponentBuilder>,
      ] = [ticketEmbed, ticketRow],
      AUTOROLE: [
        EmbedBuilder,
        ActionRowBuilder<MessageActionRowComponentBuilder>,
      ] = [autoroleEmbed, autoroleRow];

    const sentMessages =
      this.system === "tickets"
        ? await this.sendMessages(this.channel, INFO, TICKET)
        : this.system === "autorole"
          ? await this.sendMessages(this.channel, INFO, AUTOROLE)
          : await this.sendMessages(this.channel, INFO);

    const messageIds = sentMessages.map((msg) => {
      return { id: msg.id };
    });

    return messageIds;
  }

  async sendMessages(
    channel: TextChannel,
    ...pairs: [
      EmbedBuilder,
      ActionRowBuilder<MessageActionRowComponentBuilder>,
    ][]
  ): Promise<Message[]> {
    const sentMessages: Message[] = [];

    for (const [embed, components] of pairs) {
      const sent = await channel.send({
        embeds: [embed],
        components: [components],
      });
      sentMessages.push(sent);
    }

    return sentMessages;
  }
}

export type systems = typeof Systems;
