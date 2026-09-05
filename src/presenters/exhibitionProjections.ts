/**
 * exhibitionProjections.ts — projects pending exhibition invitations for UI.
 */
import type { WorldState } from "../engine/types/world";
import type { PendingExhibition } from "../engine/types/world";

export interface ExhibitionInvitationDTO {
  id: string;
  region: string;
  prestige: number;
  expiresAtWeek: number;
  requiresRank?: string;
  prestigeLabel: string;
}

export interface ExhibitionProjection {
  invitations: ExhibitionInvitationDTO[];
  hasInvitations: boolean;
}

function prestigeLabel(prestige: number): string {
  if (prestige >= 80) return "Prestigious";
  if (prestige >= 60) return "Notable";
  if (prestige >= 40) return "Standard";
  return "Minor";
}

export function projectExhibitions(world: WorldState, heyaId: string): ExhibitionProjection {
  const pending = world.pendingExhibitions ?? [];
  const invitations = pending
    .filter((i) => i.heyaId === heyaId)
    .map((i: PendingExhibition) => ({
      id: i.id,
      region: i.region,
      prestige: i.prestige,
      expiresAtWeek: i.expiresAtWeek,
      requiresRank: i.requiresRank,
      prestigeLabel: prestigeLabel(i.prestige),
    }));

  return {
    invitations,
    hasInvitations: invitations.length > 0,
  };
}
