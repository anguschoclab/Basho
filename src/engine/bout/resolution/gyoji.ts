/**
 * resolution/gyoji.ts
 * ===================
 * Gyoji officiation: assign a gyoji, resolve mono-ii via a shimpan panel,
 * and record career stats on the pools.
 */

import type { BashoState, BoutResult } from "../../types/basho";
import type { WorldState } from "../../types/world";
import type { ImpactBuilder } from "../../core/ImpactBuilder";
import { DEFAULT_START_YEAR } from "../../../constants/engine/calendar";
import {
  assignGyojiToBout,
  recordGyojiBout,
  assembleShimpanPanel,
} from "../../systems/officials/GyojiService";
import { resolveMonoii } from "../../types/gyoji";

/**
 * 6. Gyoji officiation — assign a gyoji to this bout and record career stats.
 * When a mono-ii occurred, assembles a shimpan panel and resolves the outcome.
 */
export function applyGyojiOfficiation(
  world: WorldState | undefined,
  result: BoutResult,
  basho: BashoState,
  builder: ImpactBuilder
) {
  if (!world?.gyojiPool || world.gyojiPool.length === 0) return;

  const boutImportance = result.isTitleStakes ? 90 : result.isYushoRace ? 75 : 50;
  const gyoji = assignGyojiToBout(world.gyojiPool, result.boutId, boutImportance);
  if (!gyoji) return;

  result.gyojiId = gyoji.id;
  const bashoNameStr = (basho.bashoName ?? basho.name ?? "unknown") as string;
  const bashoYear = basho.year ?? world?.year ?? DEFAULT_START_YEAR;

  // 6a. If mono-ii occurred, assemble a shimpan panel and resolve the outcome
  let reversed = !!result.monoii;
  if (result.monoii && world?.shimpanPool && world.shimpanPool.length >= 5) {
    const panel = assembleShimpanPanel(world.shimpanPool, result.boutId);
    if (panel) {
      result.shimpanPanelIds = [panel.chief.id, ...panel.panelists.map((p) => p.id)];
      // Use a deterministic RNG from the bout seed for mono-ii resolution
      const monoiiRng = {
        next: () => {
          // Deterministic hash from boutId + panel chief id
          const str = `${result.boutId}-${panel.chief.id}`;
          let h = 0;
          for (let i = 0; i < str.length; i++) {
            h = ((h << 5) - h + str.charCodeAt(i)) | 0;
          }
          return Math.abs(h % 1000) / 1000;
        },
      };
      const outcome = resolveMonoii(gyoji, panel, monoiiRng);
      result.monoiiOutcome = outcome;
      reversed = outcome === "reversed";

      // Increment consultation count for each shimpan on the panel
      const panelIds = result.shimpanPanelIds ?? [];
      const updatedShimpanPool = world.shimpanPool.map((s) => {
        if (panelIds.includes(s.id)) {
          return { ...s, consultations: s.consultations + 1 };
        }
        return s;
      });
      builder.updateWorldField("shimpanPool", updatedShimpanPool);
    }
  }

  const updatedGyoji = recordGyojiBout(gyoji, bashoNameStr, bashoYear, reversed);
  const updatedPool = world.gyojiPool.map((g) => (g.id === updatedGyoji.id ? updatedGyoji : g));
  builder.updateWorldField("gyojiPool", updatedPool);
}
