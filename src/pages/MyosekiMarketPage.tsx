// @ts-nocheck
import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useGame } from "@/contexts/GameContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Banknote, FileText } from "lucide-react";
import { buyMyoseki, leaseMyoseki } from "@/engine/myosekiMarket";
import { toast } from "sonner";
import type { MyosekiStock } from "@/engine/types";

export default function MyosekiMarketPage() {
  const { state, setWorld } = useGame();
  const world = state.world;
  const [activeTab, setActiveTab] = useState("market");

  if (!world || !world.myosekiMarket) {
    return (
      <AppLayout pageTitle="Elder Stock Market (Myoseki)">
        <div className="flex items-center justify-center h-full">Loading Market Records...</div>
      </AppLayout>
    );
  }

  const market = world.myosekiMarket;
  const stocks = Object.values(market.stocks);
  const playerHeyaId = world.playerHeyaId;
  const playerHeya = playerHeyaId ? world.heyas.get(playerHeyaId) : null;
  const playerFunds = playerHeya?.funds ?? 0;

  const availableStocks = stocks.filter(s => s.status === "available");
  const heldStocks = stocks.filter(s => s.status === "held");
  const leasedStocks = stocks.filter(s => s.status === "leased");

  const myStocks = stocks.filter(s => s.ownerId === playerHeya?.oyakataId || s.holderId === playerHeya?.oyakataId);

  const managementTabs = [
    { id: "economy", label: "Economy", href: "/economy" },
    { id: "scouting", label: "Scouting", href: "/scouting" },
    { id: "talent", label: "Talent Pools", href: "/talent" },
    { id: "governance", label: "Governance", href: "/governance" },
    { id: "myoseki", label: "Myoseki", href: "/myoseki" },
  ];

  const handleBuy = (stock: MyosekiStock) => {
    if (!playerHeya || !playerHeya.oyakataId) return;

    if (buyMyoseki(world, playerHeya.oyakataId, playerHeya.id, stock.id)) {
      setWorld({ ...world }); // trigger re-render
      toast.success(`Successfully acquired ${stock.name} Elder Stock!`);
    } else {
      toast.error(`Insufficient funds to acquire ${stock.name}.`);
    }
  };

  const handleLease = (stock: MyosekiStock) => {
    if (!playerHeya || !playerHeya.oyakataId) return;

    if (leaseMyoseki(world, playerHeya.oyakataId, stock.id)) {
      setWorld({ ...world });
      toast.success(`Successfully leased ${stock.name} Elder Stock!`);
    } else {
      toast.error(`Could not lease ${stock.name}.`);
    }
  };

  return (
    <AppLayout
      pageTitle="Elder Stock Market (Myoseki)"
      subNavTabs={managementTabs}
      activeSubTab="myoseki"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">
            The Japan Sumo Association's restricted Elder Stock exchange. 105 shares exist in total.
          </p>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Stable Funds</p>
            <p className="text-xl font-bold">¥{playerFunds.toLocaleString()}</p>
          </div>
        </div>

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
                <CardTitle>Available for Acquisition</CardTitle>
                <CardDescription>Acquiring Elder Stock is required to run a stable or keep retired stars on staff.</CardDescription>
              </CardHeader>
              <CardContent>
                {availableStocks.length === 0 ? (
                  <p className="text-muted-foreground">No shares are currently on the market.</p>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {availableStocks.map(stock => (
                        <Card key={stock.id} className="bg-muted/50">
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                              <CardTitle className="text-lg">{stock.name}</CardTitle>
                              <Badge variant={stock.prestigeTier === "elite" ? "default" : stock.prestigeTier === "respected" ? "secondary" : "outline"}>
                                {stock.prestigeTier}
                              </Badge>
                            </div>
                            <CardDescription>Owned by: {stock.ownerId === "JSA" ? "Sumo Association" : stock.ownerId}</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-1">
                              <p className="text-sm font-medium">Asking Price:</p>
                              <p className="text-xl font-bold text-primary">¥{(stock.askingPrice || 0).toLocaleString()}</p>
                            </div>
                          </CardContent>
                          <CardFooter className="flex gap-2">
                            <Button className="w-full" onClick={() => handleBuy(stock)} disabled={playerFunds < (stock.askingPrice || 0)}>
                              Buy Share
                            </Button>
                            <Button variant="outline" className="w-full" onClick={() => handleLease(stock)}>
                              Lease Share
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
                <CardDescription>Shares owned or leased by your stable and its staff.</CardDescription>
              </CardHeader>
              <CardContent>
                {myStocks.length === 0 ? (
                  <p className="text-muted-foreground">Your stable does not currently hold any Myoseki.</p>
                ) : (
                  <div className="space-y-4">
                    {myStocks.map(stock => (
                      <div key={stock.id} className="flex justify-between items-center p-4 border rounded-lg">
                        <div>
                          <p className="font-bold text-lg">{stock.name}</p>
                          <p className="text-sm text-muted-foreground">Tier: {stock.prestigeTier}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant={stock.status === "held" ? "default" : "secondary"} className="mb-1">
                            {stock.status.toUpperCase()}
                          </Badge>
                          {stock.status === "leased" && <p className="text-xs text-muted-foreground">Annual Fee: ¥{(stock.leaseFee || 0).toLocaleString()}</p>}
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
                {market.history.length === 0 ? (
                  <p className="text-muted-foreground">No recent transactions.</p>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-4">
                      {market.history.map(tx => (
                        <div key={tx.id} className="flex justify-between items-center border-b pb-2">
                          <div>
                            <p className="font-medium text-sm">
                              {tx.type === "sale" ? "Acquisition" : "Lease"} of {market.stocks[tx.myosekiId]?.name || tx.myosekiId}
                            </p>
                            <p className="text-xs text-muted-foreground">{tx.date} | From: {tx.fromId} To: {tx.toId}</p>
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
