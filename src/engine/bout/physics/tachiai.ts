import type { SeededRNG } from "../../rng";
import type { Rikishi } from "../../types/rikishi";
import type { BoutLogEntry } from "../../types/basho";
import type { Side } from "../../types/banzuke";
import {
  TACHIAI_IMPACT_VELOCITY,
  TACHIAI_JITTER_MAGNITUDE,
  HENKA_JITTER_MAGNITUDE,
  BELT_THRESHOLD_MAX,
  BELT_BIAS_DIVISOR,
  MIN_ABSOLUTE_FORCE,
} from "../../../constants/engine/physics";
import type { EngineStateV2, PushBattleState } from "../../types/combat-spatial";
import { initBeltBattle } from "../boutGrip";
import {
  stat,
  jitter,
  computeTachiaiPower,
  tachiaiPowerWithMatchupPenalty,
  h2hConfidence,
  type BoutContext,
} from "../boutUtils";
import { getTacticProfile } from "../tacticProfiles";
import { resolveCounterTacticBonus } from "../../types/combat";

/**
 * Resolves the initial clash. May early-terminate the bout (henka) by setting
 * phase to "resolved" — callers must check for this before entering the loop.
 */
export function resolveTachiaiV2(
  rng: SeededRNG,
  bout: BoutContext,
  east: Rikishi,
  west: Rikishi,
  st: EngineStateV2,
  boutLog: BoutLogEntry[]
): void {
  st.phase = { tag: "tachiai", impactVelocity: TACHIAI_IMPACT_VELOCITY, contactAngle: 0 };

  // Tachiai power: power 50%, speed 30%, aggression 20% + jitter
  // Apply 8% penalty when opponent's style is in the rikishi's weakAgainstStyles list
  // Add h2h confidence bonus: (wins/total - 0.5)*8 when >= 3 prior meetings
  let eastPower =
    tachiaiPowerWithMatchupPenalty(east, west) +
    h2hConfidence(east, west.id) +
    jitter(rng, TACHIAI_JITTER_MAGNITUDE);
  let westPower =
    tachiaiPowerWithMatchupPenalty(west, east) +
    h2hConfidence(west, east.id) +
    jitter(rng, TACHIAI_JITTER_MAGNITUDE);

  // Apply tactic-driven tachiai power modifier to the player-side rikishi
  if (bout.playerTactic && bout.playerSide) {
    const mod = getTacticProfile(bout.playerTactic).tachiaiPowerModifier;
    if (bout.playerSide === "east") {
      eastPower += mod;
    } else {
      westPower += mod;
    }

    // Counter-tactic bonus: player's tactic family vs opponent's dominant family
    if (bout.playerTactic) {
      const opponent = bout.playerSide === "east" ? west : east;
      if (opponent.combatProfile) {
        const counterBonus = resolveCounterTacticBonus(bout.playerTactic, opponent.combatProfile);
        if (counterBonus > 0) {
          if (bout.playerSide === "east") eastPower += counterBonus;
          else westPower += counterBonus;
          boutLog.push({
            phase: "tachiai",
            clock: 0,
            data: { event: "counter_tactic_advantage", counterBonus },
          });
        }
      }
    }
  }

  const tachiaiWinner: Side = eastPower >= westPower ? "east" : "west";
  st.tachiaiWinner = tachiaiWinner;

  // Narrative: the opening clash is always worth a line. Intensity scales with
  // how decisive the initial collision was.
  const tachiaiMargin = Math.abs(eastPower - westPower);
  boutLog.push({
    phase: "tachiai",
    clock: 0,
    data: { tachiaiWinner, margin: tachiaiMargin },
  });

  // CR-02: Henka resolution — must check before phase loop
  const henkaSide: Side | null =
    bout.playerTactic === "HENKA"
      ? (bout.playerSide ?? null)
      : bout.cpuTacticOverride === "HENKA"
        ? bout.playerSide === "east"
          ? "west"
          : "east"
        : null;

  if (henkaSide !== null) {
    const trickster = henkaSide === "east" ? east : west;
    const opponent = henkaSide === "east" ? west : east;
    // High-aggression opponents overcommit → more vulnerable to henka
    const henkaScore =
      stat(trickster, "technique") +
      computeTachiaiPower(opponent, { henkaVulnerabilityMode: true }) +
      jitter(rng, HENKA_JITTER_MAGNITUDE);
    const defenseScore = stat(opponent, "balance") + jitter(rng, HENKA_JITTER_MAGNITUDE);

    if (henkaScore > defenseScore) {
      // Spatial henka: the trickster sidesteps and the opponent's own charge
      // carries them down. Log it so the narrative can call the trick.
      boutLog.push({
        phase: "tachiai",
        clock: 0,
        data: { event: "henka_success", attackerSide: henkaSide },
      });
      st.phase = {
        tag: "resolved",
        winner: henkaSide,
        exitVector: { x: henkaSide === "east" ? 1 : -1, z: 0 },
        technique: "hatakikomi",
      };
      return;
    }
  }

  // Decide push vs belt battle (biased by combatProfile)
  const eastBeltBias = east.combatProfile?.familyPreferences?.belt ?? 25;
  const westBeltBias = west.combatProfile?.familyPreferences?.belt ?? 25;
  const beltThreshold = Math.min(
    BELT_THRESHOLD_MAX,
    (eastBeltBias + westBeltBias) / BELT_BIAS_DIVISOR
  );
  const useBelt = rng.next() < beltThreshold;

  // Force/momentum never drop below MIN_ABSOLUTE_FORCE, so a degenerate
  // (near-zero stat) rikishi still has nonzero force — keeps escapeForceAvailable
  // and the force-differential math well-defined. Inert for normal stats
  // (eastPower/westPower are an order of magnitude above the floor).
  const eastForce = Math.max(MIN_ABSOLUTE_FORCE, eastPower);
  const westForce = Math.max(MIN_ABSOLUTE_FORCE, westPower);

  const initialPush: PushBattleState = {
    contestLine: 0,
    eastForce,
    westForce,
    eastLeadFoot: st.east.x,
    westLeadFoot: st.west.x,
    eastMomentum: eastForce,
    westMomentum: westForce,
    eastLateral: 0,
    westLateral: 0,
    eastLateralMomentum: 0,
    westLateralMomentum: 0,
  };

  if (useBelt) {
    const belt = initBeltBattle(rng, east, west, tachiaiWinner);
    st.phase = { tag: "belt_battle", state: belt, push: initialPush };
  } else {
    st.phase = { tag: "push_battle", state: initialPush };
  }
}
