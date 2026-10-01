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

describe("ActionQueueWidget resolve items", () => {
  afterEach(() => cleanup());

  const base = {
    kind: "resolve" as const,
    severity: "warning" as const,
    title: "Kyujo decision pending",
    decisionId: "d1",
    options: [{ id: "o1", label: "Rest him", impact: "Recovers faster" }],
  };

  it("required decisions say they block advance and never promise auto-resolve", async () => {
    render(<ActionQueueWidget items={[{ ...base, required: true }]} />);
    expect(screen.queryByText(/auto-resolve/i)).toBeNull();
    // Expand the item
    const toggle = screen.getByRole("button", { name: /expand kyujo/i });
    toggle.click();
    expect(await screen.findByText(/blocks time advance/i)).toBeTruthy();
    expect(screen.getByText("Required")).toBeTruthy();
    expect(screen.getByText("1 blocking")).toBeTruthy();
  });

  it("optional decisions keep the auto-resolve note", async () => {
    render(<ActionQueueWidget items={[{ ...base, required: false }]} />);
    const toggle = screen.getByRole("button", { name: /expand kyujo/i });
    toggle.click();
    expect(await screen.findByText(/auto-resolves after its deadline/i)).toBeTruthy();
  });
});
