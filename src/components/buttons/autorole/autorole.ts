import { commandModule, CommandType } from "@sern/handler";
import {
  ActionRowBuilder,
  Guild,
  MessageFlags,
  RoleSelectMenuBuilder,
} from "discord.js";

export default commandModule({
  type: CommandType.Button,
  execute: async (ctx, { deps, params }) => {
    await ctx.deferReply({ flags: MessageFlags.Ephemeral });
    const [autorole] = [deps["systems"].AutoRole];
    const guild = ctx.guild as Guild;

    const act = params! as "update" | "check";

    const acts: Record<string, () => Promise<void>> = {
      update: async () => {
        await ctx.editReply({
          content: "Please select the role you want to set as the autorole.",
          components: [
            new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
              new RoleSelectMenuBuilder()
                .setCustomId("autorole-select")
                .setPlaceholder("Select a role")
                .setMinValues(1)
                .setMaxValues(1),
            ),
          ],
        });
      },
      check: async () => {
        const currentRole = await new autorole(true).getRole(guild.id);
        if (!currentRole) {
          await ctx.editReply("Auto Role not set");
          return;
        }
        const role = guild.roles.cache.get(currentRole);
        if (!role) {
          await ctx.editReply("Selected role not found");
          return;
        }
        await ctx.editReply(`The autorole is set to ${role}!`);
      },
      default: async () => {
        await ctx.editReply("I'm not even a button!");
      },
    };
    type Act = keyof typeof acts;
    const result = ((await acts[act as Act]) || acts.default)();
    return result;
  },
});
