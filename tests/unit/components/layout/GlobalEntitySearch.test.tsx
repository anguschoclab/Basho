/**
 * GlobalEntitySearch.test.tsx
 *
 * Component tests for the TopNavBar entity search — dropdown behavior,
 * keyboard navigation, sectioning, empty states, and the focus signal.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, act, waitFor } from "@testing-library/react";
import { GlobalEntitySearch } from "@/components/layout/GlobalEntitySearch";
import {
  onFocusGlobalSearch,
  focusGlobalSearch,
} from "@/components/shared/searchFocusSignal";
import { useGame } from "@/state/game/useGame";
import { searchEntities } from "@/presenters/projections/entitySearchProjections";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { WorldState } from "@/engine/types/world";

const mockNavigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("@/state/game/useGame", () => ({
  useGame: vi.fn(),
}));

vi.mock("@/presenters/projections/entitySearchProjections", () => ({
  searchEntities: vi.fn(),
}));

function worldFixture(overrides: Partial<WorldState> = {}): WorldState {
  return MockFactory.createWorld(overrides);
}

function rikishiHit(overrides: Record<string, unknown> = {}) {
  return {
    kind: "rikishi" as const,
    id: "r1",
    shikona: "Takanohana",
    heyaName: "Futagoyama",
    heyaId: "h1",
    rankLabel: "M3 · Makuuchi",
    isRetired: false,
    isPlayerOwned: true,
    ...overrides,
  };
}

function heyaHit(overrides: Record<string, unknown> = {}) {
  return {
    kind: "heya" as const,
    id: "h9",
    name: "Miyagino",
    rikishiCount: 7,
    isPlayerOwned: false,
    ...overrides,
  };
}

function mockContext(world: WorldState | null, playerHeyaId = "h1") {
  vi.mocked(useGame).mockReturnValue({
    state: { world, playerHeyaId },
  } as any);
}

describe("GlobalEntitySearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockContext(worldFixture());
    vi.mocked(searchEntities).mockReturnValue({ rikishi: [], retired: [], heyas: [] });
  });

  afterEach(() => cleanup());

  it("renders a combobox input", () => {
    render(<GlobalEntitySearch />);
    const input = screen.getByRole("combobox");
    expect(input).toBeTruthy();
  });

  it("opens listbox on non-empty query and calls projection lazily", () => {
    render(<GlobalEntitySearch />);
    // No search runs before a query exists
    expect(searchEntities).not.toHaveBeenCalled();
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "taka" } });
    expect(searchEntities).toHaveBeenCalled();
    expect(screen.getByRole("listbox")).toBeTruthy();
    expect(input.getAttribute("aria-expanded")).toBe("true");
  });

  it("renders sectioned results: stables, wrestlers, retired", () => {
    vi.mocked(searchEntities).mockReturnValue({
      heyas: [heyaHit()],
      rikishi: [rikishiHit()],
      retired: [rikishiHit({ id: "old1", shikona: "Taiho", isRetired: true })],
    });
    render(<GlobalEntitySearch />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "ta" } });
    expect(screen.getByText("Stables")).toBeTruthy();
    expect(screen.getByText("Wrestlers")).toBeTruthy();
    // "Retired" appears as both a section header and a per-row badge
    expect(screen.getAllByText("Retired").length).toBeGreaterThanOrEqual(1);
    // Options
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(3);
    expect(screen.getByText("Miyagino")).toBeTruthy();
    expect(screen.getByText("Takanohana")).toBeTruthy();
    expect(screen.getByText("Taiho")).toBeTruthy();
  });

  it("arrow keys move the active option and Enter navigates to the rikishi page", () => {
    vi.mocked(searchEntities).mockReturnValue({
      heyas: [heyaHit()],
      rikishi: [rikishiHit()],
      retired: [],
    });
    render(<GlobalEntitySearch />);
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "ta" } });
    // First option = heya; ArrowDown → second option = rikishi
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/rikishi/$rikishiId",
      params: { rikishiId: "r1" },
    });
  });

  it("Enter on a heya option navigates to the stable page", () => {
    vi.mocked(searchEntities).mockReturnValue({
      heyas: [heyaHit()],
      rikishi: [],
      retired: [],
    });
    render(<GlobalEntitySearch />);
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "miya" } });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(mockNavigate).toHaveBeenCalledWith({ to: "/stable/$id", params: { id: "h9" } });
  });

  it("click on an option navigates and closes the listbox", () => {
    vi.mocked(searchEntities).mockReturnValue({
      heyas: [],
      rikishi: [rikishiHit()],
      retired: [],
    });
    render(<GlobalEntitySearch />);
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "taka" } });
    fireEvent.click(screen.getByText("Takanohana"));
    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/rikishi/$rikishiId",
      params: { rikishiId: "r1" },
    });
    expect(screen.queryByRole("listbox")).toBeNull();
    expect((input as HTMLInputElement).value).toBe("");
  });

  it("Escape closes the listbox and clears the query", () => {
    vi.mocked(searchEntities).mockReturnValue({
      heyas: [],
      rikishi: [rikishiHit()],
      retired: [],
    });
    render(<GlobalEntitySearch />);
    const input = screen.getByRole("combobox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "taka" } });
    expect(screen.getByRole("listbox")).toBeTruthy();
    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(input.value).toBe("");
  });

  it("mousedown outside the component closes the listbox", () => {
    vi.mocked(searchEntities).mockReturnValue({
      heyas: [],
      rikishi: [rikishiHit()],
      retired: [],
    });
    render(
      <div>
        <GlobalEntitySearch />
        <div data-testid="outside" />
      </div>
    );
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "taka" } });
    expect(screen.getByRole("listbox")).toBeTruthy();
    fireEvent.mouseDown(screen.getByTestId("outside"));
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("shows a no-matches row when query yields nothing", () => {
    render(<GlobalEntitySearch />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "zzz" } });
    expect(screen.getByRole("listbox")).toBeTruthy();
    expect(screen.getByText(/no matches/i)).toBeTruthy();
  });

  it("clear button resets the query", () => {
    vi.mocked(searchEntities).mockReturnValue({
      heyas: [],
      rikishi: [rikishiHit()],
      retired: [],
    });
    render(<GlobalEntitySearch />);
    const input = screen.getByRole("combobox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "taka" } });
    fireEvent.click(screen.getByLabelText("Clear search"));
    expect(input.value).toBe("");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("focusGlobalSearch signal focuses the input", async () => {
    render(<GlobalEntitySearch />);
    const input = screen.getByRole("combobox") as HTMLInputElement;
    expect(document.activeElement).not.toBe(input);
    // Simulate the keyboard shortcut firing the signal — focus is deferred a
    // tick so the input exists when it was just mounted on mobile.
    act(() => focusGlobalSearch());
    await waitFor(() => expect(document.activeElement).toBe(input));
  });

  it("onFocusGlobalSearch subscription is cleaned up on unmount", () => {
    const spy = vi.fn();
    const unsub = onFocusGlobalSearch(spy);
    unsub();
    focusGlobalSearch();
    expect(spy).not.toHaveBeenCalled();
  });
});
