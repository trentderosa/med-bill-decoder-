// Expected flag-engine output for each sample bill, keyed by bill id. Test-only:
// the UI never reads this; it always runs the engine.

import type { FlagType } from "../flagEngine";

export type ExpectedFlag = { type: FlagType; lineItemIds: string[] };

export const EXPECTED_FLAGS: Readonly<Record<string, ExpectedFlag[]>> = {
  "duplicate-charge": [{ type: "duplicate", lineItemIds: ["dup-2"] }],
  "upcoded-visit": [{ type: "upcoding", lineItemIds: ["up-1"] }],
  "unbundled-procedure": [{ type: "unbundling", lineItemIds: ["unb-1", "unb-2"] }],
  "surprise-balance-bill": [{ type: "balance-billing", lineItemIds: ["bal-1"] }],
  "over-good-faith-estimate": [{ type: "gfe-overage", lineItemIds: ["gfe-1"] }],
  "clean-bill": [],
};
