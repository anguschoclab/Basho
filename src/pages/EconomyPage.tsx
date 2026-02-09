// EconomyPage.tsx
// Economy Page - Financial overview with narrative language
// Economy Canon: minimize raw numbers in player-facing UI (use bands + descriptions)
//
// DROP-IN FIXES (runtime + canon):
// - Canon rename: Basho (remove “Stable Lords” from titles)
// - Fix playerHeya lookup: use state.playerHeyaId (not state.world.playerHeyaId)
// - Guard optional fields (riskIndicators, bands, economics)
// - Remove raw salary amounts section (replaced with narrative rank-based description)
// - Avoid raw kenshō counts in UI (convert to banded labels + “rising/strong/legendary” tiers)
// - Keep Progress bar as a narrative meter (no currency numbers shown)
// - Add safe fallbacks when bands are missing in older saves
//
// ADDITIONAL HARDENING:
// - Works even if RunwayBand / KoenkaiBandType types are missing/changed (safe string fallbacks)
// - Never assumes playerHeya.rikishiIds exists
// - No hook usage outside component scope

import { useMemo } from "react";
import { Helmet } from "react-helmet";
import { useGame } from "@/contexts/GameContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { RikishiName } from "@/components/ClickableName";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Users,
  CircleDollarSign,
  Award,
  Shield,
  AlertTriangle,
  Info
} from "lucide-react";
import type { RunwayBand, KoenkaiBandType } from "@/engine/types";

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
    color: "text-emerald-400",
    icon: Shield,
    progressValue: 100
  },
  comfortable: {
    label: "Comfortable",
    description: "Finances are stable. You can weather minor setbacks without concern.",
    color: "text-green-400",
    icon: TrendingUp,
    progressValue: 75
  },
  tight: {
    label: "Tight Budget",
    description: "Careful management required. Unexpected expenses could cause problems.",
    color: "text-yellow-400",
    icon: Wallet,
    progressValue: 50
  },
  critical: {
    label: "Critical",
    description: "Pressure is mounting. Consider reducing costs or strengthening income streams.",
    color: "text-orange-400",
    icon: TrendingDown,
    progressValue: 25
  },
  desperate: {
    label: "Desperate",
    description: "Immediate intervention required. The heya’s survival is at stake.",
    color: "text-red-400",
    icon: AlertTriangle,
    progressValue: 10
  }
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
    color: "text-amber-400",
    monthlySupport: "Very High"
  },
  strong: {
    label: "Strong Kōenkai",
    description: "A dedicated group of supporters contributes reliably each month.",
    color: "text-purple-400",
    monthlySupport: "High"
  },
  moderate: {
    label: "Modest Kōenkai",
    description: "A smaller but loyal supporter base helps cover some expenses.",
    color: "text-blue-400",
    monthlySupport: "Moderate"
  },
  weak: {
    label: "Weak Kōenkai",
    description: "Few supporters. Building stronger relationships should be a priority.",
    color: "text-muted-foreground",
    monthlySupport: "Low"
  },
  none: {
    label: "No Kōenkai",
    description: "No organized supporter group yet. You’re operating without a safety net.",
    color: "text-red-400",
    monthlySupport: "None"
  }
};

// Expense categories (narrative)
const EXPENSE_CATEGORIES = [
  { name: "Wrestler Support", description: "Food, housing, and daily needs for the roster." },
  { name: "Heya Operations", description: "Utilities, maintenance, and administration." },
  { name: "Training & Equipment", description: "Dohyo upkeep, supplies, and coaching costs." },
  { name: "Medical & Recovery", description: "Treatment, rehab, and injury prevention." },
  { name: "Travel & Appearances", description: "Tours, events, and official obligations." }
];

// Income sources (narrative)
const INCOME_SOURCES = [
  { name: "League Distributions", description: "Official payments influenced by rank presence and prestige." },
  { name: "Kōenkai Contributions", description: "Recurring supporter donations and patronage." },
  { name: "Kenshō Winnings", description: "Sponsor banner prizes earned through headline bouts." },
  { name: "Prize Money", description: "Tournament awards and special prizes." },
  { name: "Appearances", description: "Exhibitions, tours, and sanctioned events." }
];

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
  if (s === "secure" || s === "comfortable" || s === "tight" || s === "critical" || s === "desperate") return s;
  return "tight";
}

function safeKoenkaiBand(v: unknown): KoenkaiBandType {
  const s = typeof v === "string" ? v : "";
  if (s === "powerful" || s === "strong" || s === "moderate" || s === "weak" || s === "none") return s;
  return "none";
}

export default function EconomyPage() {
  const { state } = useGame();

  const world = state.world;

  const playerHeya = useMemo(() => {
    if (!world || !state.playerHeyaId) return null;
    return world.heyas.get(state.playerHeyaId) || null;
  }, [world, state.playerHeyaId]);

  const playerRikishi = useMemo(() => {
    if (!playerHeya || !world) return [];
    const ids: string[] = Array.isArray((playerHeya as any).rikishiIds) ? (playerHeya as any).rikishiIds : [];
    return ids
      .map((id) => world.rikishi.get(id))
      .filter(Boolean) as Array<NonNullable<ReturnType<typeof world.rikishi.get>>>;
  }, [playerHeya, world]);

  // Sekitori count (broad indicator; count is acceptable here)
  const sekitoriCount = useMemo(() => {
    if (!playerRikishi) return 0;
    return playerRikishi.filter((r: any) => r?.division === "makuuchi" || r?.division === "juryo").length;
  }, [playerRikishi]);

  // Top “sponsor draw” wrestlers (computed, displayed narratively)
  const topEarners = useMemo(() => {
    return [...playerRikishi]
      .filter((r: any) => r && typeof r === "object")
      .sort((a: any, b: any) => {
        const av = Number((a as any)?.economics?.careerKenshoWon ?? 0) || 0;
        const bv = Number((b as any)?.economics?.careerKenshoWon ?? 0) || 0;
        return bv - av;
      })
      .slice(0, 5);
  }, [playerRikishi]);

  if (!playerHeya) {
    return <div className="p-6 text-center text-muted-foreground">No heya selected.</div>;
  }

  const runwayBand = safeRunwayBand((playerHeya as any).runwayBand);
  const koenkaiBand = safeKoenkaiBand((playerHeya as any).koenkaiBand);

  const runwayConfig = RUNWAY_CONFIG[runwayBand];
  const koenkaiConfig = KOENKAI_CONFIG[koenkaiBand];
  const RunwayIcon = runwayConfig.icon;

  const hasFinancialRisk = !!(playerHeya as any)?.riskIndicators?.financial;

  return (
    <>
      <Helmet>
        <title>Economy — {playerHeya.name} | Basho</title>
      </Helmet>

      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-3">
            <CircleDollarSign className="h-8 w-8" />
            Economy
          </h1>
          <p className="text-muted-foreground mt-1">{playerHeya.name} — Financial Overview</p>
        </div>

        {/* Financial Health Overview */}
        <Card className="paper">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RunwayIcon className={`h-5 w-5 ${runwayConfig.color}`} />
              <span className={runwayConfig.color}>{runwayConfig.label}</span>
            </CardTitle>
            <CardDescription>{runwayConfig.description}</CardDescription>
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
                    Financial pressure is rising. Consider cost control, sponsor growth, or safer training loads to
                    reduce injury costs.
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

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

        {/* Income Sources */}
        <Card className="paper">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-400" />
              Income Sources
            </CardTitle>
            <CardDescription>Where your heya’s support typically comes from</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {INCOME_SOURCES.map((source) => (
                <div key={source.name} className="flex items-start gap-3 py-2">
                  <div className="w-2 h-2 rounded-full bg-green-400 mt-2" />
                  <div>
                    <p className="font-medium">{source.name}</p>
                    <p className="text-sm text-muted-foreground">{source.description}</p>
                  </div>
                </div>
              ))}
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
              {EXPENSE_CATEGORIES.map((expense) => (
                <div key={expense.name} className="flex items-start gap-3 py-2">
                  <div className="w-2 h-2 rounded-full bg-red-400 mt-2" />
                  <div>
                    <p className="font-medium">{expense.name}</p>
                    <p className="text-sm text-muted-foreground">{expense.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sponsor Draw (Narrative; no raw kensho counts) */}
        {topEarners.length > 0 && (
          <Card className="paper">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-400" />
                Sponsor Draw
              </CardTitle>
              <CardDescription>Who in your heya attracts the most banner attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topEarners.map((r: any, i: number) => {
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
              <Info className="h-5 w-5 text-blue-400 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">About Economy</p>
                <p>
                  Your heya’s finances are shaped by rank presence, supporter strength, and visibility. Strong basho
                  performance draws prizes and kenshō—while injuries and travel quietly increase costs.
                </p>
                <p className="mt-2">
                  The runway meter summarizes how safe your current trajectory is. Keep it healthy by developing talent,
                  managing risk, and cultivating supporters and sponsors.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
