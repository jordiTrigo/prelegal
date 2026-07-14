import { defaultNdaFormData, ndaFormSchema, type NdaFormData } from "@/lib/nda-schema";

const validData: NdaFormData = {
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
  governingLaw: "Delaware",
  jurisdiction: "New Castle, DE",
};

describe("ndaFormSchema", () => {
  it("accepts fully filled-in data", () => {
    expect(ndaFormSchema.safeParse(validData).success).toBe(true);
  });

  it("rejects the empty default form data", () => {
    expect(ndaFormSchema.safeParse(defaultNdaFormData).success).toBe(false);
  });

  it("rejects a blank company name", () => {
    const result = ndaFormSchema.safeParse({
      ...validData,
      partyOne: { ...validData.partyOne, companyName: "  " },
    });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed effective date", () => {
    const result = ndaFormSchema.safeParse({ ...validData, effectiveDate: "07/14/2026" });
    expect(result.success).toBe(false);
  });

  it("rejects a non-positive term length", () => {
    const result = ndaFormSchema.safeParse({
      ...validData,
      mndaTerm: { type: "expires", years: 0 },
    });
    expect(result.success).toBe(false);
  });

  it("accepts the until_terminated and perpetuity variants without a years field", () => {
    const result = ndaFormSchema.safeParse({
      ...validData,
      mndaTerm: { type: "until_terminated" },
      confidentialityTerm: { type: "perpetuity" },
    });
    expect(result.success).toBe(true);
  });
});
