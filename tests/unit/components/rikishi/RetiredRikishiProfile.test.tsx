/**
 * RetiredRikishiProfile.test.tsx
 *
 * The retired profile must render the archived face — the summary carries
 * `avatarConfig` through pruning, so initials-only fallback is a bug.
 */

import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { RetiredRikishiProfile } from "@/components/rikishi/RetiredRikishiProfile";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import { generateAvatarIdentity } from "@/engine/generation/avatarGenerator";
import type { RetiredRikishiSummary } from "@/engine/types/history";
import type { WorldState } from "@/engine/types/world";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, ...rest }: { children?: React.ReactNode }) =>
    React.createElement("a", rest, children),
}));

vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", null, children),
}));

function summaryFixture(overrides: Partial<RetiredRikishiSummary> = {}): RetiredRikishiSummary {
  return {
    id: "old1",
    shikona: "Taiho",
    heyaId: "h1",
    birthYear: 1970,
    careerWins: 700,
    careerLosses: 200,
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
    avatarConfig: generateAvatarIdentity({
      seed: "old1",
      nationality: "Japan",
      role: "rikishi",
    }),
    ...overrides,
  } as RetiredRikishiSummary;
}

function worldFixture(): WorldState {
  return MockFactory.createWorld({ year: 2026 } as Partial<WorldState>);
}

afterEach(cleanup);

describe("RetiredRikishiProfile", () => {
  it("renders the archived pixel face, not the initials fallback", () => {
    const { container } = render(
      <RetiredRikishiProfile summary={summaryFixture()} world={worldFixture()} />
    );
    const svg = container.querySelector("svg[data-avatar]");
    expect(svg).not.toBeNull();
    expect(svg!.querySelectorAll("path").length).toBeGreaterThan(3);
  });

  it("keeps the initials fallback when the summary has no identity", () => {
    const { container } = render(
      <RetiredRikishiProfile
        summary={summaryFixture({ avatarConfig: undefined })}
        world={worldFixture()}
      />
    );
    expect(container.querySelector("svg[data-avatar]")).toBeNull();
    expect(container.querySelector("div[data-avatar]")).not.toBeNull();
  });
});
