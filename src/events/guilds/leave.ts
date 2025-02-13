import { eventModule, EventType, Services } from "@sern/handler";
import { Events } from "discord.js";

export default eventModule({
    type: EventType.Discord,
    name: Events.GuildDelete,
    async execute(guild) {
        const [logger, prisma] = Services("@sern/logger", "@prisma/client");

        await prisma.systems.delete({ where: { id: guild.id } }).catch(() => {})
    },
})