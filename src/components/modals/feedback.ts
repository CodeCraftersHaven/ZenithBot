import { commandModule, CommandType } from "@sern/handler";
import { MessageFlags, TextChannel } from "discord.js";

export default commandModule({
  type: CommandType.Modal,
  description: "send me your feedback",
  async execute(ctx, { deps, params }) {
    const [sys, db, feedback] = [
      deps["systems"].Systems,
      deps["@prisma/client"].systems,
      deps["@prisma/client"].feedback,
    ];
    const act = params! as "comment";
    await ctx.deferReply({ flags: MessageFlags.Ephemeral });
    const acts = {
      comment: async () => {
        const { client } = ctx;
        const report = ctx.fields.getTextInputValue("feedback/report");
        const repChannel = (await client.channels.fetch(
          process.env.REPORTS_ID!,
        )) as TextChannel;
        await feedback.update({
          where: { id: ctx.guildId! },
          data: {
            users: {
              updateMany: {
                where: { userId: ctx.user.id },
                data: { comment: report },
              },
            },
          },
        });
        repChannel.send(`[REPORTS] - <@${ctx.user.id}>: ${report}`);
        await ctx.editReply(
          "I have sent your report to the developer. Thank you for your feedback!",
        );
      },
      default: async () => {},
    };
    type Act = keyof typeof acts;
    const result = ((await acts[act as Act]) || acts.default)();
    return result;
  },
});
