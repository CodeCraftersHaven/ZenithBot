import { eventModule, EventType, Service } from "@sern/handler";

export default eventModule({
  type: EventType.Discord,
  name: "channelCreate",
  async execute(channel) {
    const logger = Service("@sern/logger");
    if (!channel.isVoiceBased()) return;
    if (!channel.name.startsWith("ticket-voice-")) return;

    logger.info(`Ticket voice channel created: ${channel.name}`);

    // Give the user 30 seconds to join the channel
    setTimeout(async () => {
      try {
        const fetchedChannel = await channel.fetch().catch(() => null);
        if (!fetchedChannel) return; // Channel already deleted

        if (fetchedChannel.members.size === 0) {
          await fetchedChannel.delete();
        }
      } catch (e) {
        logger.error(e);
      }
    }, 60000);
  },
});
