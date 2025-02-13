import { eventModule, EventType, Service } from "@sern/handler";
import { Events } from "discord.js";

export default eventModule({
    type: EventType.Discord,
    name: Events.InteractionCreate,
    async execute(interaction) {
        const prisma = Service("@prisma/client");
        const { selfRoles } = prisma;
        if (!interaction.isButton()) return;
    },
});

const roles = {
    "age": {"13-15": "1331839421544398919", "16": "1320885254864506902", "17": "1320885254864506901", "18+": "1320885254814171153"},
    "gender": {"guy": "1320885254814171155", "girl": "1320885254814171154", "non-binary": "", "prefer not to say": ""},
    "platform": {"pc": "1320885254814171157", "xbox": "1320885254814171156", "playstation": "1320885254814171158", "mobile": "1320885254814171159"},
    "game": {"fortnite": "1320885254814171161", "minecraft": "1320885254814171160", "among us": "1320885254814171162", "valorant": "1320885254814171163", "rocket league": "1320885254814171164", "gta v": "1320885254814171165", "apex legends": "1320885254814171166", "overwatch": "1320885254814171167", "league of legends": "1320885254814171168", "roblox": "1320885254814171169", "csgo": "1320885254814171170", "rainbow six siege": "1320885254814171171", "call of duty": "1320885254814171172", "animal crossing": "1320885254814171173", "other": "1320885254814171174"},
    "color": {"red": "1320885254814171176", "blue": "1320885254814171175", "green": "1320885254814171177", "yellow": "1320885254814171178", "orange": "1320885254814171179", "purple": "1320885254814171180", "pink": "1320885254814171181", "black": "1320885254814171182", "white": "1320885254814171183", "grey": "1320885254814171184", "brown": "1320885254814171185", "other": "1320885254814171186"},
}