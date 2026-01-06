import { commandModule, CommandType } from "@sern/handler";
import { MessageFlags, PrivateThreadChannel } from "discord.js";

export default commandModule({
  type: CommandType.UserSelect,
  async execute(ctx) {
    const userToRemove = ctx.values[0],
      channel = ctx.channel as PrivateThreadChannel,
      hasAccess = channel.members.cache.has(userToRemove);

    if (!hasAccess) {
      return await ctx.reply({
        content: `<@${userToRemove}> does not have access to this channel.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    channel
      .permissionsFor(userToRemove)!
      .remove(["ViewChannel", "SendMessages", "ReadMessageHistory"]);
    await channel.members.remove(userToRemove);
    return ctx.deferUpdate();
  },
});
