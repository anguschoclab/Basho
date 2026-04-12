import type { Heya } from "../types/heya";
import type { WorldState } from "../types/world";
import { EventBus } from "../events";
import type { Rikishi } from "../types/rikishi";
import { stableSort } from "./sort";
import { buyMyoseki } from "../myosekiMarket";
import type { Oyakata } from "../types/oyakata";
import type { SponsorPoolState } from "../types/sponsors";

export function calculateRunwayMonths(heya: Heya): number {
  const avgFacility =
    (heya.facilities.training + heya.facilities.recovery + heya.facilities.nutrition) / 3;
  const monthlyBurn = (heya.rikishiIds ?? []).length * 150_000 + avgFacility * 9_000;
  return monthlyBurn > 0 ? heya.funds / monthlyBurn : 0;
}

export function trySpendPoliticalCapital(heya: Heya, amount: number): boolean {
  if (heya.politicalCapital === undefined || heya.politicalCapital < amount) return false;
  heya.politicalCapital -= amount;
  return true;
}

export function executeRetirement(world: WorldState, heya: Heya, r: Rikishi, reason: string) {
  EventBus.lifecycleEvent(world, {
    rikishiId: r.id,
    heyaId: heya.id,
    shikona: r.shikona || r.name || r.id,
    status: "retirement",
    reason,
  });
  heya.rikishiIds = (heya.rikishiIds ?? []).filter((id) => id !== r.id);
  world.rikishi.delete(r.id);
}

export function buyAvailableMyoseki(
  world: WorldState,
  heya: Heya,
  oyakata: Oyakata,
  reserveAmount: number
) {
  if (!world.myosekiMarket) return;
  const stocks = stableSort(
    Object.values(world.myosekiMarket.stocks),
    (x: any) => x.id || String(x)
  );
  for (const stock of stocks) {
    if (
      stock.status === "available" &&
      stock.askingPrice &&
      stock.askingPrice < heya.funds - reserveAmount
    ) {
      buyMyoseki(world, oyakata.id, heya.id, stock.id);
      break;
    }
  }
}

export function countCurrentSponsors(pool: SponsorPoolState, heya: Heya): number {
  return Array.from(pool.sponsors.values()).filter(
    (s) => s.active && s.relationships?.some((r) => r.targetId === heya.id)
  ).length;
}

export function getEligibleSponsors(pool: SponsorPoolState, heya: Heya) {
  return Array.from(pool.sponsors.values()).filter(
    (s) => s.active && !s.relationships?.some((r) => r.targetId === heya.id) && s.tier !== "T0"
  );
}
