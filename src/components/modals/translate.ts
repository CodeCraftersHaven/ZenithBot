import { commandModule, CommandType } from "@sern/handler";
import { MessageFlags } from "discord.js";

export default commandModule({
  type: CommandType.Modal,
  async execute(ctx, { deps: { "@sern/logger": logger } }) {
    await ctx.deferReply({ flags: MessageFlags.Ephemeral });
    const lang = ctx.fields.getTextInputValue("translate/modal/language");
    const botOwnerId = process.env.BOT_OWNER_ID;
    const owner = await ctx.client.users.fetch(botOwnerId!);
    const dmChannel = await owner.createDM(true);

    dmChannel.send(`${ctx.user.username} needs ${lang} added.`).catch(() => {
      logger.error(
        `owner has dms blocked.\n\n Please add ${lang} to translator config.`,
      );
    });
    await ctx.editReply(
      `I've let ${owner.username} know you need ${lang} added. Thank you for your patience.`,
    );
  },
});
