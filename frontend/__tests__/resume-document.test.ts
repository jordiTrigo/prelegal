import { stashResumeDocument, takeResumeDocument } from "@/lib/resume-document";

describe("resume-document", () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  it("returns null when nothing has been stashed", () => {
    expect(takeResumeDocument()).toBeNull();
  });

  it("round-trips a stashed document", () => {
    stashResumeDocument({
      documentId: 42,
      documentType: "mutual-nda",
      fields: { purpose: "Testing" },
    });

    expect(takeResumeDocument()).toEqual({
      documentId: 42,
      documentType: "mutual-nda",
      fields: { purpose: "Testing" },
    });
  });

  it("is consumed on the first read", () => {
    stashResumeDocument({ documentId: 1, documentType: "dpa", fields: {} });

    takeResumeDocument();

    expect(takeResumeDocument()).toBeNull();
  });

  it("returns null for corrupted storage instead of throwing", () => {
    sessionStorage.setItem("prelegal:resume-document", "{not valid json");

    expect(takeResumeDocument()).toBeNull();
  });
});
