import { commandModule, CommandType } from "@sern/handler";
import {
  ActionRow,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonComponent,
  ComponentType,
  MessageActionRowComponent
} from "discord.js";

export default commandModule({
  type: CommandType.StringSelect,
  async execute(ctx, { params }) {
    await ctx.deferUpdate()
    if (!ctx.memberPermissions?.has("ManageGuild"))
      return await ctx.editReply({
        content: "You do not have permission to use this command.",
      });

    const roleId = ctx.values[0];
    const msgId = params;

    if (!msgId) return await ctx.editReply("Error: Message ID not found.");

    const message = await ctx.channel?.messages.fetch(msgId);
    if (!message) return await ctx.editReply("Message not found.");
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
              .setLabel(c.label!)
              .setCustomId(c.customId!)
              .setDisabled(c.disabled ?? false);

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
    await ctx.editReply({
      content: `Removed role button for role <@&${roleId}>`,
      components: [],
    });
  },
});
