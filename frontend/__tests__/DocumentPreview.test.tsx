import { render, screen, waitFor } from "@testing-library/react";
import { DocumentPreview } from "@/components/DocumentPreview";
import { getDocumentType } from "@/lib/document-registry";
import { _resetParseCacheForTests } from "@/lib/render-document";
import type { DocumentFields } from "@/lib/field-format";

const NDA_TEMPLATE_MARKDOWN = [
  "# Standard Terms",
  "",
  '1. **Introduction**. This MNDA allows disclosure for the <span class="coverpage_link">Purpose</span>.',
  "",
  '2. **Term and Termination**. This MNDA commences on the <span class="coverpage_link">Effective Date</span> and expires at the end of the <span class="coverpage_link">MNDA Term</span>.',
].join("\n");

const descriptor = getDocumentType("mutual-nda")!;

const fields: DocumentFields = {
  partyOne: { companyName: "Acme Inc", signerName: "Jane Doe", signerTitle: "CEO", noticeAddress: "jane@acme.com" },
  partyTwo: { companyName: "Widgets LLC", signerName: "John Roe", signerTitle: "COO", noticeAddress: "john@widgets.com" },
  purpose: "Evaluating a partnership",
  effectiveDate: "2026-07-14",
  mndaTermType: "expires",
  mndaTermYears: 2,
  governingLaw: "Delaware",
  jurisdiction: "New Castle, DE",
};

beforeEach(() => {
  _resetParseCacheForTests();
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ templateMarkdown: NDA_TEMPLATE_MARKDOWN }),
  }) as jest.Mock;
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("DocumentPreview", () => {
  it("renders the document title and cover summary fields", async () => {
    render(<DocumentPreview descriptor={descriptor} fields={fields} />);

    expect(screen.getByRole("heading", { name: "Mutual NDA - Cover Page" })).toBeInTheDocument();
    expect(screen.getByText("Evaluating a partnership")).toBeInTheDocument();
    expect(screen.getByText("Delaware")).toBeInTheDocument();
    expect(screen.getByText("New Castle, DE")).toBeInTheDocument();
  });

  it("renders both parties in the signature table", async () => {
    render(<DocumentPreview descriptor={descriptor} fields={fields} />);

    expect(screen.getByText("Acme Inc")).toBeInTheDocument();
    expect(screen.getByText("Widgets LLC")).toBeInTheDocument();
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("John Roe")).toBeInTheDocument();
  });

  it("fetches, parses, and substitutes the template body", async () => {
    render(<DocumentPreview descriptor={descriptor} fields={fields} />);

    await waitFor(() =>
      expect(screen.getByText(/Evaluating a partnership/)).toBeInTheDocument()
    );
    expect(global.fetch).toHaveBeenCalledWith("/api/document-types/mutual-nda");
    // "July 14, 2026" legitimately appears twice: once in the cover summary
    // and once substituted into the clause body's own Effective Date span.
    expect(screen.getAllByText("July 14, 2026").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/Expires 2 year\(s\) from the Effective Date/).length
    ).toBeGreaterThan(0);
  });

  it("shows an error message when the template fails to load", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });

    render(<DocumentPreview descriptor={descriptor} fields={fields} />);

    await waitFor(() =>
      expect(
        screen.getByText("Something went wrong loading this document's terms. Please try again.")
      ).toBeInTheDocument()
    );
  });
});
