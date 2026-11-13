import { GoogleGenAI, type Content, type GenerateContentConfig, type Part } from "@google/genai";

// Tried in order. The free tier is often overloaded, so when one model is
// busy or slow we fall through to the next instead of failing.
const MODELS = [
  ...(process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL] : []),
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3.8-flash",
].filter((m, i, all) => all.indexOf(m) === i);

const TIMEOUT_MS = 30_000;
const RETRYABLE = [429, 500, 503, 504];

let client: GoogleGenAI | null = null;

function getClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set. Copy .env.example to .env.local and add your free key.");
  }
  client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

// Asks Gemini for JSON matching `schema` and returns the parsed result.
export async function generateJSON<T>(parts: Part[], schema: object): Promise<T> {
  const text = await withFallback(
    [{ role: "user", parts }],
    { responseMimeType: "application/json", responseJsonSchema: schema, temperature: 0.2 },
  );
  return JSON.parse(text) as T;
}

// Plain-text reply for a multi-turn conversation.
export async function generateText(contents: Content[], systemInstruction: string): Promise<string> {
  return withFallback(contents, { systemInstruction, temperature: 0.6 });
}

async function withFallback(contents: Content[], config: GenerateContentConfig): Promise<string> {
  let lastStatus: number | undefined;
  for (const model of MODELS) {
    try {
      const res = await getClient().models.generateContent({
        model,
        contents,
        config: { ...config, abortSignal: AbortSignal.timeout(TIMEOUT_MS) },
      });
      if (!res.text) throw new Error("Gemini returned an empty response.");
      return res.text;
    } catch (err) {
      const e = err as { status?: number; name?: string };
      const timedOut = e.name === "TimeoutError" || e.name === "AbortError";
      // 404 = model retired for this key; worth trying the next one too.
      if (!timedOut && !(e.status && [...RETRYABLE, 404].includes(e.status))) throw err;
      lastStatus = timedOut ? 504 : e.status;
    }
  }
  if (lastStatus === 429) throw new Error("Free-tier rate limit reached. Wait a minute and try again.");
  throw new Error("Gemini is busy right now. Please try again in a minute.");
}
