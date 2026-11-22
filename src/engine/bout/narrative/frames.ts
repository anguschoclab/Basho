/**
 * bout/narrative/frames.ts — extracted beats from generateBoutNarrative.
 * Code moved verbatim; dependencies arrive via the shared PbpPipeline.
 */
import type { PbpPipeline } from "@/engine/bout/narrative/pipeline";
import type { PbpPhase, PbpTag } from "@/engine/bout/narrative/pbpTypes";
import {
  NARRATIVE_DEPTH_CHANGE_CHANCE,
  NARRATIVE_MUTUAL_CONSENT_CHANCE,
  NARRATIVE_TECHNIQUE_CHANCE,
  NARRATIVE_LOW_RECOVERY_THRESHOLD,
  NARRATIVE_STAMINA_CHANCE,
  NARRATIVE_TAWARA_TOE_THRESHOLD,
} from "@/constants/engine/narrative";
import { BardEngine } from "@/engine/bard/BardEngine";
import { rngFromSeed } from "@/engine/core/rng";
import type { BoutLogEntry } from "@/engine/types/basho";
import type { Rikishi } from "@/engine/types/rikishi";
import type { Stance } from "@/engine/types/combat";

import type { SeededRNG } from "@/engine/core/rng";

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

    emitTechniqueCallout(s, family, attacker, tickSeed);
  }
}

/** W G — rare technique call-outs keyed on the engagement family. */
function emitTechniqueCallout(
  s: FrameState,
  family: string,
  attacker: Rikishi,
  tickSeed: string
): void {
  const { push } = s.p;
  const techRng = rngFromSeed(tickSeed, "pbp", "technique");
  if (techRng.next() >= NARRATIVE_TECHNIQUE_CHANCE) return;
  const techPath =
    family === "belt"
      ? techRng.next() < 0.5
        ? "combat.phases.technique.hazuoshi"
        : "combat.phases.technique.nodowa"
      : family === "speed"
        ? "combat.phases.technique.zotsu"
        : family === "trick"
          ? "combat.phases.technique.kaina_hineri"
          : null;
  if (!techPath) return;
  const techRes = BardEngine.resolve(techRng, techPath, {
    NAME: attacker.shikona,
    nameId: attacker.id,
  });
  push(techRes.text, "engagement");
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
    } else if (entry.data?.event === "matta") {
      // W Z — the false start was logged by physics but narrated as an
      // ordinary tachiai; give the reset its own line.
      push(
        BardEngine.resolve(rng, "combat.phases.tachiai.matta", {
          EAST: east.shikona,
          WEST: west.shikona,
          eastRikishiId: east.id,
          westRikishiId: west.id,
        }).text,
        "tachiai"
      );
    } else {
      const margin = (entry.data?.margin as number) ?? 0;
      const winnerSide = entry.data?.tachiaiWinner === "west" ? west : east;
      const loserSide = entry.data?.tachiaiWinner === "west" ? east : west;
      // W Z — "they go on mutual consent": rare broadcast flavor replacing
      // the ordinary tachiai line on a seeded roll.
      const tachiaiPath =
        rng.next() < NARRATIVE_MUTUAL_CONSENT_CHANCE &&
        BardEngine.has("combat.phases.tachiai.mutual_consent")
          ? "combat.phases.tachiai.mutual_consent"
          : "combat.phases.tachiai";
      const res = BardEngine.resolve(rng, tachiaiPath, {
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
      // W G — rare kachiage call-out on a decisive charge
      if (rng.next() < NARRATIVE_TECHNIQUE_CHANCE && margin > 10) {
        const kaRes = BardEngine.resolve(rng, "combat.phases.technique.kachiage", {
          NAME: winnerSide.shikona,
          nameId: winnerSide.id,
        });
        push(kaRes.text, "tachiai");
      }
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
      eastRightInside?: boolean;
      eastLeftInside?: boolean;
      westRightInside?: boolean;
      westLeftInside?: boolean;
      eastDepthFrom?: string;
      eastDepthTo?: string;
      westDepthFrom?: string;
      westDepthTo?: string;
    };
    if (gripData.type === "grip_class_shift") {
      // Determine which side had the notable transition
      const eastChanged = gripData.eastGripFrom !== gripData.eastGripTo;
      const side = eastChanged ? "east" : "west";
      const r = side === "east" ? east : west;
      const opp = side === "east" ? west : east;
      const from = side === "east" ? gripData.eastGripFrom : gripData.westGripFrom;
      const to = side === "east" ? gripData.eastGripTo : gripData.westGripTo;
      const oppTo = side === "east" ? gripData.westGripTo : gripData.eastGripTo;
      const rightInside = side === "east" ? gripData.eastRightInside : gripData.westRightInside;
      const leftInside = side === "east" ? gripData.eastLeftInside : gripData.westLeftInside;

      const gainedInside = to === "shitate" || to === "morozashi";
      const wasOutside = from === "uwate" || from === "outside";
      const pref = r.combatProfile?.preferredGrip;
      const matchedPreferred =
        gainedInside &&
        ((pref === "migi" && rightInside === true) || (pref === "hidari" && leftInside === true));
      const planBInside =
        gainedInside &&
        !matchedPreferred &&
        to !== "morozashi" &&
        (pref === "migi" || pref === "hidari") &&
        (rightInside === true || leftInside === true);
      const denied = gainedInside && (oppTo === "none" || oppTo === "outside");

      let gripPath: string | null = null;
      let gripTag: PbpTag | undefined;
      if (matchedPreferred) {
        gripPath = "combat.phases.grip_transition.favorite_grip";
        gripTag = "favorite_grip";
      } else if (planBInside) {
        gripPath = "combat.phases.grip_transition.plan_b_grip";
        gripTag = "plan_b_grip";
      } else if (wasOutside && gainedInside) {
        gripPath = "combat.phases.grip_transition.makikae";
        gripTag = "makikae";
      } else if (to === "morozashi") gripPath = "combat.phases.grip_transition.morozashi_gained";
      else if (from === "morozashi" && to !== "morozashi")
        gripPath = "combat.phases.grip_transition.morozashi_lost";
      else if (to === "uwate") gripPath = "combat.phases.grip_transition.uwate_gained";
      else if (from === "uwate" && to !== "uwate" && to !== "morozashi")
        gripPath = "combat.phases.grip_transition.uwate_lost";
      else if (denied) {
        gripPath = "combat.phases.grip_transition.grip_denied";
        gripTag = "grip_denied";
      }

      if (gripPath) {
        push(
          BardEngine.resolve(rng, gripPath, {
            NAME: r.shikona,
            rikishiId: r.id,
            OPP: opp.shikona,
            oppId: opp.id,
          }).text,
          "grip_transition" as PbpPhase,
          gripTag ? [gripTag] : undefined
        );
      }
    } else if (gripData.type === "depth_change") {
      // Only narrate depth changes occasionally to avoid spam
      if (rng.next() < NARRATIVE_DEPTH_CHANGE_CHANCE) {
        const eastMoved = gripData.eastDepthFrom !== gripData.eastDepthTo;
        const r = eastMoved ? east : west;
        const to = eastMoved ? gripData.eastDepthTo : gripData.westDepthTo;
        const depthPath =
          to === "deep" || to === "maemitsu"
            ? "combat.phases.grip_transition.deep_grip"
            : to === "shallow"
              ? "combat.phases.grip_transition.shallow_grip"
              : "combat.phases.grip_transition.depth_change";
        const depthTag =
          to === "deep" || to === "maemitsu"
            ? ("deep_grip" as PbpTag)
            : to === "shallow"
              ? ("shallow_grip" as PbpTag)
              : undefined;
        push(
          BardEngine.resolve(rng, depthPath, {
            NAME: r.shikona,
            rikishiId: r.id,
          }).text,
          "grip_transition" as PbpPhase,
          depthTag ? [depthTag] : undefined
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
      const sideR = crisisData.side === "east" ? east : west;
      // W G — defensive archetypes crab-walk along the rope
      if (
        sideR.combatProfile?.archetype === "defensive" &&
        rng.next() < NARRATIVE_TECHNIQUE_CHANCE
      ) {
        push(
          BardEngine.resolve(rng, "combat.phases.edge_crisis.crab_walk", {
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
}

function handleClinchToBeltFrame(s: FrameState, entry: BoutLogEntry, rng: SeededRNG): void {
  const { east, push, west } = s.p;
  if (entry.phase === "engagement" && entry.data?.event === "clinch_to_belt") {
    push(
      BardEngine.resolve(rng, "combat.phases.grip_transition.thrust_to_belt", {
        EAST: east.shikona,
        WEST: west.shikona,
        eastRikishiId: east.id,
        westRikishiId: west.id,
      }).text,
      "grip_transition",
      ["thrust_to_belt"]
    );
  }
}

function handleMizuIriFrame(s: FrameState, entry: BoutLogEntry, rng: SeededRNG): void {
  const { east, push, west } = s.p;
  if (entry.phase !== "mizu_iri") return;
  push(
    BardEngine.resolve(rng, "combat.phases.mizu_iri", {
      EAST: east.shikona,
      WEST: west.shikona,
      eastRikishiId: east.id,
      westRikishiId: west.id,
    }).text,
    "mizu_iri",
    ["mizu_iri", "drama"]
  );
}

function narrateFrameEntry(s: FrameState, entry: BoutLogEntry, idx: number): void {
  const { push, seed } = s.p;
  const tickSeed = `${seed}-tick-${(entry.data?.tick as number) || 0}-${idx}`;
  const rng = rngFromSeed(tickSeed, "pbp", "tick");

  if (entry.description) {
    push(entry.description, entry.phase as PbpPhase);
  }

  handleEngagementFrame(s, entry, rng, tickSeed);
  handleClinchToBeltFrame(s, entry, rng);
  handleTachiaiFrame(s, entry, rng);
  handleClinchFrame(s, entry, rng);
  handleMomentumFrame(s, entry, rng);
  handleFatigueFrame(s, entry, rng);
  handleBoutInjuryFrame(s, entry, rng);
  handleMomentumShiftFrame(s, entry, rng);
  handleGripTransitionFrame(s, entry, rng);
  handleMizuIriFrame(s, entry, rng);
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
