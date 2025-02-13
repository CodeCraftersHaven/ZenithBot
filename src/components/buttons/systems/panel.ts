import { commandModule, CommandType } from "@sern/handler";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, ModalActionRowComponentBuilder, ModalBuilder, TextChannel, TextInputBuilder, TextInputStyle } from "discord.js";

let system: string;

export default commandModule({
    type: CommandType.Button,
    async execute(ctx, { deps, params }) {
        const [sys, db, feedback] = [deps["systems"].Systems, deps["@prisma/client"].systems, deps["@prisma/client"].feedback];
        const Systems = new sys();
        const act = params! as 'delete' | 'like' | 'dislike' | 'comment';
       
        const userFeedback = await feedback.findMany({ where: { id: ctx.guild?.id }, select: { users: true } });
        const commentButton = new ButtonBuilder({
            custom_id: 'panel/comment',
            emoji: '💬',
            label: 'Comment',
            style: ButtonStyle.Primary
        });
        const commentRow = new ActionRowBuilder<ButtonBuilder>({components: [commentButton]})
        const acts = {
            delete: async () => {
                await ctx.deferReply({ flags: MessageFlags.Ephemeral });
                const embed = ctx.message.embeds[0];
                const reasonFieldValue = embed.fields.find((f) => f.name === "Reason")?.value;

                if (reasonFieldValue) {
                    system = reasonFieldValue.split(" ")[0].toLowerCase()
                }
                await Systems.clearPanel(ctx, system)

            },
            like: async () => {
                await ctx.deferReply({ flags: MessageFlags.Ephemeral });
                const feedbackId = userFeedback[0].users[0].userId
                if (feedbackId === ctx.user.id) {
                    await ctx.editReply("You have already shared your feelings. Thank you!");
                    return;
                }
                
                const newUser = {
                    userId: ctx.user.id,
                    userName: ctx.user.displayName,
                    feeling: "like",
                    comment: ""
                }
                await feedback.upsert({
                    where: { id: ctx.guild?.id! },
                    create: { id: ctx.guild?.id!, likes: 1, dislikes: 0, users: { set: [newUser] } },
                    update: { likes: { increment: 1 }, dislikes: { decrement: 1 }, users: { updateMany: { where: { userId: ctx.user.id }, data: newUser } } }
                })
                await ctx.editReply({content: "Thank you for your feedback. Would you like to leave a comment?", components: [commentRow]})
            },
            dislike: async () => {
                await ctx.deferReply({ flags: MessageFlags.Ephemeral });
                const feedbackId = userFeedback[0].users[0].userId
                if (feedbackId === ctx.user.id) {
                    await ctx.editReply("You have already shared your feelings. Thank you!");
                    return;
                }
                const newUser = {
                    userId: ctx.user.id,
                    userName: ctx.user.displayName,
                    feeling: "dislike",
                    comment: ""
                }
                await feedback.upsert({
                    where: { id: ctx.guild?.id! },
                    create: { id: ctx.guild?.id!, likes: 0, dislikes: 1, users: { set: [newUser] } },
                    update: { dislikes: { increment: 1 }, likes: { decrement: 1 }, users: { updateMany: { where: { userId: ctx.user.id }, data: newUser } } }
                })
                await ctx.editReply({content: "Thank you for your feedback. Would you like to leave a comment?", components: [commentRow]})
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
                new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(commentField);
          
              commentModal.addComponents(firstActionRow);
              ctx.showModal(commentModal);
            },
            default: async () => {
                await ctx.editReply("Working")
            },
        }
        type Act = keyof typeof acts;
        const result = ((await acts[act as Act]) || acts.default)();
        return result;
    },
})