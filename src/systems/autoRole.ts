import { PrismaClient } from "@prisma/client";
import { Service } from "@sern/handler";
import { GuildMember } from "discord.js";

export default class AutoRole {
  private prisma: PrismaClient;
  private enabled: boolean;

  constructor(enabled: boolean = false) {
    this.enabled = enabled;
    this.prisma = Service("@prisma/client");
  }

  public async setRole(guildId: string, roleId: string) {
    await this.prisma.autorole.upsert({
      where: { id: guildId },
      create: { id: guildId, roleId },
      update: { roleId },
    });
  }

  public async getRole(guildId: string) {
    const data = await this.prisma.autorole.findUnique({
      where: { id: guildId },
      select: { roleId: true },
    });
    return data?.roleId;
  }

  public async giveRole(member: GuildMember) {
    if (!this.enabled) return;
    if (member.user.bot) return; 
    const roleId = await this.getRole(member.guild.id);
    if (!roleId) return;
    await member.roles.add(roleId);
  }
}

export type autoRole = typeof AutoRole;
