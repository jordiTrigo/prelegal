import { isDocumentComplete } from "@/lib/document-fields";
import type { DocumentTypeDescriptor } from "@/lib/document-registry";

const descriptor: DocumentTypeDescriptor = {
  id: "test-type",
  catalogNames: ["Test Type"],
  fields: [
    { id: "customer", label: "Customer", type: "party", required: true },
    { id: "notes", label: "Notes", type: "text", required: false },
    { id: "effectiveDate", label: "Effective Date", type: "date", required: true },
  ],
};

describe("isDocumentComplete", () => {
  it("is false when a required field is missing", () => {
    expect(isDocumentComplete(descriptor, {})).toBe(false);
  });

  it("is false when only some required fields are set", () => {
    expect(
      isDocumentComplete(descriptor, { customer: { companyName: "Acme Inc" } })
    ).toBe(false);
  });

  it("is true once every required field is filled, ignoring optional ones", () => {
    expect(
      isDocumentComplete(descriptor, {
        customer: { companyName: "Acme Inc" },
        effectiveDate: "2026-07-14",
      })
    ).toBe(true);
  });
});
