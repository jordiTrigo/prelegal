import {
  compoundFormatterForLabel,
  coverSummaryDisplayValue,
  formatDisplayDate,
  formatFieldValue,
  isFieldFilled,
  isFoldedIntoCompoundDisplay,
  partitionFields,
} from "@/lib/field-format";
import type { DocumentTypeDescriptor, FieldSpec } from "@/lib/document-registry";

describe("formatDisplayDate", () => {
  it("formats an ISO date as a long-form US date", () => {
    expect(formatDisplayDate("2026-07-14")).toBe("July 14, 2026");
  });

  it("does not apply the legacy two-digit-year rule to early years", () => {
    // Date.UTC(26, ...) would silently become 1926; parsing as an ISO
    // date-time string must not do that.
    expect(formatDisplayDate("0026-07-14")).not.toContain("1926");
  });
});

describe("isFieldFilled", () => {
  const textField: FieldSpec = { id: "purpose", label: "Purpose", type: "text", required: true };
  const partyField: FieldSpec = { id: "customer", label: "Customer", type: "party", required: true };
  const listField: FieldSpec = {
    id: "subprocessors",
    label: "Approved Subprocessors",
    type: "list",
    required: false,
  };

  it("is false for undefined", () => {
    expect(isFieldFilled(textField, undefined)).toBe(false);
  });

  it("is false for a blank string", () => {
    expect(isFieldFilled(textField, "   ")).toBe(false);
  });

  it("is true for a non-empty string", () => {
    expect(isFieldFilled(textField, "Evaluating a partnership")).toBe(true);
  });

  it("is true for a number", () => {
    expect(isFieldFilled({ ...textField, type: "integer" }, 2)).toBe(true);
  });

  it("is true for a party with a company name", () => {
    expect(isFieldFilled(partyField, { companyName: "Acme Inc" })).toBe(true);
  });

  it("is false for a party without a company name", () => {
    expect(isFieldFilled(partyField, { signerName: "Jane Doe" })).toBe(false);
  });

  it("is false for an empty list", () => {
    expect(isFieldFilled(listField, [])).toBe(false);
  });

  it("is true for a non-empty list", () => {
    expect(isFieldFilled(listField, ["Vendor A"])).toBe(true);
  });
});

describe("formatFieldValue", () => {
  it("shows a bracketed placeholder for an unfilled field", () => {
    const field: FieldSpec = { id: "purpose", label: "Purpose", type: "text", required: true };
    expect(formatFieldValue(field, undefined)).toBe("[Purpose not set]");
  });

  it("formats a date field for display", () => {
    const field: FieldSpec = { id: "effectiveDate", label: "Effective Date", type: "date", required: true };
    expect(formatFieldValue(field, "2026-07-14")).toBe("July 14, 2026");
  });

  it("formats a party field as its company name", () => {
    const field: FieldSpec = { id: "customer", label: "Customer", type: "party", required: true };
    expect(formatFieldValue(field, { companyName: "Acme Inc" })).toBe("Acme Inc");
  });

  it("joins a list field with commas", () => {
    const field: FieldSpec = {
      id: "subprocessors",
      label: "Approved Subprocessors",
      type: "list",
      required: false,
    };
    expect(formatFieldValue(field, ["Vendor A", "Vendor B"])).toBe("Vendor A, Vendor B");
  });
});

describe("compoundFormatterForLabel", () => {
  it("resolves the Mutual NDA MNDA Term formatter", () => {
    const formatter = compoundFormatterForLabel("MNDA Term");
    expect(formatter).toBeDefined();
    expect(formatter?.({ mndaTermType: "until_terminated" })).toBe(
      "Continues until terminated in accordance with the terms of the MNDA"
    );
  });

  it("returns undefined for a plain field label", () => {
    expect(compoundFormatterForLabel("Customer")).toBeUndefined();
  });
});

describe("isFoldedIntoCompoundDisplay", () => {
  it("folds the NDA term-year fields into their parent's display", () => {
    expect(isFoldedIntoCompoundDisplay("mndaTermYears")).toBe(true);
    expect(isFoldedIntoCompoundDisplay("confidentialityTermYears")).toBe(true);
  });

  it("does not fold an unrelated field", () => {
    expect(isFoldedIntoCompoundDisplay("purpose")).toBe(false);
  });
});

describe("partitionFields", () => {
  const descriptor: DocumentTypeDescriptor = {
    id: "dpa",
    catalogNames: ["Data Processing Agreement (DPA)"],
    fields: [
      { id: "customer", label: "Customer", type: "party", required: true },
      { id: "provider", label: "Provider", type: "party", required: true },
      { id: "durationOfProcessing", label: "Duration of Processing", type: "text", required: true },
    ],
  };

  it("splits party fields from detail fields", () => {
    const { partyFields, detailFields } = partitionFields(descriptor);
    expect(partyFields.map((f) => f.id)).toEqual(["customer", "provider"]);
    expect(detailFields.map((f) => f.id)).toEqual(["durationOfProcessing"]);
  });

  it("excludes fields folded into a compound sibling's display", () => {
    const ndaDescriptor: DocumentTypeDescriptor = {
      id: "mutual-nda",
      catalogNames: ["Mutual NDA - Standard Terms"],
      fields: [
        { id: "mndaTermType", label: "MNDA Term", type: "enum", required: true },
        { id: "mndaTermYears", label: "MNDA Term Years", type: "integer", required: false },
      ],
    };
    const { detailFields } = partitionFields(ndaDescriptor);
    expect(detailFields.map((f) => f.id)).toEqual(["mndaTermType"]);
  });
});

describe("coverSummaryDisplayValue", () => {
  it("uses the compound formatter when the label matches one", () => {
    const field: FieldSpec = { id: "mndaTermType", label: "MNDA Term", type: "enum", required: true };
    expect(coverSummaryDisplayValue(field, { mndaTermType: "until_terminated" })).toBe(
      "Continues until terminated in accordance with the terms of the MNDA"
    );
  });

  it("falls back to formatFieldValue for a plain field", () => {
    const field: FieldSpec = { id: "customer", label: "Customer", type: "party", required: true };
    expect(coverSummaryDisplayValue(field, { customer: { companyName: "Acme Inc" } })).toBe(
      "Acme Inc"
    );
  });
});
