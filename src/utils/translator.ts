import axios from "axios";
import { languages } from "../config.js";
import { autocorrectText } from "./autocorrect.js";

async function translateText(text: string, target: string) {
  const { TRANSLATOR_IP, TRANSLATOR_PORT } = process.env;

  if (!TRANSLATOR_IP || !TRANSLATOR_PORT) {
    return `setup env keys!`;
  }
  const endpoint = `http://${TRANSLATOR_IP}:${TRANSLATOR_PORT}/api/generate`;
  const correctedText = await autocorrectText(text.split("\n")[0]);

  const targetLang = languages.find((l) => l.value === target)?.label || target;

  try {
    const response = await axios.post(endpoint, {
      model: "gemma2",
      prompt: `Translate the following text to ${targetLang}. Only provide the translation, no other text: "${correctedText}"`,
      stream: false,
    });

    return response.data.response.split("\n")[0].trim();
  } catch (error) {
    console.error("Translation error:", error);
    return text;
  }
}

export { translateText };
