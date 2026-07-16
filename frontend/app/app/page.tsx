"use client";

import { useMemo, useState } from "react";
import { NdaForm } from "@/components/NdaForm";
import { NdaDocument } from "@/components/NdaDocument";
import { defaultNdaFormData, ndaFormSchema, type NdaFormData } from "@/lib/nda-schema";

export default function Home() {
  const [data, setData] = useState<NdaFormData>(defaultNdaFormData);
  const [downloadState, setDownloadState] = useState<"idle" | "pending" | "error">("idle");

  const validation = useMemo(() => ndaFormSchema.safeParse(data), [data]);

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
          Fill in the key details below. The Mutual Non-Disclosure Agreement on the right updates
          live and can be downloaded as a PDF.
        </p>
      </header>

      <div className="grid flex-1 gap-8 lg:grid-cols-2">
        <section aria-label="NDA details form">
          <NdaForm data={data} onChange={setData} />

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
                Please fill in all required fields before downloading.
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
          <NdaDocument data={data} />
        </section>
      </div>
    </main>
  );
}
