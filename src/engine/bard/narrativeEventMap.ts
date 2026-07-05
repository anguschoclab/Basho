import type { EngineEventType, EventImportance } from "../types/events";

export interface NarrativeEventMapEntry {
  eventType: EngineEventType;
  titlePath: string;
  summaryPath: string;
  importance: EventImportance;
}

export const narrativeEventMap: Record<string, NarrativeEventMapEntry> = {
  championship_celebration: {
    eventType: "AWARD_CONFERRED",
    titlePath: "events.narrative.championship_celebration_title",
    summaryPath: "events.narrative.championship_celebration_summary",
    importance: "headline",
  },
  yokozuna_promotion: {
    eventType: "LIFECYCLE_EVENT",
    titlePath: "events.narrative.yokozuna_promotion_title",
    summaryPath: "events.narrative.yokozuna_promotion_summary",
    importance: "headline",
  },
  retirement_ceremony: {
    eventType: "RETIREMENT_ANNOUNCED",
    titlePath: "events.narrative.retirement_ceremony_title",
    summaryPath: "events.narrative.retirement_ceremony_summary",
    importance: "major",
  },
  underdog_victory: {
    eventType: "AWARD_CONFERRED",
    titlePath: "events.narrative.underdog_victory_title",
    summaryPath: "events.narrative.underdog_victory_summary",
    importance: "notable",
  },
  media_spotlight: {
    eventType: "NARRATIVE_STRATEGY_SHIFT",
    titlePath: "media.spotlight.weekly_feature_title",
    summaryPath: "media.spotlight.weekly_feature_summary",
    importance: "notable",
  },
  legacy_milestone: {
    eventType: "LIFECYCLE_EVENT",
    titlePath: "events.narrative.legacy_milestone_title",
    summaryPath: "events.narrative.legacy_milestone_summary",
    importance: "major",
  },
};
