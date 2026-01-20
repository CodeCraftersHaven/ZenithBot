import { createCanvas, loadImage } from "canvas";
import { AttachmentBuilder, GuildMember } from "discord.js";

export default class Welcome {
  enabled: boolean;

  constructor(enabled: boolean = false) {
    this.enabled = enabled;
  }

  /**
   * Generates the welcome image
   * @param member The Discord GuildMember joining
   * @param backgroundPath The absolute path to the background image (preset or custom)
   */
  async generateWelcomeMessage(member: GuildMember, backgroundPath: string) {
    const canvas = createCanvas(500, 500);
    const ctx = canvas.getContext("2d");

    // 1. Load the dynamic background passed from the event handler
    const background = await loadImage(backgroundPath);
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

    // 2. Load Avatar
    const avatar = await loadImage(
      member.displayAvatarURL({ extension: "png", size: 128 }),
    );

    // Avatar styling variables
    const avatarSize = 125;
    const avatarX = canvas.width / 2 - avatarSize / 2 + 12;
    const avatarY = 110;

    // Draw Circular Avatar
    ctx.save();
    ctx.beginPath();
    ctx.arc(
      avatarX + avatarSize / 2,
      avatarY + avatarSize / 2,
      avatarSize / 2,
      0,
      Math.PI * 2,
    );
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();

    // 3. Text Configuration
    // Update: Added "Normal" so it actually uses your registered custom font
    ctx.font = "32px Normal";
    ctx.fillStyle = "#00ffff";
    ctx.textAlign = "center";
    ctx.strokeStyle = "#ff00ff";
    ctx.lineWidth = 4;

    const welcomeTextY = avatarY - 50;

    // Draw "Welcome, {username}!"
    ctx.strokeText(
      `Welcome, ${member.user.username}!`,
      canvas.width / 2,
      welcomeTextY,
    );
    ctx.fillText(
      `Welcome, ${member.user.username}!`,
      canvas.width / 2,
      welcomeTextY,
    );

    // Draw "to {guild.name}"
    const guildTextY = avatarY + avatarSize + 70;
    ctx.strokeText(`to ${member.guild.name}`, canvas.width / 2, guildTextY);
    ctx.fillText(`to ${member.guild.name}`, canvas.width / 2, guildTextY);

    // 4. Member Count Logic
    // Note: ensure your bot has 'GuildMembers' intent for accurate cache
    ctx.font = "24px Normal";
    const memberTextY = guildTextY + 90;

    const botCount = member.guild.members.cache.filter((m) => m.user.bot).size;
    const userCount = member.guild.memberCount;
    const memberCount = userCount - botCount;

    // Draw "You are the nth member!"
    ctx.strokeText(
      `You are the ${memberCount}${this.getOrdinalSuffix(memberCount)} member!`,
      canvas.width / 2,
      memberTextY,
    );
    ctx.fillText(
      `You are the ${memberCount}${this.getOrdinalSuffix(memberCount)} member!`,
      canvas.width / 2,
      memberTextY,
    );

    const attachment = new AttachmentBuilder(canvas.toBuffer(), {
      name: "welcome.png",
    });

    return attachment;
  }

  private getOrdinalSuffix(n: number) {
    if (n % 100 >= 11 && n % 100 <= 13) return "th";
    switch (n % 10) {
      case 1:
        return "st";
      case 2:
        return "nd";
      case 3:
        return "rd";
      default:
        return "th";
    }
  }
}

export type welcome = typeof Welcome;
