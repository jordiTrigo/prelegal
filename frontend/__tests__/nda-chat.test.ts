import { defaultNdaFormData } from "@/lib/nda-schema";
import { mergeKnownFields, type PartialNdaFields } from "@/lib/nda-chat";

describe("mergeKnownFields", () => {
  it("merges party sub-fields onto the base data", () => {
    const known: PartialNdaFields = { partyOne: { companyName: "Acme Inc" } };

    const merged = mergeKnownFields(defaultNdaFormData, known);

    expect(merged.partyOne.companyName).toBe("Acme Inc");
    expect(merged.partyOne.signerName).toBe(defaultNdaFormData.partyOne.signerName);
  });

  it("leaves fields not mentioned untouched", () => {
    const known: PartialNdaFields = { purpose: "Evaluating a partnership" };

    const merged = mergeKnownFields(defaultNdaFormData, known);

    expect(merged.purpose).toBe("Evaluating a partnership");
    expect(merged.governingLaw).toBe(defaultNdaFormData.governingLaw);
  });

  it("builds an 'expires' mndaTerm from type and years together", () => {
    const known: PartialNdaFields = { mndaTermType: "expires", mndaTermYears: 5 };

    const merged = mergeKnownFields(defaultNdaFormData, known);

    expect(merged.mndaTerm).toEqual({ type: "expires", years: 5 });
  });

  it("builds an 'until_terminated' mndaTerm from type alone", () => {
    const known: PartialNdaFields = { mndaTermType: "until_terminated" };

    const merged = mergeKnownFields(defaultNdaFormData, known);

    expect(merged.mndaTerm).toEqual({ type: "until_terminated" });
  });

  it("applies mndaTermYears alone onto an already-expires term", () => {
    const base = { ...defaultNdaFormData, mndaTerm: { type: "expires" as const, years: 1 } };
    const known: PartialNdaFields = { mndaTermYears: 7 };

    const merged = mergeKnownFields(base, known);

    expect(merged.mndaTerm).toEqual({ type: "expires", years: 7 });
  });

  it("ignores mndaTermYears alone when the base term is not 'expires'", () => {
    const base = { ...defaultNdaFormData, mndaTerm: { type: "until_terminated" as const } };
    const known: PartialNdaFields = { mndaTermYears: 7 };

    const merged = mergeKnownFields(base, known);

    expect(merged.mndaTerm).toEqual({ type: "until_terminated" });
  });

  it("builds a 'perpetuity' confidentialityTerm from type alone", () => {
    const known: PartialNdaFields = { confidentialityTermType: "perpetuity" };

    const merged = mergeKnownFields(defaultNdaFormData, known);

    expect(merged.confidentialityTerm).toEqual({ type: "perpetuity" });
  });

  it("builds a 'years' confidentialityTerm from type and years together", () => {
    const known: PartialNdaFields = { confidentialityTermType: "years", confidentialityTermYears: 10 };

    const merged = mergeKnownFields(defaultNdaFormData, known);

    expect(merged.confidentialityTerm).toEqual({ type: "years", years: 10 });
  });
});
