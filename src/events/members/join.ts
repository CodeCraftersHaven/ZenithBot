import { eventModule, EventType, Services } from "@sern/handler";
import { EmbedBuilder, Events, TextChannel } from "discord.js";

export default eventModule({
  type: EventType.Discord,
  name: Events.GuildMemberAdd,
  execute: async (member) => {
    const [{ Welcome, AutoRole }, prisma, logger] = Services(
      "systems",
      "@prisma/client",
      "@sern/logger",
    );

    const welcome_system = await prisma.systems.findFirst({
      where: {
        id: member.guild.id,
        systems: {
          some: { name: "welcome", enabled: true, channels: { isSet: true } },
        },
      },
      select: { systems: { select: { channels: { select: { id: true } } } } },
    });

    if (!welcome_system)
      return logger.warn(
        `No welcome system found in ${member.guild.name}(${member.guild.id})`,
      );

    for (const { id } of welcome_system.systems.flatMap((s) => s.channels)) {
      const channel = member.guild.channels.cache.get(id) as TextChannel;
      if (!channel) continue;

      const image = await new Welcome(true).generateWelcomeMessage(member);

      const embed = new EmbedBuilder()
        .setTitle(`🎉 Welcome, ${member.user.username}!`)
        .setDescription(`We're glad to have you in ${member.guild.name}!`)
        .setImage("attachment://welcome.png")
        .setColor("Random");

      channel.send({ embeds: [embed], files: [image] });
    }

    const autorole_system = await prisma.systems.findFirst({
      where: {
        id: member.guild.id,
        systems: {
          some: { name: "autorole", enabled: true },
        },
      },
    });

    if (!autorole_system)
      return logger.warn(
        `No autorole system found in ${member.guild.name}(${member.guild.id})`,
      );

    await new AutoRole(true).giveRole(member);
  },
});
