import { findSystem } from "#utils";
import { PrismaClient } from "@prisma/client";
import { Service } from "@sern/handler";
import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  GuildMember,
  Message,
} from "discord.js";

export default class AntiScam {
  private prisma: PrismaClient;
  private message: Message;
  private userCache: Map<string, CachedMessage>;

  constructor(message: Message, userCache: Map<string, CachedMessage>) {
    this.message = message;
    this.prisma = Service("@prisma/client");
    this.userCache = userCache;
    this.handleAntiScam();
  }
  get UserCache() {
    return this.userCache;
  }
  async timeoutMember(member: GuildMember, operator: GuildMember) {
    if (!this.message.guild?.members.me?.permissions.has("ModerateMembers")) {
      return "I don't have the manage members permission.";
    }
    if (!operator.permissions.has("ModerateMembers")) {
      return "You don't have the manage members permission.";
    }
    await member.timeout(24 * 60 * 60 * 1000, "Scam attempt detected.");
    return `I have timed out <@${member.id}> for 24 hours.`;
  }

  async removeTimeout(member: GuildMember, operator: GuildMember) {
    if (!this.message.guild?.members.me?.permissions.has("ModerateMembers")) {
      return "I don't have the manage members permission.";
    }
    if (!operator.permissions.has("ModerateMembers")) {
      return "You don't have the manage members permission.";
    }
    await member.timeout(null, "Scam attempt overturned.");
    return `I have removed the timeout from <@${member.id}>.`;
  }

  async kickMember(member: GuildMember, operator: GuildMember) {
    if (!this.message.guild?.members.me?.permissions.has("KickMembers")) {
      return "I don't have the kick members permission.";
    }
    if (!operator.permissions.has("KickMembers")) {
      return "You don't have the kick members permission.";
    }
    await member.kick("This user was a scammer.");
    return `I have kicked <@${member.id}>.`;
  }

  async banMember(member: GuildMember, operator: GuildMember) {
    if (!this.message.guild?.members.me?.permissions.has("BanMembers")) {
      return "I don't have the ban members permission.";
    }
    if (!operator.permissions.has("BanMembers")) {
      return "You don't have the ban members permission.";
    }
    await member.ban({ reason: "This user was a scammer." });
    return `I have banned <@${member.id}>.`;
  }

  public async handleAntiScam() {
    const message = this.message;
    const userCache = this.userCache;

    if (message.author.bot || !message.guild || !message.member) return;
    const system = await findSystem(
      this.prisma.systems,
      this.message.guildId!,
      "antiscam",
    );
    if (!system) return;
    const channels = system.channels.flatMap((c) => c.id);
    const userId = message.author.id;
    const now = Date.now();
    const timeLimit = 30 * 1000;

    const firstAttachment = message.attachments.first();
    const attachmentSize = firstAttachment?.size;
    const attachmentName = firstAttachment?.name;

    const previous = userCache.get(userId);

    if (
      previous &&
      now - previous.timestamp < timeLimit &&
      previous.channelId !== message.channel.id
    ) {
      const textMatch =
        message.content !== "" && previous.content === message.content;
      const imageMatch =
        attachmentSize !== undefined &&
        previous.attachmentSize === attachmentSize &&
        previous.attachmentName === attachmentName;

      if (textMatch || imageMatch) {
        if (message.member.moderatable) {
          try {
            await message.member.timeout(60 * 1000, "Anti-Scam");

            channels?.forEach(async (channel) => {
              const logChannel = await message.guild?.channels.fetch(channel);
              if (logChannel?.isTextBased()) {
                const logEmbed = new EmbedBuilder()
                  .setTitle("🚨 Scam Attempt Detected")
                  .setColor("Red")
                  .setFields([
                    {
                      name: "User",
                      value: `<@${userId}> (${userId})`,
                      inline: true,
                    },
                    {
                      name: "Content",
                      value: message.content || "No text",
                      inline: true,
                    },
                    {
                      name: "Channels",
                      value: `<#${previous.channelId}> and <#${message.channel.id}>`,
                      inline: false,
                    },
                  ])
                  .setTimestamp();

                const files = [];

                if (firstAttachment && attachmentName) {
                  const newImage = new AttachmentBuilder(
                    firstAttachment.url,
                  ).setName(attachmentName);
                  files.push(newImage);
                  logEmbed.setImage(`attachment://${attachmentName}`);
                  logEmbed.setDescription(
                    logEmbed.data.description +
                      `\n**Attachment:** ${attachmentName}`,
                  );
                }
                const buttons = ["🥾|Kick", "🔨|Ban", "🔓|Overturn"].map(
                  (button) => {
                    const [emoji, name] = button.split("|");
                    return new ButtonBuilder({
                      style:
                        name === "Kick"
                          ? ButtonStyle.Primary
                          : name === "Ban"
                            ? ButtonStyle.Danger
                            : ButtonStyle.Success,
                      emoji,
                      label: name,
                      custom_id: `antiscam/${name.toLowerCase()}`,
                    });
                  },
                );
                const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                  ...buttons,
                );

                await logChannel.send({
                  embeds: [logEmbed],
                  components: [row],
                  files: files,
                });
              }
            });
            await message.delete();

            const oldChannel = await message.guild.channels.fetch(
              previous.channelId,
            );
            if (oldChannel?.isTextBased()) {
              await oldChannel.messages.delete(previous.messageId);
            }
          } catch (error) {
            console.error("Error handling scam detection:", error);
          }
        }
        userCache.delete(userId);
        return;
      }
    }

    userCache.set(userId, {
      content: message.content,
      attachmentSize: attachmentSize,
      attachmentName: attachmentName,
      channelId: message.channel.id,
      messageId: message.id,
      timestamp: now,
    });
  }
}

export type antiScam = typeof AntiScam;
