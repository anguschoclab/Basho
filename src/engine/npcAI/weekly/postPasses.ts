import type { WorldState } from "../../types/world";
import type { Id } from "../../types/common";
import { getHeya, getRikishi } from "../../queries";
import {
  RISK_CONDITION_WEIGHT,
  RISK_FATIGUE_WEIGHT,
  HIGH_RISK_THRESHOLD,
  HIGH_RISK_RATIO_THRESHOLD,
} from "../../../constants/engine/npcStrategy";
import type { NPCWeeklyDecision } from "../types";

export function applyPromotionAwareness(
  world: WorldState,
  heyaId: string,
  decision: NPCWeeklyDecision
): void {
  const heya = getHeya(world, heyaId);
  if (!heya) return;

  const pushSet = new Set(decision.individualPushes);
  const developSet = new Set(decision.individualDevelops);

  for (const rikishiId of heya.rikishiIds ?? []) {
    const r = getRikishi(world, rikishiId);
    if (!r || r.isRetired || r.injured) continue;

    const rank = r.rank?.toLowerCase() ?? "";

    if (rank === "ozeki") {
      const kadobanEntry = world.ozekiKadoban?.[rikishiId];
      const isKadoban = kadobanEntry?.isKadoban === true;

      if (isKadoban) {
        if (!decision.individualProtects.includes(rikishiId)) {
          decision.individualProtects = [...decision.individualProtects, rikishiId];
          pushSet.delete(rikishiId);
          developSet.delete(rikishiId);
          decision.reasoning.push(
            `[PromotionAwareness] ${r.shikona ?? rikishiId} is Kadoban — added to protect list`
          );
        }
      } else {
        if (
          decision.trainingIntensity === "conservative" ||
          decision.trainingIntensity === "balanced"
        ) {
          decision.trainingIntensity = "intensive";
          decision.reasoning.push(
            `[PromotionAwareness] Ozeki in stable — raised training intensity to 'intensive' for Yokozuna run`
          );
        }
        if (!pushSet.has(rikishiId)) {
          pushSet.add(rikishiId);
          decision.reasoning.push(
            `[PromotionAwareness] ${r.shikona ?? rikishiId} is Ozeki — added to push list for Yokozuna run`
          );
        }
      }
    }

    if (rank === "yokozuna") {
      const warnings = r.councilWarnings ?? 0;
      if (warnings > 0) {
        if (!decision.individualProtects.includes(rikishiId)) {
          decision.individualProtects = [...decision.individualProtects, rikishiId];
          pushSet.delete(rikishiId);
          developSet.delete(rikishiId);
          decision.reasoning.push(
            `[PromotionAwareness] ${r.shikona ?? rikishiId} has ${warnings} YDC warning(s) — added to protect list`
          );
        }
        if (warnings >= 2) {
          if (
            decision.trainingIntensity === "punishing" ||
            decision.trainingIntensity === "intensive"
          ) {
            decision.trainingIntensity = "balanced";
            decision.reasoning.push(
              `[PromotionAwareness] ${r.shikona ?? rikishiId} has ${warnings} YDC warnings — reduced training intensity to 'balanced'`
            );
          }
        }
      }
    }

    if (rank === "sekiwake" || rank === "komusubi") {
      if (!developSet.has(rikishiId)) {
        developSet.add(rikishiId);
        decision.reasoning.push(
          `[PromotionAwareness] ${r.shikona ?? rikishiId} is ${r.rank} — added to develop list as Ozeki candidate`
        );
      }
    }
  }

  decision.individualPushes = [...pushSet];
  decision.individualDevelops = [...developSet];
}

export function applyInjuryRiskReduction(
  world: WorldState,
  heyaId: string,
  decision: NPCWeeklyDecision
): void {
  const heya = getHeya(world, heyaId);
  if (!heya) return;

  let highRiskCount = 0;
  const protectIds: Id[] = [];

  for (const rikishiId of heya.rikishiIds ?? []) {
    const r = getRikishi(world, rikishiId);
    if (!r || r.isRetired || r.injured) continue;

    const condition = r.condition ?? 100;
    const fatigue = r.fatigue ?? 0;
    const riskScore = (100 - condition) * RISK_CONDITION_WEIGHT + fatigue * RISK_FATIGUE_WEIGHT;

    if (riskScore > HIGH_RISK_THRESHOLD) {
      highRiskCount++;
      protectIds.push(rikishiId);
    }
  }

  // ⚡ Bolt: Use .length directly on the array to avoid O(N) allocation overhead of new Set()
  const rosterSize = (heya.rikishiIds ?? []).length;
  if (rosterSize > 0 && highRiskCount / rosterSize > HIGH_RISK_RATIO_THRESHOLD) {
    const intensity = decision.trainingIntensity;
    if (intensity === "punishing") {
      decision.trainingIntensity = "intensive";
      decision.reasoning.push(
        `[InjuryRisk] ${highRiskCount}/${rosterSize} rikishi at high risk — reduced intensity from 'punishing' to 'intensive'.`
      );
    } else if (intensity === "intensive") {
      decision.trainingIntensity = "balanced";
      decision.reasoning.push(
        `[InjuryRisk] ${highRiskCount}/${rosterSize} rikishi at high risk — reduced intensity from 'intensive' to 'balanced'.`
      );
    }
  }

  const existingProtects = new Set(decision.individualProtects);
  const pushSet = new Set(decision.individualPushes);
  const developSet = new Set(decision.individualDevelops);
  for (const id of protectIds) {
    if (!existingProtects.has(id)) {
      decision.individualProtects = [...decision.individualProtects, id];
      existingProtects.add(id);
      pushSet.delete(id);
      developSet.delete(id);
    }
  }
  decision.individualPushes = [...pushSet];
  decision.individualDevelops = [...developSet];
}
