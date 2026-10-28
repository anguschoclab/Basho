import type { WorldState } from "@/engine/types/world";
import type { BashoState } from "@/engine/types/basho";
import type { BanzukeEntry } from "@/engine/types/banzuke";
import { updateBanzuke } from "@/engine/banzuke/banzukeOps";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import { buildBanzukeSnapshot } from "@/engine/banzuke/banzukeSnapshot";
import {
  bashoKeyForRecord,
  createEmptyHistoryIndex,
  indexBashoResult,
  makeBashoKey,
} from "@/engine/history/historyIndex";
import { enterInterim } from "@/engine/tick/tickDaily";
import { getNextBasho, getBashoNumber } from "@/engine/calendar/calendar";

type Builder = ReturnType<typeof createImpactBuilder>;
type BanzukeResult = ReturnType<typeof updateBanzuke>;

/**
 * Banzuke snapshot persistence + interim transition.
 *
 * Freezes the banzuke this publish produced (world.currentBanzuke +
 * history[last].nextBanzuke) and registers it in the history index keyed by
 * the producing basho — the convention indexBashoResult and RecapPage's
 * previous-basho lookup already use. The snapshot's own year/bashoNumber
 * describe the basho the banzuke applies to (the upcoming one), so the
 * fought-on snapshot for the completed basho is self-healed under the
 * previous basho's key when absent (inaugural basho / legacy worlds).
 */
export function persistBanzukeSnapshot(
  world: WorldState,
  lastBasho: BashoState,
  result: BanzukeResult,
  currentBanzukeList: BanzukeEntry[],
  builder: Builder
): void {
  const next = getNextBasho(lastBasho.bashoName);
  const completedBashoNumber = lastBasho.bashoNumber;
  const history = world.history ?? [];

  // Locate the completed basho's record by (year, bashoNumber) — not by
  // position. recordBashoHistory lands last today, but any writer between
  // conclude and publish must not have its record clobbered (or the patch
  // silently lost). V14-R02: the record's occurrence among same-(year,
  // bashoNumber) records determines its disambiguated `#N` basho key.
  let recordIdx = -1;
  for (let i = history.length - 1; i >= 0; i--) {
    const r = history[i];
    if (r && r.year === lastBasho.year && r.bashoNumber === completedBashoNumber) {
      recordIdx = i;
      break;
    }
  }

  const completedKey =
    recordIdx >= 0
      ? bashoKeyForRecord(world, history[recordIdx])
      : makeBashoKey(lastBasho.year, completedBashoNumber);

  // Previous-basho key: prefer the record immediately preceding the completed
  // one so duplicate same-year keys (`2026-1` vs `2026-1#2`) stay coherent.
  const prevRecord = recordIdx > 0 ? history[recordIdx - 1] : undefined;
  const prevYear = completedBashoNumber === 1 ? lastBasho.year - 1 : lastBasho.year;
  const prevBashoNumber = (completedBashoNumber === 1 ? 6 : completedBashoNumber - 1) as
    1 | 2 | 3 | 4 | 5 | 6;
  const prevKey = prevRecord
    ? bashoKeyForRecord(world, prevRecord)
    : makeBashoKey(prevYear, prevBashoNumber);

  const nextYear = next === "hatsu" ? lastBasho.year + 1 : lastBasho.year;
  const newSnapshot = buildBanzukeSnapshot(result.newBanzuke, nextYear, getBashoNumber(next));
  const foughtOnSnapshot = buildBanzukeSnapshot(
    currentBanzukeList,
    lastBasho.year,
    completedBashoNumber
  );

  builder.updateWorldField("currentBanzuke", newSnapshot);

  const idx = structuredClone(world.historyIndex ?? createEmptyHistoryIndex());
  if (recordIdx >= 0) {
    const patchedResult = { ...history[recordIdx], nextBanzuke: newSnapshot };
    builder.updateWorldField("history", [
      ...history.slice(0, recordIdx),
      patchedResult,
      ...history.slice(recordIdx + 1),
    ]);
    // indexBashoResult mutates the index object in place (basho summary,
    // nextBanzuke registration, per-rikishi entries) — point it at the clone.
    indexBashoResult({ ...world, historyIndex: idx }, patchedResult);
  }
  idx.banzukeByBasho[prevKey] ??= foughtOnSnapshot;
  idx.banzukeByBasho[completedKey] = newSnapshot;
  const bashoSummary = idx.basho[completedKey];
  if (bashoSummary) bashoSummary.hasBanzukeSnapshot = true;
  builder.updateWorldField("historyIndex", idx);

  builder.updateWorldField("currentBashoName", next);
  builder.updateWorldField("currentBasho", undefined);

  const interimWorld = enterInterim({
    ...world,
    currentBashoName: next,
    currentBasho: undefined,
  });

  builder.updateWorldField("cyclePhase", interimWorld.cyclePhase);
  builder.updateWorldField("_interimDaysRemaining", interimWorld._interimDaysRemaining);
}
