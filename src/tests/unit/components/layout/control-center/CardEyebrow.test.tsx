import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Trophy } from "lucide-react";
import { CardEyebrow } from "@/components/layout/control-center/CardEyebrow";

describe("CardEyebrow", () => {
  it("renders eyebrow text", () => {
    render(<CardEyebrow eyebrow="Eyebrow Text" title="Title" />);
    expect(screen.getByText("Eyebrow Text")).toBeTruthy();
  });

  it("renders title as h3", () => {
    const { container } = render(<CardEyebrow eyebrow="Eyebrow" title="Card Title" />);
    const h3 = container.querySelector("h3");
    expect(h3).toBeTruthy();
    expect(screen.getByText("Card Title")).toBeTruthy();
  });

  it("renders icon when provided", () => {
    const { container } = render(<CardEyebrow eyebrow="Eyebrow" title="Title" icon={Trophy} />);
    expect(container.querySelector("svg.lucide-trophy")).toBeTruthy();
  });

  it("does not render icon when absent", () => {
    const { container } = render(<CardEyebrow eyebrow="Eyebrow" title="Title" />);
    expect(container.querySelector("svg")).toBeNull();
  });

  it("renders actions slot when provided", () => {
    render(
      <CardEyebrow
        eyebrow="Eyebrow"
        title="Title"
        actions={<button data-testid="action-btn">Action</button>}
      />
    );
    expect(screen.getByTestId("action-btn")).toBeTruthy();
  });

  it("does not render actions slot when absent", () => {
    const { container } = render(<CardEyebrow eyebrow="Eyebrow" title="Title" />);
    expect(container.querySelector(".shrink-0")).toBeNull();
  });

  it("icon and title are siblings in a flex container", () => {
    const { container } = render(<CardEyebrow eyebrow="Eyebrow" title="Title" icon={Trophy} />);
    const flexContainer = container.querySelector(".flex.items-center.gap-2");
    expect(flexContainer).toBeTruthy();
    expect(flexContainer!.querySelector("svg")).toBeTruthy();
    expect(flexContainer!.querySelector("h3")).toBeTruthy();
  });
});
