import { commandModule, CommandType } from "@sern/handler";
import { ActionRowBuilder, Guild, MessageFlags, RoleSelectMenuBuilder, User } from "discord.js";

export default commandModule({
    type: CommandType.Button,
    execute: async (ctx, { deps, params }) => {
        await ctx.deferReply({ flags: MessageFlags.Ephemeral });
        const [autorole, db, logger] = [
            deps["systems"].AutoRole,
            deps["@prisma/client"],
            deps["@sern/logger"],
        ];
        const user = ctx.user as User;
        const guild = ctx.guild as Guild;

        const act = params! as "update";

        const acts: Record<string, () => Promise<void>> = {
            update: async () => {
                await ctx.editReply({
                    content: "Please select the role you want to set as the autorole.",
                    components: [new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
                        new RoleSelectMenuBuilder()
                            .setCustomId("autorole-select")
                            .setPlaceholder("Select a role")
                            .setMinValues(1)
                            .setMaxValues(1)),
                    ],
                });

            },
            default: async () => {
                await ctx.editReply("I'm not even a button!");
            },
        }
        type Act = keyof typeof acts;
        const result = ((await acts[act as Act]) || acts.default)();
        return result;
    },
});
