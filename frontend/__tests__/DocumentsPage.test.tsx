import { render, screen } from "@testing-library/react";
import DocumentsPage from "@/app/documents/page";

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
  });

  it("shows an error message when loading fails", async () => {
    mockFetch(null, false);
    render(<DocumentsPage />);
    expect(
      await screen.findByText(/Something went wrong loading your documents/)
    ).toBeInTheDocument();
  });
});
