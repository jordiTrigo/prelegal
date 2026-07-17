import {
  compoundFormatterForLabel,
  formatFieldValue,
  isFieldFilled,
  type DocumentFields,
} from "./field-format";
import type { DocumentTypeDescriptor, FieldSpec } from "./document-registry";

/** The templates use a narrow, consistent, machine-generated markdown dialect:
 * a single H1, nested ordered list items (4-space indentation per depth
 * level, marker text read verbatim rather than computed), inline bold, and
 * two kinds of custom `<span>` fields - `class="*_link"` (a substitutable
 * field, e.g. `<span class="coverpage_link">Customer</span>`) and
 * `class="header_2"/"header_3"` (an inline sub-heading fragment within an
 * item's body, rendered bold). Nothing else appears in the corpus (no
 * tables/images/blockquotes in the Standard Terms bodies this renders -
 * Mutual NDA's cover page uses a different, human-fill-in-a-form syntax
 * that this app never renders; it collects the same fields through chat
 * instead). A hand-rolled parser targeting exactly this is simpler than
 * pulling in a general markdown-AST library: react-pdf can't consume an
 * HTML/markdown AST directly either way, so a library wouldn't remove the
 * one genuinely hard part (mapping to both JSX and react-pdf primitives). */

export type ParsedRun =
  | { kind: "text"; text: string }
  | { kind: "bold"; runs: ParsedRun[] }
  | { kind: "field"; label: string };

export interface ParsedBlock {
  kind: "heading" | "item" | "paragraph";
  depth: number;
  marker?: string;
  runs: ParsedRun[];
}

const HEADING_PATTERN = /^#\s+(.*)$/;
const ITEM_PATTERN = /^( *)(\d+\.|[a-z]\.|[ivxlc]+\.)\s+(.*)$/i;
const ITEM_INDENT_SIZE = 4;
const INLINE_TOKEN =
  /\*\*(.+?)\*\*|<span([^>]*)>([\s\S]*?)<\/span>|\[([^\]]*)\]\(([^)]*)\)|<[^>]+>/g;

function parseInline(text: string): ParsedRun[] {
  const runs: ParsedRun[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(INLINE_TOKEN)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      runs.push({ kind: "text", text: text.slice(lastIndex, index) });
    }

    const [, boldText, spanAttrs, spanText, linkText] = match;
    if (boldText !== undefined) {
      runs.push({ kind: "bold", runs: parseInline(boldText) });
    } else if (spanAttrs !== undefined) {
      const classMatch = /class="([a-z0-9_]+)"/i.exec(spanAttrs);
      const className = classMatch?.[1] ?? "";
      if (className.endsWith("_link")) {
        runs.push({ kind: "field", label: spanText.trim() });
      } else if (className.startsWith("header_")) {
        runs.push({ kind: "bold", runs: parseInline(spanText) });
      } else {
        runs.push(...parseInline(spanText));
      }
    } else if (linkText !== undefined) {
      runs.push({ kind: "text", text: linkText });
    }
    // any other bare tag (e.g. a lone <span id="..."></span> anchor) is
    // dropped entirely - matched by the trailing <[^>]+> alternative above.

    lastIndex = index + match[0].length;
  }

  if (lastIndex < text.length) {
    runs.push({ kind: "text", text: text.slice(lastIndex) });
  }

  return runs.filter((run) => run.kind !== "text" || run.text !== "");
}

export function parseTemplate(markdown: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];

  for (const rawLine of markdown.split("\n")) {
    const line = rawLine.trimEnd();
    if (!line.trim()) continue;

    const heading = HEADING_PATTERN.exec(line);
    if (heading) {
      blocks.push({ kind: "heading", depth: 0, runs: parseInline(heading[1]) });
      continue;
    }

    const item = ITEM_PATTERN.exec(line);
    if (item) {
      const [, indent, marker, rest] = item;
      blocks.push({
        kind: "item",
        depth: Math.floor(indent.length / ITEM_INDENT_SIZE),
        marker,
        runs: parseInline(rest),
      });
      continue;
    }

    blocks.push({ kind: "paragraph", depth: 0, runs: parseInline(line) });
  }

  return blocks;
}

// --- substitution --------------------------------------------------------

export type RenderRun =
  | { kind: "text"; text: string }
  | { kind: "bold"; runs: RenderRun[] }
  | { kind: "field"; text: string; filled: boolean };

export interface RenderBlock {
  kind: "heading" | "item" | "paragraph";
  depth: number;
  marker?: string;
  runs: RenderRun[];
}

function normalizeLabel(label: string): string {
  return label
    .trim()
    .replace(/[’']s$/, "")
    .toLowerCase();
}

function buildLabelIndex(descriptor: DocumentTypeDescriptor): Map<string, FieldSpec> {
  const index = new Map<string, FieldSpec>();
  for (const field of descriptor.fields) {
    index.set(normalizeLabel(field.label), field);
  }
  return index;
}

function substituteRun(
  run: ParsedRun,
  labelIndex: Map<string, FieldSpec>,
  fields: DocumentFields
): RenderRun {
  if (run.kind === "text") return run;
  if (run.kind === "bold") {
    return { kind: "bold", runs: run.runs.map((r) => substituteRun(r, labelIndex, fields)) };
  }

  const normalized = normalizeLabel(run.label);
  const compoundFormatter = compoundFormatterForLabel(normalized);
  if (compoundFormatter) {
    const text = compoundFormatter(fields);
    return { kind: "field", text, filled: !text.startsWith("[") };
  }

  const field = labelIndex.get(normalized);
  if (!field) {
    // Not a field this document type collects (e.g. a cross-reference to a
    // document this app doesn't model, like "DPA" or "Security Policy") -
    // render the label text as-is rather than dropping it silently.
    return { kind: "text", text: run.label };
  }

  return {
    kind: "field",
    text: formatFieldValue(field, fields[field.id]),
    filled: isFieldFilled(field, fields[field.id]),
  };
}

export function substituteFields(
  blocks: ParsedBlock[],
  descriptor: DocumentTypeDescriptor,
  fields: DocumentFields
): RenderBlock[] {
  const labelIndex = buildLabelIndex(descriptor);
  return blocks.map((block) => ({
    ...block,
    runs: block.runs.map((run) => substituteRun(run, labelIndex, fields)),
  }));
}
