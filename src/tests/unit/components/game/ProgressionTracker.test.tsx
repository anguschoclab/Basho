import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";

// RikishiName uses the router Link — render plain text for this test
vi.mock("@/components/ClickableName", () => ({
  RikishiName: ({ name }: { name: string }) => <span>{name}</span>,
}));

import { ProgressionTracker } from "@/components/game/ProgressionTracker";
import type { UIRikishi } from "@/presenters/uiModels";
import type {
  OzekiRunCandidate,
  YokozunaCandidate,
} from "@/presenters/projections/promotionProjections";

function rikishi(id: string, shikona: string, heyaId = "h_other"): UIRikishi {
  return { id, shikona, heyaId, rank: "ozeki" } as unknown as UIRikishi;
}

const yokozunaCandidates: YokozunaCandidate[] = [
  {
    rikishi: rikishi("r1", "Terunofuji"),
    recentYushos: 2,
    recentJunYushos: 0,
    consecutiveYushos: 2,
    isStrong: true,
    politicalPressure: 50,
    supportLevel: "strong",
    narrative: "Back-to-back yūshō",
  },
];

const ozekiRuns: OzekiRunCandidate[] = [
  {
    rikishi: rikishi("r2", "Kirishima"),
    recentWins: 24,
    threshold: 33,
    progress: 0.7,
    narrative: "On pace for promotion",
  },
];

const kadobanDrama = [
  {
    rikishi: rikishi("r3", "Takakeisho", "h_player"),
    narrative: "Must win 8 to keep rank",
    isDemoted: false,
  },
];

describe("ProgressionTracker", () => {
  it("renders nothing when there is no content", () => {
    const { container } = render(
      <ProgressionTracker
        ozekiRuns={[]}
        yokozunaCandidates={[]}
        kadobanDrama={[]}
        playerHeyaId="h_player"
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders the Yokozuna Deliberation section with candidate rows", () => {
    render(
      <ProgressionTracker
        ozekiRuns={[]}
        yokozunaCandidates={yokozunaCandidates}
        kadobanDrama={[]}
        playerHeyaId="h_player"
      />
    );
    expect(screen.getByText(/Yokozuna Deliberation/)).toBeTruthy();
    expect(screen.getByText("Terunofuji")).toBeTruthy();
    expect(screen.getByText("Back-to-back yūshō")).toBeTruthy();
  });

  it("renders the Ōzeki Run Watch section with rows", () => {
    render(
      <ProgressionTracker
        ozekiRuns={ozekiRuns}
        yokozunaCandidates={[]}
        kadobanDrama={[]}
        playerHeyaId="h_player"
      />
    );
    expect(screen.getByText(/Ōzeki Run Watch/)).toBeTruthy();
    expect(screen.getByText("Kirishima")).toBeTruthy();
  });

  it("renders the Kadoban Watch section and marks player rikishi", () => {
    render(
      <ProgressionTracker
        ozekiRuns={[]}
        yokozunaCandidates={[]}
        kadobanDrama={kadobanDrama}
        playerHeyaId="h_player"
      />
    );
    expect(screen.getByText(/Kadoban Watch/)).toBeTruthy();
    expect(screen.getByText("Takakeisho")).toBeTruthy();
    expect(screen.getByText("YOUR")).toBeTruthy();
  });
});
