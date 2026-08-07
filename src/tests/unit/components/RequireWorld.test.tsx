import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, renderHook } from "@testing-library/react";
import { RequireWorld, useRequireWorld } from "@/components/RequireWorld";
import { useGame } from "@/contexts/useGame";

// Mock GameContext
vi.mock("@/contexts/GameContext", () => ({
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

describe("useRequireWorld", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when world exists", () => {
    vi.mocked(useGame).mockReturnValue({
      state: { world: { year: 1 } },
    } as any);
    const { result } = renderHook(() => useRequireWorld());
    expect(result.current).toBe(true);
  });

  it("returns false when world is null", () => {
    vi.mocked(useGame).mockReturnValue({
      state: { world: null },
    } as any);
    const { result } = renderHook(() => useRequireWorld());
    expect(result.current).toBe(false);
  });

  it("calls navigate when world is null", () => {
    vi.mocked(useGame).mockReturnValue({
      state: { world: null },
    } as any);
    renderHook(() => useRequireWorld());
    expect(mockNavigate).toHaveBeenCalledWith({ to: "/main-menu", replace: true });
  });

  it("does not call navigate when world exists", () => {
    vi.mocked(useGame).mockReturnValue({
      state: { world: { year: 1 } },
    } as any);
    renderHook(() => useRequireWorld());
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

describe("RequireWorld", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders children when world is present", () => {
    vi.mocked(useGame).mockReturnValue({
      state: { world: { year: 1 } },
    } as any);
    const { getByText } = render(
      <RequireWorld>
        <div>Hello World</div>
      </RequireWorld>
    );
    expect(getByText("Hello World")).toBeTruthy();
  });

  it("renders null when world is null", () => {
    vi.mocked(useGame).mockReturnValue({
      state: { world: null },
    } as any);
    const { container } = render(
      <RequireWorld>
        <div>Hello World</div>
      </RequireWorld>
    );
    expect(container.firstChild).toBeNull();
  });
});
