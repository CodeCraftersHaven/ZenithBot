import { PrismaClient } from "@prisma/client";
import { Service } from "@sern/handler";
import { Client, EmbedBuilder, Role, TextChannel } from "discord.js";

export default class SelfRoles {
  private db: PrismaClient = Service("@prisma/client");
  private c: Client = Service("@sern/client");
  enabled: boolean;
  constructor(enabled: boolean = false) {
    this.enabled = enabled;
  }

  private async getGuildDoc(guildId: string) {
    return await this.db.selfRoles.findFirst({ where: { id: guildId } });
  }

  private async getGuildMessages(guildId: string) {
    const doc = await this.getGuildDoc(guildId);
    if (doc) {
      return doc.messages;
    } else {
      return null;
    }
  }

  async fetchMessage(guildId: string, channelId: string, messageId: string) {
    try {
      const guild = await this.c.guilds.fetch(guildId)!;
      const channel = (await guild.channels.fetch(channelId)) as TextChannel;
      const message = await channel.messages.fetch(messageId);
      return message;
      // eslint-disable-next-line
    } catch (_) {
      return "Could not fetch message to edit.";
    }
  }

  async createDBdoc(guildId: string) {
    const existingDoc = await this.getGuildDoc(guildId);
    if (!existingDoc) {
      await this.db.selfRoles.create({
        data: {
          id: guildId,
        },
      });
    }
  }

  async createMessage(
    guildId: string,
    messageId: string,
    channelId: string,
    title: string,
    description: string,
    roles: Role[],
  ) {
    const existingDoc = await this.getGuildDoc(guildId);
    if (existingDoc) {
      await this.db.selfRoles
        .upsert({
          where: { id: guildId },
          update: {
            messages: {
              push: {
                id: messageId,
                channelId: channelId,
                title,
                description,
                roles: roles.map((r) => ({ id: r.id, name: r.name })),
              },
            },
          },
          create: {
            id: guildId,
            messages: {
              set: {
                id: messageId,
                channelId: channelId,
                description,
                title,
                roles: roles.map((r) => ({ id: r.id, name: r.name })),
              },
            },
          },
        })
        .then(async () => {
          return `Message upserted successfully:
        {
          id: ${messageId},
          title: ${title},
          roles: [${roles.map((r) => r.id + ": " + r.name).join(", ")}]
        }`;
        });
    }
  }

  async editMessage(
    guildId: string,
    channelId: string,
    messageId: string,
    title?: string,
    description?: string,
  ) {
    const message = (await this.getGuildMessages(guildId))?.some(
      (m) => m.id === messageId,
    );
    if (!message) {
      return "Message not found, could not edit";
    } else {
      const toEdit = await this.db.selfRoles.findFirst({
        where: { id: guildId, messages: { some: { id: messageId } } },
      });
      await this.db.selfRoles.update({
        where: { id: guildId },
        data: {
          messages: {
            updateMany: {
              where: { id: messageId },
              data: {
                title: title ? title : toEdit?.messages[0].title,
                description: description
                  ? description
                  : toEdit?.messages[0].description,
              },
            },
          },
        },
      });
      const edit = await this.fetchMessage(
        guildId,
        toEdit!.messages[0].channelId,
        messageId,
      );
      if (typeof edit !== "string") {
        const embed = EmbedBuilder.from(edit.embeds[0]);
        const newEmbed = new EmbedBuilder(embed.data).setTitle(
          title ? title : embed.data.title!,
        );
        if (description) {
          newEmbed.setDescription(description);
        }
        await edit.edit({ embeds: [newEmbed] });
      }
      return "Message updated successfully";
    }
  }

  async deleteMessage(guildId: string, messageId: string) {
    const message = (await this.getGuildMessages(guildId))?.some(
      (m) => m.id === messageId,
    );
    if (!message) {
      return "Message not found, could not delete";
    } else {
      await this.db.selfRoles.update({
        where: { id: guildId, messages: { some: { id: messageId } } },
        data: {
          messages: {
            deleteMany: { where: { id: messageId } },
          },
        },
      });
    }
  }

  async addRole(guildId: string, messageId: string, role: Role) {
    const messages = await this.getGuildMessages(guildId);
    const message = messages?.some((m) => m.id === messageId);
    if (!message) {
      return "Message not found, could not add role";
    } else {
      const existingRole = await this.db.selfRoles.findFirst({
        where: {
          id: guildId,
          messages: {
            some: { id: messageId, roles: { some: { id: role.id } } },
          },
        },
      });
      if (existingRole) {
        return `Role ${role.name} already exists in message ${messageId}, could not add role.`;
      } else {
        await this.db.selfRoles.update({
          where: { id: guildId, messages: { some: { id: messageId } } },
          data: {
            messages: {
              updateMany: {
                where: { id: messageId },
                data: {
                  roles: { push: { id: role.id, name: role.name } },
                },
              },
            },
          },
        });
        const edit = await this.fetchMessage(
          guildId,
          messageId.split("-")[0],
          messageId,
        );
        if (typeof edit !== "string") {
          const currentContent = edit.content;
          const newContent = currentContent + `\n${role.name}`;
          await edit.edit(newContent);
        }
        return `Role ${role.name} added to message ${messageId} successfully.`;
      }
    }
  }
  // eslint-disable-next-line
  async removeRole(guildId: string, roleId: string) {}
  // eslint-disable-next-line
  async getRole(guildId: string, roleId: string) {}
  // eslint-disable-next-line
  async getRolesForUser(guildId: string, userId: string) {}
}
export type selfroles = typeof SelfRoles;
