import { AttachmentBuilder, Client } from "discord.js";
import * as path from "path";
import * as fs from "fs/promises";
import { PrismaClient, Prisma } from "@prisma/client";
import { DefaultArgs } from "@prisma/client/runtime/library";
import { fileURLToPath } from "url";
import * as nodefs from "fs";
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
}): Promise<any>;
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

  const cmd = commands?.find((cmd) => cmd.name === "system")!;

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

export const syncDatabase = async (
  logger: Logger,
  prisma: PrismaClient,
  c: Client,
) => {
  logger.info("Syncing database documents...");
  const guilds = await c.guilds.fetch();
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
    (f) => f != "index" && f != "Systems",
  );

  for (const g of guilds.values()) {
    const guild = await g.fetch();
    const dbGuild = await prisma.systems.findUnique({
      where: { id: guild.id },
    });
    const fileSystemNames = filteredSystems.map((s) => s.toLowerCase());

    if (!dbGuild) {
      let systemsData = fileSystemNames.map((s) => ({
        name: s,
        enabled: false,
        channels: [],
      }));
      await prisma.systems.create({
        data: {
          id: guild.id,
          systems: systemsData,
        },
      });
    } else {
      const dbSystemNames = dbGuild.systems.map((s) => s.name);

      const systemsToAdd = fileSystemNames.filter(
        (sName) => !dbSystemNames.includes(sName),
      );
      const systemsToRemove = dbSystemNames.filter(
        (sName) => !fileSystemNames.includes(sName),
      );

      if (systemsToAdd.length > 0 || systemsToRemove.length > 0) {
        let updatedSystems = dbGuild.systems.filter(
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
            systems: {
              set: updatedSystems,
            },
          },
        });
      }
    }
  }
  logger.info(`Synced systems for ${guilds.size} guild${guilds.size === 1 ? "" : "s"}.`);
};