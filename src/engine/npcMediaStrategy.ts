import type { WorldState } from "./types/world";
import type { Heya } from "./types/heya";
import type { Oyakata } from "./types/oyakata";
import type { OyakataArchetype } from "./types/oyakata";
import { handleMediaEvent } from "./systems/media/MediaService";
import { createImpactBuilder } from "./core/ImpactBuilder";
import type { StateImpact } from "./core/StateImpact";

interface MediaStrategy {
  evaluateMediaEventResponse: (
    world: WorldState,
    heya: Heya,
    oyakata: Oyakata,
    eventId: string
  ) => StateImpact;
}

export const DefaultMediaStrategy: MediaStrategy = {
  evaluateMediaEventResponse(world: WorldState, heya: Heya, oyakata: Oyakata, eventId: string) {
    // Personality-driven media event response
    const isPublicityHawk = oyakata.managerFlags?.publicityHawk;
    const isTraditionalist = oyakata.traits.tradition > 70;
    const isCompassionate = oyakata.traits.compassion > 70;
    const isRiskTaker = oyakata.traits.risk > 60;
    const isDisciplined = oyakata.managerFlags?.disciplineHawk;

    // Determine response based on personality
    let choice: "apologize" | "deny" | "ignore";

    if (isPublicityHawk) {
      // Publicity hawks prefer to deny or ignore to maintain image
      choice = isRiskTaker ? "deny" : "ignore";
    } else if (isTraditionalist) {
      // Traditionalists prefer to apologize to maintain honor
      choice = "apologize";
    } else if (isDisciplined) {
      // Discipline hawks prefer to apologize to set example
      choice = "apologize";
    } else if (isCompassionate) {
      // Compassionate oyakata prefer to apologize to show empathy
      choice = "apologize";
    } else if (isRiskTaker) {
      // Risk-takers prefer to deny
      choice = "deny";
    } else {
      // Default: ignore
      choice = "ignore";
    }

    // Mood affects media response
    if (oyakata.mood === "anxious") {
      // Anxious oyakata are more likely to apologize to avoid further issues
      if (choice === "deny" || choice === "ignore") {
        choice = "apologize";
      }
    } else if (oyakata.mood === "obsessed") {
      // Obsessed oyakata are more aggressive in their responses
      if (choice === "apologize") {
        choice = "deny";
      }
    }

    // Log the decision
    const reason = isPublicityHawk
      ? "Publicity-focused oyakata chose to maintain image"
      : isTraditionalist
        ? "Traditionalist oyakata chose to apologize for honor"
        : isDisciplined
          ? "Discipline hawk oyakata chose to set example"
          : isCompassionate
            ? "Compassionate oyakata chose to show empathy"
            : isRiskTaker
              ? "Risk-taker oyakata chose to deny"
              : "Standard response";

    const builder = createImpactBuilder("DefaultMediaStrategy");
    builder.merge(handleMediaEvent(world, eventId, choice));
    builder.logEvent("NPC_MANAGER_DECISION", "training", {
      archetype: oyakata.archetype,
      mediaEvent: eventId,
      choice,
      reasoning: reason,
    }, { heyaId: heya.id, importance: "minor" });
    return builder.build();
  },
};

export const TraditionalistMediaStrategy: MediaStrategy = {
  evaluateMediaEventResponse(world, heya, oyakata, eventId) {
    const choice: "apologize" | "deny" | "ignore" = "apologize";
    const builder = createImpactBuilder("TraditionalistMediaStrategy");
    builder.merge(handleMediaEvent(world, eventId, choice));
    builder.logEvent("NPC_MANAGER_DECISION", "training", {
      archetype: oyakata.archetype,
      mediaEvent: eventId,
      choice,
      reasoning: "Traditionalist apologized to maintain honor and tradition",
    }, { heyaId: heya.id, importance: "minor" });
    return builder.build();
  },
};

export const ScientistMediaStrategy: MediaStrategy = {
  evaluateMediaEventResponse(world, heya, oyakata, eventId) {
    const choice = oyakata.traits.risk > 60 ? "deny" : "ignore";
    const builder = createImpactBuilder("ScientistMediaStrategy");
    builder.merge(handleMediaEvent(world, eventId, choice));
    builder.logEvent("NPC_MANAGER_DECISION", "training", {
      archetype: oyakata.archetype,
      mediaEvent: eventId,
      choice,
      reasoning: "Scientist responded strategically to minimize impact",
    }, { heyaId: heya.id, importance: "minor" });
    return builder.build();
  },
};

export const GamblerMediaStrategy: MediaStrategy = {
  evaluateMediaEventResponse(world, heya, oyakata, eventId) {
    const choice: "apologize" | "deny" | "ignore" = "deny";
    const builder = createImpactBuilder("GamblerMediaStrategy");
    builder.merge(handleMediaEvent(world, eventId, choice));
    builder.logEvent("NPC_MANAGER_DECISION", "training", {
      archetype: oyakata.archetype,
      mediaEvent: eventId,
      choice,
      reasoning: "Gambler denied aggressively to take a risk",
    }, { heyaId: heya.id, importance: "minor" });
    return builder.build();
  },
};

export const NurturerMediaStrategy: MediaStrategy = {
  evaluateMediaEventResponse(world, heya, oyakata, eventId) {
    const choice: "apologize" | "deny" | "ignore" = "apologize";
    const builder = createImpactBuilder("NurturerMediaStrategy");
    builder.merge(handleMediaEvent(world, eventId, choice));
    builder.logEvent("NPC_MANAGER_DECISION", "training", {
      archetype: oyakata.archetype,
      mediaEvent: eventId,
      choice,
      reasoning: "Nurturer apologized to show empathy and protect rikishi",
    }, { heyaId: heya.id, importance: "minor" });
    return builder.build();
  },
};

export const TyrantMediaStrategy: MediaStrategy = {
  evaluateMediaEventResponse(world, heya, oyakata, eventId) {
    const choice: "apologize" | "deny" | "ignore" = "deny";
    const builder = createImpactBuilder("TyrantMediaStrategy");
    builder.merge(handleMediaEvent(world, eventId, choice));
    builder.logEvent("NPC_MANAGER_DECISION", "training", {
      archetype: oyakata.archetype,
      mediaEvent: eventId,
      choice,
      reasoning: "Tyrant denied to maintain power and authority",
    }, { heyaId: heya.id, importance: "minor" });
    return builder.build();
  },
};

export const StrategistMediaStrategy: MediaStrategy = {
  evaluateMediaEventResponse(world, heya, oyakata, eventId) {
    const choice = oyakata.traits.ambition > 70 ? "deny" : "ignore";
    const builder = createImpactBuilder("StrategistMediaStrategy");
    builder.merge(handleMediaEvent(world, eventId, choice));
    builder.logEvent("NPC_MANAGER_DECISION", "training", {
      archetype: oyakata.archetype,
      mediaEvent: eventId,
      choice,
      reasoning: "Strategist timed response for optimal outcome",
    }, { heyaId: heya.id, importance: "minor" });
    return builder.build();
  },
};

export const StrictMediaStrategy: MediaStrategy = {
  evaluateMediaEventResponse(world, heya, oyakata, eventId) {
    const choice: "apologize" | "deny" | "ignore" = "apologize";
    const builder = createImpactBuilder("StrictMediaStrategy");
    builder.merge(handleMediaEvent(world, eventId, choice));
    builder.logEvent("NPC_MANAGER_DECISION", "training", {
      archetype: oyakata.archetype,
      mediaEvent: eventId,
      choice,
      reasoning: "Strict apologized to maintain discipline",
    }, { heyaId: heya.id, importance: "minor" });
    return builder.build();
  },
};

export const IndulgentMediaStrategy: MediaStrategy = {
  evaluateMediaEventResponse(world, heya, oyakata, eventId) {
    const choice: "apologize" | "deny" | "ignore" = "ignore";
    const builder = createImpactBuilder("IndulgentMediaStrategy");
    builder.merge(handleMediaEvent(world, eventId, choice));
    builder.logEvent("NPC_MANAGER_DECISION", "training", {
      archetype: oyakata.archetype,
      mediaEvent: eventId,
      choice,
      reasoning: "Indulgent ignored media event with lenient approach",
    }, { heyaId: heya.id, importance: "minor" });
    return builder.build();
  },
};

const MEDIA_STRATEGIES: Record<OyakataArchetype, MediaStrategy> = {
  traditionalist: TraditionalistMediaStrategy,
  scientist: ScientistMediaStrategy,
  gambler: GamblerMediaStrategy,
  nurturer: NurturerMediaStrategy,
  tyrant: TyrantMediaStrategy,
  strategist: StrategistMediaStrategy,
  strict: StrictMediaStrategy,
  indulgent: IndulgentMediaStrategy,
};

export function getMediaStrategy(archetype: OyakataArchetype): MediaStrategy {
  return MEDIA_STRATEGIES[archetype] || DefaultMediaStrategy;
}
