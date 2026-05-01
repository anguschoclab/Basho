/**
 * FacilityROIChart.tsx
 *
 * Grouped bar chart visualizing cost vs. efficiency for upgrading each
 * facility axis by the next 5 points. Cost formula mirrors facilities.ts
 * (pure inline replica — no engine imports).
 */

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatYen } from "@/utils/engineUtils";

// === Inline cost formula (mirrors upgradeCost() in facilities.ts) ===
// Base 200k per point, scaling quadratically past 60.

function upgradeCostPerPoint(currentLevel: number): number {
  const base = 200_000;
  if (currentLevel < 40) return base;
  if (currentLevel < 60) return base * 1.5;
  if (currentLevel < 80) return base * 2.5;
  return base * 4; // 80+ is very expensive
}

const UPGRADE_POINTS = 5;
const MAX_FACILITY = 100;

/**
 * Estimate total cost to upgrade from currentLevel by points steps.
 * Clamps at MAX_FACILITY exactly as investInFacility does.
 */
function estimateCost(currentLevel: number, points: number): number {
  const effective = Math.min(points, MAX_FACILITY - currentLevel);
  if (effective <= 0) return 0;
  let total = 0;
  for (let i = 0; i < effective; i++) {
    total += upgradeCostPerPoint(currentLevel + i);
  }
  return total;
}

/**
 * Approximate stat gain for upgrading by `points` from `currentLevel`.
 * Mirrors investInFacility behaviour: higher levels yield diminishing returns.
 * Each point gained is worth (1 + currentLevel / 100) where currentLevel
 * advances one step at a time.
 */
function statGain(currentLevel: number, points: number): number {
  const effective = Math.min(points, MAX_FACILITY - currentLevel);
  if (effective <= 0) return 0;
  let total = 0;
  for (let i = 0; i < effective; i++) {
    total += 1 + (currentLevel + i) / 100;
  }
  return total;
}

// ===

export interface FacilityROIChartProps {
  heya: {
    facilities: { training: number; recovery: number; nutrition: number };
    funds: number;
  };
}

interface AxisDatum {
  axis: string;
  upgradeCost: number;
  costMillion: number;
  efficiencyScore: number;
  currentLevel: number;
  atMax: boolean;
}

interface CustomTooltipPayload {
  name: string;
  value: number;
  color: string;
  payload: AxisDatum;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: CustomTooltipPayload[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const datum = payload[0]?.payload;

  return (
    <div
      style={{
        backgroundColor: "hsl(var(--card))",
        borderColor: "hsl(var(--border))",
        border: "1px solid",
        borderRadius: "12px",
        padding: "10px 14px",
        fontSize: "12px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
        minWidth: "180px",
      }}
    >
      <p className="font-semibold mb-2">{label}</p>
      {datum?.atMax ? (
        <p className="text-muted-foreground">At maximum level (100)</p>
      ) : (
        <>
          <p className="text-muted-foreground mb-1">
            Current level: {datum?.currentLevel ?? "—"}
          </p>
          {payload.map((p) => {
            if (p.name === "Cost (¥M)") {
              return (
                <p key={p.name} style={{ color: p.color }}>
                  {p.name}: {formatYen(datum?.upgradeCost ?? 0)}
                </p>
              );
            }
            return (
              <p key={p.name} style={{ color: p.color }}>
                {p.name}: {typeof p.value === "number" ? p.value.toFixed(2) : p.value}
              </p>
            );
          })}
        </>
      )}
    </div>
  );
}

export function FacilityROIChart({ heya }: FacilityROIChartProps) {
  const axes = useMemo<AxisDatum[]>(() => {
    const cfg = [
      { key: "training" as const, label: "Training" },
      { key: "recovery" as const, label: "Recovery" },
      { key: "nutrition" as const, label: "Nutrition" },
    ];

    return cfg.map(({ key, label }) => {
      const currentLevel = heya.facilities[key] ?? 0;
      const atMax = currentLevel >= MAX_FACILITY;
      const cost = estimateCost(currentLevel, UPGRADE_POINTS);
      const gain = statGain(currentLevel, UPGRADE_POINTS);
      const costMillion = cost / 1_000_000;
      // efficiency: gain per ¥1M spent (avoid /0 at max)
      const efficiencyScore = costMillion > 0 ? gain / costMillion : 0;
      return { axis: label, upgradeCost: cost, costMillion, efficiencyScore, currentLevel, atMax };
    });
  }, [heya.facilities]);

  const allAtMax = axes.every((d) => d.atMax);

  // Axis with highest efficiency score (for ReferenceLine)
  const bestAxis = useMemo(
    () => axes.reduce((best, d) => (d.efficiencyScore > best.efficiencyScore ? d : best), axes[0]),
    [axes]
  );

  return (
    <Card className="paper">
      <CardHeader>
        <CardTitle>Facility Upgrade ROI</CardTitle>
        <CardDescription>Cost vs. efficiency for next upgrade tier</CardDescription>
      </CardHeader>
      <CardContent>
        {allAtMax ? (
          <div className="flex items-center justify-center h-[220px] text-sm text-muted-foreground">
            All facilities at maximum level.
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground mb-4">
              Upgrade cost for next +{UPGRADE_POINTS} points
            </p>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={axes}
                  margin={{ top: 10, right: 24, left: 0, bottom: 0 }}
                  barCategoryGap="25%"
                  barGap={4}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="axis"
                    tick={{ fontSize: 11, fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: string, index: number) => {
                      const d = axes[index];
                      return d && !d.atMax && d.axis === bestAxis?.axis ? `${v} ★` : v;
                    }}
                  />
                  {/* Left Y axis — cost in ¥M */}
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 10, fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => `¥${v.toFixed(1)}M`}
                    width={58}
                    label={{
                      value: "Cost (¥M)",
                      angle: -90,
                      position: "insideLeft",
                      offset: 10,
                      style: { fontSize: 10, fill: "hsl(var(--muted-foreground))" },
                    }}
                  />
                  {/* Right Y axis — efficiency score */}
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 10, fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => v.toFixed(1)}
                    width={44}
                    label={{
                      value: "Efficiency",
                      angle: 90,
                      position: "insideRight",
                      offset: 10,
                      style: { fontSize: 10, fill: "hsl(var(--muted-foreground))" },
                    }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  {/* ReferenceLine marks the best-efficiency axis */}
                  {bestAxis && !bestAxis.atMax && (
                    <ReferenceLine
                      yAxisId="right"
                      x={bestAxis.axis}
                      stroke="hsl(var(--success) / 0.4)"
                      strokeDasharray="4 3"
                      strokeWidth={2}
                    />
                  )}
                  <Bar
                    yAxisId="left"
                    dataKey="costMillion"
                    name="Cost (¥M)"
                    fill="hsl(var(--destructive) / 0.6)"
                    radius={[3, 3, 0, 0]}
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="efficiencyScore"
                    name="Efficiency Score"
                    fill="hsl(var(--success) / 0.7)"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
