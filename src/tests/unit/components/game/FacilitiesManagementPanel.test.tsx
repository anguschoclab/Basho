import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { FacilitiesManagementPanel } from "@/components/game/FacilitiesManagementPanel";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import type { Heya } from "@/engine/types/heya";

function makeHeya(
  overrides: Partial<Heya> = {}
): Heya {
  return MockFactory.createHeya("h1", {
    facilities: { training: 10, recovery: 10, nutrition: 10 },
    funds: 10_000_000,
    ...overrides,
  });
}

function renderPanel(
  heya: Heya,
  onUpgrade: ReturnType<typeof vi.fn> = vi.fn(),
  isOwner = true
) {
  return render(
    <FacilitiesManagementPanel
      heya={heya}
      isOwner={isOwner}
      onUpgrade={onUpgrade as any}
    />
  );
}

describe("FacilitiesManagementPanel — real cost from world diff", () => {
  afterEach(() => cleanup());

  it("should show real upgrade cost (¥1,000,000) not fabricated points*100 (¥500) after WORLD_UPDATED", () => {
    const initialHeya = makeHeya();
    const onUpgrade = vi.fn();

    const { rerender } = renderPanel(initialHeya, onUpgrade);

    // Click +5 training upgrade (first +5 button is training axis)
    const plus5Btns = screen.getAllByText(/\+5/);
    fireEvent.click(plus5Btns[0]);

    expect(onUpgrade).toHaveBeenCalledWith("training", 5);

    // Simulate WORLD_UPDATED: heya comes back with real cost deducted
    const updatedHeya = makeHeya({
      facilities: { training: 15, recovery: 10, nutrition: 10 },
      funds: 9_000_000, // 10M - 1M real cost
    });
    rerender(
      <FacilitiesManagementPanel
        heya={updatedHeya}
        isOwner={true}
        onUpgrade={onUpgrade as any}
      />
    );

    // Toast should show real cost ¥1,000,000, NOT ¥500 (points * 100)
    expect(screen.getByText(/Upgraded training from 10 → 15 for ¥1,000,000/)).not.toBeNull();
    expect(screen.queryByText(/¥500/)).toBeNull();
  });

  it("should show level transition in toast from world diff", () => {
    const initialHeya = makeHeya({ facilities: { training: 10, recovery: 10, nutrition: 10 } });
    const onUpgrade = vi.fn();

    const { rerender } = renderPanel(initialHeya, onUpgrade);

    // Click +1 training upgrade (first +1 button is training axis)
    const plus1Btns = screen.getAllByText(/\+1/);
    fireEvent.click(plus1Btns[0]);

    // Simulate WORLD_UPDATED: training 10 → 11
    const updatedHeya = makeHeya({
      facilities: { training: 11, recovery: 10, nutrition: 10 },
      funds: 9_800_000, // 10M - 200k
    });
    rerender(
      <FacilitiesManagementPanel
        heya={updatedHeya}
        isOwner={true}
        onUpgrade={onUpgrade as any}
      />
    );

    expect(screen.getByText(/Upgraded training from 10 → 11 for ¥200,000/)).not.toBeNull();
  });

  it("should call onUpgrade as fire-and-forget (void return, not UpgradeResult)", () => {
    const heya = makeHeya();
    const onUpgrade = vi.fn(() => undefined); // void return

    renderPanel(heya, onUpgrade);

    const plus5Btns = screen.getAllByText(/\+5/);
    fireEvent.click(plus5Btns[0]);

    // onUpgrade should be called — the panel must not rely on its return value
    expect(onUpgrade).toHaveBeenCalledWith("training", 5);
  });
});
