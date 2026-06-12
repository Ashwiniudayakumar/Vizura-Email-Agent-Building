-- Fix: replace the under-performing ivfflat index (too many lists for 150 rows,
-- which returned 0 results for some queries) with an HNSW index.
-- Run this once in the Supabase SQL Editor.

drop index if exists public.course_embeddings_embedding_idx;

create index course_embeddings_embedding_idx
  on public.course_embeddings
  using hnsw (embedding vector_cosine_ops);
