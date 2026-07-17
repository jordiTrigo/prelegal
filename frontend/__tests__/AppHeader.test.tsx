import { render, screen, waitFor } from "@testing-library/react";
import { AppHeader } from "@/components/AppHeader";

describe("AppHeader", () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ email: "jane@example.com" }),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders navigation links", () => {
    render(<AppHeader />);
    expect(screen.getByRole("link", { name: "New Document" })).toHaveAttribute("href", "/app");
    expect(screen.getByRole("link", { name: "My Documents" })).toHaveAttribute(
      "href",
      "/documents"
    );
  });

  it("shows the signed-in user's email once loaded", async () => {
    render(<AppHeader />);
    expect(await screen.findByText("jane@example.com")).toBeInTheDocument();
  });

  it("renders a sign out button", () => {
    render(<AppHeader />);
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });

  it("does not show an email when the session lookup fails", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 401 });
    render(<AppHeader />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/auth/me"));
    expect(screen.queryByText(/@/)).not.toBeInTheDocument();
  });
});
