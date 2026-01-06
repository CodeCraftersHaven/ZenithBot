import { createCanvas, loadImage, registerFont } from "canvas";
import { AttachmentBuilder, GuildMember } from "discord.js";
import { readFileSync } from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const assetsPath = `${path.join(fileURLToPath(import.meta.url), "../../../assets")}`;

registerFont(assetsPath + "/FuturisticRotteslaItalic.ttf", {
  family: "Cyberpunk",
});

export default class Welcome {
  private buffer: Buffer<ArrayBufferLike>;
  enabled: boolean;

  constructor(enabled: boolean = false) {
    this.enabled = enabled;
    this.buffer = readFileSync(`${assetsPath}/zenithbackground.png`);
  }

  async generateWelcomeMessage(member: GuildMember) {
    const canvas = createCanvas(500, 500);
    const ctx = canvas.getContext("2d");

    const background = await loadImage(this.buffer);
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

    const avatar = await loadImage(
      member.displayAvatarURL({ extension: "png", size: 128 }),
    );
    const avatarSize = 125;
    const avatarX = canvas.width / 2 - avatarSize / 2 + 12;
    const avatarY = 110;

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

    ctx.font = "bold 32px Cyberpunk";
    ctx.fillStyle = "#00ffff";
    ctx.textAlign = "center";
    ctx.strokeStyle = "#ff00ff";
    ctx.lineWidth = 4;

    const welcomeTextY = avatarY - 50;
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

    const guildTextY = avatarY + avatarSize + 70;
    ctx.strokeText(`to ${member.guild.name}`, canvas.width / 2, guildTextY);
    ctx.fillText(`to ${member.guild.name}`, canvas.width / 2, guildTextY);

    ctx.font = "bold 24px Cyberpunk";
    const memberTextY = guildTextY + 90;
    const botCount = member.guild.members.cache.filter((m) => m.user.bot).size;
    const userCount = member.guild.memberCount;
    const memberCount = userCount - botCount;
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
