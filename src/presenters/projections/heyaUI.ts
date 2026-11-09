import type { Id } from "@/engine/types/common";
import type { Heya } from "@/engine/types/heya";
import { WorldState } from "@/engine/types/world";
import { UIRosterEntry, projectRosterEntry } from "@/presenters/rikishi/index";
import { getOyakataForHeya } from "@/engine/core/queries";
import { getHeyaStyleBias, getHeyaStaff } from "@/engine/core/queries";
import { calculateHeyaWeeklyFinances } from "@/engine/economy/FinanceCalculator";

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

  for (const s of getHeyaStaff(world, h.id)) {
    staff.push({
      id: s.id,
      name: s.name,
      role: s.role,
      specialty: (s as { specialty?: string }).specialty ?? "General",
    });
  }

  const roster = (h.rikishiIds || []).reduce<UIRosterEntry[]>((acc, id) => {
    const r = world.rikishi.get(id);
    if (r !== undefined) {
      acc.push(projectRosterEntry(r, world));
    }
    return acc;
  }, []);

  // Real achievements: the stable's title count lives on heya.historicalYusho;
  // sansho totals aggregate across the active roster's prize records (S8-1).
  let specialPrizeCount = 0;
  for (const id of h.rikishiIds ?? []) {
    const prizes = world.rikishi.get(id)?.stats?.achievements?.specialPrizes;
    if (prizes) {
      specialPrizeCount += prizes.shukunSho + prizes.kantoSho + prizes.ginoSho;
    }
  }

  // Real rivals — the other stable in each recorded rivalry pair (S8-1).
  const rivalStableIds = Object.values(world.rivalriesState?.heyaRivalryPairs ?? {})
    .filter((p) => p.heyaAId === h.id || p.heyaBId === h.id)
    .map((p) => (p.heyaAId === h.id ? p.heyaBId : p.heyaAId));

  // Real burn — weekly upkeep × 4, matching the economy layer's own
  // monthlyBurn convention (FinanceCalculator) (S8-1).
  const monthlyExpense = Math.round(calculateHeyaWeeklyFinances(h, world).totalBurn * 4);

  const prestigeBand =
    h.prestige < 20
      ? "Emerging"
      : h.prestige < 50
        ? "Respected"
        : h.prestige < 80
          ? "Elite"
          : "Legendary";

  return {
    id: h.id,
    name: h.name,
    isPlayerOwned: h.id === world.playerHeyaId,

    prestige: h.prestige,
    prestigeBand,
    funds: h.funds ?? 0,
    monthlyExpense,
    location: h.location ?? "Tokyo",
    ichimon: h.ichimon ?? "Independent",
    oyakataId: h.oyakataId,
    oyakataName: oyakata?.shikona ?? "Vacant",
    styleBias: getHeyaStyleBias(world, h.id),
    rivalStableIds,
    staff,
    roster,
    rosterSize: roster.length,
    rosterLimit: 30,
    recruitment: {
      scoutingPriority: world.npcScoutingPriorities?.[h.id] || "passive",
      targetStyle: "neutral",
      openSlots: Math.max(0, 30 - roster.length),
    },
    achievements: {
      yushoCount: h.historicalYusho ?? 0,
      specialPrizeCount,
    },
  };
}
