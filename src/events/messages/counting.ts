import { eventModule, EventType } from "@sern/handler";
import { Events } from "discord.js";

export default eventModule({
    type: EventType.Discord,
    name: Events.MessageCreate,
    execute: async (message) => {
        return;
    }
})