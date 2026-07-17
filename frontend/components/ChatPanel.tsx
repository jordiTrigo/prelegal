"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { ChatMessage } from "@/lib/document-chat";

interface ChatPanelProps {
  messages: ChatMessage[];
  onSend: (content: string) => void;
  pending: boolean;
  error: boolean;
}

export function ChatPanel({ messages, onSend, pending, error }: ChatPanelProps) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // The input is disabled while pending, which drops DOM focus; restore it
  // once a reply lands (success or error) so the user can keep typing
  // without reaching for the mouse after every turn.
  useEffect(() => {
    if (!pending) {
      inputRef.current?.focus();
    }
  }, [pending]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || pending) return;
    onSend(content);
    setDraft("");
  }

  return (
    <div className="flex flex-col gap-4">
      <ul aria-label="Chat messages" className="flex flex-col gap-3">
        {messages.map((message, index) => (
          <li
            key={index}
            className={
              message.role === "assistant"
                ? "rounded-md bg-zinc-100 p-3 text-sm dark:bg-zinc-800"
                : "rounded-md bg-brand-blue/10 p-3 text-sm"
            }
          >
            {message.content}
          </li>
        ))}
        {pending && (
          <li className="rounded-md bg-zinc-100 p-3 text-sm text-zinc-500 dark:bg-zinc-800">
            Thinking...
          </li>
        )}
      </ul>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">
          Something went wrong. Please try sending your message again.
        </p>
      )}

      <form className="flex gap-2" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="chat-input">
          Message
        </label>
        <input
          id="chat-input"
          ref={inputRef}
          type="text"
          className="flex-1 rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          disabled={pending}
          placeholder="Type your message..."
        />
        <button
          type="submit"
          className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-50"
          disabled={pending || !draft.trim()}
        >
          Send
        </button>
      </form>
    </div>
  );
}
