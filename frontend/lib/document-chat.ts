import type { DocumentFields } from "./field-format";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatApiResponse {
  reply: string;
  documentType?: string;
  fields?: DocumentFields;
}

export const INITIAL_ASSISTANT_MESSAGE: ChatMessage = {
  role: "assistant",
  content:
    "Hi! Tell me what kind of legal document you need - an NDA, a services agreement, a DPA, and more - and I'll guide you through drafting it.",
};
