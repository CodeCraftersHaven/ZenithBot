import {
  AntiScam,
  AutoRole,
  Counting,
  Giveaways,
  SelfRoles,
  Systems,
  Tickets,
  Welcome,
} from "#systems";
import { logger, prisma } from "#utils";
import { Sern, makeDependencies } from "@sern/handler";
import { Publisher } from "@sern/publisher";
import { Client, GatewayIntentBits } from "discord.js";
import "dotenv/config.js";
import * as config from "./config.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildWebhooks,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

await makeDependencies(({ add, swap }) => {
  add("@sern/client", client);
  add("@prisma/client", prisma);
  swap("@sern/logger", logger);
  add("systems", {
    AntiScam: AntiScam.default,
    AutoRole: AutoRole.default,
    Counting: Counting.default,
    Giveaway: Giveaways.default,
    SelfRoles: SelfRoles.default,
    Systems: Systems.default,
    Tickets: Tickets.default,
    Welcome: Welcome.default,
  });
  add(
    "publisher",
    (deps) =>
      new Publisher(
        deps["@sern/modules"],
        deps["@sern/emitter"],
        deps["@sern/logger"]!,
      ),
  );
  add("process", process);
});

Sern.init(config);

await client.login();
