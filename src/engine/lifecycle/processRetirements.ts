/**
 * processRetirements.ts
 * =====================
 * Unified retirement processor — the single implementation for every path that
 * retires a rikishi:
 *
 *   - endBasho → runPostBashoResolution (player flow, basho-end batch)
 *   - phase01_week_governance → post_basho weekly tick (stragglers, AutoSim)
 *   - tickMonthlyNPC → npcRetirementStrategy (NPC stables, monthly)
 *
 * Every retirement emits the complete bookkeeping so no caller can skip
 * side-effects:
 *   1. retireRikishi — flags + move to historical + activeRikishiIds removal
 *   2. LIFECYCLE_EVENT (career) — canonical user-facing event (presenters/UI)
 *   3. RETIREMENT_ANNOUNCED (narrative) — feed for the bard (phase06_narrative)
 *   4. onRikishiRetired — records.active leaderboard cleanup
 *   5. cold-storage archive of the full career record
 *   6. retiree → oyakata conversion (+ RNG-gated stable founding)
 *   7. LegacyService bloodline trait for accomplished retirees
 */

import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import type { ImpactBuilder } from "@/engine/core/ImpactBuilder";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import type { StateImpact } from "@/engine/core/StateImpact";
import { checkRetirement } from "@/engine/lifecycle/retirementCheck";
import { generateRetirementNarrative } from "@/engine/lifecycle/retirementNarrative";
import { processRetireeOyakataConversion } from "@/engine/lifecycle/retireeOyakataConversion";
import { LegacyService } from "@/engine/legacy/LegacyService";
import { onRikishiRetired } from "@/engine/history/records";
import { getRikishi } from "@/engine/core/queries";
import { opfsArchiveService } from "@/engine/persistence/storage/opfsArchive";
import { electronArchiveService } from "@/engine/persistence/storage/electronArchive";
import { warn } from "@/engine/utils/Logger";

/**
 * Archive a retiring rikishi's full record to cold storage.
 * Fire-and-forget: failures are logged but do not block retirement.
 * The full record remains in world.historicalRikishi until year-end summarization,
 * so a failure here means the summary will still be produced but the full career
 * detail will not be retrievable from cold storage.
 */
export function archiveRikishiToColdStorage(rikishi: Rikishi): void {
  const archiveService =
    typeof window !== "undefined" && window.__ELECTRON__ === true
      ? electronArchiveService
      : opfsArchiveService;

  // Fire-and-forget; errors are caught and logged.
  archiveService.archiveFullRikishiRecord(rikishi.id, rikishi).catch((err) => {
    warn(
      `Cold-storage archival failed for rikishi ${rikishi.id} (${rikishi.shikona}). ` +
        `Full career detail will not be retrievable from cold storage. ` +
        `Summary conversion at year-end will still proceed.`,
      "CareerService",
      err
    );
  });
}

/**
 * Retire one rikishi with the complete bookkeeping. Every retirement path
 * (checkRetirement-driven or a forced decision like the NPC stable-restructure
 * rule) must go through here so the event feed, leaderboards, cold archive,
 * oyakata succession pool, and legacy traits stay consistent.
 */
export function retireRikishiFully(
  world: WorldState,
  rikishi: Rikishi,
  reason: string,
  builder: ImpactBuilder
): void {
  const id = rikishi.id;
  const careerWins = rikishi.careerWins ?? 0;
  const careerLosses = rikishi.careerLosses ?? 0;
  const yearsActive = world.year - rikishi.birthYear - 15;
  const yushoCount = (rikishi.careerHistory ?? []).reduce(
    (acc, h) => acc + (h.isYusho ? 1 : 0),
    0
  );
  const kinboshiCount = rikishi.economics?.kinboshiCount ?? 0;
  const retirementNarrative = generateRetirementNarrative(
    rikishi,
    world,
    `retirement-${id}-${world.year}`
  );

  builder.retireRikishi(id, world.year, reason);

  // Canonical career event — consumed by presenters/UI (npcAgentProjections etc.)
  builder.logEvent(
    "LIFECYCLE_EVENT",
    "career",
    {
      rikishiId: id,
      heyaId: rikishi.heyaId,
      shikona: rikishi.shikona ?? rikishi.name ?? id,
      status: "retirement",
      reason,
      careerWins,
      careerLosses,
      highestRank: rikishi.rank,
      yushoCount,
      kinboshiCount,
      yearsActive,
      careerPhase: rikishi.declinePhase ?? "twilight",
      origin: rikishi.origin ?? "Japan",
      retirementNarrative,
    },
    { heyaId: rikishi.heyaId, rikishiId: id, importance: "headline" }
  );

  // Bard feed — phase06_narrative scans for this type to drive news generation.
  builder.logEvent(
    "RETIREMENT_ANNOUNCED",
    "narrative",
    {
      rikishiId: id,
      incident: `${rikishi.shikona} has announced their retirement (intai).`,
      rankAtRetirement: rikishi.rank,
      careerWins,
      careerLosses,
      careerBouts: careerWins + careerLosses,
      bashoCount: rikishi.careerHistory?.length ?? 0,
      division: rikishi.division ?? "makushita",
      age: world.year - rikishi.birthYear,
      retirementReason: reason,
      yushoCount,
      kinboshiCount,
      yearsActive,
      careerPhase: rikishi.declinePhase ?? "twilight",
      origin: rikishi.origin ?? "Japan",
      retirementNarrative,
    },
    {
      heyaId: rikishi.heyaId,
      importance: rikishi.division === "makuuchi" ? "major" : "notable",
    }
  );

  // Remove the retiree from the active records leaderboards.
  builder.merge(onRikishiRetired(world, id));

  // Archive full record to cold storage (fire-and-forget).
  // The full Rikishi remains in historicalRikishi until year-end summarization,
  // so the retirement ceremony UI still has access to a full object.
  archiveRikishiToColdStorage(rikishi);

  // Constitution 2.3 & 61: Oyakata conversion + (RNG-gated) stable founding.
  processRetireeOyakataConversion(world, rikishi, builder);

  // Register bloodline trait if the retiree was accomplished (yokozuna/ozeki/sekiwake)
  builder.merge(LegacyService.registerLegacyTrait(world, rikishi));
}

/**
 * Evaluates checkRetirement across the active roster and processes every
 * eligible retirement through retireRikishiFully. Returns the merged impact
 * plus per-heya vacancy counts for the recruitment window.
 */
export function processAllRetirements(world: WorldState): {
  impact: StateImpact;
  vacanciesByHeyaId: Record<string, number>;
} {
  const builder = createImpactBuilder("processRetirements");
  const vacanciesByHeyaId: Record<string, number> = {};

  for (const rikishiId of world.activeRikishiIds) {
    const rikishi = getRikishi(world, rikishiId);
    if (!rikishi) continue;
    const reason = checkRetirement(rikishi, world.year, world.seed);
    if (!reason) continue;
    retireRikishiFully(world, rikishi, reason, builder);
    vacanciesByHeyaId[rikishi.heyaId] = (vacanciesByHeyaId[rikishi.heyaId] ?? 0) + 1;
  }

  return { impact: builder.build(), vacanciesByHeyaId };
}
