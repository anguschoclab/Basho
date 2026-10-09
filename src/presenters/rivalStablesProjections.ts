/**
 * rivalStablesProjections.ts — projects rival stable data for UI.
 *
 * Avoids direct world.heyas access from pages by wrapping it in a presenter.
 *
 * WS7 — banded rival intel. Honest uncertainty contract:
 *   - tenureSummary + factionPosture + planId come from public record
 *     (tenure ledger, governance rulings, the surfaced feed) — always shown.
 *   - archetypeLabel + mood are private managerial identity — revealed only
 *     when the player has scouting coverage of that stable's roster.
 *   - No raw trait numbers ever reach the DTO.
 */
import type { WorldState } from "../engine/types/world";
import type { NPCDecisionDTO } from "./npcAgentProjections";
import { getOyakataForHeya } from "../engine/queries";

export interface RivalStableDTO {
  heyaId: string;
  heyaName: string;
  ichimon?: string;
  legacyTier?: string;
  decisionCount: number;
  recentDecisions: NPCDecisionDTO[];
  /** Whether the player has scouting coverage of this stable's roster. */
  scouted: boolean;
  /** Oyakata archetype label — only when scouted. */
  archetypeLabel?: string;
  /** Qualitative oyakata mood — only when scouted. */
  mood?: string;
  /** Public tenure record summary ("12 basho in charge · 2 yusho"). */
  tenureSummary?: string;
  /** Current ichimon posture, public once elected. */
  factionPosture?: string;
  /** Most recent surfaced strategic plan id, if any. */
  planId?: string;
}

export interface RivalStablesProjection {
  rivals: RivalStableDTO[];
  hasRivals: boolean;
}

/** Player scouting coverage of a rival stable's roster. */
function hasScoutingCoverage(world: WorldState, heyaId: string): boolean {
  const scouting = world.playerKnowledge?.scouting;
  if (!scouting) return false;
  return Object.values(scouting).some(
    (s) => s.publicInfo?.heyaId === heyaId && (s.timesObserved ?? 0) > 0
  );
}

/** Public tenure record — banded text, never raw internals. */
function tenureSummary(world: WorldState, heyaId: string): string | undefined {
  const oya = getOyakataForHeya(world, heyaId);
  if (!oya) return undefined;
  const tenure = oya.tenure;
  if (tenure && tenure.bashoServed > 0) {
    const yusho = tenure.championships > 0 ? ` · ${tenure.championships} yusho` : "";
    return `${tenure.bashoServed} basho in charge${yusho}`;
  }
  if ((oya.yearsInCharge ?? 0) > 0) {
    return `${oya.yearsInCharge} years in charge`;
  }
  return undefined;
}

export function projectRivalStables(
  world: WorldState,
  npcDecisions: NPCDecisionDTO[],
  decisionsByHeya: Record<string, number>
): RivalStablesProjection {
  const rivals: RivalStableDTO[] = [];

  for (const heya of world.heyas.values()) {
    if (heya.id === world.playerHeyaId) continue;
    const recentDecisions = npcDecisions.filter((d) => d.heyaId === heya.id);
    const scouted = hasScoutingCoverage(world, heya.id);
    const oyakata = scouted ? getOyakataForHeya(world, heya.id) : undefined;
    const posture = heya.ichimon
      ? world.factionPostures?.[heya.ichimon]?.posture
      : undefined;
    rivals.push({
      heyaId: heya.id,
      heyaName: heya.name,
      ichimon: heya.ichimon,
      legacyTier: heya.legacyTier,
      decisionCount: decisionsByHeya[heya.id] ?? 0,
      recentDecisions,
      scouted,
      archetypeLabel: scouted ? oyakata?.archetype : undefined,
      mood: scouted ? oyakata?.mood : undefined,
      tenureSummary: tenureSummary(world, heya.id),
      factionPosture: posture,
      planId: recentDecisions.find((d) => d.planId)?.planId,
    });
  }

  return {
    rivals,
    hasRivals: rivals.length > 0,
  };
}
