import type { DocumentFields } from "./field-format";

// A same-tab, one-time handoff from the documents list to the chat page:
// simpler than a dynamic route (this is a static export) or a fetch-by-id
// endpoint, since the documents page already has the full record in hand.
const STORAGE_KEY = "prelegal:resume-document";

export interface ResumeDocumentState {
  documentId: number;
  documentType: string;
  fields: DocumentFields;
}

export function stashResumeDocument(state: ResumeDocumentState): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function takeResumeDocument(): ResumeDocumentState | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(STORAGE_KEY);
  try {
    return JSON.parse(raw) as ResumeDocumentState;
  } catch {
    return null;
  }
}
