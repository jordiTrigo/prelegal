// @react-pdf/renderer is ESM-only with a deep ESM dependency chain that Jest
// can't transform cleanly. The wiring (fetch template -> parse/substitute ->
// pdf().toBlob()) is what we're testing here; real PDF rendering is covered
// by the Playwright e2e download test against the served static build.
const toBlob = jest.fn(async () => new Blob(["%PDF-1.4 mock"], { type: "application/pdf" }));
const pdf = jest.fn((_element: unknown) => ({ toBlob }));
jest.mock("@react-pdf/renderer", () => ({
  Document: () => null,
  Page: () => null,
  Text: () => null,
  View: () => null,
  StyleSheet: { create: (styles: unknown) => styles },
  pdf: (element: unknown) => pdf(element),
}));

import { generateDocumentPdfBlob } from "@/lib/generate-document-pdf";
import { getDocumentType } from "@/lib/document-registry";
import { _resetParseCacheForTests } from "@/lib/render-document";
import type { DocumentFields } from "@/lib/field-format";

const descriptor = getDocumentType("dpa")!;
const fields: DocumentFields = {
  customer: { companyName: "Acme Inc" },
  provider: { companyName: "Widgets LLC" },
};

beforeEach(() => {
  _resetParseCacheForTests();
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      templateMarkdown: '<span class="keyterms_link">Customer</span> agrees to the DPA.',
    }),
  }) as jest.Mock;
});

describe("generateDocumentPdfBlob", () => {
  it("fetches the template, renders it, and produces a PDF blob", async () => {
    const blob = await generateDocumentPdfBlob(descriptor, fields);

    expect(global.fetch).toHaveBeenCalledWith("/api/document-types/dpa");
    expect(pdf).toHaveBeenCalledTimes(1);
    expect(toBlob).toHaveBeenCalledTimes(1);
    expect(blob.type).toBe("application/pdf");
    expect(blob.size).toBeGreaterThan(0);
  });
});
