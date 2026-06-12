# Vizura Email Agent — web app

Next.js 16 (App Router, TypeScript, Tailwind) application for the Vizura email
reply agent. See the repository root [`CLAUDE.md`](../CLAUDE.md) for the full product
spec and [`INITIAL.md`](../INITIAL.md) for the original requirements.

> **Build order:** Phase 0 (foundations) and Phase 1 (knowledge base + RAG) are in
> place. Later phases (auth, Gmail, drafting, review/send, feedback, deploy) follow.

## Prerequisites

- Node.js 20+ (installed: v24 LTS)
- A [Supabase](https://supabase.com) project
- An [OpenAI](https://platform.openai.com) API key

## Setup (Phase 0)

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy the env template and fill it in:
   ```bash
   cp .env.example .env.local
   ```
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from Supabase →
     Project Settings → API.
   - `SUPABASE_SERVICE_ROLE_KEY` — same page (server-only; never expose to the client).
   - `OPENAI_API_KEY` — from the OpenAI dashboard.

## Knowledge base + RAG (Phase 1)

1. **Create the schema.** In the Supabase SQL editor, run
   [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql). This
   enables `pgvector` and creates `courses`, `course_embeddings`, and the
   `match_courses` retrieval function.
2. **Ingest the catalogue** (reads `../vizura_courses_150.csv`, embeds each course,
   upserts into Supabase — safe to re-run):
   ```bash
   npm run ingest
   ```
3. **Verify retrieval** with any natural-language query:
   ```bash
   npm run test:rag -- "self-paced power bi course for beginners"
   ```
   You should see the 5 most relevant courses with similarity scores.

## App

```bash
npm run dev      # http://localhost:3000
npm run build    # production build
npm run lint     # eslint
```

The default landing page is still the Next.js starter — the agent UI arrives in the
review/send phase.
