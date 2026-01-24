import { commandModule, CommandType } from "@sern/handler";
import {
  ActionRow,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonComponent,
  ComponentType,
  MessageActionRowComponent,
  MessageFlags,
} from "discord.js";

export default commandModule({
  type: CommandType.StringSelect,
  async execute(ctx, { params }) {
    if (!ctx.memberPermissions?.has("ManageGuild"))
      return await ctx.reply({
        content: "You do not have permission to use this command.",
        flags: MessageFlags.Ephemeral,
      });

    const roleId = ctx.values[0];
    const msgId = params;

    if (!msgId) return await ctx.reply("Error: Message ID not found.");

    const message = await ctx.channel?.messages.fetch(msgId);
    if (!message) return await ctx.reply("Message not found.");
    await ctx.message.delete();
    const newComponents = message.components
      .map((row) => {
        const rowBuilder = new ActionRowBuilder<ButtonBuilder>();
        const buttons = (row as ActionRow<MessageActionRowComponent>).components
          .filter(
            (c): c is ButtonComponent =>
              c.type === ComponentType.Button && !c.customId?.endsWith(roleId),
          )
          .map((c) => {
            const btn = new ButtonBuilder()
              .setStyle(c.style)
              .setDisabled(c.disabled ?? false);

            if (c.label) btn.setLabel(c.label);
            if (c.customId) btn.setCustomId(c.customId);
            if (c.emoji) btn.setEmoji(c.emoji);
            if (c.url) btn.setURL(c.url);

            return btn;
          });

        if (buttons.length > 0) {
          rowBuilder.addComponents(buttons);
          return rowBuilder;
        }
        return null;
      })
      .filter((r) => r !== null) as ActionRowBuilder<ButtonBuilder>[];

    await message.edit({ components: newComponents });
    await ctx.reply({
      content: `Removed role button for role <@&${roleId}>`,
      flags: MessageFlags.Ephemeral,
    });
  },
});
