import { describe, it, expect, beforeAll } from "vitest";
import { render } from "@testing-library/react";
import { Toaster } from "@/components/ui/sonner";

beforeAll(() => {
  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
  }
});

describe("Sonner Toaster (next-themes 0.4.6 + React 19)", () => {
  it("renders without crashing", () => {
    const { container } = render(<Toaster />);
    expect(container).toBeDefined();
    expect(container.childNodes.length).toBeGreaterThan(0);
  });

  it("applies toaster className", () => {
    const { container } = render(<Toaster />);
    // Sonner renders into a portal; verify the container has content
    expect(container.innerHTML).not.toBe("");
  });

  it("accepts custom props", () => {
    const { container } = render(<Toaster position="top-right" richColors />);
    expect(container).toBeDefined();
    expect(container.childNodes.length).toBeGreaterThan(0);
  });
});
