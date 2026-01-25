import { checkIfSystemEnabled } from "#utils";
import { eventModule, EventType, Services } from "@sern/handler";
import { Events } from "discord.js";

const userCache = new Map<string, CachedMessage>();

export default eventModule({
  type: EventType.Discord,
  name: Events.MessageCreate,
  async execute(message) {
    const [prisma, { AntiScam }] = Services("@prisma/client", "systems");
    if (!checkIfSystemEnabled(prisma.systems, message.guildId!, "antiscam"))
      return;
    new AntiScam(message, userCache);
  },
});
