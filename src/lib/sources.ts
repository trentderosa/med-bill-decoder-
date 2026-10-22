// Every source cited by the sample bills and the flag engine. All URLs come
// from the project research notes; add nothing here that isn't sourced there.

export type Source = {
  label: string;
  url: string;
};

export const SOURCES = {
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
  cfr147136: {
    label: "45 CFR 147.136 — internal claims and appeals and external review",
    url: "https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-B/part-147/section-147.136",
  },
  cfr2560503: {
    label: "29 CFR 2560.503-1 — ERISA claims procedure",
    url: "https://www.ecfr.gov/current/title-29/subtitle-B/chapter-XXV/subchapter-F/part-2560/section-2560.503-1",
  },
  nsaComplaint: {
    label: "CMS: Submit a No Surprises complaint",
    url: "https://www.cms.gov/medical-bill-rights/help/submit-a-complaint",
  },
} as const satisfies Record<string, Source>;
