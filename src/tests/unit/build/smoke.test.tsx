import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { GameProvider } from "@/contexts/GameContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

vi.stubGlobal("Worker", class {
  onmessage: ((e: MessageEvent) => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
});

const queryClient = new QueryClient();

function AllProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <GameProvider>{children}</GameProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

describe("App smoke test", () => {
  it("renders without crashing inside full provider tree", () => {
    const { container } = render(
      <AllProviders>
        <div data-testid="smoke">smoke</div>
      </AllProviders>
    );
    const smokeEl = container.querySelector('[data-testid="smoke"]');
    expect(smokeEl).not.toBeNull();
    expect(smokeEl?.textContent).toBe("smoke");
  });
});
