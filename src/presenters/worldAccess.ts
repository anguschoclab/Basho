import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import type { RetiredRikishiSummary } from "@/engine/types/history";
import type { Oyakata } from "@/engine/types/oyakata";
import type { Staff } from "@/engine/types/staff";
import type { BashoResult } from "@/engine/types/basho";
import type { TalentPoolWorldState } from "@/engine/types/talent";
import {
  getActiveRikishi as engineGetActiveRikishi,
  getHeyaStaff as engineGetHeyaStaff,
} from "@/engine/queries";

// Canonical entity accessors — re-exported from engine/queries so the
// presenter layer has a single import surface. `Id` is `string`, so the
// engine signatures are directly compatible.
export {
  getRikishi,
  getHeya,
  getOyakataForHeya,
  getAllHeyas,
  getHeyaRoster,
  getRikishiAnywhere,
  getRetiredRikishiSummary,
  loadFullRikishiRecord,
} from "@/engine/queries";

// Canonical bookmark accessors — re-exported from the engine service so the
// page layer never reaches into WorldState.playerKnowledge directly.
export {
  getAllBookmarks,
  getBookmarksByType,
} from "@/engine/systems/bookmark/BookmarkService";
export type { BookmarkEntry } from "@/engine/types/world";

export function getOyakata(world: WorldState, id: string): Oyakata | undefined {
  return world.oyakata.get(id);
}

export function getAllRikishi(world: WorldState): Rikishi[] {
  return engineGetActiveRikishi(world);
}

export function getAllOyakata(world: WorldState): Oyakata[] {
  return Array.from(world.oyakata.values());
}

export function getStaffMember(world: WorldState, id: string): Staff | undefined {
  return world.staff.get(id);
}

export function getHeyaStaffList(world: WorldState, heyaId: string): Staff[] {
  return engineGetHeyaStaff(world, heyaId);
}

export function getHistory(world: WorldState): BashoResult[] {
  return world.history ?? [];
}

export function getHeyaCount(world: WorldState): number {
  return world.heyas.size;
}

export function getRikishiMap(world: WorldState): Map<string, Rikishi> {
  return world.rikishi;
}

export function getHistoricalRikishi(
  world: WorldState,
  id: string
): Rikishi | RetiredRikishiSummary | undefined {
  return world.historicalRikishi?.get(id);
}

export function getGlobalCupChampion(world: WorldState): Rikishi | undefined {
  const championId = world.globalCup?.championId;
  return championId ? world.rikishi.get(championId) : undefined;
}

export function getTalentPool(world: WorldState): TalentPoolWorldState | undefined {
  return world.talentPool;
}
