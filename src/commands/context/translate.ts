import { translateText } from "#utils";
import { commandModule, CommandType } from "@sern/handler";
import { IntegrationContextType, publishConfig } from "@sern/publisher";
import { MessageFlags } from "discord.js";

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
    const languages = [
      { label: "Indonesian", value: "id" },
      { label: "Danish", value: "da" },
      { label: "German", value: "de" },
      { label: "English", value: "en" },
      { label: "Spanish", value: "es" },
      { label: "French", value: "fr" },
      { label: "Croatian", value: "hr" },
      { label: "Italian", value: "it" },
      { label: "Lithuanian", value: "lt" },
      { label: "Hungarian", value: "hu" },
      { label: "Dutch", value: "nl" },
      { label: "Norwegian", value: "no" },
      { label: "Polish", value: "pl" },
      { label: "Portuguese", value: "pt" },
      { label: "Romanian", value: "ro" },
      { label: "Finnish", value: "fi" },
      { label: "Swedish", value: "sv" },
      { label: "Vietnamese", value: "vi" },
      { label: "Turkish", value: "tr" },
      { label: "Czech", value: "cs" },
      { label: "Greek", value: "el" },
      { label: "Bulgarian", value: "bg" },
      { label: "Russian", value: "ru" },
      { label: "Ukrainian", value: "uk" },
      { label: "Hindi", value: "hi" },
      { label: "Thai", value: "th" },
      { label: "Chinese (Simplified)", value: "zh-CN" },
      { label: "Chinese (Traditional)", value: "zh-TW" },
      { label: "Japanese", value: "ja" },
      { label: "Korean", value: "ko" },
    ];

    const userLocale = ctx.locale;
    const defaultLang =
      languages.find((l) => userLocale.startsWith(l.value)) || languages[0];

    await ctx.deferReply({ flags: MessageFlags.Ephemeral });

    const reply = await translateText(message.content, defaultLang.value);

    return await ctx.editReply(reply);
  },
});
