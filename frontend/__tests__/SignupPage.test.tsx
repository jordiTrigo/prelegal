import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SignupPage from "@/app/signup/page";

describe("SignupPage", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders email and password fields and a sign up button", () => {
    render(<SignupPage />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign up" })).toBeInTheDocument();
  });

  it("submits credentials to the sign-up endpoint", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ email: "jane@example.com" }),
    });
    const user = userEvent.setup();
    render(<SignupPage />);

    await user.type(screen.getByLabelText("Email"), "jane@example.com");
    await user.type(screen.getByLabelText("Password"), "correct-horse");
    await user.click(screen.getByRole("button", { name: "Sign up" }));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/auth/signup",
        expect.objectContaining({ method: "POST" })
      )
    );
  });

  it("shows an error message when sign-up fails", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ detail: "An account with that email already exists" }),
    });
    const user = userEvent.setup();
    render(<SignupPage />);

    await user.type(screen.getByLabelText("Email"), "jane@example.com");
    await user.type(screen.getByLabelText("Password"), "correct-horse");
    await user.click(screen.getByRole("button", { name: "Sign up" }));

    expect(await screen.findByText("An account with that email already exists")).toBeInTheDocument();
  });

  it("links back to the sign-in page", () => {
    render(<SignupPage />);
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/");
  });
});
