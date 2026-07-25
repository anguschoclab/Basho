import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("@/store/gameStore", () => ({
  useGameStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      sendCommand: vi.fn(),
      initWorker: vi.fn(),
      setOnWorldUpdated: vi.fn(),
    }),
}));

import {
  useBashoActions,
  useTimeActions,
  useTutorialActions,
  useRosterActions,
  useBookmarkActions,
  useSaveActions,
  useEconomyActions,
} from "@/contexts/domainHooks";
import { GameProvider } from "@/contexts/GameContext";

function wrapper({ children }: { children: ReactNode }) {
  return <GameProvider>{children}</GameProvider>;
}

describe("domain hooks", () => {
  it("useBashoActions returns expected actions", () => {
    const { result } = renderHook(() => useBashoActions(), { wrapper });
    expect(result.current.startBasho).toBeTypeOf("function");
    expect(result.current.advanceDay).toBeTypeOf("function");
    expect(result.current.simulateBout).toBeTypeOf("function");
    expect(result.current.setBoutTactic).toBeTypeOf("function");
    expect(result.current.simulateAllBouts).toBeTypeOf("function");
    expect(result.current.endDay).toBeTypeOf("function");
    expect(result.current.endBasho).toBeTypeOf("function");
    expect(result.current.simFullBasho).toBeTypeOf("function");
  });

  it("useTimeActions returns expected actions", () => {
    const { result } = renderHook(() => useTimeActions(), { wrapper });
    expect(result.current.advanceInterim).toBeTypeOf("function");
    expect(result.current.advanceOneDay).toBeTypeOf("function");
    expect(result.current.tickMultipleDays).toBeTypeOf("function");
  });

  it("useTutorialActions returns expected actions", () => {
    const { result } = renderHook(() => useTutorialActions(), { wrapper });
    expect(result.current.advanceTutorialStep).toBeTypeOf("function");
    expect(result.current.setTutorialFlag).toBeTypeOf("function");
    expect(result.current.completeTutorial).toBeTypeOf("function");
  });

  it("useRosterActions returns expected actions", () => {
    const { result } = renderHook(() => useRosterActions(), { wrapper });
    expect(result.current.assignMentor).toBeTypeOf("function");
    expect(result.current.removeMentor).toBeTypeOf("function");
    expect(result.current.addSparringPair).toBeTypeOf("function");
    expect(result.current.removeSparringPair).toBeTypeOf("function");
  });

  it("useBookmarkActions returns expected actions", () => {
    const { result } = renderHook(() => useBookmarkActions(), { wrapper });
    expect(result.current.bookmarkEntity).toBeTypeOf("function");
    expect(result.current.unbookmarkEntity).toBeTypeOf("function");
    expect(result.current.updateBookmarkNote).toBeTypeOf("function");
    expect(result.current.isBookmarked).toBeTypeOf("function");
  });

  it("useSaveActions returns expected actions", () => {
    const { result } = renderHook(() => useSaveActions(), { wrapper });
    expect(result.current.saveToSlot).toBeTypeOf("function");
    expect(result.current.loadFromSlot).toBeTypeOf("function");
    expect(result.current.quickSave).toBeTypeOf("function");
    expect(result.current.loadFromAutosave).toBeTypeOf("function");
    expect(result.current.hasAutosave).toBeTypeOf("function");
    expect(result.current.getSaveSlots).toBeTypeOf("function");
  });

  it("useEconomyActions returns expected actions", () => {
    const { result } = renderHook(() => useEconomyActions(), { wrapper });
    expect(result.current.recruitSponsor).toBeTypeOf("function");
    expect(result.current.buildInfrastructure).toBeTypeOf("function");
  });

  it("calling useBashoActions outside GameProvider throws", () => {
    expect(() => renderHook(() => useBashoActions())).toThrow();
  });
});
