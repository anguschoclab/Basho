import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { RikishiCombatTab } from "@/components/rikishi/RikishiCombatTab";
import type { UIRikishi } from "@/presenters/uiModels";
import type { Rikishi } from "@/engine/types/index";
import type { UIRivalEntry } from "@/presenters/rikishi/types";

vi.mock("@/components/rikishi/RikishiRadarChart", () => ({
  RikishiRadarChart: () => null,
}));

vi.mock("@/components/rikishi/RikishiPotentialPanel", () => ({
  RikishiPotentialPanel: () => null,
}));

vi.mock("@/presenters/engineAccess", () => ({
  getCombatArchetypeDescription: () => "archetype description",
}));

function makeRival(overrides: Partial<UIRivalEntry> = {}): UIRivalEntry {
  return {
    opponentId: "opp1",
    opponentShikona: "Hoshoryu",
    wins: 5,
    losses: 3,
    record: "5-3",
    totalBouts: 8,
    heat: 80,
    tone: "fierce",
    streak: 0,
    ...overrides,
  };
}

function buildUiRikishi(topRivals: UIRivalEntry[] = []): UIRikishi {
  return {
    styleName: "Oshi",
    archetypeName: "Pusher",
    combatArchetype: "pusher",
    preferredGrip: "none",
    preferredGripDepth: "shallow",
    topRivals,
  } as unknown as UIRikishi;
}

describe("RikishiCombatTab", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders rival entries with record and heat", () => {
    render(
      <RikishiCombatTab
        rikishi={buildUiRikishi([makeRival()])}
        rawRikishi={{} as Rikishi}
      />
    );
    expect(screen.getByText("Hoshoryu")).toBeTruthy();
    expect(screen.getByText(/Record: 5-3 \(8 bouts\)/)).toBeTruthy();
  });

  it("renders a win-streak badge when streak > 1", () => {
    render(
      <RikishiCombatTab
        rikishi={buildUiRikishi([makeRival({ streak: 4 })])}
        rawRikishi={{} as Rikishi}
      />
    );
    expect(screen.getByText("W4")).toBeTruthy();
  });

  it("renders a loss-streak badge when streak < -1", () => {
    render(
      <RikishiCombatTab
        rikishi={buildUiRikishi([makeRival({ streak: -3 })])}
        rawRikishi={{} as Rikishi}
      />
    );
    expect(screen.getByText("L3")).toBeTruthy();
  });

  it("renders no streak badge for |streak| <= 1", () => {
    render(
      <RikishiCombatTab
        rikishi={buildUiRikishi([makeRival({ streak: 1 })])}
        rawRikishi={{} as Rikishi}
      />
    );
    expect(screen.queryByText(/^W1$/)).toBeNull();
  });

  it("renders empty rival state", () => {
    render(<RikishiCombatTab rikishi={buildUiRikishi([])} rawRikishi={{} as Rikishi} />);
    expect(screen.getByText(/No significant rivalries established yet/)).toBeTruthy();
  });
});
