import { commandModule, CommandType } from "@sern/handler";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Guild,
  MessageFlags,
  PermissionsBitField,
  PrivateThreadChannel,
  TextChannel,
  User,
  UserSelectMenuBuilder,
} from "discord.js";

export default commandModule({
  type: CommandType.Button,
  async execute(ctx, { deps, params }) {
    await ctx.deferReply({ flags: MessageFlags.Ephemeral });
    const [tickets] = [deps["systems"].Tickets];
    const user = ctx.user as User;
    const guild = ctx.guild as Guild;

    const act = params! as
      | "open"
      | "close"
      | "reopen"
      | "check"
      | "add-user"
      | "remove-user";

    const buttons = [
      "🔒|Close",
      "🔒|Reopen",
      "➕|Add-User",
      "➖|Remove-User",
    ].map((button) => {
      const [emoji, name] = button.split("|");
      return new ButtonBuilder({
        style: ButtonStyle.Primary,
        emoji,
        label: name.replace("-", " "),
        custom_id: `tickets/${name.toLowerCase()}`,
      });
    });

    const closeRow = new ActionRowBuilder<ButtonBuilder>({
      components: [buttons[0], buttons[2], buttons[3]],
    });

    const reopenRow = new ActionRowBuilder<ButtonBuilder>({
      components: [buttons[1]],
    });

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
        newThread.ownerId = user.id;

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
        const channel = ctx.channel as PrivateThreadChannel;
        if (
          channel.ownerId !== ctx.user.id ||
          !ctx.memberPermissions!.has(PermissionsBitField.Flags.ManageChannels)
        ) {
          return ctx.editReply({
            content:
              "You do not have permission to remove users from this ticket.",
          });
        }
        const Ticket = new tickets(true, guild.id, channel.id, user.id);
        await channel.setLocked(true, "user has resolved their issue.");
        await ctx.message.edit({ components: [reopenRow] });
        await Ticket.closeTicket();
        return await ctx.deleteReply();
      },
      reopen: async () => {
        const channel = ctx.channel as PrivateThreadChannel;
        if (
          channel.ownerId !== ctx.user.id ||
          !ctx.memberPermissions?.has(PermissionsBitField.Flags.ManageChannels)
        ) {
          return ctx.editReply({
            content:
              "You do not have permission to remove users from this ticket.",
          });
        }
        const Ticket = new tickets(true, guild.id, channel.id, user.id);
        await channel.setLocked(false, "user needs more help");
        await Ticket.reopenTicket();
        await ctx.message.edit({
          content: ctx.message.content,
          components: [closeRow],
        });
        return await ctx.deleteReply();
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
      "add-user": async () => {
        const channel = ctx.channel as PrivateThreadChannel;
        if (
          channel.ownerId !== ctx.user.id ||
          !ctx.memberPermissions!.has(PermissionsBitField.Flags.ManageChannels)
        ) {
          return ctx.editReply({
            content:
              "You do not have permission to remove users from this ticket.",
          });
        }
        const selectMenu = new ActionRowBuilder<UserSelectMenuBuilder>({
          components: [
            new UserSelectMenuBuilder({
              customId: "add-user",
              placeholder: "Select a user to add to the ticket",
              min_values: 1,
              max_values: 1,
            }),
          ],
        });

        await ctx.editReply({
          content: "Select a user to add to the ticket.",
          components: [selectMenu],
        });
      },
      "remove-user": async () => {
        const channel = ctx.channel as PrivateThreadChannel;
        if (
          channel.ownerId !== ctx.user.id ||
          !ctx.memberPermissions!.has(PermissionsBitField.Flags.ManageChannels)
        ) {
          return ctx.editReply({
            content:
              "You do not have permission to remove users from this ticket.",
          });
        }

        const selectMenu = new ActionRowBuilder<UserSelectMenuBuilder>({
          components: [
            new UserSelectMenuBuilder({
              customId: "remove-user",
              placeholder: "Select a user to remove from the ticket",
              min_values: 1,
              max_values: 1,
            }),
          ],
        });

        await ctx.editReply({
          content: "Select a user to remove from the ticket.",
          components: [selectMenu],
        });
      },
      default: () => {},
    };
    type Act = keyof typeof acts;
    const result = ((await acts[act as Act]) || acts.default)();
    return result;
  },
});
