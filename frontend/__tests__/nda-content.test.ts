import {
  buildNdaDocument,
  formatConfidentialityTerm,
  formatDisplayDate,
  formatMndaTerm,
} from "@/lib/nda-content";
import { defaultNdaFormData, type NdaFormData } from "@/lib/nda-schema";

const sampleData: NdaFormData = {
  ...defaultNdaFormData,
  partyOne: {
    companyName: "Acme Inc",
    signerName: "Jane Doe",
    signerTitle: "CEO",
    noticeAddress: "jane@acme.com",
  },
  partyTwo: {
    companyName: "Widgets LLC",
    signerName: "John Roe",
    signerTitle: "COO",
    noticeAddress: "john@widgets.com",
  },
  purpose: "Evaluating a potential partnership",
  effectiveDate: "2026-07-14",
  mndaTerm: { type: "expires", years: 2 },
  confidentialityTerm: { type: "years", years: 3 },
  governingLaw: "Delaware",
  jurisdiction: "New Castle, DE",
};

describe("formatDisplayDate", () => {
  it("formats an ISO date as a long-form date", () => {
    expect(formatDisplayDate("2026-07-14")).toBe("July 14, 2026");
  });

  it("returns a placeholder for an empty date", () => {
    expect(formatDisplayDate("")).toBe("[Effective Date not set]");
  });

  it("does not apply the legacy two-digit-year adjustment to a low year", () => {
    // Date.UTC(year, ...) adds 1900 to any year 0-99; parsing as an ISO
    // date-time string must not have that behavior. Regression test for a
    // bug where "0026-07-14" silently rendered as "January 1, 1926"-ish text.
    expect(formatDisplayDate("0026-07-14")).toBe("July 14, 26");
  });
});

describe("formatMndaTerm", () => {
  it("pluralizes years correctly", () => {
    expect(formatMndaTerm({ type: "expires", years: 1 })).toBe(
      "Expires 1 year from the Effective Date"
    );
    expect(formatMndaTerm({ type: "expires", years: 2 })).toBe(
      "Expires 2 years from the Effective Date"
    );
  });

  it("describes the until-terminated option", () => {
    expect(formatMndaTerm({ type: "until_terminated" })).toBe(
      "Continues until terminated in accordance with the terms of the MNDA"
    );
  });
});

describe("formatConfidentialityTerm", () => {
  it("describes a fixed-years term", () => {
    expect(formatConfidentialityTerm({ type: "years", years: 3 })).toContain("3 years");
  });

  it("describes perpetuity", () => {
    expect(formatConfidentialityTerm({ type: "perpetuity" })).toBe("In perpetuity");
  });
});

describe("buildNdaDocument", () => {
  it("substitutes the purpose, dates and terms into the standard clauses", () => {
    const doc = buildNdaDocument(sampleData);

    expect(doc.clauses).toHaveLength(11);

    const introduction = doc.clauses[0];
    expect(introduction.title).toBe("Introduction");
    expect(introduction.body).toContain("Evaluating a potential partnership");

    const termAndTermination = doc.clauses[4];
    expect(termAndTermination.title).toBe("Term and Termination");
    expect(termAndTermination.body).toContain("July 14, 2026");
    expect(termAndTermination.body).toContain("Expires 2 years from the Effective Date");
    expect(termAndTermination.body).toContain("3 years from the Effective Date");

    const governingLawClause = doc.clauses[8];
    expect(governingLawClause.title).toBe("Governing Law and Jurisdiction");
    expect(governingLawClause.body).toContain("Delaware");
    expect(governingLawClause.body).toContain("New Castle, DE");
  });

  it("maps party information onto labeled rows", () => {
    const doc = buildNdaDocument(sampleData);

    expect(doc.parties).toEqual([
      { label: "Party 1", ...sampleData.partyOne },
      { label: "Party 2", ...sampleData.partyTwo },
    ]);
  });

  it("falls back to placeholders for unset governing law and jurisdiction", () => {
    const doc = buildNdaDocument({ ...sampleData, governingLaw: "", jurisdiction: "" });
    const governingLawClause = doc.clauses[8];

    expect(governingLawClause.body).toContain("[Governing Law not set]");
    expect(governingLawClause.body).toContain("[Jurisdiction not set]");
  });
});
