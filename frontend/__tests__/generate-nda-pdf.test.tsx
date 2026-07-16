import { defaultNdaFormData, type NdaFormData } from "@/lib/nda-schema";

// @react-pdf/renderer is ESM-only with a deep ESM dependency chain that Jest
// can't transform cleanly. The wiring (document construction -> pdf().toBlob())
// is what we're testing here; real PDF rendering is covered by the Playwright
// e2e download test against the served static build.
const toBlob = jest.fn(async () => new Blob(["%PDF-1.4 mock"], { type: "application/pdf" }));
const pdf = jest.fn(() => ({ toBlob }));
jest.mock("@react-pdf/renderer", () => ({
  Document: () => null,
  Page: () => null,
  Text: () => null,
  View: () => null,
  StyleSheet: { create: (styles: unknown) => styles },
  pdf: (element: unknown) => pdf(element),
}));

import { generateNdaPdfBlob } from "@/lib/generate-nda-pdf";

const validData: NdaFormData = {
  ...defaultNdaFormData,
  partyOne: {
    companyName: "Acme Inc",
    signerName: "Jane Doe",
    signerTitle: "CEO",
    noticeAddress: "jane@acme.com",
  },
  partyTwo: {
    companyName: "Widgets LLC",
    signerName: "John Roe",
    signerTitle: "COO",
    noticeAddress: "john@widgets.com",
  },
  purpose: "Evaluating a potential partnership",
  effectiveDate: "2026-07-14",
  governingLaw: "Delaware",
  jurisdiction: "New Castle, DE",
};

describe("generateNdaPdfBlob", () => {
  it("renders the NDA document to a PDF blob in the browser", async () => {
    const blob = await generateNdaPdfBlob(validData);

    expect(pdf).toHaveBeenCalledTimes(1);
    expect(toBlob).toHaveBeenCalledTimes(1);
    expect(blob.type).toBe("application/pdf");
    expect(blob.size).toBeGreaterThan(0);
  });
});
