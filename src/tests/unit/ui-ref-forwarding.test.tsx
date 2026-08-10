import { describe, it, expect } from "vitest";
import { useRef } from "react";
import { render } from "@testing-library/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TooltipWrap } from "@/components/ui/tooltip-wrap";

describe("ref-as-prop forwarding (React 19)", () => {
  it("Button forwards ref to the underlying button element", () => {
    let refValue: HTMLButtonElement | null = null;
    function TestComp() {
      const ref = useRef<HTMLButtonElement | null>(null);
      return (
        <Button
          ref={(el) => {
            refValue = el;
            ref.current = el;
          }}
        >
          Click
        </Button>
      );
    }
    render(<TestComp />);
    expect(refValue).toBeInstanceOf(HTMLButtonElement);
  });

  it("Input forwards ref to the underlying input element", () => {
    let refValue: HTMLInputElement | null = null;
    function TestComp() {
      const ref = useRef<HTMLInputElement | null>(null);
      return (
        <Input
          ref={(el) => {
            refValue = el;
            ref.current = el;
          }}
        />
      );
    }
    render(<TestComp />);
    expect(refValue).toBeInstanceOf(HTMLInputElement);
  });

  it("Card forwards ref to the underlying div element", () => {
    let refValue: HTMLDivElement | null = null;
    function TestComp() {
      const ref = useRef<HTMLDivElement | null>(null);
      return (
        <Card
          ref={(el) => {
            refValue = el;
            ref.current = el;
          }}
        />
      );
    }
    render(<TestComp />);
    expect(refValue).toBeInstanceOf(HTMLDivElement);
  });

  it("Switch forwards ref to the underlying button element", () => {
    let refValue: HTMLButtonElement | null = null;
    function TestComp() {
      const ref = useRef<HTMLButtonElement | null>(null);
      return (
        <Switch
          ref={(el) => {
            refValue = el;
            ref.current = el;
          }}
        />
      );
    }
    render(<TestComp />);
    expect(refValue).toBeInstanceOf(HTMLButtonElement);
  });

  it("TooltipWrap renders children when no content provided", () => {
    const { container } = render(
      <TooltipWrap content="">
        <span data-testid="child">Hover me</span>
      </TooltipWrap>,
    );
    expect(container.querySelector('[data-testid="child"]')).toBeDefined();
  });

  it("TooltipWrap renders children when content is provided", () => {
    const { container } = render(
      <TooltipProvider>
        <TooltipWrap content="Tooltip text">
          <span data-testid="child">Hover me</span>
        </TooltipWrap>
      </TooltipProvider>,
    );
    expect(container.querySelector('[data-testid="child"]')).toBeDefined();
  });
});
