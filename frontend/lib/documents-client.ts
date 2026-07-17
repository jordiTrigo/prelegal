import type { DocumentFields } from "./field-format";

export interface SavedDocument {
  id: number;
  documentType: string;
  fields: DocumentFields;
  createdAt: string;
}

export async function saveDocument(
  documentType: string,
  fields: DocumentFields
): Promise<SavedDocument> {
  const response = await fetch("/api/documents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ documentType, fields }),
  });
  if (!response.ok) {
    throw new Error(`Failed to save document (status ${response.status})`);
  }
  return response.json();
}

export async function listDocuments(): Promise<SavedDocument[]> {
  const response = await fetch("/api/documents");
  if (!response.ok) {
    throw new Error(`Failed to load documents (status ${response.status})`);
  }
  return response.json();
}
