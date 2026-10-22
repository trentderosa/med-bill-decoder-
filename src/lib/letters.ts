// Dispute and appeal letter drafts for flagged bills. Pure functions only: no
// I/O, no clock, no randomness. Templates, routing, deadlines, contacts, and
// citations all come from the project letters research notes; anything the app
// can't know is left as a [PLACEHOLDER] for the patient to fill in.

import {
  KNOWN_BUNDLES,
  computeFlags,
  type BillContext,
  type EngineLineItem,
  type Flag,
  type FlagType,
} from "./flagEngine";
import { formatCents, formatDate } from "./format";
import { SOURCES, type Source } from "./sources";

export type LetterType =
  | "billing-error-dispute"
  | "nsa-complaint"
  | "gfe-dispute"
  | "insurer-appeal";

export type Deadline = {
  text: string;
  citation: string;
  source: Source;
};

export type Letter = {
  type: LetterType;
  title: string;
  recipient: string;
  /** When to use this letter, in plain English. */
  whenToUse: string;
  /** True for an option that only applies in some cases (e.g. an insurer appeal). */
  secondary: boolean;
  flagTypes: FlagType[];
  label: typeof LETTER_LABEL;
  notOfficialNote: typeof NOT_OFFICIAL_NOTE;
  /** Only the deadlines the research verified; empty when none was found. */
  deadlines: Deadline[];
  /** Shown instead of a deadline when no federal deadline was found. */
  noDeadlineNote?: string;
  sources: Source[];
  text: string;
};

export type LetterLineItem = EngineLineItem & { description?: string };

export type LetterBill = {
  id: string;
  patient: { name: string };
  provider: { name: string };
  facility?: { name: string };
  lineItems: readonly LetterLineItem[];
  context: BillContext;
  illustrative?: boolean;
};

export const LETTER_LABEL = "Educational template, not legal advice" as const;

export const NOT_OFFICIAL_NOTE =
  "This wording is not an official sample. No CMS, HHS, DOL EBSA, or state model letter was found or verified; it is built from the elements the cited rules require." as const;

export const NSA_HELP_DESK_PHONE = "1-800-985-3059";

export const LETTER_TITLES: Record<LetterType, string> = {
  "billing-error-dispute": "Billing-error dispute",
  "nsa-complaint": "No Surprises complaint",
  "gfe-dispute": "GFE dispute",
  "insurer-appeal": "Insurer appeal",
};

/** Primary letter for each engine flag type. */
export const LETTER_FOR_FLAG: Record<FlagType, LetterType> = {
  duplicate: "billing-error-dispute",
  upcoding: "billing-error-dispute",
  unbundling: "billing-error-dispute",
  "balance-billing": "nsa-complaint",
  "gfe-overage": "gfe-dispute",
};

/**
 * Flags where the research says an insurer appeal may also apply: upcoding "if
 * the insurer denied the claim or applied cost sharing based on it", and
 * balance billing "if the insurer processed the claim wrong". Offered only for
 * insured bills.
 */
const APPEAL_WHEN: Partial<Record<FlagType, string>> = {
  upcoding: "denied the claim or applied cost sharing based on the higher visit level",
  "balance-billing": "denied the claim or processed it wrong",
};

const APPEAL_EXPLANATION_EXAMPLE: Partial<Record<FlagType, string>> = {
  upcoding: "the visit was billed at a higher level than the service documented",
  "balance-billing": "protected under the No Surprises Act",
};

export const DEADLINES = {
  internalAppeal: {
    text:
      "Internal appeal: your plan must give you at least 180 days after you receive the denial " +
      "to appeal. Appeal by [DENIAL DATE + 180 days], or your plan's deadline if it gives you longer.",
    citation: "29 CFR 2560.503-1(h)(3)(i)",
    source: SOURCES.cfr2560503,
  },
  externalReview: {
    text:
      "External review: if the appeal is denied, you can request external review within 4 months " +
      "after receiving the denial or final internal denial.",
    citation: "45 CFR 147.136(d)(2)(i)",
    source: SOURCES.cfr147136,
  },
  gfeDispute: {
    text:
      "GFE dispute: when the bill is $400 or more over the Good Faith Estimate, file within 120 " +
      "calendar days of receiving the initial bill.",
    citation: "45 CFR 149.620",
    source: SOURCES.cfr149620,
  },
} as const satisfies Record<string, Deadline>;

const START_END = {
  letter: "This letter was drafted with an educational tool. It is not legal or medical advice.",
  summary: "This summary was drafted with an educational tool. It is not legal advice.",
  form: "This form was drafted with an educational tool. It is not legal advice.",
};

function money(cents: number, illustrative: boolean | undefined): string {
  return illustrative ? `${formatCents(cents)} (illustrative)` : formatCents(cents);
}

function lineNumber(bill: LetterBill, id: string): number {
  return bill.lineItems.findIndex((item) => item.id === id) + 1;
}

function serviceDates(items: readonly LetterLineItem[]): string {
  const dates = [...new Set(items.map((item) => item.date))].sort();
  return dates.length ? dates.map(formatDate).join(", ") : "[DATE OF SERVICE]";
}

function lineLabel(item: LetterLineItem): string {
  return `${item.code} ${item.description ?? "[DESCRIPTION]"}`;
}

function isInsured(context: BillContext): boolean {
  // An EOB patient balance only exists when a plan processed the claim.
  return (
    context.coverage === "insured" ||
    (context.coverage === undefined && context.eobPatientBalanceCents !== undefined)
  );
}

function wrap(kind: keyof typeof START_END, body: string[]): string {
  return [LETTER_LABEL + ".", NOT_OFFICIAL_NOTE, START_END[kind], "", ...body].join("\n");
}

function disputeReason(bill: LetterBill, flag: Flag, item: LetterLineItem): string {
  switch (flag.type) {
    case "duplicate": {
      const original = bill.lineItems.find(
        (other) =>
          other.code === item.code && other.date === item.date && other.units === item.units,
      );
      return `duplicate of line ${original ? lineNumber(bill, original.id) : "[LINE]"}`;
    }
    case "upcoding":
      return "billed at a higher level than the service documented";
    case "unbundling": {
      const bundle = KNOWN_BUNDLES.find((b) => b.columnTwo === item.code);
      return `commonly bundled with ${bundle?.columnOne ?? "[CODE]"} per CMS guidance`;
    }
    default:
      return "[REASON]";
  }
}

function billingErrorDispute(bill: LetterBill, flags: Flag[]): Letter {
  const disputed = flags.flatMap((flag) =>
    flag.lineItemIds.flatMap((id) => {
      const item = bill.lineItems.find((li) => li.id === id);
      return item ? [{ flag, item }] : [];
    }),
  );
  const patient = bill.patient.name;
  const text = wrap("letter", [
    "[DATE]",
    `${bill.provider.name}, Billing Office`,
    "[PROVIDER ADDRESS]",
    "",
    `Re: Dispute of charges. Patient: ${patient}; Account #: [ACCOUNT NUMBER]; ` +
      `Date(s) of service: ${serviceDates(disputed.map((d) => d.item))}`,
    "",
    "I am writing to dispute the following charges on my statement dated [STATEMENT DATE]:",
    ...disputed.map(
      ({ flag, item }) =>
        `- ${lineLabel(item)}, ${money(item.amountCents, bill.illustrative)}: ` +
        disputeReason(bill, flag, item),
    ),
    "",
    "Please (1) send me a fully itemized bill with CPT/HCPCS codes for every line, (2) review " +
      "and correct these charges, (3) send a corrected claim to my insurer [INSURER NAME, " +
      "MEMBER ID] if applicable, and (4) put the disputed amount on hold, with no collections, " +
      "while you review it.",
    "",
    `Sincerely, ${patient}, [PHONE], [EMAIL]`,
    START_END.letter,
  ]);
  return {
    type: "billing-error-dispute",
    title: LETTER_TITLES["billing-error-dispute"],
    recipient: `${bill.provider.name} billing office`,
    whenToUse:
      "Send this to the provider's billing office to dispute the flagged lines and ask for an " +
      "itemized bill. If your insurer paid the claim, you can send a copy to the insurer too.",
    secondary: false,
    flagTypes: [...new Set(flags.map((f) => f.type))],
    label: LETTER_LABEL,
    notOfficialNote: NOT_OFFICIAL_NOTE,
    deadlines: [],
    noDeadlineNote:
      "No federal deadline was found for this letter. Use any deadline printed on the bill and " +
      "check your state's law.",
    sources: [...new Map(flags.map((f) => [f.source.url, f.source])).values()],
    text,
  };
}

function nsaComplaint(bill: LetterBill, flags: Flag[]): Letter {
  const ctx = bill.context;
  const total = bill.lineItems.reduce((sum, item) => sum + item.amountCents, 0);
  const eob = ctx.eobPatientBalanceCents;
  const situation =
    ctx.emergency === true
      ? "emergency care"
      : ctx.providerNetwork === "out-of-network" && ctx.facilityNetwork === "in-network"
        ? `out-of-network provider at in-network facility ${bill.facility?.name ?? "[FACILITY]"}`
        : "[emergency care / out-of-network provider at in-network facility / air ambulance]";
  const consent =
    ctx.noticeAndConsentWaiverSigned === true
      ? "I did"
      : ctx.noticeAndConsentWaiverSigned === false
        ? "I did not"
        : "[I did / did not]";
  const billed =
    eob !== undefined
      ? `I was billed ${money(total - eob, bill.illustrative)} beyond my in-network cost sharing ` +
        `of ${money(eob, bill.illustrative)}.`
      : "I was billed $[BALANCE AMOUNT] beyond my in-network cost sharing of " +
        "$[EOB PATIENT RESPONSIBILITY].";
  const text = wrap("summary", [
    `Patient: ${bill.patient.name}   Insurer: [INSURER NAME], Member ID [MEMBER ID]`,
    `Provider/facility: ${bill.provider.name}, [PROVIDER ADDRESS]   ` +
      `Date of service: ${serviceDates(bill.lineItems)}`,
    `Situation: ${situation}`,
    billed,
    `${consent} sign a notice-and-consent form.`,
    "Attachments: bill, EOB, insurance card, [OTHER].",
    `Contact No Surprises Help Desk: ${NSA_HELP_DESK_PHONE} or ${SOURCES.nsaComplaint.url}`,
    START_END.summary,
  ]);
  return {
    type: "nsa-complaint",
    title: LETTER_TITLES["nsa-complaint"],
    recipient: `No Surprises Help Desk (CMS): ${NSA_HELP_DESK_PHONE} or online`,
    whenToUse:
      `Use this summary to file a complaint online or by phone at ${NSA_HELP_DESK_PHONE}. Have ` +
      "the bill, a photo of your insurance card, and the EOB ready, plus any Good Faith " +
      "Estimate, signed notice-and-consent form, correspondence, or appeal decisions. You get a " +
      "confirmation number, and CMS contacts you within 60 days if it needs more information.",
    secondary: false,
    flagTypes: [...new Set(flags.map((f) => f.type))],
    label: LETTER_LABEL,
    notOfficialNote: NOT_OFFICIAL_NOTE,
    deadlines: [],
    noDeadlineNote: "No complaint deadline was found on the CMS complaint page.",
    sources: [SOURCES.nsaComplaint, SOURCES.nsaProtections],
    text,
  };
}

function gfeDispute(bill: LetterBill, flags: Flag[]): Letter {
  const total = bill.lineItems.reduce((sum, item) => sum + item.amountCents, 0);
  const gfe = bill.context.gfeTotalCents;
  const amounts =
    gfe !== undefined
      ? `Good faith estimate total for this provider: ${money(gfe, bill.illustrative)}; billed ` +
        `total: ${money(total, bill.illustrative)} (difference ` +
        `${money(total - gfe, bill.illustrative)}, at least $400 per 45 CFR 149.620)`
      : "Good faith estimate total for this provider: $[GFE AMOUNT]; billed total: " +
        "$[BILLED AMOUNT] (difference $[DIFF], at least $400 per 45 CFR 149.620)";
  const text = wrap("form", [
    "Patient-Provider Dispute Resolution: Initiation",
    `Patient: ${bill.patient.name}   Communication preference: [PORTAL / EMAIL / PAPER MAIL]`,
    `Provider/facility: ${bill.provider.name}, [EMAIL], [PHONE], [MAILING ADDRESS]`,
    "State where services were furnished: [STATE]",
    ...bill.lineItems.map(
      (item) => `Item/service disputed: ${lineLabel(item)}, date provided ${formatDate(item.date)}`,
    ),
    amounts,
    "Initial bill received: [BILL RECEIVED DATE]. Must be filed within 120 calendar days.",
    `Enclosed: copy of the bill; copy of the GFE. Administrative fee: $25 (per CMS, ${SOURCES.disputeBill.url}).`,
    START_END.form,
  ]);
  return {
    type: "gfe-dispute",
    title: LETTER_TITLES["gfe-dispute"],
    recipient: "HHS, through the CMS online form, or by mail or fax",
    whenToUse:
      "For uninsured or self-pay patients whose bill is at least $400 over the provider's Good " +
      "Faith Estimate (45 CFR 149.620). The fee is $25 (amount set by CMS) and non-refundable; " +
      "it is deducted from what you owe if you win (45 CFR 149.620(f)(1)(i), (g)). While the " +
      "dispute is pending, the provider can't send the bill to collections or threaten to, late " +
      "fees are suspended, and retaliation is not allowed.",
    secondary: false,
    flagTypes: [...new Set(flags.map((f) => f.type))],
    label: LETTER_LABEL,
    notOfficialNote: NOT_OFFICIAL_NOTE,
    deadlines: [DEADLINES.gfeDispute],
    sources: [SOURCES.cfr149620, SOURCES.disputeBill],
    text,
  };
}

function insurerAppeal(bill: LetterBill, flags: Flag[]): Letter {
  const first = flags[0]!;
  const items = bill.lineItems.filter((item) =>
    flags.some((flag) => flag.lineItemIds.includes(item.id)),
  );
  const services = items.map(lineLabel).join("; ") || "[SERVICE]";
  const example = APPEAL_EXPLANATION_EXAMPLE[first.type] ?? "covered under plan section X";
  const text = wrap("letter", [
    "[DATE]",
    "[PLAN/INSURER APPEALS ADDRESS FROM DENIAL NOTICE]",
    "",
    `Re: Request for internal appeal. Member: ${bill.patient.name}; Member ID: [MEMBER ID]; ` +
      `Claim #: [CLAIM NUMBER]; Date of service: ${serviceDates(items)}; ` +
      `Provider: ${bill.provider.name}`,
    "",
    `I appeal the adverse benefit determination dated [DENIAL DATE], which denied ${services} ` +
      'for this reason: "[DENIAL REASON/CODE]." I believe the decision is wrong because ' +
      `[EXPLANATION, e.g., ${example}].`,
    "",
    "Please also send me, free of charge, the claim file and the diagnosis and treatment codes " +
      "with their meanings. Enclosed: [LIST OF DOCUMENTS].",
    "[IF URGENT: My provider has determined this is urgent care; I request an expedited appeal.]",
    "",
    `Sincerely, ${bill.patient.name}`,
    START_END.letter,
  ]);
  return {
    type: "insurer-appeal",
    title: LETTER_TITLES["insurer-appeal"],
    recipient: "Your health plan, at the appeals address on the denial notice or EOB",
    whenToUse:
      `Secondary option. Use this only if your insurer ${APPEAL_WHEN[first.type]}. Follow the ` +
      "appeal instructions on the denial notice. You can ask to review the claim file and " +
      "present evidence, and ask for the diagnosis and treatment codes (that request doesn't " +
      "count as an appeal). If you're in ongoing treatment, coverage continues while the appeal " +
      "is pending.",
    secondary: true,
    flagTypes: [...new Set(flags.map((f) => f.type))],
    label: LETTER_LABEL,
    notOfficialNote: NOT_OFFICIAL_NOTE,
    deadlines: [DEADLINES.internalAppeal, DEADLINES.externalReview],
    sources: [SOURCES.cfr2560503, SOURCES.cfr147136],
    text,
  };
}

const BUILDERS: Record<LetterType, (bill: LetterBill, flags: Flag[]) => Letter> = {
  "billing-error-dispute": billingErrorDispute,
  "nsa-complaint": nsaComplaint,
  "gfe-dispute": gfeDispute,
  "insurer-appeal": insurerAppeal,
};

/** Letter types for a set of flags: primary letters first, then secondary options. */
export function letterTypesFor(flags: readonly Flag[], context: BillContext): LetterType[] {
  const primary = flags.map((flag) => LETTER_FOR_FLAG[flag.type]);
  const appeal =
    isInsured(context) && flags.some((flag) => APPEAL_WHEN[flag.type])
      ? (["insurer-appeal"] as const)
      : [];
  return [...new Set([...primary, ...appeal])];
}

export function buildLetters(bill: LetterBill, flags: Flag[] = computeFlags(bill)): Letter[] {
  return letterTypesFor(flags, bill.context).map((type) => {
    const related =
      type === "insurer-appeal"
        ? flags.filter((flag) => APPEAL_WHEN[flag.type])
        : flags.filter((flag) => LETTER_FOR_FLAG[flag.type] === type);
    return BUILDERS[type](bill, related);
  });
}

export function letterFileName(bill: Pick<LetterBill, "id">, letter: Pick<Letter, "type">) {
  return `${letter.type}-${bill.id}.txt`;
}
