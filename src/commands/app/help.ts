import { commandModule, CommandType } from "@sern/handler";
import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";

export default commandModule({
    type: CommandType.Slash,
    description: "need help setting up the bot?",
    options: [
        {
            name: "problem",
            type: ApplicationCommandOptionType.String,
            choices: [
                { name: "Missing Permissions", value: "missingperms" },
                { name: "", value: "" },
                { name: "", value: "" },
                { name: "", value: "" },
                { name: "", value: "" },
                { name: "", value: "" },
            ],
            description: "What do you need help with?",
            required: true
        }
    ],
    execute: async (ctx, { deps }) => {
        const problem = ctx.options.getString("problem", true);

        const embed = new EmbedBuilder().setTitle("I'm here to help you!").setAuthor({ name: ctx.client.user?.username! }).setFooter({ text: `Thank you for using me!`, iconURL: ctx.client.user?.displayAvatarURL() }).setImage(ctx.client.user?.bannerURL()!);
        let description: string;
        const problems = {
            missingperms: async () => {
                const ideas: string[] = [
                    ""
                ]
            },
            "": async () => { },
            "": async () => { },
            "": async () => { },
            "": async () => { },
            "": async () => { },
            default: async () => {
                return await ctx.reply({ embeds: [embed] })
            }
        }

        type Problems = keyof typeof problems;
        const result = ((await problems[problem as Problems]) || problems.default)();
        return result;
    }
})