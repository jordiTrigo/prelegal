import { pdf } from "@react-pdf/renderer";
import { DocumentPdfPreview } from "@/components/DocumentPdfPreview";
import { renderDocumentBlocks } from "./render-document";
import type { DocumentTypeDescriptor } from "./document-registry";
import type { DocumentFields } from "./field-format";

/** Renders the document to a PDF Blob entirely in the browser. */
export async function generateDocumentPdfBlob(
  descriptor: DocumentTypeDescriptor,
  fields: DocumentFields
): Promise<Blob> {
  const blocks = await renderDocumentBlocks(descriptor, fields);
  return pdf(<DocumentPdfPreview descriptor={descriptor} fields={fields} blocks={blocks} />).toBlob();
}
