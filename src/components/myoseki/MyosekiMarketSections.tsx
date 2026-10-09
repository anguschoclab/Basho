/**
 * MyosekiMarketSections.tsx
 *
 * Sections of MyosekiMarketPage — stat cards, marketplace listing,
 * owned shares, and transaction history tabs.
 */

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
import { ScrollArea } from "@/components/ui/scroll-area";
import { SortMenu } from "@/components/ui/SortMenu";
import type { MyosekiStock } from "@/engine/types/myoseki";
import type { useMyosekiMarket } from "@/hooks/useMyosekiMarket";

type Market = ReturnType<typeof useMyosekiMarket>;
type MarketState = NonNullable<Market["market"]>;

const STOCK_SORT_OPTIONS = [
  { key: "name", label: "Name" },
  { key: "price", label: "Price" },
  { key: "prestige", label: "Prestige" },
];

/** Summary stat cards (available / leased / total). */
export function MarketStatCards({ market }: { market: Market }) {
  const cells: { title: string; value: number }[] = [
    { title: "Available Shares", value: market.availableStocks.length },
    { title: "Currently Leased", value: market.leasedStocks.length },
    { title: "Total Shares", value: market.stocks.length },
  ];
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {cells.map((cell) => (
        <Card key={cell.title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{cell.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{cell.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** Single stock card in the acquisition grid. */
function StockCard({ stock, market }: { stock: MyosekiStock; market: Market }) {
  return (
    <Card className="bg-muted/50">
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
          Owned by: {stock.ownerId === "JSA" ? "Sumo Association" : stock.ownerId}
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
          onClick={() => market.handleBuy(stock)}
          disabled={market.playerFunds < (stock.askingPrice ?? 0)}
          {...(market.playerFunds < (stock.askingPrice ?? 0)
            ? { tooltip: "Insufficient funds", tooltipSide: "top" }
            : {})}
        >
          Buy
        </Button>
        <Button
          variant="outline"
          className="w-full h-8 text-xs"
          onClick={() => market.handleLease(stock)}
        >
          Lease
        </Button>
      </CardFooter>
    </Card>
  );
}

/** Marketplace tab — stat cards + acquisition grid with sort. */
export function MarketListingTab({ market }: { market: Market }) {
  return (
    <>
      <MarketStatCards market={market} />

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
                market.setSortKey(key);
                market.setSortOrder(order);
              }}
            />
          </div>
        </CardHeader>
        <CardContent>
          {market.availableStocks.length === 0 ? (
            <p className="text-muted-foreground">No shares are currently on the market.</p>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {market.availableStocks.map((stock) => (
                  <StockCard key={stock.id} stock={stock} market={market} />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </>
  );
}

/** "My Shares" tab — stocks owned or leased by the player stable. */
export function OwnedSharesTab({ market }: { market: Market }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Stable's Shares</CardTitle>
        <CardDescription>
          Shares owned or leased by your stable and its staff.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {market.myStocks.length === 0 ? (
          <p className="text-muted-foreground">
            Your stable does not currently hold any Myoseki.
          </p>
        ) : (
          <div className="space-y-4">
            {market.myStocks.map((stock) => (
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
  );
}

/** Transaction history tab. */
export function TransactionHistoryTab({ market }: { market: Market }) {
  const m: MarketState | undefined = market.market;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Market Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        {!m || m.history.length === 0 ? (
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
  );
}
