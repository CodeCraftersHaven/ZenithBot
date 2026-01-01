import { commandModule, CommandType } from "@sern/handler";
import { MessageFlags } from "discord.js";

export default commandModule({
  type: CommandType.RoleSelect,
  async execute(ctx, { deps }) {
    await ctx.deferReply({ flags: MessageFlags.Ephemeral });
    const [autorole] = [deps["systems"].AutoRole];
    await new autorole(true).setRole(ctx.guildId!, ctx.values[0]);
    await ctx.editReply({
      content: `The autorole has been set to <@&${ctx.values[0]}>!`,
    });
  },
});
