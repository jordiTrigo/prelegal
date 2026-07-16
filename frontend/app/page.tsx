"use client";

import { useRouter } from "next/navigation";

/**
 * Fake login screen: any input brings the user into the platform.
 * Real authentication arrives in a later task.
 */
export default function LoginPage() {
  const router = useRouter();

  // The form also has action="/app" so a native (pre-hydration) submit
  // brings the user into the platform too; the inputs deliberately have no
  // `name` so nothing typed ends up in the URL on that path.
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push("/app");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-lg border border-zinc-300 p-8 shadow-sm dark:border-zinc-700">
        <h1 className="text-2xl font-bold text-brand-navy dark:text-brand-blue">Prelegal</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Sign in to draft legal agreements.
        </p>

        <form className="mt-6 flex flex-col gap-4" action="/app" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue dark:border-zinc-700"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue dark:border-zinc-700"
            />
          </div>

          <button
            type="submit"
            className="mt-2 rounded-full bg-brand-navy px-5 py-2 text-sm font-medium text-white hover:opacity-90 dark:bg-brand-blue dark:text-brand-navy"
          >
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}
