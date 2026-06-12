# CLAUDE.md

Guidance for Claude Code (and any AI agent) working in this repository. This file
is the source of truth for **what we are building, the rules that must never be
broken, and how work should proceed**. Read it fully before planning or writing code.

The product requirements originate from [`INITIAL.md`](./INITIAL.md). If `INITIAL.md`
and this file ever disagree, `INITIAL.md` wins — update this file to match.

---

## 1. Project Overview

**Vizura Email Agent** is a human-in-the-loop email reply assistant for Gmail.

Vizura (`vizura.ai`) sells data-visualization / analytics **courses and programs**
(Data Visualization, Power BI, Tableau, etc.). Prospective and current students email
in with questions about these programs. This agent:

1. Fetches incoming email from the **primary Gmail inbox** via the Gmail API.
2. Drafts a contextual reply using an LLM (**OpenAI or Gemini** — see §4).
3. Grounds every draft in Vizura's **course knowledge base** using **RAG** over a
   vector store, so replies cite real program info (price, dates, format, link, etc.).
4. Presents the draft to the **owner for review**, who may edit it.
5. Sends **only after explicit one-click approval** — never automatically.
6. Stores the AI draft, the final sent version, and the owner's feedback in Supabase.

This is a **decision-support tool for one user (the inbox owner)**, not an autonomous
mailer. Every outbound email is a human decision.

---

## 2. Hard Constraints (NON-NEGOTIABLE)

These come straight from `INITIAL.md`. Treat any violation as a critical bug.

1. **NEVER send an email automatically.** No code path may call the Gmail "send"
   endpoint without a fresh, explicit user approval action for that specific email.
2. **One-click human approval** is required before any send. Editing must be possible
   before approval.
3. **Owner-only access.** Authentication must ensure only the owner of the connected
   Gmail account can use the app. Login is via **Google login (OAuth)**.
4. **Persist both versions.** For every reply, store *both* the original AI-drafted
   email and the version actually sent (they may differ because the owner edited it).
5. **Ground replies in the knowledge base.** Replies about programs must reference the
   relevant course document fetched via RAG — do not let the model invent course
   details (price, dates, duration, links).
6. **Feedback on every reply.** Each reply gets a **star rating + free-text feedback**,
   stored in Supabase.
7. **Phased delivery.** Plan first, confirm the user's preferences, then build in
   phases (see §8). Do not attempt the whole system in one shot.

If a requested change would break any of these, stop and flag it rather than proceeding.

---

## 3. Repository Layout

```
ContextEng/
├── CLAUDE.md                 # This file
├── INITIAL.md                # Original product requirements (source of truth)
├── vizura_courses_150.csv    # Course knowledge base (seed data for RAG) — 150 rows
├── .gitignore
└── web/                      # Next.js 16 app (App Router, TS, Tailwind) — the product
    ├── .env.example          # Required env vars (copy to .env.local)
    ├── AGENTS.md             # ⚠ Next.js 16 has breaking changes — read its docs first
    ├── supabase/migrations/  # SQL schema (run in Supabase before ingesting)
    │   └── 0001_init.sql     #   courses + course_embeddings (pgvector) + match_courses
    ├── scripts/
    │   ├── ingest-courses.ts # CSV → embeddings → Supabase (npm run ingest)
    │   └── test-rag.ts       # verify retrieval (npm run test:rag -- "query")
    ├── src/proxy.ts          # Next 16 "Proxy" (renamed Middleware): session + owner gate
    └── src/
        ├── app/login, app/auth/callback   # Google login + OAuth callback (Phase 2)
        └── lib/
            ├── env.ts        # centralised, validated env access (incl. OWNER_EMAIL)
            ├── openai.ts     # shared OpenAI client (server-only)
            ├── auth.ts       # DAL: getCurrentUser / requireOwner (owner-only)
            ├── supabase/     # admin (service-role), server, browser clients
            └── rag/          # courseText, embeddings, retrieve
```

> **Next.js 16 conventions in use:** Middleware is now `proxy.ts` (exported `proxy`,
> Node runtime); `cookies()` and page `searchParams` are **async** (`await` them).

> The GitHub repo is "Vizura-Email-Agent-Building". A nested clone folder of the same
> name may exist locally for verification and is git-ignored — do not commit it.

> **Next.js 16 caveat:** this is a major version with breaking changes vs. older docs.
> Before writing any Next-specific code (routes, server components, auth), read the
> relevant guide under `web/node_modules/next/dist/docs/` — see `web/AGENTS.md`.

---

## 4. Tech Stack & Deployment

Fixed by requirements:

| Concern              | Choice                                                            |
|----------------------|-------------------------------------------------------------------|
| Email source         | **Gmail API** (primary inbox)                                     |
| LLM for drafting     | **OpenAI or Gemini** — pick one during planning, keep it swappable |
| Database             | **Supabase** (Postgres + `pgvector` for embeddings)               |
| Vector store         | Supabase `pgvector` (RAG over the course KB)                       |
| Auth                 | **Google OAuth** (login), owner-only authorization                |
| Frontend hosting     | **Vercel**                                                        |
| Backend functions    | **Railway** (only if server-side functions are needed)            |

**To confirm during planning (ask the user):**
- LLM provider: OpenAI vs Gemini (and which model). Keep the LLM call behind a thin
  provider interface so it can be swapped without touching business logic.
- Embedding model for RAG (must be consistent between ingestion and query time).
- Frontend framework (Next.js is the natural fit for Vercel + Google OAuth).
- Whether a separate backend on Railway is required, or Vercel serverless/Next API
  routes suffice. Prefer the simplest option that satisfies the constraints.

Do not hard-commit to unconfirmed choices in code before the user approves them.

---

## 5. Knowledge Base & RAG

Seed data: `vizura_courses_150.csv` (150 courses). Columns:

| Column                  | Notes                                  |
|-------------------------|----------------------------------------|
| `Course Name`           | e.g. "Power BI Course 2"               |
| `Course Link`           | e.g. `https://vizura.ai/courses/2`     |
| `Course Description`    | short description                      |
| `Price`                 | integer (currency unit TBD — confirm)  |
| `Starting Date`         | ISO date (`YYYY-MM-DD`)                |
| `Live or Self-Paced`    | `Live` / `Self-Paced`                  |
| `Number of Lessons`     | integer                                |
| `Total Duration (Hours)`| integer                                |
| `Target Audience`       | e.g. "Beginners", "Managers"           |

**RAG requirements:**
- Convert this CSV into a **vector database stored in Supabase** (`pgvector`).
- Chunk per course (one row ≈ one document); embed a text representation that includes
  all fields so queries like "price of the Tableau course" or "self-paced Power BI
  options" retrieve correctly.
- At reply time, **retrieve the relevant course chunks** and pass them as grounding
  context to the LLM. The model must answer from retrieved facts, not memory.
- Make ingestion **re-runnable / idempotent** so the KB can be refreshed when the CSV
  changes (upsert on a stable key such as `Course Link`).

---

## 6. Data Model (Supabase) — proposed, confirm in planning

Tables likely needed (names indicative):

- `courses` — structured rows from the CSV (queryable metadata).
- `course_embeddings` — `pgvector` embeddings for RAG (FK to `courses`).
- `email_threads` / `emails` — incoming emails fetched from Gmail (Gmail message/thread
  IDs, sender, subject, body, received time).
- `replies` — **`ai_draft`** (original AI text) and **`sent_version`** (final text
  actually sent), status (`draft` / `approved` / `sent`), timestamps, link to the
  source email and the Gmail message ID of the sent reply.
- `feedback` — `star_rating` (1–5) + `feedback_text`, FK to `replies`.
- `users` — the authorized owner(s); enforce owner-only access (RLS).

Use **Supabase Row Level Security** so data is scoped to the owner. Never expose
service-role keys to the frontend.

---

## 7. Security & Secrets

- All secrets (Gmail OAuth client secret, LLM API key, Supabase service-role key) live
  in environment variables — **never commit them**. Add a `.env.example` documenting
  required vars; keep real `.env` files git-ignored.
- Frontend may use only the Supabase **anon** key + RLS. Privileged operations
  (sending mail, service-role DB writes) run server-side.
- The OAuth scope for Gmail should be the minimum needed (read primary inbox + send on
  approval). Document scopes when implementing.
- Enforce that the authenticated Google account matches the configured owner before any
  inbox or send operation.

---

## 8. How to Work: Plan → Confirm → Build in Phases

`INITIAL.md` mandates a phased approach. **Do not write feature code before the user
has approved a plan and answered the open preference questions (§4).**

Workflow for any substantial task:
1. **Plan** the work and lay out the phase breakdown.
2. **Ask the user's preferences** on the open decisions (LLM provider, framework, etc.).
3. **Execute one phase at a time**, checking in between phases.

### Suggested phase breakdown (refine with the user)

- **Phase 0 — Foundations:** repo scaffolding, Supabase project, env/secret setup,
  `.env.example`, choose LLM provider & framework.
- **Phase 1 — Knowledge base + RAG:** ingest `vizura_courses_150.csv` into Supabase,
  build embeddings, verify retrieval quality with sample queries.
- **Phase 2 — Auth:** Google login, owner-only authorization, RLS.
- **Phase 3 — Gmail ingestion:** connect Gmail API, fetch primary inbox, store emails.
- **Phase 4 — Drafting + RAG-grounded replies:** generate drafts grounded in retrieved
  course context; store `ai_draft`.
- **Phase 5 — Review & send:** UI to view/edit a draft, **one-click approve**, send via
  Gmail, store `sent_version`. (Enforce: no auto-send.)
- **Phase 6 — Feedback:** star rating + text feedback per reply, stored in Supabase.
- **Phase 7 — Deploy:** frontend to Vercel, backend (if any) to Railway.

Each phase should end in a working, verifiable increment.

---

## 9. Conventions

- Match existing code style when code exists; keep modules small and single-purpose.
- Keep the LLM and email providers behind thin interfaces so they are swappable/testable.
- Prefer idempotent, re-runnable scripts (ingestion, migrations).
- Commit messages: clear and scoped. Do not commit secrets, build artifacts, or the
  nested clone folder.
- When a change touches a hard constraint in §2, call it out explicitly in your summary.

---

## 10. Quick Reference

- **Source of truth for requirements:** `INITIAL.md`
- **Seed knowledge base:** `vizura_courses_150.csv` (150 courses)
- **The golden rule:** *Never send an email without explicit one-click human approval.*
