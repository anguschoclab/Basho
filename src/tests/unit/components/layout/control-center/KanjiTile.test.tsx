/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { KanjiTile } from "@/components/layout/control-center/KanjiTile";

describe("KanjiTile", () => {
  it("renders char text", () => {
    render(<KanjiTile char="横" />);
    expect(screen.getByText("横")).toBeTruthy();
  });

  it("has aria-hidden set to true", () => {
    const { container } = render(<KanjiTile char="横" />);
    const span = container.querySelector("span");
    expect(span?.getAttribute("aria-hidden")).toBe("true");
  });

  it("applies gold tone classes by default", () => {
    const { container } = render(<KanjiTile char="横" />);
    const span = container.querySelector("span") as HTMLElement;
    expect(span.classList.contains("text-gold")).toBe(true);
    expect(span.classList.contains("rank-shimmer")).toBe(true);
  });

  it("applies vermillion tone classes", () => {
    const { container } = render(<KanjiTile char="横" tone="vermillion" />);
    const span = container.querySelector("span") as HTMLElement;
    expect(span.classList.contains("text-east")).toBe(true);
  });

  it("applies indigo tone classes", () => {
    const { container } = render(<KanjiTile char="横" tone="indigo" />);
    const span = container.querySelector("span") as HTMLElement;
    expect(span.classList.contains("text-west")).toBe(true);
  });

  it("defaults tone to gold", () => {
    const { container } = render(<KanjiTile char="横" />);
    const span = container.querySelector("span") as HTMLElement;
    expect(span.classList.contains("text-gold")).toBe(true);
  });

  it("applies sm size class", () => {
    const { container } = render(<KanjiTile char="横" size="sm" />);
    const span = container.querySelector("span") as HTMLElement;
    expect(span.classList.contains("text-5xl")).toBe(true);
  });

  it("applies md size class by default", () => {
    const { container } = render(<KanjiTile char="横" />);
    const span = container.querySelector("span") as HTMLElement;
    expect(span.classList.contains("text-7xl")).toBe(true);
  });

  it("applies lg size class", () => {
    const { container } = render(<KanjiTile char="横" size="lg" />);
    const span = container.querySelector("span") as HTMLElement;
    expect(span.classList.contains("text-9xl")).toBe(true);
  });

  it("merges custom className", () => {
    const { container } = render(<KanjiTile char="横" className="custom-class" />);
    const span = container.querySelector("span") as HTMLElement;
    expect(span.classList.contains("custom-class")).toBe(true);
  });

  it("has select-none and pointer-events-none classes", () => {
    const { container } = render(<KanjiTile char="横" />);
    const span = container.querySelector("span") as HTMLElement;
    expect(span.classList.contains("select-none")).toBe(true);
    expect(span.classList.contains("pointer-events-none")).toBe(true);
  });
});
