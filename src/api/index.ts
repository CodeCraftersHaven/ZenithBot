import { logger, prisma } from "#utils";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import { Client } from "discord.js";
import Fastify, { FastifyInstance } from "fastify";
import { createLogger, format, transports } from "winston";
import router from "./routes/index.js";

export const startApi = async (client: Client) => {
    const fastify: FastifyInstance = Fastify({
        disableRequestLogging: true,
        routerOptions: {
            ignoreTrailingSlash: true,
        },
    });

    await fastify.register(cookie, {
        secret: process.env.COOKIE_SECRET || "a-very-secret-key",
        parseOptions: {},
    });

    await fastify.register(cors, {
        origin: "https://zenith-bot.xyz",
        credentials: true,
    });

    fastify.decorate("prisma", prisma);
    fastify.decorate("logger", logger);

    // Root level health check
    fastify.get("/health", async () => {
        return { status: "ok" };
    });

    // Register all routes with /api/v1 prefix
    await fastify.register(router, { prefix: "/api/v1", client });

    const start = async () => {
        try {
            await fastify.ready();
            await fastify.listen({ port: 20000, host: "0.0.0.0" });
            logger.info("Fastify API is running on port 20000");
        } catch (err) {
            logger.error(`Failed to start API: ${err}`);
            process.exit(1);
        }
    };

    start();
};

const win = createLogger({
    levels: { fatal: 0, error: 1, warn: 2, info: 3, debug: 4, trace: 5, silent: 6 },
    format: format.combine(format.splat(), format.timestamp(), format.json()),
    transports: new transports.Console(),
  });