/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SideIndicator } from "@/components/layout/control-center/SideIndicator";

describe("SideIndicator", () => {
  it("applies east-accent and pl-3 classes for side=east", () => {
    const { container } = render(
      <SideIndicator side="east">
        <span>Content</span>
      </SideIndicator>
    );
    const div = container.querySelector("div") as HTMLElement;
    expect(div.classList.contains("east-accent")).toBe(true);
    expect(div.classList.contains("pl-3")).toBe(true);
  });

  it("applies west-accent and pl-3 classes for side=west", () => {
    const { container } = render(
      <SideIndicator side="west">
        <span>Content</span>
      </SideIndicator>
    );
    const div = container.querySelector("div") as HTMLElement;
    expect(div.classList.contains("west-accent")).toBe(true);
    expect(div.classList.contains("pl-3")).toBe(true);
  });

  it("does not apply east-accent, west-accent, or pl-3 for side=none", () => {
    const { container } = render(
      <SideIndicator side="none">
        <span>Content</span>
      </SideIndicator>
    );
    const div = container.querySelector("div") as HTMLElement;
    expect(div.classList.contains("east-accent")).toBe(false);
    expect(div.classList.contains("west-accent")).toBe(false);
    expect(div.classList.contains("pl-3")).toBe(false);
  });

  it("renders children content", () => {
    render(
      <SideIndicator side="east">
        <span data-testid="child">Child Content</span>
      </SideIndicator>
    );
    expect(screen.getByTestId("child")).toBeTruthy();
    expect(screen.getByText("Child Content")).toBeTruthy();
  });

  it("merges custom className onto container", () => {
    const { container } = render(
      <SideIndicator side="east" className="custom-class">
        <span>Content</span>
      </SideIndicator>
    );
    const div = container.querySelector("div") as HTMLElement;
    expect(div.classList.contains("custom-class")).toBe(true);
  });

  it("renders as a div element", () => {
    const { container } = render(
      <SideIndicator side="east">
        <span>Content</span>
      </SideIndicator>
    );
    expect(container.firstChild?.nodeName).toBe("DIV");
  });
});
