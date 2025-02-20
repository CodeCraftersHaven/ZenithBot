import { checkIfSystemEnabled } from "#utils";
import { eventModule, EventType, Services } from "@sern/handler";
import { CategoryChannel, ChannelType, Events, VoiceChannel } from "discord.js";

const debounceMap = new Map<string, NodeJS.Timeout>();

export default eventModule({
  type: EventType.Discord,
  name: Events.PresenceUpdate,
  async execute(oldPresence, newPresence) {
    const [client, logger, { systems }, { SiegeTracker }] = Services(
      "@sern/client",
      "@sern/logger",
      "@prisma/client",
      "systems",
    );

    if (oldPresence?.user?.bot || newPresence.user?.bot || !newPresence?.member)
      return;
    const guildId = newPresence.guild?.id;
    const guild = newPresence.guild;
    if (!guildId || !guild) return;
    const isSystemEnabled = await checkIfSystemEnabled(
      systems,
      guildId,
      "r6tracker",
    );
    if (!isSystemEnabled) return;
    const tracker = new SiegeTracker();
    const wasPlayingSiege =
      oldPresence?.activities.some((a) => a.name === "Rainbow Six Siege") ??
      false;
    const isPlayingSiege = newPresence.activities.some(
      (a) => a.name === "Rainbow Six Siege",
    );

    if (wasPlayingSiege !== isPlayingSiege) {
      let siegePlayersCount = tracker.r6Collection.get(guildId) ?? 0;
      siegePlayersCount = isPlayingSiege
        ? siegePlayersCount + 1
        : Math.max(0, siegePlayersCount - 1);
      tracker.r6Collection.set(guildId, siegePlayersCount);

      if (debounceMap.has(guildId)) {
        clearTimeout(debounceMap.get(guildId)!);
      }

      const debounceTimeout = setTimeout(async () => {
        let parent =
          guild.channels.cache.get(tracker.parentChannelId) ||
          (guild.channels.cache.find(
            (c) =>
              c.name.toLowerCase().includes("siege") &&
              c.type === ChannelType.GuildCategory,
          ) as CategoryChannel);
        let voiceChannel =
          guild.channels.cache.get(tracker.vcChannelId) ||
          (guild.channels.cache.find(
            (c) =>
              (c.name.toLowerCase().includes("tracker") ||
                c.name.toLowerCase().includes("siege")) &&
              c.type === ChannelType.GuildVoice,
          ) as VoiceChannel);

        if (!parent || parent.type !== ChannelType.GuildCategory) {
          parent = await guild.channels.create({
            name: `Siege Tracker`,
            type: ChannelType.GuildCategory,
            position: 0,
            permissionOverwrites: [
              {
                id: client.user?.id!,
                allow: ["ManageChannels", "ViewChannel"],
              },
              {
                id: guild.roles.botRoleFor(client.user!)?.id!,
                allow: ["ManageChannels", "ViewChannel"],
              },
            ],
          });
          tracker.parentChannelId = parent.id;
        }
        if (!voiceChannel || voiceChannel.type !== ChannelType.GuildVoice) {
          voiceChannel = await guild.channels.create({
            name: `🎮 Siege Players: ${siegePlayersCount}`,
            parent: parent.id,
            type: ChannelType.GuildVoice,
            permissionOverwrites: [
              {
                id: client.user?.id!,
                allow: ["ManageChannels", "ViewChannel"],
              },
              {
                id: guild.roles.botRoleFor(client.user!)?.id!,
                allow: ["ManageChannels", "ViewChannel"],
              },
            ],
          });
          tracker.vcChannelId = voiceChannel.id;
        } else {
          try {
            if (siegePlayersCount == 0) {
              await voiceChannel.delete();
            } else {
              await voiceChannel.edit({
                name: `🎮 Siege Players: ${siegePlayersCount}`,
              });
            }
          } catch (error) {
            logger.error(`Failed to update channel name: ${error}`);
          }
        }
        debounceMap.delete(guildId);
      }, 3000);

      debounceMap.set(guildId, debounceTimeout);
    }
  },
});
