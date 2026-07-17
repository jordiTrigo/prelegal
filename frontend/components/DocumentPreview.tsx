"use client";

import { useEffect, useState } from "react";
import { DocumentCoverSummary } from "./DocumentCoverSummary";
import { DocumentBody } from "./DocumentBody";
import { CC_ATTRIBUTION } from "@/lib/attribution";
import type { DocumentFields } from "@/lib/field-format";
import { renderDocumentBlocks } from "@/lib/render-document";
import type { RenderBlock } from "@/lib/markdown-template";
import type { DocumentTypeDescriptor } from "@/lib/document-registry";

export function DocumentPreview({
  descriptor,
  fields,
}: {
  descriptor: DocumentTypeDescriptor;
  fields: DocumentFields;
}) {
  const [blocks, setBlocks] = useState<RenderBlock[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadError(false);
    renderDocumentBlocks(descriptor, fields)
      .then((rendered) => {
        if (!cancelled) setBlocks(rendered);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [descriptor, fields]);

  return (
    <article className="prose prose-sm max-w-none dark:prose-invert">
      <h1 className="text-xl font-semibold">{descriptor.catalogNames[0]}</h1>

      <DocumentCoverSummary descriptor={descriptor} fields={fields} />

      <section aria-label="Standard terms">
        <h2 className="text-lg font-semibold">Standard Terms</h2>
        {loadError && (
          <p className="text-sm text-red-600 dark:text-red-400">
            Something went wrong loading this document&apos;s terms. Please try again.
          </p>
        )}
        {!loadError && !blocks && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading...</p>
        )}
        {blocks && <DocumentBody blocks={blocks} />}
      </section>

      <p className="mt-8 text-xs text-zinc-500 dark:text-zinc-400">{CC_ATTRIBUTION}</p>
    </article>
  );
}
