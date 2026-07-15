import { z } from "zod";

const partySchema = z.object({
  companyName: z.string().trim().min(1, "Company name is required"),
  signerName: z.string().trim().min(1, "Signer name is required"),
  signerTitle: z.string().trim().min(1, "Signer title is required"),
  noticeAddress: z.string().trim().min(1, "Notice address is required"),
});

const MAX_TERM_YEARS = 99;
const MIN_EFFECTIVE_DATE_YEAR = 1900;

const termYears = () => z.number().int().min(1).max(MAX_TERM_YEARS);

const mndaTermSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("expires"), years: termYears() }),
  z.object({ type: z.literal("until_terminated") }),
]);

const confidentialityTermSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("years"), years: termYears() }),
  z.object({ type: z.literal("perpetuity") }),
]);

export const ndaFormSchema = z.object({
  partyOne: partySchema,
  partyTwo: partySchema,
  purpose: z.string().trim().min(1, "Purpose is required"),
  effectiveDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Effective date must be in YYYY-MM-DD format")
    .refine(
      (date) => Number(date.slice(0, 4)) >= MIN_EFFECTIVE_DATE_YEAR,
      `Effective date year must be ${MIN_EFFECTIVE_DATE_YEAR} or later`
    ),
  mndaTerm: mndaTermSchema,
  confidentialityTerm: confidentialityTermSchema,
  governingLaw: z.string().trim().min(1, "Governing law is required"),
  jurisdiction: z.string().trim().min(1, "Jurisdiction is required"),
});

export type PartyInfo = z.infer<typeof partySchema>;
export type MndaTerm = z.infer<typeof mndaTermSchema>;
export type ConfidentialityTerm = z.infer<typeof confidentialityTermSchema>;
export type NdaFormData = z.infer<typeof ndaFormSchema>;

export const emptyParty: PartyInfo = {
  companyName: "",
  signerName: "",
  signerTitle: "",
  noticeAddress: "",
};

export const defaultNdaFormData: NdaFormData = {
  partyOne: emptyParty,
  partyTwo: emptyParty,
  purpose: "Evaluating whether to enter into a business relationship with the other party.",
  effectiveDate: "",
  mndaTerm: { type: "expires", years: 1 },
  confidentialityTerm: { type: "years", years: 1 },
  governingLaw: "",
  jurisdiction: "",
};
