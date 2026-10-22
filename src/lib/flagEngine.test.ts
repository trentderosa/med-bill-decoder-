import { SAMPLE_BILLS } from "@/data/sampleBills";
import { EXPECTED_FLAGS } from "./__fixtures__/expectedFlags";
import {
  ESTIMATE_LABEL,
  computeFlags,
  estimateOwed,
  type BillContext,
  type EngineBill,
  type EngineLineItem,
} from "./flagEngine";
import { SOURCES } from "./sources";

function line(overrides: Partial<EngineLineItem> & { id: string }): EngineLineItem {
  return { date: "2026-03-04", code: "99213", units: 1, amountCents: 15000, ...overrides };
}

function bill(lineItems: EngineLineItem[], context: BillContext = {}): EngineBill {
  return { provider: { name: "Test Provider" }, lineItems, context, illustrative: true };
}

const NSA_CONTEXT: BillContext = {
  coverage: "insured",
  providerNetwork: "out-of-network",
  facilityNetwork: "in-network",
  emergency: false,
  noticeAndConsentWaiverSigned: false,
  eobPatientBalanceCents: 30000,
};

const types = (b: EngineBill) => computeFlags(b).map((f) => f.type);

describe("sample bills match the expected-flags fixture", () => {
  it("has a fixture entry for every sample", () => {
    expect(Object.keys(EXPECTED_FLAGS).sort()).toEqual(SAMPLE_BILLS.map((b) => b.id).sort());
  });

  it.each(SAMPLE_BILLS.map((b) => [b.id, b] as const))("%s", (id, sample) => {
    const actual = computeFlags(sample).map(({ type, lineItemIds }) => ({ type, lineItemIds }));
    expect(actual).toEqual(EXPECTED_FLAGS[id]);
  });

  it("flags nothing on the clean bill", () => {
    expect(computeFlags(SAMPLE_BILLS.find((b) => b.id === "clean-bill")!)).toEqual([]);
  });
});

describe("every flag", () => {
  it("has a message, explanation, and an https source", () => {
    for (const flag of SAMPLE_BILLS.flatMap(computeFlags)) {
      expect(flag.message.length).toBeGreaterThan(0);
      expect(flag.explanation.length).toBeGreaterThan(0);
      for (const source of [flag.source, ...flag.relatedSources]) {
        expect(source.url).toMatch(/^https:\/\//);
      }
    }
  });
});

describe("duplicate rule", () => {
  it("flags only the repeats and cites CMS RAC 0091", () => {
    const flags = computeFlags(bill([line({ id: "a" }), line({ id: "b" }), line({ id: "c" })]));
    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({ type: "duplicate", lineItemIds: ["b", "c"] });
    expect(flags[0]!.source).toEqual(SOURCES.racDuplicate);
  });

  it("does not flag a different date of service", () => {
    expect(types(bill([line({ id: "a" }), line({ id: "b", date: "2026-03-05" })]))).toEqual([]);
  });

  it("does not flag different units", () => {
    expect(types(bill([line({ id: "a" }), line({ id: "b", units: 2 })]))).toEqual([]);
  });

  it("does not flag a different code", () => {
    expect(types(bill([line({ id: "a" }), line({ id: "b", code: "99215" })]))).toEqual([]);
  });

  it("does not flag a different provider", () => {
    expect(
      types(bill([line({ id: "a" }), line({ id: "b", providerName: "Other Provider" })])),
    ).toEqual([]);
  });
});

describe("upcoding rule", () => {
  it("flags 99215 for a documented 10-minute visit, as a heuristic", () => {
    const flags = computeFlags(
      bill([line({ id: "a", code: "99215" })], { documentedVisitMinutes: 10 }),
    );
    expect(flags).toHaveLength(1);
    expect(flags[0]!.type).toBe("upcoding");
    expect(flags[0]!.message).toMatch(/may be/);
    expect(flags[0]!.message).toMatch(/heuristic, not proof/);
    expect(flags[0]!.explanation).toContain("99212 (10–19 min)");
  });

  it("does not flag when the documented time fits the billed level", () => {
    expect(types(bill([line({ id: "a", code: "99215" })], { documentedVisitMinutes: 45 }))).toEqual(
      [],
    );
    expect(types(bill([line({ id: "a", code: "99213" })], { documentedVisitMinutes: 20 }))).toEqual(
      [],
    );
  });

  it("does not flag without documented visit time", () => {
    expect(types(bill([line({ id: "a", code: "99215" })]))).toEqual([]);
  });

  it("ignores codes with no time range in the data", () => {
    expect(types(bill([line({ id: "a", code: "58260" })], { documentedVisitMinutes: 10 }))).toEqual(
      [],
    );
  });
});

describe("unbundling rule", () => {
  it("flags 58260 + 58720 on the same date as commonly bundled into 58262", () => {
    const flags = computeFlags(
      bill([line({ id: "a", code: "58260" }), line({ id: "b", code: "58720" })]),
    );
    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({ type: "unbundling", lineItemIds: ["b"] });
    expect(flags[0]!.message).toContain("commonly bundled per CMS guidance");
    expect(flags[0]!.message).toContain("58262");
    expect(flags[0]!.source).toEqual(SOURCES.ncciManual);
  });

  it("flags only the column-two code (58720), never the column-one code (58260)", () => {
    for (const order of [
      ["58260", "58720"],
      ["58720", "58260"],
    ]) {
      const items = order.map((code) => line({ id: code, code }));
      const flags = computeFlags(bill(items));
      expect(flags.flatMap((f) => f.lineItemIds)).toEqual(["58720"]);
      expect(flags[0]!.explanation).toContain("column-two code");
    }
  });

  it("does not flag the pair on different dates", () => {
    expect(
      types(
        bill([
          line({ id: "a", code: "58260" }),
          line({ id: "b", code: "58720", date: "2026-03-05" }),
        ]),
      ),
    ).toEqual([]);
  });

  it("does not flag either code alone", () => {
    expect(types(bill([line({ id: "a", code: "58260" })]))).toEqual([]);
    expect(types(bill([line({ id: "a", code: "58720" })]))).toEqual([]);
  });
});

describe("balance-billing (No Surprises Act) rule", () => {
  const nsaBill = (context: BillContext, amountCents = 220000) =>
    bill([line({ id: "a", code: "58262", date: "2026-06-09", amountCents })], context);

  it("flags an OON provider at an in-network facility with no waiver and bill > EOB", () => {
    const flags = computeFlags(nsaBill(NSA_CONTEXT));
    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({ type: "balance-billing", lineItemIds: ["a"] });
    expect(flags[0]!.message).toContain("Possible No Surprises Act issue");
    expect(flags[0]!.source).toEqual(SOURCES.nsaProtections);
    expect(flags[0]!.relatedSources).toContainEqual(SOURCES.readEob);
  });

  it("does not flag an in-network provider", () => {
    expect(types(nsaBill({ ...NSA_CONTEXT, providerNetwork: "in-network" }))).toEqual([]);
  });

  it("does not flag when a notice-and-consent waiver was signed", () => {
    expect(types(nsaBill({ ...NSA_CONTEXT, noticeAndConsentWaiverSigned: true }))).toEqual([]);
  });

  it("does not flag an out-of-network facility", () => {
    expect(types(nsaBill({ ...NSA_CONTEXT, facilityNetwork: "out-of-network" }))).toEqual([]);
  });

  it("flags emergency care when the bill is above the EOB patient balance", () => {
    const flags = computeFlags(nsaBill({ ...NSA_CONTEXT, emergency: true }));
    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({
      type: "balance-billing",
      lineItemIds: ["a"],
    });
    expect(flags[0]!.message).toContain("Possible No Surprises Act issue");
    expect(flags[0]!.explanation).toMatch(/emergency/);
    expect(flags[0]!.source).toEqual(SOURCES.nsaProtections);
  });

  it("flags emergency care regardless of network status or a signed waiver", () => {
    for (const providerNetwork of ["in-network", "out-of-network"] as const) {
      for (const facilityNetwork of ["in-network", "out-of-network", undefined] as const) {
        for (const noticeAndConsentWaiverSigned of [true, false, undefined]) {
          const context: BillContext = {
            emergency: true,
            providerNetwork,
            facilityNetwork,
            noticeAndConsentWaiverSigned,
            eobPatientBalanceCents: 30000,
          };
          expect(types(nsaBill(context))).toEqual(["balance-billing"]);
        }
      }
    }
  });

  it("does not flag emergency care at or below the EOB patient balance", () => {
    expect(types(nsaBill({ ...NSA_CONTEXT, emergency: true }, 30000))).toEqual([]);
  });

  it("does not flag emergency care without an EOB patient balance", () => {
    expect(
      types(
        nsaBill({
          ...NSA_CONTEXT,
          emergency: true,
          eobPatientBalanceCents: undefined,
        }),
      ),
    ).toEqual([]);
  });

  it("does not flag emergency care before the Act took effect (Jan 1, 2022)", () => {
    const early = bill(
      [
        line({
          id: "a",
          code: "58262",
          date: "2021-12-31",
          amountCents: 220000,
        }),
      ],
      { ...NSA_CONTEXT, emergency: true },
    );
    expect(types(early)).toEqual([]);
  });

  it("caps an emergency bill at the EOB patient balance", () => {
    const est = estimateOwed(nsaBill({ emergency: true, eobPatientBalanceCents: 30000 }));
    expect(est.amountCents).toBe(30000);
    expect(est.steps.join("\n")).toContain("No Surprises Act protections may apply");
  });

  it("never suggests emergency care is unprotected", () => {
    const contexts: BillContext[] = [
      NSA_CONTEXT,
      { ...NSA_CONTEXT, emergency: true },
      { ...NSA_CONTEXT, emergency: true, providerNetwork: "in-network" },
      { ...NSA_CONTEXT, emergency: true, noticeAndConsentWaiverSigned: true },
    ];
    const bills = [...SAMPLE_BILLS, ...contexts.map((c) => nsaBill(c))];
    const texts = bills.flatMap((b) => [
      ...computeFlags(b).flatMap((f) => [f.message, f.explanation]),
      ...estimateOwed(b).steps,
    ]);
    const sentences = texts.flatMap((t) => t.split(/(?<=\.)\s+/));
    const emergencySentences = sentences.filter((s) => /emergenc/i.test(s));
    expect(emergencySentences.length).toBeGreaterThan(0);
    for (const sentence of emergencySentences) {
      expect(sentence).not.toMatch(
        /unprotected|not (?:be )?(?:protected|covered)|isn't (?:protected|covered)|aren't (?:protected|covered)|doesn't (?:protect|cover|apply)|don't (?:protect|cover|apply)|excluded|exempt/i,
      );
    }
  });

  it("does not flag when the bill is at or below the EOB patient balance", () => {
    expect(types(nsaBill(NSA_CONTEXT, 30000))).toEqual([]);
  });

  it("does not flag without an EOB patient balance", () => {
    expect(types(nsaBill({ ...NSA_CONTEXT, eobPatientBalanceCents: undefined }))).toEqual([]);
  });

  it("does not flag care before the Act took effect (Jan 1, 2022)", () => {
    const early = bill(
      [line({ id: "a", code: "58262", date: "2021-12-31", amountCents: 220000 })],
      NSA_CONTEXT,
    );
    expect(types(early)).toEqual([]);
  });
});

describe("Good Faith Estimate rule", () => {
  const gfeBill = (overCents: number, coverage: BillContext["coverage"] = "self-pay") =>
    bill([line({ id: "a", amountCents: 20000 + overCents })], { coverage, gfeTotalCents: 20000 });

  it("flags a self-pay bill $400 or more over the GFE and cites 45 CFR 149.620", () => {
    for (const over of [40000, 45000]) {
      const flags = computeFlags(gfeBill(over));
      expect(flags).toHaveLength(1);
      expect(flags[0]).toMatchObject({ type: "gfe-overage", lineItemIds: ["a"] });
      expect(flags[0]!.source).toEqual(SOURCES.cfr149620);
      expect(flags[0]!.source.url).toMatch(/^https:\/\/www\.ecfr\.gov\//);
      expect(flags[0]!.message).toMatch(/120 days/);
      expect(flags[0]!.message).toMatch(/\$25/);
    }
  });

  it("does not flag a $399 overage", () => {
    expect(types(gfeBill(39900))).toEqual([]);
  });

  it("does not flag an insured patient", () => {
    expect(types(gfeBill(45000, "insured"))).toEqual([]);
  });
});

describe("determinism", () => {
  it("returns identical output across repeated runs and does not mutate input", () => {
    for (const sample of SAMPLE_BILLS) {
      const before = JSON.stringify(sample);
      const runs = Array.from({ length: 3 }, () =>
        JSON.stringify([computeFlags(sample), estimateOwed(sample)]),
      );
      expect(new Set(runs).size).toBe(1);
      expect(JSON.stringify(sample)).toBe(before);
    }
  });

  it("does not read the clock or random numbers", () => {
    const now = vi.spyOn(Date, "now");
    const random = vi.spyOn(Math, "random");
    for (const sample of SAMPLE_BILLS) {
      computeFlags(sample);
      estimateOwed(sample);
    }
    expect(now).not.toHaveBeenCalled();
    expect(random).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});

describe("estimateOwed", () => {
  const byId = (id: string) => SAMPLE_BILLS.find((b) => b.id === id)!;

  it("has the educational label", () => {
    expect(ESTIMATE_LABEL).toBe(
      "Estimated amount you may actually owe (illustrative, educational)",
    );
  });

  it("removes the duplicate line", () => {
    const est = estimateOwed(byId("duplicate-charge"));
    expect(est.amountCents).toBe(15000);
    expect(est.steps.join("\n")).toContain(
      "$300.00 (illustrative) − $150.00 (illustrative) = $150.00 (illustrative)",
    );
  });

  it("caps an NSA bill at the EOB patient balance", () => {
    const est = estimateOwed(byId("surprise-balance-bill"));
    expect(est.amountCents).toBe(30000);
    expect(est.steps.join("\n")).toContain("EOB patient balance");
  });

  it("can't estimate a GFE-dispute bill and shows the GFE only as a reference", () => {
    const est = estimateOwed(byId("over-good-faith-estimate"));
    expect(est.amountCents).toBeNull();
    const text = est.steps.join("\n");
    expect(text).toContain("For reference, the Good Faith Estimate was $200.00 (illustrative)");
    expect(text).toContain("Estimate: can't be estimated until the dispute is resolved.");
    expect(text).not.toMatch(/→ \$200\.00/);
    expect(text).not.toContain("Estimate: $200.00");
  });

  it("can't estimate an unbundled bill and invents no price for 58262", () => {
    const est = estimateOwed(byId("unbundled-procedure"));
    expect(est.amountCents).toBeNull();
    const text = est.steps.join("\n");
    expect(text).toContain(
      "$5,500.00 (illustrative) − $0.00 (illustrative) = $5,500.00 (illustrative)",
    );
    expect(text).toContain("58262");
    expect(text).toMatch(/can't be estimated/);
  });

  it("subtracts nothing for possible upcoding", () => {
    expect(estimateOwed(byId("upcoded-visit")).amountCents).toBe(31000);
  });

  it("leaves a clean bill at its total", () => {
    const est = estimateOwed(byId("clean-bill"));
    expect(est.amountCents).toBe(4000);
    expect(est.steps.join("\n")).toMatch(/No issues were flagged/);
  });

  it("omits the illustrative label when the bill isn't illustrative", () => {
    const real = { ...bill([line({ id: "a" })]), illustrative: false };
    expect(estimateOwed(real).steps.join("\n")).not.toMatch(/illustrative/);
  });
});
