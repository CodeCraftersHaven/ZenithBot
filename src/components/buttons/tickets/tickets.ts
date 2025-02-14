import { commandModule, CommandType } from "@sern/handler";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Guild,
  MessageFlags,
  PrivateThreadChannel,
  TextChannel,
  User,
} from "discord.js";

export default commandModule({
  type: CommandType.Button,
  async execute(ctx, { deps, params }) {
    await ctx.deferReply({ flags: MessageFlags.Ephemeral });
    const [tickets, db, logger] = [
      deps["systems"].Tickets,
      deps["@prisma/client"],
      deps["@sern/logger"],
    ];
    const user = ctx.user as User;
    const guild = ctx.guild as Guild;

    const act = params! as "open" | "close" | "reopen" | "check";

    const acts = {
      open: async () => {
        const channel = ctx.message.channel as TextChannel;

        const newThread = await channel.threads.create({
          name: `ticket-${user.id}`,
          type: ChannelType.PrivateThread,
          invitable: false,
        });
        const Ticket = new tickets(true, guild.id, newThread.id, user.id);
        await newThread.join();
        await newThread.members.add(user.id);
        const closeTicket = new ButtonBuilder()
          .setCustomId("tickets/close")
          .setLabel("Close Ticket")
          .setStyle(ButtonStyle.Primary)
          .setEmoji("🔒");
        const closeRow = new ActionRowBuilder<ButtonBuilder>({
          components: [closeTicket],
        });
        await newThread.send({
          content: `<@${user.id}>, here is your ticket channel. Please briefly describe your issue and a moderator will be with you shortly.`,
          components: [closeRow],
        });

        await Ticket.openTicket();
        return ctx.editReply(
          `Ticket opened in <#${(newThread as PrivateThreadChannel).id}>`,
        );
      },
      close: async () => {
        const channel = ctx.message.channel as PrivateThreadChannel;
        const Ticket = new tickets(true, guild.id, channel.id, user.id);
        await channel.setLocked(true, "user has resolved their issue.");
        await channel.send({
          content: `The channel has been locked. Only mods can reopen the ticket if needed..`,
        });
        await Ticket.closeTicket();

        return await ctx.deleteReply();
      },
      reopen: async () => {
        const channel = ctx.message.channel as PrivateThreadChannel;
        const Ticket = new tickets(true, guild.id, channel.id, user.id);
        await channel.setLocked(false, "user needs more help");
        await Ticket.reopenTicket();
        return await ctx.editReply(
          "I've reopened the channel for you. Do you still need help?",
        );
      },
      check: async () => {
        const channel = ctx.message.channel as TextChannel;
        const Ticket = new tickets(true, guild.id, channel.id, user.id);
        const ticketExists = await Ticket.checkOpenTicket();
        if (ticketExists.exists) {
          const ticket = ticketExists.ticket;
          return await ctx.editReply(
            `You have a ticket open here: <#${ticket?.channelId}> `,
          );
        }
        return await ctx.editReply("You have no tickets open.");
      },
      default: () => {},
    };
    type Act = keyof typeof acts;
    const result = ((await acts[act as Act]) || acts.default)();
    return result;
  },
});
