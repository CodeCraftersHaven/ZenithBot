import { eventModule, EventType, Services } from "@sern/handler";
import {
  AuditLogEvent,
  Events,
  Message,
  MessageCreateOptions,
  MessagePayload,
  TextChannel,
} from "discord.js";
import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";

export default eventModule({
  type: EventType.Discord,
  name: Events.GuildCreate,
  description: "do stuff when I'm invited to a server",
  async execute(guild) {
    await guild.fetch();
    const [logger, prisma, c] = Services(
      "@sern/logger",
      "@prisma/client",
      "@sern/client",
    );
    const systemsFolder = `${path.join(fileURLToPath(import.meta.url), "../../..", "systems")}`;
    const systems = fs.readdirSync(systemsFolder).map(async (file: string) => {
      const systemPath = path.join(systemsFolder, file);
      const systemModule = await import(systemPath);

      const systemName =
        systemModule.default?.name || path.basename(file, path.extname(file));
      return systemName as string;
    });
    const systemsList = await Promise.all(systems);
    const filteredSystems = systemsList.filter(
      (f) => f != "index" && f != "Systems",
    );
    const auditLogs = await guild.fetchAuditLogs({
      type: AuditLogEvent.BotAdd,
      limit: 1,
    });

    const entry = auditLogs.entries.first();
    if (entry && entry.executor) {
      logger.info(
        `Bot was invited by: ${entry.executor.tag} (ID: ${entry.executor.id})`,
      );
    } else {
      logger.info("Could not determine who invited the bot.");
    }

    const commands = await c.application?.commands.fetch();

    const cmd = commands?.find((cmd) => cmd.name === "system")!;
    const firstChannel = guild.channels.cache
      .filter(
        (channel) =>
          channel.isTextBased() &&
          channel
            .permissionsFor(guild.members.me!)
            ?.has(["ViewChannel", "SendMessages"]),
      )
      .first() as TextChannel | undefined;
    if (!firstChannel) return;
    const embed = {
      title: "Thanks for inviting me!",
      description: `I was invited by ${entry?.executor?.tag}!\n\n`,
      fields: [
        {
          name: "Bot Owner",
          value: "[Glitch](https://discord.com/users/342314924804014081)",
        },
        {
          name: "Created using",
          value: "[sern](https://sern.dev/), the best discord bot framework!",
        },
        {
          name: "Support Server",
          value: "[Join](https://discord.gg/QzbWrkbeUn)",
        },
        {
          name: "Invite Me",
          value:
            "[Invite](https://discord.com/oauth2/authorize?client_id=1333971772193771530)",
        },
        {
          name: "Source Code",
          value: "[GitHub](https://github.com/CodeCraftersHaven/ZenithBot)",
        },
        {
          name: "Starting Command",
          value: `Please run </system enable:${cmd.id}> to get started using me!`,
        },
      ],
    };
    async function sendMessageWithRetry(
      channel: TextChannel,
      message: string | MessagePayload | MessageCreateOptions,
      retries = 5,
      delay = 60000,
    ) {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          await channel.send(message);
          logger.info(
            `Message sent successfully in #${channel.name} (Attempt ${attempt})`,
          );
          return; // Exit function if successful
        } catch (error) {
          console.error(`Attempt ${attempt} failed: ${error}`);
          if (attempt < retries)
            await new Promise((res) => setTimeout(res, delay)); // Wait before retrying
        }
      }
      console.error("Unable to send message after multiple attempts.");
    }
    try {
      sendMessageWithRetry(firstChannel, { embeds: [embed] });
    } catch (_) {
      entry?.executor?.createDM(true).then((c) =>
        c.send({
          content: `Apologies for any inconvenience this message may cause. You invited me to ${guild.name}(${guild.id})
                and I don't have permission to send messages in there. Please update my roles/permissions within the next 5 minutes.`,
        }),
      );
      setTimeout(() => {
        sendMessageWithRetry(firstChannel, { embeds: [embed] }, 2, 60000);
      }, 5 * 60_000);
    }

    let systemsData = filteredSystems.map((s) => ({
      name: s.toLowerCase(),
      enabled: false,
      channels: [],
    }));

    await prisma.systems.upsert({
      where: { id: guild.id },
      create: {
        id: guild.id,
        systems: systemsData,
      },
      update: {
        systems: {
          set: systemsData,
        },
      },
    });
  },
});
