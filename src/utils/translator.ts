import axios from "axios";
import { createCanvas, loadImage } from "canvas";
import { AttachmentBuilder } from "discord.js";
import type { Paragraph } from "tesseract.js";
import { createWorker } from "tesseract.js";
import { languages } from "../config.js";

async function translateText(text: string, target: string) {
  const { TRANSLATOR_IP, TRANSLATOR_PORT } = process.env;

  if (!TRANSLATOR_IP || !TRANSLATOR_PORT) {
    return `setup env keys!`;
  }
  const endpoint = `http://${TRANSLATOR_IP}:${TRANSLATOR_PORT}/api/generate`;

  const targetLang = languages.find((l) => l.value === target)?.label || target;

  try {
    const cleanText = text.replace(/\s+/g, " ").trim();

    const response = await axios.post(endpoint, {
      model: "qwen2.5:1.5b",

      system: `You are a professional translator. Translate the user's text to ${targetLang}. Output ONLY the translated text. No notes, no explanations.`,

      prompt: cleanText,

      options: {
        temperature: 0,
      },

      stream: false,
    });

    return response.data.response.trim();
  } catch (error) {
    console.error("Translation failed:", error);
    return text;
  }
}

async function translateImage(imageUrl: string, target: string) {
  try {
    const worker = await createWorker();
    const { data } = await worker.recognize(imageUrl);
    await worker.terminate();

    const fullText = data.text.trim();
    if (!fullText) return { text: "No text found in image." };

    const image = await loadImage(imageUrl);

    const paragraphs: Paragraph[] = (data.blocks || []).flatMap(
      (b) => b.paragraphs,
    );

    if (paragraphs.length === 0) {
      const translatedFull = await translateText(fullText, target);

      const tempCanvas = createCanvas(image.width, 100);
      const ctxTemp = tempCanvas.getContext("2d");
      ctxTemp.font = "24px sans-serif";

      const words = translatedFull.split(" ");
      let line = "";
      const lines: string[] = [];
      const maxWidth = image.width - 40;

      for (const word of words) {
        const testLine = line + word + " ";
        const metrics = ctxTemp.measureText(testLine);
        if (metrics.width > maxWidth && line !== "") {
          lines.push(line);
          line = word + " ";
        } else {
          line = testLine;
        }
      }
      lines.push(line);

      const lineHeight = 30;
      const footerHeight = lines.length * lineHeight + 40;

      const canvas = createCanvas(image.width, image.height + footerHeight);
      const ctx = canvas.getContext("2d");

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.drawImage(image, 0, 0);

      ctx.fillStyle = "#000000";
      ctx.font = "24px sans-serif";
      ctx.textBaseline = "top";

      let y = image.height + 20;
      for (const l of lines) {
        ctx.fillText(l, 20, y);
        y += lineHeight;
      }

      const buffer = canvas.toBuffer();
      const attachment = new AttachmentBuilder(buffer, {
        name: "translated_image.png",
      });
      return { text: translatedFull, attachment };
    }

    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext("2d");

    ctx.drawImage(image, 0, 0, image.width, image.height);

    let fullTranslatedText = "";

    for (const paragraph of paragraphs) {
      if (!paragraph || !paragraph.text || !paragraph.text.trim()) continue;

      const sourceText = paragraph.text.trim();
      await new Promise((r) => setTimeout(r, 500));

      const translatedPara = await translateText(sourceText, target);
      fullTranslatedText += translatedPara + "\n\n";

      if (!paragraph.bbox) continue;

      const { x0, y0, x1, y1 } = paragraph.bbox;
      const width = x1 - x0;
      const height = y1 - y0;

      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(x0, y0, width, height);

      const numberOfLines = paragraph.lines?.length || 1;
      const estimatedLineHeight = height / numberOfLines;
      const fontSize = Math.max(12, Math.min(estimatedLineHeight * 0.8, 48));

      ctx.font = `${fontSize}px sans-serif`;
      ctx.fillStyle = "#ffffff";
      ctx.textBaseline = "top";

      const words = translatedPara.split(" ");
      let line = "";
      let y = y0 + (estimatedLineHeight - fontSize) / 2;
      const maxWidth = width;
      const x = x0;

      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const testLine = line + word + " ";
        const metrics = ctx.measureText(testLine);

        if (metrics.width > maxWidth && line !== "") {
          ctx.fillText(line, x, y);
          line = word + " ";
          y += estimatedLineHeight;
          if (y + fontSize > y1) break;
        } else {
          line = testLine;
        }
      }
      if (y + fontSize <= y1 + estimatedLineHeight) {
        ctx.fillText(line, x, y);
      }
    }

    const buffer = canvas.toBuffer();

    const attachment = new AttachmentBuilder(buffer, {
      name: "translated_image.png",
    });

    return { text: fullTranslatedText.trim() || fullText, attachment };
  } catch (_error) {
    return { text: "Failed to process image. "+_error };
  }
}

export { translateImage, translateText };
