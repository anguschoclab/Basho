import { generateNarrative } from "@/engine/narrative";
import { rngFromSeed } from "../rng";
import type { Rikishi } from "../types/rikishi";
import type { BoutResult, BashoName } from "../types/basho";
import type { WorldState } from "../types/world";
import { BardEngine } from "../bard/BardEngine";
import { BloodlineService } from "../systems/legacy/BloodlineService";

export type PbpLine = {
  text: string;
  id: string;
  /** Optional phase metadata used by the narrative modal for styling */
  phase?: string;
  /** Optional tags rendered as small icons under the line */
  tags?: string[];
};

/**
 * Pure translator function. Consumes raw physics frames and maps them
 * to the Bard Engine for narrative generation.
 */
export function generateBoutNarrative(
  result: BoutResult,
  east: Rikishi,
  west: Rikishi,
  bashoName: BashoName | undefined,
  day: number,
  seed: string,
  world: WorldState
): void {
  const pbpLines: PbpLine[] = [];

  // 0. Dynasty Narrative (before ritual)
  const eastAncestor = BloodlineService.checkDynastyNarrative(east, world);
  const westAncestor = BloodlineService.checkDynastyNarrative(west, world);
  if (eastAncestor || westAncestor) {
    const dynastyRng = rngFromSeed(seed, "pbp", "dynasty");
    const rikishiWithDynasty = eastAncestor ? east : west;
    const ancestor = eastAncestor || westAncestor;
    if (ancestor) {
      pbpLines.push({
        text: BardEngine.resolve(dynastyRng, "dynasty.bout_opening", {
          RIKISHI: rikishiWithDynasty.shikona,
          ANCESTOR: ancestor,
        }).text,
        id: `${result.boutId}-dynasty`,
        tags: ["dynasty"],
      });
    }
  }

  // 0.5. Drama-aware opening line (if dramaticContext exists)
  const match = world.currentBasho?.matches.find((m) => m.boutId === result.boutId);
  if (match?.dramaticContext && match.dramaticContext.score > 0) {
    const dramaRng = rngFromSeed(seed, "pbp", "drama");
    const dramaPath = `combat.drama.${match.dramaticContext.label}` as const;
    const dramaRes = BardEngine.resolve(dramaRng, dramaPath, {
      east: east.shikona,
      west: west.shikona,
    });
    pbpLines.push({
      text: dramaRes.text,
      id: `${result.boutId}-drama`,
      tags: ["drama"],
    });
  }

  // 1. Initial Narrative (Ritual)
  if (result.log.length > 0) {
    const ritualRng = rngFromSeed(seed, "pbp", "ritual");
    pbpLines.push({
      text: BardEngine.resolve(ritualRng, "combat.phases.ritual.entrance", {
        east: east.shikona,
        west: west.shikona,
      }).text,
      id: `${result.boutId}-ritual-1`,
    });
    pbpLines.push({
      text: BardEngine.resolve(ritualRng, "combat.phases.ritual.shikiri", {}).text,
      id: `${result.boutId}-ritual-2`,
    });
  }

  // 2. Process Log Frames
  result.log.forEach((entry, idx) => {
    const tickSeed = `${seed}-tick-${(entry.data?.tick as number) || 0}-${idx}`;
    const rng = rngFromSeed(tickSeed, "pbp", "tick");

    if (entry.description) {
      pbpLines.push({ text: entry.description, id: `${result.boutId}-desc-${idx}`, phase: entry.phase });
    }

    // 1.75D engagement narrative: tickPushBattle/tickBeltBattle emit "engagement"
    // entries every NARRATIVE_TICK_CADENCE ticks, tagged with the combat family
    // (push|belt), the attacking side, and the force/torque differential. Map the
    // differential magnitude to a narrative intensity and resolve the matching
    // combat.phases.engagement.<family> template.
    if (entry.phase === "engagement" && typeof entry.data?.family === "string") {
      const family = entry.data.family as "push" | "belt" | "speed" | "trick";
      const attacker = entry.data.attackerSide === "west" ? west : east;
      const defender = entry.data.attackerSide === "west" ? east : west;
      const differential =
        family === "belt"
          ? Math.abs((entry.data.torqueAdvantage as number) ?? 0)
          : Math.abs((entry.data.forceDiff as number) ?? 0);
      // Force/torque differentials run roughly 0–40 on the stat scale; map onto 1–3.
      const intensity = BardEngine.calculateIntensity(differential, [0, 40]);

      const res = BardEngine.resolve(rng, `combat.engagement.${family}`, {
        attacker: attacker.shikona,
        defender: defender.shikona,
        intensity,
      });
      if (res.text) {
        pbpLines.push({ text: res.text, id: `${result.boutId}-eng-${idx}`, phase: "engagement" });
      }
    }

    if (entry.phase === "tachiai") {
      if (entry.data?.event === "henka_success") {
        // Henka is a sidestep trick — narrate it from the trick engagement family.
        const attacker = entry.data.attackerSide === "west" ? west : east;
        const defender = entry.data.attackerSide === "west" ? east : west;
        const res = BardEngine.resolve(rng, "combat.engagement.trick", {
          attacker: attacker.shikona,
          defender: defender.shikona,
          intensity: 3,
        });
        if (res.text) {
          pbpLines.push({ text: res.text, id: `${result.boutId}-henka`, phase: "tachiai" });
        }
      } else {
        // The opening clash. Intensity scales with how decisive it was.
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
        });
        if (res.text) {
          pbpLines.push({ text: res.text, id: `${result.boutId}-tachiai-${idx}`, phase: "tachiai" });
        }
      }
    }

    // Edge crisis handling for B+ spatial system
    if (entry.phase === "edge_crisis") {
      const crisisData = entry.data as {
        side?: "east" | "west";
        escaped?: boolean;
        recoveryProbability?: number;
        tawaraToePosition?: number;
        forced?: boolean;
      };
      const sideName = crisisData.side === "east" ? east.shikona : west.shikona;
      const toePos = crisisData.tawaraToePosition ?? 0;

      if (crisisData.escaped) {
        // Fighter claws back from the brink
        pbpLines.push({
          text: BardEngine.resolve(rng, "combat.phases.edge_crisis.recovery", { NAME: sideName })
            .text,
          id: `${result.boutId}-edge-crisis-recovery-${idx}`,
        });
      } else if (
        crisisData.forced ||
        (crisisData.recoveryProbability !== undefined && crisisData.recoveryProbability < 0.2)
      ) {
        // forced: true — toe past 1.5, no return possible.
        // Low recovery prob — bout ends here.
        pbpLines.push({
          text: BardEngine.resolve(rng, "combat.phases.edge_crisis.failure", { NAME: sideName })
            .text,
          id: `${result.boutId}-edge-crisis-failure-${idx}`,
        });
      } else if (toePos > 0.6) {
        // Deep on the tawara — use the high-drama tawara_drama template
        pbpLines.push({
          text: BardEngine.resolve(rng, "combat.phases.edge_crisis.tawara_drama", {
            NAME: sideName,
          }).text,
          id: `${result.boutId}-edge-crisis-drama-${idx}`,
        });
      } else {
        // Standard edge approach — fighter just reached the tawara zone
        pbpLines.push({
          text: BardEngine.resolve(rng, "combat.phases.edge_crisis.approach", { NAME: sideName })
            .text,
          id: `${result.boutId}-edge-crisis-approach-${idx}`,
        });
      }
    }
  });

  // 2b. Finishing technique — narrate the decisive kimarite (including the
  // emergent 1.75D techniques such as utchari/tsukiotoshi/okuridashi) from its
  // per-technique template, falling back to the generic finish line.
  if (result.kimarite) {
    const finishRng = rngFromSeed(seed, "pbp", "finish");
    const winnerName = result.winner === "east" ? east.shikona : west.shikona;
    const loserName = result.winner === "east" ? west.shikona : east.shikona;
    const techPath = `combat.kimarite.${result.kimarite}`;
    const path = BardEngine.has(techPath) ? techPath : "combat.phases.finish";
    const res = BardEngine.resolve(finishRng, path, {
      winner: winnerName,
      loser: loserName,
      kimarite: result.kimariteName ?? result.kimarite,
      east: east.shikona,
      west: west.shikona,
    });
    if (res.text) {
      pbpLines.push({ text: res.text, id: `${result.boutId}-finish`, phase: "finish" });
    }
  }

  // 3. Special Awards
  if (result.awardFact === "kinboshi" || result.awardFact === "ginboshi") {
    const awardRng = rngFromSeed(seed, "pbp", "award");
    const winnerName = result.winner === "east" ? east.shikona : west.shikona;
    pbpLines.push({
      text: BardEngine.resolve(awardRng, `combat.finish.${result.awardFact}`, {
        winner: winnerName,
      }).text,
      id: `${result.boutId}-${result.awardFact}`,
    });
  }

  result.pbpLines = pbpLines;
  result.pbp = pbpLines.map((l) => l.text);
  result.narrative = bashoName ? generateNarrative(east, west, result, bashoName, day) : [];
}
