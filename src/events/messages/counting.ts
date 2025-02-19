import { checkIfSystemEnabled } from "#utils";
import { eventModule, EventType, Services } from "@sern/handler";
import { Events } from "discord.js";

export default eventModule({
  type: EventType.Discord,
  name: Events.MessageCreate,
  execute: async (message) => {
    const [prisma, { Counting }] = Services("@prisma/client", "systems");
    if (message.author.bot) return;
    const system = await checkIfSystemEnabled(
      prisma.systems,
      message.guildId!,
      "counting",
    );
    if (!system) return;
    new Counting(message);
  },
});
