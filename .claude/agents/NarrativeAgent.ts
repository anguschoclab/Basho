/**
 * NarrativeAgent.ts
 * =================
 * Worker agent for handling narrative event orchestration.
 * Decides on triggering narrative events and generating storylines.
 */

import type { Oyakata } from "../types/oyakata";
import type { Rikishi } from "../types/rikishi";

export interface NarrativeAgentContext {
  oyakata: Oyakata;
  topRikishi: Rikishi[];
  recentAchievements: string[];
  currentBashoPhase: string;
}

export interface NarrativeAgentResult {
  shouldTriggerEvent: boolean;
  eventType?: string;
  eventFocus?: string;
  rikishiId?: string;
  narrativeTone: "heroic" | "tragic" | "dramatic" | "underdog" | "neutral";
  reasoning: string[];
}

/**
 * Narrative Worker: Handles story generation and event orchestration
 * Evaluates rikishi achievements, historical context, and oyakata personality to generate narrative events
 */
export function spawnNarrativeAgent(ctx: NarrativeAgentContext): NarrativeAgentResult {
  const reasoning: string[] = [];
  const { oyakata, topRikishi, recentAchievements, currentBashoPhase } = ctx;

  const isAmbitious = oyakata.traits.ambition > 60;
  const isTraditionalist = oyakata.traits.tradition > 70;
  const isPublicityHawk = oyakata.managerFlags?.publicityHawk;

  let shouldTriggerEvent = false;
  let eventType: string | undefined;
  let eventFocus: string | undefined;
  let rikishiId: string | undefined;
  let narrativeTone: "heroic" | "tragic" | "dramatic" | "underdog" | "neutral" = "neutral";

  reasoning.push("[Narrative Agent] Evaluating narrative opportunities");
  reasoning.push(`[Narrative Agent] Top rikishi: ${topRikishi.length}, Recent achievements: ${recentAchievements.length}`);
  reasoning.push(`[Narrative Agent] Basho phase: ${currentBashoPhase}`);

  // Achievement-based narrative triggers
  if (recentAchievements.includes("yusho") && currentBashoPhase === "post_basho") {
    shouldTriggerEvent = true;
    eventType = "championship_celebration";
    const champion = topRikishi.find(r => r.rank === "yokozuna" || r.rank === "ozeki");
    if (champion) {
      rikishiId = champion.id;
      eventFocus = champion.shikona;
    }
    narrativeTone = "heroic";
    reasoning.push("[Narrative Agent] Championship victory triggers heroic narrative");
  }

  // Yokozuna promotion narrative
  if (recentAchievements.includes("yokozuna_promotion")) {
    shouldTriggerEvent = true;
    eventType = "yokozuna_promotion";
    const ozeki = topRikishi.find(r => r.rank === "ozeki");
    if (ozeki) {
      rikishiId = ozeki.id;
      eventFocus = ozeki.shikona;
    }
    narrativeTone = isTraditionalist ? "heroic" : "dramatic";
    reasoning.push("[Narrative Agent] Yokozuna promotion triggers major narrative");
  }

  // Retirement narrative
  if (recentAchievements.includes("retirement")) {
    shouldTriggerEvent = true;
    eventType = "retirement_ceremony";
    const retiring = topRikishi.find(r => r.isRetired);
    if (retiring) {
      rikishiId = retiring.id;
      eventFocus = retiring.shikona;
    }
    narrativeTone = isTraditionalist ? "heroic" : "tragic";
    reasoning.push("[Narrative Agent] Retirement triggers ceremonial narrative");
  }

  // Underdog story
  if (recentAchievements.includes("kinboshi") && !isAmbitious) {
    shouldTriggerEvent = true;
    eventType = "underdog_victory";
    const underdog = topRikishi.find(r => r.rank === "maegashira");
    if (underdog) {
      rikishiId = underdog.id;
      eventFocus = underdog.shikona;
    }
    narrativeTone = "underdog";
    reasoning.push("[Narrative Agent] Kinboshi triggers underdog narrative");
  }

  // Publicity hawk generates more events
  if (isPublicityHawk && !shouldTriggerEvent && currentBashoPhase === "mid_basho") {
    shouldTriggerEvent = true;
    eventType = "media_spotlight";
    const spotlightRikishi = topRikishi[0];
    if (spotlightRikishi) {
      rikishiId = spotlightRikishi.id;
      eventFocus = spotlightRikishi.shikona;
    }
    narrativeTone = "dramatic";
    reasoning.push("[Narrative Agent] Publicity hawk generates media spotlight event");
  }

  // Traditionalist focuses on legacy events
  if (isTraditionalist && !shouldTriggerEvent && currentBashoPhase === "post_basho") {
    const veteran = topRikishi.find(r => r.experience > 100);
    if (veteran) {
      shouldTriggerEvent = true;
      eventType = "legacy_milestone";
      rikishiId = veteran.id;
      eventFocus = veteran.shikona;
      narrativeTone = "heroic";
      reasoning.push("[Narrative Agent] Traditionalist highlights veteran legacy");
    }
  }

  if (!shouldTriggerEvent) {
    reasoning.push("[Narrative Agent] No narrative trigger conditions met");
  } else {
    reasoning.push(`[Narrative Agent] Triggering ${eventType} with ${narrativeTone} tone`);
  }

  return {
    shouldTriggerEvent,
    eventType,
    eventFocus,
    rikishiId,
    narrativeTone,
    reasoning,
  };
}
