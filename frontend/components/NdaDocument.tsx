import { buildNdaDocument, ATTRIBUTION } from "@/lib/nda-content";
import type { NdaFormData } from "@/lib/nda-schema";

export function NdaDocument({ data }: { data: NdaFormData }) {
  const doc = buildNdaDocument(data);

  return (
    <article className="prose prose-sm max-w-none dark:prose-invert">
      <h1 className="text-xl font-semibold">Mutual Non-Disclosure Agreement</h1>

      <section aria-label="Cover page" className="mb-8">
        <h2 className="text-lg font-semibold">Cover Page</h2>
        <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="font-medium">Purpose</dt>
          <dd>{doc.purpose || "—"}</dd>
          <dt className="font-medium">Effective Date</dt>
          <dd>{doc.effectiveDateDisplay}</dd>
          <dt className="font-medium">MNDA Term</dt>
          <dd>{doc.mndaTermDisplay}</dd>
          <dt className="font-medium">Term of Confidentiality</dt>
          <dd>{doc.confidentialityTermDisplay}</dd>
          <dt className="font-medium">Governing Law</dt>
          <dd>{doc.governingLaw || "—"}</dd>
          <dt className="font-medium">Jurisdiction</dt>
          <dd>{doc.jurisdiction || "—"}</dd>
        </dl>

        <table className="mt-4 w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border px-2 py-1 text-left" />
              {doc.parties.map((party) => (
                <th key={party.label} className="border px-2 py-1 text-left">
                  {party.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th className="border px-2 py-1 text-left font-medium">Company</th>
              {doc.parties.map((party) => (
                <td key={party.label} className="border px-2 py-1">
                  {party.companyName || "—"}
                </td>
              ))}
            </tr>
            <tr>
              <th className="border px-2 py-1 text-left font-medium">Print Name</th>
              {doc.parties.map((party) => (
                <td key={party.label} className="border px-2 py-1">
                  {party.signerName || "—"}
                </td>
              ))}
            </tr>
            <tr>
              <th className="border px-2 py-1 text-left font-medium">Title</th>
              {doc.parties.map((party) => (
                <td key={party.label} className="border px-2 py-1">
                  {party.signerTitle || "—"}
                </td>
              ))}
            </tr>
            <tr>
              <th className="border px-2 py-1 text-left font-medium">Notice Address</th>
              {doc.parties.map((party) => (
                <td key={party.label} className="border px-2 py-1">
                  {party.noticeAddress || "—"}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </section>

      <section aria-label="Standard terms">
        <h2 className="text-lg font-semibold">Standard Terms</h2>
        <ol className="list-none space-y-4 pl-0">
          {doc.clauses.map((clause) => (
            <li key={clause.number}>
              <p>
                <strong>
                  {clause.number}. {clause.title}.
                </strong>{" "}
                {clause.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <p className="mt-8 text-xs text-zinc-500 dark:text-zinc-400">{ATTRIBUTION}</p>
    </article>
  );
}
