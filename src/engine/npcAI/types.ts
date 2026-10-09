import type { Id } from "../types/common";
import type { OyakataArchetype, OyakataMood } from "../types/oyakata";
import type { TrainingIntensity, TrainingFocus, RecoveryEmphasis } from "../types/training";
import type { StateImpact } from "../core/StateImpact";

export interface AgentDecisions {
  finance: {
    shouldBuyMyoseki: boolean;
    myosekiId?: string;
    shouldInvestInFacilities: boolean;
    shouldBuildReserves: boolean;
    riskLevel: "conservative" | "moderate" | "aggressive";
    shouldSeekRescue?: boolean;
    rescueMenu?: "sponsor_drive" | "bailout_loan" | "faction_appeal";
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
    /** Escalation was driven by a personal grudge (WS7 surfacing flag). */
    vendetta?: boolean;
  };
  narrative: {
    shouldTriggerEvent: boolean;
    eventType?: string;
    rikishiId?: Id;
    narrativeTone: "heroic" | "tragic" | "dramatic" | "underdog" | "neutral";
  };
  /** Strategic infrastructure actions (staff, academy) driven by active plan. */
  infrastructure?: {
    shouldHireStaff: boolean;
    staffRole?: string;
    shouldBuildAcademy: boolean;
    shouldUpgradeAcademy: boolean;
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
