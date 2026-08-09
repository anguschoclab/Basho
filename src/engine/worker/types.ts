import type { WorldState } from "../types/world";
import type { UIDigest } from "../../presenters/uiDigest";

/** UI -> Worker Commands */
export type EngineCommand =
  | { type: "START_WORLD"; seed: string; playerHeyaId?: string }
  | { type: "LOAD_WORLD"; world: WorldState }
  | { type: "TICK_DAY" }
  | { type: "TICK_MULTIPLE_DAYS"; days: number }
  | { type: "START_BASHO" }
  | { type: "AUTO_SIM_DAYS"; days: number }
  | { type: "OFFER_CONTRACT"; candidateId: string; heyaId: string }
  | { type: "SCOUT_POOL"; pool: import("../types/talent").TalentPoolType; revealCount: number }
  | { type: "SCOUT_CANDIDATE"; candidateId: string; effort: number }
  | { type: "POACH_CANDIDATE"; candidateId: string; heyaId: string }
  | {
      type: "RESOLVE_CRISIS";
      crisisId: string;
      choice: "lenient" | "standard" | "harsh" | "cover_up";
    }
  | { type: "BUY_MYOSEKI"; myosekiId: string; buyerId: string; buyerHeyaId: string }
  | { type: "LEASE_MYOSEKI"; myosekiId: string; buyerId: string }
  | { type: "RENEW_SPONSOR"; relationshipId: string; sponsorId: string }
  | { type: "REQUEST_BAILOUT"; heyaId: string }
  | { type: "PREPAY_LOAN"; heyaId: string; loanId: string }
  | { type: "HIRE_STAFF"; heyaId: string; role: import("../types/staff").StaffRole }
  | { type: "FIRE_STAFF"; heyaId: string; staffId: string }
  | { type: "TRIGGER_SUCCESSION"; heyaId: string; successorId: string }
  | { type: "SET_TRAINING_STATE"; heyaId: string; trainingState: import("../types/training").HeyaTrainingState }
  | { type: "REQUEST_POLITICAL_FAVOR"; heyaId: string; favorId: string }
  | { type: "HANDLE_MEDIA_EVENT"; eventId: string; choice: string }
  | { type: "ISSUE_RULING"; rulingId: string; severity: "lenient" | "standard" | "harsh" }
  | { type: "PAUSE_SIM" }
  | { type: "RESUME_SIM" }
  | { type: "GET_DIGEST" }
  | { type: "RESOLVE_LOOP_DECISION"; decisionId: string; optionId: string }
  | { type: "WITHDRAW_RIKISHI"; rikishiId: string }
  | { type: "TREAT_INJURY"; rikishiId: string; weeks: number }
  | { type: "INVEST_IN_FACILITY"; heyaId: string; axis: import("../facilities").FacilityAxis; points: number }
  | { type: "BUILD_INFRASTRUCTURE"; heyaId: string; facilityId: import("../types/infrastructure").FacilityId };

/** Worker -> UI Events */
export type EngineEvent =
  | { type: "READY"; worldExists: boolean }
  | { type: "TICK_COMPLETED"; digest: UIDigest; digestRevision?: number }
  | { type: "DIGEST_UPDATED"; digest: UIDigest; digestRevision?: number }
  | { type: "WORLD_UPDATED"; world: WorldState; version: number }
  | { type: "ERROR"; message: string }
  | { type: "PROGRESS"; message: string; current: number; total: number }
  | { type: "PERF_TRACE"; trace: Array<{ phaseName: string; durationMs: number; impactSize?: number }> };

export interface WorkerMessage<T = EngineCommand | EngineEvent> {
  data: T;
}
