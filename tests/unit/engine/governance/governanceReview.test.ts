import { describe, it, expect, beforeEach } from "vitest";
import { runGovernanceReview } from "@/engine/governance/services/governanceReview";
import { makeMockWorld, makeMockHeya, mockRikishi } from "@tests/unit/engine/utils";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import type { WorldState } from "@/engine/types/world";
import { PRESTIGE_ORDER } from "@/engine/history/prestige";
import {
  FACTION_BAILOUT_AMOUNT,
  LOAN_ISSUANCE_THRESHOLD,
  MERGER_THRESHOLD,
} from "@/constants/engine/economic";
import { TRANSFER_RATIO_STANDARD } from "@/constants/engine/roster";

describe("governanceReview", () => {
  let world: WorldState;

  beforeEach(() => {
    world = makeMockWorld();
  });

  describe("runGovernanceReview", () => {
    it("should process financial insolvency properly without an ichimon bailout (no faction)", () => {
      // 1. Arrange
      const poorHeya = makeMockHeya("heya-poor", {
        funds: -5000000,
        runwayBand: "desperate",
        ichimon: undefined,
      });
      world.rikishi.set("r1", mockRikishi("r1", { heyaId: "heya-poor" }));
      world.rikishi.set("r2", mockRikishi("r2", { heyaId: "heya-poor" }));
      world.rikishi.set("r3", mockRikishi("r3", { heyaId: "heya-poor" }));
      world.heyas.set("heya-poor", poorHeya);
      world.playerHeyaId = "heya-rich"; // It is not the player

      // 2. Act
      const impact = runGovernanceReview(world);
      const newWorld = resolveImpacts(world, [impact]);

      // 3. Assert
      const updatedHeya = newWorld.heyas.get("heya-poor")!;
      expect(updatedHeya.riskIndicators.financial).toBe(true);
      expect(updatedHeya.scandalScore).toBeGreaterThan(0);
    });

    it("should issue bailout loan if funds are below threshold", () => {
      const poorHeya = makeMockHeya("heya-poor", {
        funds: LOAN_ISSUANCE_THRESHOLD - 1000,
        runwayBand: "desperate",
        ichimon: undefined,
      });
      world.rikishi.set("r4", mockRikishi("r4", { heyaId: "heya-poor" }));
      world.rikishi.set("r5", mockRikishi("r5", { heyaId: "heya-poor" }));
      world.rikishi.set("r6", mockRikishi("r6", { heyaId: "heya-poor" }));
      world.heyas.set("heya-poor", poorHeya);

      const impact = runGovernanceReview(world);
      const newWorld = resolveImpacts(world, [impact]);

      const updatedHeya = newWorld.heyas.get("heya-poor")!;
      // Assuming bailout loan adds funds
      expect(updatedHeya.funds).toBeGreaterThan(poorHeya.funds);
    });

    it("should process ichimon bailout when possible", () => {
      const poorHeya = makeMockHeya("heya-poor", {
        funds: -1000,
        runwayBand: "desperate",
        ichimon: "Dewanoumi",
      });

      const richHeya = makeMockHeya("heya-rich", {
        funds: 500000000,
        ichimon: "Dewanoumi",
      });

      world.rikishi.set("r7", mockRikishi("r7", { heyaId: "heya-poor" }));
      world.rikishi.set("r8", mockRikishi("r8", { heyaId: "heya-poor" }));
      world.rikishi.set("r9", mockRikishi("r9", { heyaId: "heya-poor" }));
      world.rikishi.set("r10", mockRikishi("r10", { heyaId: "heya-rich" }));
      world.rikishi.set("r11", mockRikishi("r11", { heyaId: "heya-rich" }));
      world.rikishi.set("r12", mockRikishi("r12", { heyaId: "heya-rich" }));

      world.heyas.set("heya-poor", poorHeya);
      world.heyas.set("heya-rich", richHeya);
      world.playerHeyaId = "heya-other"; // poorHeya is not player

      const impact = runGovernanceReview(world);
      const newWorld = resolveImpacts(world, [impact]);

      const updatedPoorHeya = newWorld.heyas.get("heya-poor")!;
      const updatedRichHeya = newWorld.heyas.get("heya-rich")!;

      expect(updatedPoorHeya.funds).toBe(poorHeya.funds + FACTION_BAILOUT_AMOUNT);
      expect(updatedRichHeya.funds).toBe(richHeya.funds - FACTION_BAILOUT_AMOUNT);
    });

    it("should execute insolvency merger for NPC stables with extreme debt", () => {
      // Already carrying a benefactor loan = "beyond saving": no further
      // rescue is issued, queued equity stays terminal, the merger fires.
      const poorHeya = makeMockHeya("heya-poor", {
        funds: MERGER_THRESHOLD - 1000,
        runwayBand: "desperate",
        activeLoans: [
          {
            id: "LN-existing",
            type: "benefactor",
            principal: 1000000,
            interestRate: 0.06,
            remainingBalance: 1060000,
            providerName: "Anonymous Benefactor",
            monthlyPayment: 30000,
            issuedAtYear: 1,
            issuedAtMonth: 1,
          },
        ],
      });
      // Add rikishi to avoid triggering low-roster merger logic simultaneously
      world.rikishi.set("r-m1", mockRikishi("r-m1", { heyaId: "heya-poor" }));
      world.rikishi.set("r-m2", mockRikishi("r-m2", { heyaId: "heya-poor" }));
      world.rikishi.set("r-m3", mockRikishi("r-m3", { heyaId: "heya-poor" }));
      world.heyas.set("heya-poor", poorHeya);

      const targetHeya = makeMockHeya("heya-target", {
        funds: 500000000,
        rikishiIds: ["rt1", "rt2", "rt3"],
      });
      world.rikishi.set("rt1", mockRikishi("rt1", { heyaId: "heya-target" }));
      world.rikishi.set("rt2", mockRikishi("rt2", { heyaId: "heya-target" }));
      world.rikishi.set("rt3", mockRikishi("rt3", { heyaId: "heya-target" }));
      world.heyas.set("heya-target", targetHeya);
      world.playerHeyaId = "heya-player"; // Not the player

      // Add enough heyas to exceed HEYA_FLOOR so merger is not blocked
      world.heyas.set(
        "heya-player",
        makeMockHeya("heya-player", { rikishiIds: ["rp1", "rp2", "rp3"] })
      );
      world.rikishi.set("rp1", mockRikishi("rp1", { heyaId: "heya-player" }));
      world.rikishi.set("rp2", mockRikishi("rp2", { heyaId: "heya-player" }));
      world.rikishi.set("rp3", mockRikishi("rp3", { heyaId: "heya-player" }));
      for (let i = 0; i < 8; i++) {
        const id = `heya-fill-${i}`;
        world.heyas.set(id, makeMockHeya(id, { rikishiIds: [`rf${i}1`, `rf${i}2`, `rf${i}3`] }));
        world.rikishi.set(`rf${i}1`, mockRikishi(`rf${i}1`, { heyaId: id }));
        world.rikishi.set(`rf${i}2`, mockRikishi(`rf${i}2`, { heyaId: id }));
        world.rikishi.set(`rf${i}3`, mockRikishi(`rf${i}3`, { heyaId: id }));
      }

      const impact = runGovernanceReview(world);
      const newWorld = resolveImpacts(world, [impact]);

      // Since findMergerTarget and executeMerger are called, verify log event and closure.
      const updatedPoorHeya = newWorld.heyas.get("heya-poor");
      // Depending on merger logic, either it's closed or has a log event.
      // For safety, just assert that the event was logged or impact is not empty.
      const events = impact.events || [];
      expect(
        events.some(
          (e) => e.type === "GOVERNANCE_RULING" && e.data.incident === "insolvency_merger"
        )
      ).toBe(true);
    });

    it("merges a terminal-debt heya even when cashflow reports a secure band", () => {
      // The zombie-stable case from the 25-yr diagnostic: funds pinned at
      // DEBT_LIMIT but monthlyBurn <= 0 → runwayMonths sentinel →
      // runwayBand "secure" → the old desperate-gate skipped the whole
      // insolvency review forever. Terminal equity alone must now reach
      // the merger check.
      const zombie = makeMockHeya("h-zombie", {
        funds: MERGER_THRESHOLD - 500_000,
        runwayBand: "secure", // cashflow-neutral: income covers a thin roster
      });
      for (const rid of ["z1", "z2", "z3", "z4"]) {
        world.rikishi.set(rid, mockRikishi(rid, { heyaId: "h-zombie" }));
      }
      world.heyas.set("h-zombie", zombie);

      world.playerHeyaId = "h-player";
      for (let i = 0; i < 10; i++) {
        const id = `f-fill-${i}`;
        world.heyas.set(id, makeMockHeya(id, { rikishiIds: [`ff${i}1`, `ff${i}2`, `ff${i}3`] }));
        for (const rid of [`ff${i}1`, `ff${i}2`, `ff${i}3`]) {
          world.rikishi.set(rid, mockRikishi(rid, { heyaId: id }));
        }
      }

      const impact = runGovernanceReview(world);

      const events = impact.events || [];
      expect(
        events.some(
          (e) => e.type === "GOVERNANCE_RULING" && e.data.incident === "insolvency_merger"
        )
      ).toBe(true);
    });

    it("does not stack a second merger when terminal debt and roster collapse coincide", () => {
      // Terminal debt + roster <= 1 used to queue two executeMerger impacts
      // for the same source — the roster could scatter between targets.
      const corpse = makeMockHeya("h-corpse", {
        funds: MERGER_THRESHOLD - 1000,
        runwayBand: "desperate",
        rikishiIds: ["only-1"],
      });
      world.rikishi.set("only-1", mockRikishi("only-1", { heyaId: "h-corpse" }));
      world.heyas.set("h-corpse", corpse);
      world.playerHeyaId = "h-player";
      for (let i = 0; i < 10; i++) {
        const id = `g-fill-${i}`;
        world.heyas.set(id, makeMockHeya(id, { rikishiIds: [`gf${i}1`, `gf${i}2`, `gf${i}3`] }));
        for (const rid of [`gf${i}1`, `gf${i}2`, `gf${i}3`]) {
          world.rikishi.set(rid, mockRikishi(rid, { heyaId: id }));
        }
      }

      const impact = runGovernanceReview(world);
      const mergerEvents = (impact.events || []).filter(
        (e) => e.type === "GOVERNANCE_RULING" && e.data.incident === "stable_merger"
      );
      expect(mergerEvents.length).toBe(1);
    });

    it("terminal debt ticks insolvencyEvents even with no loan issued", () => {
      // Cashflow-neutral zombie: no loan is issued (ladder stays gated on
      // desperate) but the board must still lose confidence eventually —
      // the counter feeds the forced-succession trigger that is the player
      // heya's only exit from terminal debt.
      const zombie = makeMockHeya("h-zombie2", {
        funds: MERGER_THRESHOLD - 500_000,
        runwayBand: "secure",
        oyakataId: "oy-z",
      });
      world.oyakata.set("oy-z", {
        id: "oy-z",
        heyaId: "h-zombie2",
        name: "Zed",
        tenure: { insolvencyEvents: 0 },
      } as never);
      for (const rid of ["z21", "z22", "z23", "z24"]) {
        world.rikishi.set(rid, mockRikishi(rid, { heyaId: "h-zombie2" }));
      }
      world.heyas.set("h-zombie2", zombie);
      world.playerHeyaId = "h-zombie2"; // player-guarded → no merger
      for (let i = 0; i < 10; i++) {
        const id = `h-fill-${i}`;
        world.heyas.set(id, makeMockHeya(id, { rikishiIds: [`hf${i}1`] }));
        world.rikishi.set(`hf${i}1`, mockRikishi(`hf${i}1`, { heyaId: id }));
      }

      const impact = runGovernanceReview(world);
      const newWorld = resolveImpacts(world, [impact]);

      expect(newWorld.heyas.has("h-zombie2")).toBe(true);
      expect(newWorld.oyakata.get("oy-z")?.tenure?.insolvencyEvents).toBe(1);
    });

    it("extends ichimon bailout gifts to the player heya", () => {
      const player = makeMockHeya("h-player", {
        funds: -1000,
        runwayBand: "desperate",
        ichimon: "Dewanoumi",
        rikishiIds: ["pp1", "pp2", "pp3"],
      });
      const patron = makeMockHeya("h-patron", {
        funds: 500000000,
        ichimon: "Dewanoumi",
        rikishiIds: ["pt1", "pt2", "pt3"],
      });
      for (const h of [player, patron]) {
        world.heyas.set(h.id, h);
        for (const rid of h.rikishiIds ?? []) {
          world.rikishi.set(rid, mockRikishi(rid, { heyaId: h.id }));
        }
      }
      world.playerHeyaId = "h-player";

      const impact = runGovernanceReview(world);
      const newWorld = resolveImpacts(world, [impact]);

      expect(newWorld.heyas.get("h-player")!.funds).toBe(-1000 + FACTION_BAILOUT_AMOUNT);
      expect(newWorld.heyas.get("h-patron")!.funds).toBe(500000000 - FACTION_BAILOUT_AMOUNT);
    });

    it("should trigger prestige erosion for sanctioned stables", () => {
      const heya = makeMockHeya("heya-sanctioned", {
        welfareState: {
          complianceState: "sanctioned",
          welfareRisk: 80,
        } as any,
        prestigeBand: PRESTIGE_ORDER[2],
      });
      world.heyas.set("heya-sanctioned", heya);

      const impact = runGovernanceReview(world);
      const newWorld = resolveImpacts(world, [impact]);

      const updatedHeya = newWorld.heyas.get("heya-sanctioned")!;
      expect(updatedHeya.prestigeBand).toBe(PRESTIGE_ORDER[1]); // Dropped 1 band
    });

    it("should decrease scandal score for good standing stables", () => {
      const heya = makeMockHeya("heya-good", {
        scandalScore: 10,
        governanceStatus: "good_standing",
      });
      world.heyas.set("heya-good", heya);

      const impact = runGovernanceReview(world);
      const newWorld = resolveImpacts(world, [impact]);

      const updatedHeya = newWorld.heyas.get("heya-good")!;
      expect(updatedHeya.scandalScore).toBe(8); // Decays by 2
    });

    it("V18 — benefactor debit composes with funds received earlier in the same review", () => {
      // a-collapsed is force-merged into m-benefactor (the only eligible
      // merger target), transferring half its positive funds. z-insolvent
      // later draws an ichimon gift from that same benefactor. The gift debit
      // is computed as `benefactor.funds - charged` off the INPUT world, so
      // the merger credit is clobbered — the benefactorCharges map covers
      // repeated gifts but not an earlier same-batch credit.
      const absorbed = makeMockHeya("a-collapsed", {
        funds: 40_000_000,
        prestigeBand: "struggling" as never,
        consecutiveUnderperformanceBasho: 6,
        rikishiIds: ["ra1", "ra2", "ra3"],
      });
      const benefactor = makeMockHeya("m-benefactor", {
        funds: 100_000_000,
        ichimon: "Dewanoumi",
        prestigeBand: "respected" as never,
        rikishiIds: ["rb1", "rb2", "rb3"],
      });
      const insolvent = makeMockHeya("z-insolvent", {
        funds: -1_000_000,
        runwayBand: "desperate",
        ichimon: "Dewanoumi",
        rikishiIds: ["rc1", "rc2", "rc3"],
      });
      const player = makeMockHeya("p-player", { rikishiIds: ["rp1", "rp2", "rp3"] });
      world.playerHeyaId = "p-player";

      for (const h of [absorbed, benefactor, insolvent, player]) {
        world.heyas.set(h.id, h);
        for (const rid of h.rikishiIds ?? []) {
          world.rikishi.set(rid, mockRikishi(rid, { heyaId: h.id, nationality: "Japan" }));
        }
      }
      // HEYA_FLOOR=10 — fillers keep the merger paths unblocked; none are
      // merger candidates (no eligible prestigeBand) or benefactors (<60M).
      for (let i = 0; i < 8; i++) {
        const id = `f-fill-${i}`;
        world.heyas.set(id, makeMockHeya(id, { rikishiIds: [`rf${i}1`, `rf${i}2`, `rf${i}3`] }));
        world.rikishi.set(`rf${i}1`, mockRikishi(`rf${i}1`, { heyaId: id, nationality: "Japan" }));
        world.rikishi.set(`rf${i}2`, mockRikishi(`rf${i}2`, { heyaId: id, nationality: "Japan" }));
        world.rikishi.set(`rf${i}3`, mockRikishi(`rf${i}3`, { heyaId: id, nationality: "Japan" }));
      }

      const impact = runGovernanceReview(world);
      const newWorld = resolveImpacts(world, [impact]);

      // Control: the insolvent heya really did draw the faction gift.
      expect(newWorld.heyas.get("z-insolvent")!.funds).toBe(-1_000_000 + FACTION_BAILOUT_AMOUNT);
      // Pin: absorbed funds + gift debit must compose on the benefactor.
      // Today the debit reads the pre-review 100M base and the 20M merger
      // credit is destroyed.
      const transfer = Math.floor(absorbed.funds * TRANSFER_RATIO_STANDARD);
      expect(newWorld.heyas.get("m-benefactor")!.funds).toBe(
        benefactor.funds + transfer - FACTION_BAILOUT_AMOUNT
      );
    });
  });
});
