import { describe, it, expect, beforeAll } from "vitest";
import { EVENT_CHAIN_REGISTRY, getChainDef } from "@/engine/events/chains/chainRegistry";
import { BardEngine } from "@/engine/bard/BardEngine";
import { rngFromSeed } from "@/engine/core/rng";

/**
 * Chain registry integrity — mirrors templateTokenIntegrity's contract:
 * every bard path must resolve to real text with no token leakage, and
 * every nextStage reference must point at a real stage in the same def.
 */
describe("event chain registry", () => {
  beforeAll(async () => {
    await BardEngine.ensureDomains(["chains"]);
  });

  it("ships the 15 launch families", () => {
    expect(EVENT_CHAIN_REGISTRY.length).toBeGreaterThanOrEqual(15);
    const ids = new Set(EVENT_CHAIN_REGISTRY.map((c) => c.id));
    for (const expected of [
      "bullying",
      "doping_rumor",
      "sponsor_courtship",
      "academy_scandal",
      "media_persona",
      "veteran_decline",
      "rivalry_escalation",
      "koenkai_defection",
      "foreign_prospect",
      "succession_tension",
      "injury_coverup",
      "elder_retirement",
      "noren_gift",
      "tsukebito_abuse",
      "weight_spiral",
    ]) {
      expect(ids.has(expected), `missing family ${expected}`).toBe(true);
    }
  });

  it("has unique chain ids, stage ids, and option ids per stage", () => {
    const chainIds = new Set<string>();
    for (const def of EVENT_CHAIN_REGISTRY) {
      expect(chainIds.has(def.id), `dup chain ${def.id}`).toBe(false);
      chainIds.add(def.id);
      const stageIds = new Set<string>();
      for (const stage of def.stages) {
        expect(stageIds.has(stage.id), `dup stage ${def.id}/${stage.id}`).toBe(false);
        stageIds.add(stage.id);
        const optIds = new Set(stage.options.map((o) => o.id));
        expect(optIds.size, `dup options ${def.id}/${stage.id}`).toBe(stage.options.length);
        expect(stage.options.length, `no options ${def.id}/${stage.id}`).toBeGreaterThan(0);
      }
    }
  });

  it("resolves every nextStage reference to a real stage", () => {
    for (const def of EVENT_CHAIN_REGISTRY) {
      const stageIds = new Set(def.stages.map((s) => s.id));
      for (const stage of def.stages) {
        for (const opt of stage.options) {
          if (opt.nextStage) {
            expect(
              stageIds.has(opt.nextStage.stageId),
              `${def.id}/${stage.id}/${opt.id} → missing stage ${opt.nextStage.stageId}`
            ).toBe(true);
            expect(opt.nextStage.delayWeeks).toBeGreaterThanOrEqual(1);
          }
        }
      }
    }
  });

  it("every bard path resolves with no [MISSING] or token leakage", () => {
    const ctx = { SHIKONA: "Testyama", HEYA: "Testbeya", shikona: "Testyama", heya: "Testbeya" };
    for (const def of EVENT_CHAIN_REGISTRY) {
      for (const stage of def.stages) {
        for (const path of [stage.titlePath, stage.summaryPath]) {
          expect(path.startsWith("chains."), `bad path ${path}`).toBe(true);
          expect(BardEngine.has(path), `path missing: ${path}`).toBe(true);
          for (const seed of ["a", "b", "c"]) {
            const out = BardEngine.resolve(rngFromSeed(seed, "chains", path), path, ctx).text;
            expect(out.length, `empty resolution: ${path}`).toBeGreaterThan(0);
            expect(out).not.toContain("[MISSING");
            expect(out).not.toMatch(/%[A-Z][A-Z0-9_]*%/);
          }
        }
        for (const opt of stage.options) {
          expect(BardEngine.has(opt.labelPath), `path missing: ${opt.labelPath}`).toBe(true);
          const out = BardEngine.resolve(
            rngFromSeed("o", "chains", opt.labelPath),
            opt.labelPath,
            ctx
          ).text;
          expect(out.length).toBeGreaterThan(0);
          expect(out).not.toContain("[MISSING");
        }
      }
    }
  });

  it("every chain has ≥2 reachable stages and a terminating path", () => {
    for (const def of EVENT_CHAIN_REGISTRY) {
      expect(def.stages.length, `${def.id} too shallow`).toBeGreaterThanOrEqual(2);
      const reachable = new Set<string>([def.stages[0].id]);
      let grew = true;
      while (grew) {
        grew = false;
        for (const s of def.stages) {
          if (!reachable.has(s.id)) continue;
          for (const o of s.options) {
            if (o.nextStage && !reachable.has(o.nextStage.stageId)) {
              reachable.add(o.nextStage.stageId);
              grew = true;
            }
          }
        }
      }
      const terminus = def.stages.some(
        (s) => reachable.has(s.id) && s.options.some((o) => !o.nextStage)
      );
      expect(terminus, `${def.id} has no reachable chain-ending option`).toBe(true);
    }
  });

  it("getChainDef round-trips", () => {
    expect(getChainDef("bullying")?.id).toBe("bullying");
    expect(getChainDef("nope")).toBeUndefined();
  });
});
