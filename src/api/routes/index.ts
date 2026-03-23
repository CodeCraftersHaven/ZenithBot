import { Client } from "discord.js";
import { FastifyInstance } from "fastify";
import authRoutes from "./auth.js";
import discordRoutes from "./discord.js";
import guildRoutes from "./guilds.js";

/**
 * Main router that aggregates all API routes.
 * Registered with /api/v1 prefix in src/api/index.ts
 */
export default async function router(
  fastify: FastifyInstance,
  options: { client: Client },
) {
  const { client } = options;

  // Authentication routes
  await fastify.register(authRoutes, { prefix: "/auth", client });

  // Discord data routes
  await fastify.register(discordRoutes, { prefix: "/discord", client });

  // Guild settings routes
  await fastify.register(guildRoutes, { prefix: "/guilds", client });

  // Health check endpoint
  fastify.get("/health", async () => {
    let databaseStatus = "unknown";
    try {
      // Use a model check that works with both SQL and MongoDB
      await fastify.prisma.systems.findFirst();
      databaseStatus = "ok";
    } catch (error) {
      fastify.log.error(error);
      databaseStatus = "error";
    }

    return {
      status: "ok",
      uptime: process.uptime(),
      discord: {
        ready: client.isReady(),
        ping: client.ws.ping,
      },
      database: databaseStatus,
    };
  });

  // Add more route groups here as you grow:
  // await fastify.register(userRoutes, { prefix: "/users", client });
  // await fastify.register(guildRoutes, { prefix: "/guilds", client });
}
