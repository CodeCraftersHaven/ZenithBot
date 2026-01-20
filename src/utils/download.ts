import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { finished } from "node:stream/promises";

// This matches the folder we created in Dockerfile
const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export async function downloadImage(
  url: string,
  guildId: string,
): Promise<string> {
  // 1. Ensure directory exists (just in case)
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  // 2. Fetch the file
  const response = await fetch(url);
  if (!response.ok || !response.body)
    throw new Error(`Failed to fetch image: ${response.statusText}`);

  // 3. Determine filename (sanitize guildId to be safe)
  // We force .png or .jpg based on usage, or detect from headers.
  // For simplicity, let's assume standard image formats.
  const extension = path.extname(new URL(url).pathname) || ".png";
  const filename = `welcome-${guildId}${extension}`;
  const filepath = path.join(UPLOAD_DIR, filename);

  // 4. Stream to disk
  const fileStream = fs.createWriteStream(filepath);
  // @ts-expect-error - native fetch body is a ReadableStream, node stream expects Readable.
  // Readable.fromWeb handles the conversion in Node 18+
  await finished(Readable.fromWeb(response.body).pipe(fileStream));

  return filepath; // Return the local path, e.g., /zenith/uploads/welcome-123.png
}
