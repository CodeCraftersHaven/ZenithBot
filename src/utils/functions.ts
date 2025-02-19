import { AttachmentBuilder, Client } from "discord.js";
import * as path from "path";
import * as fs from "fs/promises";
import { PrismaClient, Prisma } from "@prisma/client";
import { DefaultArgs } from "@prisma/client/runtime/library";

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

  const cmd = commands?.find((cmd) => cmd.name === "system enable")!;

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
