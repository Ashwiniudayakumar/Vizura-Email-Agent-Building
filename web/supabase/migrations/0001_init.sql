-- Phase 1: Knowledge base + RAG schema
-- Run this in the Supabase SQL editor (or via the Supabase CLI) before ingesting.

-- pgvector for embeddings.
create extension if not exists vector;

-- ---------------------------------------------------------------------------
-- courses: structured rows from vizura_courses_150.csv
-- `course_link` is the stable natural key used for idempotent upserts.
-- ---------------------------------------------------------------------------
create table if not exists public.courses (
  id                   bigint generated always as identity primary key,
  course_name          text not null,
  course_link          text not null unique,
  description          text,
  price                numeric,
  starting_date        date,
  format               text,          -- 'Live' | 'Self-Paced'
  number_of_lessons    integer,
  total_duration_hours numeric,
  target_audience      text,
  content              text not null, -- text representation used for embedding + LLM grounding
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- course_embeddings: one embedding per course (text-embedding-3-small = 1536 dims)
-- ---------------------------------------------------------------------------
create table if not exists public.course_embeddings (
  id         bigint generated always as identity primary key,
  course_id  bigint not null references public.courses(id) on delete cascade,
  embedding  vector(1536) not null,
  created_at timestamptz not null default now(),
  unique (course_id)
);

-- Approximate nearest-neighbour index for cosine distance.
create index if not exists course_embeddings_embedding_idx
  on public.course_embeddings
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- ---------------------------------------------------------------------------
-- match_courses: RAG retrieval. Returns the most similar courses to a query
-- embedding, ordered by cosine similarity (1 - cosine distance).
-- ---------------------------------------------------------------------------
create or replace function public.match_courses (
  query_embedding vector(1536),
  match_count     int default 5
)
returns table (
  id                   bigint,
  course_name          text,
  course_link          text,
  description          text,
  price                numeric,
  starting_date        date,
  format               text,
  number_of_lessons    integer,
  total_duration_hours numeric,
  target_audience      text,
  content              text,
  similarity           float
)
language sql stable
as $$
  select
    c.id,
    c.course_name,
    c.course_link,
    c.description,
    c.price,
    c.starting_date,
    c.format,
    c.number_of_lessons,
    c.total_duration_hours,
    c.target_audience,
    c.content,
    1 - (ce.embedding <=> query_embedding) as similarity
  from public.course_embeddings ce
  join public.courses c on c.id = ce.course_id
  order by ce.embedding <=> query_embedding
  limit match_count;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security: the course catalogue is non-sensitive reference data.
-- Allow read to everyone (anon + authenticated); writes happen only via the
-- service-role key (which bypasses RLS), used by the ingestion script.
-- ---------------------------------------------------------------------------
alter table public.courses          enable row level security;
alter table public.course_embeddings enable row level security;

drop policy if exists "courses are readable by everyone" on public.courses;
create policy "courses are readable by everyone"
  on public.courses for select
  using (true);

drop policy if exists "course embeddings are readable by everyone" on public.course_embeddings;
create policy "course embeddings are readable by everyone"
  on public.course_embeddings for select
  using (true);
