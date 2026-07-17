import { isFieldFilled, type DocumentFields } from "./field-format";
import type { DocumentTypeDescriptor } from "./document-registry";

/** True once every required field for this document type has a value -
 * the generic replacement for a per-type Zod schema's `safeParse().success`,
 * gating the download button the same way the original NDA-only flow did. */
export function isDocumentComplete(
  descriptor: DocumentTypeDescriptor,
  fields: DocumentFields
): boolean {
  return descriptor.fields
    .filter((field) => field.required)
    .every((field) => isFieldFilled(field, fields[field.id]));
}
