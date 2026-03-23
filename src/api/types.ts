import { Autorole, GuildConfig, PrismaClient, Systems } from "@prisma/client";
import type { Logger } from "winston";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
    logger: Logger;
  }
}

export interface PartialGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
  features: string[];
  bot_present?: boolean;
}

export interface System {
  name: string;
  enabled: boolean;
  channels: {
    name: string;
    id: string;
    staffId?: string | null;
  }[];
}

export interface SettingsBody {
  welcomeStyle?: string;
  embed?: boolean;
  customImageUrl?: string | null;
  displayMemberCount?: boolean;
  systems?: Record<string, System>;
  autoroleId?: string;
}

export type SettingsUpdate = GuildConfig | Systems | Autorole;
