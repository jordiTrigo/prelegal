"use client";

import type { NdaFormData, PartyInfo } from "@/lib/nda-schema";

interface NdaFormProps {
  data: NdaFormData;
  onChange: (data: NdaFormData) => void;
}

function PartyFields({
  legend,
  party,
  onChange,
}: {
  legend: string;
  party: PartyInfo;
  onChange: (party: PartyInfo) => void;
}) {
  const idPrefix = legend.toLowerCase().replace(/\s+/g, "-");

  return (
    <fieldset className="space-y-3 rounded-md border border-zinc-300 p-4 dark:border-zinc-700">
      <legend className="px-1 text-sm font-semibold">{legend}</legend>

      <label className="block text-sm" htmlFor={`${idPrefix}-company`}>
        Company name
        <input
          id={`${idPrefix}-company`}
          type="text"
          className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
          value={party.companyName}
          onChange={(e) => onChange({ ...party, companyName: e.target.value })}
        />
      </label>

      <label className="block text-sm" htmlFor={`${idPrefix}-signer-name`}>
        Signer name
        <input
          id={`${idPrefix}-signer-name`}
          type="text"
          className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
          value={party.signerName}
          onChange={(e) => onChange({ ...party, signerName: e.target.value })}
        />
      </label>

      <label className="block text-sm" htmlFor={`${idPrefix}-signer-title`}>
        Signer title
        <input
          id={`${idPrefix}-signer-title`}
          type="text"
          className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
          value={party.signerTitle}
          onChange={(e) => onChange({ ...party, signerTitle: e.target.value })}
        />
      </label>

      <label className="block text-sm" htmlFor={`${idPrefix}-notice-address`}>
        Notice address (email or postal)
        <input
          id={`${idPrefix}-notice-address`}
          type="text"
          className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
          value={party.noticeAddress}
          onChange={(e) => onChange({ ...party, noticeAddress: e.target.value })}
        />
      </label>
    </fieldset>
  );
}

export function NdaForm({ data, onChange }: NdaFormProps) {
  return (
    <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
      <div className="grid gap-4 sm:grid-cols-2">
        <PartyFields
          legend="Party 1"
          party={data.partyOne}
          onChange={(partyOne) => onChange({ ...data, partyOne })}
        />
        <PartyFields
          legend="Party 2"
          party={data.partyTwo}
          onChange={(partyTwo) => onChange({ ...data, partyTwo })}
        />
      </div>

      <label className="block text-sm" htmlFor="purpose">
        Purpose
        <textarea
          id="purpose"
          rows={2}
          className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
          value={data.purpose}
          onChange={(e) => onChange({ ...data, purpose: e.target.value })}
        />
      </label>

      <label className="block text-sm" htmlFor="effective-date">
        Effective date
        <input
          id="effective-date"
          type="date"
          className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
          value={data.effectiveDate}
          onChange={(e) => onChange({ ...data, effectiveDate: e.target.value })}
        />
      </label>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">MNDA term</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="mnda-term"
            checked={data.mndaTerm.type === "expires"}
            onChange={() => onChange({ ...data, mndaTerm: { type: "expires", years: 1 } })}
          />
          Expires
          <input
            type="number"
            min={1}
            className="w-16 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
            disabled={data.mndaTerm.type !== "expires"}
            value={data.mndaTerm.type === "expires" ? data.mndaTerm.years : 1}
            onChange={(e) =>
              onChange({
                ...data,
                mndaTerm: { type: "expires", years: Number(e.target.value) || 1 },
              })
            }
          />
          year(s) from Effective Date
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="mnda-term"
            checked={data.mndaTerm.type === "until_terminated"}
            onChange={() => onChange({ ...data, mndaTerm: { type: "until_terminated" } })}
          />
          Continues until terminated
        </label>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">Term of confidentiality</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="confidentiality-term"
            checked={data.confidentialityTerm.type === "years"}
            onChange={() =>
              onChange({ ...data, confidentialityTerm: { type: "years", years: 1 } })
            }
          />
          <input
            type="number"
            min={1}
            className="w-16 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
            disabled={data.confidentialityTerm.type !== "years"}
            value={data.confidentialityTerm.type === "years" ? data.confidentialityTerm.years : 1}
            onChange={(e) =>
              onChange({
                ...data,
                confidentialityTerm: { type: "years", years: Number(e.target.value) || 1 },
              })
            }
          />
          year(s) from Effective Date
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="confidentiality-term"
            checked={data.confidentialityTerm.type === "perpetuity"}
            onChange={() => onChange({ ...data, confidentialityTerm: { type: "perpetuity" } })}
          />
          In perpetuity
        </label>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm" htmlFor="governing-law">
          Governing law (state)
          <input
            id="governing-law"
            type="text"
            className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
            value={data.governingLaw}
            onChange={(e) => onChange({ ...data, governingLaw: e.target.value })}
          />
        </label>

        <label className="block text-sm" htmlFor="jurisdiction">
          Jurisdiction (city/county and state)
          <input
            id="jurisdiction"
            type="text"
            className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
            value={data.jurisdiction}
            onChange={(e) => onChange({ ...data, jurisdiction: e.target.value })}
          />
        </label>
      </div>
    </form>
  );
}
