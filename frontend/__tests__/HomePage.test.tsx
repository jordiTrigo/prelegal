import { render, screen } from "@testing-library/react";
import Home from "@/app/app/page";
import { stashResumeDocument } from "@/lib/resume-document";

function mockFetch() {
  global.fetch = jest.fn((url: string) => {
    if (url === "/api/auth/me") {
      return Promise.resolve({ ok: true, json: async () => ({ email: "jane@example.com" }) });
    }
    if (url === "/api/document-types/dpa") {
      return Promise.resolve({
        ok: true,
        json: async () => ({ id: "dpa", templateMarkdown: "# Standard Terms" }),
      });
    }
    return Promise.reject(new Error(`Unexpected fetch: ${url}`));
  }) as jest.Mock;
}

describe("HomePage resume flow", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    sessionStorage.clear();
  });

  it("shows the generic empty state when nothing was stashed to resume", () => {
    mockFetch();
    render(<Home />);
    expect(screen.getByRole("heading", { name: "Legal Document Assistant" })).toBeInTheDocument();
  });

  it("restores a stashed document's type and fields on mount", async () => {
    mockFetch();
    stashResumeDocument({
      documentId: 7,
      documentType: "dpa",
      fields: { customer: { companyName: "Acme Inc" } },
    });

    render(<Home />);

    // Both the page header and the live preview render an <h1> with the
    // document's name once the type resolves.
    expect(
      (await screen.findAllByText("Data Processing Agreement (DPA)")).length
    ).toBeGreaterThan(0);
    expect(screen.getByText(/Welcome back/)).toBeInTheDocument();
  });

  it("consumes the stashed document so a later mount doesn't restore it again", () => {
    mockFetch();
    stashResumeDocument({ documentId: 7, documentType: "dpa", fields: {} });

    const { unmount } = render(<Home />);
    unmount();
    render(<Home />);

    expect(screen.getByRole("heading", { name: "Legal Document Assistant" })).toBeInTheDocument();
  });
});
