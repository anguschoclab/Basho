import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCalendarActions } from "@/hooks/useCalendarActions";
import * as GameContext from "@/contexts/useGame";
import * as ToastHook from "@/hooks/use-toast";

const navigateMock = vi.fn();

vi.mock("@/contexts/useGame");
vi.mock("@/hooks/use-toast");
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigateMock,
}));

function mockHooks(overrides: Partial<any> = {}) {
  const toastFn = vi.fn();
  vi.mocked(ToastHook.useToast).mockReturnValue({ toast: toastFn } as any);
  vi.mocked(GameContext.useGame).mockReturnValue({
    state: { world: { year: 2025 } },
    advanceInterim: vi.fn(),
    advanceOneDay: vi.fn(),
    simulateAllBouts: vi.fn(),
    endDay: vi.fn(),
    advanceDay: vi.fn(),
    simFullBasho: vi.fn(),
    ...overrides,
  } as any);
  return { toastFn };
}

describe("useCalendarActions", () => {
  afterEach(() => {
    vi.clearAllMocks();
    navigateMock.mockClear();
  });

  it("returns world from game state", () => {
    mockHooks();
    const { result } = renderHook(() => useCalendarActions());
    expect(result.current.world).toEqual({ year: 2025 });
  });

  it("handleAdvanceDay calls advanceOneDay and toast", () => {
    const advanceOneDay = vi.fn();
    const { toastFn } = mockHooks({ advanceOneDay });
    const { result } = renderHook(() => useCalendarActions());
    act(() => result.current.handleAdvanceDay());
    expect(advanceOneDay).toHaveBeenCalledTimes(1);
    expect(toastFn).toHaveBeenCalledWith({ title: "Day advanced" });
  });

  it("handleAdvanceWeek calls advanceInterim(1) and toast", () => {
    const advanceInterim = vi.fn();
    const { toastFn } = mockHooks({ advanceInterim });
    const { result } = renderHook(() => useCalendarActions());
    act(() => result.current.handleAdvanceWeek());
    expect(advanceInterim).toHaveBeenCalledWith(1);
    expect(toastFn).toHaveBeenCalledWith({ title: "Week advanced" });
  });

  it("handleSimDay calls simulateAllBouts, endDay, advanceDay, and toast", () => {
    const simulateAllBouts = vi.fn();
    const endDay = vi.fn();
    const advanceDay = vi.fn();
    const { toastFn } = mockHooks({ simulateAllBouts, endDay, advanceDay });
    const { result } = renderHook(() => useCalendarActions());
    act(() => result.current.handleSimDay());
    expect(simulateAllBouts).toHaveBeenCalledTimes(1);
    expect(endDay).toHaveBeenCalledTimes(1);
    expect(advanceDay).toHaveBeenCalledTimes(1);
    expect(toastFn).toHaveBeenCalledWith({ title: "Day simulated" });
  });

  it("handleSimFullBasho calls simFullBasho, toast, and navigates to /basho", () => {
    const simFullBasho = vi.fn();
    const { toastFn } = mockHooks({ simFullBasho });
    const { result } = renderHook(() => useCalendarActions());
    act(() => result.current.handleSimFullBasho());
    expect(simFullBasho).toHaveBeenCalledTimes(1);
    expect(toastFn).toHaveBeenCalledWith({
      title: "Basho complete!",
      description: "All 15 days simulated.",
    });
    expect(navigateMock).toHaveBeenCalledWith({ to: "/basho" });
  });

  it("navToSchedule navigates to /basho/schedule", () => {
    mockHooks();
    const { result } = renderHook(() => useCalendarActions());
    act(() => result.current.navToSchedule());
    expect(navigateMock).toHaveBeenCalledWith({ to: "/basho/schedule" });
  });

  it("navToBasho navigates to /basho", () => {
    mockHooks();
    const { result } = renderHook(() => useCalendarActions());
    act(() => result.current.navToBasho());
    expect(navigateMock).toHaveBeenCalledWith({ to: "/basho" });
  });
});
