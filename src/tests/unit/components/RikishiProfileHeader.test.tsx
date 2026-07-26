/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RikishiProfileHeader } from "@/components/rikishi/RikishiProfileHeader";
import type { UIRikishi } from "@/presenters/uiModels";

function makeUIRikishi(overrides: Partial<UIRikishi> = {}): UIRikishi {
  return {
    id: "r1",
    shikona: "Test Rikishi",
    realName: "Test Real",
    heyaId: "heya1",
    heyaName: "Test Heya",
    isPlayerOwned: false,
    age: 25,
    nationality: "Japan",
    origin: "Tokyo",
    height: 180,
    weight: 140,
    rank: "maegashira_1" as any,
    rankLabel: "M1",
    rankNumber: 1,
    division: "makuuchi" as any,
    side: "east" as any,
    style: "oshi" as any,
    styleName: "Oshi",
    archetypeName: "Pusher",
    isRetired: false,
    isInjured: false,
    injurySummary: "",
    condition: 80,
    motivation: 70,
    fatigue: 20,
    powerBand: "strong",
    techniqueBand: "solid",
    speedBand: "fast",
    balanceBand: "stable",
    momentum: 5,
    careerPhase: "prime" as any,
    currentBashoWins: 8,
    currentBashoLosses: 7,
    currentBashoRecord: "8-7",
    careerWins: 100,
    careerLosses: 80,
    careerRecord: "100-80",
    careerYusho: 2,
    perceivedStats: {
      strength: "strong",
      technique: "solid",
      speed: "fast",
      stamina: "good",
      mental: "sharp",
      adaptability: "flexible",
      balance: "stable",
    },
    streak: 3,
    streakLabel: "W3",
    winPercentage: 55,
    avgRankLabel: "M1",
    descriptor: {} as any,
    potentialBand: "high" as any,
    conditionDescriptor: "Good",
    moraleDescriptor: "High",
    potentialDescriptor: "High",
    ageBand: "prime" as any,
    weightBand: "heavy" as any,
    heightBand: "tall" as any,
    ageDescriptor: "Prime",
    weightDescriptor: "Heavy",
    heightDescriptor: "Tall",
    topRivals: [],
    personalityTraits: [],
    favoredKimarite: [],
    favoredKimariteDetailed: [],
    favoredKimariteDisplay: "",
    preferredGrip: "",
    preferredGripDepth: "",
    specialPrizes: { shukunSho: 0, kantoSho: 0, ginoSho: 0 },
    achievements: {
      kinboshiEarned: 0,
      ginboshiEarned: 0,
      kinboshiConceded: 0,
      ginboshiConceded: 0,
      mochikyukinPoints: 0,
    },
    combatArchetype: "hybrid" as any,
    salaryBreakdown: {} as any,
    careerHistory: [],
    milestones: [],
    hasKeshoMawashi: false,
    consecutiveStrongOzeki: 0,
    ...overrides,
  } as UIRikishi;
}

vi.mock("@/components/ui/tooltip-wrap", () => ({
  TooltipWrap: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/avatar/SumoAvatar", () => ({
  SumoAvatar: () => <div data-testid="avatar" />,
}));

vi.mock("@/engine/archetype", () => ({
  getCombatArchetypeDescription: () => "Test archetype",
}));

describe("RikishiProfileHeader", () => {
  it("renders Kinboshi stat when kinboshiEarned > 0", () => {
    const rikishi = makeUIRikishi({
      achievements: {
        kinboshiEarned: 3,
        ginboshiEarned: 0,
        kinboshiConceded: 0,
        ginboshiConceded: 0,
        mochikyukinPoints: 0,
      },
    });
    render(
      <RikishiProfileHeader
        rikishi={rikishi}
        isOwned={false}
        healthBadge="Healthy"
        onBack={() => {}}
      />
    );
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByText(/Gold Stars/i)).toBeTruthy();
  });

  it("hides Kinboshi stat when kinboshiEarned === 0", () => {
    const rikishi = makeUIRikishi({
      achievements: {
        kinboshiEarned: 0,
        ginboshiEarned: 0,
        kinboshiConceded: 0,
        ginboshiConceded: 0,
        mochikyukinPoints: 0,
      },
    });
    render(
      <RikishiProfileHeader
        rikishi={rikishi}
        isOwned={false}
        healthBadge="Healthy"
        onBack={() => {}}
      />
    );
    expect(screen.queryByText(/Gold Stars/i)).toBeNull();
  });

  it("renders Ginboshi stat when ginboshiEarned > 0", () => {
    const rikishi = makeUIRikishi({
      achievements: {
        kinboshiEarned: 0,
        ginboshiEarned: 4, // use a unique number to avoid multiple match errors with Elite Titles
        kinboshiConceded: 0,
        ginboshiConceded: 0,
        mochikyukinPoints: 0,
      },
    });
    render(
      <RikishiProfileHeader
        rikishi={rikishi}
        isOwned={false}
        healthBadge="Healthy"
        onBack={() => {}}
      />
    );
    expect(screen.getByText("4")).toBeTruthy();
    expect(screen.getByText(/Silver Stars/i)).toBeTruthy();
  });

  it("hides Ginboshi stat when ginboshiEarned === 0", () => {
    const rikishi = makeUIRikishi({
      achievements: {
        kinboshiEarned: 0,
        ginboshiEarned: 0,
        kinboshiConceded: 0,
        ginboshiConceded: 0,
        mochikyukinPoints: 0,
      },
    });
    render(
      <RikishiProfileHeader
        rikishi={rikishi}
        isOwned={false}
        healthBadge="Healthy"
        onBack={() => {}}
      />
    );
    expect(screen.queryByText(/Silver Stars/i)).toBeNull();
  });

  it("hides Elite Titles when careerYusho === 0", () => {
    const rikishi = makeUIRikishi({
      careerYusho: 0,
    });
    render(
      <RikishiProfileHeader
        rikishi={rikishi}
        isOwned={false}
        healthBadge="Healthy"
        onBack={() => {}}
      />
    );
    expect(screen.queryByText(/Elite Titles/i)).toBeNull();
  });

  it("renders Mochikyukin stat when mochikyukinPoints > 0", () => {
    const rikishi = makeUIRikishi({
      achievements: {
        kinboshiEarned: 0,
        ginboshiEarned: 0,
        kinboshiConceded: 0,
        ginboshiConceded: 0,
        mochikyukinPoints: 15,
      },
    });
    render(
      <RikishiProfileHeader
        rikishi={rikishi}
        isOwned={false}
        healthBadge="Healthy"
        onBack={() => {}}
      />
    );
    expect(screen.getByText(/Mochikyukin/i)).toBeTruthy();
    expect(screen.getByText("15")).toBeTruthy();
  });

  it("hides Mochikyukin stat when mochikyukinPoints === 0", () => {
    const rikishi = makeUIRikishi({
      achievements: {
        kinboshiEarned: 0,
        ginboshiEarned: 0,
        kinboshiConceded: 0,
        ginboshiConceded: 0,
        mochikyukinPoints: 0,
      },
    });
    render(
      <RikishiProfileHeader
        rikishi={rikishi}
        isOwned={false}
        healthBadge="Healthy"
        onBack={() => {}}
      />
    );
    expect(screen.queryByText(/Mochikyukin/i)).toBeNull();
  });

  it("displays correct count from rikishi.achievements.kinboshiEarned", () => {
    const rikishi = makeUIRikishi({
      achievements: {
        kinboshiEarned: 7,
        ginboshiEarned: 0,
        kinboshiConceded: 0,
        ginboshiConceded: 0,
        mochikyukinPoints: 0,
      },
    });
    render(
      <RikishiProfileHeader
        rikishi={rikishi}
        isOwned={false}
        healthBadge="Healthy"
        onBack={() => {}}
      />
    );
    const statValues = screen.getAllByText("7");
    expect(statValues.length).toBeGreaterThan(0);
  });

  it("existing stats (Career Yusho, Career History) still render", () => {
    const rikishi = makeUIRikishi({
      careerYusho: 5,
      careerWins: 200,
      careerLosses: 100,
    });
    render(
      <RikishiProfileHeader
        rikishi={rikishi}
        isOwned={false}
        healthBadge="Healthy"
        onBack={() => {}}
      />
    );
    expect(screen.getByText("Elite Titles")).toBeTruthy();
    expect(screen.getByText("Career History")).toBeTruthy();
    expect(screen.getByText("200-100")).toBeTruthy();
  });

  it("renders without crashing for a basic rikishi", () => {
    const rikishi = makeUIRikishi();
    const { container } = render(
      <RikishiProfileHeader
        rikishi={rikishi}
        isOwned={false}
        healthBadge="Healthy"
        onBack={() => {}}
      />
    );
    expect(container).toBeTruthy();
    expect(screen.getByText("Test Rikishi")).toBeTruthy();
  });
});
