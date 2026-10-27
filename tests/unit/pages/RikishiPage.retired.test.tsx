/**
 * RikishiPage.retired.test.tsx
 *
 * Retired-rikishi resolution: /rikishi/$id must render retired entries from
 * world.historicalRikishi — full records get a read-only profile, compact
 * RetiredRikishiSummary records get the compact RetiredRikishiProfile view.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import type { RetiredRikishiSummary } from "@/engine/types/history";

const mockNavigate = vi.fn();
let mockParams: Record<string, string> = {};

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  useParams: () => mockParams,
  Link: ({ to, children }: { to?: string; children?: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}));

const mockRetireRikishi = vi.fn();
let mockWorld: WorldState | null = null;

vi.mock("@/state/game/useGame", () => ({
  useGame: () => ({
    state: { world: mockWorld, playerHeyaId: "h1" },
    retireRikishi: mockRetireRikishi,
  }),
}));

vi.mock("@/hooks/useRequireWorld", () => ({ useRequireWorld: () => true }));

vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

const mockProjectRikishi = vi.fn((r: Rikishi, _w?: WorldState) => ({
  id: r.id,
  shikona: r.shikona,
  heyaId: r.heyaId,
}));

vi.mock("@/presenters/uiModels", () => ({
  projectRikishi: (r: Rikishi, w: WorldState) => mockProjectRikishi(r, w),
}));

const profileBodyProps: { readOnly?: boolean }[] = [];
vi.mock("@/components/rikishi/RikishiPageSections", () => ({
  RosterListView: () => <div data-testid="roster-list" />,
  RikishiNotFound: () => <div data-testid="rikishi-not-found" />,
  RikishiProfileBody: (props: { readOnly?: boolean; rikishi?: { shikona?: string } }) => {
    profileBodyProps.push(props);
    return <div data-testid="profile-body" data-readonly={String(!!props.readOnly)} />;
  },
}));

vi.mock("@/components/rikishi/useRikishiData", () => ({
  useCareerProgressionData: () => null,
  useEarningsProgressionData: () => null,
}));

vi.mock("@/presenters/engineAccess", async (importOriginal) => ({
  ...((await importOriginal()) as Record<string, unknown>),
  getMentor: () => null,
  menteesOf: () => [],
  EntityCollection: { getHeyaRoster: () => [] },
}));

vi.mock("@/presenters/projections/PerceptionPresenter", () => ({
  getHealthBadge: () => null,
}));

import RikishiPage from "@/pages/RikishiPage";

function worldFixture(overrides: Partial<WorldState> = {}): WorldState {
  return MockFactory.createWorld({
    year: 2026,
    playerHeyaId: "h1",
    ...overrides,
  } as Partial<WorldState>);
}

function fullRetired(overrides: Partial<Rikishi> = {}): Rikishi {
  return {
    id: "r9",
    shikona: "Oldmaster",
    heyaId: "h1",
    isRetired: true,
    retirementYear: 2024,
    retirementReason: "Age",
    careerWins: 300,
    careerLosses: 250,
    ...overrides,
  } as unknown as Rikishi;
}

function summary(overrides: Partial<RetiredRikishiSummary> = {}): RetiredRikishiSummary {
  return {
    id: "old1",
    shikona: "Taiho",
    heyaId: "h1",
    birthYear: 1970,
    careerWins: 746,
    careerLosses: 144,
    yushoCount: 32,
    junYushoCount: 4,
    sanshoCount: 6,
    kinboshiCount: 0,
    totalEarnings: 0,
    peakRank: "yokozuna",
    peakRankYear: 1995,
    peakDivision: "makuuchi",
    retirementYear: 2003,
    retirementReason: "Age",
    isRetired: true,
    yearlyAggregates: [],
    isSummary: true,
    ...overrides,
  };
}

describe("RikishiPage — retired rikishi resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    profileBodyProps.length = 0;
    mockParams = {};
    mockWorld = null;
  });

  afterEach(() => cleanup());

  it("renders RetiredRikishiProfile for a RetiredRikishiSummary without calling projectRikishi", () => {
    mockWorld = worldFixture({ historicalRikishi: new Map([["old1", summary()]]) });
    mockParams = { rikishiId: "old1" };
    render(<RikishiPage />);
    expect(screen.getByTestId("retired-profile")).toBeTruthy();
    expect(screen.getByText("Taiho")).toBeTruthy();
    expect(mockProjectRikishi).not.toHaveBeenCalled();
    expect(screen.queryByTestId("profile-body")).toBeNull();
  });

  it("renders RikishiProfileBody read-only for a full retired Rikishi in historicalRikishi", () => {
    mockWorld = worldFixture({
      historicalRikishi: new Map([["r9", fullRetired()]]),
    });
    mockParams = { rikishiId: "r9" };
    render(<RikishiPage />);
    expect(screen.getByTestId("profile-body")).toBeTruthy();
    expect(profileBodyProps.at(-1)?.readOnly).toBe(true);
  });

  it("renders RikishiProfileBody editable for an active rikishi", () => {
    mockWorld = worldFixture({
      rikishi: new Map([["r1", fullRetired({ id: "r1", isRetired: false })]]),
    });
    mockParams = { rikishiId: "r1" };
    render(<RikishiPage />);
    expect(screen.getByTestId("profile-body")).toBeTruthy();
    expect(profileBodyProps.at(-1)?.readOnly).toBe(false);
  });

  it("renders RikishiNotFound for an unknown id", () => {
    mockWorld = worldFixture();
    mockParams = { rikishiId: "nope" };
    render(<RikishiPage />);
    expect(screen.getByTestId("rikishi-not-found")).toBeTruthy();
  });

  it("renders the roster list when no rikishiId param is present", () => {
    mockWorld = worldFixture();
    mockParams = {};
    render(<RikishiPage />);
    expect(screen.getByTestId("roster-list")).toBeTruthy();
  });
});
