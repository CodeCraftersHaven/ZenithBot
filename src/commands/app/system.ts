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
      defaultMemberPermissions: PermissionsBitField.Flags.ManageGuild,
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
            { name: "counting", value: "counting" },
            { name: "giveaways", value: "giveaways" },
            { name: "siege tracker", value: "siegetracker" },
            { name: "self roles", value: "selfroles" },
            { name: "tickets", value: "tickets" },
            { name: "welcome", value: "welcome" },
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
          autocomplete: true,
          command: {
            async execute(ctx, { deps }) {
              const [system] = [deps["@prisma/client"].systems];
              const focusedOption = ctx.options.getFocused().toLowerCase();
              const systemResult = await system.findFirst({
                where: { id: ctx.guild?.id! },
                select: { systems: true },
              });
              if (!systemResult) {
                return ctx.respond([]);
              }
              const filter = systemResult.systems
                .filter(
                  (sys) => sys.name.includes(focusedOption) && sys.enabled,
                )
                .map((sys) => ({
                  name: sys.name,
                  value: `${sys.name}-${sys.channels[0].id}`,
                }));
              await ctx.respond(filter);
            },
          },

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
        return await ctx.reply(panel);
      },
      disable: async () => {
        const system = ctx.options.getString("system", true);
        const Systems = new sys(
          guildId!,
          system.split("-")[0],
          ctx.guild?.channels.cache.get(system.split("-")[1]) as TextChannel,
        );
        if (
          enabled?.systems.some(
            (sys) => sys.name === system && sys.enabled == false,
          )
        ) {
          return ctx.reply(
            `${capFirstLetter(system)} system is already disabled`,
          );
        }
        const res = await Systems.clearPanel();
        return await ctx.reply(res);
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
