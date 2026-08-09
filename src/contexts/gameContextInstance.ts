import { createContext } from "react";
import type { GamePhase, GameState } from "./gameTypes";
import type { UIDigest } from "@/presenters/uiDigest";
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import type { Heya } from "@/engine/types/heya";
import { type SaveSlotInfo } from "@/engine/saveload";
import { type HolidayConfig, type HolidayResult } from "@/engine/holiday";
import { type AutoSimConfig, type AutoSimResult } from "@/engine/autoSim";
import { getMatchesForDay } from "./gameHelpers";

export type { GamePhase, GameState } from "./gameTypes";

export interface GameContextValue {
  state: GameState;
  digest: UIDigest | null;
  createWorld: (
    seed: string,
    playerHeyaId?: string,
    oyakataConfig?: import("@/engine/types/oyakata").OyakataCreationConfig
  ) => void;
  setPhase: (phase: GamePhase) => void;
  startBasho: () => void;
  advanceDay: () => void;
  simulateBout: (boutIndex: number, boutId?: string) => void;
  setBoutTactic: (boutId: string, tactic: import("@/engine/types/combat").BoutTactic) => void;
  simulateAllBouts: () => void;
  endDay: () => void;
  endBasho: () => void;
  simFullBasho: () => void;
  tickMultipleDays: (days: number) => void;
  advanceInterim: (weeks?: number) => void;
  advanceOneDay: () => void;
  issueRuling: (rulingId: string, severity: "lenient" | "standard" | "harsh") => void;
  goOnHoliday: (config: HolidayConfig) => HolidayResult | null;
  runAutoSimAction: (config: AutoSimConfig) => Promise<AutoSimResult | null>;
  saveToSlot: (slotName: string) => boolean;
  loadFromSlot: (slotName: string) => boolean;
  quickSave: () => boolean;
  loadFromAutosave: () => boolean;
  hasAutosave: () => boolean;
  getSaveSlots: () => SaveSlotInfo[];
  getRikishi: (id: string) => Rikishi | undefined;
  getHeya: (id: string) => Heya | undefined;
  getCurrentDayMatches: () => ReturnType<typeof getMatchesForDay>;
  getStandings: () => Array<{ rikishi: Rikishi; wins: number; losses: number }>;
  updateWorld: (world: WorldState) => void;
  advanceTutorialStep: (step: import("@/engine/types/tutorial").TutorialStep) => void;
  setTutorialFlag: (flag: keyof import("@/engine/types/tutorial").TutorialFlags) => void;
  finishExhibition: (
    flag: keyof import("@/engine/types/tutorial").TutorialFlags,
    step: import("@/engine/types/tutorial").TutorialStep
  ) => void;
  buildInfrastructure: (
    heyaId: string,
    facilityId: import("@/engine/types/infrastructure").FacilityId
  ) => void;
  assignMentor: (mentorId: string, apprenticeId: string) => void;
  removeMentor: (apprenticeId: string) => void;
  addSparringPair: (heyaId: string, aId: string, bId: string) => void;
  removeSparringPair: (heyaId: string, aId: string, bId: string) => void;
  bookmarkEntity: (entityType: string, entityId: string, note?: string) => void;
  unbookmarkEntity: (entityType: string, entityId: string) => void;
  updateBookmarkNote: (entityType: string, entityId: string, note: string) => void;
  isBookmarked: (entityType: string, entityId: string) => boolean;
  runAutoSim: (config: AutoSimConfig) => Promise<AutoSimResult | null>;
  recruitSponsor: (sponsorId: string) => void;
  investInFacility: (
    heyaId: string,
    axis: import("@/engine/facilities").FacilityAxis,
    points: number
  ) => void;
}

export const GameContext = createContext<GameContextValue | null>(null);
