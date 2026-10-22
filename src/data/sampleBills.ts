// Fake sample bills for the demo. Every patient and provider is fictional and
// every dollar amount is illustrative only — not a real price or Medicare rate.
// CPT / ICD-10-CM codes are real and limited to the ones verified for these
// scenarios.

export type FlagType =
  | "duplicate"
  | "upcoding"
  | "unbundling"
  | "balance-billing"
  | "gfe-overage";

export type ExpectedFlag = {
  type: FlagType;
  message: string;
};

export type LineItem = {
  id: string;
  /** Date of service, ISO yyyy-mm-dd. */
  date: string;
  /** CPT code. */
  code: string;
  description: string;
  /** ICD-10-CM diagnosis, if one is assigned. */
  dx?: { code: string; description: string };
  /** Illustrative amount in cents. */
  amountCents: number;
  expectedFlag?: ExpectedFlag;
};

export type BillComparison = {
  kind: "eob-patient-balance" | "good-faith-estimate";
  label: string;
  /** Illustrative amount in cents. */
  amountCents: number;
};

export type Source = {
  label: string;
  url: string;
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
  comparison?: BillComparison;
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

const DESC_99213 =
  "Established patient office visit, low medical decision making (20–29 min)";
const DESC_99215 =
  "Established patient office visit, high medical decision making (40–54 min)";

const SRC = {
  amaEm: {
    label: "AMA: E/M office visit changes (CPT 99211–99215)",
    url: "https://www.ama-assn.org/system/files/2020-04/e-m-office-visit-changes.pdf",
  },
  cmsEm: {
    label: "CMS MLN: Evaluation and Management Services guide",
    url: "https://www.cms.gov/files/document/mln006764-evaluation-management-services.pdf",
  },
  icd10: {
    label: "CDC/NCHS: ICD-10-CM FY2026 code files",
    url: "https://ftp.cdc.gov/pub/Health_Statistics/NCHS/Publications/ICD10CM/2026/",
  },
  rvu: {
    label: "CMS: PFS Relative Value File RVU26D (CPT status)",
    url: "https://www.cms.gov/medicare/payment/fee-schedules/physician/pfs-relative-value-files/rvu26d",
  },
  ncciManual: {
    label: "CMS: 2026 NCCI Policy Manual, Chapter 1",
    url: "https://www.cms.gov/files/document/01-chapter1-ncci-medicare-policy-manual-2026-final.pdf",
  },
  ncciPtp: {
    label: "CMS: NCCI procedure-to-procedure (PTP) edits",
    url: "https://www.cms.gov/medicare/coding-billing/national-correct-coding-initiative-ncci-edits/medicare-ncci-procedure-procedure-ptp-edits",
  },
  racDuplicate: {
    label: "CMS: RAC topic 0091 — exact duplicate claims",
    url: "https://www.cms.gov/research-statistics-data-and-systems/monitoring-programs/medicare-ffs-compliance-programs/recovery-audit-program/approved-rac-topics-items/0091-exact-duplicate-claims",
  },
  fraudAbuse: {
    label: "CMS MLN: Medicare fraud & abuse",
    url: "https://www.cms.gov/outreach-and-education/medicare-learning-network-mln/mlnproducts/downloads/fraud-abuse-mln4649244.pdf",
  },
  nsaProtections: {
    label: "CMS: No Surprises Act key protections",
    url: "https://www.cms.gov/files/document/nsa-keyprotections.pdf",
  },
  readEob: {
    label: "CMS: How to read your Explanation of Benefits",
    url: "https://www.cms.gov/initiatives/your-patient-rights/medical-bill-rights/get-help/guides-resources/read-explanation-benefits",
  },
  disputeBill: {
    label: "CMS: Dispute a medical bill",
    url: "https://www.cms.gov/medical-bill-rights/help/dispute-a-bill",
  },
  cfr149620: {
    label: "45 CFR 149.620 — patient-provider dispute resolution",
    url: "https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-B/part-149/subpart-G/section-149.620",
  },
} as const satisfies Record<string, Source>;

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
        amountCents: 15000,
      },
      {
        id: "dup-2",
        date: "2026-03-04",
        code: "99213",
        description: DESC_99213,
        dx: DX_J02_9,
        amountCents: 15000,
        expectedFlag: {
          type: "duplicate",
          message: "Possible duplicate. Ask the provider for an itemized bill.",
        },
      },
    ],
    illustrative: true,
    disclaimerLabel: SAMPLE_BILL_DISCLAIMER,
    sources: [SRC.racDuplicate, SRC.amaEm, SRC.cmsEm, SRC.rvu, SRC.icd10],
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
        amountCents: 31000,
        expectedFlag: {
          type: "upcoding",
          message:
            "Visit level looks high for the time or complexity described. This is a heuristic, not proof.",
        },
      },
    ],
    illustrative: true,
    disclaimerLabel: SAMPLE_BILL_DISCLAIMER,
    sources: [SRC.amaEm, SRC.cmsEm, SRC.fraudAbuse, SRC.rvu, SRC.icd10],
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
        amountCents: 400000,
      },
      {
        id: "unb-2",
        date: "2026-05-21",
        code: "58720",
        description: "Salpingo-oophorectomy",
        amountCents: 150000,
        expectedFlag: {
          type: "unbundling",
          message:
            "These codes are commonly bundled per CMS guidance and may need to be billed as one combined code (58262).",
        },
      },
    ],
    illustrative: true,
    disclaimerLabel: SAMPLE_BILL_DISCLAIMER,
    sources: [SRC.ncciManual, SRC.ncciPtp, SRC.rvu],
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
        amountCents: 220000,
        expectedFlag: {
          type: "balance-billing",
          message: "Bill is higher than your EOB patient balance. NSA protections may apply.",
        },
      },
    ],
    comparison: {
      kind: "eob-patient-balance",
      label: "EOB patient balance (in-network cost-sharing)",
      amountCents: 30000,
    },
    illustrative: true,
    disclaimerLabel: SAMPLE_BILL_DISCLAIMER,
    sources: [SRC.nsaProtections, SRC.readEob, SRC.rvu],
  },
  {
    id: "over-good-faith-estimate",
    title: "Over the Good Faith Estimate",
    summary: "Self-pay bill $450 above the estimate (illustrative)",
    patient: { name: "Lee Imaginary", note: "Uninsured, self-pay" },
    provider: { name: "Cedar Point Orthopedics (fictional)" },
    notes: [
      "Patient-provider dispute resolution: file within 120 days of receiving the bill. The fee is $25 (45 CFR 149.620).",
    ],
    lineItems: [
      {
        id: "gfe-1",
        date: "2026-07-14",
        code: "99213",
        description: DESC_99213,
        dx: DX_S93_401A,
        amountCents: 65000,
        expectedFlag: {
          type: "gfe-overage",
          message: "You may be eligible to dispute. Here's the deadline.",
        },
      },
    ],
    comparison: {
      kind: "good-faith-estimate",
      label: "Good Faith Estimate total",
      amountCents: 20000,
    },
    illustrative: true,
    disclaimerLabel: SAMPLE_BILL_DISCLAIMER,
    sources: [SRC.disputeBill, SRC.cfr149620, SRC.amaEm, SRC.rvu, SRC.icd10],
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
        amountCents: 4000,
      },
    ],
    comparison: {
      kind: "eob-patient-balance",
      label: "EOB patient balance",
      amountCents: 4000,
    },
    illustrative: true,
    disclaimerLabel: SAMPLE_BILL_DISCLAIMER,
    sources: [SRC.readEob, SRC.amaEm, SRC.rvu, SRC.icd10],
  },
];

export function billTotalCents(bill: SampleBill): number {
  return bill.lineItems.reduce((sum, item) => sum + item.amountCents, 0);
}

export function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );
}
