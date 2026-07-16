import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatPanel } from "@/components/ChatPanel";
import type { ChatMessage } from "@/lib/nda-chat";

const messages: ChatMessage[] = [{ role: "assistant", content: "Hi! Tell me about your deal." }];

describe("ChatPanel", () => {
  it("renders the message history", () => {
    render(<ChatPanel messages={messages} onSend={jest.fn()} pending={false} error={false} />);

    expect(screen.getByText("Hi! Tell me about your deal.")).toBeInTheDocument();
  });

  it("sends the trimmed message and clears the input", async () => {
    const user = userEvent.setup();
    const onSend = jest.fn();
    render(<ChatPanel messages={messages} onSend={onSend} pending={false} error={false} />);

    const input = screen.getByLabelText("Message");
    await user.type(input, "  We are Acme Inc  ");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(onSend).toHaveBeenCalledWith("We are Acme Inc");
    expect(input).toHaveValue("");
  });

  it("does not send an empty or whitespace-only message", async () => {
    const user = userEvent.setup();
    const onSend = jest.fn();
    render(<ChatPanel messages={messages} onSend={onSend} pending={false} error={false} />);

    await user.type(screen.getByLabelText("Message"), "   ");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(onSend).not.toHaveBeenCalled();
  });

  it("disables the input and button while pending, and shows a thinking indicator", () => {
    render(<ChatPanel messages={messages} onSend={jest.fn()} pending={true} error={false} />);

    expect(screen.getByLabelText("Message")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
    expect(screen.getByText("Thinking...")).toBeInTheDocument();
  });

  it("shows an error message when error is true", () => {
    render(<ChatPanel messages={messages} onSend={jest.fn()} pending={false} error={true} />);

    expect(
      screen.getByText("Something went wrong. Please try sending your message again.")
    ).toBeInTheDocument();
  });
});
