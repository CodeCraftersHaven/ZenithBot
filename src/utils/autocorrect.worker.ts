import nspell from "nspell";
import { parentPort } from "worker_threads";

if (!parentPort) {
  throw new Error("This file must be run as a worker thread.");
}

const spellers: ReturnType<typeof nspell>[] = [];
let isReady = false;

async function loadDictionaries() {
  const dictionaryNames = [
    "dictionary-en",
    "dictionary-es",
    "dictionary-da",
    "dictionary-de",
    "dictionary-fr",
    "dictionary-it",
    "dictionary-nl",
    "dictionary-pl",
    "dictionary-pt",
    "dictionary-sv",
    "dictionary-tr",
    "dictionary-cs",
    "dictionary-ru",
    "dictionary-vi",
    "dictionary-hu",
    "dictionary-bg",
    "dictionary-el",
    "dictionary-uk",
    "dictionary-hr",
    "dictionary-ro",
    "dictionary-lt",
  ];

  for (const name of dictionaryNames) {
    try {
      const dictModule = await import(name);
      const dict = dictModule.default || dictModule;

      const speller = nspell({
        aff: Buffer.from(dict.aff),
        dic: Buffer.from(dict.dic),
      });
      spellers.push(speller);
    } catch (e) {
      console.error(`[Worker] Failed to load ${name}:`, e);
    }
  }

  isReady = true;
}

loadDictionaries().catch((err) =>
  console.error("[Worker] Fatal error loading dictionaries:", err),
);

function cleanWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function processText(text: string): string {
  if (!isReady) {
    return cleanWhitespace(text);
  }

  const corrected = cleanWhitespace(text);

  const tokens = corrected.split(" ");

  if (tokens.length <= 1) return corrected;

  const newTokens: string[] = [];
  let i = 0;

  while (i < tokens.length) {
    const currentToken = tokens[i];

    if (i + 1 < tokens.length) {
      const nextToken = tokens[i + 1];
      const merged = currentToken + nextToken;

      const isMergedValid = spellers.some((s) => s.correct(merged));
      const isCurrentValid =
        currentToken.length > 1 &&
        spellers.some((s) => s.correct(currentToken));
      const isNextValid =
        nextToken.length > 1 && spellers.some((s) => s.correct(nextToken));

      if (isMergedValid && (!isCurrentValid || !isNextValid)) {
        newTokens.push(merged);
        i += 2;
        continue;
      }
    }

    newTokens.push(currentToken);
    i++;
  }

  return newTokens.join(" ");
}

parentPort.on("message", (msg: { id: string; text: string }) => {
  if (
    !msg ||
    typeof msg !== "object" ||
    !msg.id ||
    typeof msg.text !== "string"
  ) {
    return;
  }

  const { id, text } = msg;

  try {
    if (!isReady) {
      parentPort?.postMessage({ id, result: cleanWhitespace(text) });
      return;
    }

    const result = processText(text);
    parentPort?.postMessage({ id, result });
  } catch (error) {
    console.error("[Worker] Processing error:", error);
    parentPort?.postMessage({ id, error: "Processing failed" });
  }
});
