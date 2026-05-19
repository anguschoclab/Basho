import { TickResolutionEvent } from "../types/combat";
import { generateNarrative } from "../narrative";
import { rngFromSeed } from "../rng";
import type { Rikishi } from "../types/rikishi";
import type { BoutResult, BashoName } from "../types/basho";
import type { WorldState } from "../types/world";
import { BardEngine } from "../narrative/BardEngine";
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

    if (
      (entry.phase === "engagement" || entry.phase === "tachiai") &&
      entry.data?.tickResolutionEvent
    ) {
      const event = entry.data.tickResolutionEvent as TickResolutionEvent;
      // Using powerDifferential as a proxy for intensity if momentum is not explicit
      const intensity = BardEngine.calculateIntensity(event.powerDifferential ?? 0.5);

      const path =
        entry.phase === "tachiai"
          ? "combat.phases.tachiai"
          : `combat.phases.engagement.${event.action.family}`;

      const res = BardEngine.resolve(rng, path, {
        attacker: event.attacker.shikona,
        defender: event.defender.shikona,
        winner: event.attacker.shikona, // For tachiai win
        intensity,
        ...event.context,
      });

      pbpLines.push({ text: res.text, id: `${result.boutId}-${idx}` });
    }

    if (entry.phase === "tachiai" && entry.data?.event === "henka_success") {
      pbpLines.push({
        text: BardEngine.resolve(rng, "combat.phases.tachiai.henka", {
          attacker: east.shikona,
          defender: west.shikona,
        }).text,
        id: `${result.boutId}-henka`,
      });
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
