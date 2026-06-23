/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SectionHeader } from "@/components/layout/control-center/SectionHeader";

describe("SectionHeader", () => {
  it("renders title as h2", () => {
    const { container } = render(<SectionHeader title="Test Title" />);
    const h2 = container.querySelector("h2");
    expect(h2).toBeTruthy();
    expect(screen.getByText("Test Title")).toBeTruthy();
  });

  it("renders eyebrow when provided", () => {
    render(<SectionHeader title="Title" eyebrow="Section Eyebrow" />);
    expect(screen.getByText("Section Eyebrow")).toBeTruthy();
  });

  it("does not render eyebrow element when absent", () => {
    const { container } = render(<SectionHeader title="Title" />);
    expect(container.querySelector(".stat-label")).toBeNull();
  });

  it("renders lede when provided", () => {
    render(<SectionHeader title="Title" lede="A short description" />);
    expect(screen.getByText("A short description")).toBeTruthy();
  });

  it("does not render lede element when absent", () => {
    render(<SectionHeader title="Title" />);
    expect(screen.queryByText("A short description")).toBeNull();
  });

  it("renders actions slot when provided", () => {
    render(
      <SectionHeader
        title="Title"
        actions={<button data-testid="action-btn">Click</button>}
      />
    );
    expect(screen.getByTestId("action-btn")).toBeTruthy();
  });

  it("does not render actions slot when absent", () => {
    const { container } = render(<SectionHeader title="Title" />);
    expect(container.querySelector(".shrink-0")).toBeNull();
  });

  it("merges custom className onto container", () => {
    const { container } = render(<SectionHeader title="Title" className="custom-class" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.classList.contains("custom-class")).toBe(true);
  });

  it("container has border-b class", () => {
    const { container } = render(<SectionHeader title="Title" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.classList.contains("border-b")).toBe(true);
  });
});
