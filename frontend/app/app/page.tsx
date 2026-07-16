"use client";

import { useMemo, useState } from "react";
import { ChatPanel } from "@/components/ChatPanel";
import { NdaDocument } from "@/components/NdaDocument";
import {
  INITIAL_ASSISTANT_MESSAGE,
  mergeKnownFields,
  type ChatMessage,
  type ChatResponse,
  type PartialNdaFields,
} from "@/lib/nda-chat";
import { defaultNdaFormData, ndaFormSchema } from "@/lib/nda-schema";

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_ASSISTANT_MESSAGE]);
  const [knownFields, setKnownFields] = useState<PartialNdaFields>({});
  const [chatState, setChatState] = useState<"idle" | "pending" | "error">("idle");
  const [downloadState, setDownloadState] = useState<"idle" | "pending" | "error">("idle");

  const previewData = useMemo(
    () => mergeKnownFields(defaultNdaFormData, knownFields),
    [knownFields]
  );
  const validation = useMemo(() => ndaFormSchema.safeParse(previewData), [previewData]);

  async function handleSend(content: string) {
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setChatState("pending");
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, fields: knownFields }),
      });

      if (!response.ok) {
        throw new Error(`Chat request failed (status ${response.status})`);
      }

      const data: ChatResponse = await response.json();
      setMessages([...nextMessages, { role: "assistant", content: data.reply }]);
      setKnownFields(data.fields);
      setChatState("idle");
    } catch {
      setChatState("error");
    }
  }

  async function handleDownload() {
    if (!validation.success) return;

    setDownloadState("pending");
    try {
      // Dynamic import keeps @react-pdf/renderer (a large dependency) out of
      // the initial page bundle; it only loads when a download is requested.
      const { generateNdaPdfBlob } = await import("@/lib/generate-nda-pdf");
      const blob = await generateNdaPdfBlob(validation.data);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "mutual-nda.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setDownloadState("idle");
    } catch {
      setDownloadState("error");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <header>
        <h1 className="text-2xl font-bold">Mutual NDA Creator</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Chat with the assistant about your deal. The Mutual Non-Disclosure Agreement on the
          right updates live and can be downloaded as a PDF.
        </p>
      </header>

      <div className="grid flex-1 gap-8 lg:grid-cols-2">
        <section aria-label="NDA chat">
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
              disabled={!validation.success || downloadState === "pending"}
              onClick={handleDownload}
            >
              {downloadState === "pending" ? "Generating PDF..." : "Download PDF"}
            </button>
            {!validation.success && (
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
          aria-label="NDA preview"
          className="overflow-y-auto rounded-md border border-zinc-300 p-6 dark:border-zinc-700"
        >
          <NdaDocument data={previewData} />
        </section>
      </div>
    </main>
  );
}
