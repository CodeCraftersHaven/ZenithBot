import { PrismaClient } from "@prisma/client";
import { Service } from "@sern/handler";
import { Client } from "discord.js";

export default class Tickets {
  private db: PrismaClient = Service("@prisma/client");
  private c: Client = Service("@sern/client");
  private guildId: string;
  private channelId: string;
  private userId: string;
  enabled: boolean;

  constructor(
    enabled: boolean = false,
    guildId: string,
    channelId: string,
    userId: string,
  ) {
    this.enabled = enabled;
    this.guildId = guildId;
    this.channelId = channelId;
    this.userId = userId;
  }

  async checkOpenTicket(): Promise<{ exists: boolean; ticket?: Ticket }> {
    const user = await this.db.userTicket.findFirst({
      where: { id: this.userId },
      select: { guilds: true },
    });

    const guild = user?.guilds.find((g) => g.id === this.guildId);
    const openTicket = guild?.tickets.find((t) => t.open) || null;

    return {
      exists: !!openTicket,
      ticket: openTicket ?? undefined,
    };
  }
  async closeTicket() {
    const userTicket = await this.db.userTicket.findUnique({
      where: { id: this.userId },
      select: {
        guilds: {
          select: { tickets: true, id: true },
        },
      },
    });

    const guild = userTicket?.guilds.find((g) => g.id === this.guildId);
    if (!guild) throw new Error("Guild not found.");

    const updatedTickets = guild.tickets.map((ticket) =>
      ticket.channelId === this.channelId ? { ...ticket, open: false } : ticket,
    );

    return await this.db.userTicket.update({
      where: { id: this.userId },
      data: {
        guilds: {
          updateMany: {
            where: { id: this.guildId },
            data: { tickets: { set: updatedTickets } },
          },
        },
      },
    });
  }
  async openTicket() {
    const existingUserTicket = await this.db.userTicket.findUnique({
      where: { id: this.userId },
      select: {
        guilds: {
          select: { tickets: true },
        },
      },
    });

    const existingTickets = existingUserTicket?.guilds?.[0]?.tickets ?? [];

    const updatedTickets = [
      ...existingTickets,
      { channelId: this.channelId, open: true },
    ];

    await this.db.userTicket.upsert({
      where: { id: this.userId },
      update: {
        guilds: {
          updateMany: {
            where: { id: this.guildId },
            data: {
              tickets: { set: updatedTickets },
            },
          },
        },
      },
      create: {
        id: this.userId,
        guilds: {
          id: this.guildId,
          tickets: { channelId: this.channelId },
        },
      },
    });
  }

  async reopenTicket() {
    return await this.db.userTicket.update({
      where: {
        id: this.userId,
        guilds: {
          some: { id: this.guildId, tickets: { some: { open: false } } },
        },
      },
      data: {
        guilds: {
          set: {
            id: this.guildId,
            tickets: [{ channelId: this.channelId, open: true }],
          },
        },
      },
    });
  }
}
export type tickets = typeof Tickets;
type Ticket = {
  channelId: string;
  open: boolean;
  createdAt: Date;
} | null;
