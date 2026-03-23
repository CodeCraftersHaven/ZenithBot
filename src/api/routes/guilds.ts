import { GuildConfig } from "@prisma/client";
import { Services } from "@sern/handler";
import axios from "axios";
import { ChannelType, Client, PermissionFlagsBits } from "discord.js";
import { FastifyInstance } from "fastify";
import {
  PartialGuild,
  SettingsBody,
  SettingsUpdate,
  System,
} from "../types.js";

export default async function guildRoutes(
  fastify: FastifyInstance,
  options: { client: Client },
) {
  const { client } = options;
  const { prisma } = fastify;

  fastify.addHook("preHandler", async (request, reply) => {
    const accessToken = request.cookies.access_token;
    if (!accessToken) {
      return reply.status(401).send({ error: "Not authenticated" });
    }
  });

  // Helper to verify if user has MANAGE_GUILD or ADMIN on a specific guild
  const verifyGuildPermission = async (
    guildId: string,
    accessToken: string,
  ) => {
    try {
      const response = await axios.get<PartialGuild[]>(
        "https://discord.com/api/users/@me/guilds",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      const guild = response.data.find((g) => g.id === guildId);
      if (!guild) return false;

      const permissions = BigInt(guild.permissions);
      const MANAGE_GUILD = PermissionFlagsBits.ManageGuild;
      const ADMINISTRATOR = PermissionFlagsBits.Administrator;

      return (
        (permissions & MANAGE_GUILD) === MANAGE_GUILD ||
        (permissions & ADMINISTRATOR) === ADMINISTRATOR ||
        guild.owner
      );
    } catch {
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
        welcomeStyle: config?.welcomeStyle || "default",
        embed: config?.embed ?? false,
        customImageUrl: config?.customImageUrl || null,
        displayMemberCount: config?.displayMemberCount ?? true,
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
      return reply.status(403).send({
        error: "Forbidden: You do not have permission to manage this guild",
      });
    }

    try {
      const updates: Promise<SettingsUpdate>[] = [];

      // 2. Update GuildConfig (Welcome Style, Embed, Image, Member Count)
      const configFields: Partial<Omit<GuildConfig, "id" | "updatedAt">> = {};
      if (body.welcomeStyle !== undefined) configFields.welcomeStyle = body.welcomeStyle;
      if (body.embed !== undefined) configFields.embed = body.embed;
      if (body.customImageUrl !== undefined) configFields.customImageUrl = body.customImageUrl;
      if (body.displayMemberCount !== undefined) configFields.displayMemberCount = body.displayMemberCount;

      if (Object.keys(configFields).length > 0) {
        updates.push(
          prisma.guildConfig.upsert({
            where: { id: guildId },
            update: configFields,
            create: { id: guildId, ...configFields },
          }),
        );
      }

      // 3. Update Systems
      if (body.systems !== undefined) {
        // Fetch existing systems to preserve channels and avoid overwriting with incomplete data
        const existingSystems = await prisma.systems.findUnique({
          where: { id: guildId },
        });

        const updatedSystems = existingSystems ? [...existingSystems.systems] : [];

        for (const [key, systemData] of Object.entries(body.systems)) {
          const systemName = (systemData.name || key).toLowerCase();
          const idx = updatedSystems.findIndex(
            (s) => s.name.toLowerCase() === systemName,
          );

          if (idx !== -1) {
            updatedSystems[idx].enabled = systemData.enabled;
          } else {
            updatedSystems.push({
              name: systemName,
              enabled: systemData.enabled,
              channels: [],
            });
          }
        }

        const guildName = client.guilds.cache.get(guildId)?.name || guildId;

        updates.push(
          prisma.systems.upsert({
            where: { id: guildId },
            update: { systems: updatedSystems },
            create: { id: guildId, name: guildName, systems: updatedSystems },
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

      return reply.send({
        success: true,
        message: "Settings updated successfully",
      });
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
      if (
        !channel ||
        !channel.isTextBased() ||
        channel.type != ChannelType.GuildText
      ) {
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

      const panel = await system.createPanel();
      channel.send(panel);

      return reply.send({ success: true, message: `${systemName} panel sent` });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: "Failed to send panel" });
    }
  });
}
