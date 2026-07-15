import { render, screen } from "@testing-library/react";
import { NdaDocument } from "@/components/NdaDocument";
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
  effectiveDate: "2026-07-14",
  governingLaw: "Delaware",
  jurisdiction: "New Castle, DE",
};

describe("NdaDocument", () => {
  it("renders the document title and cover page fields", () => {
    render(<NdaDocument data={sampleData} />);

    expect(screen.getByRole("heading", { name: "Mutual Non-Disclosure Agreement" })).toBeInTheDocument();
    expect(screen.getByText("July 14, 2026")).toBeInTheDocument();
    expect(screen.getByText("Delaware")).toBeInTheDocument();
    expect(screen.getByText("New Castle, DE")).toBeInTheDocument();
  });

  it("renders both parties' details in the signature table", () => {
    render(<NdaDocument data={sampleData} />);

    expect(screen.getByText("Acme Inc")).toBeInTheDocument();
    expect(screen.getByText("Widgets LLC")).toBeInTheDocument();
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("John Roe")).toBeInTheDocument();
  });

  it("renders all 11 standard-terms clauses", () => {
    render(<NdaDocument data={sampleData} />);

    expect(screen.getByText(/1\. Introduction\./)).toBeInTheDocument();
    expect(screen.getByText(/11\. General\./)).toBeInTheDocument();
  });
});
