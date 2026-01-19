import { languages, translateText } from "#utils";
import { commandModule, CommandType } from "@sern/handler";
import { IntegrationContextType, publishConfig } from "@sern/publisher";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
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
    const hint = `-# Click this button if translation seems bad for your language.`;
    const reply = await translateText(
      `${message.content}\n\n${hint}`,
      defaultLang.value,
    );
    const button = new ButtonBuilder()
      .setCustomId("translate/bad")
      .setLabel(await translateText("Bad translation", defaultLang.value))
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

    return await ctx.editReply({
      content: reply,
      components: [row],
    });
  },
});
