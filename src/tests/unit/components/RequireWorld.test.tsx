import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, renderHook } from "@testing-library/react";
import { RequireWorld } from "@/components/RequireWorld";
import { useRequireWorld } from "@/hooks/useRequireWorld";
import { useGame } from "@/contexts/useGame";

vi.mock("@/contexts/useGame", () => ({
  useGame: vi.fn(),
}));

// Mock @tanstack/react-router
const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));

// Mock useEffect to run synchronously in tests
vi.mock("react", async () => {
  const actual = await vi.importActual("react");
  return {
    ...actual,
    useEffect: (cb: () => void) => cb(),
  };
});

const noAutosaveGame = (world: unknown) =>
  ({
    state: { world },
    hasAutosave: () => false,
    loadFromAutosave: () => false,
  }) as any;

describe("useRequireWorld", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when world exists", () => {
    vi.mocked(useGame).mockReturnValue(noAutosaveGame({ year: 1 }));
    const { result } = renderHook(() => useRequireWorld());
    expect(result.current).toBe(true);
  });

  it("returns false when world is null", () => {
    vi.mocked(useGame).mockReturnValue(noAutosaveGame(null));
    const { result } = renderHook(() => useRequireWorld());
    expect(result.current).toBe(false);
  });

  it("calls navigate when world is null and no autosave exists", () => {
    vi.mocked(useGame).mockReturnValue(noAutosaveGame(null));
    renderHook(() => useRequireWorld());
    expect(mockNavigate).toHaveBeenCalledWith({ to: "/main-menu", replace: true });
  });

  it("restores autosave instead of navigating when a save exists", () => {
    const loadFromAutosave = vi.fn(() => true);
    vi.mocked(useGame).mockReturnValue({
      state: { world: null },
      hasAutosave: () => true,
      loadFromAutosave,
    } as any);
    renderHook(() => useRequireWorld());
    expect(loadFromAutosave).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("navigates when autosave exists but fails to load", () => {
    vi.mocked(useGame).mockReturnValue({
      state: { world: null },
      hasAutosave: () => true,
      loadFromAutosave: () => false,
    } as any);
    renderHook(() => useRequireWorld());
    expect(mockNavigate).toHaveBeenCalledWith({ to: "/main-menu", replace: true });
  });

  it("does not call navigate when world exists", () => {
    vi.mocked(useGame).mockReturnValue(noAutosaveGame({ year: 1 }));
    renderHook(() => useRequireWorld());
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

describe("RequireWorld", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders children when world is present", () => {
    vi.mocked(useGame).mockReturnValue(noAutosaveGame({ year: 1 }));
    const { getByText } = render(
      <RequireWorld>
        <div>Hello World</div>
      </RequireWorld>
    );
    expect(getByText("Hello World")).toBeTruthy();
  });

  it("renders the loader (not children) when world is null", () => {
    vi.mocked(useGame).mockReturnValue(noAutosaveGame(null));
    const { queryByText } = render(
      <RequireWorld>
        <div>Hello World</div>
      </RequireWorld>
    );
    expect(queryByText("Hello World")).toBeNull();
  });
});
