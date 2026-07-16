import type { NdaFormData, PartyInfo } from "./nda-schema";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface PartialPartyFields {
  companyName?: string;
  signerName?: string;
  signerTitle?: string;
  noticeAddress?: string;
}

/** Flat mirror of the backend's NdaFields (chat.py) - reconstructed into the
 * nested NdaFormData shape by mergeKnownFields below. */
export interface PartialNdaFields {
  partyOne?: PartialPartyFields;
  partyTwo?: PartialPartyFields;
  purpose?: string;
  effectiveDate?: string;
  mndaTermType?: "expires" | "until_terminated";
  mndaTermYears?: number;
  confidentialityTermType?: "years" | "perpetuity";
  confidentialityTermYears?: number;
  governingLaw?: string;
  jurisdiction?: string;
}

export interface ChatResponse {
  reply: string;
  fields: PartialNdaFields;
}

export const INITIAL_ASSISTANT_MESSAGE: ChatMessage = {
  role: "assistant",
  content:
    "Hi! I'll help you put together a Mutual NDA. Tell me about the two companies involved, or anything else about the deal, and I'll fill in the details as we go.",
};

function mergeParty(base: PartyInfo, partial?: PartialPartyFields): PartyInfo {
  return { ...base, ...partial };
}

export function mergeKnownFields(base: NdaFormData, known: PartialNdaFields): NdaFormData {
  const mndaTerm =
    known.mndaTermType === "until_terminated"
      ? { type: "until_terminated" as const }
      : known.mndaTermType === "expires"
        ? {
            type: "expires" as const,
            years:
              known.mndaTermYears ?? (base.mndaTerm.type === "expires" ? base.mndaTerm.years : 1),
          }
        : known.mndaTermYears !== undefined && base.mndaTerm.type === "expires"
          ? { type: "expires" as const, years: known.mndaTermYears }
          : base.mndaTerm;

  const confidentialityTerm =
    known.confidentialityTermType === "perpetuity"
      ? { type: "perpetuity" as const }
      : known.confidentialityTermType === "years"
        ? {
            type: "years" as const,
            years:
              known.confidentialityTermYears ??
              (base.confidentialityTerm.type === "years" ? base.confidentialityTerm.years : 1),
          }
        : known.confidentialityTermYears !== undefined && base.confidentialityTerm.type === "years"
          ? { type: "years" as const, years: known.confidentialityTermYears }
          : base.confidentialityTerm;

  return {
    partyOne: mergeParty(base.partyOne, known.partyOne),
    partyTwo: mergeParty(base.partyTwo, known.partyTwo),
    purpose: known.purpose ?? base.purpose,
    effectiveDate: known.effectiveDate ?? base.effectiveDate,
    mndaTerm,
    confidentialityTerm,
    governingLaw: known.governingLaw ?? base.governingLaw,
    jurisdiction: known.jurisdiction ?? base.jurisdiction,
  };
}
