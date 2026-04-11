import type { WorldState } from "./types/world";
import type { Heya } from "./types/heya";
import type { Oyakata } from "./types/oyakata";
import { EventBus } from "./events";
import { handleMediaEvent } from "./systems/media/MediaService";

interface MediaStrategy {
  evaluateMediaEventResponse: (world: WorldState, heya: Heya, oyakata: Oyakata, eventId: string) => void;
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

    EventBus.managementDecision(world, heya.id, {
      archetype: oyakata.archetype,
      mediaEvent: eventId,
      choice,
      reasoning: reason
    }, "minor");
  }
};

export function getMediaStrategy(archetype: string): MediaStrategy {
  return DefaultMediaStrategy;
}
