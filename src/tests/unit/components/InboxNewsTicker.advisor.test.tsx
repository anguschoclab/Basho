import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { InboxNewsTicker } from "@/components/game/InboxNewsTicker";
import type { UIDigest } from "@/presenters/projections/digestProjections";

vi.mock("@/contexts/useGame", () => ({
  useGame: vi.fn(),
}));

import { useGame } from "@/contexts/useGame";

function renderTicker(digest: UIDigest | null) {
  vi.mocked(useGame).mockReturnValue({ digest } as any);
  return render(<InboxNewsTicker />);
}

describe("InboxNewsTicker advisor integration", () => {
  it("renders nothing when digest is null", () => {
    const { container } = renderTicker(null);
    expect(container.firstChild).toBeNull();
  });

  it("renders advisor recommendations from the digest", () => {
    const digest: UIDigest = {
      time: { label: "2025 — Week 1" },
      headline: "Test headline",
      counts: { trainingEvents: 0, injuries: 0, recoveries: 0, economy: 0, scouting: 0 },
      sections: [
        {
          id: "advisor",
          title: "Advisor Report",
          items: [
            {
              id: "finance-emergency",
              kind: "advisor",
              title: "Critical runway",
              detail: "Funds are critical.",
            },
          ],
        },
      ],
    };
    renderTicker(digest);
    expect(screen.getByText("Advisor Report")).toBeDefined();
    expect(screen.getByText("Critical runway")).toBeDefined();
    expect(screen.getByText("Funds are critical.")).toBeDefined();
  });
});
