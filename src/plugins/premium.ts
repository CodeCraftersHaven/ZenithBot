//@ts-nocheck
import { CommandControlPlugin, CommandType, controller } from '@sern/handler';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, Snowflake } from 'discord.js';

export function premiumOnly(skuId: Snowflake) {
    return CommandControlPlugin<CommandType.Both>(async (ctx) => {
        const hasEntitlement = ctx.interaction.entitlements.some(
            (ent) => ent.skuId === skuId
        );

        if (hasEntitlement) {
            return controller.next();
        }

        const premiumButton = new ButtonBuilder()
            .setStyle(ButtonStyle.Premium)
            .setSKUId(skuId);

        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(premiumButton);

        const messagePayload = {
            content: "🔒 **Premium Required**\nThis command is available to premium subscribers only. Click below to upgrade!",
            components: [row],
        };

        if (ctx.isSlash()) {
            await ctx.interaction.reply({ ...messagePayload, flags: MessageFlags.Ephemeral });
        } else {
            await ctx.message.reply(messagePayload);
        }

        return controller.stop();
    });
}