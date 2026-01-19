import { Translate } from "@google-cloud/translate/build/src/v2/index.js";

const translate = new Translate({ key: process.env.GOOGLE_API_KEY });

async function translateText(text: string, target: string) {
  const [translation] = await translate.translate(text, target);
  return translation;
}

export { translateText };
