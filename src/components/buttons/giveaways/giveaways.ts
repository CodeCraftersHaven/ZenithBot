import { commandModule, CommandType } from "@sern/handler";
import {
  TextChannel,
  ChannelType,
  MessageFlags,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  Message,
  Embed,
  APIEmbedField,
  User,
  Collection,
  EmbedBuilder,
} from "discord.js";

let clickedUsers: string[] = [];

export default commandModule({
  type: CommandType.Button,
  async execute(ctx, { deps, params }) {
    const act = params! as
      | "claim"
      | "close"
      | "enter"
      | "leave"
      | "end"
      | "reroll";
    await ctx.deferReply({ withResponse: true, flags: MessageFlags.Ephemeral });
    const g = new deps["systems"].Giveaway(true);
    const [p, l] = [deps["@prisma/client"].giveaway, deps["@sern/logger"]];
    const giveawayMessage = ctx.message;
    const findFields = (
      field: string,
      embed: Embed = giveawayMessage.embeds[0],
    ) => {
      return embed.fields.find((f) =>
        f.name.toLowerCase().includes(field),
      ) as APIEmbedField;
    };
    const findFieldsValues = (
      field: string,
      embed: Embed = giveawayMessage.embeds[0],
    ): string => {
      return (
        embed.fields.find((f) =>
          f.name.toLowerCase().includes(field),
        ) as APIEmbedField
      ).value;
    };
    const acts = {
      claim: async () => {
        const winnersMentions = findFieldsValues("winners");
        const hostMention = findFieldsValues("host");
        const prize = findFieldsValues("prize");

        function extractUserIds(input: string | string[]) {
          const userIdRegex = /<@!?(\d+)>|\b\d{17,19}\b/g;

          if (Array.isArray(input)) {
            return input.flatMap((str) =>
              [...str.matchAll(userIdRegex)].map(
                (match) => match[1] || match[0],
              ),
            );
          } else if (typeof input === "string") {
            return [...input.matchAll(userIdRegex)].map(
              (match) => match[1] || match[0],
            );
          }

          return [];
        }
        const host = extractUserIds(hostMention).join("");
        const winners = extractUserIds(winnersMentions);
        const winnerId = ctx.user.id;
        const currentChannel = ctx.channel as TextChannel;
        const newChannel = async (): Promise<TextChannel> => {
          return (await ctx.guild?.channels.create({
            name: ctx.user.displayName + "-claim",
            permissionOverwrites: [
              { id: ctx.guild.roles.everyone, deny: "ViewChannel" },
              { id: host, allow: ["ViewChannel", "SendMessages"] },
              { id: winnerId, allow: ["ViewChannel", "SendMessages"] },
              {
                id: ctx.client.user.id,
                allow: ["ViewChannel", "SendMessages", "ManageChannels"],
              },
            ],
            type: ChannelType.GuildText,
          })) as TextChannel;
        };
        if (!winners.includes(winnerId)) {
          return await ctx.reply({
            flags: MessageFlags.Ephemeral,
            content: "This isn't your button!",
          });
        } else {
          if (!clickedUsers.includes(winnerId)) {
            clickedUsers.push(winnerId);
          }
          if (winners.every((id) => clickedUsers.includes(id))) {
            await giveawayMessage.delete();
            await p.delete({ where: { messageId: giveawayMessage.id } });
            clickedUsers = [];
          }
          await newChannel().then(async (c) => {
            const rep = await currentChannel.send({
              content: `<@${winnerId}> Here's your claim channel: <#${c?.id}>`,
            });
            const close = new ButtonBuilder({
              custom_id: "giveaways/close",
              label: "Close Channel",
              style: ButtonStyle.Primary,
            });
            const row = new ActionRowBuilder<ButtonBuilder>({
              components: [close],
            });
            c?.send({
              content: `<@${host}>, <@${winnerId}> is here to claim their prize (${prize})! When the claim process is complete, please click "Close Channel" below to delete this channel!`,
              components: [row],
            });
            await ctx.deleteReply();
            const filter = (m: Message) => m.author.id === winnerId;
            const collector = c.createMessageCollector({
              filter,
              time: 86400000,
              max: 1,
            }); // 24 hours

            collector.on("collect", async (message) => {
              await rep.delete();
            });

            collector.on("end", async (collected) => {
              if (collected.size === 0) {
                c.send(
                  `<@${winnerId}> did not send any messages in the claim channel for 24 hours.`,
                ).catch((_) => {});

                try {
                  await p.delete({ where: { messageId: giveawayMessage.id } });
                } catch (_) {
                  l.error("Document already deleted.");
                }
              }
            });
          });
        }
      },
      close: async () => {
        try {
          const channel = await ctx.client.channels.fetch(ctx.channel?.id!);
          await channel?.delete("claim process completed");
        } catch (_) {
          l.error("Channel deleted before collector ends");
        }
      },
      enter: async () => {
        const hostUserId = giveawayMessage.embeds[0].footer?.text;

        if (ctx.user.id === hostUserId) {
          return ctx.editReply({
            content: `Bruh this is your giveaway! You can't win it too!`,
          });
        }

        g.addParticipantToDb(giveawayMessage.id, { userId: ctx.user.id });
        const entriesField = giveawayMessage.embeds[0].fields.find(
          (field) => field.name === "Entries:",
        );
        if (entriesField) {
          const currentEntries = parseInt(entriesField.value, 10);
          entriesField.value = (currentEntries + 1).toString();
        }

        await giveawayMessage.edit({ embeds: [giveawayMessage.embeds[0]] });
        await ctx.editReply({ content: `Giveaway entry achknowleged!` });
      },
      leave: async () => {
        const hostUserId = giveawayMessage.embeds[0].footer?.text;

        if (ctx.user.id === hostUserId) {
          return ctx.editReply({
            content: `Bruh this is your giveaway! You can't leave when you can't even enter!`,
          });
        }

        g.removeParticipantFromDb(giveawayMessage.id, { userId: ctx.user.id });
        const entriesField = giveawayMessage.embeds[0].fields.find(
          (field) => field.name === "Entries:",
        );
        if (entriesField) {
          const currentEntries = parseInt(entriesField.value, 10);
          entriesField.value = (currentEntries - 1).toString();
        }

        await giveawayMessage.edit({ embeds: [giveawayMessage.embeds[0]] });
        await ctx.editReply({ content: `You've left this giveaway` });
      },
      end: async () => {
        await g.deleteGiveaway(giveawayMessage.id, ctx.user.id);
        let ending = findFields(" ");
        let winners = findFields("winners");
        let newEmbed = new EmbedBuilder(
          EmbedBuilder.from(giveawayMessage.embeds[0]).toJSON(),
        );
        const newFields = giveawayMessage.embeds[0].fields.filter(
          () => !ending && !winners,
        );
        newEmbed.setTitle("Giveaway Ended!");
        newEmbed.setFields(newFields);
        newEmbed.setFooter({ text: "Host Ended Giveaway" });
        await giveawayMessage
          .edit({ embeds: [newEmbed], components: [] })
          .then((m) => {
            setTimeout(async () => {
              await m.delete();
            }, 5000);
          });

        await ctx.deleteReply();
      },
      reroll: async () => {
        const messageId = giveawayMessage.id;
        await g.rerollWinners(messageId);
        await ctx.deleteReply();
      },
      default: async () => {
        await ctx.editReply("I'm not even a button!");
      },
    };
    type Act = keyof typeof acts;
    const result = ((await acts[act as Act]) || acts.default)();
    return result;
  },
});
