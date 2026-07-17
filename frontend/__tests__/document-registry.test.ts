import { DOCUMENT_TYPES, getDocumentType } from "@/lib/document-registry";

describe("document registry", () => {
  it("loads all eleven document types", () => {
    expect(Object.keys(DOCUMENT_TYPES)).toHaveLength(11);
  });

  it("includes mutual-nda and dpa", () => {
    expect(getDocumentType("mutual-nda")).toBeDefined();
    expect(getDocumentType("dpa")).toBeDefined();
  });

  it("returns undefined for an unknown type", () => {
    expect(getDocumentType("not-a-real-type")).toBeUndefined();
  });

  it("gives every descriptor at least one field", () => {
    for (const descriptor of Object.values(DOCUMENT_TYPES)) {
      expect(descriptor.fields.length).toBeGreaterThan(0);
    }
  });
});
