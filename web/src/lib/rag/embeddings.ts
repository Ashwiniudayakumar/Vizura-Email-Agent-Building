import { getOpenAI } from "@/lib/openai";
import { serverEnv, EMBEDDING_DIMENSIONS } from "@/lib/env";

/** Embed a single piece of text. Returns a 1536-dim vector. */
export async function embedText(text: string): Promise<number[]> {
  const [vector] = await embedTexts([text]);
  return vector;
}

/**
 * Embed many texts in one request (OpenAI accepts an array as a batch).
 * Order of the returned vectors matches the input order.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const openai = getOpenAI();
  const res = await openai.embeddings.create({
    model: serverEnv.embeddingModel(),
    input: texts,
  });
  return res.data
    .sort((a, b) => a.index - b.index)
    .map((d) => {
      if (d.embedding.length !== EMBEDDING_DIMENSIONS) {
        throw new Error(
          `Embedding has ${d.embedding.length} dims, expected ${EMBEDDING_DIMENSIONS}. ` +
            `Check OPENAI_EMBEDDING_MODEL matches the vector(...) size in the SQL schema.`,
        );
      }
      return d.embedding;
    });
}
