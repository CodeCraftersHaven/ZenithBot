import { downloadImage } from "#utils";
import { commandModule, CommandType } from "@sern/handler";
import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} from "discord.js";

const GUILD_SKU_ID = process.env.GUILD_SKU_ID!;

export default commandModule({
  type: CommandType.Slash,
  description: "Configure the welcome message style",
  options: [
    {
      name: "style",
      description: "Choose an image style",
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
        { name: "Default Theme", value: "Default" },
        { name: "Sunset Theme", value: "Sunset" },
        { name: "Cyberpunk Theme", value: "Cyberpunk" },
        { name: "Forest Theme", value: "Forest" },
        { name: "Neon Theme", value: "Neon" },
        { name: "PalLink", value: "PalLink" },
        { name: "✨ Custom Image (Premium)", value: "custom" },
      ],
    },
    {
      name: "embed",
      description: "Send the welcome message as an embed",
      type: ApplicationCommandOptionType.Boolean,
      required: false,
    },
    {
      name: "image",
      description: "Upload image (Required for Custom style)",
      type: ApplicationCommandOptionType.Attachment,
      required: false,
    },
    {
      name: "display-member-count",
      description: "whether to display what member number the new member is",
      type: ApplicationCommandOptionType.Boolean,
      required: false,
    }
  ],
  execute: async (ctx, { deps: { "@prisma/client": prisma } }) => {
    const { interaction } = ctx;

    if (!interaction.memberPermissions?.has("ManageGuild")) {
      return interaction.reply({
        content: "❌ You need **Manage Server** permissions.",
        ephemeral: true,
      });
    }

    const style = interaction.options.getString("style", true);
    const embed = interaction.options.getBoolean("embed");
    const attachment = interaction.options.getAttachment("image");
    const displayMemberCount = interaction.options.getBoolean("display-member-count");


    const existingConfig = await prisma.guildConfig.findUnique({
      where: { id: interaction.guildId! },
    });
    const finalEmbed = embed ?? existingConfig?.embed ?? false;

    const hasEntitlement = interaction.entitlements.some(
      (e) => e.skuId === GUILD_SKU_ID,
    );

    if (style === "PalLink" && ctx.guild?.id !== "1399150174357422150") {
      return interaction.reply({
        content: "🔒 **This style is locked.**",
        flags: MessageFlags.Ephemeral,
      });
    }
    if (style === "custom") {
      if (!hasEntitlement) {
        const premiumBtn = new ButtonBuilder()
          .setStyle(ButtonStyle.Premium)
          .setSKUId(GUILD_SKU_ID);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          premiumBtn,
        );

        return interaction.reply({
          content:
            "🔒 **This style is locked.**\nUpload your own welcome images by subscribing to Premium!",
          components: [row],
          ephemeral: true,
        });
      }

      if (!attachment) {
        return interaction.reply({
          content: "⚠️ You selected **Custom** but didn't attach an image!",
          ephemeral: true,
        });
      }
      if (!attachment.contentType?.startsWith("image/")) {
        return interaction.reply({
          content: "⚠️ Please upload a valid image file (PNG, JPG, GIF).",
          ephemeral: true,
        });
      }

      try {
        const localPath = await downloadImage(
          attachment.url,
          interaction.guildId!,
        );

        await prisma.guildConfig.upsert({
          where: { id: interaction.guildId! },
          create: {
            id: interaction.guildId!,
            welcomeStyle: style,
            customImageUrl: localPath,
            embed: finalEmbed,
            displayMemberCount: displayMemberCount ?? true,
          },
          update: {
            welcomeStyle: style,
            customImageUrl: localPath,
            embed: finalEmbed,
            displayMemberCount: displayMemberCount ?? true,
          },
        });

        return interaction.reply({
          content: `✅ **Success!** Custom welcome image downloaded and saved.`,
        });
      } catch (e) {
        console.error(e);
        return interaction.reply({
          content: "❌ Failed to download image to server.",
          ephemeral: true,
        });
      }
    }

    await prisma.guildConfig.upsert({
      where: { id: interaction.guildId! },
      create: {
        id: interaction.guildId!,
        welcomeStyle: style,
        embed: finalEmbed,
        displayMemberCount: displayMemberCount ?? true,
      },
      update: {
        welcomeStyle: style,
        embed: finalEmbed,
        displayMemberCount: displayMemberCount ?? true,
      },
    });

    return interaction.reply({
      content: `✅ **Success!** Welcome style updated to **${style}**.`,
    });
  },
});
