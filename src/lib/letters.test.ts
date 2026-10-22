import { SAMPLE_BILLS } from "@/data/sampleBills";
import { computeFlags, type BillContext, type Flag, type FlagType } from "./flagEngine";
import { formatDate } from "./format";
import {
  LETTER_FOR_FLAG,
  LETTER_LABEL,
  NOT_OFFICIAL_NOTE,
  buildLetters,
  letterTypesFor,
  type LetterType,
} from "./letters";

const byId = (id: string) => SAMPLE_BILLS.find((b) => b.id === id)!;
const allLetters = SAMPLE_BILLS.flatMap((bill) => buildLetters(bill).map((l) => [bill, l] as const));

function flag(type: FlagType): Flag {
  return {
    type,
    lineItemIds: [],
    message: "",
    explanation: "",
    source: { label: "", url: "" },
    relatedSources: [],
  };
}

describe("flag-to-letter mapping", () => {
  it.each<[FlagType, LetterType]>([
    ["duplicate", "billing-error-dispute"],
    ["upcoding", "billing-error-dispute"],
    ["unbundling", "billing-error-dispute"],
    ["balance-billing", "nsa-complaint"],
    ["gfe-overage", "gfe-dispute"],
  ])("%s -> %s", (flagType, letterType) => {
    expect(LETTER_FOR_FLAG[flagType]).toBe(letterType);
    expect(letterTypesFor([flag(flagType)], { coverage: "self-pay" })).toEqual([letterType]);
  });

  it("offers an insurer appeal as a secondary option for insured upcoding and balance billing", () => {
    const insured: BillContext = { coverage: "insured" };
    expect(letterTypesFor([flag("upcoding")], insured)).toEqual([
      "billing-error-dispute",
      "insurer-appeal",
    ]);
    expect(letterTypesFor([flag("balance-billing")], insured)).toEqual([
      "nsa-complaint",
      "insurer-appeal",
    ]);
    // An EOB patient balance means a plan processed the claim.
    expect(letterTypesFor([flag("balance-billing")], { eobPatientBalanceCents: 1 })).toContain(
      "insurer-appeal",
    );
  });

  it("does not offer an insurer appeal without insurance or for other flags", () => {
    expect(letterTypesFor([flag("upcoding")], {})).toEqual(["billing-error-dispute"]);
    for (const type of ["duplicate", "unbundling", "gfe-overage"] as const) {
      expect(letterTypesFor([flag(type)], { coverage: "insured" })).not.toContain(
        "insurer-appeal",
      );
    }
  });

  it("merges flags that share a letter into one letter", () => {
    expect(letterTypesFor([flag("duplicate"), flag("upcoding")], {})).toEqual([
      "billing-error-dispute",
    ]);
  });

  it("builds the expected letters for each sample", () => {
    const types = Object.fromEntries(
      SAMPLE_BILLS.map((b) => [b.id, buildLetters(b).map((l) => l.type)]),
    );
    expect(types).toEqual({
      "duplicate-charge": ["billing-error-dispute"],
      "upcoded-visit": ["billing-error-dispute"],
      "unbundled-procedure": ["billing-error-dispute"],
      "surprise-balance-bill": ["nsa-complaint", "insurer-appeal"],
      "over-good-faith-estimate": ["gfe-dispute"],
      "clean-bill": [],
    });
  });

  it("has no letters for the clean bill", () => {
    expect(buildLetters(byId("clean-bill"))).toEqual([]);
  });
});

describe("letters are filled from each sample's fake data", () => {
  it.each(allLetters.map(([bill, letter]) => [`${bill.id} / ${letter.type}`, bill, letter]))(
    "%s",
    (_name, bill, letter) => {
      expect(letter.text).toContain(bill.patient.name);
      expect(letter.text).toContain(bill.provider.name);
      const flagged = computeFlags(bill).flatMap((f) => f.lineItemIds);
      for (const item of bill.lineItems.filter((li) => flagged.includes(li.id))) {
        // The NSA complaint template has no code field, only the date of service.
        if (letter.type !== "nsa-complaint") expect(letter.text).toContain(item.code);
        expect(letter.text).toContain(formatDate(item.date));
      }
      expect(letter.text).toMatch(/\[[A-Z][A-Z /,.#+0-9-]*\]/);
    },
  );

  it("disputes the duplicate line against line 1", () => {
    const [letter] = buildLetters(byId("duplicate-charge"));
    expect(letter!.text).toContain("- 99213 ");
    expect(letter!.text).toContain("$150.00 (illustrative): duplicate of line 1");
    expect(letter!.text).toContain("Account #: [ACCOUNT NUMBER]");
    expect(letter!.text).toContain("[PROVIDER ADDRESS]");
  });

  it("disputes the upcoded visit level", () => {
    const [letter] = buildLetters(byId("upcoded-visit"));
    expect(letter!.text).toContain(
      "$310.00 (illustrative): billed at a higher level than the service documented",
    );
  });

  it("disputes only the column-two code 58720 for unbundling", () => {
    const [letter] = buildLetters(byId("unbundled-procedure"));
    expect(letter!.text).toContain(
      "- 58720 Salpingo-oophorectomy, $1,500.00 (illustrative): commonly bundled with 58260 per CMS guidance",
    );
    expect(letter!.text).not.toMatch(/^- 58260/m);
  });

  it("fills the NSA complaint from the EOB and network facts", () => {
    const [nsa, appeal] = buildLetters(byId("surprise-balance-bill"));
    expect(nsa!.text).toContain("Northgate General Hospital (fictional)");
    expect(nsa!.text).toContain(
      "I was billed $1,900.00 (illustrative) beyond my in-network cost sharing of $300.00 (illustrative).",
    );
    expect(nsa!.text).toContain("I did not sign a notice-and-consent form.");
    expect(nsa!.text).toContain("https://www.cms.gov/medical-bill-rights/help/submit-a-complaint");
    expect(appeal!.secondary).toBe(true);
    expect(appeal!.text).toContain("[DENIAL DATE]");
    expect(appeal!.text).toContain("[CLAIM NUMBER]");
    expect(appeal!.text).toContain("58262");
  });

  it("fills the GFE dispute with the estimate, bill, and difference", () => {
    const [letter] = buildLetters(byId("over-good-faith-estimate"));
    expect(letter!.text).toContain("$200.00 (illustrative)");
    expect(letter!.text).toContain("$650.00 (illustrative)");
    expect(letter!.text).toContain("difference $450.00 (illustrative)");
    expect(letter!.text).toContain("[BILL RECEIVED DATE]");
    expect(letter!.text).toContain("[STATE]");
  });
});

describe("every letter", () => {
  it.each(allLetters.map(([bill, letter]) => [`${bill.id} / ${letter.type}`, letter]))(
    "%s has the educational label and the not-official note",
    (_name, letter) => {
      expect(letter.label).toBe("Educational template, not legal advice");
      expect(letter.label).toBe(LETTER_LABEL);
      expect(letter.notOfficialNote).toBe(NOT_OFFICIAL_NOTE);
      expect(NOT_OFFICIAL_NOTE).toMatch(/not an official sample/);
      expect(letter.text).toContain(LETTER_LABEL);
      expect(letter.text).toContain(NOT_OFFICIAL_NOTE);
      // Starts and ends with the research's "drafted with an educational tool" line.
      const lines = letter.text.split("\n");
      expect(lines.at(-1)).toMatch(/^This (letter|summary|form) was drafted with an educational tool\./);
      expect(lines.slice(0, 3)).toContain(lines.at(-1));
      for (const source of letter.sources) expect(source.url).toMatch(/^https:\/\//);
    },
  );

  it("is deterministic and doesn't mutate the bill", () => {
    for (const bill of SAMPLE_BILLS) {
      const before = JSON.stringify(bill);
      expect(JSON.stringify(buildLetters(bill))).toBe(JSON.stringify(buildLetters(bill)));
      expect(JSON.stringify(bill)).toBe(before);
    }
  });
});

describe("deadlines", () => {
  const ALLOWED = [
    { citation: "29 CFR 2560.503-1(h)(3)(i)", phrase: "at least 180 days" },
    { citation: "45 CFR 147.136(d)(2)(i)", phrase: "within 4 months" },
    { citation: "45 CFR 149.620", phrase: "within 120 calendar days" },
  ];

  it("shows exactly the three allowed deadlines, each with its exact citation", () => {
    const shown = new Map(
      allLetters.flatMap(([, l]) => l.deadlines).map((d) => [d.citation, d] as const),
    );
    expect([...shown.keys()].sort()).toEqual(ALLOWED.map((a) => a.citation).sort());
    for (const { citation, phrase } of ALLOWED) {
      expect(shown.get(citation)!.text).toContain(phrase);
      expect(shown.get(citation)!.source.url).toMatch(/^https:\/\/www\.ecfr\.gov\//);
    }
    expect(shown.get("45 CFR 149.620")!.text).toContain("$400 or more");
  });

  it("puts the appeal and external-review deadlines on the insurer appeal", () => {
    const appeal = buildLetters(byId("surprise-balance-bill")).find(
      (l) => l.type === "insurer-appeal",
    )!;
    expect(appeal.deadlines.map((d) => d.citation)).toEqual([
      "29 CFR 2560.503-1(h)(3)(i)",
      "45 CFR 147.136(d)(2)(i)",
    ]);
  });

  it("puts the 120-day deadline on the GFE dispute", () => {
    const [gfe] = buildLetters(byId("over-good-faith-estimate"));
    expect(gfe!.deadlines.map((d) => d.citation)).toEqual(["45 CFR 149.620"]);
  });

  it("shows no deadline on billing-error disputes or NSA complaints", () => {
    const noDeadline = allLetters
      .map(([, l]) => l)
      .filter((l) => l.type === "billing-error-dispute" || l.type === "nsa-complaint");
    expect(noDeadline.length).toBeGreaterThan(0);
    for (const letter of noDeadline) {
      expect(letter.deadlines).toEqual([]);
      expect(letter.noDeadlineNote).toMatch(/No .*deadline was found/);
      expect(letter.text).not.toMatch(/\b\d+ (calendar )?(days|months)\b/);
    }
  });
});

describe("No Surprises complaint", () => {
  it("contains the Help Desk number 1-800-985-3059", () => {
    const nsa = buildLetters(byId("surprise-balance-bill")).find((l) => l.type === "nsa-complaint")!;
    expect(nsa.text).toContain("1-800-985-3059");
    expect(nsa.recipient).toContain("1-800-985-3059");
  });
});

// Same rule as the bill text: every line that mentions a dollar amount must be
// labeled illustrative or cite the rule it comes from.
const CITATION = /\b\d+\s+CFR\s+\d+(\.\d+)?\b|https?:\/\//i;

describe("dollar amounts in letter text", () => {
  it.each(allLetters.map(([bill, letter]) => [`${bill.id} / ${letter.type}`, letter]))(
    "%s: every $ text is labeled illustrative or cites a source",
    (_name, letter) => {
      const texts = [
        ...letter.text.split("\n"),
        letter.whenToUse,
        letter.recipient,
        letter.noDeadlineNote ?? "",
        ...letter.deadlines.map((d) => `${d.text} (${d.citation})`),
      ];
      for (const text of texts.filter((t) => t.includes("$"))) {
        const ok = /illustrative/i.test(text) || CITATION.test(text);
        expect(ok, `"${text}" needs "illustrative" or a citation`).toBe(true);
      }
    },
  );
});
