/**
 * bout/narrative/frames.ts — extracted beats from generateBoutNarrative.
 * Code moved verbatim; dependencies arrive via the shared PbpPipeline.
 */
import type { PbpPipeline } from "./pipeline";
import type { PbpPhase } from "./pbpTypes";
import {
  NARRATIVE_DEPTH_CHANGE_CHANCE,
  NARRATIVE_LOW_RECOVERY_THRESHOLD,
  NARRATIVE_STAMINA_CHANCE,
  NARRATIVE_TAWARA_TOE_THRESHOLD,
} from "../../../constants/engine/narrative";
import { BardEngine } from "../../bard/BardEngine";
import { rngFromSeed } from "../../rng";
import type { BoutLogEntry } from "../../types/basho";
import type { Stance } from "../../types/combat";

import type { SeededRNG } from "../../rng";

/** Mutable per-bout narration state shared by frame handlers. */
interface FrameState {
  p: PbpPipeline;
  clinchEmitted: boolean;
  lastMomentumTick: number;
  counterTacticCount: number;
}

function handleEngagementFrame(
  s: FrameState,
  entry: BoutLogEntry,
  rng: SeededRNG,
  tickSeed: string
): void {
  const { east, intensity, push, result, west } = s.p;
  // Engagement narrative — also derives clinch, momentum, and tactical phases
  if (entry.phase === "engagement" && typeof entry.data?.family === "string") {
    const family = entry.data.family as "push" | "belt" | "speed" | "trick";
    const attacker = entry.data.attackerSide === "west" ? west : east;
    const defender = entry.data.attackerSide === "west" ? east : west;
    const differential =
      family === "belt"
        ? Math.abs((entry.data.torqueAdvantage as number) ?? 0)
        : Math.abs((entry.data.forceDiff as number) ?? 0);
    const engIntensity = BardEngine.calculateIntensity(differential, [0, 40]);
    const tick = (entry.data?.tick as number) ?? 0;

    // 7a. Engagement line
    const res = BardEngine.resolve(rng, `combat.engagement.${family}`, {
      attacker: attacker.shikona,
      defender: defender.shikona,
      intensity: engIntensity,
      attackerId: attacker.id,
      defenderId: defender.id,
    });
    push(res.text, "engagement");

    // 7a2. Stamina engagement — if late in a long bout with low intensity, mention fatigue
    if (tick > 15 && engIntensity === 1 && result.duration && result.duration > 15) {
      const staminaRng = rngFromSeed(tickSeed, "pbp", "engagement-stamina");
      if (staminaRng.next() < NARRATIVE_STAMINA_CHANCE) {
        push(
          BardEngine.resolve(staminaRng, "combat.engagement.stamina", {
            ATTACKER: attacker.shikona,
            DEFENDER: defender.shikona,
            attackerId: attacker.id,
            defenderId: defender.id,
          }).text,
          "engagement"
        );
      }
    }

    // 7b. Clinch — emit once on first belt engagement
    if (family === "belt" && !s.clinchEmitted) {
      s.clinchEmitted = true;
      const clinchRng = rngFromSeed(tickSeed, "pbp", "clinch");
      const stance: Stance = (entry.data?.stance as Stance) ?? "belt-dominant";
      const clinchPath =
        stance === "belt-dominant"
          ? "combat.phases.clinch.belt"
          : stance === "push-dominant"
            ? "combat.phases.clinch.oshi"
            : "combat.phases.clinch.belt";
      const clinchRes = BardEngine.resolve(clinchRng, clinchPath, {
        east: east.shikona,
        west: west.shikona,
        eastRikishiId: east.id,
        westRikishiId: west.id,
        intensity,
        name: attacker.shikona,
        nameId: attacker.id,
      });
      push(clinchRes.text, "clinch");
    }

    // 7c. Momentum — emit when differential is significant (every 4+ ticks to avoid spam)
    if (differential > 25 && tick - s.lastMomentumTick >= 4) {
      s.lastMomentumTick = tick;
      const momRng = rngFromSeed(tickSeed, "pbp", "momentum");
      const attackerIsWinner =
        (entry.data.attackerSide === "east" && result.winner === "east") ||
        (entry.data.attackerSide === "west" && result.winner === "west");
      const recovery = !attackerIsWinner;
      const momPath = recovery
        ? "combat.phases.momentum.recovery"
        : "combat.phases.momentum.pressure";
      const winnerName = result.winner === "east" ? east.shikona : west.shikona;
      const loserName = result.winner === "east" ? west.shikona : east.shikona;
      const name = recovery ? loserName : winnerName;
      const nameId = recovery
        ? result.winner === "east"
          ? west.id
          : east.id
        : result.winner === "east"
          ? east.id
          : west.id;
      const momRes = BardEngine.resolve(momRng, momPath, {
        name,
        nameId,
        east: east.shikona,
        west: west.shikona,
        eastRikishiId: east.id,
        westRikishiId: west.id,
        intensity,
      });
      push(momRes.text, "momentum");
    }

    // 7d. Tactical — emit on speed (lateral) or trick family engagements
    if (family === "speed") {
      const tacRng = rngFromSeed(tickSeed, "pbp", "tactical");
      const lateralOffset = Math.abs((entry.data.lateralOffsetDiff as number) ?? 0);
      const tacPath =
        lateralOffset > 30 ? "combat.phases.tactical.rear_take" : "combat.phases.tactical.lateral";
      const tacRes = BardEngine.resolve(tacRng, tacPath, {
        attacker: attacker.shikona,
        defender: defender.shikona,
        attackerId: attacker.id,
        defenderId: defender.id,
        east: east.shikona,
        west: west.shikona,
        eastRikishiId: east.id,
        westRikishiId: west.id,
      });
      push(tacRes.text, "tactical");
    } else if (family === "trick") {
      const tacRng = rngFromSeed(tickSeed, "pbp", "tactical");
      const tacRes = BardEngine.resolve(tacRng, "combat.phases.tactical.pull_attempt", {
        attacker: attacker.shikona,
        defender: defender.shikona,
        attackerId: attacker.id,
        defenderId: defender.id,
      });
      push(tacRes.text, "tactical");
    }
  }
}

function handleTachiaiFrame(s: FrameState, entry: BoutLogEntry, rng: SeededRNG): void {
  const { east, push, west } = s.p;
  // Tachiai
  if (entry.phase === "tachiai") {
    if (entry.data?.event === "henka_success") {
      const attacker = entry.data.attackerSide === "west" ? west : east;
      const defender = entry.data.attackerSide === "west" ? east : west;
      const tacRes = BardEngine.resolve(rng, "combat.phases.tactical.henka", {
        attacker: attacker.shikona,
        defender: defender.shikona,
        attackerId: attacker.id,
        defenderId: defender.id,
      });
      push(tacRes.text, "tactical", ["henka"]);
    } else {
      const margin = (entry.data?.margin as number) ?? 0;
      const winnerSide = entry.data?.tachiaiWinner === "west" ? west : east;
      const loserSide = entry.data?.tachiaiWinner === "west" ? east : west;
      const res = BardEngine.resolve(rng, "combat.phases.tachiai", {
        east: east.shikona,
        west: west.shikona,
        winner: winnerSide.shikona,
        attacker: winnerSide.shikona,
        defender: loserSide.shikona,
        intensity: BardEngine.calculateIntensity(margin, [0, 30]),
        eastRikishiId: east.id,
        westRikishiId: west.id,
        winnerId: winnerSide.id,
        loserId: loserSide.id,
      });
      push(res.text, "tachiai");
    }
  }
}

function handleClinchFrame(s: FrameState, entry: BoutLogEntry, rng: SeededRNG): void {
  const { east, intensity, push, west } = s.p;
  // Clinch (from explicit log entries — rare, kept for compatibility)
  if (entry.phase === "clinch") {
    const stance = (entry.data?.stance as Stance) ?? "no-grip";
    const path =
      stance === "belt-dominant" ? "combat.phases.clinch.belt" : "combat.phases.clinch.oshi";
    const aggressor = entry.data?.attackerSide === "west" ? west : east;
    const res = BardEngine.resolve(rng, path, {
      east: east.shikona,
      west: west.shikona,
      eastRikishiId: east.id,
      westRikishiId: west.id,
      intensity,
      name: aggressor.shikona,
      nameId: aggressor.id,
    });
    push(res.text, "clinch");
  }
}

function handleMomentumFrame(s: FrameState, entry: BoutLogEntry, rng: SeededRNG): void {
  const { east, intensity, push, result, west } = s.p;
  // Momentum (from explicit log entries — rare, kept for compatibility)
  if (entry.phase === "momentum") {
    const recovery = (entry.data?.recovery as boolean) ?? false;
    const path = recovery ? "combat.phases.momentum.recovery" : "combat.phases.momentum.pressure";
    const winnerName = result.winner === "east" ? east.shikona : west.shikona;
    const loserName = result.winner === "east" ? west.shikona : east.shikona;
    const name = recovery ? loserName : winnerName;
    const nameId = recovery
      ? result.winner === "east"
        ? west.id
        : east.id
      : result.winner === "east"
        ? east.id
        : west.id;
    const res = BardEngine.resolve(rng, path, {
      name,
      nameId,
      east: east.shikona,
      west: west.shikona,
      eastRikishiId: east.id,
      westRikishiId: west.id,
      intensity,
    });
    push(res.text, "momentum");
  }
}

function handleFatigueFrame(s: FrameState, entry: BoutLogEntry, rng: SeededRNG): void {
  const { east, push, west } = s.p;
  // Fatigue snapshot (1.2): narrate fatigue levels at tick 10 and 20
  if (entry.phase === "fatigue") {
    const fatigueData = entry.data as {
      eastFatigue?: number;
      westFatigue?: number;
      fatigueDelta?: number;
    };
    const tick = (entry.data?.tick as number) ?? 0;
    const maxFatigue = Math.max(fatigueData.eastFatigue ?? 0, fatigueData.westFatigue ?? 0);
    const fatigueStage = tick >= 20 || maxFatigue > 60 ? "late" : maxFatigue > 30 ? "mid" : "early";
    push(
      BardEngine.resolve(rng, `combat.phases.fatigue.${fatigueStage}`, {
        EAST: east.shikona,
        WEST: west.shikona,
        eastRikishiId: east.id,
        westRikishiId: west.id,
      }).text,
      "fatigue" as PbpPhase
    );
  }
}

function handleBoutInjuryFrame(s: FrameState, entry: BoutLogEntry, rng: SeededRNG): void {
  const { east, push, west } = s.p;
  // Bout injury (1.3): narrate in-bout injury events
  if (entry.phase === "bout_injury") {
    const injuryData = entry.data as {
      rikishiId?: string;
      area?: string;
      severity?: string;
    };
    const injuredRikishi = injuryData.rikishiId === east.id ? east : west;
    const severity = injuryData.severity ?? "minor";
    const area = injuryData.area ?? "leg";
    push(
      BardEngine.resolve(rng, `combat.phases.bout_injury.${severity}`, {
        NAME: injuredRikishi.shikona,
        AREA: area,
        rikishiId: injuredRikishi.id,
      }).text,
      "bout_injury" as PbpPhase
    );
  }
}

function handleMomentumShiftFrame(s: FrameState, entry: BoutLogEntry, rng: SeededRNG): void {
  const { east, push, west } = s.p;
  // Momentum shift (1.4): narrate when dominant side flips
  if (entry.phase === "momentum_shift") {
    const shiftData = entry.data as {
      prevDominantSide?: string;
      newDominantSide?: string;
    };
    const newSide = shiftData.newDominantSide;
    const shiftPath =
      newSide === "east"
        ? "combat.phases.momentum_shift.east_takes_over"
        : "combat.phases.momentum_shift.west_takes_over";
    push(
      BardEngine.resolve(rng, shiftPath, {
        EAST: east.shikona,
        WEST: west.shikona,
        eastRikishiId: east.id,
        westRikishiId: west.id,
      }).text,
      "momentum_shift" as PbpPhase
    );
  }
}

function handleGripTransitionFrame(s: FrameState, entry: BoutLogEntry, rng: SeededRNG): void {
  const { east, push, west } = s.p;
  // Grip transition (1.1): narrate grip class shifts
  if (entry.phase === "grip_transition") {
    const gripData = entry.data as {
      type?: string;
      eastGripFrom?: string;
      eastGripTo?: string;
      westGripFrom?: string;
      westGripTo?: string;
    };
    if (gripData.type === "grip_class_shift") {
      // Determine which side had the notable transition
      const eastChanged = gripData.eastGripFrom !== gripData.eastGripTo;
      const side = eastChanged ? "east" : "west";
      const r = side === "east" ? east : west;
      const from = side === "east" ? gripData.eastGripFrom : gripData.westGripFrom;
      const to = side === "east" ? gripData.eastGripTo : gripData.westGripTo;

      let gripPath: string | null = null;
      if (to === "morozashi") gripPath = "combat.phases.grip_transition.morozashi_gained";
      else if (from === "morozashi" && to !== "morozashi")
        gripPath = "combat.phases.grip_transition.morozashi_lost";
      else if (to === "uwate") gripPath = "combat.phases.grip_transition.uwate_gained";
      else if (from === "uwate" && to !== "uwate" && to !== "morozashi")
        gripPath = "combat.phases.grip_transition.uwate_lost";

      if (gripPath) {
        push(
          BardEngine.resolve(rng, gripPath, {
            NAME: r.shikona,
            rikishiId: r.id,
          }).text,
          "grip_transition" as PbpPhase
        );
      }
    } else if (gripData.type === "depth_change") {
      // Only narrate depth changes occasionally to avoid spam
      if (rng.next() < NARRATIVE_DEPTH_CHANGE_CHANCE) {
        push(
          BardEngine.resolve(rng, "combat.phases.grip_transition.depth_change", {
            NAME: east.shikona,
            rikishiId: east.id,
          }).text,
          "grip_transition" as PbpPhase
        );
      }
    }
  }
}

function handleTimeoutFrame(s: FrameState, entry: BoutLogEntry, rng: SeededRNG): void {
  const { east, push, west } = s.p;
  // Bout timeout (8.5): narrate when bout goes to judges' decision
  if (entry.phase === "bout_timeout") {
    const timeoutData = entry.data as {
      eastForce?: number;
      westForce?: number;
      eastMomentum?: number;
      westMomentum?: number;
      decisionBasis?: string;
    };
    const eastAdv = (timeoutData.eastForce ?? 0) + (timeoutData.eastMomentum ?? 0);
    const westAdv = (timeoutData.westForce ?? 0) + (timeoutData.westMomentum ?? 0);
    const timeoutPath =
      eastAdv > westAdv
        ? "combat.phases.bout_timeout.east_advantage"
        : westAdv > eastAdv
          ? "combat.phases.bout_timeout.west_advantage"
          : "combat.phases.bout_timeout.stalemate";
    push(
      BardEngine.resolve(rng, timeoutPath, {
        EAST: east.shikona,
        WEST: west.shikona,
        eastRikishiId: east.id,
        westRikishiId: west.id,
      }).text,
      "bout_timeout"
    );
  }
}

function handleCounterTacticFrame(s: FrameState, entry: BoutLogEntry, rng: SeededRNG): void {
  const { east, push, west } = s.p;
  // Counter tactic — archetype counter activated during bout (Gap 2)
  // Limit to 2 narrative lines per bout
  if (entry.phase === "counter_tactic" && s.counterTacticCount < 2) {
    const counterData = entry.data as {
      attacker?: "east" | "west";
      defender?: "east" | "west";
      attackerFamily?: string;
      defenderFamily?: string;
    };
    const attackerSide = counterData.attacker ?? "east";
    const defenderSide = counterData.defender ?? "west";
    const attackerName = attackerSide === "east" ? east.shikona : west.shikona;
    const defenderName = defenderSide === "east" ? east.shikona : west.shikona;
    push(
      BardEngine.resolve(rng, "combat.phases.counter_tactic", {
        ATTACKER: attackerName,
        DEFENDER: defenderName,
        attackerId: attackerSide === "east" ? east.id : west.id,
        defenderId: defenderSide === "east" ? east.id : west.id,
      }).text,
      "counter_tactic",
      ["counter"]
    );
    s.counterTacticCount++;
  }
}

function handleEdgeCrisisFrame(s: FrameState, entry: BoutLogEntry, rng: SeededRNG): void {
  const { east, push, west } = s.p;
  // Edge crisis
  if (entry.phase === "edge_crisis") {
    const crisisData = entry.data as {
      side?: "east" | "west";
      escaped?: boolean;
      recoveryProbability?: number;
      tawaraToePosition?: number;
      forced?: boolean;
    };
    const sideName = crisisData.side === "east" ? east.shikona : west.shikona;
    const sideId = crisisData.side === "east" ? east.id : west.id;
    const toePos = crisisData.tawaraToePosition ?? 0;

    if (crisisData.escaped) {
      push(
        BardEngine.resolve(rng, "combat.phases.edge_crisis.recovery", {
          NAME: sideName,
          nameId: sideId,
        }).text,
        "edge_crisis"
      );
    } else if (
      crisisData.forced ||
      (crisisData.recoveryProbability !== undefined &&
        crisisData.recoveryProbability < NARRATIVE_LOW_RECOVERY_THRESHOLD)
    ) {
      push(
        BardEngine.resolve(rng, "combat.phases.edge_crisis.failure", {
          NAME: sideName,
          nameId: sideId,
        }).text,
        "edge_crisis"
      );
    } else if (toePos > NARRATIVE_TAWARA_TOE_THRESHOLD) {
      push(
        BardEngine.resolve(rng, "combat.phases.edge_crisis.tawara_drama", {
          NAME: sideName,
          nameId: sideId,
        }).text,
        "edge_crisis"
      );
    } else {
      push(
        BardEngine.resolve(rng, "combat.phases.edge_crisis.approach", {
          NAME: sideName,
          nameId: sideId,
        }).text,
        "edge_crisis"
      );
    }
  }
}

function narrateFrameEntry(s: FrameState, entry: BoutLogEntry, idx: number): void {
  const { push, seed } = s.p;
  const tickSeed = `${seed}-tick-${(entry.data?.tick as number) || 0}-${idx}`;
  const rng = rngFromSeed(tickSeed, "pbp", "tick");

  if (entry.description) {
    push(entry.description, entry.phase as PbpPhase);
  }

  handleEngagementFrame(s, entry, rng, tickSeed);
  handleTachiaiFrame(s, entry, rng);
  handleClinchFrame(s, entry, rng);
  handleMomentumFrame(s, entry, rng);
  handleFatigueFrame(s, entry, rng);
  handleBoutInjuryFrame(s, entry, rng);
  handleMomentumShiftFrame(s, entry, rng);
  handleGripTransitionFrame(s, entry, rng);
  handleTimeoutFrame(s, entry, rng);
  handleCounterTacticFrame(s, entry, rng);
  handleEdgeCrisisFrame(s, entry, rng);
}

export function narrateFrames(p: PbpPipeline): void {
  const { result } = p;
  // Track derived phase state to avoid spamming clinch/momentum on every tick
  const s: FrameState = { p, clinchEmitted: false, lastMomentumTick: -10, counterTacticCount: 0 };
  result.log.forEach((entry: BoutLogEntry, idx: number) => narrateFrameEntry(s, entry, idx));
}
