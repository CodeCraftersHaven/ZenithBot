import { createCanvas, loadImage } from "@napi-rs/canvas";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export async function downloadImage(
  url: string,
  guildId: string,
): Promise<string> {
  // 1. Ensure directory exists (sync is okay here as it runs rarely)
  if (!fsSync.existsSync(UPLOAD_DIR)) {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  }

  // 2. Fetch image buffer
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();

  // 3. Load image (napi-rs/canvas handles WebP natively here)
  const image = await loadImage(Buffer.from(arrayBuffer));

  // 4. Calculate scaling dimensions
  const targetWidth = 720;
  if (image.width < targetWidth) {
    throw new Error(
      `Image is too small. Width: ${image.width}, Target Width: ${targetWidth}`,
    );
  }

  const scaleFactor = targetWidth / image.width;
  const targetHeight = Math.round(image.height * scaleFactor);

  // 5. Draw and resize onto the canvas
  const canvas = createCanvas(targetWidth, targetHeight);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

  // 6. Encode and save asynchronously
  const filename = `welcome-${guildId}.png`;
  const filepath = path.join(UPLOAD_DIR, filename);

  // Use napi-rs/canvas async encode method
  const pngBuffer = await canvas.encode("png");

  // Use async file write to prevent blocking your bot's event loop
  await fs.writeFile(filepath, pngBuffer);

  return filepath;
}
