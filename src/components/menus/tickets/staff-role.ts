import { prisma } from "#utils";
import { commandModule, CommandType } from "@sern/handler";
import { MessageFlags, TextChannel } from "discord.js";

export default commandModule({
  type: CommandType.RoleSelect,
  async execute(ctx, { deps }) {
    await ctx.deferReply({ flags: MessageFlags.Ephemeral });
    const db = deps["@prisma/client"];
    const chan = ctx.channel as TextChannel;
    const roleId = ctx.values[0];
    await prisma.systems.update({
      where: { id: chan.guild.id, systems: { some: { name: "tickets" } } },
      data: {
        systems: {
          updateMany: {
            where: { name: "tickets" },
            data: {
              channels: {
                updateMany: {
                  where: { id: chan.id },
                  data: { staffId: roleId },
                },
              },
            },
          },
        },
      }
    })
    return ctx.editReply({
      content: `Staff role for tickets in this channel has been set to <@&${roleId}>.`,
    }).catch(() => {
      return ctx.editReply({
        content:
          "Could not find the ticket system configuration for this channel.",
      });
    })
  }
});
