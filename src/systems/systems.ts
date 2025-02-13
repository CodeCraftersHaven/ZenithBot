import { capFirstLetter } from "#utils";
import { PrismaClient } from "@prisma/client";
import { Context, Service } from "@sern/handler";
import { ActionRowBuilder, AnyComponentBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, CacheType, ChatInputCommandInteraction, Client, EmbedBuilder, MessageActionRowComponentBuilder, MessageComponentInteraction, OverwriteResolvable, PermissionResolvable, PermissionsBitField, TextChannel } from "discord.js";

export default class Systems {

    private db: PrismaClient = Service("@prisma/client");
    private c: Client = Service("@sern/client");

    constructor() {

    }
    async createPanel(ctx: CTX, channel: TextChannel, system: string, opts: Partial<PanelOpts>) {
        if (channel.messages.cache.size > 0) {
            return ctx.reply({ content: "I can't use a channel that has messages in it. Please empty the channel or choose another one!", withResponse: true })
        }
        const currentPermissions: Permission[] = channel.permissionOverwrites.cache.map(overwrite => ({
            id: overwrite.id,
            allow: overwrite.allow.toArray().map(perm => new PermissionsBitField(perm)),
            deny: overwrite.deny.toArray().map(perm => new PermissionsBitField(perm))
        }));
        const existingChannel = await this.db.systems.findFirst({
            where: {
                id: ctx.guild?.id,
                systems: {
                    some: {
                        enabled: true,
                        channels: {
                            every: {
                                id: channel.id
                            }
                        }
                    }
                }
            }
        });
        if (existingChannel) {
            return await ctx.reply({ content: "This channel is already in use.", withResponse: true })
        }

        const existingSystems = await this.db.systems.findUnique({
            where: { id: ctx.guild?.id! },
            select: { systems: true }
        });

        const systemExistsInChannel = existingSystems?.systems.some(s =>
            s.name === system && s.channels.some(c => c.id === channel.id)
        );

        if (systemExistsInChannel) {
            return ctx.reply({ content: "This system is already enabled in this channel.", withResponse: true });
        }
        await this.db.systems.update({
            where: { id: ctx.guild?.id! },
            data: {
                systems: {
                    updateMany: {
                        where: { name: system },
                        data: {
                            enabled: true,
                            name: system,
                            channels: {
                                set: [{
                                    id: channel.id,
                                    name: channel.name,
                                    perms: currentPermissions.map(permission => ({
                                        id: permission.id,
                                        allow: permission.allow.reduce((acc, perm) => acc | BigInt(perm.bitfield), BigInt(0)).toString(),
                                        deny: permission.deny.reduce((acc, perm) => acc | BigInt(perm.bitfield), BigInt(0)).toString()
                                    }))
                                }]
                            }
                        }
                    }
                }
            }
        });

        await channel.permissionOverwrites.set([
            { id: channel.guild.roles.everyone.id, deny: PermissionsBitField.resolve(Object.keys(PermissionsBitField.Flags).filter(perm => perm !== "ViewChannel") as PermissionResolvable[]), allow: ["ViewChannel"] },
            { id: this.c.user?.id!, allow: ["SendMessages", "ManageMessages", "ViewChannel"] }
        ]);

        const infoEmbed = new EmbedBuilder({
            title: "Channel Locked",
            fields: [
                {
                    name: "Reason",
                    value: `${capFirstLetter(system)} system has been set up in this channel.`
                },
                {
                    name: "Info",
                    value: "This channel has been locked for the setup of the selected system. Only administrators and the bot can send messages here."
                }
            ]
        });

        const infoButtons = ["🛑|Delete", "😍|Like", "🤮|Dislike"].map(button => {
            const [emoji, name] = button.split("|");
            return new ButtonBuilder({
                style: name == 'Delete' ? ButtonStyle.Danger : ButtonStyle.Primary,
                emoji,
                label: name,
                custom_id: `panel/${name.toLowerCase()}`
            });
        });
        const infoRow = new ActionRowBuilder<ButtonBuilder>({ components: infoButtons });

        const embed: EmbedBuilder = new EmbedBuilder()
            .setTitle("Tickets")
            .setDescription("Click 📩 to open a ticket")
            .setColor("Random")
        const openTicket = new ButtonBuilder()
            .setCustomId("tickets/open")
            .setLabel("Open Ticket")
            .setStyle(ButtonStyle.Primary)
            .setEmoji("📩")
        const checkTicket = new ButtonBuilder()
            .setCustomId("tickets/check")
            .setLabel("Check Ticket")
            .setStyle(ButtonStyle.Primary)
            .setEmoji("✅")
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(openTicket, checkTicket);

        if (system === "tickets") {
            await sendMessages(channel, [infoEmbed, infoRow], [embed, row]).catch(async (e) => {
                await ctx.reply({ content: `I can't access that channel. Please give me permissions. ${e.message}`, withResponse: true })
            })
        } else {
            await sendMessages(channel, [infoEmbed, infoRow]).catch(async (e) => {
                await ctx.reply({ content: `I can't access that channel. Please give me permissions. ${e.message}`, withResponse: true })
            })
        }


        async function sendMessages(
            channel: TextChannel, ...pairs: [EmbedBuilder, ActionRowBuilder<MessageActionRowComponentBuilder>][]
        ) {
            for (const [embed, components] of pairs) {
                await channel.send({ embeds: [embed], components: [components] });
            }
        }

        return await ctx.reply({ content: `Enabled ${capFirstLetter(system)} system in <#${channel.id}>`, withResponse: true })
    }

    async clearPanel(ctx: CTX, system: string) {
        const infoEmbed = new EmbedBuilder({
            title: "Channel Unlocked",
            fields: [
                {
                    name: "Reason",
                    value: `${capFirstLetter(system)} has been disabled for this server!`
                },
                {
                    name: "Info",
                    value: "This channel's permissions have been reverted to previously set permissions."
                }
            ]
        });
        const currentSystem = await this.db.systems.findMany({ where: { id: ctx.guild?.id!, systems: { some: { name: system, enabled: true } } } });
        const channelData = currentSystem[0]?.systems.find(s => s.name === system)?.channels;
        channelData?.forEach(async (c) => {
            const channel = await this.c.channels.fetch(c.id) as TextChannel;
            await channel.messages.fetch({ limit: 100 }).then(async messages => {
                if (!messages) return;
                const clientMessages = messages.filter(msg => msg.author.id === channel.client.user?.id && msg.embeds);
                clientMessages.forEach(async msg => {
                    if (msg && msg.deletable) {
                        await msg.delete();
                    }
                });
                const perms = c?.perms!;
                const rep = await channel.send({ embeds: [infoEmbed] })
                await channel.permissionOverwrites.set(perms as OverwriteResolvable[])
                setTimeout(async () => {
                    await rep.delete()
                }, 6e4);
            });
        })

        await this.db.systems.update(
            {
                where: { id: ctx.guild?.id! },
                data: { systems: { updateMany: { where: { name: system }, data: { enabled: false, channels: [] } } } }
            });


        if (ctx instanceof MessageComponentInteraction) {
            ctx.deferred ?
                ctx.editReply({ content: `Disabled ${capFirstLetter(system)} system` }) :
                ctx.reply({ content: `Disabled ${capFirstLetter(system)} system`, withResponse: true })
        } else {
            return ctx.reply({ content: `Disabled ${capFirstLetter(system)} system`, withResponse: true });
        }


    }

}
interface PanelOpts {
    name: string
    system: string
}
interface Permission {
    id: string;
    allow: PermissionsBitField[];
    deny: PermissionsBitField[];
}
type CTX = Context & {
    readonly options: ChatInputCommandInteraction["options"];
} | MessageComponentInteraction<CacheType>

export type systems = typeof Systems;

