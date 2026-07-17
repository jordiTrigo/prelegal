import { Fragment } from "react";
import {
  coverSummaryDisplayValue,
  partitionFields,
  PARTY_ROWS,
  type DocumentFields,
  type PartyInfo,
} from "@/lib/field-format";
import type { DocumentTypeDescriptor } from "@/lib/document-registry";

export function DocumentCoverSummary({
  descriptor,
  fields,
}: {
  descriptor: DocumentTypeDescriptor;
  fields: DocumentFields;
}) {
  const { partyFields, detailFields } = partitionFields(descriptor);

  return (
    <section aria-label="Cover summary" className="mb-8">
      <h2 className="text-lg font-semibold">Details</h2>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
        {detailFields.map((field) => (
          <Fragment key={field.id}>
            <dt className="font-medium">{field.label}</dt>
            <dd>{coverSummaryDisplayValue(field, fields)}</dd>
          </Fragment>
        ))}
      </dl>

      {partyFields.length > 0 && (
        <table className="mt-4 w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border px-2 py-1 text-left" scope="col">
                <span className="sr-only">Field</span>
              </th>
              {partyFields.map((field) => (
                <th key={field.id} className="border px-2 py-1 text-left" scope="col">
                  {field.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PARTY_ROWS.map(({ key, label }) => (
              <tr key={key}>
                <th className="border px-2 py-1 text-left font-medium">{label}</th>
                {partyFields.map((field) => {
                  const party = fields[field.id] as PartyInfo | undefined;
                  return (
                    <td key={field.id} className="border px-2 py-1">
                      {party?.[key] || "—"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
