/**
 * StableRivalryService.ts
 * =======================
 * Manages institutional "Heat" and "Respect" between stables.
 * (Phase 3: Global Circuit & Rivalry Dynamics)
 */

import { WorldState } from "../../types/world";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import { StateImpact } from "../../core/StateImpact";
import { clamp } from "../../utils/math";
import { reportScandal } from "./systems/governance/ScandalService";

export type StableRelationTone = "respect" | "neutral" | "tense" | "rivalry" | "bad_blood";

export interface StableRelationRecord {
  heat: number; // 0..100
  closeness: number; // 0..100
  spite: number; // 0..100
  totalMeetings: number;
  lastBoutWeek: number;
  tone: StableRelationTone;
}

export const StableRivalryService = {
  /**
   * Generates a unique key for a stable pair.
   */
  getPairKey(idA: string, idB: string): string {
    return idA < idB ? `${idA}|${idB}` : `${idB}|${idA}`;
  },

  /**
   * Derives the tone of the relationship based on metrics.
   */
  deriveTone(record: StableRelationRecord): StableRelationTone {
    if (record.heat >= 85 || record.spite >= 80) return "bad_blood";
    if (record.heat >= 60) return "rivalry";
    if (record.heat >= 35) return "tense";
    if (record.closeness >= 60 && record.spite < 20) return "respect";
    return "neutral";
  },

  /**
   * Increases heat between two stables following a high-stakes encounter.
   */
  processBoutImpact(
    world: WorldState,
    heyaAId: string,
    heyaBId: string,
    isTitleStakes: boolean
  ): StateImpact {
    const builder = createImpactBuilder("processStableBoutImpact");
    const key = this.getPairKey(heyaAId, heyaBId);

    const worldRelations = world.stableRelations || {};
    const record: StableRelationRecord = worldRelations[key] || {
      heat: 0,
      closeness: 0,
      spite: 0,
      totalMeetings: 0,
      lastBoutWeek: world.week,
      tone: "neutral",
    };

    const heatGain = isTitleStakes ? 8 : 3;
    const newHeat = clamp(record.heat + heatGain, 0, 100);
    const newMeetings = record.totalMeetings + 1;

    const updatedRecord: StableRelationRecord = {
      ...record,
      heat: newHeat,
      totalMeetings: newMeetings,
      lastBoutWeek: world.week,
    };
    updatedRecord.tone = this.deriveTone(updatedRecord);

    // Update world state
    const nextRelations = { ...worldRelations, [key]: updatedRecord };
    builder.updateWorldField("stableRelations", nextRelations);

    // If tone shifted to rivalry or bad blood, log it
    if (
      updatedRecord.tone !== record.tone &&
      (updatedRecord.tone === "rivalry" || updatedRecord.tone === "bad_blood")
    ) {
      builder.logEvent(
        "STABLE_FEUD_ESCALATION",
        "narrative",
        {
          stables: [heyaAId, heyaBId],
          tone: updatedRecord.tone,
          incident: `Tension between ${heyaAId} and ${heyaBId} has reached the level of ${updatedRecord.tone}.`,
        },
        { importance: "major" }
      );

      // JSA Stability Warning if it reaches Bad Blood (Phase 3 Polish)
      if (updatedRecord.tone === "bad_blood") {
        builder.merge(
          reportScandal(
            world,
            heyaAId,
            "minor",
            `Unstable rivalry with ${heyaBId} threatening JSA decorum.`
          )
        );
        builder.merge(
          reportScandal(
            world,
            heyaBId,
            "minor",
            `Unstable rivalry with ${heyaAId} threatening JSA decorum.`
          )
        );
      }
    }

    return builder.build();
  },
};
