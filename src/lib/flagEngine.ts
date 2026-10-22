// Deterministic, rule-based bill checks. Pure functions only: no I/O, no
// clock, no randomness. Every rule, code, threshold, and source here comes from
// the project research notes (CMS / AMA / eCFR); nothing is a real price.

import { formatCents, formatDate } from "./format";
import { SOURCES, type Source } from "./sources";

export type FlagType = "duplicate" | "upcoding" | "unbundling" | "balance-billing" | "gfe-overage";

export type Flag = {
  type: FlagType;
  lineItemIds: string[];
  message: string;
  explanation: string;
  source: Source;
  relatedSources: Source[];
};

export type NetworkStatus = "in-network" | "out-of-network";

export type BillContext = {
  coverage?: "insured" | "self-pay";
  providerNetwork?: NetworkStatus;
  facilityNetwork?: NetworkStatus;
  emergency?: boolean;
  noticeAndConsentWaiverSigned?: boolean;
  /** "What You Owe / Patient Balance" from the EOB, in cents. */
  eobPatientBalanceCents?: number;
  /** Good Faith Estimate total from the same provider or facility, in cents. */
  gfeTotalCents?: number;
  /** Total visit time recorded in the visit summary, in minutes. */
  documentedVisitMinutes?: number;
};

export type EngineLineItem = {
  id: string;
  /** Date of service, ISO yyyy-mm-dd. */
  date: string;
  code: string;
  units: number;
  amountCents: number;
  /** Rendering provider when it differs from the bill's provider. */
  providerName?: string;
};

export type EngineBill = {
  provider: { name: string };
  lineItems: readonly EngineLineItem[];
  context: BillContext;
  /** When true, every dollar figure in the output is labeled illustrative. */
  illustrative?: boolean;
};

export type OwedEstimate = {
  /** null when the amount can't be estimated from known data. */
  amountCents: number | null;
  steps: string[];
};

export const ESTIMATE_LABEL = "Estimated amount you may actually owe (illustrative, educational)";

export const ADVICE_NOTE = "Educational, not legal or medical advice.";

/** AMA office-visit time ranges, limited to the levels stated in the research. */
export const EM_TIME_RANGES: Readonly<Record<string, { min: number; max: number }>> = {
  "99212": { min: 10, max: 19 },
  "99213": { min: 20, max: 29 },
  "99215": { min: 40, max: 54 },
};

/** Code pairs CMS NCCI guidance says to report as one comprehensive code. */
export const KNOWN_BUNDLES: readonly {
  codes: readonly [string, string];
  comprehensive: string;
}[] = [{ codes: ["58260", "58720"], comprehensive: "58262" }];

/** 45 CFR 149.620: bill at least $400 over the GFE. */
export const PPDR_THRESHOLD_CENTS = 40000;

/** No Surprises Act effective date (CMS key protections). */
const NSA_EFFECTIVE_DATE = "2022-01-01";

function money(cents: number, illustrative: boolean | undefined): string {
  return illustrative ? `${formatCents(cents)} (illustrative)` : formatCents(cents);
}

export function billTotal(bill: Pick<EngineBill, "lineItems">): number {
  return bill.lineItems.reduce((sum, item) => sum + item.amountCents, 0);
}

function lineNumber(bill: EngineBill, id: string): number {
  return bill.lineItems.findIndex((item) => item.id === id) + 1;
}

function duplicateFlags(bill: EngineBill): Flag[] {
  const groups = new Map<string, EngineLineItem[]>();
  for (const item of bill.lineItems) {
    const provider = item.providerName ?? bill.provider.name;
    const key = JSON.stringify([item.code, item.date, item.units, provider]);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  const flags: Flag[] = [];
  for (const [first, ...repeats] of groups.values()) {
    if (!first || repeats.length === 0) continue;
    flags.push({
      type: "duplicate",
      lineItemIds: repeats.map((item) => item.id),
      message: "Possible duplicate. Ask the provider for an itemized bill.",
      explanation:
        `Code ${first.code} appears ${repeats.length + 1} times on ${formatDate(first.date)} ` +
        `with the same units and provider (line ${lineNumber(bill, first.id)} and line ` +
        `${repeats.map((item) => lineNumber(bill, item.id)).join(", ")}). CMS describes an exact ` +
        "duplicate as the same patient, code, date of service, and provider billed more than " +
        "once. It may be a billing mistake, or there may be a reason; an itemized bill shows which.",
      source: SOURCES.racDuplicate,
      relatedSources: [],
    });
  }
  return flags;
}

function upcodingFlags(bill: EngineBill): Flag[] {
  const minutes = bill.context.documentedVisitMinutes;
  if (minutes === undefined) return [];
  const flags: Flag[] = [];
  for (const item of bill.lineItems) {
    const billed = EM_TIME_RANGES[item.code];
    if (!billed || minutes >= billed.min) continue;
    const fits = Object.entries(EM_TIME_RANGES)
      .filter(([, r]) => minutes >= r.min && minutes <= r.max)
      .map(([code, r]) => `${code} (${r.min}–${r.max} min)`);
    const fitText = fits.length
      ? `fits the range for ${fits.join(" or ")}`
      : `is below the ${billed.min}–${billed.max} minute range for ${item.code}`;
    flags.push({
      type: "upcoding",
      lineItemIds: [item.id],
      message: "Visit level may be higher than the time described. This is a heuristic, not proof.",
      explanation:
        `The bill lists ${item.code}, which the AMA describes as ${billed.min}–${billed.max} ` +
        `minutes. The visit summary documents ${minutes} minutes, which ${fitText}. ` +
        "A visit level can also be based on the complexity of medical decision making, so this " +
        "may be correct. Ask the provider how the level was chosen.",
      source: SOURCES.amaEm,
      relatedSources: [SOURCES.cmsEm, SOURCES.fraudAbuse],
    });
  }
  return flags;
}

function unbundlingFlags(bill: EngineBill): Flag[] {
  const flags: Flag[] = [];
  for (const bundle of KNOWN_BUNDLES) {
    const [codeA, codeB] = bundle.codes;
    for (const a of bill.lineItems.filter((item) => item.code === codeA)) {
      const b = bill.lineItems.find((item) => item.code === codeB && item.date === a.date);
      if (!b) continue;
      flags.push({
        type: "unbundling",
        lineItemIds: [a.id, b.id],
        message: `These codes are commonly bundled per CMS guidance and may need to be billed as one combined code (${bundle.comprehensive}).`,
        explanation:
          `${codeA} and ${codeB} were billed on the same date (${formatDate(a.date)}). The CMS ` +
          `NCCI Policy Manual, Chapter 1, says to report the single comprehensive code ` +
          `${bundle.comprehensive} instead of these two codes. NCCI is a Medicare program, so ` +
          "other payers may use different edits, and a modifier on the line can sometimes be an " +
          "allowed exception.",
        source: SOURCES.ncciManual,
        relatedSources: [SOURCES.ncciPtp],
      });
    }
  }
  return flags;
}

function balanceBillingFlags(bill: EngineBill): Flag[] {
  const ctx = bill.context;
  const eob = ctx.eobPatientBalanceCents;
  const total = billTotal(bill);
  const applies =
    ctx.providerNetwork === "out-of-network" &&
    ctx.facilityNetwork === "in-network" &&
    ctx.emergency === false &&
    ctx.noticeAndConsentWaiverSigned === false &&
    eob !== undefined &&
    total > eob &&
    bill.lineItems.length > 0 &&
    bill.lineItems.every((item) => item.date >= NSA_EFFECTIVE_DATE);
  if (!applies) return [];
  return [
    {
      type: "balance-billing",
      lineItemIds: bill.lineItems.map((item) => item.id),
      message: "Bill is higher than your EOB patient balance. Possible No Surprises Act issue.",
      explanation:
        `The bill total is ${money(total, bill.illustrative)}, but your EOB patient balance is ` +
        `${money(eob, bill.illustrative)}. The provider is out of network, the facility is in ` +
        "network, the care was not an emergency, and no notice-and-consent waiver was signed. " +
        "The No Surprises Act bars balance billing for this kind of care, and CMS says your bill " +
        "shouldn't be higher than the EOB patient balance. Talk to the provider and your plan.",
      source: SOURCES.nsaProtections,
      relatedSources: [SOURCES.readEob],
    },
  ];
}

function gfeFlags(bill: EngineBill): Flag[] {
  const gfe = bill.context.gfeTotalCents;
  if (bill.context.coverage !== "self-pay" || gfe === undefined) return [];
  const total = billTotal(bill);
  const over = total - gfe;
  if (over < PPDR_THRESHOLD_CENTS) return [];
  return [
    {
      type: "gfe-overage",
      lineItemIds: bill.lineItems.map((item) => item.id),
      message:
        "You may be eligible to dispute this bill. File within 120 days of the initial bill; the fee is $25 (45 CFR 149.620).",
      explanation:
        `You are self-pay, and the bill total of ${money(total, bill.illustrative)} is ` +
        `${money(over, bill.illustrative)} over the Good Faith Estimate of ` +
        `${money(gfe, bill.illustrative)}. Under 45 CFR 149.620, a bill at least $400 over the ` +
        "same provider's or facility's Good Faith Estimate may qualify for patient-provider " +
        "dispute resolution. You have 120 days from the initial bill to file, and the fee is $25.",
      source: SOURCES.cfr149620,
      relatedSources: [SOURCES.disputeBill],
    },
  ];
}

export function computeFlags(bill: EngineBill): Flag[] {
  return [
    ...duplicateFlags(bill),
    ...upcodingFlags(bill),
    ...unbundlingFlags(bill),
    ...balanceBillingFlags(bill),
    ...gfeFlags(bill),
  ];
}

export function estimateOwed(bill: EngineBill): OwedEstimate {
  const m = (cents: number) => money(cents, bill.illustrative);
  const flags = computeFlags(bill);
  const total = billTotal(bill);
  const steps = [`Start with the bill total: ${m(total)}.`];
  let amount = total;
  let estimable = true;

  for (const flag of flags.filter((f) => f.type === "duplicate")) {
    for (const id of flag.lineItemIds) {
      const item = bill.lineItems.find((li) => li.id === id);
      if (!item) continue;
      steps.push(
        `Remove the possible duplicate ${item.code} on line ${lineNumber(bill, id)}: ` +
          `${m(amount)} − ${m(item.amountCents)} = ${m(amount - item.amountCents)}.`,
      );
      amount -= item.amountCents;
    }
  }

  if (flags.some((f) => f.type === "upcoding")) {
    steps.push(
      "The visit level may be high, but no price for a lower level is known, so nothing is subtracted for it.",
    );
  }

  for (const flag of flags.filter((f) => f.type === "unbundling")) {
    const bundle = KNOWN_BUNDLES.find((b) =>
      flag.lineItemIds.every((id) =>
        b.codes.includes(bill.lineItems.find((li) => li.id === id)?.code ?? ""),
      ),
    );
    estimable = false;
    steps.push(
      `${m(amount)} − ${m(0)} = ${m(amount)}. Nothing is subtracted: these lines may belong under ` +
        `one combined code${bundle ? ` (${bundle.comprehensive})` : ""}, and no price for that ` +
        "code is known, so the amount you may owe can't be estimated.",
    );
  }

  const eob = bill.context.eobPatientBalanceCents;
  if (flags.some((f) => f.type === "balance-billing") && eob !== undefined && amount > eob) {
    steps.push(
      `No Surprises Act protections may apply, so cap the amount at your EOB patient balance: ` +
        `${m(amount)} → ${m(eob)}.`,
    );
    amount = eob;
  }

  const gfe = bill.context.gfeTotalCents;
  if (flags.some((f) => f.type === "gfe-overage") && gfe !== undefined && amount > gfe) {
    steps.push(
      `Use the Good Faith Estimate as the reference for patient-provider dispute resolution: ` +
        `${m(amount)} → ${m(gfe)}. The final amount is decided in that process, and filing ` +
        "costs $25 (45 CFR 149.620).",
    );
    amount = gfe;
  }

  if (flags.length === 0) steps.push("No issues were flagged, so the bill total stands.");
  steps.push(estimable ? `Estimate: ${m(amount)}.` : "Estimate: can't be estimated.");
  return { amountCents: estimable ? amount : null, steps };
}
