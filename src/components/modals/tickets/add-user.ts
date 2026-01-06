import { commandModule, CommandType } from "@sern/handler";
import { PrivateThreadChannel } from "discord.js";

export default commandModule({
  type: CommandType.UserSelect,
  async execute(ctx) {
    const userToAdd = ctx.values[0],
      channel = ctx.channel as PrivateThreadChannel;
    await channel.members.add(userToAdd);
    channel
      .permissionsFor(userToAdd)!
      .add(["ViewChannel", "SendMessages", "ReadMessageHistory"]);
    return ctx.deferUpdate();
  },
});
