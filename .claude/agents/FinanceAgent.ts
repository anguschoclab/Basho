/**
 * FinanceAgent.ts
 * ==============
 * Worker agent for handling financial decisions.
 * Decides on investments, myoseki purchases, and financial risk management.
 */

import type { WorldState } from "../types/world";
import type { Oyakata } from "../types/oyakata";
import { stableSort } from "../utils/sort";

export interface FinanceAgentContext {
  oyakata: Oyakata;
  world: WorldState;
  runwayBand: string;
  funds: number;
  monthlyBurn: number;
}

export interface FinanceAgentResult {
  shouldBuyMyoseki: boolean;
  myosekiId?: string;
  shouldInvestInFacilities: boolean;
  facilityType?: string;
  shouldBuildReserves: boolean;
  reserveTarget: number;
  reasoning: string[];
  riskLevel: "conservative" | "moderate" | "aggressive";
}

/**
 * Finance Worker: Handles financial investment decisions
 * Evaluates runway, ambition, and risk appetite to determine financial strategy
 */
export function spawnFinanceAgent(ctx: FinanceAgentContext): FinanceAgentResult {
  const reasoning: string[] = [];
  const { oyakata, world, runwayBand, funds, monthlyBurn } = ctx;

  const isAmbitious = oyakata.traits.ambition > 60;
  const isRiskTaker = oyakata.traits.risk > 60;
  const isTraditionalist = oyakata.traits.tradition > 70;
  const isScientist = oyakata.archetype === "scientist";

  let riskLevel: "conservative" | "moderate" | "aggressive" = "moderate";
  let shouldBuyMyoseki = false;
  let shouldInvestInFacilities = false;
  let shouldBuildReserves = false;
  let facilityType: string | undefined;
  let reserveTarget: number = 0;
  let prioritized: any[] = [];

  // Determine risk level based on personality and runway
  if (runwayBand === "desperate" || runwayBand === "critical") {
    riskLevel = "conservative";
    reasoning.push("[Finance Agent] Critical runway forces conservative stance");
  } else if (isRiskTaker && isAmbitious && runwayBand === "comfortable") {
    riskLevel = "aggressive";
    reasoning.push("[Finance Agent] High risk appetite with comfortable runway enables aggression");
  } else if (isTraditionalist || runwayBand === "cautious") {
    riskLevel = "conservative";
    reasoning.push("[Finance Agent] Traditionalist/cautious approach selected");
  } else {
    riskLevel = "moderate";
    reasoning.push("[Finance Agent] Balanced financial approach");
  }

  // Calculate runway in months
  const runwayMonths = monthlyBurn > 0 ? funds / monthlyBurn : 999;

  // Myoseki purchase decision
  if (world.myosekiMarket && riskLevel !== "conservative") {
    const minRunwayMonths = isRiskTaker ? 6 : 12;

    if (runwayMonths > minRunwayMonths && isAmbitious) {
      const stocks = stableSort(Object.values(world.myosekiMarket.stocks), (x) => x.id);

      // Filter and prioritize stocks
      const affordableStocks = stocks.filter(s =>
        s.status === "available" &&
        s.askingPrice &&
        s.askingPrice < funds * 0.5
      );

      prioritized = affordableStocks.sort((a, b) => {
        let scoreA = 0;
        let scoreB = 0;
        // Prefer elite stocks for ambitious oyakata
        if (a.prestigeTier === "elite") scoreA += 30;
        if (b.prestigeTier === "elite") scoreB += 30;
        if (a.prestigeTier === "respected") scoreA += 15;
        if (b.prestigeTier === "respected") scoreB += 15;
        // Prefer cheaper options for moderate
        scoreA += (funds - (a.askingPrice || 0)) / 1000000;
        scoreB += (funds - (b.askingPrice || 0)) / 1000000;
        return scoreB - scoreA;
      });

      if (prioritized.length > 0) {
        shouldBuyMyoseki = true;
        const selected = prioritized[0];
        reasoning.push(`[Finance Agent] Targeting myoseki: ${selected.id} (¥${(selected.askingPrice || 0).toLocaleString()})`);
      } else {
        reasoning.push("[Finance Agent] No affordable myoseki available");
      }
    } else {
      reasoning.push("[Finance Agent] Insufficient runway or ambition for myoseki purchase");
    }
  } else {
    reasoning.push("[Finance Agent] Conservative stance or no market available - skipping myoseki");
  }

  // Facility investment decision
  if (runwayMonths > 12 && (isScientist || isAmbitious)) {
    shouldInvestInFacilities = true;
    if (isScientist) {
      facilityType = "recovery";
      reasoning.push("[Finance Agent] Scientist archetype prioritizes recovery facilities");
    } else if (isTraditionalist) {
      facilityType = "training";
      reasoning.push("[Finance Agent] Traditionalist prioritizes training facilities");
    } else {
      facilityType = "nutrition";
      reasoning.push("[Finance Agent] Defaulting to nutrition facilities");
    }
  }

  // Reserve building decision
  if (runwayMonths < 6 || riskLevel === "conservative") {
    shouldBuildReserves = true;
    reserveTarget = monthlyBurn * 6; // 6 months runway target
    reasoning.push(`[Finance Agent] Building reserves to ${reserveTarget.toLocaleString()} for safety`);
  } else {
    reserveTarget = monthlyBurn * 3; // 3 months runway target
    reasoning.push(`[Finance Agent] Maintaining ${reserveTarget.toLocaleString()} reserve target`);
  }

  reasoning.push(`[Finance Agent] Final strategy: ${riskLevel} risk level`);
  reasoning.push(`[Finance Agent] Current runway: ${runwayMonths.toFixed(1)} months`);

  return {
    shouldBuyMyoseki,
    myosekiId: shouldBuyMyoseki ? prioritized?.[0]?.id : undefined,
    shouldInvestInFacilities,
    facilityType,
    shouldBuildReserves,
    reserveTarget,
    reasoning,
    riskLevel,
  };
}
