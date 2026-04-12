import type { WorldState } from "./types/world";
import type { Heya } from "./types/heya";
import type { Oyakata } from "./types/oyakata";
import type { OyakataArchetype } from "./types/oyakata";
import { EventBus } from "./events";
import { handleMediaEvent } from "./systems/media/MediaService";

interface MediaStrategy {
  evaluateMediaEventResponse: (
    world: WorldState,
    heya: Heya,
    oyakata: Oyakata,
    eventId: string
  ) => void;
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

    // Apply the choice using the existing handleMediaEvent function
    handleMediaEvent(world, eventId, choice);

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

    EventBus.managementDecision(
      world,
      heya.id,
      {
        archetype: oyakata.archetype,
        mediaEvent: eventId,
        choice,
        reasoning: reason,
      },
      "minor"
    );
  },
};

export const TraditionalistMediaStrategy: MediaStrategy = {
  evaluateMediaEventResponse(world, heya, oyakata, eventId) {
    // Traditionalists always apologize to maintain honor and tradition
    const choice: "apologize" | "deny" | "ignore" = "apologize";
    handleMediaEvent(world, eventId, choice);

    EventBus.managementDecision(
      world,
      heya.id,
      {
        archetype: oyakata.archetype,
        mediaEvent: eventId,
        choice,
        reasoning: "Traditionalist apologized to maintain honor and tradition",
      },
      "minor"
    );
  },
};

export const ScientistMediaStrategy: MediaStrategy = {
  evaluateMediaEventResponse(world, heya, oyakata, eventId) {
    // Scientists analyze the situation and respond strategically
    const choice = oyakata.traits.risk > 60 ? "deny" : "ignore";
    handleMediaEvent(world, eventId, choice);

    EventBus.managementDecision(
      world,
      heya.id,
      {
        archetype: oyakata.archetype,
        mediaEvent: eventId,
        choice,
        reasoning: "Scientist responded strategically to minimize impact",
      },
      "minor"
    );
  },
};

export const GamblerMediaStrategy: MediaStrategy = {
  evaluateMediaEventResponse(world, heya, oyakata, eventId) {
    // Gamblers take risks - they deny aggressively
    const choice: "apologize" | "deny" | "ignore" = "deny";
    handleMediaEvent(world, eventId, choice);

    EventBus.managementDecision(
      world,
      heya.id,
      {
        archetype: oyakata.archetype,
        mediaEvent: eventId,
        choice,
        reasoning: "Gambler denied aggressively to take a risk",
      },
      "minor"
    );
  },
};

export const NurturerMediaStrategy: MediaStrategy = {
  evaluateMediaEventResponse(world, heya, oyakata, eventId) {
    // Nurturers apologize to show empathy and protect their rikishi
    const choice: "apologize" | "deny" | "ignore" = "apologize";
    handleMediaEvent(world, eventId, choice);

    EventBus.managementDecision(
      world,
      heya.id,
      {
        archetype: oyakata.archetype,
        mediaEvent: eventId,
        choice,
        reasoning: "Nurturer apologized to show empathy and protect rikishi",
      },
      "minor"
    );
  },
};

export const TyrantMediaStrategy: MediaStrategy = {
  evaluateMediaEventResponse(world, heya, oyakata, eventId) {
    // Tyrants deny to maintain power and authority
    const choice: "apologize" | "deny" | "ignore" = "deny";
    handleMediaEvent(world, eventId, choice);

    EventBus.managementDecision(
      world,
      heya.id,
      {
        archetype: oyakata.archetype,
        mediaEvent: eventId,
        choice,
        reasoning: "Tyrant denied to maintain power and authority",
      },
      "minor"
    );
  },
};

export const StrategistMediaStrategy: MediaStrategy = {
  evaluateMediaEventResponse(world, heya, oyakata, eventId) {
    // Strategists time their responses for optimal outcome
    const choice = oyakata.traits.ambition > 70 ? "deny" : "ignore";
    handleMediaEvent(world, eventId, choice);

    EventBus.managementDecision(
      world,
      heya.id,
      {
        archetype: oyakata.archetype,
        mediaEvent: eventId,
        choice,
        reasoning: "Strategist timed response for optimal outcome",
      },
      "minor"
    );
  },
};

export const StrictMediaStrategy: MediaStrategy = {
  evaluateMediaEventResponse(world, heya, oyakata, eventId) {
    // Strict apologize to maintain discipline
    const choice: "apologize" | "deny" | "ignore" = "apologize";
    handleMediaEvent(world, eventId, choice);

    EventBus.managementDecision(
      world,
      heya.id,
      {
        archetype: oyakata.archetype,
        mediaEvent: eventId,
        choice,
        reasoning: "Strict apologized to maintain discipline",
      },
      "minor"
    );
  },
};

export const IndulgentMediaStrategy: MediaStrategy = {
  evaluateMediaEventResponse(world, heya, oyakata, eventId) {
    // Indulgent are more lenient, they ignore minor issues
    const choice: "apologize" | "deny" | "ignore" = "ignore";
    handleMediaEvent(world, eventId, choice);

    EventBus.managementDecision(
      world,
      heya.id,
      {
        archetype: oyakata.archetype,
        mediaEvent: eventId,
        choice,
        reasoning: "Indulgent ignored media event with lenient approach",
      },
      "minor"
    );
  },
};

export function getMediaStrategy(archetype: OyakataArchetype): MediaStrategy {
  switch (archetype) {
    case "traditionalist":
      return TraditionalistMediaStrategy;
    case "scientist":
      return ScientistMediaStrategy;
    case "gambler":
      return GamblerMediaStrategy;
    case "nurturer":
      return NurturerMediaStrategy;
    case "tyrant":
      return TyrantMediaStrategy;
    case "strategist":
      return StrategistMediaStrategy;
    case "strict":
      return StrictMediaStrategy;
    case "indulgent":
      return IndulgentMediaStrategy;
    default:
      return DefaultMediaStrategy;
  }
}
