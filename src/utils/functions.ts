import { Prisma, PrismaClient } from "@prisma/client";
import { DefaultArgs } from "@prisma/client/runtime/library";
import { AttachmentBuilder, Client, Guild, OAuth2Guild } from "discord.js";
import * as nodefs from "fs";
import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";
import { Logger } from "winston";

export type AssetEncoding =
  | "attachment"
  | "base64"
  | "binary"
  | "utf8"
  | "json";
type PartialAssetEncoding = Exclude<AssetEncoding, "attachment" | "json">;
const ASSETS_DIR = path.resolve("assets");

/**
 * Reads an asset file from the 'assets' directory.
 * If encoding is 'attachment', a discord.js AttachmentBuilder is provided, else
 * fs.promises.readFile is called. The default encoding is utf8.
 */
export async function Asset(opts: {
  p: string;
  name?: never;
  encoding?: PartialAssetEncoding;
}): Promise<string>;
export async function Asset(opts: {
  p: string;
  name?: never;
  encoding: "json";
}): Promise<string | AttachmentBuilder>;
export async function Asset(opts: {
  p: string;
  name?: string;
  encoding: "attachment";
}): Promise<AttachmentBuilder>;
export async function Asset(opts: {
  p: string;
  name?: string;
  encoding?: AssetEncoding;
}): Promise<string | AttachmentBuilder> {
  const { p, encoding = "utf8" } = opts;

  let relativePath: string;
  if (path.isAbsolute(p)) {
    relativePath = path.relative(ASSETS_DIR, "assets" + p);
  } else {
    relativePath = p;
  }

  const filePath = path.join(ASSETS_DIR, relativePath);

  if (encoding === "attachment") {
    const attachmentName = opts?.name || path.basename(filePath);
    return new AttachmentBuilder(filePath, { name: attachmentName });
  } else if (encoding === "json") {
    return fs.readFile(filePath, "utf8").then(JSON.parse);
  } else {
    return fs.readFile(filePath, encoding);
  }
}

export const getDiscordTimestamp = (): string => {
  const unixTimestamp = Math.floor(Date.now() / 1000); // Convert milliseconds to seconds
  return `<t:${unixTimestamp}:f>`; // 'f' for full date & time
};

export const getDiscordTimestampFromUnix = (unixTimestamp: number): string => {
  return `<t:${unixTimestamp}:f>`; // 'f' for full date & time
};

export const capFirstLetter = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const getEnableCommand = async (c: Client): Promise<string> => {
  const commands = await c.application?.commands.fetch();
  const cmd = commands?.find((cmd) => cmd.name === "system");
  if (!cmd) throw new Error("System command not found");
  return cmd.id;
};

export const getHelpCommand = async (c: Client): Promise<string> => {
  const commands = await c.application?.commands.fetch();
  const cmd = commands?.find((cmd) => cmd.name === "help");
  if (!cmd) throw new Error("Help command not found");
  return cmd.id;
};

export const checkIfSystemEnabled = async (
  systems: Prisma.SystemsDelegate<DefaultArgs, Prisma.PrismaClientOptions>,
  guildId: string,
  system: string,
) => {
  const enabled = await systems.findFirst({
    where: {
      id: guildId,
      systems: { some: { name: system.toLowerCase(), enabled: true } },
    },
  });
  return enabled;
};

export const findSystem = async (
  systems: Prisma.SystemsDelegate<DefaultArgs, Prisma.PrismaClientOptions>,
  guildId: string,
  system: string,
) => {
  const systemsDoc = await systems.findFirst({
    where: {
      id: guildId,
    },
  });
  return systemsDoc!.systems.find((s) => s.name === system && s.enabled);
};

export const getSystemFromMessage = async (
  systems: Prisma.SystemsDelegate<DefaultArgs, Prisma.PrismaClientOptions>,
  guildId: string,
  messageId: string,
) => {
  const result = await systems.findUnique({
    where: { id: guildId },
  });

  if (!result) return null;

  for (const system of result.systems) {
    for (const channel of system.channels) {
      const message = channel.messages.find((m) => m.id === messageId);
      if (message) return system.name.toLowerCase();
    }
  }
  return null;
};

export const syncDatabase = async (
  logger: Logger,
  prisma: PrismaClient,
  c: Client,
  specificGuild?: Guild,
) => {
  const feedbackSystem = await prisma.feedback.findFirst();
  if (!feedbackSystem) {
    await prisma.feedback.create({
      data: {
        autorole: {
          likes: 0,
          dislikes: 0,
          users: [],
        },
        counting: {
          likes: 0,
          dislikes: 0,
          users: [],
        },
        giveaway: {
          likes: 0,
          dislikes: 0,
          users: [],
        },
        selfroles: {
          likes: 0,
          dislikes: 0,
          users: [],
        },
        tickets: {
          likes: 0,
          dislikes: 0,
          users: [],
        },
        welcome: {
          likes: 0,
          dislikes: 0,
          users: [],
        },
      },
    });
  }
  const systemsFolder = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "systems",
  );

  const systemFiles = nodefs.readdirSync(systemsFolder);
  const systems = systemFiles.map(async (file: string) => {
    const systemPath = path.join(systemsFolder, file);
    const systemModule = await import(systemPath);

    const systemName =
      systemModule.default?.name || path.basename(file, path.extname(file));
    return systemName as string;
  });
  const systemsList = await Promise.all(systems);
  const filteredSystems = systemsList.filter(
    (f) => f !== "index" && f !== "Systems",
  );

  let guilds: (OAuth2Guild | Guild)[] = [];

  if (specificGuild) {
    logger.info(`Syncing database for guild: ${specificGuild.name}`);
    guilds = [specificGuild];
  } else {
    logger.info("Syncing database documents...");
    const fetched = await c.guilds.fetch();
    guilds = Array.from(fetched.values());
  }

  for (const g of guilds) {
    const guild = "fetch" in g ? await g.fetch() : g;
    const findCommand = {
      find: "Systems",
      filter: { _id: guild.id },
    };
    try {
      const result = (await prisma.$runCommandRaw(findCommand)) as RawResult;
      if (result.cursor.firstBatch.length > 0) {
        const dbGuildRaw = result.cursor.firstBatch[0];
        if (!dbGuildRaw.name) {
          logger.info(`Fixing null or missing name for guild ${guild.id}`);
          await prisma.systems.update({
            where: { id: guild.id },
            data: { name: guild.name },
          });
        }
      }
    } catch (e) {
      logger.error("Raw query to check for null name failed.");
      logger.error(e);
    }
    const dbGuild = await prisma.systems.findUnique({
      where: { id: guild.id },
    });
    const fileSystemNames = filteredSystems.map((s) => s.toLowerCase());

    if (!dbGuild) {
      const systemsData = fileSystemNames.map((s) => ({
        name: s,
        enabled: false,
        channels: [],
      }));
      await prisma.systems.create({
        data: {
          id: guild.id,
          name: guild.name,
          systems: systemsData,
        },
      });
    } else {
      const currentSystems = dbGuild.systems;
      const dbSystemNames = currentSystems.map((s) => s.name);

      const systemsToAdd = fileSystemNames.filter(
        (sName) => !dbSystemNames.includes(sName),
      );
      const systemsToRemove = dbSystemNames.filter(
        (sName) => !fileSystemNames.includes(sName),
      );

      if (systemsToAdd.length > 0 || systemsToRemove.length > 0) {
        const updatedSystems = currentSystems.filter(
          (s) => !systemsToRemove.includes(s.name),
        );

        const newSystemsData = systemsToAdd.map((name) => ({
          name,
          enabled: false,
          channels: [],
        }));
        updatedSystems.push(...newSystemsData);

        await prisma.systems.update({
          where: { id: guild.id },
          data: {
            name: guild.name,
            systems: {
              set: updatedSystems,
            },
          },
        });
      } else if (dbGuild.name !== guild.name) {
        await prisma.systems.update({
          where: { id: guild.id },
          data: {
            name: guild.name,
          },
        });
      }
    }
  }
  if (!specificGuild) {
    logger.info(
      `Synced systems for ${guilds.length} guild${guilds.length === 1 ? "" : "s"}.`,
    );
  }
};
