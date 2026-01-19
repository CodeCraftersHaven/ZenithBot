import axios from "axios";
import { v4 as uuidv4 } from "uuid";

const endpoint = "https://api.cognitive.microsofttranslator.com";
const location = process.env.AZURE_TRANSLATOR_REGION || "global";
const key = process.env.AZURE_TRANSLATOR_KEY;

async function translateText(text: string, target: string) {
  if (!key) {
    console.warn("AZURE_TRANSLATOR_KEY is not set. Returning original text.");
    return text;
  }

  try {
    const response = await axios({
      baseURL: endpoint,
      url: "/translate",
      method: "post",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Ocp-Apim-Subscription-Region": location,
        "Content-type": "application/json",
        "X-ClientTraceId": uuidv4().toString(),
      },
      params: {
        "api-version": "3.0",
        to: target,
      },
      data: [
        {
          text: text,
        },
      ],
      responseType: "json",
    });

    return response.data[0].translations[0].text;
  } catch (error) {
    console.error("Translation error:", error);
    return text; // Fallback to original text on error
  }
}

export { translateText };
