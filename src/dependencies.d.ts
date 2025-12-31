/**
 * This file serves as intellisense for sern projects.
 * Types are declared here for dependencies to function properly
 * Service(s) api rely on this file to provide a better developer experience.
 */

import type { CoreDependencies } from "@sern/handler";
import type { Client } from "discord.js";
import type { Publisher } from "@sern/publisher";
import type { Logger } from "winston";
import type { PrismaClient } from "@prisma/client";
import type {
  AutoRole,
  Counting,
  Giveaways,
  SelfRoles,
  Systems,
  Tickets,
  Welcome,
} from "#systems";
/**
 * Note: You usually would not need to modify this unless there is an urgent need to break the contracts provided.
 * You would need to modify this to add your custom Services, however.
 */
declare global {
  interface Dependencies extends CoreDependencies {
    "@sern/client": Client;
    publisher: Publisher;
    "@sern/logger": Logger;
    "@prisma/client": PrismaClient;
    systems: {
      AutoRole: AutoRole.autoRole;
      Counting: Counting.counting;
      Giveaway: Giveaways.giveaway;
      SelfRoles: SelfRoles.selfroles;
      Systems: Systems.systems;
      Tickets: Tickets.tickets;
      Welcome: Welcome.welcome;
    };
    process: NodeJS.Process;
  }
}

export {};
