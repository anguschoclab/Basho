import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageHeader } from "@/components/layout/control-center/PageHeader";

describe("PageHeader", () => {
  it("renders a header element", () => {
    const { container } = render(<PageHeader eyebrow="Eyebrow" title="Title" />);
    expect(container.querySelector("header")).toBeTruthy();
  });

  it("renders eyebrow with text-gold class", () => {
    const { container } = render(<PageHeader eyebrow="Eyebrow" title="Title" />);
    const eyebrow = container.querySelector(".text-gold");
    expect(eyebrow).toBeTruthy();
    expect(screen.getByText("Eyebrow")).toBeTruthy();
  });

  it("renders title as h1 with sumi-e-ink class", () => {
    const { container } = render(<PageHeader eyebrow="Eyebrow" title="Page Title" />);
    const h1 = container.querySelector("h1");
    expect(h1).toBeTruthy();
    expect(h1!.classList.contains("sumi-e-ink")).toBe(true);
    expect(screen.getByText("Page Title")).toBeTruthy();
  });

  it("renders lede when provided", () => {
    render(<PageHeader eyebrow="Eyebrow" title="Title" lede="A description" />);
    expect(screen.getByText("A description")).toBeTruthy();
  });

  it("does not render lede when absent", () => {
    render(<PageHeader eyebrow="Eyebrow" title="Title" />);
    expect(screen.queryByText("A description")).toBeNull();
  });

  it("renders actions slot when provided", () => {
    render(
      <PageHeader
        eyebrow="Eyebrow"
        title="Title"
        actions={<button data-testid="action-btn">Action</button>}
      />
    );
    expect(screen.getByTestId("action-btn")).toBeTruthy();
  });

  it("does not render actions slot when absent", () => {
    const { container } = render(<PageHeader eyebrow="Eyebrow" title="Title" />);
    expect(container.querySelector(".shrink-0")).toBeNull();
  });

  it("merges custom className onto header", () => {
    const { container } = render(
      <PageHeader eyebrow="Eyebrow" title="Title" className="custom-class" />
    );
    const header = container.querySelector("header") as HTMLElement;
    expect(header.classList.contains("custom-class")).toBe(true);
  });

  it("header has border-b class", () => {
    const { container } = render(<PageHeader eyebrow="Eyebrow" title="Title" />);
    const header = container.querySelector("header") as HTMLElement;
    expect(header.classList.contains("border-b")).toBe(true);
  });
});
