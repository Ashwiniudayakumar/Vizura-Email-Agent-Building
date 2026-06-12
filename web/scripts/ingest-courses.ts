/**
 * Phase 1 ingestion: read the course CSV, embed each course, and upsert the
 * rows + embeddings into Supabase. Idempotent — re-running updates existing
 * courses (keyed on course_link) instead of duplicating them.
 *
 *   npm run ingest
 */
import { config } from "dotenv";
// override: project .env.local wins over any pre-existing shell env vars.
config({ path: ".env.local", override: true });

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "csv-parse/sync";
import { createClient } from "@supabase/supabase-js";
import { serverEnv, supabasePublic } from "../src/lib/env";
import { courseToText, type Course } from "../src/lib/rag/courseText";
import { embedTexts } from "../src/lib/rag/embeddings";

interface CsvRow {
  "Course Name": string;
  "Course Link": string;
  "Course Description": string;
  Price: string;
  "Starting Date": string;
  "Live or Self-Paced": string;
  "Number of Lessons": string;
  "Total Duration (Hours)": string;
  "Target Audience": string;
}

function num(value: string): number | null {
  if (value == null || value.trim() === "") return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

function toCourse(row: CsvRow): Course {
  return {
    course_name: row["Course Name"].trim(),
    course_link: row["Course Link"].trim(),
    description: row["Course Description"]?.trim() || null,
    price: num(row.Price),
    starting_date: row["Starting Date"]?.trim() || null,
    format: row["Live or Self-Paced"]?.trim() || null,
    number_of_lessons: num(row["Number of Lessons"]),
    total_duration_hours: num(row["Total Duration (Hours)"]),
    target_audience: row["Target Audience"]?.trim() || null,
  };
}

async function main() {
  const csvPath = resolve(process.cwd(), serverEnv.coursesCsvPath());
  console.log(`Reading courses from ${csvPath}`);

  const rows = parse(readFileSync(csvPath, "utf8"), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as CsvRow[];

  const courses = rows.map(toCourse);
  console.log(`Parsed ${courses.length} courses. Embedding...`);

  // Embed in batches to stay within request limits.
  const BATCH = 100;
  const contents = courses.map((c) => courseToText(c));
  const embeddings: number[][] = [];
  for (let i = 0; i < contents.length; i += BATCH) {
    const slice = contents.slice(i, i + BATCH);
    embeddings.push(...(await embedTexts(slice)));
    console.log(`  embedded ${Math.min(i + BATCH, contents.length)}/${contents.length}`);
  }

  const supabase = createClient(
    supabasePublic.url(),
    serverEnv.supabaseServiceRoleKey(),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  // 1) Upsert course rows (idempotent on course_link), get their ids back.
  const courseRows = courses.map((c, i) => ({ ...c, content: contents[i] }));
  const { data: upserted, error: upsertErr } = await supabase
    .from("courses")
    .upsert(courseRows, { onConflict: "course_link" })
    .select("id, course_link");

  if (upsertErr) throw new Error(`courses upsert failed: ${upsertErr.message}`);

  const idByLink = new Map(upserted!.map((r) => [r.course_link, r.id]));

  // 2) Upsert embeddings (idempotent on course_id).
  const embeddingRows = courses.map((c, i) => ({
    course_id: idByLink.get(c.course_link)!,
    embedding: embeddings[i],
  }));
  const { error: embErr } = await supabase
    .from("course_embeddings")
    .upsert(embeddingRows, { onConflict: "course_id" });

  if (embErr) throw new Error(`course_embeddings upsert failed: ${embErr.message}`);

  console.log(`Done. Upserted ${courseRows.length} courses and embeddings.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
