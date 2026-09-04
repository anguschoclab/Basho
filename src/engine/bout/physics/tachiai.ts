import type { SeededRNG } from "../../rng";
import { rngFromSeed } from "../../rng";
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
  NPC_COUNTER_BONUS,
  TACHIAI_SPEED_BONUS_FACTOR,
  TACHIAI_MARGIN_DECISIVE,
  TACHIAI_MARGIN_CLEAR,
  POWER_LOG_ROUNDING,
  MATTA_CHANCE,
  DEFAULT_BELT_BIAS,
  HENKA_TECHNIQUE_THRESHOLD,
  HENKA_SPEED_THRESHOLD,
  HENKA_POWER_GAP_THRESHOLD,
  HENKA_MAX_CHANCE,
  HENKA_POWER_GAP_BASE,
  HENKA_POWER_GAP_FACTOR,
  HENKA_TECH_BASE,
  HENKA_TECH_FACTOR,
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

  // Tachiai richness (1.5): derive tachiaiType from winner's archetype
  const eastArchetype = east.combatProfile?.archetype;
  const westArchetype = west.combatProfile?.archetype;
  const eastSpeed = stat(east, "speed");
  const westSpeed = stat(west, "speed");
  const speedRating = Math.round((eastSpeed + westSpeed) / 2);

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

  // NPC counter-tactic system activation (2.2): NPCs with counterFamily matching
  // opponent's dominant family get a counter bonus
  const npcSide = bout.playerSide === "east" ? "west" : bout.playerSide === "west" ? "east" : null;
  if (npcSide) {
    const npc = npcSide === "east" ? east : west;
    const opponent = npcSide === "east" ? west : east;
    const npcCounterFamily = npc.combatProfile?.counterFamily;
    const opponentPrefs = opponent.combatProfile?.familyPreferences;
    if (npcCounterFamily && opponentPrefs) {
      const sorted = Object.entries(opponentPrefs).sort((a, b) => b[1] - a[1]);
      const opponentDominantFamily = sorted[0]?.[0] as
        import("../../types/combat").TacticalFamily | undefined;
      const second = sorted[1]?.[1] ?? 0;
      if (opponentDominantFamily && (sorted[0]?.[1] ?? 0) > second) {
        if (npcCounterFamily === opponentDominantFamily) {
          const npcCounterBonus = NPC_COUNTER_BONUS;
          if (npcSide === "east") eastPower += npcCounterBonus;
          else westPower += npcCounterBonus;
          boutLog.push({
            phase: "tachiai",
            clock: 0,
            data: {
              event: "counter_tactic",
              side: npcSide,
              counterFamily: npcCounterFamily,
              opponentDominantFamily,
              counterBonus: npcCounterBonus,
            },
          });
        }
      }
    }
  }

  // Apply body type tachiai speed bonus (5.1) — archetype bonus remains narrative-only
  const eastBodyBehavior = east.combatProfile?.bodyTypeBehavior;
  const westBodyBehavior = west.combatProfile?.bodyTypeBehavior;
  const eastTachiaiBonus = eastBodyBehavior?.tachiaiSpeedBonus ?? 0;
  const westTachiaiBonus = westBodyBehavior?.tachiaiSpeedBonus ?? 0;
  eastPower += eastTachiaiBonus * TACHIAI_SPEED_BONUS_FACTOR;
  westPower += westTachiaiBonus * TACHIAI_SPEED_BONUS_FACTOR;

  const tachiaiWinner: Side = eastPower >= westPower ? "east" : "west";
  st.tachiaiWinner = tachiaiWinner;

  // Tachiai richness (1.5): derive tachiaiType and contactPoint from winner's archetype
  const winnerArchetype = tachiaiWinner === "east" ? eastArchetype : westArchetype;
  const tachiaiType =
    winnerArchetype === "oshi"
      ? "head_charge"
      : winnerArchetype === "tsuppari"
        ? "tsuppari"
        : winnerArchetype === "speedster"
          ? "harite"
          : winnerArchetype === "trickster"
            ? "henka"
            : "chest_clash";
  const contactPoint =
    tachiaiType === "head_charge" || tachiaiType === "harite"
      ? "face"
      : tachiaiType === "chest_clash"
        ? "chest"
        : tachiaiType === "tsuppari"
          ? "chest"
          : "shoulder";

  // Narrative: the opening clash is always worth a line. Intensity scales with
  // how decisive the initial collision was.
  const tachiaiMargin = Math.abs(eastPower - westPower);
  const tachiaiIntensity =
    tachiaiMargin > TACHIAI_MARGIN_DECISIVE
      ? "decisive"
      : tachiaiMargin > TACHIAI_MARGIN_CLEAR
        ? "clear"
        : "even";
  boutLog.push({
    phase: "tachiai",
    clock: 0,
    data: {
      tachiaiWinner,
      margin: tachiaiMargin,
      intensity: tachiaiIntensity,
      eastPower: Math.round(eastPower * POWER_LOG_ROUNDING) / POWER_LOG_ROUNDING,
      westPower: Math.round(westPower * POWER_LOG_ROUNDING) / POWER_LOG_ROUNDING,
      eastArchetype: east.combatProfile?.archetype,
      westArchetype: west.combatProfile?.archetype,
      eastTachiaiBonus,
      westTachiaiBonus,
      tachiaiType,
      contactPoint,
      speedRating,
    },
  });

  // Tachiai richness (1.5): matta (false start) — rare 5% event
  // Uses separate RNG to avoid disrupting main bout RNG sequence
  const mattaRng = rngFromSeed(bout.id, "tachiai", "matta");
  if (mattaRng.next() < MATTA_CHANCE) {
    boutLog.push({
      phase: "tachiai",
      clock: 0,
      data: { event: "matta" },
    });
  }

  // CR-02: Henka resolution — must check before phase loop
  // NPC Henka Gap (1.6): high-technique, high-speed NPCs can attempt henka
  // without explicit tactic override when facing a much stronger opponent
  let henkaSide: Side | null =
    bout.playerTactic === "HENKA"
      ? (bout.playerSide ?? null)
      : bout.cpuTacticOverride === "HENKA"
        ? bout.playerSide === "east"
          ? "west"
          : "east"
        : null;

  // NPC spontaneous henka: when no explicit henka is set, a high-technique NPC
  // facing a significantly stronger opponent may attempt a henka
  if (henkaSide === null) {
    const npcSide =
      bout.playerSide === "east" ? "west" : bout.playerSide === "west" ? "east" : null;
    if (npcSide) {
      const npc = npcSide === "east" ? east : west;
      const opponent = npcSide === "east" ? west : east;
      const npcTech = stat(npc, "technique");
      const npcSpeed = stat(npc, "speed");
      const opponentPower = tachiaiPowerWithMatchupPenalty(opponent, npc);
      const npcPower = tachiaiPowerWithMatchupPenalty(npc, opponent);
      const powerGap = opponentPower - npcPower;
      // NPC attempts henka when: technique > 60, speed > 60, and opponent is 15+ power stronger
      const henkaChance =
        npcTech > HENKA_TECHNIQUE_THRESHOLD &&
        npcSpeed > HENKA_SPEED_THRESHOLD &&
        powerGap > HENKA_POWER_GAP_THRESHOLD
          ? Math.min(
              HENKA_MAX_CHANCE,
              (powerGap - HENKA_POWER_GAP_BASE) * HENKA_POWER_GAP_FACTOR +
                (npcTech - HENKA_TECH_BASE) * HENKA_TECH_FACTOR
            )
          : 0;
      if (henkaChance > 0 && rng.next() < henkaChance) {
        henkaSide = npcSide as Side;
        boutLog.push({
          phase: "tachiai",
          clock: 0,
          data: { event: "npc_spontaneous_henka", attackerSide: henkaSide, henkaChance },
        });
      }
    }
  }

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
  const eastBeltBias = east.combatProfile?.familyPreferences?.belt ?? DEFAULT_BELT_BIAS;
  const westBeltBias = west.combatProfile?.familyPreferences?.belt ?? DEFAULT_BELT_BIAS;
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
