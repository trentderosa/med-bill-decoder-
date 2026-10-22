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

  it("encodes the scenario amounts and flags", () => {
    const byId = Object.fromEntries(SAMPLE_BILLS.map((b) => [b.id, b]));
    const total = (id: string) =>
      byId[id]!.lineItems.reduce((sum, item) => sum + item.amountCents, 0);

    expect(byId["unbundled-procedure"]!.lineItems.every((i) => i.dx === undefined)).toBe(true);
    expect(total("surprise-balance-bill")).toBe(220000);
    expect(byId["surprise-balance-bill"]!.comparison?.kind).toBe("eob-patient-balance");
    expect(total("over-good-faith-estimate")).toBe(65000);
    expect(byId["over-good-faith-estimate"]!.comparison?.amountCents).toBe(20000);
    expect(total("clean-bill")).toBe(4000);
    expect(byId["clean-bill"]!.comparison?.amountCents).toBe(4000);
    expect(byId["clean-bill"]!.lineItems.some((i) => i.expectedFlag)).toBe(false);

    const unbundling = SAMPLE_BILLS.flatMap((b) => b.lineItems).find(
      (i) => i.expectedFlag?.type === "unbundling",
    );
    expect(unbundling?.expectedFlag?.message).toContain("commonly bundled per CMS guidance");
  });
});
