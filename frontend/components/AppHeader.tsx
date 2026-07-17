"use client";

import { useEffect, useState } from "react";
import { signOut } from "@/lib/auth-client";

export function AppHeader() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { email: string } | null) => setEmail(data?.email ?? null))
      .catch(() => setEmail(null));
  }, []);

  async function handleSignOut() {
    await signOut();
    window.location.href = "/";
  }

  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="/app" className="text-lg font-bold text-brand-navy dark:text-brand-blue">
          Prelegal
        </a>
        <nav className="flex items-center gap-4 text-sm">
          <a href="/app" className="text-zinc-700 hover:underline dark:text-zinc-300">
            New Document
          </a>
          <a href="/documents" className="text-zinc-700 hover:underline dark:text-zinc-300">
            My Documents
          </a>
          {email && (
            <span className="hidden text-zinc-500 sm:inline dark:text-zinc-400">{email}</span>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-full border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Sign out
          </button>
        </nav>
      </div>
    </header>
  );
}
