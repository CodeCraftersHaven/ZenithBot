import { commandModule, CommandType } from "@sern/handler";
import { EmbedBuilder, MessageFlags, TextChannel } from "discord.js";

export default commandModule({
  type: CommandType.Modal,
  async execute(ctx, { params }) {
    if (!ctx.memberPermissions?.has("ManageGuild"))
      return await ctx.reply({
        content: "You do not have permission to use this command.",
        flags: MessageFlags.Ephemeral,
      });

    const field = (field: string, req: boolean = false) => {
      const value = ctx.fields.getTextInputValue(field);
      if (req && !value) throw new Error(`Field ${field} is required.`);
      return value;
    };

    const acts = {
      cmodal: async () => {
        const title = ctx.fields.getTextInputValue("selfrole/cmodal/title");
        const description = ctx.fields.getTextInputValue(
          "selfrole/cmodal/description",
        );

        const embed = {
          title: title || "Self-Roles",
          description: description || "Select your roles below!",
          color: 0x2b2d31,
        };
        await (ctx.channel as TextChannel).send({ embeds: [embed] });
        await ctx.message?.delete();
        await ctx.deferUpdate();
      },
      emodal: async () => {
        let title = "";
        let description = "";
        const msgId = (await ctx.message?.fetch())?.content.split("\n")[1];
        const messages = await ctx.channel?.messages.fetch();
        if (!messages) return await ctx.reply("No messages found.");
        const message = messages.get(msgId!);
        if (!message) return await ctx.reply("No message found.");
        const embed = message.embeds[0];
        const updatedEmbed = new EmbedBuilder(
          EmbedBuilder.from(embed).toJSON(),
        );
        const modalFields = ctx.fields.components.map((c) => c);
        modalFields.find((c) => {
          const input = c as ModalField;
          if (input.component.customId === "selfrole/emodal/title") {
            title = field("selfrole/emodal/title");
            updatedEmbed.setTitle(title);
          }
          if (input.component.customId === "selfrole/emodal/description") {
            description = field("selfrole/emodal/description");
            updatedEmbed.setDescription(description);
          }
        });
        await message.edit({ embeds: [updatedEmbed] });
        await ctx.message?.delete();
        await ctx.deferUpdate();
      },
      default: async () => {
        console.log(ctx.customId);
        await ctx.deferUpdate();
      },
    };
    type Act = keyof typeof acts;
    const result = ((await acts[params as Act]) || acts.default)();
    return result;
  },
});

type ModalField = {
  id: number;
  type: number;
  component: {
    type: number;
    id: number;
    customId: string;
    value: string;
  };
};
