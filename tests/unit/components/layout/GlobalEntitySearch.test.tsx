/**
 * GlobalEntitySearch.test.tsx
 *
 * Component tests for the TopNavBar entity search — dropdown behavior,
 * keyboard navigation, sectioning, empty states, and the focus signal.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, act, waitFor } from "@testing-library/react";
import { GlobalEntitySearch } from "@/components/layout/GlobalEntitySearch";
import { onFocusGlobalSearch, focusGlobalSearch } from "@/components/shared/searchFocusSignal";
import { useGame } from "@/state/game/useGame";
import { searchEntities } from "@/presenters/projections/entitySearchProjections";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { WorldState } from "@/engine/types/world";
import type {
  EntitySearchResults,
  RikishiSearchHit,
  HeyaSearchHit,
  OyakataSearchHit,
  StaffSearchHit,
  CandidateSearchHit,
} from "@/presenters/projections/entitySearchProjections";

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

function rikishiHit(overrides: Partial<RikishiSearchHit> = {}): RikishiSearchHit {
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

function heyaHit(overrides: Partial<HeyaSearchHit> = {}): HeyaSearchHit {
  return {
    kind: "heya" as const,
    id: "h9",
    name: "Miyagino",
    rikishiCount: 7,
    isPlayerOwned: false,
    ...overrides,
  };
}

function oyakataHit(overrides: Partial<OyakataSearchHit> = {}): OyakataSearchHit {
  return {
    kind: "oyakata" as const,
    id: "o1",
    name: "Chiganoura",
    shikona: "Masudayama",
    heyaId: "h2",
    heyaName: "Miyagino",
    isPlayerOwned: false,
    isEmeritus: false,
    isCaretaker: false,
    ...overrides,
  };
}

function staffHit(overrides: Partial<StaffSearchHit> = {}): StaffSearchHit {
  return {
    kind: "staff" as const,
    id: "s1",
    name: "Tanaka Jiro",
    role: "technique_coach",
    roleLabel: "Technique Coach",
    heyaId: "h1",
    heyaName: "Futagoyama",
    isPlayerOwned: true,
    ...overrides,
  };
}

function candidateHit(overrides: Partial<CandidateSearchHit> = {}): CandidateSearchHit {
  return {
    kind: "candidate" as const,
    candidateId: "c1",
    name: "Yamada Taro",
    pool: "high_school" as const,
    poolLabel: "High School",
    age: 17,
    nationality: "Japan",
    isForeign: false,
    isAmateurStar: false,
    ...overrides,
  };
}

const EMPTY_RESULTS: EntitySearchResults = {
  rikishi: [],
  retired: [],
  heyas: [],
  oyakata: [],
  staff: [],
  candidates: [],
};

function resultsOf(partial: Partial<EntitySearchResults> = {}): EntitySearchResults {
  return { ...EMPTY_RESULTS, ...partial };
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
    vi.mocked(searchEntities).mockReturnValue(resultsOf());
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
    vi.mocked(searchEntities).mockReturnValue(
      resultsOf({
        heyas: [heyaHit()],
        rikishi: [rikishiHit()],
        retired: [rikishiHit({ id: "old1", shikona: "Taiho", isRetired: true })],
      })
    );
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
    vi.mocked(searchEntities).mockReturnValue(
      resultsOf({ heyas: [heyaHit()], rikishi: [rikishiHit()] })
    );
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
    vi.mocked(searchEntities).mockReturnValue(resultsOf({ heyas: [heyaHit()] }));
    render(<GlobalEntitySearch />);
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "miya" } });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(mockNavigate).toHaveBeenCalledWith({ to: "/stable/$id", params: { id: "h9" } });
  });

  it("click on an option navigates and closes the listbox", () => {
    vi.mocked(searchEntities).mockReturnValue(resultsOf({ rikishi: [rikishiHit()] }));
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
    vi.mocked(searchEntities).mockReturnValue(resultsOf({ rikishi: [rikishiHit()] }));
    render(<GlobalEntitySearch />);
    const input = screen.getByRole("combobox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "taka" } });
    expect(screen.getByRole("listbox")).toBeTruthy();
    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(input.value).toBe("");
  });

  it("mousedown outside the component closes the listbox", () => {
    vi.mocked(searchEntities).mockReturnValue(resultsOf({ rikishi: [rikishiHit()] }));
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
    vi.mocked(searchEntities).mockReturnValue(resultsOf({ rikishi: [rikishiHit()] }));
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

  it("renders oyakata, staff, and prospect sections", () => {
    vi.mocked(searchEntities).mockReturnValue(
      resultsOf({
        oyakata: [oyakataHit()],
        staff: [staffHit()],
        candidates: [candidateHit()],
      })
    );
    render(<GlobalEntitySearch />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "a" } });
    expect(screen.getByText("Oyakata")).toBeTruthy();
    expect(screen.getByText("Staff")).toBeTruthy();
    expect(screen.getByText("Prospects")).toBeTruthy();
    expect(screen.getByText("Chiganoura")).toBeTruthy();
    expect(screen.getByText("Tanaka Jiro")).toBeTruthy();
    expect(screen.getByText("Yamada Taro")).toBeTruthy();
  });

  it("Enter on an oyakata option navigates to the oyakata profile", () => {
    vi.mocked(searchEntities).mockReturnValue(resultsOf({ oyakata: [oyakataHit()] }));
    render(<GlobalEntitySearch />);
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "chiga" } });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/oyakata/$oyakataId",
      params: { oyakataId: "o1" },
    });
  });

  it("Enter on a player staff option navigates to the staff tab", () => {
    vi.mocked(searchEntities).mockReturnValue(resultsOf({ staff: [staffHit()] }));
    render(<GlobalEntitySearch />);
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "tanaka" } });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(mockNavigate).toHaveBeenCalledWith({ to: "/stable/staff" });
  });

  it("Enter on an NPC staff option navigates to that stable's page", () => {
    vi.mocked(searchEntities).mockReturnValue(
      resultsOf({ staff: [staffHit({ heyaId: "h9", isPlayerOwned: false })] })
    );
    render(<GlobalEntitySearch />);
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "tanaka" } });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(mockNavigate).toHaveBeenCalledWith({ to: "/stable/$id", params: { id: "h9" } });
  });

  it("Enter on a candidate option deep-links to the talent pool with pool+focus", () => {
    vi.mocked(searchEntities).mockReturnValue(
      resultsOf({ candidates: [candidateHit({ pool: "foreign" })] })
    );
    render(<GlobalEntitySearch />);
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "yamada" } });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/jsa/talent",
      search: { pool: "foreign", focus: "c1" },
    });
  });

  it("same-named entities in different groups are located group-scoped (Kokonoe collision)", () => {
    // A heya, a rikishi, and an oyakata can all be named "Kokonoe" — the
    // dropdown disambiguates by group, and each row still routes by kind.
    vi.mocked(searchEntities).mockReturnValue(
      resultsOf({
        heyas: [heyaHit({ id: "h9", name: "Kokonoe" })],
        rikishi: [rikishiHit({ id: "r9", shikona: "Kokonoe" })],
        oyakata: [oyakataHit({ id: "o9", name: "Kokonoe" })],
      })
    );
    render(<GlobalEntitySearch />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "kokonoe" } });

    expect(screen.getAllByRole("option")).toHaveLength(3);
    expect(screen.getByText("Stables")).toBeTruthy();
    expect(screen.getByText("Wrestlers")).toBeTruthy();
    expect(screen.getByText("Oyakata")).toBeTruthy();

    // Locate the option inside the Oyakata group specifically (same logic
    // as the e2e optionIdInGroup helper — headers precede their options).
    const res = document.getElementById("gs-results")!;
    let inGroup = false;
    let oyaRow: HTMLElement | null = null;
    for (const child of Array.from(res.children)) {
      const header = child.firstElementChild;
      if (header && header.getAttribute("role") !== "option") {
        inGroup = (header.textContent ?? "").trim() === "Oyakata";
      }
      const opt = child.querySelector<HTMLElement>('[role="option"]');
      if (inGroup && opt && (opt.textContent ?? "").includes("Kokonoe")) {
        oyaRow = opt;
      }
    }
    expect(oyaRow).not.toBeNull();
    fireEvent.click(oyaRow!);
    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/oyakata/$oyakataId",
      params: { oyakataId: "o9" },
    });
  });
});
