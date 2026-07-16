import { pdf } from "@react-pdf/renderer";
import { NdaPdfDocument } from "@/components/NdaPdfDocument";
import type { NdaFormData } from "@/lib/nda-schema";

/** Renders the NDA to a PDF Blob entirely in the browser. */
export async function generateNdaPdfBlob(data: NdaFormData): Promise<Blob> {
  return pdf(<NdaPdfDocument data={data} />).toBlob();
}
