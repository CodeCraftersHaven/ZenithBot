import { Message, TextChannel } from "discord.js";
import { PrismaClient } from "@prisma/client";
import { Service } from "@sern/handler";

export default class Counting {
  private message: Message;
  private prisma: PrismaClient;
  private cooldowns: Map<string, number> = new Map();

  constructor(message: Message) {
    this.message = message;
    this.prisma = Service("@prisma/client");
    this.handleCounting();
  }

  public async handleCounting() {
    const system = await this.prisma.systems.findFirst({
      where: {
        id: this.message.guildId!,
        systems: {
          some: {
            name: "counting",
            enabled: true,
            channels: { some: { id: this.message.channelId } },
          },
        },
      },
    });

    if (this.message.author.bot || isNaN(parseInt(this.message.content)))
      return;

    if (!system) return;
    const userId = this.message.author.id;
    if (this.isUserOnCooldown(userId)) {
      const cooldownEnd = this.cooldowns.get(userId)!;
      const remainingTime = Math.ceil((cooldownEnd - Date.now()) / 1000);
      await this.message.delete().catch(() => null);
      const denyMessage = await (this.message.channel as TextChannel).send(
        `<@${userId}>, you are on cooldown. Please wait ${remainingTime} seconds before trying again.`,
      );
      setTimeout(() => denyMessage.delete().catch(() => null), 5000);
      return;
    }

    const guildId = this.message.guildId;
    if (!guildId) return;

    let countingData = await this.prisma.counting.findUnique({
      where: { id: guildId },
    });

    if (!countingData) {
      countingData = await this.prisma.counting.create({
        data: {
          id: guildId,
          count: 0,
          lastUser: userId,
          lastCount: -1,
        },
      });
    }

    const expectedCount = countingData.lastCount + 1;
    const channels = system.systems.flatMap((s) => s.channels);
    channels.forEach(async (channel) => {
      if (channel.id === this.message.channelId) {
        if (
          parseInt(this.message.content) === expectedCount &&
          this.message.author.id !== countingData?.lastUser
        ) {
          countingData = await this.prisma.counting.update({
            where: { id: guildId },
            data: {
              count: expectedCount,
              lastUser: userId,
              lastCount: expectedCount,
            },
          });
          this.applyCooldown(userId);
          await this.message.react("✅");
        } else {
          await this.message.react("❌");
          if (this.message.author.id === countingData?.lastUser) {
            const wrongUserMessages = [
              "Wrong user!",
              "That's not your turn!",
              "You're not the one who should be counting!",
              "You missed your turn!",
              "That's not your number!",
            ];
            const randomMessage =
              wrongUserMessages[
                Math.floor(Math.random() * wrongUserMessages.length)
              ];
            await this.message.reply({
              content: `${randomMessage} Let someone else count!`,
            });
            return;
          }
          const wrongNumberMessages = [
            "Wrong number!",
            "That's not the correct number!",
            "You missed the count!",
            "You're out of order!",
            "That's not the next number!",
          ];
          const randomMessage =
            wrongNumberMessages[
              Math.floor(Math.random() * wrongNumberMessages.length)
            ];
          await this.message.reply({
            content: `${randomMessage} The next number should be ${expectedCount}. Start back at \`0\`!`,
          });

          await this.prisma.counting.update({
            where: { id: guildId },
            data: {
              count: 0,
              lastUser: userId,
              lastCount: -1,
            },
          });
        }
      }
    });
  }

  private applyCooldown(userId: string) {
    const cooldownTime = 60000;
    this.cooldowns.set(userId, Date.now() + cooldownTime);
    setTimeout(() => this.cooldowns.delete(userId), cooldownTime);
  }

  public isUserOnCooldown(userId: string): boolean {
    const cooldownEnd = this.cooldowns.get(userId);
    return cooldownEnd !== undefined && cooldownEnd > Date.now();
  }
}

export type counting = typeof Counting;
