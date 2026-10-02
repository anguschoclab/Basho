/**
 * Shared helpers for component tests that need UIRikishi projections.
 * Consolidates identical local `mockRikishi` definitions previously copied
 * across BoutNarrativeModal, BoutResultDisplay and KeyBoutsSection tests.
 */
import type { UIRikishi } from "@/presenters/uiModels";

export function mockUIRikishi(
  id: string,
  shikona: string,
  overrides: Partial<UIRikishi> = {},
): UIRikishi {
  return {
    id,
    shikona,
    rankLabel: "Yokozuna",
    rank: "yokozuna",
    stable: "Test",
    stableId: "s-1",
    prefecture: "Tokyo",
    height: 185,
    weight: 150,
    age: 28,
    wins: 10,
    losses: 2,
    absences: 0,
    isPlayer: false,
    isRetired: false,
    injuryWeeks: 0,
    morale: 80,
    fatigue: 0,
    popularity: 50,
    momentum: 0,
    style: "belt",
    preferredTech: "oshi",
    bloodline: "",
    debutBasho: { year: 2020, month: 1 },
    record: { totalBouts: 100, wins: 60, losses: 40, absences: 0 },
    careerWins: 60,
    careerLosses: 40,
    careerAbsences: 0,
    ...overrides,
  } as UIRikishi;
}
