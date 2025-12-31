import { eventModule, EventType, Services } from "@sern/handler";
import { EmbedBuilder, Events, TextChannel } from "discord.js";

export default eventModule({
  type: EventType.Discord,
  name: Events.GuildMemberAdd,
  execute: async (member) => {
    const [{ Welcome }, prisma] = Services("systems", "@prisma/client");

    const system = await prisma.systems.findFirst({
      where: {
        id: member.guild.id,
        systems: {
          some: { name: "welcome", enabled: true, channels: { isSet: true } },
        },
      },
      select: { systems: { select: { channels: { select: { id: true } } } } },
    });

    if (!system) return;

    for (const { id } of system.systems.flatMap((s) => s.channels)) {
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

    if (member.guild.id === "1370166656596185188") {
      const newRoleID = "1370167945216393268";
      const newRole = member.guild.roles.cache.get(newRoleID);
      if (newRole) {
        await member.roles.add(newRole);
        console.log("role added");
      }
    }
  },
});
