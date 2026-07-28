import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ActionQueueWidget } from "@/components/dashboard/ActionQueueWidget";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("@/store/gameStore", () => ({
  useGameStore: () => ({ sendCommand: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn() },
}));

describe("ActionQueueWidget empty state", () => {
  afterEach(() => cleanup());

  it("renders inside BaseWidget with a border", () => {
    const { container } = render(<ActionQueueWidget items={[]} />);
    const widget = container.querySelector(".widget-card");
    expect(widget).toBeTruthy();
    expect(widget?.className).toContain("border");
    expect(widget?.className).toContain("border-border/40");
    expect(screen.getByText("No pending actions")).toBeTruthy();
  });
});
