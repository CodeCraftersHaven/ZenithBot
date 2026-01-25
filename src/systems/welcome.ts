import { createCanvas, loadImage } from "@napi-rs/canvas";
import { AttachmentBuilder, GuildMember } from "discord.js";

// Optional: Register a custom font for better text rendering
// GlobalFonts.registerFromPath('./path/to/your/font.ttf', 'CustomFont');

export default class Welcome {
  enabled: boolean;

  constructor(enabled: boolean = false) {
    this.enabled = enabled;
  }

  /**
   * Generates the welcome image
   * @param member The Discord GuildMember joining
   * @param backgroundPath The absolute path to the background image (preset or custom)
   * @param writeMemberCount Whether to display the total member count
   */
  async generateWelcomeMessage(
    member: GuildMember,
    backgroundPath: string,
    writeMemberCount: boolean = true,
  ) {
    // 1. Load the dynamic background passed from the event handler
    const background = await loadImage(backgroundPath);

    const canvas = createCanvas(background.width, background.height);
    const ctx = canvas.getContext("2d");

    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

    // 2. Load Avatar (Switched to WebP for faster downloading)
    const avatar = await loadImage(
      member.displayAvatarURL({ extension: "webp", size: 128 }),
    );

    // Avatar styling variables
    const avatarSize = 125;
    const avatarX = canvas.width / 2 - avatarSize / 2;
    const avatarY = canvas.height / 2 - avatarSize / 2;

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

    // 3. Text Configuration (Updated to standard CSS font syntax)
    ctx.font = "bold 32px sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 4;

    const welcomeTextY = avatarY - 40;

    // Draw "Welcome, {username}!"
    const welcomeText = `Welcome, ${member.user.username}!`;
    ctx.strokeText(welcomeText, canvas.width / 2, welcomeTextY);
    ctx.fillText(welcomeText, canvas.width / 2, welcomeTextY);

    // Draw "to {guild.name}"
    const guildTextY = avatarY + avatarSize + 50;
    const guildText = `to ${member.guild.name}`;
    ctx.strokeText(guildText, canvas.width / 2, guildTextY);
    ctx.fillText(guildText, canvas.width / 2, guildTextY);

    if (writeMemberCount) {
      // 4. Member Count Logic
      ctx.font = "normal 24px sans-serif";
      const memberTextY = guildTextY + 50;

      // Note: This relies on cache. If the bot resets, this count may be off
      // until the cache fills, but fetching members here would cause rate limits.
      const botCount = member.guild.members.cache.filter(
        (m) => m.user.bot,
      ).size;
      const userCount = member.guild.memberCount;
      const memberCount = userCount - botCount;

      const ordinal = this.getOrdinalSuffix(memberCount);
      const countText = `You are the ${memberCount}${ordinal} member!`;

      // Draw "You are the nth member!"
      ctx.strokeText(countText, canvas.width / 2, memberTextY);
      ctx.fillText(countText, canvas.width / 2, memberTextY);
    }

    // 5. Asynchronous Encoding (Prevents bot lag)
    const buffer = await canvas.encode("png");
    const attachment = new AttachmentBuilder(buffer, {
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

export type WelcomeType = typeof Welcome;
