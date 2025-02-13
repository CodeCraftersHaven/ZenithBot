import { commandModule, CommandType } from "@sern/handler";
import { IntegrationContextType, publishConfig } from "@sern/publisher";
import { ApplicationCommandOptionType, PermissionsBitField } from "discord.js";

export default commandModule({
    name: "self-roles",
    description: "Manage self roles",
    type: CommandType.Slash,
    plugins: [
        publishConfig({
            defaultMemberPermissions: PermissionsBitField.Flags.Administrator,
            integrationTypes: ["Guild"],
            contexts: [IntegrationContextType.GUILD]
        })
    ],
    options: [
        {
            name: "create",
            description: "This will create a new message with selfs",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: "message",
                    description: "The title for the embed to create.",
                    type: ApplicationCommandOptionType.String,
                    required: true,
                },
                {
                    name: "description",
                    description: "The description of the embed.",
                    type: ApplicationCommandOptionType.String,
                    required: true,
                },
                {
                    name: "roles",
                    description: "The roles to add to the message.",
                    type: ApplicationCommandOptionType.String,
                    required: false
                },
            ],
        },
        {
            name: "manage",
            description: "Manage current self roles.",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: "message",
                    description: "The message to remove the self from",
                    type: ApplicationCommandOptionType.String,
                    required: true,
                    autocomplete: true,
                    command: {
                        onEvent: [],
                        async execute(ctx, tbd) {
                            const prisma = tbd.deps["@prisma/client"];
                            const { selfRoles } = prisma;
                            const messages = await selfRoles.findMany({ where: { guildId: ctx.guildId! }, select: { messages: true } });
                            return messages.flatMap(({ messages }) => messages.map((msg) => ({ name: msg.title, value: msg.id })));
                        },
                    }
                },
                {
                    name: "role",
                    description: "The role to remove.",
                    type: ApplicationCommandOptionType.String,
                    required: true,
                    autocomplete: true,
                    command: {
                        onEvent: [],
                        async execute(ctx, tbd) {
                            const message = ctx.options.getString("message", true);
                            const prisma = tbd.deps["@prisma/client"];
                            const { selfRoles } = prisma;
                            const roles = await selfRoles.findMany({
                                where: {
                                    guildId: ctx.guildId!,
                                    messages: { some: { id: message } }
                                },
                                select: { messages: { select: { roles: true } } }
                            });
                            return roles.flatMap(({ messages }) => messages.flatMap(({ roles }) => roles)).map(({ roleId, name }) => ({ name, value: roleId }));
                        },
                    }
                },

            ],
        },
    ],
    async execute(ctx, { deps }) {
        const [prisma, { SelfRoles }, client, logger] = [deps["@prisma/client"], deps["systems"], deps["@sern/client"], deps["@sern/logger"]];
        const enabled = await prisma.systems.findFirst({ where: { id: ctx.guild?.id!, systems: { some: { name: "SelfRoles".toLowerCase(), enabled: true } } } });
        if (!enabled) {
            new SelfRoles(false)
            return ctx.reply("The SelfRoles system is not enabled in this server. Please use </system enable:1335686173011476501>");
        }
        const { selfRoles } = prisma;
        // const subs = {
        //     create: async (message: string, description: string, roles) => {
        //         const data = {
        //             message,
        //             description,
        //             roles: JSON.parse(roles),
        //         };
        //         await selfRoles.create({ data });
        //         return "Self roles created!";
        //     },
        //     manage: async (message: string, role) => {
        //         await selfRoles.delete({ where: { message, role } });
        //         return "Self role deleted!";
        //     },
        // };
        // type SubKey = keyof typeof subs;
        // const sub = interaction.options.getSubcommand() as SubKey;
        // const message = interaction.options.getString("message", true);
        // const description = interaction.options.getString("description", false)!;
        // const roles = interaction.options.getString("roles", false);
        // const role = interaction.options.getRole("role", false);
        // const result = await subs[sub](message, description, roles || role);
        // return result;
    },
})