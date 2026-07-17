import { parseTemplate, substituteFields, type ParsedRun, type RenderRun } from "@/lib/markdown-template";
import type { DocumentTypeDescriptor } from "@/lib/document-registry";

function text(runs: (ParsedRun | RenderRun)[]): string {
  return runs
    .map((run) => {
      if (run.kind === "text") return run.text;
      if (run.kind === "field") return "text" in run ? run.text : run.label;
      return text(run.runs);
    })
    .join("");
}

describe("parseTemplate", () => {
  it("parses a heading", () => {
    const blocks = parseTemplate("# Data Processing Agreement");
    expect(blocks).toEqual([
      { kind: "heading", depth: 0, runs: [{ kind: "text", text: "Data Processing Agreement" }] },
    ]);
  });

  it("parses top-level and nested ordered items by indentation depth", () => {
    const blocks = parseTemplate(
      [
        "1. Top level item",
        "    1. Nested item",
        "        a. Deeper nested item",
        "            i. Deepest nested item",
      ].join("\n")
    );

    expect(blocks.map((b) => [b.kind, b.depth, b.marker])).toEqual([
      ["item", 0, "1."],
      ["item", 1, "1."],
      ["item", 2, "a."],
      ["item", 3, "i."],
    ]);
  });

  it("skips blank lines", () => {
    const blocks = parseTemplate("# Title\n\n1. Item\n\n");
    expect(blocks).toHaveLength(2);
  });

  it("treats a non-heading, non-item line as a paragraph", () => {
    const blocks = parseTemplate("Just a plain paragraph.");
    expect(blocks[0].kind).toBe("paragraph");
  });

  it("parses inline bold text", () => {
    const blocks = parseTemplate("1. **Introduction**. Some body text.");
    expect(blocks[0].runs).toEqual([
      { kind: "bold", runs: [{ kind: "text", text: "Introduction" }] },
      { kind: "text", text: ". Some body text." },
    ]);
  });

  it("parses a field span into a field run carrying its label", () => {
    const blocks = parseTemplate(
      '1. Processing for the <span class="coverpage_link">Purpose</span> only.'
    );
    expect(blocks[0].runs).toContainEqual({ kind: "field", label: "Purpose" });
  });

  it("renders a header_2/header_3 span as bold, not a field", () => {
    const blocks = parseTemplate('1. <span class="header_2">Processing</span> details follow.');
    expect(blocks[0].runs[0]).toEqual({
      kind: "bold",
      runs: [{ kind: "text", text: "Processing" }],
    });
  });

  it("unwraps a bare anchor span to plain text", () => {
    const blocks = parseTemplate('1. See <span id="4.1">this term</span> above.');
    expect(text(blocks[0].runs as unknown as RenderRun[])).toContain("this term");
  });

  it("drops link markup but keeps the link text", () => {
    const blocks = parseTemplate("See [the standard](https://example.com/standard) for details.");
    expect(text(blocks[0].runs as unknown as RenderRun[])).toBe(
      "See the standard for details."
    );
  });

  it("resolves a field span nested inside bold text", () => {
    const blocks = parseTemplate(
      '1. **Liability caps apply to the <span class="keyterms_link">Agreement</span>.**'
    );
    const bold = blocks[0].runs[0];
    expect(bold.kind).toBe("bold");
    if (bold.kind === "bold") {
      expect(bold.runs).toContainEqual({ kind: "field", label: "Agreement" });
    }
  });

  it("parses real DPA content with depth-4 nesting and inline spans", () => {
    const dpaSnippet = [
      "3. <span class=\"header_2\">Restricted Transfers</span>",
      "",
      "    2. <span class=\"header_3\">Ex-EEA Transfers.</span>  Text here.",
      "",
      "        c. For each module, the following applies:",
      "",
      "            v. In Clause 17, governed by <span class=\"keyterms_link\">Governing Member State</span>;",
    ].join("\n");

    const blocks = parseTemplate(dpaSnippet);
    expect(blocks.map((b) => b.depth)).toEqual([0, 1, 2, 3]);
    expect(text(blocks[3].runs as unknown as RenderRun[])).toContain(
      "Governing Member State"
    );
  });
});

describe("substituteFields", () => {
  const descriptor: DocumentTypeDescriptor = {
    id: "dpa",
    catalogNames: ["Data Processing Agreement (DPA)"],
    fields: [
      { id: "customer", label: "Customer", type: "party", required: true },
      {
        id: "approvedSubprocessors",
        label: "Approved Subprocessors",
        type: "list",
        required: false,
      },
    ],
  };

  function fieldRun(runs: RenderRun[]): RenderRun | undefined {
    return runs.find((run) => run.kind === "field");
  }

  it("substitutes a matched party field with its company name", () => {
    const blocks = parseTemplate('<span class="keyterms_link">Customer</span> agrees.');
    const rendered = substituteFields(blocks, descriptor, {
      customer: { companyName: "Acme Inc" },
    });
    expect(fieldRun(rendered[0].runs)).toEqual({ kind: "field", text: "Acme Inc", filled: true });
  });

  it("shows a placeholder for an unfilled field", () => {
    const blocks = parseTemplate('<span class="keyterms_link">Customer</span> agrees.');
    const rendered = substituteFields(blocks, descriptor, {});
    expect(fieldRun(rendered[0].runs)).toEqual({
      kind: "field",
      text: "[Customer not set]",
      filled: false,
    });
  });

  it("joins list values with commas", () => {
    const blocks = parseTemplate(
      'See <span class="keyterms_link">Approved Subprocessors</span>.'
    );
    const rendered = substituteFields(blocks, descriptor, {
      approvedSubprocessors: ["Vendor A", "Vendor B"],
    });
    expect(fieldRun(rendered[0].runs)).toEqual({
      kind: "field",
      text: "Vendor A, Vendor B",
      filled: true,
    });
  });

  it("renders an unrecognized _link label as plain text instead of dropping it", () => {
    const blocks = parseTemplate('Per the <span class="keyterms_link">Agreement</span>.');
    const rendered = substituteFields(blocks, descriptor, {});
    expect(text(rendered[0].runs)).toBe("Per the Agreement.");
  });

  it("computes Mutual NDA's compound MNDA Term display", () => {
    const ndaDescriptor: DocumentTypeDescriptor = {
      id: "mutual-nda",
      catalogNames: ["Mutual NDA - Standard Terms"],
      fields: [{ id: "mndaTermType", label: "MNDA Term", type: "enum", required: true }],
    };
    const blocks = parseTemplate('Expires per the <span class="coverpage_link">MNDA Term</span>.');
    const rendered = substituteFields(blocks, ndaDescriptor, {
      mndaTermType: "expires",
      mndaTermYears: 2,
    });
    expect(fieldRun(rendered[0].runs)).toEqual({
      kind: "field",
      text: "Expires 2 year(s) from the Effective Date",
      filled: true,
    });
  });
});
