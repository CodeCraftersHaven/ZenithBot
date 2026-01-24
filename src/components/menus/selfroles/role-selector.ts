import { commandModule, CommandType } from "@sern/handler";
import {
  ActionRow,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonComponent,
  ButtonStyle,
  ComponentType,
  MessageActionRowComponent,
  MessageFlags,
} from "discord.js";

export default commandModule({
  type: CommandType.RoleSelect,
  async execute(ctx, { params }) {
    if (!ctx.memberPermissions?.has("ManageGuild"))
      return await ctx.reply({
        content: "You do not have permission to use this command.",
        flags: MessageFlags.Ephemeral,
      });

    const roleId = ctx.values[0];
    const role = await ctx.guild?.roles.fetch(roleId);
    if (!role) return await ctx.reply("Role not found.");
    const label = role.name;
    const msgId = params;
    if (!msgId) return await ctx.reply("Error: Message ID not found.");

    const messages = await ctx.channel?.messages.fetch();
    const message = messages?.get(msgId);
    await ctx.message.delete();
    if (!message) return await ctx.reply("Message not found.");
    const isDuplicate = message.components.some((row) =>
      (row as ActionRow<MessageActionRowComponent>).components.some(
        (c) => c.customId === `rolebutton/${roleId}`,
      ),
    );
    if (isDuplicate) {
      return await ctx.reply({
        content: `Role button for role <@&${roleId}> already exists.`,
        flags: MessageFlags.Ephemeral,
      });
    }
    const newButton = new ButtonBuilder()
      .setCustomId(`rolebutton/${roleId}`)
      .setLabel(label)
      .setStyle(ButtonStyle.Success);

    const components = message.components.map((row) => {
      const rowBuilder = new ActionRowBuilder<ButtonBuilder>();
      const buttons = (row as ActionRow<MessageActionRowComponent>).components
        .filter((c): c is ButtonComponent => c.type === ComponentType.Button)
        .map((c) => {
          const btn = new ButtonBuilder()
            .setLabel(c.label!)
            .setStyle(c.style)
            .setDisabled(c.disabled ?? false);

          if (c.customId) btn.setCustomId(c.customId);
          if (c.emoji) btn.setEmoji(c.emoji);
          if (c.url) btn.setURL(c.url);

          return btn;
        });
      rowBuilder.addComponents(buttons);
      return rowBuilder;
    });

    let added = false;
    if (components.length > 0) {
      const lastRow = components[components.length - 1];
      if (lastRow.components.length < 5) {
        lastRow.addComponents(newButton);
        added = true;
      }
    }

    if (!added) {
      if (components.length >= 5) {
        return await ctx.reply("Max buttons reached (25). Cannot add more.");
      }
      const newRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        newButton,
      );
      components.push(newRow);
    }

    await message.edit({ components });
    await ctx.reply({
      content: `Added role button for role <@&${roleId}>`,
      flags: MessageFlags.Ephemeral,
    });
  },
});
