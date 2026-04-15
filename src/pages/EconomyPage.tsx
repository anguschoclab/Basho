import { useMemo, useCallback } from "react";
import { Helmet } from "react-helmet";
import { AppLayout } from "@/components/layout/AppLayout";
import { OFFICE_TABS } from "@/constants/navigation";
import { useGame } from "@/contexts/GameContext";
import { SponsorsPanel } from "@/components/game/SponsorsPanel";
import { InstitutionPanel } from "@/components/game/InstitutionPanel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { projectHeyaData } from "@/presenters/uiDigest";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { RikishiName } from "@/components/ClickableName";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Users,
  Award,
  Shield,
  AlertTriangle,
  Info,
  HandCoins,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { RunwayBand, KoenkaiBandType } from "@/engine/types/narrative";
import { issueBailoutLoanIfNeeded } from "@/engine/loans";
import { calculateHeyaWeeklyFinances } from "@/engine/systems/economy/FinanceCalculator";
import { toast } from "sonner";

// Runway narrative descriptions
const RUNWAY_CONFIG: Record<
  RunwayBand,
  {
    label: string;
    description: string;
    color: string;
    icon: typeof Wallet;
    progressValue: number;
  }
> = {
  secure: {
    label: "Secure Finances",
    description: "Comfortable reserves with room to invest in the future.",
    color: "text-success",
    icon: Shield,
    progressValue: 100,
  },
  comfortable: {
    label: "Comfortable",
    description: "Finances are stable. You can weather minor setbacks without concern.",
    color: "text-green-400",
    icon: TrendingUp,
    progressValue: 75,
  },
  tight: {
    label: "Tight Budget",
    description: "Careful management required. Unexpected expenses could cause problems.",
    color: "text-gold",
    icon: Wallet,
    progressValue: 50,
  },
  critical: {
    label: "Critical",
    description: "Pressure is mounting. Consider reducing costs or strengthening income streams.",
    color: "text-orange-400",
    icon: TrendingDown,
    progressValue: 25,
  },
  desperate: {
    label: "Desperate",
    description: "Immediate intervention required. The heya’s survival is at stake.",
    color: "text-red-400",
    icon: AlertTriangle,
    progressValue: 10,
  },
};

// Koenkai (supporter) descriptions
const KOENKAI_CONFIG: Record<
  KoenkaiBandType,
  {
    label: string;
    description: string;
    color: string;
    monthlySupport: string;
  }
> = {
  powerful: {
    label: "Powerful Kōenkai",
    description: "A wide network of patrons and devoted fans provides substantial support.",
    color: "text-gold",
    monthlySupport: "Very High",
  },
  strong: {
    label: "Strong Kōenkai",
    description: "A dedicated group of supporters contributes reliably each month.",
    color: "text-purple-400",
    monthlySupport: "High",
  },
  moderate: {
    label: "Modest Kōenkai",
    description: "A smaller but loyal supporter base helps cover some expenses.",
    color: "text-west",
    monthlySupport: "Moderate",
  },
  weak: {
    label: "Weak Kōenkai",
    description: "Few supporters. Building stronger relationships should be a priority.",
    color: "text-muted-foreground",
    monthlySupport: "Low",
  },
  none: {
    label: "No Kōenkai",
    description: "No organized supporter group yet. You’re operating without a safety net.",
    color: "text-red-400",
    monthlySupport: "None",
  },
};

// Expense categories (narrative)
// const EXPENSE_CATEGORIES = [
//   { name: "Wrestler Support", description: "Food, housing, and daily needs for the roster." },
//   { name: "Heya Operations", description: "Utilities, maintenance, and administration." },
//   { name: "Training & Equipment", description: "Dohyo upkeep, supplies, and coaching costs." },
//   { name: "Medical & Recovery", description: "Treatment, rehab, and injury prevention." },
//   { name: "Travel & Appearances", description: "Exhibitions, tours, and sanctioned events." },
// ];

// Income sources (narrative)
// const INCOME_SOURCES = [
//   {
//     name: "League Distributions",
//     description: "Official payments influenced by rank presence and prestige.",
//   },
//   { name: "Kōenkai Contributions", description: "Recurring supporter donations and patronage." },
//   { name: "Kenshō Winnings", description: "Sponsor banner prizes earned through headline bouts." },
//   { name: "Prize Money", description: "Tournament awards and special prizes." },
//   { name: "Appearances", description: "Exhibitions, tours, and sanctioned events." },
// ];

// Kensho tiering (narrative). This function uses counts internally but never shows them.
function kenshoTierLabel(total: number): { label: string; detail: string } {
  if (total >= 200) return { label: "Legendary", detail: "A magnet for banners and sponsors." };
  if (total >= 80) return { label: "Star Earner", detail: "Frequently featured in sponsor bouts." };
  if (total >= 25) return { label: "Noticed", detail: "Sponsors are beginning to follow." };
  if (total >= 5) return { label: "Emerging", detail: "Occasional sponsor attention." };
  return { label: "Unproven", detail: "Little sponsor draw so far." };
}

// Safe access helpers for older saves
function safeRunwayBand(v: unknown): RunwayBand {
  const s = typeof v === "string" ? v : "";
  if (
    s === "secure" ||
    s === "comfortable" ||
    s === "tight" ||
    s === "critical" ||
    s === "desperate"
  )
    return s;
  return "tight";
}

function safeKoenkaiBand(v: unknown): KoenkaiBandType {
  const s = typeof v === "string" ? v : "";
  if (s === "powerful" || s === "strong" || s === "moderate" || s === "weak" || s === "none")
    return s;
  return "none";
}

/** economy page. */
export default function EconomyPage() {
  const { state, updateWorld } = useGame();
  const world = state.world;

  const playerHeya = useMemo(() => {
    if (!world || !state.playerHeyaId) return null;
    return world.heyas.get(state.playerHeyaId) || null;
  }, [world, state.playerHeyaId]);

  const handleBailoutRequest = useCallback(() => {
    if (!world || !state.playerHeyaId || !playerHeya) return;

    if (playerHeya.funds >= 0) {
      toast.error("Emergency funding is only available when in significant debt.");
      return;
    }

    if (playerHeya.funds > -5_000_000) {
      toast.info(
        "The Association only considers bailouts for stables with debts exceeding ¥5,000,000."
      );
      return;
    }

    // Capture loan count before
    const beforeCount = playerHeya.activeLoans?.length || 0;

    issueBailoutLoanIfNeeded(world, state.playerHeyaId);

    const afterCount = playerHeya.activeLoans?.length || 0;
    if (afterCount > beforeCount) {
      toast.success("Emergency bailout approved. Funds have been credited.");
      updateWorld(world);
    } else {
      toast.error("Bailout request denied or already processed.");
    }
  }, [world, state.playerHeyaId, playerHeya, updateWorld]);

  const playerRikishi = useMemo(() => {
    if (!playerHeya || !world) return [];
    const ids: string[] = Array.isArray(playerHeya.rikishiIds) ? playerHeya.rikishiIds : [];
    return ids.map((id) => world.rikishi.get(id)).filter(Boolean) as Array<
      NonNullable<ReturnType<typeof world.rikishi.get>>
    >;
  }, [playerHeya, world]);

  // Sekitori count
  const sekitoriCount = useMemo(() => {
    if (!playerRikishi) return 0;
    let count = 0;
    for (const r of playerRikishi) {
      if (r?.division === "makuuchi" || r?.division === "juryo") {
        count++;
      }
    }
    return count;
  }, [playerRikishi]);

  // Top earnes
  const topEarners = useMemo(() => {
    return playerRikishi
      .filter((r) => r && typeof r === "object")
      .sort((a, b) => {
        const av = Number(a?.economics?.careerKenshoWon ?? 0) || 0;
        const bv = Number(b?.economics?.careerKenshoWon ?? 0) || 0;
        return bv - av;
      })
      .slice(0, 5);
  }, [playerRikishi]);

  // Calculate actual weekly finances - moved before early return for React Hook rules
  const weeklyFinances = useMemo(() => {
    if (!world || !playerHeya) return null;
    try {
      return calculateHeyaWeeklyFinances(playerHeya, world);
    } catch (e) {
      console.error("Failed to calculate finances:", e);
      return null;
    }
  }, [world, playerHeya]);

  if (!playerHeya) {
    return <div className="p-6 text-center text-muted-foreground">No heya selected.</div>;
  }

  const runwayBand = safeRunwayBand(playerHeya.runwayBand || "unknown");
  const koenkaiBand = safeKoenkaiBand(
    (playerHeya as typeof playerHeya & { koenkaiBand?: string }).koenkaiBand || "unknown"
  );

  const runwayConfig = RUNWAY_CONFIG[runwayBand] || RUNWAY_CONFIG.tight;
  const koenkaiConfig = KOENKAI_CONFIG[koenkaiBand] || KOENKAI_CONFIG.none;
  const RunwayIcon = runwayConfig.icon;

  const hasFinancialRisk = !!(
    playerHeya as typeof playerHeya & { riskIndicators?: { financial?: boolean } }
  )?.riskIndicators?.financial;
  const canRequestBailout = playerHeya.funds < 0;

  return (
    <AppLayout subNavTabs={OFFICE_TABS} activeSubTab="economy" pageTitle="Financial Management">
      <Helmet>
        <title>Economy — {playerHeya.name} | Basho</title>
      </Helmet>

      <div className="space-y-6">
        {/* Financial Health Overview */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="paper md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <RunwayIcon className={`h-5 w-5 ${runwayConfig.color}`} />
                  <span className={runwayConfig.color}>{runwayConfig.label}</span>
                </CardTitle>
                <CardDescription>{runwayConfig.description}</CardDescription>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-none mb-1">
                  Current Balance
                </div>
                <div
                  className={cn(
                    "text-2xl font-display font-bold tabular-nums",
                    playerHeya.funds < 0 ? "text-destructive" : "text-foreground"
                  )}
                >
                  ¥{playerHeya.funds.toLocaleString()}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Financial Runway</span>
                    <span className={runwayConfig.color}>{runwayConfig.label}</span>
                  </div>
                  <Progress value={runwayConfig.progressValue} className="h-3" />
                </div>

                {hasFinancialRisk && (
                  <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    <span className="text-sm text-red-400">
                      Financial pressure is rising. Consider cost control, sponsor growth, or safer
                      training loads to reduce injury costs.
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card
            className={cn(
              "paper flex flex-col justify-center",
              canRequestBailout ? "border-destructive/30" : "bg-muted/10"
            )}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <HandCoins className="h-4 w-4" /> Association Support
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Stables in severe financial distress may request emergency bailout loans from the
                Sumo Association.
              </p>
              <Button
                variant={canRequestBailout ? "destructive" : "outline"}
                className="w-full text-xs font-bold uppercase tracking-widest h-10"
                disabled={!canRequestBailout}
                onClick={handleBailoutRequest}
                tooltip="Apply for an emergency bailout from the Association (Requires debt over ¥5M)"
                tooltipSide="top"
              >
                Request Emergency Funding
              </Button>
              {canRequestBailout && (
                <p className="text-[10px] text-destructive/80 italic text-center">
                  Requires funds below -¥5,000,000. Carries heavy stipulations.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Debt & Obligations (FM v2.0) */}
        {((playerHeya as typeof playerHeya & { activeLoans?: unknown[] }).activeLoans?.length ??
          0) > 0 && (
          <Card className="border-destructive/20 bg-destructive/5 paper overflow-hidden">
            <div className="bg-destructive/10 px-4 py-2 border-b border-destructive/20 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-xs font-bold text-destructive uppercase tracking-widest">
                Active Institutional Debt
              </span>
            </div>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {(
                  playerHeya as typeof playerHeya & {
                    activeLoans?: Array<{
                      id: string;
                      type: string;
                      providerName: string;
                      amount: number;
                      interestRate: number;
                      dueWeek: number;
                      remainingBalance: number;
                      principal: number;
                      stringsAttached?: string[];
                    }>;
                  }
                ).activeLoans?.map((loan) => (
                  <div
                    key={loan.id}
                    className="p-4 rounded-lg bg-background/50 border border-destructive/10 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive" className="uppercase text-[10px]">
                          {loan.type} Loan
                        </Badge>
                        <span className="font-bold">{loan.providerName}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
                          Remaining
                        </div>
                        <div className="text-lg font-bold">
                          ¥{loan.remainingBalance.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-center py-2 border-y border-border/30">
                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase font-bold">
                          Strings Attached
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {loan.stringsAttached?.length ?? 0} condition(s)
                        </div>
                      </div>
                      {(loan.stringsAttached || []).map((s) => (
                        <li key={s} className="text-[10px] text-muted-foreground">
                          {s}
                        </li>
                      ))}
                      <div>
                        <div className="text-[9px] text-muted-foreground uppercase font-bold">
                          Principal
                        </div>
                        <div className="text-sm font-medium">
                          ¥{loan.principal.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] text-muted-foreground uppercase font-bold">
                          Interest
                        </div>
                        <div className="text-sm font-medium">
                          {(loan.interestRate * 100).toFixed(1)}%
                        </div>
                      </div>
                      {loan.stringsAttached && loan.stringsAttached.length > 0 && (
                        <div>
                          <div className="text-[9px] text-muted-foreground uppercase font-bold">
                            Conditions
                          </div>
                          <div className="text-sm font-medium">
                            {loan.stringsAttached.length} condition(s)
                          </div>
                        </div>
                      )}
                      <div>
                        <div className="text-[9px] text-muted-foreground uppercase font-bold">
                          Monthly
                        </div>
                        <div className="text-sm font-bold text-destructive">
                          ¥{loan.monthlyPayment.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {loan.stringsAttached && loan.stringsAttached.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="text-[9px] text-muted-foreground uppercase font-bold">
                          Institutional Stipulations:
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {loan.stringsAttached.map((s: string) => (
                            <Badge
                              key={s}
                              variant="outline"
                              className="text-[9px] border-destructive/30 text-destructive bg-destructive/5 py-0"
                            >
                              {s.replace(/_/g, " ").toUpperCase()}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Grid: Koenkai & Sekitori */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Koenkai Card */}
          <Card className="paper">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Kōenkai (Supporters)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge className={koenkaiConfig.color}>{koenkaiConfig.label}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{koenkaiConfig.description}</p>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Monthly Support</span>
                <span className="font-medium">{koenkaiConfig.monthlySupport}</span>
              </div>
            </CardContent>
          </Card>

          {/* Sekitori Card */}
          <Card className="paper">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Sekitori Presence
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Salaried Wrestlers</span>
                <span className="font-display text-2xl font-bold">{sekitoriCount}</span>
              </div>

              <p className="text-sm text-muted-foreground">
                {sekitoriCount > 0
                  ? "Sekitori increase stability through rank-linked league structures and visibility that attracts sponsors."
                  : "Without sekitori, finances depend on supporter growth, careful budgeting, and long-term development."}
              </p>

              <Separator />

              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Higher ranks generally improve stability and sponsor interest.</p>
                <p>• Injuries and absences can quietly disrupt earnings momentum.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <SponsorsPanel />

        {/* Institution Health */}
        {playerHeya &&
          world &&
          (() => {
            const data = projectHeyaData(world, playerHeya.id);
            if (!data) return null;
            return (
              <InstitutionPanel
                heya={playerHeya}
                oyakata={data.oyakata}
                oyakataQuirks={data.oyakataQuirks}
                oyakataTraits={data.oyakataTraits}
              />
            );
          })()}

        {/* Income Sources */}
        <Card className="paper">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-400" />
              Income Sources
            </CardTitle>
            <CardDescription>Where your heya's support typically comes from</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {weeklyFinances ? (
                <>
                  <div className="flex items-center justify-between py-2 border-b border-border/30">
                    <span className="text-muted-foreground">Weekly Revenue</span>
                    <span className="font-display font-bold text-green-400">
                      ¥{weeklyFinances.revenue.toLocaleString()}
                    </span>
                  </div>
                  <div className="space-y-2 pt-2">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-400 mt-2" />
                      <div>
                        <p className="font-medium">Kōenkai Support</p>
                        <p className="text-sm text-muted-foreground">
                          ¥{(weeklyFinances.revenue * 0.4).toFixed(0).toLocaleString()} / week
                          (estimated)
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-400 mt-2" />
                      <div>
                        <p className="font-medium">JSA Subsidies</p>
                        <p className="text-sm text-muted-foreground">
                          ¥{(weeklyFinances.revenue * 0.35).toFixed(0).toLocaleString()} / week
                          (estimated)
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-400 mt-2" />
                      <div>
                        <p className="font-medium">Sponsor Tier Income</p>
                        <p className="text-sm text-muted-foreground">
                          ¥{(weeklyFinances.revenue * 0.25).toFixed(0).toLocaleString()} / week
                          (estimated)
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-sm text-muted-foreground italic">
                  Financial data unavailable
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Expenses */}
        <Card className="paper">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-400" />
              Ongoing Expenses
            </CardTitle>
            <CardDescription>The recurring costs of running a heya</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {weeklyFinances ? (
                <>
                  <div className="flex items-center justify-between py-2 border-b border-border/30">
                    <span className="text-muted-foreground">Weekly Expenses</span>
                    <span className="font-display font-bold text-red-400">
                      ¥{weeklyFinances.expenses.toLocaleString()}
                    </span>
                  </div>
                  <div className="space-y-2 pt-2">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-red-400 mt-2" />
                      <div>
                        <p className="font-medium">Facility Maintenance</p>
                        <p className="text-sm text-muted-foreground">
                          ¥{(weeklyFinances.expenses * 0.3).toFixed(0).toLocaleString()} / week
                          (estimated)
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-red-400 mt-2" />
                      <div>
                        <p className="font-medium">Staff Salaries</p>
                        <p className="text-sm text-muted-foreground">
                          ¥{(weeklyFinances.expenses * 0.25).toFixed(0).toLocaleString()} / week
                          (estimated)
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-red-400 mt-2" />
                      <div>
                        <p className="font-medium">Food Costs</p>
                        <p className="text-sm text-muted-foreground">
                          ¥{(weeklyFinances.expenses * 0.25).toFixed(0).toLocaleString()} / week
                          (estimated)
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-red-400 mt-2" />
                      <div>
                        <p className="font-medium">Other Operations</p>
                        <p className="text-sm text-muted-foreground">
                          ¥{(weeklyFinances.expenses * 0.2).toFixed(0).toLocaleString()} / week
                          (estimated)
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-sm text-muted-foreground italic">
                  Financial data unavailable
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sponsor Draw */}
        {topEarners.length > 0 && (
          <Card className="paper">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-gold" />
                Sponsor Draw
              </CardTitle>
              <CardDescription>Who in your heya attracts the most banner attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topEarners.map((r, i) => {
                  const total = Number(r?.economics?.careerKenshoWon ?? 0) || 0;
                  const tier = kenshoTierLabel(total);

                  return (
                    <div key={r?.id ?? `${i}`} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-2xl font-display font-bold text-muted-foreground shrink-0">
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium truncate">
                            <RikishiName id={r?.id} name={r?.shikona ?? "Unknown"} />
                          </p>
                          <p className="text-xs text-muted-foreground">{tier.detail}</p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <Badge variant="outline">{tier.label}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Note */}
        <Card className="bg-muted/30 paper">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-west mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">About Economy</p>
                <p>
                  Your heya’s finances are shaped by rank presence, supporter strength, and
                  visibility. Strong basho performance draws prizes and kenshō—while injuries and
                  travel quietly increase costs.
                </p>
                <p className="mt-2">
                  The runway meter summarizes how safe your current trajectory is. Keep it healthy
                  by developing talent, managing risk, and cultivating supporters and sponsors.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
