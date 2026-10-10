/**
 * rivalStablesProjections.test.ts — WS7 rival-stable intel fields.
 *
 * The rival stables page must surface banded, honest intelligence:
 *   - tenure summary (public record — always shown)
 *   - faction posture (public once the ichimon elects one)
 *   - last surfaced plan id (from the public plan-shift feed)
 *   - archetype label + qualitative mood — ONLY when the player has scouting
 *     coverage of that stable's roster
 *   - NEVER raw trait numbers
 */
import { describe, it, expect } from "vitest";
import { projectRivalStables } from "@/presenters/rivalStablesProjections";
import type { NPCDecisionDTO } from "@/presenters/npcAgentProjections";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import type { WorldState } from "@/engine/types/world";

function worldWithRival(opts: {
  scouted?: boolean;
  mood?: string;
  tenure?: { bashoServed: number; championships: number };
  yearsInCharge?: number;
  ichimon?: string;
  factionPosture?: string;
}): { world: WorldState; rival: ReturnType<typeof projectRivalStables>["rivals"][number] } {
  const oya = MockFactory.createOyakata("o-rival", {
    heyaId: "h-rival",
    archetype: "gambler",
    mood: (opts.mood ?? "determined") as never,
    yearsInCharge: opts.yearsInCharge ?? 5,
    tenure: opts.tenure
      ? {
          startedYear: 1,
          bashoServed: opts.tenure.bashoServed,
          championships: opts.tenure.championships,
          sekitoriProduced: 0,
          insolvencyEvents: 0,
          majorScandals: 0,
          forcedMergers: 0,
        }
      : undefined,
  });
  const rivalHeya = MockFactory.createHeya("h-rival", {
    oyakataId: "o-rival",
    ichimon: opts.ichimon as never,
  });
  const playerHeya = MockFactory.createHeya("h-player");
  const world = MockFactory.createWorld({
    heyas: new Map([
      ["h-rival", rivalHeya],
      ["h-player", playerHeya],
    ]),
    oyakata: new Map([["o-rival", oya]]),
    playerHeyaId: "h-player",
  });
  if (opts.scouted) {
    world.playerKnowledge = {
      scouting: {
        "r-foreign-1": {
          rikishiId: "r-foreign-1",
          publicInfo: { id: "r-foreign-1", shikona: "S", heyaId: "h-rival" } as never,
          isOwned: false,
          timesObserved: 3,
          lastObservedWeek: 1,
          scoutingInvestment: {} as never,
          scoutingLevel: 2,
          attributes: {} as never,
        },
      },
    };
  }
  if (opts.factionPosture && opts.ichimon) {
    world.factionPostures = {
      [opts.ichimon]: { posture: opts.factionPosture, setWeek: 1 } as never,
    };
  }
  const decisions: NPCDecisionDTO[] = [];
  const rival = projectRivalStables(world, decisions, {}).rivals.find(
    (r) => r.heyaId === "h-rival"
  )!;
  return { world, rival };
}

describe("projectRivalStables — WS7 rival intel", () => {
  it("exposes a tenure summary from the public record", () => {
    const { rival } = worldWithRival({ tenure: { bashoServed: 12, championships: 2 } });
    expect(rival.tenureSummary).toContain("12");
    expect(rival.tenureSummary?.toLowerCase()).toContain("basho");
    expect(rival.tenureSummary).toContain("2");
  });

  it("falls back to yearsInCharge when no tenure record exists", () => {
    const { rival } = worldWithRival({ yearsInCharge: 9 });
    expect(rival.tenureSummary).toContain("9");
    expect(rival.tenureSummary?.toLowerCase()).toContain("year");
  });

  it("exposes the ichimon posture once elected", () => {
    const { rival } = worldWithRival({
      ichimon: "Dewanoumi",
      factionPosture: "coordinated_pressure",
    });
    expect(rival.factionPosture).toBe("coordinated_pressure");
  });

  it("omits faction posture when none has been elected", () => {
    const { rival } = worldWithRival({ ichimon: "Dewanoumi" });
    expect(rival.factionPosture).toBeUndefined();
  });

  it("exposes the last surfaced plan id from the public feed", () => {
    const oya = MockFactory.createOyakata("o-rival", { heyaId: "h-rival" });
    const rivalHeya = MockFactory.createHeya("h-rival", { oyakataId: "o-rival" });
    const world = MockFactory.createWorld({
      heyas: new Map([
        ["h-rival", rivalHeya],
        ["h-player", MockFactory.createHeya("h-player")],
      ]),
      oyakata: new Map([["o-rival", oya]]),
      playerHeyaId: "h-player",
    });
    const decisions: NPCDecisionDTO[] = [
      {
        heyaId: "h-rival",
        heyaName: "H",
        category: "plan_shift",
        decision: "New strategic plan: yokozuna_push",
        reasoning: "",
        week: 5,
        planId: "yokozuna_push",
      },
    ];
    const rival = projectRivalStables(world, decisions, {}).rivals[0];
    expect(rival.planId).toBe("yokozuna_push");
  });

  it("reveals the archetype label only when the stable is scouted", () => {
    const scouted = worldWithRival({ scouted: true }).rival;
    expect(scouted.scouted).toBe(true);
    expect(scouted.archetypeLabel).toBe("gambler");

    const dark = worldWithRival({ scouted: false }).rival;
    expect(dark.scouted).toBe(false);
    expect(dark.archetypeLabel).toBeUndefined();
  });

  it("reveals qualitative mood only when scouted", () => {
    expect(worldWithRival({ scouted: true, mood: "furious" }).rival.mood).toBe("furious");
    expect(worldWithRival({ scouted: false, mood: "furious" }).rival.mood).toBeUndefined();
  });

  it("never leaks raw trait numbers into the DTO", () => {
    const { rival } = worldWithRival({ scouted: true });
    const serialized = JSON.stringify(rival);
    for (const leaked of ["ambition", "patience", '"risk"', "tradition", "compassion"]) {
      expect(serialized).not.toContain(leaked);
    }
  });
});
