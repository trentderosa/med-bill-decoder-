import { SAMPLE_BILLS } from "@/data/sampleBills";
import { explainCode, explainDx } from "./plainEnglish";

describe("plain-English explanations", () => {
  it("covers every code and diagnosis in the sample bills", () => {
    for (const item of SAMPLE_BILLS.flatMap((b) => b.lineItems)) {
      expect(explainCode(item.code, "")).not.toBe("");
      if (item.dx) expect(explainDx(item.dx.code, "")).not.toBe("");
    }
  });

  it("falls back to the bill's descriptor for unknown codes", () => {
    expect(explainCode("00000", "Descriptor from the bill")).toBe("Descriptor from the bill");
    expect(explainDx("Z00.0", "Dx descriptor")).toBe("Dx descriptor");
  });
});
