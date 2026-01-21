import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { finished } from "node:stream/promises";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export async function downloadImage(
  url: string,
  guildId: string,
): Promise<string> {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  const response = await fetch(url);
  if (!response.ok || !response.body)
    throw new Error(`Failed to fetch image: ${response.statusText}`);

  const extension = path.extname(new URL(url).pathname) || ".png";
  const filename = `welcome-${guildId}${extension}`;
  const filepath = path.join(UPLOAD_DIR, filename);

  const fileStream = fs.createWriteStream(filepath);
  // @ts-expect-error - native fetch body is a ReadableStream, node stream expects Readable.
  await finished(Readable.fromWeb(response.body).pipe(fileStream));

  return filepath;
}
