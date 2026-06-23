/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RankBadge } from "@/components/layout/control-center/RankBadge";

describe("RankBadge (control-center)", () => {
  it.each([
    ["yokozuna", "rank-yokozuna"],
    ["ozeki", "rank-ozeki"],
    ["sekiwake", "rank-sekiwake"],
    ["komusubi", "rank-komusubi"],
    ["maegashira", "rank-maegashira"],
    ["juryo", "rank-juryo"],
    ["makushita", "rank-makushita"],
    ["sandanme", "rank-sandanme"],
    ["jonidan", "rank-jonidan"],
    ["jonokuchi", "rank-jonokuchi"],
  ])("maps rank '%s' to class '%s'", (rank, expectedClass) => {
    const { container } = render(<RankBadge rank={rank} />);
    const span = container.querySelector("span") as HTMLElement;
    expect(span.classList.contains(expectedClass)).toBe(true);
  });

  it("falls back to rank-makushita for unknown rank", () => {
    const { container } = render(<RankBadge rank="unknown" />);
    const span = container.querySelector("span") as HTMLElement;
    expect(span.classList.contains("rank-makushita")).toBe(true);
  });

  it("handles maegashira with startsWith check (e.g. 'maegashira-1')", () => {
    const { container } = render(<RankBadge rank="maegashira-1" />);
    const span = container.querySelector("span") as HTMLElement;
    expect(span.classList.contains("rank-maegashira")).toBe(true);
  });

  it("is case-insensitive for rank class mapping", () => {
    const { container } = render(<RankBadge rank="Yokozuna" />);
    const span = container.querySelector("span") as HTMLElement;
    expect(span.classList.contains("rank-yokozuna")).toBe(true);
  });

  it("renders label as rank only when no rankNumber", () => {
    render(<RankBadge rank="yokozuna" />);
    expect(screen.getByText("yokozuna")).toBeTruthy();
  });

  it("renders label as 'rank rankNumber' when rankNumber > 0", () => {
    render(<RankBadge rank="maegashira" rankNumber={5} />);
    expect(screen.getByText("maegashira 5")).toBeTruthy();
  });

  it("renders label with E suffix when side=east and rankNumber > 0", () => {
    render(<RankBadge rank="maegashira" rankNumber={3} side="east" />);
    expect(screen.getByText("maegashira 3E")).toBeTruthy();
  });

  it("renders label with W suffix when side=west and rankNumber > 0", () => {
    render(<RankBadge rank="maegashira" rankNumber={3} side="west" />);
    expect(screen.getByText("maegashira 3W")).toBeTruthy();
  });

  it("renders label as rank only when rankNumber = 0", () => {
    render(<RankBadge rank="ozeki" rankNumber={0} />);
    expect(screen.getByText("ozeki")).toBeTruthy();
  });

  it("renders label as rank only when rankNumber is undefined", () => {
    render(<RankBadge rank="ozeki" />);
    expect(screen.getByText("ozeki")).toBeTruthy();
  });

  it("merges custom className", () => {
    const { container } = render(<RankBadge rank="yokozuna" className="custom-class" />);
    const span = container.querySelector("span") as HTMLElement;
    expect(span.classList.contains("custom-class")).toBe(true);
  });
});
