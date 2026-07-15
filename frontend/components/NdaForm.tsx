"use client";

import { useState } from "react";
import type { NdaFormData, PartyInfo } from "@/lib/nda-schema";

const MIN_TERM_YEARS = 1;
const MAX_TERM_YEARS = 99;

interface NdaFormProps {
  data: NdaFormData;
  onChange: (data: NdaFormData) => void;
}

/**
 * A number input that keeps its own draft text while the user is typing.
 * A plain controlled `<input value={years} onChange={... Number(e.target.value) || 1}>`
 * snaps back to 1 the instant the field is cleared, so backspacing "1" to
 * type "3" ends up appending onto the forced "1" (e.g. "13") instead of
 * replacing it. Deferring the fallback to blur lets the user clear and
 * retype freely.
 */
function YearsInput({
  id,
  years,
  disabled,
  onCommit,
}: {
  id: string;
  years: number;
  disabled: boolean;
  onCommit: (years: number) => void;
}) {
  const [text, setText] = useState(String(years));
  // Re-sync the draft text when `years` changes for a reason other than this
  // input's own onChange/onBlur (e.g. switching the radio option resets it).
  // Adjusting state during render (rather than in an effect) avoids an extra
  // commit; see https://react.dev/learn/you-might-not-need-an-effect.
  const [prevYears, setPrevYears] = useState(years);
  if (years !== prevYears) {
    setPrevYears(years);
    setText(String(years));
  }

  function clamp(value: number): number {
    return Math.min(MAX_TERM_YEARS, Math.max(MIN_TERM_YEARS, value));
  }

  return (
    <input
      id={id}
      type="number"
      min={MIN_TERM_YEARS}
      max={MAX_TERM_YEARS}
      className="w-16 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
      disabled={disabled}
      value={text}
      onChange={(e) => {
        const raw = e.target.value;
        setText(raw);
        const parsed = Number(raw);
        if (raw !== "" && Number.isInteger(parsed) && parsed >= MIN_TERM_YEARS && parsed <= MAX_TERM_YEARS) {
          onCommit(parsed);
        }
      }}
      onBlur={() => {
        const parsed = Number(text);
        const next = text === "" || !Number.isInteger(parsed) ? MIN_TERM_YEARS : clamp(parsed);
        setText(String(next));
        onCommit(next);
      }}
    />
  );
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
          min="1900-01-01"
          max="9999-12-31"
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
          <YearsInput
            id="mnda-term-years"
            years={data.mndaTerm.type === "expires" ? data.mndaTerm.years : 1}
            disabled={data.mndaTerm.type !== "expires"}
            onCommit={(years) => onChange({ ...data, mndaTerm: { type: "expires", years } })}
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
          <YearsInput
            id="confidentiality-term-years"
            years={data.confidentialityTerm.type === "years" ? data.confidentialityTerm.years : 1}
            disabled={data.confidentialityTerm.type !== "years"}
            onCommit={(years) =>
              onChange({ ...data, confidentialityTerm: { type: "years", years } })
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
