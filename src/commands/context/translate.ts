import { languages, translateText } from "#utils";
import { commandModule, CommandType } from "@sern/handler";
import { IntegrationContextType, publishConfig } from "@sern/publisher";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";

export default commandModule({
  type: CommandType.CtxMsg,
  plugins: [
    publishConfig({
      contexts: [IntegrationContextType.GUILD],
      integrationTypes: ["Guild"],
    }),
  ],
  description: " ",
  async execute(ctx) {
    const message = ctx.targetMessage;
    const userLocale = ctx.locale;
    const defaultLang =
      languages.find((l) => userLocale.startsWith(l.value)) || languages[0];

    await ctx.deferReply({ flags: MessageFlags.Ephemeral });

    if ((message.system || !message.content) && !message.embeds.length) {
      const notAMessage = await translateText(
        `There is nothing to translate.`,
        defaultLang.value,
      );
      return ctx.editReply(notAMessage);
    }

    const hint = `-# Click the button below if this didn't translate to your language.`;
    let replyContent = "";

    if (message.content) {
      replyContent = await translateText(
        `${message.content}\n\n${hint}`,
        defaultLang.value,
      );
    } else {
      replyContent = await translateText(hint, defaultLang.value);
    }

    const embeds = [];
    if (message.embeds.length > 0) {
      for (const embed of message.embeds) {
        const newEmbed = EmbedBuilder.from(embed);
        if (embed.title)
          newEmbed.setTitle(
            await translateText(embed.title, defaultLang.value),
          );
        if (embed.description)
          newEmbed.setDescription(
            await translateText(embed.description, defaultLang.value),
          );
        if (embed.author) {
          const name = await translateText(
            embed.author.name,
            defaultLang.value,
          );
          newEmbed.setAuthor({
            name,
            iconURL: embed.author.iconURL ?? undefined,
            url: embed.author.url ?? undefined,
          });
        }
        if (embed.footer) {
          const text = await translateText(
            embed.footer.text,
            defaultLang.value,
          );
          newEmbed.setFooter({
            text,
            iconURL: embed.footer.iconURL ?? undefined,
          });
        }

        if (embed.fields?.length) {
          const newFields = await Promise.all(
            embed.fields.map(async (field) => ({
              name: await translateText(field.name, defaultLang.value),
              value: await translateText(field.value, defaultLang.value),
              inline: field.inline,
            })),
          );
          newEmbed.setFields(newFields);
        }
        embeds.push(newEmbed);
      }
    }

    const button = new ButtonBuilder()
      .setCustomId("translate/newlang")
      .setLabel(await translateText("Unknown language", defaultLang.value))
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

    return await ctx.editReply({
      content: replyContent,
      embeds: embeds,
      components: [row],
    });
  },
});
