import type { DocumentTypeDescriptor } from "./document-registry";
import type { DocumentFields } from "./field-format";

/** Generates the PDF and triggers a browser download for it. */
export async function downloadDocumentPdf(
  descriptor: DocumentTypeDescriptor,
  fields: DocumentFields
): Promise<void> {
  // Dynamic import keeps @react-pdf/renderer (a large dependency) out of the
  // initial page bundle; it only loads when a download is requested.
  const { generateDocumentPdfBlob } = await import("./generate-document-pdf");
  const blob = await generateDocumentPdfBlob(descriptor, fields);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${descriptor.id}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
