import { CommandControlPlugin, CommandType, controller } from "@sern/handler";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  Snowflake,
} from "discord.js";

export function premiumMsgOnly(skuId: Snowflake) {
  return CommandControlPlugin<CommandType.CtxMsg>(async (ctx) => {
    const hasEntitlement = ctx.entitlements.some(
      (ent) => ent.skuId === skuId,
    );

    if (hasEntitlement) {
      return controller.next();
    }

    const premiumButton = new ButtonBuilder()
      .setStyle(ButtonStyle.Premium)
      .setSKUId(skuId);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      premiumButton,
    );

    const messagePayload = {
      content:
        "🔒 **Premium Required**\nThis command is available to premium subscribers only. Click below to upgrade!",
      components: [row],
    };

    await ctx.reply({
      ...messagePayload,
      flags: MessageFlags.Ephemeral,
    });

    return controller.stop();
  });
}
