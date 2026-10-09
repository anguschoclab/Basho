/**
 * MyosekiMarketPage.tsx
 *
 * Elder Stock exchange — composition shell. Derived state lives in
 * ../hooks/useMyosekiMarket.ts and tab sections in
 * ../components/myoseki/MyosekiMarketSections.tsx.
 */

import { useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/control-center";
import { ASSOCIATION_TABS } from "@/constants/ui/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MarketListingTab,
  OwnedSharesTab,
  TransactionHistoryTab,
} from "@/components/myoseki/MyosekiMarketSections";
import { useMyosekiMarket } from "@/hooks/useMyosekiMarket";

export default function MyosekiMarketPage() {
  const [activeTab, setActiveTab] = useState("market");
  const market = useMyosekiMarket();

  if (!market.world || !market.market) {
    return (
      <AppLayout
        subNavTabs={ASSOCIATION_TABS}
        activeSubTab="myoseki"
        pageTitle="Elder Stock Market (Myoseki)"
      >
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <EmptyState
            icon={Loader2}
            title="Loading Market Records"
            description="Fetching elder stock exchange..."
            className="animate-pulse"
          />
        </div>
      </AppLayout>
    );
  }

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
              <p className="text-lg font-bold font-mono">
                ¥{market.playerFunds.toLocaleString()}
              </p>
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
            <MarketListingTab market={market} />
          </TabsContent>

          <TabsContent value="owned" className="mt-4">
            <OwnedSharesTab
              market={market}
              onListForSale={market.handleListForSale}
              onEndLease={market.handleEndLease}
            />
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <TransactionHistoryTab market={market} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
