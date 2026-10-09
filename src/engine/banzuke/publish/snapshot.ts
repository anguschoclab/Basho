import type { WorldState } from "../../types/world";
import type { BashoState } from "../../types/basho";
import type { BanzukeEntry } from "../../banzuke";
import { updateBanzuke } from "../../banzuke";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import { buildBanzukeSnapshot } from "../banzukeSnapshot";
import { createEmptyHistoryIndex, indexBashoResult, makeBashoKey } from "../../historyIndex";
import { enterInterim } from "../../tick/tickDaily";
import { getNextBasho, getBashoNumber } from "../../calendar";

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
  const completedKey = makeBashoKey(lastBasho.year, completedBashoNumber);
  const prevYear = completedBashoNumber === 1 ? lastBasho.year - 1 : lastBasho.year;
  const prevBashoNumber = (completedBashoNumber === 1 ? 6 : completedBashoNumber - 1) as
    1 | 2 | 3 | 4 | 5 | 6;
  const prevKey = makeBashoKey(prevYear, prevBashoNumber);

  const nextYear = next === "hatsu" ? lastBasho.year + 1 : lastBasho.year;
  const newSnapshot = buildBanzukeSnapshot(result.newBanzuke, nextYear, getBashoNumber(next));
  const foughtOnSnapshot = buildBanzukeSnapshot(
    currentBanzukeList,
    lastBasho.year,
    completedBashoNumber
  );

  builder.updateWorldField("currentBanzuke", newSnapshot);

  const idx = structuredClone(world.historyIndex ?? createEmptyHistoryIndex());
  const lastResult = world.history[world.history.length - 1];
  if (lastResult) {
    const patchedResult = { ...lastResult, nextBanzuke: newSnapshot };
    builder.updateWorldField("history", [...world.history.slice(0, -1), patchedResult]);
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
