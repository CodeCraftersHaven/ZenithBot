import { eventModule, EventType, Services } from "@sern/handler";
import { Events, TextChannel } from "discord.js";

export default eventModule({
  type: EventType.Discord,
  name: Events.ClientReady,
  async execute(client) {
    const [logger, prisma, { Giveaway }, c] = Services(
      "@sern/logger",
      "@prisma/client",
      "systems",
      "@sern/client",
    );

    logger.info("Client Logged In. ");

    await prisma.$connect();

    const db = await prisma.giveaway.findMany();
    if (!db || !db.length || db.length < 1) return;
    const giveaway = new Giveaway(true);
    const now = Date.now();
    for (const data of db) {
      if (data) {
        try {
          const endsAt = new Date(data.endsAt).getTime();
          const timeLeft = endsAt - now;

          const channel = (await client.channels.fetch(
            data.channelId,
          )) as TextChannel;
          await channel.messages.fetch(data.messageId);
          await giveaway.createTimers(timeLeft, true, {
            channelId: data.channelId,
            messageId: data.messageId,
            host: data.host,
            prize: data.prize,
            winnerSize: data.winnerSize,
            interval: data.interval,
          });
        } catch (error) {
          logger.error(
            `Failed to fetch message with ID ${data.messageId}: ${error}: Deleting from Database...`,
          );
          await prisma.giveaway.deleteMany({
            where: { messageId: data.messageId },
          });
        }
      }
    }
  },
});
