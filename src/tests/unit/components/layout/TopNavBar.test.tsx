import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { TopNavBar } from "@/components/layout/TopNavBar";
import { useGame } from "@/contexts/useGame";
import { useAutosaveIndicator } from "@/hooks/useAutosaveIndicator";
import { getPlayerHeya } from "@/presenters/engineAccess";
import type { WorldState } from "@/engine/types/world";
import type { Heya } from "@/engine/types/heya";

// --- Mocks (declared at module top so vitest hoists alongside vi.mock) ---

const mockNavigate = vi.fn();
const mockSetTheme = vi.fn();
let resolvedTheme: "dark" | "light" = "dark";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("@/contexts/useGame", () => ({
  useGame: vi.fn(),
}));

vi.mock("@/hooks/useTheme", () => ({
  useTheme: () => ({
    theme: "dark",
    setTheme: mockSetTheme,
    resolvedTheme: resolvedTheme,
  }),
}));

vi.mock("@/hooks/useAutosaveIndicator", () => ({
  useAutosaveIndicator: vi.fn(),
}));

vi.mock("@/presenters/engineAccess", async (importOriginal) => ({
  ...((await importOriginal()) as Record<string, unknown>),
  getPlayerHeya: vi.fn(),
}));

vi.mock("@/components/game/SaveLoadDialog", () => ({
  SaveLoadDialog: () => <div data-testid="save-load-mock" />,
}));

vi.mock("@/components/ui/sidebar", () => ({
  SidebarTrigger: (props: any) => <button data-testid="sidebar-trigger" {...props} />,
}));

// Content-rendering passthrough: exposes tooltip content for assertions while
// keeping the Radix portal out of the test.
vi.mock("@/components/ui/tooltip-wrap", () => ({
  TooltipWrap: ({ children, content }: { children: React.ReactNode; content?: React.ReactNode }) => (
    <>
      {content != null && content !== false && (
        <div data-testid="tooltip-content">{content}</div>
      )}
      {children}
    </>
  ),
}));

vi.mock("@/components/layout/HolidayDialog", () => ({
  HolidayDialog: ({ onConfirm, onCancel }: any) => (
    <div data-testid="holiday-dialog-mock">
      <button data-testid="holiday-confirm" onClick={() => onConfirm({ target: "nextWeek" })} />
      <button data-testid="holiday-cancel" onClick={onCancel} />
    </div>
  ),
}));

vi.mock("@/components/layout/EraToneBadge", () => ({
  EraToneBadge: ({ tone }: { tone: string }) => (
    <div data-testid="era-tone-badge-mock" data-tone={tone} />
  ),
}));

// --- Helpers ---

function makeWorld(overrides: Partial<WorldState> = {}): WorldState {
  return {
    year: 2026,
    week: 5,
    cyclePhase: "interim",
    heyas: new Map(),
    ...overrides,
  } as unknown as WorldState;
}

interface MockContextOpts {
  world: WorldState | null;
  autosave?: "idle" | "saving" | "done";
  resolvedThemeOverride?: "dark" | "light";
  heya?: Heya | undefined;
  advanceOneDay?: ReturnType<typeof vi.fn>;
  goOnHoliday?: ReturnType<typeof vi.fn>;
}

function mockContext(opts: MockContextOpts) {
  const advanceOneDay = opts.advanceOneDay ?? vi.fn();
  const goOnHoliday = opts.goOnHoliday ?? vi.fn();
  vi.mocked(useGame).mockReturnValue({
    state: { world: opts.world },
    advanceOneDay,
    goOnHoliday,
  } as any);
  vi.mocked(useAutosaveIndicator).mockReturnValue(opts.autosave ?? "idle");
  resolvedTheme = opts.resolvedThemeOverride ?? "dark";
  vi.mocked(getPlayerHeya).mockReturnValue(opts.heya as any);
  return { advanceOneDay, goOnHoliday };
}

/** Find the smart-advance button — the one containing the ChevronRight icon. */
function getAdvanceButton(container: HTMLElement): HTMLElement {
  const chevron = container.querySelector("svg.lucide-chevron-right");
  if (!chevron) throw new Error("ChevronRight icon not found");
  const btn = chevron.closest("button");
  if (!btn) throw new Error("Advance button not found");
  return btn as HTMLElement;
}

/** Find the autosave dot — a rounded-full element with animation in its style. */
function getAutosaveDot(container: HTMLElement): HTMLElement | null {
  const dots = container.querySelectorAll(".rounded-full");
  for (const dot of dots) {
    const style = dot.getAttribute("style") ?? "";
    if (style.includes("animation") || style.includes("pulse")) {
      return dot as HTMLElement;
    }
  }
  return null;
}

describe("TopNavBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolvedTheme = "dark";
    // Default: no world, idle autosave, no heya.
    mockContext({ world: null });
  });

  afterEach(() => {
    cleanup();
  });

  // ─ No-world render guard ─
  it("renders sidebar trigger and SaveLoadDialog even when world is null", () => {
    mockContext({ world: null });
    render(<TopNavBar />);
    expect(screen.getByTestId("sidebar-trigger")).toBeTruthy();
    expect(screen.getByTestId("save-load-mock")).toBeTruthy();
  });

  it("renders settings and theme buttons even when world is null", () => {
    mockContext({ world: null });
    render(<TopNavBar />);
    expect(screen.getByLabelText("Settings")).toBeTruthy();
    expect(screen.getByLabelText("Toggle theme")).toBeTruthy();
  });

  it("does not render date, funds, or advance button when world is null", () => {
    mockContext({ world: null });
    render(<TopNavBar />);
    expect(screen.queryByText(/Year \d/)).toBeNull();
    expect(screen.queryByText(/Wk \d/)).toBeNull();
    expect(screen.queryByText("Funds")).toBeNull();
    expect(screen.queryByText("Continue")).toBeNull();
    expect(screen.queryByText("Start Basho")).toBeNull();
    // Theme/settings tooltips ARE present (they don't depend on world), but
    // advance-button tooltips are NOT.
    expect(screen.queryByText("Advance to next day of tournament")).toBeNull();
    expect(screen.queryByText("Advance the simulation one day")).toBeNull();
  });

  // ─ Date block ─
  it("renders year and week from world", () => {
    mockContext({ world: makeWorld({ year: 2027, week: 9 }) });
    render(<TopNavBar />);
    expect(screen.getByText(/Year 2027/)).toBeTruthy();
    expect(screen.getByText(/Wk 9/)).toBeTruthy();
  });

  it("prefers calendar.currentWeek over world.week when both present", () => {
    mockContext({
      world: makeWorld({ week: 5, calendar: { currentWeek: 12 } as any }),
    });
    render(<TopNavBar />);
    expect(screen.getByText(/Wk 12/)).toBeTruthy();
    expect(screen.queryByText(/Wk 5\b/)).toBeNull();
  });

  it("falls back to world.week when calendar is absent", () => {
    mockContext({ world: makeWorld({ week: 7 }) });
    render(<TopNavBar />);
    expect(screen.getByText(/Wk 7/)).toBeTruthy();
  });

  // ─ Phase pill ─
  // Note: during active_basho and banzuke_reveal, the phase pill label also
  // appears in the advance button, so we use getAllByText and assert >= 1.
  it.each([
    ["active_basho", { day: 7 }, "Day 7"],
    ["pre_basho", undefined, "Pre-Basho"],
    ["post_basho", undefined, "Post-Basho"],
    ["interim", undefined, "Interim"],
    ["banzuke_reveal", undefined, "Banzuke"],
  ] as const)(
    "renders phase pill label '%s' for cyclePhase '%s'",
    (phase, basho, expected) => {
      mockContext({
        world: makeWorld({
          cyclePhase: phase,
          ...(basho ? { currentBasho: basho as any } : {}),
        }),
      });
      render(<TopNavBar />);
      expect(screen.getAllByText(expected).length).toBeGreaterThanOrEqual(1);
    }
  );

  it("defaults bashoDay to 1 when currentBasho is absent during active_basho", () => {
    mockContext({ world: makeWorld({ cyclePhase: "active_basho" }) });
    render(<TopNavBar />);
    // "Day 1" appears in both the phase pill and the advance button
    expect(screen.getAllByText("Day 1").length).toBeGreaterThanOrEqual(1);
  });

  it("renders basho progress rail only during active_basho", () => {
    mockContext({
      world: makeWorld({
        cyclePhase: "active_basho",
        currentBasho: { day: 7 } as any,
      }),
    });
    const { container: activeContainer } = render(<TopNavBar />);
    expect(activeContainer.querySelector('[class*="h-0.5"]')).toBeTruthy();

    cleanup();
    mockContext({ world: makeWorld({ cyclePhase: "interim" }) });
    const { container: interimContainer } = render(<TopNavBar />);
    expect(interimContainer.querySelector('[class*="h-0.5"]')).toBeNull();
  });

  // ─ Funds block ─
  it("renders formatted funds and runway in tooltip when heya present", () => {
    mockContext({
      world: makeWorld(),
      heya: { funds: 500000, runwayBand: "comfortable" } as any,
    });
    render(<TopNavBar />);
    expect(screen.getByText("Funds")).toBeTruthy();
    // "¥500,000" appears in both the funds display and the tooltip content
    expect(screen.getAllByText("¥500,000").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Runway · comfortable/)).toBeTruthy();
  });

  it("renders negative funds with destructive color and minus prefix", () => {
    mockContext({
      world: makeWorld(),
      heya: { funds: -1000, runwayBand: "desperate" } as any,
    });
    render(<TopNavBar />);
    expect(screen.getByText("-¥1,000")).toBeTruthy();
    const fundsSpan = screen.getByText("-¥1,000");
    expect((fundsSpan as HTMLElement).getAttribute("style")).toContain(
      "hsl(var(--destructive))"
    );
  });

  it("does not render funds block when getPlayerHeya returns undefined", () => {
    mockContext({ world: makeWorld(), heya: undefined });
    render(<TopNavBar />);
    expect(screen.queryByText("Funds")).toBeNull();
  });

  it("falls back to foreground color when runwayBand is undefined", () => {
    mockContext({
      world: makeWorld(),
      heya: { funds: 100, runwayBand: undefined } as any,
    });
    render(<TopNavBar />);
    // "¥100" appears in both the funds display and the tooltip content
    const fundsSpans = screen.getAllByText("¥100");
    const displaySpan = fundsSpans.find(
      (el) => (el as HTMLElement).getAttribute("style")?.includes("hsl(var(--foreground))")
    );
    expect(displaySpan).toBeTruthy();
  });

  // ─ Autosave dot ─
  it("renders pulsing autosave dot when saving and world present", () => {
    mockContext({ world: makeWorld(), autosave: "saving" });
    const { container } = render(<TopNavBar />);
    const dot = getAutosaveDot(container);
    expect(dot).toBeTruthy();
    expect((dot!.getAttribute("style") ?? "").includes("pulse")).toBe(true);
  });

  it("renders static autosave dot when done and world present", () => {
    mockContext({ world: makeWorld(), autosave: "done" });
    const { container } = render(<TopNavBar />);
    const dot = getAutosaveDot(container);
    expect(dot).toBeTruthy();
    // "done" dot has animation: none
    expect((dot!.getAttribute("style") ?? "").includes("none")).toBe(true);
  });

  it("does not render autosave dot when idle", () => {
    mockContext({ world: makeWorld(), autosave: "idle" });
    const { container } = render(<TopNavBar />);
    expect(getAutosaveDot(container)).toBeNull();
  });

  it("does not render autosave dot when saving but world is null", () => {
    mockContext({ world: null, autosave: "saving" });
    const { container } = render(<TopNavBar />);
    expect(getAutosaveDot(container)).toBeNull();
  });

  // ─ Theme toggle ─
  it("renders Sun icon and toggles to light when resolvedTheme is dark", () => {
    mockContext({ world: makeWorld(), resolvedThemeOverride: "dark" });
    const { container } = render(<TopNavBar />);
    expect(container.querySelector("svg.lucide-sun")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Toggle theme"));
    expect(mockSetTheme).toHaveBeenCalledWith("light");
  });

  it("renders Moon icon and toggles to dark when resolvedTheme is light", () => {
    mockContext({ world: makeWorld(), resolvedThemeOverride: "light" });
    const { container } = render(<TopNavBar />);
    expect(container.querySelector("svg.lucide-moon")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Toggle theme"));
    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });

  // ─ Settings button ─
  it("navigates to /settings when settings button clicked", () => {
    mockContext({ world: makeWorld() });
    render(<TopNavBar />);
    fireEvent.click(screen.getByLabelText("Settings"));
    expect(mockNavigate).toHaveBeenCalledWith({ to: "/settings" });
  });

  // ─ Smart-advance button ─
  it("renders Day label and navigates to /basho on click during active_basho", () => {
    const { advanceOneDay } = mockContext({
      world: makeWorld({
        cyclePhase: "active_basho",
        currentBasho: { day: 7 } as any,
      }),
    });
    const { container } = render(<TopNavBar />);
    // "Day 7" appears in both the phase pill and the advance button
    expect(screen.getAllByText("Day 7").length).toBeGreaterThanOrEqual(1);
    const advanceBtn = getAdvanceButton(container);
    fireEvent.click(advanceBtn);
    expect(mockNavigate).toHaveBeenCalledWith({ to: "/basho" });
    expect(advanceOneDay).not.toHaveBeenCalled();
  });

  it("renders Banzuke label and navigates to /recap on click during banzuke_reveal", () => {
    mockContext({ world: makeWorld({ cyclePhase: "banzuke_reveal" }) });
    const { container } = render(<TopNavBar />);
    // "Banzuke" appears in both the phase pill and the advance button
    expect(screen.getAllByText("Banzuke").length).toBeGreaterThanOrEqual(1);
    const advanceBtn = getAdvanceButton(container);
    fireEvent.click(advanceBtn);
    expect(mockNavigate).toHaveBeenCalledWith({ to: "/recap" });
  });

  it("renders Start Basho label and calls advanceOneDay on click during pre_basho", () => {
    const { advanceOneDay } = mockContext({
      world: makeWorld({ cyclePhase: "pre_basho" }),
    });
    const { container } = render(<TopNavBar />);
    expect(screen.getByText("Start Basho")).toBeTruthy();
    const advanceBtn = getAdvanceButton(container);
    fireEvent.click(advanceBtn);
    expect(advanceOneDay).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("renders Continue label and calls advanceOneDay on click during interim", () => {
    const { advanceOneDay } = mockContext({
      world: makeWorld({ cyclePhase: "interim" }),
    });
    const { container } = render(<TopNavBar />);
    expect(screen.getByText("Continue")).toBeTruthy();
    const advanceBtn = getAdvanceButton(container);
    fireEvent.click(advanceBtn);
    expect(advanceOneDay).toHaveBeenCalledTimes(1);
  });

  it("renders Global Cup label when globalCup.isActive is true (still calls advanceOneDay)", () => {
    const { advanceOneDay } = mockContext({
      world: makeWorld({
        cyclePhase: "interim",
        globalCup: { isActive: true } as any,
      }),
    });
    const { container } = render(<TopNavBar />);
    expect(screen.getByText("Global Cup")).toBeTruthy();
    const advanceBtn = getAdvanceButton(container);
    fireEvent.click(advanceBtn);
    expect(advanceOneDay).toHaveBeenCalledTimes(1);
  });

  it("does not render advance button when world is null", () => {
    mockContext({ world: null });
    const { container } = render(<TopNavBar />);
    expect(screen.queryByText("Continue")).toBeNull();
    expect(screen.queryByText("Start Basho")).toBeNull();
    expect(screen.queryByText("Banzuke")).toBeNull();
    expect(container.querySelector("svg.lucide-chevron-right")).toBeNull();
  });

  // ─ Advance button tooltip content (assertable via content-rendering mock) ─
  it.each([
    ["active_basho", "Advance to next day of tournament"],
    ["banzuke_reveal", "Review the new banzuke rankings"],
    ["pre_basho", "Start the tournament preparations"],
    ["interim", "Advance the simulation one day"],
  ] as const)(
    "advance button tooltip content for %s is '%s'",
    (phase, expectedTooltip) => {
      mockContext({
        world: makeWorld({
          cyclePhase: phase,
          ...(phase === "active_basho"
            ? { currentBasho: { day: 1 } as any }
            : {}),
        }),
      });
      render(<TopNavBar />);
      expect(screen.getByText(expectedTooltip)).toBeTruthy();
    }
  );

  // ─ Holiday button ─
  it("renders Holiday button when world present and not in basho", () => {
    mockContext({ world: makeWorld({ cyclePhase: "interim" }) });
    render(<TopNavBar />);
    expect(screen.getByText("Holiday")).toBeTruthy();
  });

  it("does not render Holiday button when world is null", () => {
    mockContext({ world: null });
    render(<TopNavBar />);
    expect(screen.queryByText("Holiday")).toBeNull();
  });

  it("does not render Holiday button during active_basho", () => {
    mockContext({
      world: makeWorld({ cyclePhase: "active_basho", currentBasho: { day: 1 } as any }),
    });
    render(<TopNavBar />);
    expect(screen.queryByText("Holiday")).toBeNull();
  });

  it("opens holiday dialog when Holiday button clicked", () => {
    mockContext({ world: makeWorld({ cyclePhase: "interim" }) });
    render(<TopNavBar />);
    // Dialog not visible initially
    expect(screen.queryByTestId("holiday-dialog-mock")).toBeNull();
    fireEvent.click(screen.getByText("Holiday"));
    expect(screen.getByTestId("holiday-dialog-mock")).toBeTruthy();
  });

  it("calls goOnHoliday and closes dialog on confirm", () => {
    const { goOnHoliday } = mockContext({ world: makeWorld({ cyclePhase: "interim" }) });
    render(<TopNavBar />);
    fireEvent.click(screen.getByText("Holiday"));
    fireEvent.click(screen.getByTestId("holiday-confirm"));
    expect(goOnHoliday).toHaveBeenCalledTimes(1);
    expect(goOnHoliday).toHaveBeenCalledWith({ target: "nextWeek" });
    // Dialog closed after confirm
    expect(screen.queryByTestId("holiday-dialog-mock")).toBeNull();
  });

  it("closes dialog on cancel without calling goOnHoliday", () => {
    const { goOnHoliday } = mockContext({ world: makeWorld({ cyclePhase: "interim" }) });
    render(<TopNavBar />);
    fireEvent.click(screen.getByText("Holiday"));
    fireEvent.click(screen.getByTestId("holiday-cancel"));
    expect(goOnHoliday).not.toHaveBeenCalled();
    expect(screen.queryByTestId("holiday-dialog-mock")).toBeNull();
  });

  it("closes dialog when backdrop clicked", () => {
    mockContext({ world: makeWorld({ cyclePhase: "interim" }) });
    const { container } = render(<TopNavBar />);
    fireEvent.click(screen.getByText("Holiday"));
    // Backdrop is the fixed overlay div
    const backdrop = container.querySelector(".fixed.inset-0") as HTMLElement;
    expect(backdrop).toBeTruthy();
    fireEvent.click(backdrop);
    expect(screen.queryByTestId("holiday-dialog-mock")).toBeNull();
  });

  it("does not close dialog when content area clicked (stopPropagation)", () => {
    mockContext({ world: makeWorld({ cyclePhase: "interim" }) });
    const { container } = render(<TopNavBar />);
    fireEvent.click(screen.getByText("Holiday"));
    // Inner content div (the one with stopPropagation)
    const backdrop = container.querySelector(".fixed.inset-0") as HTMLElement;
    const contentDiv = backdrop.querySelector("div") as HTMLElement;
    fireEvent.click(contentDiv);
    // Dialog should still be open
    expect(screen.getByTestId("holiday-dialog-mock")).toBeTruthy();
  });

  // ─ EraToneBadge ─
  it("renders EraToneBadge when world.meta.tone exists", () => {
    mockContext({
      world: makeWorld({ meta: { tone: "classic", drift: {} } } as any),
    });
    render(<TopNavBar />);
    expect(screen.getByTestId("era-tone-badge-mock")).toBeTruthy();
    expect(screen.getByTestId("era-tone-badge-mock").getAttribute("data-tone")).toBe("classic");
  });

  it("does not render EraToneBadge when world.meta.tone is absent", () => {
    mockContext({ world: makeWorld() });
    render(<TopNavBar />);
    expect(screen.queryByTestId("era-tone-badge-mock")).toBeNull();
  });
});
