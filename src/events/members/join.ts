import { findSystem } from "#utils";
import { eventModule, EventType, Services } from "@sern/handler";
import { EmbedBuilder, Events, Routes, TextChannel } from "discord.js";
import fs from "fs";
import path from "path";

const GUILD_SKU_ID = process.env.GUILD_SKU_ID!;

const PRESETS: Record<string, string> = {
  main: "main.png",
  Sunset: "Sunset.png",
  Neon: "Neon.png",
  Forest: "Forest.png",
  Cyberpunk: "Cyberpunk.png",
  PalLink: "PalLink.png",
};

export default eventModule({
  type: EventType.Discord,
  name: Events.GuildMemberAdd,
  execute: async (member) => {
    if (member.user.bot) return;

    const [{ Welcome, AutoRole }, prisma, logger] = Services(
      "systems",
      "@prisma/client",
      "@sern/logger",
    );

    const welcome_system = await findSystem(
      prisma.systems,
      member.guild.id,
      "welcome",
    );

    const guildConfig = await prisma.guildConfig.findUnique({
      where: { id: member.guild.id },
    });

    const autorole_system = await findSystem(
      prisma.systems,
      member.guild.id,
      "autorole",
    );

    if (!welcome_system) {
      logger.warn(
        `No welcome system found in ${member.guild.name}(${member.guild.id})`,
      );
    } else {
      const assetsDir = path.join(process.cwd(), "assets");
      let backgroundPath = path.join(assetsDir, "main.png");

      if (guildConfig) {
        const { welcomeStyle, customImageUrl } = guildConfig;

        let hasPremium = false;
        try {
          const appId = member.client.application?.id;

          if (appId) {
            const rawEntitlements = (await member.client.rest.get(
              Routes.entitlements(appId),
              {
                query: new URLSearchParams({
                  guild_id: member.guild.id,
                  exclude_ended: "true",
                }),
              },
            )) as Array<{ sku_id: string }>;

            hasPremium = rawEntitlements.some((e) => e.sku_id === GUILD_SKU_ID);
          }
        } catch (error) {
          logger.error(`Failed to fetch entitlements via REST: ${error}`);
        }
        if (welcomeStyle === "custom" && hasPremium && customImageUrl) {
          if (fs.existsSync(customImageUrl)) {
            backgroundPath = customImageUrl;
          }
        } else if (PRESETS[welcomeStyle]) {
          backgroundPath = path.join(assetsDir, PRESETS[welcomeStyle]);
        }
      }

      for (const { id } of welcome_system.channels.flatMap((s) => s)) {
        const channel = member.guild.channels.cache.get(id) as TextChannel;
        if (!channel) continue;

        const image = await new Welcome(true).generateWelcomeMessage(
          member,
          backgroundPath,
          guildConfig?.displayMemberCount ?? true,
        );

        if (guildConfig?.embed) {
          const embed = new EmbedBuilder()
            .setTitle(`🎉 Welcome, ${member.user.username}!`)
            .setDescription(`We're glad to have you in ${member.guild.name}!`)
            .setImage("attachment://welcome.png")
            .setColor("Random");

          await channel.send({ embeds: [embed], files: [image] });
        } else {
          await channel.send({
            content: `🎉 Welcome, ${member.user}!\nWe're glad to have you in ${member.guild.name}!`,
            files: [image],
          });
        }
      }
    }

    if (!autorole_system) {
      return logger.warn(
        `No autorole system found in ${member.guild.name}(${member.guild.id})`,
      );
    }

    await new AutoRole(true).giveRole(member);
  },
});
