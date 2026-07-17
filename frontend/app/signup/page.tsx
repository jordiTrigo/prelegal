"use client";

import { useState, type FormEvent } from "react";
import { AuthError, signUp } from "@/lib/auth-client";

const MIN_PASSWORD_LENGTH = 8;

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await signUp(email, password);
      window.location.href = "/app";
    } catch (err) {
      setError(err instanceof AuthError ? err.message : "Something went wrong. Please try again.");
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-lg border border-zinc-300 p-8 shadow-sm dark:border-zinc-700">
        <h1 className="text-2xl font-bold text-brand-navy dark:text-brand-blue">Prelegal</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Create an account to start drafting legal agreements.
        </p>

        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
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
              autoComplete="new-password"
              required
              minLength={MIN_PASSWORD_LENGTH}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue dark:border-zinc-700"
            />
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              At least {MIN_PASSWORD_LENGTH} characters.
            </p>
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="mt-2 rounded-full bg-brand-navy px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-brand-blue dark:text-brand-navy"
          >
            {pending ? "Creating account..." : "Sign up"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Already have an account?{" "}
          <a href="/" className="font-medium text-brand-navy hover:underline dark:text-brand-blue">
            Sign in
          </a>
        </p>
      </div>
    </main>
  );
}
