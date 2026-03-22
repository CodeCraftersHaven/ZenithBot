import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import { Client } from "discord.js";
import Fastify, { FastifyInstance } from "fastify";
import router from "./routes/index.js";

export const startApi = async (client: Client) => {
  const fastify: FastifyInstance = Fastify({
    logger: true, // Fastify has built-in high-performance logging (Pino)
  });

  await fastify.register(cookie, {
    secret: process.env.COOKIE_SECRET || "a-very-secret-key",
    parseOptions: {},
  });

  await fastify.register(cors, {
    origin: "https://zenithbot.xyz",
    credentials: true,
  });

  // Register all routes with /api/v1 prefix
  await fastify.register(router, { prefix: "/api/v1", client });

  const start = async () => {
    try {
      await fastify.listen({ port: 20000, host: "0.0.0.0" });
      console.log("Fastify API is running on port 20000");
    } catch (err) {
      fastify.log.error(err);
      process.exit(1);
    }
  };

  start();
};
