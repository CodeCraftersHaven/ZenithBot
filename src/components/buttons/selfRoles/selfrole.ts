import { createModal, findSystem } from "#utils";
import { commandModule, CommandType } from "@sern/handler";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CacheType,
  MessageFlags,
  StringSelectMenuBuilder,
} from "discord.js";

export default commandModule({
  type: CommandType.Button,
  execute: async (ctx, { deps, params }) => {
    if (!ctx.memberPermissions?.has("ManageGuild"))
      return await ctx.reply({
        content: "You do not have permission to use this command.",
        flags: MessageFlags.Ephemeral,
      });
    const { systems } = deps["@prisma/client"];
    const selfRoleSystem = await findSystem(systems, ctx.guildId!, "selfroles");

    if (!selfRoleSystem) {
      return await ctx.reply({
        content: "No self-role messages found for this guild.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const selfRoleMessages = selfRoleSystem.channels.flatMap((channel) =>
      channel.messages.map((msg) => msg.id),
    );

    const messages = await ctx.channel?.messages.fetch();
    const msgs: MSG[] = [];
    for (const message of messages!.values()) {
      if (selfRoleMessages.includes(message.id)) continue;
      if (message.id === ctx.message.id) continue;
      msgs.push({
        messageId: message.id,
        messageInfo: `${message.author.username} > ${message.content ? message.cleanContent.slice(0, 20) : message.embeds[0].title}`,
      });
    }
    const acts = {
      update: async () => {
        const buttons = [
          "create-message",
          "edit-message",
          "delete-message",
          "add-role",
          "remove-role",
        ].map((button) => {
          return new ButtonBuilder({
            style: ["delete-message", "remove-role"].includes(button)
              ? ButtonStyle.Danger
              : ["edit-message", "edit-role"].includes(button)
                ? ButtonStyle.Success
                : ButtonStyle.Primary,
            label: button,
            custom_id: `selfrole/${button.toLowerCase()}`,
          });
        });
        const messageRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          buttons.slice(0, 3),
        );
        const roleRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          buttons.slice(3),
        );

        await ctx.reply({
          content: "What part would you like to update?",
          components: msgs.length > 0 ? [messageRow, roleRow] : [messageRow],
        });
      },
      "create-message": async () => {
        await ctx.showModal(createModal());
      },
      "edit-message": async () => {
        await createMenuBuilder("selfrole/edit-message-select", msgs, ctx);
      },
      "delete-message": async () => {
        await createMenuBuilder("selfrole/delete-message-select", msgs, ctx);
      },
      "remove-role": async () => {
        await createMenuBuilder("selfrole/remove-role-select", msgs, ctx);
      },
      "add-role": async () => {
        await createMenuBuilder("selfrole/add-role-select", msgs, ctx);
      },
      default: async () => {
        await ctx.deleteReply();
      },
    };
    type Act = keyof typeof acts;
    const result = ((await acts[params as Act]) || acts.default)();
    return result;
  },
});

async function createMenuBuilder(
  custom_id: string,
  msgs: MSG[],
  ctx: ButtonInteraction<CacheType>,
) {
  if (!msgs.length) {
    await ctx.message.delete();
    return await ctx.reply({
      content:
        "No messages to edit. I don't see any other messages in this channel.",
      flags: MessageFlags.Ephemeral,
    });
  }
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(custom_id)
    .setPlaceholder("Select a message to edit")
    .addOptions(
      msgs.map((msg) => ({
        label: msg.messageInfo,
        value: msg.messageId,
      })),
    );

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    selectMenu,
  );

  await ctx.message.edit({
    content: "Select a message to edit:",
    components: [row],
  });
}
