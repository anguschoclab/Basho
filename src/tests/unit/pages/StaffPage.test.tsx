import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import * as GameContext from "@/contexts/useGame";
import StaffPage from "@/pages/StaffPage";

vi.mock("@/contexts/useGame");

vi.mock("@/store/gameStore", () => ({
  useGameStore: () => ({ sendCommand: vi.fn() }),
}));

vi.mock("@/hooks/useRequireWorld", () => ({
  useRequireWorld: () => true,
}));

vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: any) => React.createElement("div", null, children),
}));

vi.mock("@/components/layout/control-center", () => ({
  PageHeader: ({ title }: any) => React.createElement("div", null, title),
}));

vi.mock("@/components/ui/tooltip-wrap", () => ({
  TooltipWrap: ({ children }: any) => React.createElement("div", null, children),
}));

vi.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({ children }: any) => React.createElement("div", null, children),
  AlertDialogTrigger: ({ children }: any) => React.createElement("div", null, children),
  AlertDialogContent: ({ children }: any) => React.createElement("div", null, children),
  AlertDialogHeader: ({ children }: any) => React.createElement("div", null, children),
  AlertDialogFooter: ({ children }: any) => React.createElement("div", null, children),
  AlertDialogTitle: ({ children }: any) => React.createElement("div", null, children),
  AlertDialogDescription: ({ children }: any) => React.createElement("div", null, children),
  AlertDialogAction: ({ children, onClick }: any) =>
    React.createElement("button", { onClick }, children),
  AlertDialogCancel: ({ children }: any) => React.createElement("button", null, children),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: any) => (open ? React.createElement("div", null, children) : null),
  DialogTrigger: ({ children }: any) => React.createElement("div", null, children),
  DialogContent: ({ children }: any) => React.createElement("div", null, children),
  DialogHeader: ({ children }: any) => React.createElement("div", null, children),
  DialogFooter: ({ children }: any) => React.createElement("div", null, children),
  DialogTitle: ({ children }: any) => React.createElement("div", null, children),
  DialogDescription: ({ children }: any) => React.createElement("div", null, children),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("@/presenters/worldAccess", () => ({
  getStaffMember: (_world: any, id: string) => mockStaff.find((s) => s.id === id),
}));

vi.mock("@/engine/queries", () => ({
  getPlayerHeya: () => ({ id: "h1", name: "TestHeya", staffIds: mockStaff.map((s) => s.id) }),
}));

vi.mock("@/engine/descriptorBands", () => ({
  toFatigueBand: (v: number) => (v > 75 ? "exhausted" : "fresh"),
  toScandalBand: (v: number) => (v > 50 ? "elevated" : "clean"),
}));

vi.mock("@/constants/ui/labels", () => ({
  FATIGUE_LABELS: { fresh: "Fresh", exhausted: "Exhausted" },
  SCANDAL_LABELS: { clean: "Clean", elevated: "Elevated" },
}));

const STORAGE_KEY = "basho_sort_staff";

let mockStaff: any[] = [];

function makeStaff(id: string, overrides: any = {}): any {
  return {
    id,
    name: `Staff-${id}`,
    role: "assistant_oyakata",
    careerPhase: "prime",
    competenceBands: { primary: "strong" },
    reputationBand: "respected",
    loyaltyBand: "devoted",
    yearsAtBeya: 5,
    fatigue: 20,
    scandalExposure: 10,
    ...overrides,
  };
}

function mockUseGame(world: any | null) {
  vi.mocked(GameContext.useGame).mockReturnValue({
    state: { world: world ?? {} },
  } as any);
}

function getCardNames(): string[] {
  const titles = document.querySelectorAll(".text-lg");
  return Array.from(titles)
    .map((el) => el.textContent ?? "")
    .filter((t) => t === "Alpha" || t === "Bravo" || t === "Charlie");
}

describe("StaffPage sorting", () => {
  beforeEach(() => {
    localStorage.clear();
    mockStaff = [
      makeStaff("s1", { name: "Charlie", role: "scout", competenceBands: { primary: "feeble" }, yearsAtBeya: 2 }),
      makeStaff("s2", { name: "Alpha", role: "medical_staff", competenceBands: { primary: "dominant" }, yearsAtBeya: 10 }),
      makeStaff("s3", { name: "Bravo", role: "technique_coach", competenceBands: { primary: "great" }, yearsAtBeya: 5 }),
    ];
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("renders a SortMenu control", () => {
    mockUseGame({ playerHeyaId: "h1" });
    render(<StaffPage />);
    expect(screen.getByRole("combobox")).toBeTruthy();
  });

  it("sorting by name ascending reorders alphabetically", () => {
    mockUseGame({ playerHeyaId: "h1" });
    render(<StaffPage />);
    const trigger = screen.getByRole("combobox");
    fireEvent.keyDown(trigger, { key: "Enter", code: "Enter", charCode: 13 });
    const elements = screen.getAllByText("Name");
    fireEvent.click(elements[elements.length - 1]);
    const order = getCardNames();
    expect(order).toEqual(["Alpha", "Bravo", "Charlie"]);
  });

  it("sorting by tenure ascending", () => {
    mockUseGame({ playerHeyaId: "h1" });
    render(<StaffPage />);
    const trigger = screen.getByRole("combobox");
    fireEvent.keyDown(trigger, { key: "Enter", code: "Enter", charCode: 13 });
    const elements = screen.getAllByText("Tenure");
    fireEvent.click(elements[elements.length - 1]);
    const order = getCardNames();
    // asc: 2, 5, 10 → Charlie, Bravo, Alpha
    expect(order).toEqual(["Charlie", "Bravo", "Alpha"]);
  });

  it("persists sort state to localStorage", () => {
    mockUseGame({ playerHeyaId: "h1" });
    render(<StaffPage />);
    const trigger = screen.getByRole("combobox");
    fireEvent.keyDown(trigger, { key: "Enter", code: "Enter", charCode: 13 });
    const elements = screen.getAllByText("Tenure");
    act(() => {
      fireEvent.click(elements[elements.length - 1]);
    });
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const stored = JSON.parse(raw!);
    expect(stored.key).toBe("tenure");
    expect(stored.order).toBe("asc");
  });

  it("restores sort state from localStorage on init", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ key: "name", order: "desc" }));
    mockUseGame({ playerHeyaId: "h1" });
    render(<StaffPage />);
    const order = getCardNames();
    // desc name: Charlie, Bravo, Alpha
    expect(order).toEqual(["Charlie", "Bravo", "Alpha"]);
  });
});
