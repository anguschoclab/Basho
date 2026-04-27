/**
 * mockTypes.ts
 *
 * Common mock types for test files to replace `any` usage.
 * These types provide partial implementations of domain types for testing purposes.
 */

import type { BashoName } from "../../engine/types/basho";
import type { Division } from "../../engine/types/banzuke";

// ============================================================================
// Base Mock Types
// ============================================================================

/** Minimal mock of WorldState for testing - use with 'as unknown as WorldState' */
export interface MockWorldState {
  seed?: string;
  year?: number;
  week?: number;
  playerHeyaId?: string;
  heyas?: Map<string, MockHeya>;
  rikishi?: Map<string, MockRikishi>;
  oyakata?: Map<string, MockOyakata>;
  history?: Array<Partial<MockBashoResult>>;
  currentBasho?: MockBashoState;
  calendar?: MockCalendar;
  mediaState?: MockMediaState;
  sponsorPool?: MockSponsorPool;
  talentPool?: MockTalentPool;
  historyIndex?: MockHistoryIndex;
  ozekiKadoban?: Record<string, unknown>;
  events?: { log: unknown[] };
  transientContext?: MockTransientContext;
  rng?: MockSeededRNG;
  [key: string]: unknown;
}

/** Minimal mock of Calendar for testing */
export interface MockCalendar {
  year: number;
  month: number;
  day: number;
  currentWeek: number;
  bashoNumber: number;
  isBashoMonth: boolean;
}

/** Minimal mock of TransientContext for testing */
export interface MockTransientContext {
  deltas?: {
    revenue?: number;
    expenses?: number;
    injuriesSustained?: string[];
    statChanges?: Record<string, unknown>;
  };
  activeModifiers?: {
    trainingMultiplier?: number;
    recoveryMultiplier?: number;
    financialPenalty?: boolean;
    moraleBoost?: boolean;
  };
}

/** Minimal mock of SeededRNG for testing */
export interface MockSeededRNG {
  next: () => number;
  bool: (probability?: number) => boolean;
  int: (min: number, max: number) => number;
  pick: <T>(array: T[]) => T;
}

// ============================================================================
// Entity Mock Types
// ============================================================================

/** Minimal mock of Rikishi for testing */
export interface MockRikishi extends Partial<Rikishi> {
  id: string;
  shikona?: string;
  name?: string;
  heyaId?: string;
  rank?: string;
  rankNumber?: number;
  division?: Division;
  side?: "east" | "west";
  birthYear?: number;
  careerWins?: number;
  careerLosses?: number;
  makuuchiWins?: number;
  currentBashoWins?: number;
  currentBashoLosses?: number;
  power?: number;
  technique?: number;
  speed?: number;
  balance?: number;
  momentum?: number;
  condition?: number;
  fatigue?: number;
  talentSeed?: number;
  injured?: boolean;
  injuryStatus?: {
    isInjured: boolean;
    type?: string;
    severity?: number;
    weeksRemaining?: number;
    weeksToHeal?: number;
  };
  injuryWeeksRemaining?: number;
  divisionRecords?: Record<string, { wins: number; losses: number }>;
  stats?: {
    achievements?: unknown;
  };
  economics?: {
    popularity?: number;
    kenshoPerBout?: number;
    kenshoEarned?: number;
    koenkaiIds?: string[];
  };
  derivedArchetype?: string;
}

/** Minimal mock of Heya for testing */
export interface MockHeya extends Partial<Heya> {
  id: string;
  name?: string;
  funds?: number;
  reputation?: number;
  prestige?: string;
  scandalScore?: number;
  rikishiIds?: string[];
  facilities?: {
    training?: number;
    recovery?: number;
    nutrition?: number;
  };
  koenkaiId?: string;
  koenkaiBand?: "none" | "weak" | "moderate" | "strong" | "powerful";
  isPlayerOwned?: boolean;
  regionalPresence?: Record<string, number>;
}

/** Minimal mock of Oyakata for testing */
export interface MockOyakata extends Partial<Oyakata> {
  id: string;
  name?: string;
  heyaId?: string;
  background?: string;
  ichimon?: string;
}

// ============================================================================
// Sponsorship Mock Types
// ============================================================================

/** Minimal mock of Sponsor for testing */
export interface MockSponsor extends Partial<Sponsor> {
  sponsorId: string;
  id?: string;
  name?: string;
  displayName?: string;
  shortName?: string;
  active?: boolean;
  tier?: "T1" | "T2" | "T3" | "T4" | "T5";
  category?: string;
  relationships?: MockSponsorRelationship[];
  prestigeAffinity?: number;
  riskAppetite?: number;
  loyalty?: number;
  satisfaction?: number;
}

/** Minimal mock of SponsorRelationship for testing */
export interface MockSponsorRelationship {
  targetId: string;
  relId?: string;
  id?: string;
  tier?: string;
  strength?: number;
  since?: number;
  endsAtTick?: number;
  role?: string;
}

/** Minimal mock of SponsorPool for testing */
export interface MockSponsorPool extends Partial<SponsorPool> {
  sponsors: Map<string, MockSponsor>;
  koenkais?: Map<string, MockKoenkai>;
}

/** Minimal mock of Koenkai for testing */
export interface MockKoenkai extends Partial<Koenkai> {
  koenkaiId: string;
  heyaId: string;
  members: Array<{
    sponsorId: string;
    role: string;
  }>;
  strengthBand?: string;
}

// ============================================================================
// Media Mock Types
// ============================================================================

/** Minimal mock of MediaHeatHistory for testing */
export interface MockMediaHeatHistory {
  [rikishiId: string]: Array<{
    week: number;
    heat: number;
  }>;
}

// ============================================================================
// Talent Pool Mock Types
// ============================================================================

/** Minimal mock of TalentPool for testing */
export interface MockTalentPool {
  candidates: Record<string, MockTalentCandidate[]>;
  pools: {
    high_school: { candidatesHidden: unknown[] };
    university?: { candidatesHidden: unknown[] };
    international?: { candidatesHidden: unknown[] };
  };
}

/** Minimal mock of TalentCandidate for testing */
export interface MockTalentCandidate extends Partial<TalentCandidate> {
  id: string;
  shikona?: string;
  name?: string;
  nationality?: string;
  age?: number;
  potential?: number;
  scoutLevel?: number;
  scoutInfo?: string;
  scoutedProgress?: number;
  scoutingInvestment?: string;
}

// ============================================================================
// Hall of Fame Mock Types
// ============================================================================

/** Minimal mock of HoFInductee for testing */
export interface MockHoFInductee extends Partial<HoFInductee> {
  rikishiId: string;
  category: string;
  inductionYear: number;
  shikona?: string;
  name?: string;
}

// ============================================================================
// Rivalry Mock Types
// ============================================================================

/** Minimal mock of RivalryPairState for testing */
export interface MockRivalryPairState extends Partial<RivalryPairState> {
  aId: string;
  bId: string;
  heat: number;
  trigger?: string;
}

/** Minimal mock of UIRivalEntry for testing */
export interface MockUIRivalEntry {
  opponentId: string;
  opponentShikona?: string;
  heat?: number;
  record?: string;
}

// ============================================================================
// Basho/Match Mock Types
// ============================================================================

/** Minimal mock of MatchSchedule for testing */
export interface MockMatchSchedule extends Partial<MatchSchedule> {
  boutId: string;
  day: number;
  eastRikishiId: string;
  westRikishiId: string;
  eastRikishi?: MockRikishi;
  westRikishi?: MockRikishi;
  isPlayerBout?: boolean;
}

/** Minimal mock of BoutResult for testing */
export interface MockBoutResult extends Partial<BoutResult> {
  boutId: string;
  winner: "east" | "west";
  winnerRikishiId: string;
  loserRikishiId: string;
  kimarite: string;
  kimariteName?: string;
  stance?: string;
  tachiaiWinner?: string;
  duration?: number;
  upset?: boolean;
  isKinboshi?: boolean;
  log?: unknown[];
  kenshoEnvelopes?: number;
}

/** Minimal mock of Basho result for history */
export interface MockBashoResult {
  yusho?: string;
  junYusho?: string;
  year?: number;
  bashoName?: BashoName;
  bashoNumber?: number;
  prizes?: unknown[];
}

/** Minimal mock of HistoryIndex for testing */
export interface MockHistoryIndex {
  rikishi: Record<string, Array<{ wins: number; yusho?: boolean; junYusho?: boolean }>>;
}

// ============================================================================
// Helper Functions
// ============================================================================

/** Create a mock rikishi with defaults */
export function createMockRikishi(overrides: Partial<MockRikishi> = {}): MockRikishi {
  return {
    id: "r1",
    shikona: "Testyama",
    heyaId: "h1",
    rank: "maegashira",
    rankNumber: 5,
    division: "makuuchi",
    side: "east",
    birthYear: 2000,
    careerWins: 100,
    careerLosses: 50,
    makuuchiWins: 10,
    currentBashoWins: 8,
    currentBashoLosses: 7,
    power: 75,
    technique: 70,
    speed: 65,
    balance: 60,
    condition: 80,
    fatigue: 10,
    ...overrides,
  };
}

/** Create a mock heya with defaults */
export function createMockHeya(overrides: Partial<MockHeya> = {}): MockHeya {
  return {
    id: "h1",
    name: "Test Heya",
    funds: 1000,
    reputation: 50,
    rikishiIds: ["r1", "r2"],
    facilities: { training: 50, recovery: 50, nutrition: 50 },
    ...overrides,
  };
}

/** Create a mock world state with defaults */
export function createMockWorldState(overrides: Partial<MockWorldState> = {}): MockWorldState {
  return {
    seed: "test-seed",
    year: 2024,
    week: 1,
    playerHeyaId: "h1",
    heyas: new Map([["h1", createMockHeya()]]),
    rikishi: new Map(),
    calendar: {
      year: 2024,
      month: 1,
      day: 1,
      currentWeek: 1,
      bashoNumber: 1,
      isBashoMonth: false,
    },
    ...overrides,
  };
}

/** Create a mock sponsor with defaults */
export function createMockSponsor(overrides: Partial<MockSponsor> = {}): MockSponsor {
  return {
    sponsorId: "s1",
    id: "s1",
    name: "Test Sponsor",
    displayName: "Test Sponsor Inc.",
    active: true,
    tier: "T2",
    category: "local_business",
    relationships: [],
    loyalty: 50,
    satisfaction: 60,
    ...overrides,
  };
}

/** Create a mock match schedule with defaults */
export function createMockMatchSchedule(overrides: Partial<MockMatchSchedule> = {}): MockMatchSchedule {
  return {
    boutId: "b1",
    day: 1,
    eastRikishiId: "east",
    westRikishiId: "west",
    ...overrides,
  };
}

/** Create a mock bout result with defaults */
export function createMockBoutResult(overrides: Partial<MockBoutResult> = {}): MockBoutResult {
  return {
    boutId: "b1",
    winner: "east",
    winnerRikishiId: "east",
    loserRikishiId: "west",
    kimarite: "oshidashi",
    kimariteName: "Oshidashi",
    duration: 5.2,
    upset: false,
    isKinboshi: false,
    log: [],
    kenshoEnvelopes: 0,
    ...overrides,
  };
}
