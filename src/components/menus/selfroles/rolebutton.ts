import { commandModule, CommandType } from "@sern/handler";
import { MessageFlags } from "discord.js";

export default commandModule({
  type: CommandType.Button,
  async execute(ctx, { params }) {
    const roleId = params!;
    const role = await ctx.guild?.roles.fetch(roleId);
    if (!role) return await ctx.reply("Role not found.");

    const member = await ctx.guild?.members.fetch(ctx.user.id);
    if (!member) return await ctx.reply("Member not found.");

    if (member.roles.cache.has(roleId)) {
      await member.roles.remove(roleId);
      return await ctx.reply({
        content: `Removed role <@&${roleId}>`,
        flags: MessageFlags.Ephemeral,
      });
    } else {
      await member.roles.add(roleId);
      return await ctx.reply({
        content: `Added role <@&${roleId}>`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
});
