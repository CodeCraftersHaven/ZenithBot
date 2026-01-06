import { getSystemFromMessage } from "#utils";
import { commandModule, CommandType } from "@sern/handler";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  ModalActionRowComponentBuilder,
  ModalBuilder,
  TextChannel,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

let system: string;

const validSystems = [
  "autorole",
  "counting",
  "giveaway",
  "selfroles",
  "tickets",
  "welcome",
] as const;
type SystemKey = (typeof validSystems)[number];

export default commandModule({
  type: CommandType.Button,
  async execute(ctx, { deps, params }) {
    const [sys, feedback, systems] = [
      deps["systems"].Systems,
      deps["@prisma/client"].feedback,
      deps["@prisma/client"].systems,
    ];

    const act = params! as "delete" | "like" | "dislike" | "comment";

    const commentButton = new ButtonBuilder({
      custom_id: "panel/comment",
      emoji: "💬",
      label: "Comment",
      style: ButtonStyle.Primary,
    });
    const commentRow = new ActionRowBuilder<ButtonBuilder>({
      components: [commentButton],
    });

    const getSysName = async (): Promise<SystemKey | null> => {
      const name = await getSystemFromMessage(
        systems,
        ctx.guildId!,
        ctx.message.id,
      );
      if (!name) return null;
      const lowerName = name.toLowerCase();
      return validSystems.find((s) => s === lowerName) || null;
    };

    const acts = {
      delete: async () => {
        await ctx.deferReply({ flags: MessageFlags.Ephemeral });
        if (!ctx.memberPermissions!.has("ManageGuild")) {
          return await ctx.editReply("You can't delete this message.");
        }

        const sysName = await getSysName();
        if (!sysName) return await ctx.editReply("System not found.");

        system = sysName;

        const Systems = new sys(
          ctx.guild!.id,
          ctx.guild!.name,
          system,
          ctx.channel as TextChannel,
        );
        const remove = await Systems.removeChannel();
        if (remove === "This channel is not added to this system.") {
          await ctx.message.delete();
          return await ctx.editReply(
            `This panel was already deleted, so I've deleted the message for you.`,
          );
        }

        return await ctx.editReply(remove);
      },
      like: async () => {
        await ctx.deferReply({ flags: MessageFlags.Ephemeral });
        const sysName = await getSysName();
        if (!sysName) return await ctx.editReply("System not found.");

        const feedbackDoc = await feedback.findFirst();
        if (!feedbackDoc)
          return await ctx.editReply("Feedback system not initialized.");

        const currentSystemFeedback = feedbackDoc[sysName];

        if (!currentSystemFeedback)
          return await ctx.editReply("Feedback not available for this system.");

        const existingUserIndex = currentSystemFeedback.users.findIndex(
          (u) => u.userId === ctx.user.id,
        );

        if (existingUserIndex !== -1) {
          const user = currentSystemFeedback.users[existingUserIndex];
          if (user.feeling === "like") {
            return await ctx.editReply(
              "You have already liked this system. Thank you!",
            );
          } else {
            currentSystemFeedback.dislikes--;
            currentSystemFeedback.likes++;
            currentSystemFeedback.users[existingUserIndex].feeling = "like";
          }
        } else {
          currentSystemFeedback.likes++;
          currentSystemFeedback.users.push({
            userId: ctx.user.id,
            userName: ctx.user.displayName,
            guildId: ctx.guild!.id,
            feeling: "like",
            comment: "",
          });
        }

        await feedback.update({
          where: { id: feedbackDoc.id },
          data: {
            [sysName]: currentSystemFeedback,
          },
        });

        return await ctx.editReply({
          content:
            "Thank you for your feedback! Would you like to leave a comment?\n-# " +
            sysName,
          components: [commentRow],
        });
      },
      dislike: async () => {
        await ctx.deferReply({ flags: MessageFlags.Ephemeral });
        const sysName = await getSysName();
        if (!sysName) return await ctx.editReply("System not found.");

        const feedbackDoc = await feedback.findFirst();
        if (!feedbackDoc)
          return await ctx.editReply("Feedback system not initialized.");

        const currentSystemFeedback = feedbackDoc[sysName];

        if (!currentSystemFeedback)
          return await ctx.editReply("Feedback not available for this system.");

        const existingUserIndex = currentSystemFeedback.users.findIndex(
          (u) => u.userId === ctx.user.id,
        );

        if (existingUserIndex !== -1) {
          const user = currentSystemFeedback.users[existingUserIndex];
          if (user.feeling === "dislike") {
            return await ctx.editReply(
              "You have already disliked this system. Thank you!",
            );
          } else {
            currentSystemFeedback.likes--;
            currentSystemFeedback.dislikes++;
            currentSystemFeedback.users[existingUserIndex].feeling = "dislike";
          }
        } else {
          currentSystemFeedback.dislikes++;
          currentSystemFeedback.users.push({
            userId: ctx.user.id,
            userName: ctx.user.displayName,
            guildId: ctx.guild!.id,
            feeling: "dislike",
            comment: "",
          });
        }

        await feedback.update({
          where: { id: feedbackDoc.id },
          data: {
            [sysName]: currentSystemFeedback,
          },
        });

        return await ctx.editReply({
          content:
            "Thank you for your feedback. Would you like to leave a comment?\n-# " +
            sysName,
          components: [commentRow],
        });
      },
      comment: async () => {
        const commentModal = new ModalBuilder()
          .setTitle("Feedback Comment")
          .setCustomId("feedback/comment");

        const commentField = new TextInputBuilder()
          .setCustomId("feedback/report")
          .setLabel("Leave your comments here")
          .setPlaceholder("anything to report?")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const firstActionRow =
          new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
            commentField,
          );

        commentModal.addComponents(firstActionRow);
        ctx.showModal(commentModal);
      },
      default: async () => {},
    };
    type Act = keyof typeof acts;
    const result = ((await acts[act as Act]) || acts.default)();
    return result;
  },
});
