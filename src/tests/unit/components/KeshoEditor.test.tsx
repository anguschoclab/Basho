import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

const mockSetKeshoConfig = vi.fn();

vi.mock("@/contexts/useGame", () => ({
  useGame: () => ({
    state: { world: { customKeshoConfigs: {} } },
    setKeshoConfig: mockSetKeshoConfig,
  }),
}));

vi.mock("@/components/avatar/SumoAvatar", () => ({
  SumoAvatar: () => React.createElement("div", { "data-testid": "sumo-avatar" }),
}));

import { KeshoEditor } from "@/components/game/KeshoEditor";
import type { UIRikishi } from "@/presenters/uiModels";

function makeRikishi(): UIRikishi {
  return {
    id: "r1",
    shikona: "Testyama",
  } as unknown as UIRikishi;
}

/**
 * Coverage for PR #922: motif and preset-palette selector buttons in the
 * Kesho-Mawashi editor must expose accessible names for screen readers.
 */
describe("KeshoEditor accessibility (PR #922)", () => {
  afterEach(() => cleanup());

  it("motif selector buttons have accessible names", () => {
    render(<KeshoEditor rikishi={makeRikishi()} open onClose={vi.fn()} />);
    // Post-#922: aria-label={`Select motif ${m.replace("_", " ")}`}
    expect(
      screen.getByRole("button", { name: /select motif rising sun/i })
    ).toBeDefined();
  });

  it("preset palette buttons have accessible names", () => {
    render(<KeshoEditor rikishi={makeRikishi()} open onClose={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: /select preset sovereign gold/i })
    ).toBeDefined();
  });

  it("clicking a preset applies its colors via the editor", () => {
    render(<KeshoEditor rikishi={makeRikishi()} open onClose={vi.fn()} />);
    const preset = screen.getByRole("button", { name: /select preset deep ocean/i });
    fireEvent.click(preset);
    // Save to flush config to the store
    const save = screen.getByRole("button", { name: /save authority/i });
    fireEvent.click(save);
    expect(mockSetKeshoConfig).toHaveBeenCalled();
  });
});
