import { commandModule, CommandType } from "@sern/handler";
import { userCache } from "#utils";
import { GuildMember } from "discord.js";

export default commandModule({
  type: CommandType.Button,
  async execute(ctx, { deps, params }) {
    await ctx.deferReply();
    const [AntiScam, prisma] = [
      deps["systems"].AntiScam,
      deps["@prisma/client"],
    ];
    const operator = ctx.member as GuildMember;
    const userId = ctx.message.embeds[0].fields
      .find((f) => f.name === "User")
      ?.value.split(" ")[1]
      .replace("(", "")
      .replace(")", "");
    const member = await ctx.guild!.members.fetch(userId!);
    const antiScam = new AntiScam(ctx.message, userCache);

    const acts = {
      kick: async () => await antiScam.kickMember(member, operator),
      ban: async () => await antiScam.banMember(member, operator),
      overturn: async () => await antiScam.removeTimeout(member, operator),
    };

    type Act = keyof typeof acts;
    const result = (await acts[params! as Act])();
    return await ctx.editReply(await result);
  },
});
