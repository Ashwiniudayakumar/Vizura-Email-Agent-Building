import { GoogleSignInButton } from "./google-button";

const ERROR_MESSAGES: Record<string, string> = {
  not_owner:
    "That Google account isn't authorized. Sign in with the owner's account.",
  auth: "Sign-in failed. Please try again.",
};

// Next.js 16: searchParams is async.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const message = error ? ERROR_MESSAGES[error] ?? "Sign-in failed." : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6 dark:bg-black">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50">
          Vizura Email Agent
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Owner-only access. Sign in with the connected Gmail account.
        </p>

        {message && (
          <p
            role="alert"
            className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
          >
            {message}
          </p>
        )}

        <div className="mt-6">
          <GoogleSignInButton />
        </div>
      </div>
    </main>
  );
}
