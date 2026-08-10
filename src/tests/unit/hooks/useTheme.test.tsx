import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTheme, ThemeContext, type ThemeProviderState } from "@/hooks/useTheme";

describe("useTheme hook", () => {
  it("returns default dark theme without provider", () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("dark");
    expect(result.current.resolvedTheme).toBe("dark");
  });

  it("returns provided value when inside ThemeContext.Provider", () => {
    const mockValue: ThemeProviderState = {
      theme: "light",
      setTheme: () => {},
      resolvedTheme: "light",
    };
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => (
        <ThemeContext.Provider value={mockValue}>{children}</ThemeContext.Provider>
      ),
    });
    expect(result.current.theme).toBe("light");
    expect(result.current.resolvedTheme).toBe("light");
  });

  it("allows setTheme to be called", () => {
    let currentTheme: string = "dark";
    const setTheme = (t: "dark" | "light" | "system") => {
      currentTheme = t;
    };
    const mockValue: ThemeProviderState = {
      theme: "dark",
      setTheme,
      resolvedTheme: "dark",
    };
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => (
        <ThemeContext.Provider value={mockValue}>{children}</ThemeContext.Provider>
      ),
    });
    act(() => {
      result.current.setTheme("light");
    });
    expect(currentTheme).toBe("light");
  });
});
