import type { GameAction, GamePhase } from "./gameTypes";
import type { WorldState } from "@/engine/types/world";
import type { HolidayResult } from "@/engine/holiday";
import type { AutoSimResult } from "@/engine/autoSim";

export const createWorld = (seed: string, playerHeyaId?: string): GameAction => ({
  type: "CREATE_WORLD",
  seed,
  playerHeyaId,
});

export const setPlayerHeya = (heyaId: string): GameAction => ({
  type: "SET_PLAYER_HEYA",
  heyaId,
});

export const setPhase = (phase: GamePhase): GameAction => ({
  type: "SET_PHASE",
  phase,
});

export const startBasho = (): GameAction => ({
  type: "START_BASHO",
});

export const advanceDay = (): GameAction => ({
  type: "ADVANCE_DAY",
});

export const simulateBout = (boutIndex: number): GameAction => ({
  type: "SIMULATE_BOUT",
  boutIndex,
});

export const setBoutTactic = (boutId: string, tactic: import("@/engine/types/combat").BoutTactic): GameAction => ({
  type: "SET_BOUT_TACTIC",
  boutId,
  tactic,
});

export const simulateAllBouts = (): GameAction => ({
  type: "SIMULATE_ALL_BOUTS",
});

export const endDay = (): GameAction => ({
  type: "END_DAY",
});

export const endBasho = (): GameAction => ({
  type: "END_BASHO",
});

export const simFullBasho = (): GameAction => ({
  type: "SIM_FULL_BASHO",
});

export const advanceInterim = (weeks: number): GameAction => ({
  type: "ADVANCE_INTERIM",
  weeks,
});

export const advanceOneDay = (): GameAction => ({
  type: "ADVANCE_ONE_DAY",
});

export const tickMultipleDays = (days: number): GameAction => ({
  type: "TICK_MULTIPLE_DAYS",
  payload: { days },
});

export const runHoliday = (result: HolidayResult): GameAction => ({
  type: "RUN_HOLIDAY",
  result,
});

export const runAutoSim = (result: AutoSimResult): GameAction => ({
  type: "RUN_AUTO_SIM",
  result,
});

export const selectRikishi = (id: string | null): GameAction => ({
  type: "SELECT_RIKISHI",
  id,
});

export const selectHeya = (id: string | null): GameAction => ({
  type: "SELECT_HEYA",
  id,
});

export const setAutoPlay = (value: boolean): GameAction => ({
  type: "SET_AUTO_PLAY",
  value,
});

export const updateWorld = (world: WorldState): GameAction => ({
  type: "UPDATE_WORLD",
  world,
});

export const loadWorld = (world: WorldState): GameAction => ({
  type: "LOAD_WORLD",
  world,
});

export const upgradeHeya = (heyaId: string, axis: "training" | "recovery" | "nutrition", points?: number): GameAction => ({
  type: "UPGRADE_HEYA",
  heyaId,
  axis,
  points,
});

export const buildInfrastructure = (heyaId: string, facilityId: import("@/engine/types/infrastructure").FacilityId): GameAction => ({
  type: "BUILD_INFRASTRUCTURE",
  heyaId,
  facilityId,
});

export const recruitStaff = (heyaId: string, role: any): GameAction => ({
  type: "RECRUIT_STAFF",
  heyaId,
  role,
});

export const handleMediaEvent = (eventId: string, choice: string): GameAction => ({
  type: "HANDLE_MEDIA_EVENT",
  eventId,
  choice,
});

export const issueRuling = (rulingId: string, severity: "lenient" | "standard" | "harsh"): GameAction => ({
  type: "ISSUE_RULING",
  rulingId,
  severity,
});

export const advanceTutorialStep = (step: import("@/engine/types/tutorial").TutorialStep): GameAction => ({
  type: "ADVANCE_TUTORIAL_STEP",
  step,
});

export const setTutorialFlag = (flag: keyof import("@/engine/types/tutorial").TutorialFlags): GameAction => ({
  type: "SET_TUTORIAL_FLAG",
  flag,
});

export const completeTutorial = (): GameAction => ({
  type: "COMPLETE_TUTORIAL",
});
