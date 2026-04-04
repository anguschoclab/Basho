import type { Id } from "../engine/types/common";
import type { Heya } from "../engine/types/heya";
import { WorldState } from "../engine/types/world";
import { UIRosterEntry, projectRosterEntry } from "./rikishiUI";
import { getOyakataForHeya } from "../engine/queries";
import { getHeyaStyleBias } from "../engine/queries";

export interface UIStaffEntry {
  id: Id;
  name: string;
  role: string;
  specialty: string;
}

export interface UIHeya {
  id: Id;
  name: string;
  isPlayerOwned: boolean;
  prestige: number;
  prestigeBand: string;
  funds: number;
  monthlyExpense: number;
  location: string;
  ichimon: string;
  oyakataId?: Id;
  oyakataName: string;
  styleBias: string;
  rivalStableIds: Id[];
  staff: UIStaffEntry[];
  roster: UIRosterEntry[];
  rosterSize: number;
  rosterLimit: number;
  recruitment: {
    scoutingPriority: string;
    targetStyle: string;
    openSlots: number;
  };
  achievements: {
    yushoCount: number;
    specialPrizeCount: number;
  };
}

export function projectHeya(h: Heya, world: WorldState): UIHeya {
  const oyakata = getOyakataForHeya(world, h.id);
  const staff: UIStaffEntry[] = [];
  for (const s of world.staff.values()) {
    if (s.heyaId === h.id) {
      staff.push({
        id: s.id,
        name: s.name,
        role: s.role,
        specialty: (s as any).specialty || "General"
      });
    }
  }

  const roster = (h.rikishiIds || [])
    .map(id => world.rikishi.get(id))
    .filter((r): r is import("../engine/types/rikishi").Rikishi => r !== undefined)
    .map(r => projectRosterEntry(r, world));

  const prestigeBand = h.prestige < 20 ? "Emerging" : h.prestige < 50 ? "Respected" : h.prestige < 80 ? "Elite" : "Legendary";

  return {
    id: h.id,
    name: h.name,
    isPlayerOwned: h.isPlayerOwned ?? false,

    prestige: h.prestige,
    prestigeBand,
    funds: (h as any).funds ?? 0,
    monthlyExpense: (h as any).monthlyExpense ?? 0,
    location: h.location ?? "Tokyo",
    ichimon: h.ichimon ?? "Independent",
    oyakataId: h.oyakataId,
    oyakataName: oyakata?.shikona ?? "Vacant",
    styleBias: getHeyaStyleBias(world, h.id),
    rivalStableIds: [], // To be populated by rivalry system
    staff,
    roster,
    rosterSize: roster.length,
    rosterLimit: (h as any).rosterLimit ?? 30,
    recruitment: {
      scoutingPriority: (world.npcScoutingPriorities?.[h.id]) || "passive",
      targetStyle: "neutral",
      openSlots: Math.max(0, ((h as any).rosterLimit ?? 30) - roster.length)
    },
    achievements: {
      yushoCount: 0,
      specialPrizeCount: 0
    }
  };
}
