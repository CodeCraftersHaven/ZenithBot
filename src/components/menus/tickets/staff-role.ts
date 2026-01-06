import { findSystem } from "#utils";
import { commandModule, CommandType } from "@sern/handler";
import { MessageFlags, TextChannel } from "discord.js";

export default commandModule({
  type: CommandType.RoleSelect,
  async execute(ctx, { deps }) {
    await ctx.deferReply({ flags: MessageFlags.Ephemeral });
    const db = deps["@prisma/client"];
    const chan = ctx.channel as TextChannel;
    const roleId = ctx.values[0];
    const exists = await findSystem(db.systems, chan.guild.id, "tickets");
    if (exists) {
      const systemIndex = exists.channels.findIndex(
        (s) => s.name === "tickets",
      );
      if (systemIndex !== -1) {
        const channelIndex = exists.channels.findIndex((c) => c.id === chan.id);
        if (channelIndex !== -1) {
          exists.channels[channelIndex].staffId = roleId;
          await db.systems.update({
            where: { id: chan.guild.id },
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
            },
          });
          return ctx.editReply({
            content: `Staff role for tickets in this channel has been set to <@&${roleId}>.`,
          });
        }
      }
      return ctx.editReply({
        content:
          "Could not find the ticket system configuration for this channel.",
      });
    }
  },
});
