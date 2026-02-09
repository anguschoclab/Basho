/**
 * File Name: src/engine/types.ts
 * Notes:
 * - COMPLETE OVERHAUL to match high-fidelity simulation standards defined in the Constitution.
 * - MERGED: Event Bus System (Audit Fix) + Rich Domain Models (Constitution).
 * - Primary Event Log: `events: EventsState` (formerly historyLog).
 */

export type Id = string;
export type IdMap<T> = Record<Id, T>;
export type IdMapRuntime<T> = Map<Id, T>;

// === EVENTS SYSTEM TYPES (The Keystone System) ===

export type EventScope = "world" | "heya" | "rikishi";
export type EventPhase = "weekly" | "monthly" | "basho_day" | "basho_wrap" | "manual";
export type EventCategory =
  | "training"
  | "scouting"
  | "injury"
  | "economy"
  | "sponsor"
  | "media"
  | "rivalry"
  | "promotion"
  | "discipline"
  | "facility"
  | "milestone"
  | "match"       // Added for match results
  | "basho"       // Added for basho lifecycle
  | "misc";

export type EventImportance = "minor" | "notable" | "major" | "headline";

export interface EngineEvent {
  id: Id;
  type: string;   // Discriminator (e.g., "BASHO_STARTED", "INJURY_OCCURRED")
  
  // Causality
  causalEventId?: Id; // The event that caused this one (The "Why")

  // Temporal
  year: number;
  week: number;
  month?: number;
  bashoNumber?: 1 | 2 | 3 | 4 | 5 | 6;
  day?: number;

  phase: EventPhase;
  category: EventCategory;
  importance: EventImportance;

  scope: EventScope;
  heyaId?: Id;
  rikishiId?: Id;

  // Content
  title: string;
  summary: string;
  
  // Data Payload
  data: Record<string, string | number | boolean | null | undefined>;

  truthLevel: "public" | "limited" | "private";
  tags?: string[];
}

export interface EventsState {
  version: "1.0.0";
  log: EngineEvent[];
  dedupe: Record<string, true>;
}

/** =========================
 * Combat / Style
 * ========================= */

export type Style = "oshi" | "yotsu" | "hybrid";

export type Stance =
  | "migi-yotsu"
  | "hidari-yotsu"
  | "no-grip"
  | "belt-dominant"
  | "push-dominant";

export type TacticalArchetype =
  | "oshi_specialist"
  | "yotsu_specialist"
  | "speedster"
  | "trickster"
  | "all_rounder"
  | "hybrid_oshi_yotsu"
  | "counter_specialist";

export type KimariteFamily = "OSHI" | "YOTSU" | "THROW" | "TRIP" | "PULLDOWN" | "REVERSAL" | "SPECIAL";

export type KimariteId = string;

export type KimariteClass =
  | "force_out"
  | "push"
  | "thrust"
  | "throw"
  | "trip"
  | "twist"
  | "slap_pull"
  | "lift"
  | "rear"
  | "evasion"
  | "special"
  | "result"
  | "forfeit";

export const ARCHETYPE_PROFILES: Record<
  TacticalArchetype,
  {
    tachiaiBonus: number;
    gripPreference: number;
    preferredClasses: KimariteClass[];
    volatility: number;
    counterBonus: number;
    baseRisk: number;
    familyBias: Record<KimariteFamily, number>;
  }
> = {
  oshi_specialist: {
    tachiaiBonus: 8,
    gripPreference: -0.5,
    preferredClasses: ["force_out", "push", "thrust"],
    volatility: 0.2,
    counterBonus: 0,
    baseRisk: 0.6,
    familyBias: { OSHI: 1.45, YOTSU: 0.85, THROW: 0.9, TRIP: 0.95, PULLDOWN: 0.8, REVERSAL: 0.9, SPECIAL: 0.75 }
  },
  yotsu_specialist: {
    tachiaiBonus: -3,
    gripPreference: 1,
    preferredClasses: ["throw", "lift", "twist"],
    volatility: 0.15,
    counterBonus: 5,
    baseRisk: 0.45,
    familyBias: { OSHI: 0.85, YOTSU: 1.4, THROW: 1.35, TRIP: 0.95, PULLDOWN: 0.8, REVERSAL: 1.05, SPECIAL: 0.8 }
  },
  speedster: {
    tachiaiBonus: 5,
    gripPreference: -0.3,
    preferredClasses: ["trip", "slap_pull", "evasion"],
    volatility: 0.5,
    counterBonus: 8,
    baseRisk: 0.55,
    familyBias: { OSHI: 0.95, YOTSU: 0.9, THROW: 0.95, TRIP: 1.45, PULLDOWN: 1.0, REVERSAL: 1.1, SPECIAL: 0.9 }
  },
  trickster: {
    tachiaiBonus: 0,
    gripPreference: 0,
    preferredClasses: ["slap_pull", "trip", "special"],
    volatility: 0.6,
    counterBonus: 12,
    baseRisk: 0.65,
    familyBias: { OSHI: 0.9, YOTSU: 0.85, THROW: 0.9, TRIP: 1.05, PULLDOWN: 1.45, REVERSAL: 1.25, SPECIAL: 1.1 }
  },
  all_rounder: {
    tachiaiBonus: 2,
    gripPreference: 0,
    preferredClasses: ["force_out", "throw", "push"],
    volatility: 0.25,
    counterBonus: 3,
    baseRisk: 0.5,
    familyBias: { OSHI: 1.0, YOTSU: 1.0, THROW: 1.0, TRIP: 1.0, PULLDOWN: 1.0, REVERSAL: 1.0, SPECIAL: 1.0 }
  },
  hybrid_oshi_yotsu: {
    tachiaiBonus: 3,
    gripPreference: 0.2,
    preferredClasses: ["force_out", "throw", "push", "lift"],
    volatility: 0.3,
    counterBonus: 5,
    baseRisk: 0.52,
    familyBias: { OSHI: 1.2, YOTSU: 1.2, THROW: 1.1, TRIP: 0.95, PULLDOWN: 0.85, REVERSAL: 1.05, SPECIAL: 0.9 }
  },
  counter_specialist: {
    tachiaiBonus: -2,
    gripPreference: 0.3,
    preferredClasses: ["throw", "trip"],
    volatility: 0.35,
    counterBonus: 15,
    baseRisk: 0.48,
    familyBias: { OSHI: 0.9, YOTSU: 1.0, THROW: 1.1, TRIP: 1.1, PULLDOWN: 0.9, REVERSAL: 1.5, SPECIAL: 1.05 }
  }
};

/** =========================
 * Division / Rank / Banzuke
 * ========================= */

export type Division = "makuuchi" | "juryo" | "makushita" | "sandanme" | "jonidan" | "jonokuchi";

export type Rank =
  | "yokozuna"
  | "ozeki"
  | "sekiwake"
  | "komusubi"
  | "maegashira"
  | "juryo"
  | "makushita"
  | "sandanme"
  | "jonidan"
  | "jonokuchi";

export type NumberedRank = "maegashira" | "juryo" | "makushita" | "sandanme" | "jonidan" | "jonokuchi";
export type UnnumberedRank = "yokozuna" | "ozeki" | "sekiwake" | "komusubi";

export type Side = "east" | "west";

export type RankPosition =
  | { rank: UnnumberedRank; side: Side; rankNumber?: never }
  | { rank: NumberedRank; rankNumber: number; side: Side };

export function isNumberedRank(rank: Rank): rank is NumberedRank {
  return (
    rank === "maegashira" ||
    rank === "juryo" ||
    rank === "makushita" ||
    rank === "sandanme" ||
    rank === "jonidan" ||
    rank === "jonokuchi"
  );
}

export function toRankPosition(args: { rank: Rank; side: Side; rankNumber?: number }): RankPosition {
  const { rank, side, rankNumber } = args;
  if (isNumberedRank(rank)) {
    if (!rankNumber || rankNumber < 1) throw new Error(`Rank ${rank} requires rankNumber >= 1`);
    return { rank, side, rankNumber };
  }
  return { rank: rank as UnnumberedRank, side };
}

export interface BanzukeAssignment {
  rikishiId: Id;
  position: RankPosition;
}

export interface DivisionBanzukeSnapshot {
  division: Division;
  slots: RankPosition[];
  assignments: BanzukeAssignment[];
}

export interface BanzukeSnapshot {
  year: number;
  bashoNumber: 1 | 2 | 3 | 4 | 5 | 6;
  divisions: Record<Division, DivisionBanzukeSnapshot>;
}

export interface RikishiBashoPerformance {
  rikishiId: Id;
  division: Division;
  priorRank: RankPosition;
  wins: number;
  losses: number;
  absences?: number;
  fusenWins?: number;
  fusenLosses?: number;
  sos?: number;
}

/** =========================
 * Basho (Tournament)
 * ========================= */

export type BashoName = "hatsu" | "haru" | "natsu" | "nagoya" | "aki" | "kyushu";
export type Season = "winter" | "spring" | "summer" | "autumn";

export interface BashoInfo {
  name: BashoName;
  nameJa: string;
  nameEn: string;
  month: number;
  location: string;
  venue: string;
  venueJa: string;
  startDay: number;
  season: Season;
  description: string;
}

export interface BoutLogEntry {
  phase: "tachiai" | "clinch" | "momentum" | "finish";
  description: string;
  data?: Record<string, number | string | boolean | null | undefined>;
}

export interface BoutResult {
  boutId: string;
  winner: Side;
  winnerRikishiId: Id;
  loserRikishiId: Id;
  kimarite: KimariteId;
  kimariteName: string;
  stance: Stance;
  tachiaiWinner: Side;
  duration: number;
  upset: boolean;
  log: BoutLogEntry[];
  narrative?: string[]; // Legacy compat for UI display
}

export interface MatchSchedule {
  day: number;
  eastRikishiId: Id;
  westRikishiId: Id;
  result?: BoutResult | null;
}

export type StandingsTable = Record<Id, { wins: number; losses: number }>;
export type StandingsTableRuntime = Map<Id, { wins: number; losses: number }>;

export interface BashoState {
  year: number;
  bashoNumber: 1 | 2 | 3 | 4 | 5 | 6;
  bashoName: BashoName;
  day: number;
  matches: MatchSchedule[];
  standings: StandingsTableRuntime;
  isActive: boolean;
  
  // Legacy compat
  id?: string;
  name?: string;
  schedule?: MatchSchedule[][];
  results?: BoutResult[][];
  currentDay?: number;
}

/** =========================
 * Economics & Governance
 * ========================= */

export interface KenshoRecord {
  bashoName: BashoName;
  day: number;
  opponentId: Id;
  kenshoCount: number;
  amount: number;
}

export interface RikishiEconomics {
  cash: number;
  retirementFund: number;
  careerKenshoWon: number;
  kinboshiCount: number;
  totalEarnings: number;
  currentBashoEarnings: number;
  popularity: number;
}

// Governance Types
export type GovernanceStatus = "good_standing" | "warning" | "probation" | "sanctioned";

// Welfare / Compliance (Institutional)
export type ComplianceState = "compliant" | "watch" | "investigation" | "sanctioned";

export interface WelfareState {
  /** 0..100: Higher is worse */
  welfareRisk: number;
  complianceState: ComplianceState;
  /** Weeks spent in current complianceState */
  weeksInState: number;
  /** Investigation metadata (if any) */
  investigation?: {
    openedWeek: number;
    severity: "low" | "medium" | "high";
    triggers: string[];
    /** 0..100: how close they are to clearing the investigation */
    progress: number;
  };
  /** Active sanctions affecting operations */
  sanctions?: {
    recruitmentFreezeWeeks?: number;
    trainingIntensityCap?: "low" | "medium" | "high";
    fineYen?: number;
    note?: string;
  };
  lastReviewedWeek?: number;
}


export interface GovernanceRuling {
  id: string;
  date: string;
  heyaId: string;
  type: "fine" | "suspension" | "warning" | "closure";
  severity: "low" | "medium" | "high" | "terminal";
  reason: string;
  effects: {
    fineAmount?: number;
    prestigePenalty?: number;
    scandalScoreDelta?: number;
  };
}

/** =========================
 * Narrative bands (stable)
 * ========================= */

export type StatureBand = "legendary" | "powerful" | "established" | "rebuilding" | "fragile" | "new";
export type PrestigeBand = "elite" | "respected" | "modest" | "struggling" | "unknown";
export type FacilitiesBand = "world_class" | "excellent" | "adequate" | "basic" | "minimal";

export type KoenkaiBandType = "none" | "weak" | "moderate" | "strong" | "powerful";
export type KoenkaiBand = KoenkaiBandType;
export type RunwayBand = "secure" | "comfortable" | "tight" | "critical" | "desperate";

// Scouting convenience unions
export type ConfidenceLevel = "unknown" | "low" | "medium" | "high" | "certain";
export type ScoutingInvestment = "none" | "light" | "standard" | "deep";

// Leverage types
export type LeverageClass = "CompactAnchor" | "LongLever" | "TopHeavy" | "MobileLight" | "Standard";

// FTUE
export interface FTUEState {
  isActive: boolean;
  bashoCompleted: number;
  suppressedEvents: string[];
}

// Founding a brand-new heya was removed from the initial scope.
// Selection now means choosing a starting stable from the generated world.
export type StableSelectionMode = "take_over" | "recommended";

/** =========================
 * Training (shared types)
 * ========================= */

export type TrainingIntensity = "conservative" | "balanced" | "intensive" | "punishing";
export type TrainingFocus = "power" | "speed" | "technique" | "balance" | "neutral";
export type StyleBias = "oshi" | "yotsu" | "neutral";
export type RecoveryEmphasis = "low" | "normal" | "high";
export type FocusMode = "develop" | "push" | "protect" | "rebuild";
export type IndividualFocusType = FocusMode; // Alias for clarity

export interface TrainingProfile {
  intensity: TrainingIntensity;
  focus: TrainingFocus;
  styleBias: StyleBias;
  recovery: RecoveryEmphasis;
}

export interface IndividualFocus {
  rikishiId: Id;
  focusType: FocusMode;
}

export interface BeyaTrainingState {
  beyaId: Id;
  activeProfile: TrainingProfile;
  focusSlots: IndividualFocus[];
}

/** =========================
 * AI / Oyakata Personality
 * ========================= */

export type OyakataArchetype = 
  | "traditionalist" 
  | "scientist" 
  | "gambler" 
  | "nurturer" 
  | "tyrant" 
  | "strategist";

export interface OyakataTraits {
  ambition: number;    // 0-100: Desire for rank vs stability
  patience: number;    // 0-100: Long-term vs short-term results
  risk: number;        // 0-100: Willingness to risk injury/scandal
  tradition: number;   // 0-100: Bias towards old methods (Yotsu, high discipline)
  compassion: number;  // 0-100: Care for rikishi welfare
}

export interface Oyakata {
  id: Id;
  heyaId: Id;
  name: string;
  age: number;
  archetype: OyakataArchetype;
  traits: OyakataTraits;
  
  // Flavor
  formerShikona?: string;
  highestRank?: string;
  yearsInCharge: number;
  stats?: { scouting: number; training: number; politics: number }; // Legacy compat
  personality?: string; // Legacy compat

  // Manager Persona Extensions (Canon)
  quirks?: string[];
  managerFlags?: {
    welfareHawk?: boolean;
    disciplineHawk?: boolean;
    publicityHawk?: boolean;
    nepotist?: boolean;
  };
}

/** =========================
 * H2H & Records
 * ========================= */

export interface H2HRecord {
  wins: number;
  losses: number;
  lastMatch: {
    winnerId: string;
    kimarite: string;
    bashoId: string;
    day: number;
    year: number;
  } | null;
  streak: number; // Positive for wins against this opponent, negative for losses
}

export interface MatchResultLog {
  opponentId: string;
  win: boolean;
  kimarite: string; // Winning move
  bashoId: string;
  day: number;
}

/** =========================
 * Rikishi / Heya / World
 * ========================= */

// Legacy RikishiStats for UI compatibility
export interface RikishiStats {
  strength: number;
  technique: number;
  speed: number;
  weight: number;
  stamina: number;
  mental: number;
  adaptability: number;
  balance: number; // Added to match internal Balance
}

export interface Rikishi {
  id: Id;
  shikona: string;
  realName?: string;
  heyaId: Id;
  nationality: string;
  birthYear: number;
  origin?: string; // Legacy compat field

  // Physicals
  height: number;
  weight: number;

  // Attributes (0-100) - detailed internal model
  power: number;
  speed: number;
  balance: number;
  technique: number;
  aggression: number;
  experience: number;
  adaptability: number;

  momentum: number;
  stamina: number;
  fatigue: number; // 0-100

  isRetired?: boolean;

  injured: boolean;
  injuryWeeksRemaining: number;
  injuryStatus?: {
    type: string;
    isInjured?: boolean; // Legacy
    severity: string | number; // "Minor" or number
    location?: string;
    weeksRemaining: number;
    weeksToHeal?: number; // Legacy
  };

  style: Style;
  trainingFocus?: string; // Legacy field, replaced by training state
  archetype: TacticalArchetype;

  // Rank
  division: Division;
  rank: Rank;
  rankNumber?: number;
  side: Side;

  // Records
  careerWins: number;
  careerLosses: number;
  currentBashoWins: number;
  currentBashoLosses: number;
  
  // H2H & History
  h2h: Record<string, H2HRecord>;
  history: MatchResultLog[]; // Detailed match history

  favoredKimarite: KimariteId[];
  weakAgainstStyles: Style[];

  economics?: RikishiEconomics;
  
  // UI Compat
  name?: string;
  stats: RikishiStats; // Computed/Linked to internal attributes
  careerRecord?: { wins: number; losses: number; yusho: number };
  currentBashoRecord?: { wins: number; losses: number };
  
  // Flavor
  faceAvatarUrl?: string;
  personalityTraits: string[];
  condition: number;
  motivation: number;
}

export interface Heya {
  id: Id;
  name: string;
  nameJa?: string;
  oyakataId: Id;
  rikishiIds: Id[];

  statureBand: StatureBand;
  prestigeBand: PrestigeBand;
  facilitiesBand: FacilitiesBand;
  koenkaiBand: KoenkaiBandType;
  runwayBand: RunwayBand;

  reputation: number;
  funds: number;
  
  // Governance
  scandalScore: number;
  governanceStatus: GovernanceStatus;
  governanceHistory?: GovernanceRuling[];

  // Welfare / Compliance (Medical Responsibility Chain)
  welfareState?: WelfareState;

  facilities: {
    training: number;
    recovery: number;
    nutrition: number;
  };

  riskIndicators: {
    financial: boolean;
    governance: boolean;
    rivalry: boolean;
    welfare?: boolean;
  };

  trainingState?: BeyaTrainingState; // Legacy pointer?
  
  descriptor?: string;
  isPlayerOwned?: boolean;
  location?: string; // Legacy compat
}

export interface BashoResult {
  year: number;
  bashoNumber: 1 | 2 | 3 | 4 | 5 | 6;
  bashoName: BashoName;

  yusho: Id;
  junYusho: Id[];

  // Awards
  ginoSho?: Id;
  kantosho?: Id;
  shukunsho?: Id;

  playoffMatches?: MatchSchedule[];

  prizes: {
    yushoAmount: number;
    junYushoAmount: number;
    specialPrizes: number;
  };

  nextBanzuke?: BanzukeSnapshot;
}

/** =========================
 * WORLD STATE
 * ========================= */

export type CyclePhase = "active_basho" | "post_basho" | "interim";

export interface WorldState {
  id: string;
  seed: string;
  year: number;
  week: number;
  cyclePhase: CyclePhase; 

  currentBashoName?: BashoName;

  heyas: IdMapRuntime<Heya>;
  rikishi: IdMapRuntime<Rikishi>;
  oyakata: IdMapRuntime<Oyakata>; 

  currentBasho?: BashoState;
  history: BashoResult[];
  
  // THE NEW KE_YSTONE SYSTEM (Events Bus)
  // Replaces the static historyLog array with the robust EventsState system
  events: EventsState;

  governanceLog?: GovernanceRuling[];

  ftue: FTUEState;
  playerHeyaId?: Id;

  currentBanzuke?: BanzukeSnapshot;
  
  // Training State Store (HeyaId -> State)
  trainingState?: Record<Id, BeyaTrainingState>;

  // Talent Pools (Persistent pipelines of recruits)
  talentPool?: TalentPoolWorldState;

  // Legacy / UI Helpers
  currentDate?: Date;
  heyasArray?: Heya[]; // Optional helper for array-based UI mapping
  rikishiArray?: Rikishi[];
  oyakataArray?: Oyakata[];
  
  // Calendar compat
  calendar: {
    year: number;
    month: number;
    currentWeek: number;
    currentDay: number;
  };
  
  activeBasho?: {
    id: string;
  };
}

/** =========================
 * Talent Pools & Pipelines
 * ========================= */

export type TalentPoolType = "high_school" | "university" | "foreign";

export type VisibilityBand = "public" | "rumored" | "obscure" | "hidden";

export type CandidateAvailabilityState =
  | "available"
  | "in_talks"
  | "signed"
  | "locked"
  | "withdrawn";

export type SuitorInterestBand = "low" | "medium" | "high" | "all_in";
export type SuitorOfferType = "standard" | "aggressive" | "prestige_pitch" | "covert";

export interface SuitorRef {
  heyaId: Id;
  interestBand: SuitorInterestBand;
  offerType: SuitorOfferType;
  deadlineWeek: number;
}

export interface TalentCandidate {
  candidateId: Id;
  personId: Id; // stable identity (becomes rikishi id if signed)
  name: string;
  birthYear: number;
  originRegion: string;
  nationality: string;
  visibilityBand: VisibilityBand;
  reputationSeed: number; // latent potential
  tags: string[];
  availabilityState: CandidateAvailabilityState;
  competingSuitors: SuitorRef[];

  // Rikishi-facing latent profile
  archetype: TacticalArchetype;
  style: Style;
  heightPotentialCm: number;
  weightPotentialKg: number;
  talentSeed: number; // 0-100
  temperament: {
    discipline: number; // 0-100
    volatility: number; // 0-100
  };
  isAmateurStar?: boolean;
}

export interface TalentPoolState {
  poolId: Id;
  poolType: TalentPoolType;
  refreshCadence: "weekly" | "monthly" | "basho" | "yearly";
  populationCap: number;
  hiddenReserveCap: number;
  candidatesVisible: Id[];
  candidatesHidden: Id[];
  lastRefreshWeek: number;
  scarcityBand: "plentiful" | "normal" | "tight" | "scarce" | "crisis";
  qualityBand: "low" | "normal" | "high" | "golden_age";
}

export interface TalentPoolWorldState {
  version: "1.0.0";
  lastYearlyRefreshYear: number;
  candidates: Record<Id, TalentCandidate>;
  pools: Record<TalentPoolType, TalentPoolState>;

  // Player knowledge about prospects (separate from rikishi scouting)
  playerScouting?: Record<Id, { scoutingLevel: number; lastScoutedWeek: number }>;
}

/** =========================
 * JSON-SAFE SERIALIZED TYPES
 * ========================= */

export interface SerializedBashoState {
  year: number;
  bashoNumber: 1 | 2 | 3 | 4 | 5 | 6;
  bashoName: BashoName;
  day: number;
  matches: MatchSchedule[];
  standings: StandingsTable;
}

export interface SerializedWorldState {
  seed: string;
  year: number;
  week: number;
  cyclePhase: CyclePhase;
  currentBashoName?: BashoName;

  heyas: IdMap<Heya>;
  rikishi: IdMap<Rikishi>;
  oyakata: IdMap<Oyakata>;

  currentBasho?: SerializedBashoState;
  history: BashoResult[];
  
  // Serialized Event Log
  events: EventsState;

  ftue: FTUEState;
  playerHeyaId?: Id;

  currentBanzuke?: BanzukeSnapshot;

  // Talent pool persistence
  talentPool?: TalentPoolWorldState;
}

/** =========================
 * Save Format (persisted)
 * ========================= */

export type SaveVersion = "1.0.0";
export const CURRENT_SAVE_VERSION: SaveVersion = "1.0.0";

export interface SaveGame {
  version: SaveVersion;
  createdAtISO: string;
  lastSavedAtISO: string;

  ruleset: {
    banzukeAlgorithm: "slot_fill_v1";
    kimariteRegistryVersion: string;
  };

  world: SerializedWorldState;

  saveSlotName?: string;
  playTimeMinutes?: number;
}
