import { eventModule, EventType, Service } from "@sern/handler";

export default eventModule({
  type: EventType.Discord,
  name: "voiceStateUpdate",
  async execute(oldState, newState) {
    const logger = Service("@sern/logger");

    // We only care if a user left a channel (oldState.channelId is present)
    if (!oldState.channelId) return;

    const channel = oldState.channel;
    if (!channel) return;

    // Check if it's a ticket voice channel
    if (!channel.name.startsWith("ticket-voice-")) return;

    // If the channel is now empty, delete it
    if (channel.members.size === 0) {
      try {
        // Fetch again to be absolutely sure it's empty and exists
        const fetchedChannel = await channel.fetch();
        if (fetchedChannel.members.size === 0) {
          await fetchedChannel.delete();
        }
      } catch (e) {
        // Channel might have been deleted already or permissions issue
        logger.error({ message: "Failed to delete voice channel", error: e });
      }
    }
  },
});
