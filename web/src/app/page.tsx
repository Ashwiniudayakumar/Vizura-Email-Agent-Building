import { requireOwner } from "@/lib/auth";
import { signOutAction } from "@/lib/auth-actions";

// Owner-gated dashboard. requireOwner() redirects unauthenticated or
// non-owner visitors before anything renders.
export default async function Home() {
  const user = await requireOwner();

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 p-8">
      <header className="flex items-center justify-between border-b border-gray-200 pb-4 dark:border-gray-800">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50">
            Vizura Email Agent
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Signed in as {user.email}
          </p>
        </div>
        <form action={signOutAction}>
          <button
            type="submit"
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
          >
            Sign out
          </button>
        </form>
      </header>

      <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
        <h2 className="text-base font-medium text-gray-900 dark:text-gray-50">
          Phase 2 complete — you&apos;re authenticated 🎉
        </h2>
        <ul className="mt-3 space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <li>✅ Google login (owner-only)</li>
          <li>✅ Knowledge base + RAG (Phase 1, backend)</li>
          <li>⏭️ Next: Gmail inbox ingestion (Phase 3)</li>
        </ul>
      </section>
    </main>
  );
}
