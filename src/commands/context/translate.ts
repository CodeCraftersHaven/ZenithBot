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
    description: ' ',
    async execute(ctx, tbd) {
        const messageId = ctx.targetId;
        const message = ctx.targetMessage;
        const languages = [
            { label: "English", value: "en" },
            { label: "Spanish", value: "es" },
            { label: "French", value: "fr" },
            { label: "German", value: "de" },
            { label: "Italian", value: "it" },
            { label: "Portuguese", value: "pt" },
            { label: "Russian", value: "ru" },
            { label: "Japanese", value: "ja" },
            { label: "Chinese (Simplified)", value: "zh-CN" },
            { label: "Korean", value: "ko" },
            { label: "Arabic", value: "ar" },
            { label: "Hindi", value: "hi" },
            { label: "Dutch", value: "nl" },
            { label: "Polish", value: "pl" },
            { label: "Turkish", value: "tr" },
        ];
        
        const userLocale = ctx.locale;
        const defaultLang = languages.find(l => userLocale.startsWith(l.value)) || languages[0];

        await ctx.deferReply({ flags: MessageFlags.Ephemeral });

        const reply = await translateText(message.content, defaultLang.value);

        return await ctx.editReply(reply)
    },
})