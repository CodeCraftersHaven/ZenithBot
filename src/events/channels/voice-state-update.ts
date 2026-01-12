import { eventModule, EventType, Service } from "@sern/handler";

export default eventModule({
  type: EventType.Discord,
  name: "voiceStateUpdate",
  async execute(oldState) {
    const logger = Service("@sern/logger");

    if (!oldState.channelId) return;

    const channel = oldState.channel;
    if (!channel) return;

    if (!channel.name.startsWith("ticket-voice-")) return;

    if (channel.members.size === 0) {
      try {
        const fetchedChannel = await channel.fetch();
        if (fetchedChannel.members.size === 0) {
          await fetchedChannel.delete();
        }
      } catch (e) {
        logger.error({ message: "Failed to delete voice channel", error: e });
      }
    }
  },
});
