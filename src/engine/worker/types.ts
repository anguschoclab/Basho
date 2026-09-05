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
  | {
      type: "SET_TRAINING_STATE";
      heyaId: string;
      trainingState: import("../types/training").HeyaTrainingState;
    }
  | { type: "REQUEST_POLITICAL_FAVOR"; heyaId: string; favorId: string }
  | { type: "HANDLE_MEDIA_EVENT"; eventId: string; choice: string }
  | { type: "ISSUE_RULING"; rulingId: string; severity: "lenient" | "standard" | "harsh" }
  | { type: "PAUSE_SIM" }
  | { type: "RESUME_SIM" }
  | { type: "GET_DIGEST" }
  | { type: "RESOLVE_LOOP_DECISION"; decisionId: string; optionId: string }
  | { type: "WITHDRAW_RIKISHI"; rikishiId: string }
  | { type: "TREAT_INJURY"; rikishiId: string; weeks: number }
  | {
      type: "INVEST_IN_FACILITY";
      heyaId: string;
      axis: import("../facilities").FacilityAxis;
      points: number;
    }
  | {
      type: "BUILD_INFRASTRUCTURE";
      heyaId: string;
      facilityId: import("../types/infrastructure").FacilityId;
    }
  | { type: "ASSIGN_MENTOR"; mentorId: string; apprenticeId: string }
  | { type: "REMOVE_MENTOR"; apprenticeId: string }
  | { type: "ADD_SPARRING_PAIR"; heyaId: string; aId: string; bId: string }
  | { type: "REMOVE_SPARRING_PAIR"; heyaId: string; aId: string; bId: string }
  | { type: "BOOKMARK_ENTITY"; entityType: string; entityId: string; note?: string }
  | { type: "UNBOOKMARK_ENTITY"; entityType: string; entityId: string }
  | { type: "UPDATE_BOOKMARK_NOTE"; entityType: string; entityId: string; note: string }
  | { type: "ADVANCE_TUTORIAL_STEP"; step: import("../types/tutorial").TutorialStep }
  | { type: "SET_TUTORIAL_FLAG"; flag: keyof import("../types/tutorial").TutorialFlags }
  | {
      type: "FINISH_EXHIBITION";
      flag: keyof import("../types/tutorial").TutorialFlags;
      step: import("../types/tutorial").TutorialStep;
    }
  | { type: "COMPLETE_TUTORIAL" }
  | { type: "APPLY_PRESS_CONFERENCE"; heyaId: string; reputationDelta: number }
  | { type: "SET_HEYA_DIET"; heyaId: string; diet: import("../types/economy").DietRegimen }
  | { type: "RETIRE_RIKISHI"; rikishiId: string; reason: string }
  | { type: "SPEND_POLITICAL_CAPITAL"; heyaId: string; amount: number }
  | { type: "RECRUIT_SPONSOR"; heyaId: string; sponsorId: string }
  | {
      type: "SET_SCOUTING_INVESTMENT";
      rikishiId: string;
      investment: import("../types/narrative").ScoutingInvestment;
    }
  | {
      type: "SET_KESHO_CONFIG";
      rikishiId: string;
      config: Partial<import("../types/keshoMawashi").KeshoMawashi>;
    }
  | {
      type: "ACCEPT_EXHIBITION";
      invitationId: string;
      rikishiId: string;
    }
  | {
      type: "DECLINE_EXHIBITION";
      invitationId: string;
    }
  | {
      type: "GO_ON_HOLIDAY";
      config: import("../holiday").HolidayConfig;
    }
  | {
      type: "SET_TSUKEBITO";
      seniorId: string;
      juniorId: string;
    }
  | {
      type: "CLEAR_TSUKEBITO";
      seniorId: string;
      juniorId: string;
    }
  | {
      type: "BUILD_FOREIGN_ACADEMY";
      heyaId: string;
      region: import("../systems/worldCircuit/WorldCircuitService").ExhibitionRegion;
    }
  | {
      type: "BUILD_YOUTH_ACADEMY";
      heyaId: string;
    }
  | {
      type: "UPGRADE_YOUTH_ACADEMY";
      heyaId: string;
    }
  | {
      type: "INVEST_ACADEMY";
      heyaId: string;
      amount: number;
    }
  | {
      type: "HIRE_ACADEMY_STAFF";
      heyaId: string;
      role: import("../types/academy").AcademyStaffRole;
    }
  | {
      type: "PROMOTE_INTAKE";
      heyaId: string;
      prospectId: string;
    };

/** Worker -> UI Events */
export type EngineEvent =
  | { type: "READY"; worldExists: boolean }
  | { type: "TICK_COMPLETED"; digest: UIDigest; digestRevision?: number }
  | { type: "DIGEST_UPDATED"; digest: UIDigest; digestRevision?: number }
  | { type: "WORLD_UPDATED"; world: WorldState; version: number }
  | { type: "ERROR"; message: string }
  | { type: "PROGRESS"; message: string; current: number; total: number }
  | {
      type: "PERF_TRACE";
      trace: Array<{ phaseName: string; durationMs: number; impactSize?: number }>;
    };

export interface WorkerMessage<T = EngineCommand | EngineEvent> {
  data: T;
}
