import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import type { Heya } from "@/engine/types/heya";
import type { Oyakata } from "@/engine/types/oyakata";
import type { Staff } from "@/engine/types/staff";
import type { BashoResult } from "@/engine/types/basho";
import type { TalentPoolWorldState } from "@/engine/types/talent";
import {
  getRikishi as engineGetRikishi,
  getHeya as engineGetHeya,
  getOyakataForHeya as engineGetOyakataForHeya,
  getAllHeyas as engineGetAllHeyas,
  getActiveRikishi as engineGetActiveRikishi,
  getHeyaRoster as engineGetHeyaRoster,
  getHeyaStaff as engineGetHeyaStaff,
} from "@/engine/queries";

export function getRikishi(world: WorldState, id: string): Rikishi | undefined {
  return engineGetRikishi(world, id);
}

export function getHeya(world: WorldState, id: string): Heya | undefined {
  return engineGetHeya(world, id);
}

export function getOyakata(world: WorldState, id: string): Oyakata | undefined {
  return world.oyakata.get(id);
}

export function getOyakataForHeya(world: WorldState, heyaId: string): Oyakata | undefined {
  return engineGetOyakataForHeya(world, heyaId);
}

export function getAllHeyas(world: WorldState): Heya[] {
  return engineGetAllHeyas(world);
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

export function getHeyaRoster(world: WorldState, heyaId: string): Rikishi[] {
  return engineGetHeyaRoster(world, heyaId);
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
): Rikishi | undefined {
  return world.historicalRikishi?.get(id);
}

export function getRikishiAnywhere(world: WorldState, id: string): Rikishi | undefined {
  return world.rikishi.get(id) || world.historicalRikishi?.get(id);
}

export function getGlobalCupChampion(world: WorldState): Rikishi | undefined {
  const championId = world.globalCup?.championId;
  return championId ? world.rikishi.get(championId) : undefined;
}

export function getTalentPool(world: WorldState): TalentPoolWorldState | undefined {
  return world.talentPool;
}
