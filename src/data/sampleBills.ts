// Fake sample bills for the demo. Every patient and provider is fictional and
// every dollar amount is illustrative only — not a real price or Medicare rate.
// CPT / ICD-10-CM codes are real and limited to the ones verified for these
// scenarios.

import type { BillContext, EngineLineItem } from "@/lib/flagEngine";
import { SOURCES, type Source } from "@/lib/sources";

export type { Source };

export type LineItem = EngineLineItem & {
  description: string;
  /** ICD-10-CM diagnosis, if one is assigned. */
  dx?: { code: string; description: string };
};

export type SampleBill = {
  id: string;
  title: string;
  summary: string;
  patient: { name: string; note?: string };
  provider: { name: string; note?: string };
  facility?: { name: string; note?: string };
  /** Extra context about the visit, shown above the line items. */
  notes?: readonly string[];
  lineItems: readonly LineItem[];
  /** Facts the flag engine needs (network status, EOB, GFE, visit time). */
  context: BillContext;
  illustrative: true;
  disclaimerLabel: typeof SAMPLE_BILL_DISCLAIMER;
  sources: readonly Source[];
};

export const SAMPLE_BILL_DISCLAIMER =
  "Fake sample bill — fictional patient and provider; dollar amounts are illustrative only." as const;

const DX_J02_9 = { code: "J02.9", description: "Acute pharyngitis, unspecified" } as const;
const DX_S93_401A = {
  code: "S93.401A",
  description: "Sprain of unspecified ligament of right ankle, initial encounter",
} as const;

const DESC_99213 = "Established patient office visit, low medical decision making (20–29 min)";
const DESC_99215 = "Established patient office visit, high medical decision making (40–54 min)";

export const SAMPLE_BILLS: readonly SampleBill[] = [
  {
    id: "duplicate-charge",
    title: "Duplicate charge",
    summary: "Same office visit billed twice",
    patient: { name: "Jordan Fake-Ellis" },
    provider: { name: "Maple Hollow Family Practice (fictional)" },
    lineItems: [
      {
        id: "dup-1",
        date: "2026-03-04",
        code: "99213",
        description: DESC_99213,
        dx: DX_J02_9,
        units: 1,
        amountCents: 15000,
      },
      {
        id: "dup-2",
        date: "2026-03-04",
        code: "99213",
        description: DESC_99213,
        dx: DX_J02_9,
        units: 1,
        amountCents: 15000,
      },
    ],
    context: {},
    illustrative: true,
    disclaimerLabel: SAMPLE_BILL_DISCLAIMER,
    sources: [SOURCES.racDuplicate, SOURCES.amaEm, SOURCES.cmsEm, SOURCES.rvu, SOURCES.icd10],
  },
  {
    id: "upcoded-visit",
    title: "Upcoded office visit",
    summary: "High-level visit code for a short check",
    patient: { name: "Priya Notreal" },
    provider: { name: "Riverbend Urgent Clinic (fictional)" },
    notes: ["Visit summary: a 10-minute sore-throat check."],
    lineItems: [
      {
        id: "up-1",
        date: "2026-04-16",
        code: "99215",
        description: DESC_99215,
        dx: DX_J02_9,
        units: 1,
        amountCents: 31000,
      },
    ],
    context: { documentedVisitMinutes: 10 },
    illustrative: true,
    disclaimerLabel: SAMPLE_BILL_DISCLAIMER,
    sources: [SOURCES.amaEm, SOURCES.cmsEm, SOURCES.fraudAbuse, SOURCES.rvu, SOURCES.icd10],
  },
  {
    id: "unbundled-procedure",
    title: "Unbundled procedure",
    summary: "Two codes where one combined code may apply",
    patient: { name: "Dana Placeholder" },
    provider: { name: "Lakeview Surgical Associates (fictional)" },
    lineItems: [
      {
        id: "unb-1",
        date: "2026-05-21",
        code: "58260",
        description: "Vaginal hysterectomy, uterus 250 g or less",
        units: 1,
        amountCents: 400000,
      },
      {
        id: "unb-2",
        date: "2026-05-21",
        code: "58720",
        description: "Salpingo-oophorectomy",
        units: 1,
        amountCents: 150000,
      },
    ],
    context: {},
    illustrative: true,
    disclaimerLabel: SAMPLE_BILL_DISCLAIMER,
    sources: [SOURCES.ncciManual, SOURCES.ncciPtp, SOURCES.rvu],
  },
  {
    id: "surprise-balance-bill",
    title: "Surprise balance bill",
    summary: "Out-of-network surgeon at an in-network hospital",
    patient: { name: "Sam Example-Ruiz", note: "Has employer coverage" },
    provider: {
      name: "Dr. Imani Testcase (fictional)",
      note: "Out-of-network surgeon; no notice-and-consent waiver signed",
    },
    facility: { name: "Northgate General Hospital (fictional)", note: "In-network facility" },
    notes: [
      "The surgeon's bill asks for the full billed-minus-allowed difference instead of your in-network cost-sharing.",
    ],
    lineItems: [
      {
        id: "bal-1",
        date: "2026-06-09",
        code: "58262",
        description:
          "Vaginal hysterectomy, uterus 250 g or less, with removal of tube(s) and/or ovary(s)",
        units: 1,
        amountCents: 220000,
      },
    ],
    context: {
      coverage: "insured",
      providerNetwork: "out-of-network",
      facilityNetwork: "in-network",
      emergency: false,
      noticeAndConsentWaiverSigned: false,
      eobPatientBalanceCents: 30000,
    },
    illustrative: true,
    disclaimerLabel: SAMPLE_BILL_DISCLAIMER,
    sources: [SOURCES.nsaProtections, SOURCES.readEob, SOURCES.rvu],
  },
  {
    id: "over-good-faith-estimate",
    title: "Over the Good Faith Estimate",
    summary: "Self-pay bill $450 above the estimate (illustrative)",
    patient: { name: "Lee Imaginary", note: "Uninsured, self-pay" },
    provider: { name: "Cedar Point Orthopedics (fictional)" },
    lineItems: [
      {
        id: "gfe-1",
        date: "2026-07-14",
        code: "99213",
        description: DESC_99213,
        dx: DX_S93_401A,
        units: 1,
        amountCents: 65000,
      },
    ],
    context: { coverage: "self-pay", gfeTotalCents: 20000 },
    illustrative: true,
    disclaimerLabel: SAMPLE_BILL_DISCLAIMER,
    sources: [SOURCES.disputeBill, SOURCES.cfr149620, SOURCES.amaEm, SOURCES.rvu, SOURCES.icd10],
  },
  {
    id: "clean-bill",
    title: "Clean bill",
    summary: "Matches the EOB — nothing to flag",
    patient: { name: "Morgan Sampleton" },
    provider: { name: "Maple Hollow Family Practice (fictional)" },
    lineItems: [
      {
        id: "clean-1",
        date: "2026-08-27",
        code: "99213",
        description: DESC_99213,
        dx: DX_J02_9,
        units: 1,
        amountCents: 4000,
      },
    ],
    context: { coverage: "insured", eobPatientBalanceCents: 4000 },
    illustrative: true,
    disclaimerLabel: SAMPLE_BILL_DISCLAIMER,
    sources: [SOURCES.readEob, SOURCES.amaEm, SOURCES.rvu, SOURCES.icd10],
  },
];
