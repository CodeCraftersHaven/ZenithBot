import { premiumMsgOnly } from "#plugins";
import { languages, translateImage, translateText } from "#utils";
import { commandModule, CommandType } from "@sern/handler";
import { IntegrationContextType, publishConfig } from "@sern/publisher";
import {
    ActionRowBuilder,
    AttachmentBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    MessageFlags,
} from "discord.js";

function smartSplit(text: string, maxLength: number): string[] {
  if (text.length <= maxLength) return [text];
  const chunks = [];
  let currentText = text;
  while (currentText.length > maxLength) {
    let splitIndex = currentText.lastIndexOf(" ", maxLength);
    if (splitIndex === -1) splitIndex = maxLength;
    chunks.push(currentText.substring(0, splitIndex));
    currentText = currentText.substring(splitIndex).trimStart();
  }
  if (currentText) chunks.push(currentText);
  return chunks;
}


export default commandModule({
  type: CommandType.CtxMsg,
  plugins: [
    publishConfig({
      contexts: [IntegrationContextType.GUILD, IntegrationContextType.BOT_DM, IntegrationContextType.PRIVATE_CHANNEL],
      integrationTypes: ["Guild", "User"],
    }),
    premiumMsgOnly("1463995425836237093")
  ],
  description: " ",
  async execute(ctx) {
    const message = ctx.targetMessage;
    const userLocale = ctx.locale;
    const defaultLang =
      languages.find((l) => userLocale.startsWith(l.value)) || languages[0];

    await ctx.deferReply({ flags: MessageFlags.Ephemeral });

    if (
      (message.system || !message.content) &&
      !message.embeds.length &&
      !message.attachments.size
    ) {
      const notAMessage = await translateText(
        `There is nothing to translate.`,
        defaultLang.value,
      );
      return ctx.editReply(notAMessage);
    }

    const hint = `\n\n-# Click the button below if this didn't translate to your language.`;
    let replyContent = "";

    if (message.content) {
      replyContent = await translateText(
        message.content,
        defaultLang.value,
      )+await toTranslate(hint, defaultLang.value, defaultLang.label);
    } else {
      replyContent = await translateText(hint, defaultLang.value);
    }

        const files: AttachmentBuilder[] = [];
        if (message.attachments.size > 0) {
          const images = message.attachments.filter((a) =>
            a.contentType?.startsWith("image/"),
          );
          for (const img of images.values()) {
            const { attachment } = await translateImage(
              img.url,
              defaultLang.value,
            );
            if (attachment) {
              files.push(attachment);
            }
          }
        }
    const embeds = [];
    if (message.embeds.length > 0) {
      for (const embed of message.embeds) {
        const newEmbed = EmbedBuilder.from(embed);

        const [title, description, authorName, footerText, fields] =
          await Promise.all([
            embed.title ? translateText(embed.title, defaultLang.value) : null,
            embed.description
              ? translateText(embed.description, defaultLang.value)
              : null,
            embed.author?.name
              ? translateText(embed.author.name, defaultLang.value)
              : null,
            embed.footer?.text
              ? translateText(embed.footer.text, defaultLang.value)
              : null,
            embed.fields?.length
              ? Promise.all(
                embed.fields.map(async (field) => ({
                  name: await translateText(field.name, defaultLang.value),
                  value: await translateText(field.value, defaultLang.value),
                  inline: field.inline,
                })),
              )
              : null,
          ]);

        if (title) newEmbed.setTitle(title);
        if (description) newEmbed.setDescription(description);
        if (authorName && embed.author) {
          newEmbed.setAuthor({
            name: authorName,
            iconURL: embed.author.iconURL ?? undefined,
            url: embed.author.url ?? undefined,
          });
        }
        if (footerText && embed.footer) {
          newEmbed.setFooter({
            text: footerText,
            iconURL: embed.footer.iconURL ?? undefined,
          });
        }

        if (fields) {
          newEmbed.setFields(fields);
        }
        embeds.push(newEmbed);
      }
    }
    const button = new ButtonBuilder()
      .setCustomId("translate/newlang")
      .setLabel(await toTranslate("Unknown language", defaultLang.value, defaultLang.label))
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

    const chunks = smartSplit(replyContent, 2000);
    const firstChunk = chunks.shift();

    if (firstChunk) {
      await ctx.editReply({
        content: firstChunk,
        embeds: chunks.length === 0 ? embeds : [],
        components: chunks.length === 0 ? [row] : [],
        files: chunks.length === 0 ? files : [],
      });
    }

    for (let i = 0; i < chunks.length; i++) {
      const isLast = i === chunks.length - 1;
      await ctx.followUp({
        content: chunks[i],
        embeds: isLast ? embeds : [],
        components: isLast ? [row] : [],
        files: isLast ? files : [],
        flags: MessageFlags.Ephemeral,
      });
    }
  },
});

async function toTranslate(text: string, targetValue: string, targetLabel: string) {
  return targetLabel.toLowerCase() === "english" ? text : await translateText(text, targetValue);
}