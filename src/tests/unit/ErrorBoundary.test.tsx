import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErrorBoundary } from "@/components/ErrorBoundary";

function ThrowOnRender({ message }: { message: string }): null {
  throw new Error(message);
}

describe("ErrorBoundary", () => {
  it("renders children when no error is thrown", () => {
    render(
      <ErrorBoundary>
        <div data-testid="child">Hello</div>
      </ErrorBoundary>
    );
    expect(screen.getByTestId("child")).toBeDefined();
  });

  it("catches a thrown error and renders fallback UI", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <ThrowOnRender message="kaboom" />
      </ErrorBoundary>
    );
    expect(screen.getByText("Something went wrong")).toBeDefined();
    expect(screen.getByText(/kaboom/)).toBeDefined();
    spy.mockRestore();
  });

  it("provides a reload button", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <ThrowOnRender message="fail" />
      </ErrorBoundary>
    );
    const btn = screen.getByRole("button", { name: /Reload Page/i });
    expect(btn).toBeDefined();
    spy.mockRestore();
  });
});
