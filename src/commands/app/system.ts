import { commandModule, CommandType } from "@sern/handler";
import {
  ApplicationCommandOptionType,
  ChannelType,
  PermissionsBitField,
  TextChannel,
} from "discord.js";
import { IntegrationContextType, publishConfig } from "@sern/publisher";
import { capFirstLetter } from "#utils";

export default commandModule({
  type: CommandType.Slash,
  name: "system",
  description: "enable or disable systems",
  plugins: [
    publishConfig({
      defaultMemberPermissions: PermissionsBitField.Flags.Administrator,
      integrationTypes: ["Guild"],
      contexts: [IntegrationContextType.GUILD],
    }),
  ],
  options: [
    {
      name: "enable",
      description: "enable a system",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "system",
          description: "the system to enable",
          type: ApplicationCommandOptionType.String,
          choices: [
            { name: "tickets", value: "tickets" },
            { name: "giveaways", value: "giveaways" },
            { name: "selfroles", value: "selfroles" },
          ],
          required: true,
        },
        {
          name: "channel",
          description: "the channel to setup the system in",
          type: ApplicationCommandOptionType.Channel,
          channel_types: [ChannelType.GuildText],
          required: true,
        },
      ],
    },
    {
      name: "disable",
      description: "disable a system",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "system",
          description: "the system to disable",
          type: ApplicationCommandOptionType.String,
          choices: [
            { name: "tickets", value: "tickets" },
            { name: "giveaways", value: "giveaways" },
            { name: "selfroles", value: "selfroles" },
          ],
          required: true,
        },
      ],
    },
  ],
  async execute(ctx, { deps }) {
    const { guildId } = ctx;
    const [db, sys] = [deps["@prisma/client"], deps["systems"].Systems];
    const enabled = await db.systems.findFirst({
      where: { id: guildId! },
      select: { systems: true },
    });
    const subcommand = ctx.options.getSubcommand();

    const subcommands = {
      enable: async () => {
        const system = ctx.options.getString("system", true);
        const channel = ctx.options.getChannel("channel", true) as TextChannel;
        const Systems = new sys(guildId!, system, channel);
        if (
          system === "selfroles" &&
          ctx.guildId !== process.env.HOME_SERVER_ID!
        ) {
          return await ctx.reply(
            "This system is still in development. Please be patient.",
          );
        }
        const panel = await Systems.createPanel();
        return await ctx.reply(panel)
      },
      disable: async () => {
        const system = ctx.options.getString("system", true);
        const Systems = new sys(guildId!, system);
        if (
          enabled?.systems.some(
            (sys) => sys.name === system && sys.enabled == false,
          )
        ) {
          return ctx.reply(
            `${capFirstLetter(system)} system is already disabled`,
          );
        }
        Systems.clearPanel();
      },
      default: async () => {
        return ctx.reply("Invalid subcommand");
      },
    };
    type Subcommands = keyof typeof subcommands;
    const result = (
      (await subcommands[subcommand as Subcommands]) || subcommands.default
    )();
    return result;
  },
});
