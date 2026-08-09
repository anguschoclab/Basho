import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/control-center";
import { ASSOCIATION_TABS } from "@/constants/ui/navigation";
import { useGame } from "@/contexts/useGame";
import { useGameStore } from "@/store/gameStore";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import type { MyosekiStock } from "@/engine/types/myoseki";
import { getPlayerHeya } from "@/presenters/engineAccess";
import { SortMenu } from "@/components/ui/SortMenu";
import { compareBy, type SortDirection } from "@/lib/sortUtils";

const STOCK_SORT_OPTIONS = [
  { key: "name", label: "Name" },
  { key: "price", label: "Price" },
  { key: "prestige", label: "Prestige" },
];

export default function MyosekiMarketPage() {
  const { state } = useGame();
  const world = state.world;
  const [activeTab, setActiveTab] = useState("market");
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

  if (!world || !market) {
    return (
      <AppLayout
        subNavTabs={ASSOCIATION_TABS}
        activeSubTab="myoseki"
        pageTitle="Elder Stock Market (Myoseki)"
      >
        <div className="flex items-center justify-center h-full">Loading Market Records...</div>
      </AppLayout>
    );
  }

  const m = market;

  const playerHeya = getPlayerHeya(world) ?? null;
  const playerFunds = playerHeya?.funds ?? 0;

  const leasedStocks = stocks.filter((s) => s.status === "leased");

  const myStocks = stocks.filter(
    (s) =>
      playerHeya?.oyakataId &&
      (s.ownerId === playerHeya.oyakataId || s.holderId === playerHeya.oyakataId)
  );

  const handleBuy = (stock: MyosekiStock) => {
    if (!playerHeya || !playerHeya.oyakataId) return;

    sendCommand({
      type: "BUY_MYOSEKI",
      myosekiId: stock.id,
      buyerId: playerHeya.oyakataId,
      buyerHeyaId: playerHeya.id,
    });
    toast.success(`Acquisition request for ${stock.name} submitted.`);
  };

  const handleLease = (stock: MyosekiStock) => {
    if (!playerHeya || !playerHeya.oyakataId) return;

    sendCommand({
      type: "LEASE_MYOSEKI",
      myosekiId: stock.id,
      buyerId: playerHeya.oyakataId,
    });
    toast.success(`Lease request for ${stock.name} submitted.`);
  };

  return (
    <AppLayout
      pageTitle="Elder Stock Market (Myoseki)"
      subNavTabs={ASSOCIATION_TABS}
      activeSubTab="myoseki"
    >
      <div className="space-y-6">
        <PageHeader
          eyebrow="── ASSOCIATION ──"
          title="Elder Stock Market"
          lede="The Japan Sumo Association's restricted Elder Stock exchange. 105 shares exist in total."
          actions={
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                Stable Funds
              </p>
              <p className="text-lg font-bold font-mono">¥{playerFunds.toLocaleString()}</p>
            </div>
          }
        />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="market">Marketplace</TabsTrigger>
            <TabsTrigger value="owned">My Shares</TabsTrigger>
            <TabsTrigger value="history">Transaction History</TabsTrigger>
          </TabsList>

          <TabsContent value="market" className="space-y-4 mt-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Available Shares</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{availableStocks.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Currently Leased</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{leasedStocks.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Shares</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stocks.length}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Available for Acquisition</CardTitle>
                    <CardDescription>
                      Acquiring Elder Stock is required to run a stable or keep retired stars on
                      staff.
                    </CardDescription>
                  </div>
                  <SortMenu
                    options={STOCK_SORT_OPTIONS}
                    storageKey="basho_sort_myoseki"
                    defaultSortKey="name"
                    defaultSortOrder="asc"
                    onSortChange={(key, order) => {
                      setSortKey(key);
                      setSortOrder(order);
                    }}
                  />
                </div>
              </CardHeader>
              <CardContent>
                {availableStocks.length === 0 ? (
                  <p className="text-muted-foreground">No shares are currently on the market.</p>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {availableStocks.map((stock) => (
                        <Card key={stock.id} className="bg-muted/50">
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                              <CardTitle className="text-lg">{stock.name}</CardTitle>
                              <Badge
                                variant={
                                  stock.prestigeTier === "elite"
                                    ? "default"
                                    : stock.prestigeTier === "respected"
                                      ? "secondary"
                                      : "outline"
                                }
                              >
                                {stock.prestigeTier}
                              </Badge>
                            </div>
                            <CardDescription>
                              Owned by:{" "}
                              {stock.ownerId === "JSA" ? "Sumo Association" : stock.ownerId}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-1">
                              <p className="text-sm font-medium">Asking Price:</p>
                              <p className="text-xl font-bold text-primary">
                                ¥{(stock.askingPrice ?? 0).toLocaleString()}
                              </p>
                            </div>
                          </CardContent>
                          <CardFooter className="flex gap-2 p-0 px-6 pb-6">
                            <Button
                              className="w-full h-8 text-xs"
                              onClick={() => handleBuy(stock)}
                              disabled={playerFunds < (stock.askingPrice ?? 0)}
                              {...(playerFunds < (stock.askingPrice ?? 0)
                                ? { tooltip: "Insufficient funds", tooltipSide: "top" }
                                : {})}
                            >
                              Buy
                            </Button>
                            <Button
                              variant="outline"
                              className="w-full h-8 text-xs"
                              onClick={() => handleLease(stock)}
                            >
                              Lease
                            </Button>
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="owned" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Your Stable's Shares</CardTitle>
                <CardDescription>
                  Shares owned or leased by your stable and its staff.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {myStocks.length === 0 ? (
                  <p className="text-muted-foreground">
                    Your stable does not currently hold any Myoseki.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {myStocks.map((stock) => (
                      <div
                        key={stock.id}
                        className="flex justify-between items-center p-4 border rounded-lg"
                      >
                        <div>
                          <p className="font-bold text-lg">{stock.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Tier: {stock.prestigeTier}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge
                            variant={stock.status === "held" ? "default" : "secondary"}
                            className="mb-1"
                          >
                            {stock.status.toUpperCase()}
                          </Badge>
                          {stock.status === "leased" && (
                            <p className="text-xs text-muted-foreground">
                              Annual Fee: ¥{(stock.leaseFee ?? 0).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Market Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                {m.history.length === 0 ? (
                  <p className="text-muted-foreground">No recent transactions.</p>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-4">
                      {m.history.map((tx) => (
                        <div
                          key={tx.id}
                          className="flex justify-between items-center border-b pb-2"
                        >
                          <div>
                            <p className="font-medium text-sm">
                              {tx.type === "sale"
                                ? "Acquisition"
                                : tx.type === "lease"
                                  ? "Lease"
                                  : "Return"}{" "}
                              of {m.stocks[tx.myosekiId]?.name || tx.myosekiId}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {tx.date} | From: {tx.fromId} To: {tx.toId}
                            </p>
                          </div>
                          <p className="font-bold text-sm">¥{tx.amount.toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
