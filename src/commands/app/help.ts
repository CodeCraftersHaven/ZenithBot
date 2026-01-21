import { getEnableCommand } from "#utils";
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
        { name: "Set up the bot", value: "setup" },
        // { name: "", value: "" },
        // { name: "", value: "" },
        // { name: "", value: "" },
      ],
      description: "What do you need help with?",
      required: true,
    },
  ],
  execute: async (ctx) => {
    const problem = ctx.options.getString("problem", true);
    const embed = new EmbedBuilder()
      .setTitle("I'm here to help you!")
      .setAuthor({ name: ctx.client.user!.username })
      .setFooter({
        text: `Thank you for using me!`,
        iconURL: ctx.client.user?.displayAvatarURL(),
      })
      .setImage(ctx.client.user!.bannerURL()!);
    let description: string;
    const problems = {
      missingperms: async () => {
        const ideas: string[] = [
          "Give me `ViewChannel, SendMessages, EmbedLinks, and AttachFiles` permissions or a role that includes them.",
          "Ensure the channel permissions allow the same permissions to me",
          "Ensure that you also have `Manage Guild` permissions",
          "Use a channel that I can see and send messages in",
          "Ensure that you have permissions to see and send messages in the channel",
        ];
        description = `One of us are missing permissions in this server. Here are some ideas to fix this:\n${ideas.join(
          "\n",
        )}`;
        embed.setDescription(description);
        return await ctx.reply({ embeds: [embed] });
      },
      setup: async () => {
        description = `To set up the bot, you need to do the following:\n1. Invite the bot to your server\n2. Give the bot \`Manage Server\` permissions or a role that includes it\n3. Move my highest role above the AutoRole role and all self roles.\n4. Use the </system enable:${await getEnableCommand(ctx.client)}> command to set up the bot\n4. Enjoy!`;
        embed.setDescription(description);
        return await ctx.reply({ embeds: [embed] });
      },
      // "": async () => { },
      // "": async () => { },
      // "": async () => { },
      default: async () => {
        return await ctx.reply({ embeds: [embed] });
      },
    };

    type Problems = keyof typeof problems;
    const result = (
      (await problems[problem as Problems]) || problems.default
    )();
    return result;
  },
});
