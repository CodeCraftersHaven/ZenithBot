import axios, { AxiosError } from "axios";
import { randomBytes } from "crypto";
import { Client } from "discord.js";
import { FastifyInstance } from "fastify";

export default async function authRoutes(
  fastify: FastifyInstance,
  options: { client: Client },
) {
  const { client } = options;
  if (!client.isReady()) return;

  fastify.get("/discord/login", async (request, reply) => {
    const clientId = process.env.APP_ID;
    const redirectUri = encodeURIComponent(process.env.DISCORD_REDIRECT_URI!);
    const scope = encodeURIComponent("identify guilds");

    // Generate a random state for this specific login attempt
    const state = randomBytes(16).toString("hex");

    // Store it in a temporary cookie (valid for 5 mins) to verify later
    reply.setCookie("oauth_state", state, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 300, // 5 minutes
    });

    const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}`;

    return reply.redirect(discordAuthUrl);
  });

  fastify.get("/discord/callback", async (request, reply) => {
    const { code, state } = request.query as { code: string; state: string };
    const savedState = request.cookies.oauth_state;

    if (!code) {
      return reply.status(400).send({ error: "No code provided" });
    }

    // Verify the state matches what we sent to Discord
    if (!state || state !== savedState) {
      return reply
        .status(403)
        .send({ error: "Invalid state. Possible CSRF attack." });
    }

    try {
      const tokenResponse = await axios.post(
        "https://discord.com/api/oauth2/token",
        new URLSearchParams({
          client_id: process.env.APP_ID!,
          grant_type: "authorization_code",
          code,
          redirect_uri: process.env.DISCORD_REDIRECT_URI!,
        }).toString(),
        {
          headers: {
            Authorization: `Basic ${Buffer.from(`${process.env.APP_ID}:${process.env.SECRET}`).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        },
      );

      const { access_token } = tokenResponse.data;

      // Clear the temporary state cookie
      reply.clearCookie("oauth_state", { path: "/" });

      // Set the access token in a secure cookie
      reply.setCookie("access_token", access_token, {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 1 week
      });

      return reply.redirect("https://zenith-bot.xyz/dashboard");
    } catch (error: unknown) {
      fastify.log.error(error);
      const details =
        error instanceof AxiosError ? error.response?.data : undefined;
      return reply.status(500).send({
        error: "Failed to authenticate with Discord",
        details,
      });
    }
  });

  fastify.get("/me", async (request, reply) => {
    const accessToken = request.cookies.access_token;

    if (!accessToken) {
      return reply.status(401).send({ error: "Not authenticated" });
    }

    try {
      const userResponse = await axios.get(
        "https://discord.com/api/users/@me",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return reply.send(userResponse.data);
    } catch (error: unknown) {
      fastify.log.error(error);
      return reply.status(401).send({ error: "Invalid or expired token" });
    }
  });

  fastify.get("/invite", async (request, reply) => {
    const { guild_id } = request.query as { guild_id: string };
    const clientId = process.env.APP_ID;
    const redirectUri = encodeURIComponent(process.env.DISCORD_REDIRECT_URI!);
    const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&scope=bot&permissions=397556182230&guild_id=${guild_id}&disable_guild_select=true&redirect_uri=${redirectUri}&response_type=code`;
    return reply.redirect(inviteUrl);
  });

  fastify.post("/logout", async (request, reply) => {
    reply.clearCookie("access_token", { path: "/" });
    return reply.send({ success: true });
  });
}
