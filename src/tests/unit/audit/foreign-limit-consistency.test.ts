/**
 * WS0 audit test — foreign-slot limit consistency.
 *
 * Canon §13: one foreign wrestler slot per stable. The enforced limit is
 * `FOREIGN_RIKISHI_LIMIT_PER_HEYA = 1` (constants/engine/recruitment.ts),
 * honored by TalentPoolOffers. `isAtForeignLimit` in citizenshipUtils must
 * use that same constant — it currently hardcodes `>= 2`, which would let
 * any caller over-limit a stable relative to the canonical rule.
 */

import { describe, it, expect } from "vitest";
import { isAtForeignLimit } from "@/engine/utils/citizenshipUtils";
import { FOREIGN_RIKISHI_LIMIT_PER_HEYA } from "@/constants/engine/recruitment";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import { readSrcFile } from "@/tests/helpers/fsScan";

describe("foreign-slot limit consistency", () => {
  it("isAtForeignLimit uses the canonical FOREIGN_RIKISHI_LIMIT_PER_HEYA constant", () => {
    const src = readSrcFile("engine/utils/citizenshipUtils.ts");
    expect(src).toContain("FOREIGN_RIKISHI_LIMIT_PER_HEYA");
  });

  it("canon limit is 1 foreign slot per stable (§13.1)", () => {
    expect(FOREIGN_RIKISHI_LIMIT_PER_HEYA).toBe(1);
  });

  it("returns true at the canonical limit (1 active foreign rikishi)", () => {
    const rikishiList = [
      MockFactory.createRikishi({ id: "f1", nationality: "Mongolia", joinedHeyaDate: "2024" }),
    ];
    expect(isAtForeignLimit(rikishiList, 2024)).toBe(true);
  });

  it("returns false when no foreign rikishi count against the slot", () => {
    const rikishiList = [
      MockFactory.createRikishi({ id: "n1", nationality: "Japan" }),
      // Naturalized (5+ years tenure) does not consume the foreign slot.
      MockFactory.createRikishi({ id: "nat1", nationality: "Mongolia", joinedHeyaDate: "2018" }),
    ];
    expect(isAtForeignLimit(rikishiList, 2024)).toBe(false);
  });
});
