"use client";

import { useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { ChatPanel } from "@/components/ChatPanel";
import { DocumentPreview } from "@/components/DocumentPreview";
import {
  INITIAL_ASSISTANT_MESSAGE,
  type ChatApiResponse,
  type ChatMessage,
} from "@/lib/document-chat";
import { getDocumentType } from "@/lib/document-registry";
import { isDocumentComplete } from "@/lib/document-fields";
import { saveDocument } from "@/lib/documents-client";
import { downloadDocumentPdf } from "@/lib/download-pdf";
import type { DocumentFields } from "@/lib/field-format";

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_ASSISTANT_MESSAGE]);
  const [documentType, setDocumentType] = useState<string | null>(null);
  const [fields, setFields] = useState<DocumentFields>({});
  const [chatState, setChatState] = useState<"idle" | "pending" | "error">("idle");
  const [downloadState, setDownloadState] = useState<"idle" | "pending" | "error">("idle");

  const descriptor = documentType ? getDocumentType(documentType) : undefined;
  const complete = descriptor ? isDocumentComplete(descriptor, fields) : false;

  async function handleSend(content: string) {
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setChatState("pending");
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, documentType, fields }),
      });

      if (!response.ok) {
        throw new Error(`Chat request failed (status ${response.status})`);
      }

      const data: ChatApiResponse = await response.json();
      setMessages([...nextMessages, { role: "assistant", content: data.reply }]);
      setDocumentType(data.documentType ?? null);
      setFields(data.fields ?? {});
      setChatState("idle");
    } catch {
      setChatState("error");
    }
  }

  async function handleDownload() {
    if (!descriptor || !complete) return;

    setDownloadState("pending");
    try {
      await downloadDocumentPdf(descriptor, fields);
      setDownloadState("idle");

      // A completed download is the "this document was created" moment
      // (see docs/TASK-6.md); best-effort, doesn't block the download the
      // user already has in hand if saving to history fails. The backend
      // dedupes repeat saves of unchanged fields, so re-downloading the same
      // completed document doesn't pile up duplicate history rows.
      saveDocument(descriptor.id, fields).catch(() => {});
    } catch {
      setDownloadState("error");
    }
  }

  return (
    <>
      <AppHeader />
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-10">
        <header>
          <h1 className="text-2xl font-bold">
            {descriptor ? descriptor.catalogNames[0] : "Legal Document Assistant"}
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Tell the assistant what document you need. Once it knows which one, the document on
            the right updates live and can be downloaded as a PDF.
          </p>
        </header>

        <div className="grid flex-1 gap-8 lg:grid-cols-2">
          <section aria-label="Document chat">
            <ChatPanel
              messages={messages}
              onSend={handleSend}
              pending={chatState === "pending"}
              error={chatState === "error"}
            />

            <div className="mt-6">
              <button
                type="button"
                className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!complete || downloadState === "pending"}
                onClick={handleDownload}
              >
                {downloadState === "pending" ? "Generating PDF..." : "Download PDF"}
              </button>
              {!complete && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                  Keep chatting to fill in all required fields before downloading.
                </p>
              )}
              {downloadState === "error" && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                  Something went wrong generating the PDF. Please try again.
                </p>
              )}
            </div>
          </section>

          <section
            aria-label="Document preview"
            className="overflow-y-auto rounded-md border border-zinc-300 p-6 dark:border-zinc-700"
          >
            {descriptor ? (
              <DocumentPreview descriptor={descriptor} fields={fields} />
            ) : (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Tell the assistant what document you need to see a live preview here.
              </p>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
