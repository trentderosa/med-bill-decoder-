import { computeFlags, estimateOwed } from "@/lib/flagEngine";
import { explainCode, explainDx } from "@/lib/plainEnglish";
import { SAMPLE_BILL_DISCLAIMER, SAMPLE_BILLS } from "./sampleBills";

const FAKE_PATIENTS = [
  "Jordan Fake-Ellis",
  "Priya Notreal",
  "Dana Placeholder",
  "Sam Example-Ruiz",
  "Lee Imaginary",
  "Morgan Sampleton",
];

const FAKE_PROVIDERS = [
  "Maple Hollow Family Practice (fictional)",
  "Riverbend Urgent Clinic (fictional)",
  "Lakeview Surgical Associates (fictional)",
  "Northgate General Hospital (fictional)",
  "Dr. Imani Testcase (fictional)",
  "Cedar Point Orthopedics (fictional)",
];

const ALLOWED_CODES = new Set(["99213", "99215", "58260", "58720", "58262", "J02.9", "S93.401A"]);

describe("SAMPLE_BILLS data", () => {
  it("has the six scenarios", () => {
    expect(SAMPLE_BILLS).toHaveLength(6);
    expect(new Set(SAMPLE_BILLS.map((b) => b.id)).size).toBe(6);
  });

  it.each(SAMPLE_BILLS.map((b) => [b.id, b] as const))(
    "%s is illustrative, labeled, and uses only fake names",
    (_id, bill) => {
      expect(bill.illustrative).toBe(true);
      expect(bill.disclaimerLabel).toBe(SAMPLE_BILL_DISCLAIMER);
      expect(SAMPLE_BILL_DISCLAIMER).toBe(
        "Fake sample bill — fictional patient and provider; dollar amounts are illustrative only.",
      );
      expect(FAKE_PATIENTS).toContain(bill.patient.name);
      expect(FAKE_PROVIDERS).toContain(bill.provider.name);
      if (bill.facility) expect(FAKE_PROVIDERS).toContain(bill.facility.name);
      expect(bill.sources.length).toBeGreaterThan(0);
      for (const source of bill.sources) expect(source.url).toMatch(/^https:\/\//);
    },
  );

  it("uses only the verified codes", () => {
    for (const bill of SAMPLE_BILLS) {
      for (const item of bill.lineItems) {
        expect(ALLOWED_CODES).toContain(item.code);
        if (item.dx) expect(ALLOWED_CODES).toContain(item.dx.code);
        expect(Number.isInteger(item.amountCents)).toBe(true);
      }
    }
  });

  it("encodes the scenario amounts and context", () => {
    const byId = Object.fromEntries(SAMPLE_BILLS.map((b) => [b.id, b]));
    const total = (id: string) =>
      byId[id]!.lineItems.reduce((sum, item) => sum + item.amountCents, 0);

    expect(byId["unbundled-procedure"]!.lineItems.every((i) => i.dx === undefined)).toBe(true);
    expect(total("surprise-balance-bill")).toBe(220000);
    expect(byId["surprise-balance-bill"]!.context).toMatchObject({
      providerNetwork: "out-of-network",
      facilityNetwork: "in-network",
      emergency: false,
      noticeAndConsentWaiverSigned: false,
    });
    expect(total("over-good-faith-estimate")).toBe(65000);
    expect(byId["over-good-faith-estimate"]!.context.gfeTotalCents).toBe(20000);
    expect(byId["upcoded-visit"]!.context.documentedVisitMinutes).toBe(10);
    expect(total("clean-bill")).toBe(4000);
    expect(byId["clean-bill"]!.context.eobPatientBalanceCents).toBe(4000);
    for (const bill of SAMPLE_BILLS) {
      for (const item of bill.lineItems) expect(item).not.toHaveProperty("expectedFlag");
    }
  });
});

// Every user-facing text that mentions a dollar amount must either be labeled
// illustrative (made-up demo figure) or cite the real rule it comes from
// (e.g. the $25 PPDR fee in 45 CFR 149.620).
const CITATION = /\b\d+\s+CFR\s+\d+(\.\d+)?\b|https?:\/\//i;

describe("dollar amounts in card, summary, flag, and estimate text", () => {
  it.each(SAMPLE_BILLS.map((b) => [b.title, b] as const))(
    "%s: every $ text is labeled illustrative or cites a source",
    (_title, bill) => {
      const texts = [
        bill.title,
        bill.summary,
        ...(bill.notes ?? []),
        ...bill.lineItems.flatMap((li) => [
          explainCode(li.code, li.description),
          ...(li.dx ? [explainDx(li.dx.code, li.dx.description)] : []),
        ]),
        ...computeFlags(bill).flatMap((flag) => [flag.message, flag.explanation]),
        ...estimateOwed(bill).steps,
      ];
      for (const text of texts.filter((t) => t.includes("$"))) {
        const ok = /illustrative/i.test(text) || CITATION.test(text);
        expect(ok, `"${text}" needs "illustrative" or a citation`).toBe(true);
      }
    },
  );
});
