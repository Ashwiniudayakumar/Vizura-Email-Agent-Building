/**
 * Centralised environment access. Server-side only helpers throw early with a
 * clear message when a required variable is missing, so misconfiguration fails
 * loudly at startup rather than deep inside a request.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.length === 0) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value;
}

function optional(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.length > 0 ? value : fallback;
}

function requireValue(value: string | undefined, name: string): string {
  if (!value || value.length === 0) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value;
}

/**
 * Public Supabase config — safe to use in the browser (guarded by RLS).
 *
 * IMPORTANT: read each NEXT_PUBLIC_* var by its *literal* name so Next.js can
 * inline it into the client bundle at build time. Dynamic access
 * (`process.env[name]`) is NOT inlined and will be undefined in the browser.
 */
export const supabasePublic = {
  url: () =>
    requireValue(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL"),
  anonKey: () =>
    requireValue(
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ),
};

/** Server-only secrets. Never import these into client components. */
export const serverEnv = {
  supabaseServiceRoleKey: () => required("SUPABASE_SERVICE_ROLE_KEY"),
  openaiApiKey: () => required("OPENAI_API_KEY"),
  chatModel: () => optional("OPENAI_CHAT_MODEL", "gpt-4o"),
  embeddingModel: () => optional("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small"),
  coursesCsvPath: () => optional("COURSES_CSV_PATH", "../vizura_courses_150.csv"),
  /** The single Google account allowed to use the app (owner-only access). */
  ownerEmail: () => required("OWNER_EMAIL").toLowerCase(),
};

/** Case-insensitive check that an email is the configured owner. */
export function isOwnerEmail(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase() === serverEnv.ownerEmail();
}

/** Embedding dimensionality for text-embedding-3-small. Must match the SQL schema. */
export const EMBEDDING_DIMENSIONS = 1536;
