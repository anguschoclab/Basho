/**
 * resolution/gyoji.ts
 * ===================
 * Gyoji officiation, split into the three stages resolveBout sequences:
 *
 * 1. `assignGyojiAndResolveVerdict` — pick the official (importance graded
 *    on rank/day, not post-hoc stakes flags) and resolve any mono-ii
 *    verdict through the shimpan panel.
 * 2. `applyMonoiiVerdict` (resolution/monoiiVerdict.ts) — apply the
 *    verdict to the result (sashichigae flip / torinaoshi rerun).
 * 3. `recordGyojiAftermath` — record career stats on the FINAL result.
 *
 * `applyGyojiOfficiation` remains as the composed one-call wrapper for
 * direct callers (tests, tooling) that want assignment + verdict +
 * recording in one step. It cannot run torinaoshi (no physics context) —
 * a "rematch" outcome stays as metadata there.
 */

import type { BashoState, BoutResult } from "@/engine/types/basho";
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import type { Gyoji, ShimpanPanel } from "@/engine/types/gyoji";
import type { BoutContext } from "@/engine/bout/boutPhysics";
import type { ImpactBuilder } from "@/engine/core/ImpactBuilder";
import { DEFAULT_START_YEAR } from "@/constants/engine/calendar";
import { rngFromSeed } from "@/engine/core/rng";
import { DEFAULT_DAY } from "@/constants/engine/physics";
import { FOUL_REVIEW_MIN_SHIMPAN, MISSED_CALL_REVERSAL_BONUS } from "@/constants/engine/bout";
import { RANK_HIERARCHY } from "@/engine/types/banzuke";
import {
  assignGyojiToBout,
  recordGyojiBout,
  assembleShimpanPanel,
} from "@/engine/officials/GyojiService";
import { resolveMonoii } from "@/engine/types/gyoji";
import { flipResultWinner } from "@/engine/bout/resolution/monoiiVerdict";

/**
 * Bout importance graded on the bout's own profile — the higher-ranked
 * participant's tier plus the day number. Independent of stakes flags so
 * it is valid BEFORE enrichment runs.
 */
export function boutImportanceForBout(east: Rikishi, west: Rikishi, day: number): number {
  const minTier = Math.min(RANK_HIERARCHY[east.rank].tier, RANK_HIERARCHY[west.rank].tier);
  let importance = minTier <= 2 ? 85 : minTier <= 4 ? 65 : 50;
  if (day >= 15) importance += 10;
  else if (day >= 13) importance += 5;
  return importance;
}

/** Deterministic mono-ii roll, seeded from the bout + panel chief. */
function monoiiRoll(boutId: string, chiefId: string): { next: () => number } {
  const rng = rngFromSeed(`${boutId}-${chiefId}`, "monoii", "roll");
  return {
    next: () => rng.next(),
  };
}

/**
 * Assign a gyoji and resolve any mono-ii verdict.
 * Sets `result.gyojiId`, `result.shimpanPanelIds`, `result.monoiiOutcome`.
 * Does NOT record career stats — that is `recordGyojiAftermath`, which
 * must run after the verdict is applied to the result.
 */
export function assignGyojiAndResolveVerdict(
  world: WorldState | undefined,
  result: BoutResult,
  bout?: BoutContext,
  east?: Rikishi,
  west?: Rikishi
): { gyoji?: Gyoji; panel?: ShimpanPanel | null } {
  if (!world?.gyojiPool || world.gyojiPool.length === 0) return {};

  const boutImportance =
    east && west
      ? boutImportanceForBout(east, west, bout?.day ?? result.day ?? DEFAULT_DAY)
      : result.isTitleStakes
        ? 90
        : result.isYushoRace
          ? 75
          : 50;
  const gyoji = assignGyojiToBout(world.gyojiPool, result.boutId, boutImportance);
  if (!gyoji) return {};

  result.gyojiId = gyoji.id;
  if (result.isDraw) {
    return { gyoji, panel: null };
  }

  // If mono-ii occurred, assemble a shimpan panel and resolve the outcome.
  if (result.monoii && world?.shimpanPool && world.shimpanPool.length >= FOUL_REVIEW_MIN_SHIMPAN) {
    const panel = assembleShimpanPanel(world.shimpanPool, result.boutId);
    if (panel) {
      result.shimpanPanelIds = [panel.chief.id, ...panel.panelists.map((p) => p.id)];
      // A foul review already decided its verdict at officiating time —
      // confirmed → the apparent winner's call is reversed (hansoku);
      // cleared → the call stands. Never a rematch. Generic mono-ii keeps
      // the accuracy-driven roll, widened for missed-call reviews.
      if (result.foulReview) {
        result.monoiiOutcome = result.foulReview.confirmed ? "reversed" : "upheld";
      } else {
        result.monoiiOutcome = resolveMonoii(gyoji, panel, monoiiRoll(result.boutId, panel.chief.id), {
          reversalBonus: result.monoiiKind === "missed_call" ? MISSED_CALL_REVERSAL_BONUS : 0,
        });
      }
      return { gyoji, panel };
    }
  }
  return { gyoji, panel: null };
}

/**
 * Record officiating career stats on the FINAL result — must run after
 * the verdict has been applied so reversals and torinaoshi count the
 * right outcomes. A torinaoshi bout records two officiated bouts.
 */
export function recordGyojiAftermath(
  world: WorldState | undefined,
  result: BoutResult,
  basho: BashoState,
  builder: ImpactBuilder,
  gyoji?: Gyoji,
  panel?: ShimpanPanel | null
): void {
  if (!world?.gyojiPool || !gyoji) return;
  const bashoNameStr = (basho.bashoName ?? basho.name ?? "unknown") as string;
  const bashoYear = basho.year ?? world?.year ?? DEFAULT_START_YEAR;

  // Consultation credit for the panel that convened.
  if (panel && result.shimpanPanelIds?.length && world.shimpanPool) {
    const panelIds = result.shimpanPanelIds;
    const updatedShimpanPool = world.shimpanPool.map((s) =>
      panelIds.includes(s.id) ? { ...s, consultations: s.consultations + 1 } : s
    );
    builder.updateWorldField("shimpanPool", updatedShimpanPool);
  }

  // `reversed` starts false — a mono-ii with no panelable pool means no
  // call was reviewed, so no reversal is credited (V18-O2).
  const reversed = result.monoiiOutcome === "reversed";
  let updatedGyoji = recordGyojiBout(gyoji, bashoNameStr, bashoYear, reversed);

  // A torinaoshi is two officiated bouts — the annulled first attempt and
  // the rematch. The rematch's own verdict lives on torinaoshiContext.
  if (result.isTorinaoshi) {
    updatedGyoji = recordGyojiBout(
      updatedGyoji,
      bashoNameStr,
      bashoYear,
      result.torinaoshiContext?.rematchOutcome === "reversed"
    );
  }

  const updatedPool = world.gyojiPool.map((g) => (g.id === updatedGyoji.id ? updatedGyoji : g));
  builder.updateWorldField("gyojiPool", updatedPool);
}

/**
 * Composed officiation for direct callers: assignment + verdict + career
 * recording, with sashichigae applied when rikishi are supplied. A
 * "rematch" verdict cannot re-run physics here (no bout context) and
 * stays metadata-only — resolveBout handles torinaoshi itself.
 */
export function applyGyojiOfficiation(
  world: WorldState | undefined,
  result: BoutResult,
  basho: BashoState,
  builder: ImpactBuilder,
  east?: Rikishi,
  west?: Rikishi
) {
  const { gyoji, panel } = assignGyojiAndResolveVerdict(
    world,
    result,
    undefined,
    east,
    west
  );
  if (east && west && result.monoiiOutcome === "reversed" && !result.foulReview) {
    const flipped = flipResultWinner(result, east, west);
    Object.assign(result, flipped);
  }
  recordGyojiAftermath(world, result, basho, builder, gyoji, panel);
}
