import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import {
  useSidebar,
  SidebarContext,
  type SidebarContextValue,
} from "@/components/ui/sidebar/context";

describe("useSidebar hook", () => {
  it("throws when used outside SidebarProvider", () => {
    expect(() => renderHook(() => useSidebar())).toThrow(
      "useSidebar must be used within a SidebarProvider."
    );
  });

  it("returns context value when inside SidebarContext.Provider", () => {
    const mockValue: SidebarContextValue = {
      state: "expanded",
      open: true,
      setOpen: () => {},
      openMobile: false,
      setOpenMobile: () => {},
      isMobile: false,
      toggleSidebar: () => {},
    };
    const { result } = renderHook(() => useSidebar(), {
      wrapper: ({ children }) => (
        <SidebarContext.Provider value={mockValue}>{children}</SidebarContext.Provider>
      ),
    });
    expect(result.current.state).toBe("expanded");
    expect(result.current.open).toBe(true);
    expect(result.current.isMobile).toBe(false);
  });
});
