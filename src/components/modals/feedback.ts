import { commandModule, CommandType } from "@sern/handler";
import { MessageFlags, TextChannel } from "discord.js";

const validSystems = [
  "autorole",
  "counting",
  "giveaway",
  "selfroles",
  "tickets",
  "welcome",
] as const;

export default commandModule({
  type: CommandType.Modal,
  description: "send me your feedback",
  async execute(ctx, { deps, params }) {
    const [feedback] = [deps["@prisma/client"].feedback];

    const act = params! as "comment";
    await ctx.deferReply({ flags: MessageFlags.Ephemeral });
    const acts = {
      comment: async () => {
        const { client } = ctx;
        const report = ctx.fields.getTextInputValue("feedback/report");
        const repChannel = (await client.channels.fetch(
          process.env.REPORTS_ID!,
        )) as TextChannel;

        if (!ctx.message) {
          return await ctx.editReply("Could not find the original message.");
        }

        const rawSysName = ctx.message.content.split("\n")[1].slice(3);

        if (!rawSysName) {
          return await ctx.editReply(
            "Could not determine the system from the message.",
          );
        }
        const lowerSysName = rawSysName.toLowerCase();
        const sysName = validSystems.find((s) => s === lowerSysName);

        if (!sysName) {
          return await ctx.editReply(
            `No feedback data found for system: ${rawSysName}`,
          );
        }

        const feedbackDoc = await feedback.findFirst();
        if (!feedbackDoc) {
          return await ctx.editReply("Feedback system not initialized.");
        }

        const systemFeedback = feedbackDoc[sysName];

        if (!systemFeedback) {
          return await ctx.editReply(
            `No feedback data found for system: ${rawSysName}`,
          );
        }

        const userIndex = systemFeedback.users.findIndex(
          (u) => u.userId === ctx.user.id,
        );

        if (userIndex !== -1) {
          systemFeedback.users[userIndex].comment = report;

          await feedback.update({
            where: { id: feedbackDoc.id },
            data: {
              [sysName]: systemFeedback,
            },
          });
        } else {
          systemFeedback.users.push({
            userId: ctx.user.id,
            userName: ctx.user.displayName,
            guildId: ctx.guildId!,
            feeling: "neutral",
            comment: report,
          });

          await feedback.update({
            where: { id: feedbackDoc.id },
            data: {
              [sysName]: systemFeedback,
            },
          });
        }

        repChannel.send(
          `[REPORTS] - <@${ctx.user.id}> (${rawSysName}): ${report}`,
        );
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
