import type { DocumentFields } from "./field-format";
import { parseTemplate, substituteFields, type ParsedBlock, type RenderBlock } from "./markdown-template";
import type { DocumentTypeDescriptor } from "./document-registry";

// Parsing is pure markdown-structure work independent of field values, so it
// only needs to run once per document type, not on every field change or
// every PDF download - shared between the live preview and PDF generation.
const parseCache = new Map<string, ParsedBlock[]>();

export async function fetchTemplateMarkdown(docType: string): Promise<string> {
  const response = await fetch(`/api/document-types/${docType}`);
  if (!response.ok) {
    throw new Error(`Failed to load template (status ${response.status})`);
  }
  const data: { templateMarkdown: string } = await response.json();
  return data.templateMarkdown;
}

async function getParsedTemplate(descriptor: DocumentTypeDescriptor): Promise<ParsedBlock[]> {
  const cached = parseCache.get(descriptor.id);
  if (cached) return cached;
  const markdown = await fetchTemplateMarkdown(descriptor.id);
  const parsed = parseTemplate(markdown);
  parseCache.set(descriptor.id, parsed);
  return parsed;
}

export async function renderDocumentBlocks(
  descriptor: DocumentTypeDescriptor,
  fields: DocumentFields
): Promise<RenderBlock[]> {
  const parsed = await getParsedTemplate(descriptor);
  return substituteFields(parsed, descriptor, fields);
}

/** Test-only: the module-level parse cache persists across tests within a
 * file (the module is imported once, not reset per test), which hides the
 * fetch path on the second render of the same document type. Call from
 * beforeEach in tests that exercise fetchTemplateMarkdown directly. */
export function _resetParseCacheForTests(): void {
  parseCache.clear();
}
