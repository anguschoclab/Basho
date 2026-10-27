import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MainContentPane } from "@/components/layout/MainContentPane";

// Mock SubNavTabs to isolate MainContentPane logic
vi.mock("@/components/layout/SubNavTabs", () => ({
  SubNavTabs: ({ tabs, activeTab }: { tabs: any[]; activeTab?: string }) => (
    <div data-testid="subnav-mock" data-tab-count={tabs.length} data-active-tab={activeTab ?? ""}>
      SubNav
    </div>
  ),
}));

const sampleTabs = [
  { id: "roster", label: "Roster", href: "/stable/roster" },
  { id: "training", label: "Training", href: "/stable/training" },
];

describe("MainContentPane", () => {
  it("renders main element with id='main-content'", () => {
    const { container } = render(<MainContentPane>Content</MainContentPane>);
    const main = container.querySelector("main#main-content");
    expect(main).toBeTruthy();
  });

  it("renders children inside content area", () => {
    render(
      <MainContentPane>
        <div data-testid="child-content">Hello</div>
      </MainContentPane>
    );
    expect(screen.getByTestId("child-content")).toBeTruthy();
  });

  it("renders h1 with pageTitle when no subNavTabs", () => {
    const { container } = render(<MainContentPane pageTitle="Dashboard">Content</MainContentPane>);
    const h1 = container.querySelector("h1");
    expect(h1).toBeTruthy();
    expect(screen.getByText("Dashboard")).toBeTruthy();
  });

  it("does not render h1 when pageTitle is absent and no subNavTabs", () => {
    const { container } = render(<MainContentPane>Content</MainContentPane>);
    expect(container.querySelector("h1")).toBeNull();
  });

  it("renders sticky header with SubNavTabs when subNavTabs is provided", () => {
    render(<MainContentPane subNavTabs={sampleTabs}>Content</MainContentPane>);
    expect(screen.getByTestId("subnav-mock")).toBeTruthy();
  });

  it("passes tabs and activeTab to SubNavTabs", () => {
    render(
      <MainContentPane subNavTabs={sampleTabs} activeSubTab="roster">
        Content
      </MainContentPane>
    );
    const subnav = screen.getByTestId("subnav-mock");
    expect(subnav.getAttribute("data-tab-count")).toBe("2");
    expect(subnav.getAttribute("data-active-tab")).toBe("roster");
  });

  it("renders pageTitle as small span (not h1) when subNavTabs is provided", () => {
    const { container } = render(
      <MainContentPane pageTitle="Stable" subNavTabs={sampleTabs}>
        Content
      </MainContentPane>
    );
    expect(container.querySelector("h1")).toBeNull();
    expect(screen.getByText("Stable")).toBeTruthy();
  });

  it("does not render sticky header when subNavTabs is absent", () => {
    const { container } = render(<MainContentPane>Content</MainContentPane>);
    expect(container.querySelector(".sticky")).toBeNull();
  });
});
