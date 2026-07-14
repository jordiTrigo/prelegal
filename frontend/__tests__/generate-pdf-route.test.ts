/**
 * @jest-environment node
 */
import { defaultNdaFormData, type NdaFormData } from "@/lib/nda-schema";

// @react-pdf/renderer is ESM-only with a deep ESM dependency chain that Jest
// can't transform cleanly. The route's own logic (validation + response
// wiring) is what we're testing here; real PDF rendering is covered by the
// Playwright e2e test and was manually verified against a running server.
const renderToBuffer = jest.fn(async (..._args: unknown[]) =>
  Buffer.from("%PDF-1.4 mock content")
);
jest.mock("@react-pdf/renderer", () => ({
  Document: () => null,
  Page: () => null,
  Text: () => null,
  View: () => null,
  StyleSheet: { create: (styles: unknown) => styles },
  renderToBuffer: (...args: unknown[]) => renderToBuffer(...args),
}));

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

function postRequest(body: unknown) {
  return new Request("http://localhost/api/generate-pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/generate-pdf", () => {
  beforeEach(() => {
    renderToBuffer.mockClear();
  });

  it("returns a PDF for valid form data", async () => {
    const { POST } = await import("@/app/api/generate-pdf/route");
    const response = await POST(postRequest(validData));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(renderToBuffer).toHaveBeenCalledTimes(1);

    const buffer = Buffer.from(await response.arrayBuffer());
    expect(buffer.toString("ascii")).toBe("%PDF-1.4 mock content");
  });

  it("returns 400 with field errors for invalid form data, without rendering a PDF", async () => {
    const { POST } = await import("@/app/api/generate-pdf/route");
    const response = await POST(postRequest({ purpose: "" }));

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error.fieldErrors.purpose).toContain("Purpose is required");
    expect(renderToBuffer).not.toHaveBeenCalled();
  });

  it("returns 400 for a malformed JSON body", async () => {
    const { POST } = await import("@/app/api/generate-pdf/route");
    const request = new Request("http://localhost/api/generate-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not json",
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
