import { eventModule, EventType, Service } from "@sern/handler";
import { ChannelType, Events } from "discord.js";

export default eventModule({
  type: EventType.Discord,
  name: Events.ThreadDelete,
  execute: async (channel) => {
    if (channel.type !== ChannelType.PrivateThread) return;
    const prisma = Service("@prisma/client");
    const partialName = "ticket-";
    if (!channel.name.startsWith(partialName)) return;
    const userId = channel.name.slice(partialName.length);
    const user = await prisma.userTicket.findFirst({
      where: {
        id: userId,
      },
    });

    if (!user) return;
    const guildIndex = user.guilds.findIndex((g) => g.id === channel.guildId);
    if (guildIndex === -1) return;

    const ticketIndex = user.guilds[guildIndex].tickets.findIndex(
      (t) => t.channelId === channel.id,
    );
    if (ticketIndex === -1) return;

    user.guilds[guildIndex].tickets.splice(ticketIndex, 1);

    if (user.guilds[guildIndex].tickets.length === 0) {
      user.guilds.splice(guildIndex, 1);
    }

    if (user.guilds.length === 0) {
      await prisma.userTicket.delete({
        where: {
          id: userId,
        },
      });
    } else {
      await prisma.userTicket.update({
        where: {
          id: userId,
        },
        data: {
          guilds: user.guilds,
        },
      });
    }
  },
});
