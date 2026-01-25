import { findSystem } from "#utils";
import { PrismaClient } from "@prisma/client";
import { Service } from "@sern/handler";
import { AttachmentBuilder, EmbedBuilder, Message } from "discord.js";

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
            await message.member.timeout(24 * 60 * 60 * 1000, "Anti-Scam");

            channels?.forEach(async (channel) => {
              const logChannel = await message.guild?.channels.fetch(channel);
              if (logChannel?.isTextBased()) {
                const logEmbed = new EmbedBuilder()
                  .setTitle("🚨 Scam Attempt Detected")
                  .setColor("Red")
                  .setDescription(
                    `**User:** <@${userId}> (${userId})\n**Content:** ${message.content || "No text"}\n**Channels:** <#${previous.channelId}> and <#${message.channel.id}>`,
                  )
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

                await logChannel.send({ embeds: [logEmbed], files: files });
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
