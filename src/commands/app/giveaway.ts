import { commandModule, CommandType } from "@sern/handler";
import { publishConfig, IntegrationContextType } from "@sern/publisher";
import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Colors,
  EmbedBuilder,
  MessageFlags,
  PermissionsBitField,
  TextChannel,
} from "discord.js";
import { add } from "date-fns";
import { checkIfSystemEnabled, getEnableCommand, Timestamp } from "#utils";

export default commandModule({
  type: CommandType.Slash,
  name: "giveaways",
  description: "host giveaways",
  plugins: [
    publishConfig({
      defaultMemberPermissions: PermissionsBitField.Flags.Administrator,
      integrationTypes: ["Guild"],
      contexts: [IntegrationContextType.GUILD],
    }),
  ],
  options: [
    {
      name: "create",
      description: "create a giveaway",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "prize",
          description: "the prize of the giveaway",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: "winners",
          description: "the number of winners",
          type: ApplicationCommandOptionType.Integer,
          required: true,
        },
        {
          name: "time",
          description: "how long the giveaway should last.",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
    },
    {
      name: "list",
      description: "list all giveaways",
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: "reroll",
      description: "reroll a giveaway",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "messageid",
          description: "the giveaway to reroll.",
          type: ApplicationCommandOptionType.String,
          required: true,
          autocomplete: true,
          command: {
            async execute(ctx, { deps }) {
              const [giveaways] = [deps["@prisma/client"].giveaway];
              const focusedOption = ctx.options.getFocused().toLowerCase();
              const filter = (
                await giveaways.findMany({ where: { guildId: ctx.guildId! } })
              )
                .filter((x) => x.messageId.startsWith(focusedOption))
                .map((u) => ({
                  name: `${u.prize}-${u.id}`,
                  value: u.messageId,
                }));
              await ctx.respond(filter);
            },
          },
        },
      ],
    },
  ],
  async execute(ctx, { deps }) {
    const [prisma, { Giveaway }, client, logger] = [
      deps["@prisma/client"],
      deps["systems"],
      deps["@sern/client"],
      deps["@sern/logger"],
    ];
    const isSystemEnabled = await checkIfSystemEnabled(
      prisma.systems,
      ctx.guild?.id!,
      "giveaways",
    );
    if (!isSystemEnabled) {
      new Giveaway(false);
      return ctx.reply(
        `The giveaways system is not enabled in this server. Please use <system enable:${getEnableCommand(client)}> to enable it.`,
      );
    }
    const giveaway = new Giveaway(true);
    const channelId = isSystemEnabled.systems.find(
      (sys) => sys.name === "giveaways",
    )?.channels[0].id!;
    const subcommand = ctx.options.getSubcommand();

    const subcommands = {
      create: async () => {
        if (!ctx.channel || !(ctx.channel instanceof TextChannel)) {
          return ctx.reply("This command can only be used in a text channel.");
        }
        const prize = ctx.options.getString("prize", true);
        const winners = ctx.options.getInteger("winners", true);
        const timeLeftString = ctx.options.getString("time", true);

        // 🔽🔽🔽🔽 This portion came from sern community and hereby giving credit to all authors of such functions
        let timeUnit1;
        let timeLeft1;
        let timeUnit2;
        let timeLeft2;

        const secondNames = ["seconds", "second", "sec", "secs"];
        const minuteNames = ["minutes", "minute", "min", "mins"];
        const hourNames = ["hours", "hour", "hr", "hrs"];
        const dayNames = ["days", "day"];

        const [part1, part2] = timeLeftString?.split("and");
        if (
          !part1 ||
          !part1.split(" ")[0] ||
          isNaN(Number(part1.split(" ")[0]))
        ) {
          return ctx.reply(
            "Invalid time format. Using `and` more than once is invalid and won't be used. Valid formats: `1 sec | secs | second | seconds`, `1 min | mins | minute | minutes`, `1 hour | hours | hr | hrs`, `1 day | days`, `1 hour and 30 mins`, `2 days and 3 hours`",
          );
        }
        timeUnit1 = part1?.split(" ")[1];
        timeLeft1 = Number(part1?.split(" ")[0]);

        if (part2) {
          const timeLeftStringPart2 = part2.replace(part2.substring(0, 1), "");
          timeUnit2 = timeLeftStringPart2?.split(" ")[1];
          timeLeft2 = Number(timeLeftStringPart2?.split(" ")[0]);
        }

        const startTime = new Date();

        let endTime: Date;

        endTime = add(startTime, {
          seconds: secondNames.includes(timeUnit1!)
            ? timeLeft1
            : secondNames.includes(timeUnit2!)
              ? timeLeft2
              : 0,
          minutes: minuteNames.includes(timeUnit1!)
            ? timeLeft1
            : minuteNames.includes(timeUnit2!)
              ? timeLeft2
              : 0,
          hours: hourNames.includes(timeUnit1!)
            ? timeLeft1
            : hourNames.includes(timeUnit2!)
              ? timeLeft2
              : 0,
          days: dayNames.includes(timeUnit1!)
            ? timeLeft1
            : dayNames.includes(timeUnit2!)
              ? timeLeft2
              : 0,
        });

        const endTimeStamp: string = `<t:${Math.floor(endTime!.getTime() / 1000)}:f>`;
        const endTimeStamp2 = new Timestamp(endTime.getTime()).timestamp;

        // ⬆️⬆️⬆️⬆️ End of portion where credits are due... [kingomes](https://github.com/kingomes)
        const embed: EmbedBuilder = new EmbedBuilder({
          title: `New Giveaway Started!`,
          fields: [
            {
              name: "Prize",
              value: prize,
            },
            {
              name: "Hosted By:",
              value: `<@${ctx.user.id}>`,
              inline: true,
            },
            {
              name: "Winners",
              value: winners.toString(),
            },
            {
              name: "Entries:",
              value: "0",
            },
            {
              name: "\u200b",
              value: `Ends: ${new Timestamp(Number(endTimeStamp2)).getRelativeTime()} (${endTimeStamp})`,
            },
          ],
          color: Colors.DarkBlue,
          footer: { text: ctx.user.id },
        });
        const buttons = [
          "🎉|Enter Giveaway",
          "🔨|Leave Giveaway",
          "❌|End Giveaway",
        ].map((button) => {
          const [emoji, name] = button.split("|");
          return new ButtonBuilder({
            style: emoji == "🎉" ? ButtonStyle.Primary : ButtonStyle.Secondary,
            emoji,
            label: name,
            custom_id: `giveaways/${name.toLowerCase().split(" ")[0]}`,
          });
        });

        const row = new ActionRowBuilder<ButtonBuilder>({
          components: buttons,
        });
        const giveawayChannel = client.channels.cache.find(
          (c) => c.type == ChannelType.GuildText && c.id === channelId,
        )!;
        if (!giveawayChannel) {
          logger.error("No giveaway channel found.");
          return ctx.reply("No giveaway channel found.");
        }
        await (giveawayChannel as TextChannel)
          .send({ embeds: [embed], components: [row] })
          .then(async (msg) => {
            await prisma.giveaway
              .create({
                data: {
                  prize,
                  winnerSize: winners,
                  guildId: ctx.guild?.id!,
                  channelId: msg.channel.id,
                  messageId: msg.id,
                  endsAt: endTime,
                  host: ctx.user.id,
                },
              })
              .then(async (d) => {
                let intTime = d.endsAt.getTime() - startTime.getTime();
                await prisma.giveaway.update({
                  where: { id: d.id },
                  data: { interval: intTime },
                });
                await giveaway.createTimers(intTime, false, {
                  channelId: msg.channelId,
                  host: ctx.user.id,
                  messageId: msg.id,
                  prize: d.prize,
                  winnerSize: d.winnerSize,
                  interval: d.interval,
                });
              });
          });
        return ctx.reply({
          content: "Giveaway created.",
          flags: MessageFlags.Ephemeral,
        });
      },
      list: async () => {
        if (!ctx.guild) {
          return await ctx.reply("This command can only be used in a guild.");
        }
        const giveaways = await prisma.giveaway.findMany({
          where: {
            guildId: ctx.guild.id,
          },
        });
        if (!giveaways.length) {
          return await ctx.reply("No giveaways found.");
        }
        const embed = new EmbedBuilder({
          title: "Giveaways",
          fields: giveaways.map((g) => ({
            name: `Giveaway ID: ${g.id}`,
            value: `[Prize: ${g.prize} | Winners: ${g.winnerSize} | Message: ${g.messageId}](https://discord.com/channels/${g.guildId}/${g.channelId}/${g.messageId})`,
          })),
          color: Colors.DarkBlue,
        });
        return await ctx.reply({ embeds: [embed] });
      },
      reroll: async () => {
        await ctx.interaction.deferReply();
        const messageId = ctx.options.getString("messageid", true);
        await giveaway.rerollWinners(messageId);
        await ctx.interaction.deleteReply();
      },
      default: async () => {
        return;
      },
    };
    type Subcommands = keyof typeof subcommands;
    const result = (
      (await subcommands[subcommand as Subcommands]) || subcommands.default
    )();
    return result;
  },
});
