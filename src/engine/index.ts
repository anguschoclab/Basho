// Barrel export — verifies type integrity across the modular engine.

export * from "./almanac";
export * from "./autoSim";
export * from "./simulation/AutoSimService";
export * from "./simulation/TournamentSimulator";
export * from "./simulation/ChronicleService";

export type { BashoPerformance } from "./banzuke";
export * from "./banzuke";
export * from "./bout/boutResolver";
export * from "./bout/boutResultApplier";
// getBashoNumber, isBashoMonth, getBashoInfo removed (unused re-export)
export * from "./tick/tickDaily";
export * from "./descriptorBands";
export * from "./economics";
export * from "./events";
export * from "./facilities";
export * from "./governance/governanceReview";
export * from "./h2h";
export * from "./hallOfFame";
export * from "./historyCache";
export * from "./historyIndex";
export * from "./holiday";
export * from "./systems/health/InjuryService";
export type { KimariteClass, JsaCategory, Kimarite, KimariteRequirements } from "./types/kimarite";
export * from "./kimarite";
export * from "./lifecycle";
export * from "./lifecycle/BashoManager";
export * from "./lifecycle/CompetitionService";
export * from "./lifecycle/RegistryService";
export * from "./systems/economics/KenshoService";
export * from "./systems/economics/SponsorshipService";
export * from "./systems/generation/SponsorGenerator";

export * from "./matchmaking/index";
export * from "./systems/media/MediaService";
export * from "./narrative";
export * from "./narrativeDescriptions";
export * from "./npcAI";
export * from "./overflow";
export * from "./oyakataPersonalities";
export * from "./oyakataStylePreferences";
export * from "./perception";
export { getCurrentBasho } from "./queries";
export * from "./queries";
export * from "./rivalries";
export * from "./saveload";
export * from "./persistence/SerializationService";
export * from "./persistence/SaveSlotService";

export * from "./storageProvider";
export * from "./schedule";
// recordObservation, createScoutedView, getScoutedAttributes, describeScoutingLevel removed (unused re-export)
export type {
  ScoutedRikishi,
  PublicRikishiInfo,
  ScoutedAttributeTruthSnapshot,
} from "./systems/recruitment/ScoutingService";
export * from "./scoutingStore";
export * from "./shikona";
export type { KoenkaiBandType, Sponsor, SponsorPool } from "./types/sponsors";
export * from "./systems/generation/CandidateGenerator";
export * from "./systems/training/TrainingService";
export type { RecordEntry } from "./types/records";
export * from "./types/index";
export * from "./systems/welfare/WelfareService";
// advanceBashoDay, simulateBoutForToday removed (unused re-export)
export * from "./systems/generation/WorldFactory";
export * from "./rng";
export * from "./lineage";
export * from "./myosekiMarket";
