import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useGame } from "@/contexts/useGame";
import { GameContext } from "@/contexts/gameContextInstance";

describe("useGame hook", () => {
  it("throws when used outside GameProvider", () => {
    expect(() => renderHook(() => useGame())).toThrow("useGame must be used within a GameProvider");
  });

  it("returns context value when inside GameProvider", () => {
    const mockValue = {
      state: { world: null },
      dispatch: () => {},
      actions: {},
    } as unknown as React.ContextType<typeof GameContext>;
    const { result } = renderHook(() => useGame(), {
      wrapper: ({ children }) => (
        <GameContext.Provider value={mockValue}>{children}</GameContext.Provider>
      ),
    });
    expect(result.current).toBe(mockValue);
  });
});
