/**
 * Phase 1 verification: run a natural-language query through the RAG pipeline
 * and print the retrieved courses with their similarity scores.
 *
 *   npm run test:rag -- "self-paced power bi course for beginners"
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { serverEnv, supabasePublic } from "../src/lib/env";
import { retrieveCourses } from "../src/lib/rag/retrieve";

async function main() {
  const query = process.argv.slice(2).join(" ").trim() ||
    "Which Tableau course is good for beginners and how much does it cost?";

  console.log(`Query: ${query}\n`);

  const supabase = createClient(
    supabasePublic.url(),
    serverEnv.supabaseServiceRoleKey(),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const results = await retrieveCourses(supabase, query, 5);

  if (results.length === 0) {
    console.log("No matches. Did you run `npm run ingest` first?");
    return;
  }

  for (const r of results) {
    console.log(
      `[${r.similarity.toFixed(3)}] ${r.course_name} — $${r.price ?? "?"} — ` +
        `${r.format ?? "?"} — ${r.target_audience ?? "?"}\n        ${r.course_link}`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
