import { prisma } from "#utils";
import { Services } from "@sern/handler";
import axios from "axios";
import { ChannelType, Client, PermissionFlagsBits } from "discord.js";
import { FastifyInstance } from "fastify";

interface System {
    name: string;
    enabled: boolean;
    channels: {
        name: string;
        id: string;
        staffId?: string | null;
    }[];
}

interface SettingsBody {
    welcomeStyle?: string;
    systems?: Record<string, System>;
    autoroleId?: string;
}

export default async function guildRoutes(
    fastify: FastifyInstance,
    options: { client: Client },
) {
    const { client } = options;
    fastify.addHook("preHandler", async (request, reply) => {
        const accessToken = request.cookies.access_token;
        if (!accessToken) {
            return reply.status(401).send({ error: "Not authenticated" });
        }
    });

    // Helper to verify if user has MANAGE_GUILD or ADMIN on a specific guild
    const verifyGuildPermission = async (guildId: string, accessToken: string) => {
        try {
            const response = await axios.get(
                "https://discord.com/api/users/@me/guilds",
                {
                    headers: { Authorization: `Bearer ${accessToken}` },
                },
            );
            const guild = response.data.find((g: any) => g.id === guildId);
            if (!guild) return false;

            const permissions = BigInt(guild.permissions);
            const MANAGE_GUILD = PermissionFlagsBits.ManageGuild;
            const ADMINISTRATOR = PermissionFlagsBits.Administrator;

            return (
                (permissions & MANAGE_GUILD) === MANAGE_GUILD ||
                (permissions & ADMINISTRATOR) === ADMINISTRATOR ||
                guild.owner
            );
        } catch (error) {
            return false;
        }
    };

    fastify.get("/:guildId/settings", async (request, reply) => {
        const { guildId } = request.params as { guildId: string };

        try {
            const [config, systems, autorole] = await Promise.all([
                prisma.guildConfig.findUnique({ where: { id: guildId } }),
                prisma.systems.findUnique({ where: { id: guildId } }),
                prisma.autorole.findUnique({ where: { id: guildId } }),
            ]);

            const systemMap =
                systems?.systems.reduce(
                    (acc, s) => {
                        acc[s.name] = s;
                        return acc;
                    },
                    {} as Record<string, System>,
                ) || {};

            return reply.send({
                prefix: "!",
                welcomeStyle: config?.welcomeStyle || "default",
                systems: systemMap,
                autoroleId: autorole?.roleId || "",
            });
        } catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({ error: "Failed to fetch settings" });
        }
    });

    fastify.post("/:guildId/settings", async (request, reply) => {
        const { guildId } = request.params as { guildId: string };
        const accessToken = request.cookies.access_token!;
        const body = request.body as SettingsBody;

        // 1. Verify user has permissions to manage this guild
        const hasPermission = await verifyGuildPermission(guildId, accessToken);
        if (!hasPermission) {
            return reply
                .status(403)
                .send({ error: "Forbidden: You do not have permission to manage this guild" });
        }

        try {
            const updates: Promise<any>[] = [];

            // 2. Update GuildConfig (Welcome Style)
            if (body.welcomeStyle !== undefined) {
                updates.push(
                    prisma.guildConfig.upsert({
                        where: { id: guildId },
                        update: { welcomeStyle: body.welcomeStyle },
                        create: { id: guildId, welcomeStyle: body.welcomeStyle },
                    }),
                );
            }

            // 3. Update Systems
            if (body.systems !== undefined) {
                const systemsArray = Object.values(body.systems);
                updates.push(
                    prisma.systems.upsert({
                        where: { id: guildId },
                        update: { systems: systemsArray },
                        create: { id: guildId, name: guildId, systems: systemsArray },
                    }),
                );
            }

            // 4. Update Autorole
            if (body.autoroleId !== undefined) {
                updates.push(
                    prisma.autorole.upsert({
                        where: { id: guildId },
                        update: { roleId: body.autoroleId },
                        create: { id: guildId, roleId: body.autoroleId },
                    }),
                );
            }

            await Promise.all(updates);

            return reply.send({ success: true, message: "Settings updated successfully" });
        } catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({ error: "Failed to update settings" });
        }
    });

    fastify.post("/panel", async (request, reply) => {
      const accessToken = request.cookies.access_token!;
      const { guildId, channelId, systemName } = request.body as {
        guildId: string;
        channelId: string;
        systemName: string;
      };

      // 1. Verify user has permissions
      const hasPermission = await verifyGuildPermission(guildId, accessToken);
      if (!hasPermission) {
        return reply.status(403).send({ error: "Forbidden" });
      }

      try {
        const guild = client.guilds.cache.get(guildId);
        if (!guild) return reply.status(404).send({ error: "Bot not in guild" });

        const channel = guild.channels.cache.get(channelId);
        if (!channel || !channel.isTextBased() || channel.type != ChannelType.GuildText) {
          return reply.status(400).send({ error: "Invalid text channel" });
        }

        // Use the existing system logic to send the panel
        const SystemClass = Services("systems")[0].Systems;
        const system = new SystemClass(
          guildId,
          guild.name,
          systemName.toLowerCase(),
          channel,
        );

        const panel = await system.createPanel()
        channel.send(panel)

        return reply.send({ success: true, message: `${systemName} panel sent` });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Failed to send panel" });
      }
    });
    }
