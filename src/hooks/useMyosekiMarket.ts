/**
 * useMyosekiMarket.ts
 *
 * MyosekiMarketPage derived data — stock lists per tab, sort state,
 * player funds, and buy/lease commands.
 */

import { useState, useMemo } from "react";
import { useGame } from "@/contexts/useGame";
import { useGameStore } from "@/store/gameStore";
import { toast } from "sonner";
import type { MyosekiStock } from "@/engine/types/myoseki";
import { getPlayerHeya } from "@/presenters/engineAccess";
import { compareBy, type SortDirection } from "@/lib/sortUtils";

export function useMyosekiMarket() {
  const { state } = useGame();
  const world = state.world;
  const [sortKey, setSortKey] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<SortDirection>("asc");
  const sendCommand = useGameStore((s) => s.sendCommand);

  const market = world?.myosekiMarket;
  const stocks = useMemo(() => (market ? Object.values(market.stocks) : []), [market]);

  const availableStocks = useMemo(() => {
    if (!market) return [];
    const available = Object.values(market.stocks).filter((s) => s.status === "available");
    const accessor: Record<string, (s: MyosekiStock) => string | number | undefined> = {
      name: (s) => s.name,
      price: (s) => s.askingPrice ?? 0,
      prestige: (s) => s.prestigeTier,
    };
    const fn = accessor[sortKey];
    if (!fn) return available;
    return [...available].sort((a, b) => compareBy(a, b, fn, sortOrder));
  }, [market, sortKey, sortOrder]);

  const playerHeya = world ? (getPlayerHeya(world) ?? null) : null;
  const playerFunds = playerHeya?.funds ?? 0;

  const leasedStocks = stocks.filter((s) => s.status === "leased");

  const myStocks = stocks.filter(
    (s) =>
      playerHeya?.oyakataId &&
      (s.ownerId === playerHeya.oyakataId || s.holderId === playerHeya.oyakataId)
  );

  const handleBuy = (stock: MyosekiStock) => {
    if (!playerHeya || !playerHeya.oyakataId) return;

    if (!sendCommand({
      type: "BUY_MYOSEKI",
      myosekiId: stock.id,
      buyerId: playerHeya.oyakataId,
      buyerHeyaId: playerHeya.id,
    })) return;
    toast.success(`Acquisition request for ${stock.name} submitted.`);
  };

  const handleLease = (stock: MyosekiStock) => {
    if (!playerHeya || !playerHeya.oyakataId) return;

    if (!sendCommand({
      type: "LEASE_MYOSEKI",
      myosekiId: stock.id,
      buyerId: playerHeya.oyakataId,
    })) return;
    toast.success(`Lease request for ${stock.name} submitted.`);
  };

  return {
    world,
    market,
    sortKey,
    setSortKey,
    sortOrder,
    setSortOrder,
    stocks,
    availableStocks,
    leasedStocks,
    myStocks,
    playerHeya,
    playerFunds,
    handleBuy,
    handleLease,
  };
}
