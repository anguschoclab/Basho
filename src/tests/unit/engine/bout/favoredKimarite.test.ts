/**
 * Tests that favoredKimarite gives a +0.08 successProbability bonus
 * when the winning side's favored techniques include the classified kimarite,
 * plus a 1.5× selection weight boost to make the technique more likely to be chosen.
 */
import { describe, it, expect } from "vitest";
import { evaluateKimariteAttempt } from "../kimariteClassifier";
import { mockRikishi } from "../utils";
import { SeededRNG } from "../../rng";
import type { PushBattleState, EngineStateV2 } from "../../types/combat-spatial";
import type { Division } from "../../types/banzuke";
import { initPhysicalBody } from "../boutSpatial";

const DIVISION: Division = "makuuchi";
const META = { tone: "classic", drift: {} };

function makeEngineState(eastLeadFoot: number, westLeadFoot: number): EngineStateV2 {
  const east = mockRikishi("e");
  const west = mockRikishi("w");
  const eastBody = initPhysicalBody(east, "east");
  const westBody = initPhysicalBody(west, "west");
  eastBody.leadingFootX = eastLeadFoot;
  eastBody.x = eastLeadFoot;
  eastBody.velocityX = -5; // east is pushing forward — required for forwardMomentum > 0
  westBody.leadingFootX = westLeadFoot;
  westBody.x = westLeadFoot;

  return {
    tick: 0,
    phase: { tag: "push_battle", state: {} as PushBattleState },
    east: eastBody,
    west: westBody,
    tachiaiWinner: "east",
    grappleState: {
      east: { rightHand: "outside", leftHand: "outside", depth: "standard" },
      west: { rightHand: "outside", leftHand: "outside", depth: "standard" },
      gripAdvantage: "neutral",
    },
  };
}

describe("evaluateKimariteAttempt — favoredKimarite boost", () => {
  it("adds +0.08 to successProbability when winner favors the classified technique", () => {
    // Use technique=0 so techBonus=0 → base prob=0.8, boosted=0.88 (no cap interference)
    // style:"oshi" so isPusher condition passes for oshidashi selection
    const eastWithFavored = mockRikishi("east", {
      technique: 0,
      style: "oshi",
      favoredKimarite: ["oshidashi"],
    });
    const west = mockRikishi("west", { technique: 0 });

    // Push battle with east near edge (east at 3.8+, west near 0)
    // Actually: westNearEdge = abs(westLeadFoot) > 3.5 → pusherSide = east
    const westLeadFoot = -3.8; // west is near their edge (negative = west side)
    const st = makeEngineState(0, westLeadFoot);

    const push: PushBattleState = {
      contestLine: 2.6,
      eastForce: 80,
      westForce: 60,
      eastLeadFoot: 0,
      westLeadFoot,
      eastMomentum: 80,
      westMomentum: 30,
    };
    st.phase = { tag: "push_battle", state: push };

    // Run without favored — get baseline successProbability
    const eastNoFavored = mockRikishi("east-no-fav", { technique: 0, style: "oshi" }); // no favoredKimarite
    const westNoFavored = mockRikishi("west-no-favored");
    const baseAttempt = evaluateKimariteAttempt(
      eastNoFavored,
      westNoFavored,
      push,
      null,
      st,
      new SeededRNG("base"),
      DIVISION,
      META
    );

    // Sanity — we must get an oshidashi attempt for east
    expect(baseAttempt).not.toBeNull();
    expect(baseAttempt!.technique).toBe("oshidashi");
    expect(baseAttempt!.side).toBe("east");

    // Now east has oshidashi as favored — same seed for deterministic comparison
    const boostedAttempt = evaluateKimariteAttempt(
      eastWithFavored,
      westNoFavored,
      push,
      null,
      st,
      new SeededRNG("base"),
      DIVISION,
      META
    );

    expect(boostedAttempt).not.toBeNull();
    expect(boostedAttempt!.technique).toBe("oshidashi");
    expect(boostedAttempt!.successProbability).toBeGreaterThan(baseAttempt!.successProbability);
    expect(boostedAttempt!.successProbability - baseAttempt!.successProbability).toBeCloseTo(
      0.08,
      5
    );
  });

  it("does NOT boost when winner's favoredKimarite does not include the classified technique", () => {
    // East favors yoritaoshi (belt_battle-only) — in a push_battle it is never applicable,
    // so the 1.5× weight boost has no effect and successProbability equals the no-favor base.
    const east = mockRikishi("east", { style: "oshi", favoredKimarite: ["yoritaoshi"] as any });
    const west = mockRikishi("west");

    const westLeadFoot = -3.8;
    const st = makeEngineState(0, westLeadFoot);
    const push: PushBattleState = {
      contestLine: 2.6,
      eastForce: 80,
      westForce: 60,
      eastLeadFoot: 0,
      westLeadFoot,
      eastMomentum: 80,
      westMomentum: 30,
    };
    st.phase = { tag: "push_battle", state: push };

    const noFavor = mockRikishi("east-no-favor", { style: "oshi" });
    const base = evaluateKimariteAttempt(
      noFavor,
      west,
      push,
      null,
      st,
      new SeededRNG("noboost"),
      DIVISION,
      META
    );
    const withWrongFavor = evaluateKimariteAttempt(
      east,
      west,
      push,
      null,
      st,
      new SeededRNG("noboost"),
      DIVISION,
      META
    );

    // Technique and successProbability must be identical — yoritaoshi never fires in push_battle
    expect(withWrongFavor!.technique).toBe(base!.technique);
    expect(withWrongFavor!.successProbability).toBeCloseTo(base!.successProbability, 5);
  });

  it("caps boosted successProbability at 0.97", () => {
    // Craft a situation where base probability is already 0.92 (morozashi yorikiri)
    // + 0.08 favored boost would exceed 0.97 → must be capped
    const east = mockRikishi("east");
    // West near edge, east has morozashi grip
    const westLeadFoot = -3.9;
    const st = makeEngineState(0, westLeadFoot);
    // We can't easily force morozashi via evaluateKimariteAttempt (it reads belt state),
    // so instead verify the cap holds with a high techBonus scenario.
    // Use technique=100 → techBonus = 0.2, base edge oshidashi=0.75+0.2=0.95
    // With +0.08 favored → 1.03, should cap at 0.97
    const eastHighTech = mockRikishi("east-high", {
      technique: 100,
      style: "oshi",
      favoredKimarite: ["oshidashi"],
    });
    const push: PushBattleState = {
      contestLine: 2.6,
      eastForce: 80,
      westForce: 30,
      eastLeadFoot: 0,
      westLeadFoot,
      eastMomentum: 80,
      westMomentum: 20,
    };
    st.phase = { tag: "push_battle", state: push };

    const attempt = evaluateKimariteAttempt(
      eastHighTech,
      mockRikishi("west"),
      push,
      null,
      st,
      new SeededRNG("cap-test"),
      DIVISION,
      META
    );

    expect(attempt).not.toBeNull();
    expect(attempt!.successProbability).toBeLessThanOrEqual(0.97);
  });
});
