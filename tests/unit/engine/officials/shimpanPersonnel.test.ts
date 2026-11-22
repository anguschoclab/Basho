/**
 * Spec (RED) — Shinpan-bu personnel realism.
 *
 * Real structure: ~20 regular shimpan on one-year terms drawn from
 * sitting oyakata; fixed clan (ichimon) quotas; appointment needs ≥5yr
 * post-retirement + peak ≥ high-Maegashira; leadership = ex-Y/O head +
 * two deputies; panels clan-diverse with a senior chief for makuuchi.
 * Current `Shimpan` is a bare generated name — no oyakata link, no
 * ichimon, no role, no term.
 */
import { describe, it, expect } from "vitest";
import { generateShimpan, assembleShimpanPanel } from "@/engine/officials/GyojiService";
import type { Shimpan } from "@/engine/types/gyoji";

type RichShimpan = Shimpan & {
  oyakataId?: string;
  ichimon?: string;
  role?: "head" | "deputy" | "member";
  appointedYear?: number;
};

describe("shimpan personnel derivation", () => {
  it("generated shimpan carry oyakata + ichimon + appointment metadata", () => {
    const s = generateShimpan("spec-seed", 0) as RichShimpan;
    expect(s.oyakataId).toBeDefined();
    expect(s.ichimon).toBeDefined();
    expect(s.role).toBeDefined();
  });

  it("makuuchi panels are clan-diverse (≤2 panelists per ichimon)", () => {
    const pool: Shimpan[] = Array.from({ length: 20 }, (_, i) => {
      const s = generateShimpan(`s-${i}`, i) as RichShimpan;
      s.ichimon = i < 6 ? "dewanoumi" : i < 10 ? "isegahama" : i < 14 ? "tokitsukaze" : "takasago";
      return s;
    });
    const panel = assembleShimpanPanel(pool, "bout-seed-1");
    if (panel) {
      const counts = new Map<string, number>();
      for (const p of [panel.chief, ...panel.panelists] as RichShimpan[]) {
        counts.set(p.ichimon ?? "?", (counts.get(p.ichimon ?? "?") ?? 0) + 1);
      }
      for (const [, n] of counts) expect(n).toBeLessThanOrEqual(2);
    } else {
      expect.unreachable("panel should assemble from a 20-shimpan pool");
    }
  });
});
