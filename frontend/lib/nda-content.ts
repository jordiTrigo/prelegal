import type { NdaFormData } from "./nda-schema";

export interface NdaClause {
  number: number;
  title: string;
  body: string;
}

export interface NdaPartyRow {
  label: string;
  companyName: string;
  signerName: string;
  signerTitle: string;
  noticeAddress: string;
}

export interface NdaDocumentModel {
  effectiveDateDisplay: string;
  mndaTermDisplay: string;
  confidentialityTermDisplay: string;
  purpose: string;
  governingLaw: string;
  jurisdiction: string;
  clauses: NdaClause[];
  parties: [NdaPartyRow, NdaPartyRow];
}

const TOKEN_PATTERN = /\{\{(\w+)\}\}/g;

function fillTemplate(template: string, tokens: Record<string, string>): string {
  return template.replace(TOKEN_PATTERN, (match, key: string) => tokens[key] ?? match);
}

export function formatDisplayDate(isoDate: string): string {
  if (!isoDate) return "[Effective Date not set]";
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

export function formatMndaTerm(term: NdaFormData["mndaTerm"]): string {
  if (term.type === "expires") {
    return `Expires ${term.years} year${term.years === 1 ? "" : "s"} from the Effective Date`;
  }
  return "Continues until terminated in accordance with the terms of the MNDA";
}

export function formatConfidentialityTerm(term: NdaFormData["confidentialityTerm"]): string {
  if (term.type === "years") {
    return `${term.years} year${term.years === 1 ? "" : "s"} from the Effective Date, but in the case of trade secrets until Confidential Information is no longer considered a trade secret under applicable laws`;
  }
  return "In perpetuity";
}

const CLAUSE_TEMPLATES: Array<{ title: string; body: string }> = [
  {
    title: "Introduction",
    body: `This Mutual Non-Disclosure Agreement (which incorporates these Standard Terms and the Cover Page) ("MNDA") allows each party ("Disclosing Party") to disclose or make available information in connection with {{purpose}} which (1) the Disclosing Party identifies to the receiving party ("Receiving Party") as "confidential", "proprietary", or the like or (2) should be reasonably understood as confidential or proprietary due to its nature and the circumstances of its disclosure ("Confidential Information"). Each party's Confidential Information also includes the existence and status of the parties' discussions and information on the Cover Page. Confidential Information includes technical or business information, product designs or roadmaps, requirements, pricing, security and compliance documentation, technology, inventions and know-how. Each party is identified on the Cover Page and capitalized terms have the meanings given herein or on the Cover Page.`,
  },
  {
    title: "Use and Protection of Confidential Information",
    body: `The Receiving Party shall: (a) use Confidential Information solely for {{purpose}}; (b) not disclose Confidential Information to third parties without the Disclosing Party's prior written approval, except that the Receiving Party may disclose Confidential Information to its employees, agents, advisors, contractors and other representatives having a reasonable need to know for {{purpose}}, provided these representatives are bound by confidentiality obligations no less protective of the Disclosing Party than the applicable terms in this MNDA and the Receiving Party remains responsible for their compliance with this MNDA; and (c) protect Confidential Information using at least the same protections the Receiving Party uses for its own similar information but no less than a reasonable standard of care.`,
  },
  {
    title: "Exceptions",
    body: `The Receiving Party's obligations in this MNDA do not apply to information that it can demonstrate: (a) is or becomes publicly available through no fault of the Receiving Party; (b) it rightfully knew or possessed prior to receipt from the Disclosing Party without confidentiality restrictions; (c) it rightfully obtained from a third party without confidentiality restrictions; or (d) it independently developed without using or referencing the Confidential Information.`,
  },
  {
    title: "Disclosures Required by Law",
    body: `The Receiving Party may disclose Confidential Information to the extent required by law, regulation or regulatory authority, subpoena or court order, provided (to the extent legally permitted) it provides the Disclosing Party reasonable advance notice of the required disclosure and reasonably cooperates, at the Disclosing Party's expense, with the Disclosing Party's efforts to obtain confidential treatment for the Confidential Information.`,
  },
  {
    title: "Term and Termination",
    body: `This MNDA commences on {{effectiveDate}} and expires at the end of the MNDA Term ({{mndaTerm}}). Either party may terminate this MNDA for any or no reason upon written notice to the other party. The Receiving Party's obligations relating to Confidential Information will survive for the Term of Confidentiality ({{confidentialityTerm}}), despite any expiration or termination of this MNDA.`,
  },
  {
    title: "Return or Destruction of Confidential Information",
    body: `Upon expiration or termination of this MNDA or upon the Disclosing Party's earlier request, the Receiving Party will: (a) cease using Confidential Information; (b) promptly after the Disclosing Party's written request, destroy all Confidential Information in the Receiving Party's possession or control or return it to the Disclosing Party; and (c) if requested by the Disclosing Party, confirm its compliance with these obligations in writing. As an exception to subsection (b), the Receiving Party may retain Confidential Information in accordance with its standard backup or record retention policies or as required by law, but the terms of this MNDA will continue to apply to the retained Confidential Information.`,
  },
  {
    title: "Proprietary Rights",
    body: `The Disclosing Party retains all of its intellectual property and other rights in its Confidential Information and its disclosure to the Receiving Party grants no license under such rights.`,
  },
  {
    title: "Disclaimer",
    body: `ALL CONFIDENTIAL INFORMATION IS PROVIDED "AS IS", WITH ALL FAULTS, AND WITHOUT WARRANTIES, INCLUDING THE IMPLIED WARRANTIES OF TITLE, MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.`,
  },
  {
    title: "Governing Law and Jurisdiction",
    body: `This MNDA and all matters relating hereto are governed by, and construed in accordance with, the laws of the State of {{governingLaw}}, without regard to the conflict of laws provisions of such state. Any legal suit, action, or proceeding relating to this MNDA must be instituted in the federal or state courts located in {{jurisdiction}}. Each party irrevocably submits to the exclusive jurisdiction of such courts in any such suit, action, or proceeding.`,
  },
  {
    title: "Equitable Relief",
    body: `A breach of this MNDA may cause irreparable harm for which monetary damages are an insufficient remedy. Upon a breach of this MNDA, the Disclosing Party is entitled to seek appropriate equitable relief, including an injunction, in addition to its other remedies.`,
  },
  {
    title: "General",
    body: `Neither party has an obligation under this MNDA to disclose Confidential Information to the other or proceed with any proposed transaction. Neither party may assign this MNDA without the prior written consent of the other party, except that either party may assign this MNDA in connection with a merger, reorganization, acquisition or other transfer of all or substantially all its assets or voting securities. Any assignment in violation of this Section is null and void. This MNDA will bind and inure to the benefit of each party's permitted successors and assigns. Waivers must be signed by the waiving party's authorized representative and cannot be implied from conduct. If any provision of this MNDA is held unenforceable, it will be limited to the minimum extent necessary so the rest of this MNDA remains in effect. This MNDA (including the Cover Page) constitutes the entire agreement of the parties with respect to its subject matter, and supersedes all prior and contemporaneous understandings, agreements, representations, and warranties, whether written or oral, regarding such subject matter. This MNDA may only be amended, modified, waived, or supplemented by an agreement in writing signed by both parties. Notices, requests and approvals under this MNDA must be sent in writing to the email or postal addresses on the Cover Page and are deemed delivered on receipt. This MNDA may be executed in counterparts, including electronic copies, each of which is deemed an original and which together form the same agreement.`,
  },
];

export function buildNdaDocument(data: NdaFormData): NdaDocumentModel {
  const effectiveDateDisplay = formatDisplayDate(data.effectiveDate);
  const mndaTermDisplay = formatMndaTerm(data.mndaTerm);
  const confidentialityTermDisplay = formatConfidentialityTerm(data.confidentialityTerm);

  const tokens: Record<string, string> = {
    purpose: `the Purpose ("${data.purpose}")`,
    effectiveDate: effectiveDateDisplay,
    mndaTerm: mndaTermDisplay,
    confidentialityTerm: confidentialityTermDisplay,
    governingLaw: data.governingLaw || "[Governing Law not set]",
    jurisdiction: data.jurisdiction || "[Jurisdiction not set]",
  };

  const clauses: NdaClause[] = CLAUSE_TEMPLATES.map((clause, index) => ({
    number: index + 1,
    title: clause.title,
    body: fillTemplate(clause.body, tokens),
  }));

  return {
    effectiveDateDisplay,
    mndaTermDisplay,
    confidentialityTermDisplay,
    purpose: data.purpose,
    governingLaw: data.governingLaw,
    jurisdiction: data.jurisdiction,
    clauses,
    parties: [
      { label: "Party 1", ...data.partyOne },
      { label: "Party 2", ...data.partyTwo },
    ],
  };
}

export const ATTRIBUTION =
  'Based on the Common Paper Mutual Non-Disclosure Agreement (Version 1.0), free to use under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Attribution: "Common Paper" (https://commonpaper.com).';
