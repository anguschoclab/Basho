import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SubNavTabs, type SubNavTab } from "@/components/layout/SubNavTabs";

// Mock TanStack Router hooks
const mockNavigate = vi.fn();
const mockLocation = { pathname: "/" };
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
}));

// Mock TooltipWrap as pass-through to avoid Radix portal complexity
vi.mock("@/components/ui/tooltip-wrap", () => ({
  TooltipWrap: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const sampleTabs: SubNavTab[] = [
  { id: "roster", label: "Roster", href: "/stable/roster" },
  { id: "training", label: "Training", href: "/stable/training" },
  { id: "overview", label: "Overview" },
];

describe("SubNavTabs", () => {
  it("renders all tab labels", () => {
    render(<SubNavTabs tabs={sampleTabs} />);
    expect(screen.getByText("Roster")).toBeTruthy();
    expect(screen.getByText("Training")).toBeTruthy();
    expect(screen.getByText("Overview")).toBeTruthy();
  });

  it("marks active tab via activeTab prop with aria-current='page'", () => {
    render(<SubNavTabs tabs={sampleTabs} activeTab="training" />);
    const trainingBtn = screen.getByText("Training").closest("button");
    expect(trainingBtn?.getAttribute("aria-current")).toBe("page");
  });

  it("marks active tab via href matching location.pathname", () => {
    mockLocation.pathname = "/stable/roster";
    render(<SubNavTabs tabs={sampleTabs} />);
    const rosterBtn = screen.getByText("Roster").closest("button");
    expect(rosterBtn?.getAttribute("aria-current")).toBe("page");
  });

  it("does not mark inactive tabs with aria-current", () => {
    render(<SubNavTabs tabs={sampleTabs} activeTab="roster" />);
    const trainingBtn = screen.getByText("Training").closest("button");
    expect(trainingBtn?.getAttribute("aria-current")).toBeNull();
  });

  it("calls navigate when clicking a tab with href", () => {
    render(<SubNavTabs tabs={sampleTabs} />);
    const rosterBtn = screen.getByText("Roster").closest("button")!;
    fireEvent.click(rosterBtn);
    expect(mockNavigate).toHaveBeenCalledWith({ to: "/stable/roster" });
  });

  it("calls onTabChange when clicking a tab without href", () => {
    const onTabChange = vi.fn();
    render(<SubNavTabs tabs={sampleTabs} onTabChange={onTabChange} />);
    const overviewBtn = screen.getByText("Overview").closest("button")!;
    fireEvent.click(overviewBtn);
    expect(onTabChange).toHaveBeenCalledWith("overview");
  });

  it("renders pageTitle as h1 with uppercase text", () => {
    render(<SubNavTabs tabs={sampleTabs} pageTitle="Stable" />);
    const h1 = screen.getByText("Stable");
    expect(h1.tagName).toBe("H1");
  });

  it("does not render h1 when pageTitle is absent", () => {
    const { container } = render(<SubNavTabs tabs={sampleTabs} />);
    expect(container.querySelector("h1")).toBeNull();
  });

  it("active tab has gold underline element", () => {
    render(<SubNavTabs tabs={sampleTabs} activeTab="roster" />);
    const rosterBtn = screen.getByText("Roster").closest("button")!;
    const underline = rosterBtn.querySelector(".h-\\[2px\\]");
    expect(underline).toBeTruthy();
  });

  it("merges custom className onto container div", () => {
    const { container } = render(<SubNavTabs tabs={sampleTabs} className="custom-class" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.classList.contains("custom-class")).toBe(true);
  });
});
