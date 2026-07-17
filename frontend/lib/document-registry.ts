import aiAddendum from "./document-registry/ai-addendum.json";
import baa from "./document-registry/baa.json";
import csa from "./document-registry/csa.json";
import designPartnerAgreement from "./document-registry/design-partner-agreement.json";
import dpa from "./document-registry/dpa.json";
import mutualNda from "./document-registry/mutual-nda.json";
import partnershipAgreement from "./document-registry/partnership-agreement.json";
import pilotAgreement from "./document-registry/pilot-agreement.json";
import psa from "./document-registry/psa.json";
import sla from "./document-registry/sla.json";
import softwareLicenseAgreement from "./document-registry/software-license-agreement.json";

export type FieldType = "text" | "date" | "integer" | "list" | "enum" | "party";

export interface FieldSpec {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
  promptHint?: string;
}

export interface DocumentTypeDescriptor {
  id: string;
  catalogNames: string[];
  fields: FieldSpec[];
}

const DESCRIPTORS = [
  aiAddendum,
  baa,
  csa,
  designPartnerAgreement,
  dpa,
  mutualNda,
  partnershipAgreement,
  pilotAgreement,
  psa,
  sla,
  softwareLicenseAgreement,
] as DocumentTypeDescriptor[];

export const DOCUMENT_TYPES: Record<string, DocumentTypeDescriptor> = Object.fromEntries(
  DESCRIPTORS.map((descriptor) => [descriptor.id, descriptor])
);

export function getDocumentType(id: string): DocumentTypeDescriptor | undefined {
  return DOCUMENT_TYPES[id];
}
