import type { Id } from "../types/common";
import type { OyakataArchetype, OyakataMood } from "../types/oyakata";
import type { TrainingIntensity, TrainingFocus, RecoveryEmphasis } from "../types/training";
import type { StateImpact } from "../core/StateImpact";

export interface AgentDecisions {
  finance: {
    shouldBuyMyoseki: boolean;
    shouldInvestInFacilities: boolean;
    shouldBuildReserves: boolean;
    riskLevel: "conservative" | "moderate" | "aggressive";
  };
  governance: {
    shouldReduceScandal: boolean;
    shouldUsePoliticalFavor: boolean;
    shouldSabotageRival: boolean;
  };
  recruitment: {
    maxBid: number;
    shouldBid: boolean;
    bidStrategy: "aggressive" | "moderate" | "conservative";
  };
  rivalry: {
    escalateRivalry: boolean;
    deescalateRivalry: boolean;
    targetRivalForMatchmaking: string[];
  };
  narrative: {
    shouldTriggerEvent: boolean;
    eventType?: string;
    narrativeTone: "heroic" | "tragic" | "dramatic" | "underdog" | "neutral";
  };
}

export interface NPCWeeklyDecision {
  heyaId: Id;
  archetype: OyakataArchetype | "unknown";
  trainingIntensity: TrainingIntensity;
  trainingFocus: TrainingFocus;
  recovery: RecoveryEmphasis;
  scoutingPriority: "none" | "passive" | "active" | "aggressive";
  individualProtects: Id[];
  individualDevelops: Id[];
  individualPushes: Id[];
  reasoning: string[];
  mood?: OyakataMood;
  impact: StateImpact;
  agentDecisions?: AgentDecisions;
}
