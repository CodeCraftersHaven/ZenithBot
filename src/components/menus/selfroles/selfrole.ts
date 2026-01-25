import { updateModal } from "#utils";
import { commandModule, CommandType } from "@sern/handler";
import {
  ActionRow,
  ActionRowBuilder,
  ButtonComponent,
  ComponentType,
  MessageActionRowComponent,
  MessageFlags,
  RoleSelectMenuBuilder,
  StringSelectMenuBuilder,
} from "discord.js";

export default commandModule({
  type: CommandType.StringSelect,
  async execute(ctx, { params }) {
    if (!ctx.memberPermissions?.has("ManageGuild"))
      return await ctx.reply({
        content: "You do not have permission to use this command.",
        flags: MessageFlags.Ephemeral,
      });
    const msgId = ctx.values[0];
    const messages = await ctx.channel?.messages.fetch();
    if (!messages) return await ctx.update("No messages found.");

    const acts = {
      "delete-message-select": async () => {
        const message = messages.get(msgId);
        if (!message) return await ctx.update("Message not found.");
        await message.delete();
        await ctx.update({
          content: "Message deleted.",
          components: [],
        });
      },
      "edit-message-select": async () => {
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId("selfrole/edit-message-fields")
          .setPlaceholder("What do you want to edit?")
          .addOptions([
            { label: "Title", value: "title" },
            { label: "Description", value: "description" },
          ]);

        const row =
          new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            selectMenu,
          );
        await ctx.update({
          content: "Select a field to edit:\n" + msgId,
          components: [row],
        });
      },
      "edit-message-fields": async () => {
        const field = ctx.values[0];
        await ctx.showModal(updateModal(field));
      },
      "remove-role-select": async () => {
        const message = messages.get(msgId);
        if (!message) return await ctx.editReply("Message not found.");

        const buttons = message.components
          .flatMap(
            (row) => (row as ActionRow<MessageActionRowComponent>).components,
          )
          .filter((c) => c.type === ComponentType.Button) as ButtonComponent[];

        if (buttons.length === 0) {
          return await ctx.update({
            content: "No buttons to remove.",
            components: [],
          });
        }

        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId(`role-remover/${msgId}`)
          .setPlaceholder("Select a role to remove")
          .setMinValues(1)
          .setMaxValues(1)
          .addOptions(
            buttons.slice(0, 25).map((b) => ({
              label: b.label || "Unknown",
              value: b.customId?.split("/").pop() || "unknown",
              emoji: b.emoji || undefined,
            })),
          );

        const row =
          new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            selectMenu,
          );

        await ctx.update({
          content: "Select a role to remove:",
          components: [row],
        });
      },
      "add-role-select": async () => {
        const message = messages.get(msgId);
        if (!message) return await ctx.update("Message not found.");
        const existingRow = message.components;
        if (existingRow.length >= 5) {
          const lastRow =
            existingRow[4] as ActionRow<MessageActionRowComponent>;
          if (lastRow.components.length >= 5) {
            return await ctx.update({
              content:
                "Max buttons reached (25). Please remove some before adding new ones.",
              components: [],
            });
          }
        }

        const roleSelect = new RoleSelectMenuBuilder()
          .setCustomId(`role-adder/${msgId}`)
          .setPlaceholder("Select the role to add")
          .setMinValues(1)
          .setMaxValues(1);

        const row = new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
          roleSelect,
        );

        await ctx.update({
          content: "Select a role to add:",
          components: [row],
        });
      },
      default: async () => {},
    };
    type Act = keyof typeof acts;
    const result = ((await acts[params as Act]) || acts.default)();
    return result;
  },
});
