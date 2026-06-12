import type { SupabaseClient } from "@supabase/supabase-js";
import { embedText } from "@/lib/rag/embeddings";
import type { RetrievedCourse } from "@/lib/rag/courseText";

/**
 * RAG retrieval: embed the query, then ask Postgres (via the match_courses RPC)
 * for the most similar courses. The caller supplies the Supabase client so this
 * works both in Next server routes (anon/server client) and in scripts (admin).
 */
export async function retrieveCourses(
  supabase: SupabaseClient,
  query: string,
  matchCount = 5,
): Promise<RetrievedCourse[]> {
  const queryEmbedding = await embedText(query);

  const { data, error } = await supabase.rpc("match_courses", {
    query_embedding: queryEmbedding,
    match_count: matchCount,
  });

  if (error) {
    throw new Error(`match_courses RPC failed: ${error.message}`);
  }
  return (data ?? []) as RetrievedCourse[];
}
