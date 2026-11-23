/**
 * resolution/officiating.ts
 * =========================
 * Post-physics officiating: kinjite foul suspicion → shimpan-panel review
 * (confirm → hansoku flip / clear → call stands), the fouled-heya scandal,
 * and yaocho (match-fixing) detection.
 *
 * Foul review requires a real officials pool (5+ shimpan) so NPC-vs-NPC
 * bouts can produce the full mono-ii → hansoku arc, while world-less
 * simulation/measurement harnesses stay foul-free. Yaocho remains
 * player-bout-gated.
 */

import type { BoutContext } from "@/engine/bout/boutPhysics";
import type { Rikishi } from "@/engine/types/rikishi";
import type { BashoState, BoutResult } from "@/engine/types/basho";
import type { WorldState } from "@/engine/types/world";
import type { BoutTactic, KimariteId } from "@/engine/types/combat";
import type { ImpactBuilder } from "@/engine/core/ImpactBuilder";
import type { Side } from "@/engine/types/banzuke";
import { rollFoulSuspicion, resolveFoulVerdict } from "@/engine/bout/kinjite";
import { assembleShimpanPanel } from "@/engine/officials/GyojiService";
import { checkYaocho } from "@/engine/bout/yaocho";
import { reportScandal } from "@/engine/governance/services/ScandalService";
import { FOUL_REVIEW_MIN_SHIMPAN, KINJITE_FOUL_EXCITEMENT_BONUS } from "@/constants/engine/bout";

interface OfficiatingOutcome {
  result: BoutResult;
  /** Heya that loses a rikishi to hansoku, when a foul was confirmed. */
  fouledHeyaId: string | null;
  /** Whether the bout was a player bout (yaocho detection enabled). */
  enableYaocho: boolean;
  /** Deterministic seed stem used for kinjite and yaocho rolls. */
  hansokuSeed: string;
}

/**
 * Run the kinjite foul-review path and, when enabled, merge the fouled-heya
 * scandal and the yaocho detection impact into the bout builder.
 */
export function applyOfficiating(
  bout: BoutContext,
  physicsResult: BoutResult,
  eastBout: Rikishi,
  westBout: Rikishi,
  basho: BashoState,
  eastTactic: BoutTactic | undefined,
  westTactic: BoutTactic | undefined,
  world: WorldState | undefined,
  builder: ImpactBuilder
): OfficiatingOutcome {
  // 1.5. Kinjite foul review — a high-aggression/low-technique apparent
  // winner may have committed a forbidden act. The shimpan panel (not a
  // silent roll) decides: confirmed → hansoku flip; cleared → call stands.
  // Requires a panelable officials pool — world-less harnesses can't
  // convene judges, so they never see fouls.
  const hansokuSeed = `${basho.id ?? "basho"}-${bout.id}-kinjite`;
  if (physicsResult.isDraw) {
    const drawResult =
      eastTactic || westTactic
        ? { ...physicsResult, tactics: { east: eastTactic, west: westTactic } }
        : physicsResult;
    return { result: drawResult, fouledHeyaId: null, enableYaocho: false, hansokuSeed };
  }

  const shimpanPool = world?.shimpanPool ?? [];
  const suspicion =
    shimpanPool.length >= FOUL_REVIEW_MIN_SHIMPAN
      ? rollFoulSuspicion(bout, physicsResult, eastBout, westBout, basho, hansokuSeed)
      : null;

  let result = physicsResult;
  let fouledHeyaId: string | null = null;
  if (suspicion) {
    const panel = assembleShimpanPanel(shimpanPool, physicsResult.boutId);
    if (panel) {
      const confirmed = resolveFoulVerdict(suspicion, panel, hansokuSeed);
      result = {
        ...physicsResult,
        monoii: true,
        foulReview: {
          foul: suspicion.foul,
          suspectRikishiId: suspicion.suspectRikishiId,
          victimRikishiId: suspicion.victimRikishiId,
          suspectSide: suspicion.suspectSide,
          confirmed,
          apparentKimarite: physicsResult.kimarite as KimariteId,
        },
      };
      if (confirmed) {
        const newWinnerSide: Side = suspicion.suspectSide === "east" ? "west" : "east";
        const newWinner = newWinnerSide === "east" ? eastBout : westBout;
        const newLoser = suspicion.suspectSide === "east" ? eastBout : westBout;
        result = {
          ...result,
          winner: newWinnerSide,
          winnerRikishiId: newWinner.id,
          loserRikishiId: newLoser.id,
          kimarite: "hansoku",
          kimariteName: "Hansoku",
          upset: true,
          excitementScore: Math.min(
            100,
            (result.excitementScore ?? 50) + KINJITE_FOUL_EXCITEMENT_BONUS
          ),
          log: [
            ...result.log,
            {
              phase: "finish",
              data: {
                event: "hansoku",
                fouledRikishiId: suspicion.suspectRikishiId,
                foul: suspicion.foul,
              },
            },
          ],
        };
        fouledHeyaId = newLoser.heyaId ?? null;
      }
    }
  }

  // Record resolved per-side tactics for observability, UI, and tests.
  if (eastTactic || westTactic) {
    result.tactics = { east: eastTactic, west: westTactic };
  }

  // Trigger a discipline note for the disqualified rikishi's heya. A hansoku is
  // a sporting foul — a routine disqualification loss — not stable misconduct;
  // "minor" keeps the discipline record without bumping tenure.majorScandals
  // (a "major" report on every NPC foul mass-fired masters via the §16.1
  // scandal trigger and churned trustees until stables folded).
  if (fouledHeyaId && world) {
    const scandalImpact = reportScandal(
      world,
      fouledHeyaId,
      "minor",
      "Forbidden technique (hansoku) disqualification"
    );
    builder.merge(scandalImpact);
  }

  // 1.6. Yaocho (match-fixing) detection — stays player-bout-gated to keep
  // long autosims free of match-fixing noise in NPC-only results.
  const enableYaocho = bout.playerSide !== undefined;
  if (world && enableYaocho) {
    const yaochoImpact = checkYaocho(world, result, basho, bout.day ?? 1, `${hansokuSeed}-yaocho`);
    builder.merge(yaochoImpact);
  }

  return { result, fouledHeyaId, enableYaocho, hansokuSeed };
}
