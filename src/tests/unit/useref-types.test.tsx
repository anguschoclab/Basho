import { describe, it, expect } from "vitest";
import { useRef } from "react";
import { render } from "@testing-library/react";

describe("useRef types (React 19)", () => {
  it("useRef<HTMLDivElement | null>(null) creates a ref that can be attached to a div", () => {
    function TestComp() {
      const ref = useRef<HTMLDivElement | null>(null);
      return <div ref={ref} data-testid="target" />;
    }
    const { container } = render(<TestComp />);
    expect(container.querySelector('[data-testid="target"]')).toBeDefined();
  });

  it("useRef(0) creates a mutable ref for numbers", () => {
    function TestComp() {
      const ref = useRef(0);
      ref.current += 1;
      return <span data-testid="val">{ref.current}</span>;
    }
    const { container } = render(<TestComp />);
    expect(container.querySelector('[data-testid="val"]')?.textContent).toBe("1");
  });
});
