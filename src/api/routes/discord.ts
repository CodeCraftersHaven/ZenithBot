import axios from "axios";
import { Client } from "discord.js";
import { FastifyInstance } from "fastify";
import { PartialGuild } from "../types.js";

export default async function discordRoutes(
  fastify: FastifyInstance,
  options: { client: Client },
) {
  const { client } = options;

  // Middleware-like check for access token
  fastify.addHook("preHandler", async (request, reply) => {
    const accessToken = request.cookies.access_token;
    if (!accessToken) {
      return reply.status(401).send({ error: "Not authenticated" });
    }
  });

  // GET /api/v1/discord/guilds
  fastify.get("/guilds", async (request, reply) => {
    const accessToken = request.cookies.access_token;

    try {
      const response = await axios.get<PartialGuild[]>(
        "https://discord.com/api/users/@me/guilds",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      const userGuilds = response.data;

      // Filter guilds where user has MANAGE_GUILD (0x20) or ADMINISTRATOR (0x8)
      const managedGuilds = userGuilds
        .filter((guild) => {
          const permissions = BigInt(guild.permissions);
          const MANAGE_GUILD = BigInt(0x20);
          const ADMINISTRATOR = BigInt(0x8);
          return (
            (permissions & MANAGE_GUILD) === MANAGE_GUILD ||
            (permissions & ADMINISTRATOR) === ADMINISTRATOR ||
            guild.owner
          );
        })
        .map((guild) => ({
          ...guild,
          bot_present: client.guilds.cache.has(guild.id),
        }));

      return reply.send(managedGuilds);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: "Failed to fetch user guilds" });
    }
  });

  fastify.get("/guilds/:guildId", async (request, reply) => {
    const { guildId } = request.params as { guildId: string };
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return reply.status(404).send({ error: "Guild not found" });
    return reply.send({ id: guild.id, name: guild.name, icon: guild.icon });
  });

  // GET /api/v1/discord/guilds/:guildId/channels
  fastify.get("/guilds/:guildId/channels", async (request, reply) => {
    const { guildId } = request.params as { guildId: string };
    const guild = client.guilds.cache.get(guildId);

    if (!guild) {
      return reply
        .status(404)
        .send({ error: "Guild not found or bot not in guild" });
    }

    const channels = guild.channels.cache.map((channel) => ({
      id: channel.id,
      name: channel.name,
      type: channel.type,
      parent_id: channel.parentId,
    }));

    return reply.send(channels);
  });

  // GET /api/v1/discord/guilds/:guildId/roles
  fastify.get("/guilds/:guildId/roles", async (request, reply) => {
    const { guildId } = request.params as { guildId: string };
    const guild = client.guilds.cache.get(guildId);

    if (!guild) {
      return reply
        .status(404)
        .send({ error: "Guild not found or bot not in guild" });
    }

    const roles = guild.roles.cache.map((role) => ({
      id: role.id,
      name: role.name,
      color: role.color,
      position: role.position,
      managed: role.managed,
    }));

    return reply.send(roles);
  });
}
