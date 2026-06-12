import OpenAI from "openai";
import { serverEnv } from "@/lib/env";

/**
 * Shared OpenAI client. Server-side only (reads OPENAI_API_KEY).
 * Lazily constructed so importing this module never throws at import time.
 */
let client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: serverEnv.openaiApiKey() });
  }
  return client;
}
