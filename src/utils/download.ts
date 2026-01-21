import { createCanvas, loadImage } from "canvas";
import fs from "node:fs";
import path from "node:path";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export async function downloadImage(
  url: string,
  guildId: string,
): Promise<string> {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  const response = await fetch(url);
  if (!response.ok)
    throw new Error(`Failed to fetch image: ${response.statusText}`);

  const arrayBuffer = await response.arrayBuffer();
  const image = await loadImage(Buffer.from(arrayBuffer));

  const targetWidth = 720;
  const scaleFactor = targetWidth / image.width;
  const targetHeight = image.height * scaleFactor;

  const canvas = createCanvas(targetWidth, targetHeight);
  const ctx = canvas.getContext("2d");

  ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

  const filename = `welcome-${guildId}.png`;
  const filepath = path.join(UPLOAD_DIR, filename);

  fs.writeFileSync(filepath, canvas.toBuffer("image/png"));

  return filepath;
}
