import type { DocumentTypeDescriptor, FieldSpec } from "./document-registry";

export interface PartyInfo {
  companyName?: string;
  signerName?: string;
  signerTitle?: string;
  noticeAddress?: string;
}

export type FieldValue = string | number | string[] | PartyInfo | undefined;

export type DocumentFields = Record<string, FieldValue>;

export function formatDisplayDate(isoDate: string): string {
  // Parse as an ISO 8601 date-time string rather than via Date.UTC(year, ...):
  // the latter applies the legacy two-digit-year rule (adding 1900 to any
  // year 0-99), which would silently turn "0026-07-14" into the year 1926.
  const date = new Date(`${isoDate}T00:00:00Z`);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatMndaTerm(fields: DocumentFields): string {
  const type = fields.mndaTermType;
  if (type === "expires") {
    const years = fields.mndaTermYears;
    return `Expires ${years ?? "[MNDA Term Years not set]"} year(s) from the Effective Date`;
  }
  if (type === "until_terminated") {
    return "Continues until terminated in accordance with the terms of the MNDA";
  }
  return "[MNDA Term not set]";
}

function formatConfidentialityTerm(fields: DocumentFields): string {
  const type = fields.confidentialityTermType;
  if (type === "years") {
    const years = fields.confidentialityTermYears;
    return `${years ?? "[Confidentiality Term Years not set]"} year(s) from the Effective Date, but in the case of trade secrets until Confidential Information is no longer considered a trade secret under applicable laws`;
  }
  if (type === "perpetuity") {
    return "In perpetuity";
  }
  return "[Term of Confidentiality not set]";
}

/** Labels whose display value is computed from more than one raw field,
 * rather than read directly off a single field's value (Mutual NDA's term
 * selections are the only current case: an enum + a conditional year count). */
const COMPOUND_LABEL_FORMATTERS: Record<string, (fields: DocumentFields) => string> = {
  "mnda term": formatMndaTerm,
  "term of confidentiality": formatConfidentialityTerm,
};

export function compoundFormatterForLabel(
  label: string
): ((fields: DocumentFields) => string) | undefined {
  return COMPOUND_LABEL_FORMATTERS[label.trim().toLowerCase()];
}

/** Fields folded into a compound label's display (see above) rather than
 * shown as their own row in the cover summary. */
export function isFoldedIntoCompoundDisplay(fieldId: string): boolean {
  return fieldId === "mndaTermYears" || fieldId === "confidentialityTermYears";
}

export function isFieldFilled(field: FieldSpec, value: FieldValue): boolean {
  if (value === undefined) return false;
  if (field.type === "party") {
    const party = value as PartyInfo;
    return Boolean(party.companyName?.trim());
  }
  if (field.type === "list") {
    return Array.isArray(value) && value.length > 0;
  }
  if (typeof value === "number") return true;
  return typeof value === "string" && value.trim().length > 0;
}

export function formatFieldValue(field: FieldSpec, value: FieldValue): string {
  if (!isFieldFilled(field, value)) {
    return `[${field.label} not set]`;
  }
  if (field.type === "date") {
    return formatDisplayDate(value as string);
  }
  if (field.type === "party") {
    return (value as PartyInfo).companyName ?? `[${field.label} not set]`;
  }
  if (field.type === "list") {
    return (value as string[]).join(", ");
  }
  return String(value);
}

/** The display value for a cover-summary row: a compound label's computed
 * value if it has one, otherwise the field's own formatted value. Shared by
 * the HTML and PDF cover-summary renderers, which can't share JSX but can
 * share this pure data-shaping logic. */
export function coverSummaryDisplayValue(field: FieldSpec, fields: DocumentFields): string {
  const compound = compoundFormatterForLabel(field.label);
  return compound ? compound(fields) : formatFieldValue(field, fields[field.id]);
}

export const PARTY_ROWS: Array<{ key: keyof PartyInfo; label: string }> = [
  { key: "companyName", label: "Company" },
  { key: "signerName", label: "Print Name" },
  { key: "signerTitle", label: "Title" },
  { key: "noticeAddress", label: "Notice Address" },
];

/** Splits a document type's fields into party fields (shown in the
 * signature table) and detail fields (shown in the label/value grid),
 * excluding fields folded into a compound sibling's display. */
export function partitionFields(descriptor: DocumentTypeDescriptor): {
  partyFields: FieldSpec[];
  detailFields: FieldSpec[];
} {
  return {
    partyFields: descriptor.fields.filter((field) => field.type === "party"),
    detailFields: descriptor.fields.filter(
      (field) => field.type !== "party" && !isFoldedIntoCompoundDisplay(field.id)
    ),
  };
}
