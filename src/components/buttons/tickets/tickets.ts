import { findSystem } from "#utils";
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
  RoleSelectMenuBuilder,
  TextChannel,
  User,
  UserSelectMenuBuilder,
} from "discord.js";

export default commandModule({
  type: CommandType.Button,
  async execute(ctx, { deps, params }) {
    await ctx.deferReply({ flags: MessageFlags.Ephemeral });
    const [tickets, prisma] = [deps["systems"].Tickets, deps["@prisma/client"]];
    const user = ctx.user as User;
    const guild = ctx.guild as Guild;

    const act = params! as
      | "open"
      | "close"
      | "check"
      | "add-user"
      | "remove-user"
      | "staff"
      | "claim-ticket";

    const buttons = [
      "🔒|Close",
      "➕|Add-User",
      "➖|Remove-User",
      "🛡️|Staff-Role",
      "🛄|Claim-Ticket",
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
      components: [buttons[0], buttons[1], buttons[2]],
    });
    const claimRow = new ActionRowBuilder<ButtonBuilder>({
      components: [buttons[4]],
    });

    const channel = ctx.message.channel as TextChannel;
    const thread = ctx.channel as PrivateThreadChannel;
    const id = thread.name.split("-")[1];
    const acts = {
      open: async () => {
        const name = `ticket-${user.id}`;
        const threads = await channel.threads.fetch();
        if (
          threads.threads.some(
            (thread) => thread.name === name && !thread.locked,
          )
        ) {
          return ctx.editReply(
            `You already have a ticket open: <#${(threads.threads.find((thread) => thread.name === name) as PrivateThreadChannel).id}>`,
          );
        }
        const existing = await findSystem(prisma.systems, guild.id, "tickets");
        const staffId = existing?.channels.find(
          (c) => c.id === channel.id,
        )?.staffId;
        if (!staffId) {
          return ctx.editReply(
            "No staff role configured for this ticket system.",
          );
        }

        const newThread = await channel.threads.create({
          name,
          type: ChannelType.PrivateThread,
          invitable: false,
        });
        const Ticket = new tickets(true, guild.id, newThread.id, user.id);
        await newThread.join();
        await newThread.members.add(user.id);
        await newThread.send({
          content: `<@${user.id}>, here is your ticket channel. Please briefly describe your issue and a moderator will be with you shortly.`,
          components: [closeRow],
        });

        await Ticket.openTicket();
        await newThread.send({
          content: `<@&${staffId}>, Please claim the ticket by clicking the button below. This will remove everyone else from the ticket.`,
          components: [claimRow],
        });
        return ctx.editReply(
          `Ticket opened in <#${(newThread as PrivateThreadChannel).id}>`,
        );
      },
      close: async () => {
        /**
         * TODO: Create a logger for closed tickets
         */
        if (
          !ctx.memberPermissions!.has(
            PermissionsBitField.Flags.ManageChannels,
          ) &&
          id !== ctx.user.id
        ) {
          return ctx.editReply({
            content: "You do not have permission to close this ticket.",
          });
        }
        const Ticket = new tickets(true, guild.id, thread.id, id);
        await thread.setLocked(true, "user has resolved their issue.");
        await ctx.message.edit({ components: [] });

        await thread.send({
          embeds: [{ description: "This ticket has been closed." }],
        });

        await Ticket.closeTicket();
        return await ctx.deleteReply();
      },
      check: async () => {
        const channel = ctx.message.channel as TextChannel;
        const Ticket = new tickets(true, guild.id, channel.id, user.id);
        const ticketExists = await Ticket.checkOpenTicket();
        if (ticketExists.exists) {
          const ticket = ticketExists.ticket!;
          const ticketChannel = guild.channels.cache.get(ticket.channelId);
          if (ticketChannel)
            return await ctx.editReply(
              `You have a ticket open here: <#${ticket?.channelId}> `,
            );
          else {
          }
        }
        return await ctx.editReply("You have no tickets open.");
      },
      "add-user": async () => {
        if (
          !ctx.memberPermissions!.has(
            PermissionsBitField.Flags.ManageChannels,
          ) &&
          id !== ctx.user.id
        ) {
          return ctx.editReply({
            content: "You do not have permission to add users add this ticket.",
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
        if (
          !ctx.memberPermissions!.has(
            PermissionsBitField.Flags.ManageChannels,
          ) &&
          id !== ctx.user.id
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
      staff: async () => {
        if (
          !ctx.memberPermissions!.has(PermissionsBitField.Flags.ManageRoles)
        ) {
          return ctx.editReply({
            content:
              "You do not have permission to change the staff role for this ticket system.",
          });
        }
        const selectMenu = new ActionRowBuilder<RoleSelectMenuBuilder>({
          components: [
            new RoleSelectMenuBuilder({
              customId: "staff-role",
              placeholder: "Select a role to set as the staff role",
              min_values: 1,
              max_values: 1,
            }),
          ],
        });

        await ctx.editReply({
          content: "Select a role to set as the staff role.",
          components: [selectMenu],
        });
      },
      "claim-ticket": async () => {
        const existing = await findSystem(prisma.systems, guild.id, "tickets");
        const staffRoleId = existing?.channels.find(
          (c) => c.id === channel.parentId,
        )?.staffId;

        if (!staffRoleId) {
          return ctx.editReply(
            "No staff role configured for this ticket system.",
          );
        }

        const staffRole = guild.roles.cache.get(staffRoleId);
        if (!staffRole) {
          return ctx.editReply("The configured staff role no longer exists.");
        }
        const membersInThread = await thread.members.fetch();
        const staffMembersInThread = membersInThread.filter((member) =>
          member.guildMember?.roles.cache.has(staffRoleId),
        );

        if (!staffMembersInThread.has(ctx.user.id)) {
          return ctx.editReply({
            content: "You do not have permission to claim this ticket.",
          });
        }

        // eslint-disable-next-line unused-imports/no-unused-vars
        for (const [memberId, member] of staffMembersInThread) {
          if (memberId !== ctx.user.id && memberId !== id) {
            await thread.members.remove(memberId);
          }
        }

        await ctx.message.edit({ components: [] });
        return ctx.editReply({
          content: `You have claimed this ticket. All other staff members have been removed.`,
        });
      },
      default: () => {},
    };
    type Act = keyof typeof acts;
    const result = ((await acts[act as Act]) || acts.default)();
    return result;
  },
});
