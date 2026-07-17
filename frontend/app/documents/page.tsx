"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { getDocumentType } from "@/lib/document-registry";
import { downloadDocumentPdf } from "@/lib/download-pdf";
import { listDocuments, type SavedDocument } from "@/lib/documents-client";

function formatCreatedAt(isoTimestamp: string): string {
  // SQLite's CURRENT_TIMESTAMP is UTC without a timezone suffix; append one
  // so the browser doesn't misinterpret it as local time.
  const date = new Date(`${isoTimestamp.replace(" ", "T")}Z`);
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function DocumentRow({ document }: { document: SavedDocument }) {
  const [downloadState, setDownloadState] = useState<"idle" | "pending" | "error">("idle");
  const descriptor = getDocumentType(document.documentType);

  async function handleDownload() {
    if (!descriptor) return;
    setDownloadState("pending");
    try {
      await downloadDocumentPdf(descriptor, document.fields);
      setDownloadState("idle");
    } catch {
      setDownloadState("error");
    }
  }

  return (
    <li className="flex items-center justify-between gap-4 rounded-md border border-zinc-300 p-4 dark:border-zinc-700">
      <div>
        <p className="font-medium">{descriptor?.catalogNames[0] ?? document.documentType}</p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Created {formatCreatedAt(document.createdAt)}
        </p>
        {downloadState === "error" && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            Something went wrong generating the PDF. Please try again.
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={handleDownload}
        disabled={!descriptor || downloadState === "pending"}
        className="shrink-0 rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        {downloadState === "pending" ? "Generating..." : "Download PDF"}
      </button>
    </li>
  );
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<SavedDocument[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    listDocuments()
      .then(setDocuments)
      .catch(() => setLoadError(true));
  }, []);

  return (
    <>
      <AppHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10">
        <header>
          <h1 className="text-2xl font-bold">My Documents</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Documents you&apos;ve previously created. Downloading regenerates the PDF from the
            details you provided.
          </p>
        </header>

        {loadError && (
          <p className="text-sm text-red-600 dark:text-red-400">
            Something went wrong loading your documents. Please try again.
          </p>
        )}
        {!loadError && !documents && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading...</p>
        )}
        {documents && documents.length === 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            You haven&apos;t created any documents yet.{" "}
            <a href="/app" className="font-medium text-brand-navy hover:underline dark:text-brand-blue">
              Start one now
            </a>
            .
          </p>
        )}
        {documents && documents.length > 0 && (
          <ul className="flex flex-col gap-3">
            {documents.map((document) => (
              <DocumentRow key={document.id} document={document} />
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
