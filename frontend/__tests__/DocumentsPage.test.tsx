import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DocumentsPage from "@/app/documents/page";
import { takeResumeDocument } from "@/lib/resume-document";

function mockFetch(documentsResponse: unknown, documentsOk = true) {
  global.fetch = jest.fn((url: string) => {
    if (url === "/api/auth/me") {
      return Promise.resolve({ ok: true, json: async () => ({ email: "jane@example.com" }) });
    }
    if (url === "/api/documents") {
      return documentsOk
        ? Promise.resolve({ ok: true, json: async () => documentsResponse })
        : Promise.resolve({ ok: false, status: 500 });
    }
    return Promise.reject(new Error(`Unexpected fetch: ${url}`));
  }) as jest.Mock;
}

describe("DocumentsPage", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    sessionStorage.clear();
  });

  it("shows an empty state when there are no documents", async () => {
    mockFetch([]);
    render(<DocumentsPage />);
    expect(await screen.findByText(/haven't created any documents yet/)).toBeInTheDocument();
  });

  it("lists saved documents with their type and creation date", async () => {
    mockFetch([
      { id: 1, documentType: "mutual-nda", fields: {}, createdAt: "2026-07-14 10:00:00" },
    ]);
    render(<DocumentsPage />);
    expect(await screen.findByText("Mutual NDA - Cover Page")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download PDF" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
  });

  it("stashes the document for resume and navigates to /app when Edit is clicked", async () => {
    mockFetch([
      { id: 7, documentType: "dpa", fields: { purpose: "Testing" }, createdAt: "2026-07-14 10:00:00" },
    ]);
    const user = userEvent.setup();
    render(<DocumentsPage />);

    await user.click(await screen.findByRole("button", { name: "Edit" }));

    expect(takeResumeDocument()).toEqual({
      documentId: 7,
      documentType: "dpa",
      fields: { purpose: "Testing" },
    });
  });

  it("shows an error message when loading fails", async () => {
    mockFetch(null, false);
    render(<DocumentsPage />);
    expect(
      await screen.findByText(/Something went wrong loading your documents/)
    ).toBeInTheDocument();
  });
});
