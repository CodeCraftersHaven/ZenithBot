import 'dotenv/config';
import * as config from './config.js';
import { Client, GatewayIntentBits } from 'discord.js';
import { Sern, makeDependencies } from '@sern/handler';
import { Publisher } from '@sern/publisher';
import { logger, prisma } from '#utils';
import { SelfRoles, Giveaways, Tickets, Systems } from '#systems';

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildWebhooks
	],
});


await makeDependencies(({ add, swap }) => {
    add('@sern/client', client);
    add('@prisma/client', prisma);
    swap('@sern/logger', logger);
    add('systems', {
        SelfRoles: SelfRoles.default,
        Giveaway: Giveaways.default,
        Tickets: Tickets.default,
        Systems: Systems.default
    });
    add('publisher', deps => new Publisher(
        deps['@sern/modules'],
        deps['@sern/emitter'],
        deps['@sern/logger']!
    ));
    add('process', process)
});

Sern.init(config);

await client.login();
