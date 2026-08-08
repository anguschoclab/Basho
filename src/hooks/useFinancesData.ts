import { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { usePlayerHeya } from "@/hooks/usePlayerHeya";
import { useGame } from "@/contexts/useGame";
import { calculateHeyaWeeklyFinances } from "@/engine/systems/economy/FinanceCalculator";
import { FINANCES_RUNWAY_CONFIG } from "@/constants/ui/finances";

export function useFinancesData() {
  const navigate = useNavigate();
  const { heya } = usePlayerHeya();
  const { state } = useGame();
  const world = state.world;

  const config = useMemo(() => {
    if (!heya) return FINANCES_RUNWAY_CONFIG.comfortable;
    const band = (heya as { runwayBand?: string }).runwayBand || "comfortable";
    return FINANCES_RUNWAY_CONFIG[band] ?? FINANCES_RUNWAY_CONFIG.comfortable;
  }, [heya]);

  const finances = useMemo(() => {
    if (!heya || !world) return null;
    return calculateHeyaWeeklyFinances(heya, world);
  }, [heya, world]);

  const history = useMemo(() => {
    const base = heya?.funds ?? 0;
    const net = (finances?.revenue ?? 0) - (finances?.expenses ?? 0);
    const points = [];
    for (let i = 7; i >= 1; i--) {
      points.push({ name: `W-${i}`, value: Math.max(0, base - net * i), projected: false });
    }
    points.push({ name: "Now", value: base, projected: false });
    points.push({ name: "W+1", value: Math.max(0, base + net), projected: true });
    points.push({ name: "W+2", value: Math.max(0, base + net * 2), projected: true });
    return points;
  }, [heya?.funds, finances?.revenue, finances?.expenses]);

  const headerAction = useMemo(
    () => ({
      label: "Deep Dive",
      onClick: () => navigate({ to: "/office/finances" }),
      tooltip: "Analyze stable financial health and project future runway",
    }),
    [navigate]
  );

  return { heya, config, finances, history, headerAction };
}
