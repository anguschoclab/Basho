import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Trophy } from "lucide-react";
import { ListCard, type ListRow } from "@/components/layout/control-center/ListCard";

// Mock CardEyebrow to isolate ListCard logic
vi.mock("@/components/layout/control-center/CardEyebrow", () => ({
  CardEyebrow: ({ eyebrow, title, icon, actions }: any) => (
    <div
      data-testid="card-eyebrow"
      data-eyebrow={eyebrow}
      data-title={title}
      data-has-icon={!!icon}
      data-has-actions={!!actions}
    />
  ),
}));

const baseRows: ListRow[] = [
  { id: "r1", label: "Rikishi A", value: "10-2" },
  { id: "r2", label: "Rikishi B", value: "8-4", sub: "Injured" },
  { id: "r3", label: "Rikishi C" },
];

describe("ListCard", () => {
  it("renders CardEyebrow with eyebrow, title, icon, and actions", () => {
    render(
      <ListCard
        eyebrow="Roster"
        title="Top Rikishi"
        rows={baseRows}
        icon={Trophy}
        actions={<button data-testid="action-btn">Action</button>}
      />
    );
    const eyebrow = screen.getByTestId("card-eyebrow");
    expect(eyebrow.getAttribute("data-eyebrow")).toBe("Roster");
    expect(eyebrow.getAttribute("data-title")).toBe("Top Rikishi");
    expect(eyebrow.getAttribute("data-has-icon")).toBe("true");
    expect(eyebrow.getAttribute("data-has-actions")).toBe("true");
  });

  it("renders all row labels", () => {
    render(<ListCard eyebrow="E" title="T" rows={baseRows} />);
    expect(screen.getByText("Rikishi A")).toBeTruthy();
    expect(screen.getByText("Rikishi B")).toBeTruthy();
    expect(screen.getByText("Rikishi C")).toBeTruthy();
  });

  it("renders row values when provided", () => {
    render(<ListCard eyebrow="E" title="T" rows={baseRows} />);
    expect(screen.getByText("10-2")).toBeTruthy();
    expect(screen.getByText("8-4")).toBeTruthy();
  });

  it("does not render value slot when value is undefined", () => {
    const rows: ListRow[] = [{ id: "r1", label: "No Value" }];
    const { container } = render(<ListCard eyebrow="E" title="T" rows={rows} />);
    expect(container.querySelector(".font-mono.font-bold")).toBeNull();
  });

  it("renders sub text when provided", () => {
    render(<ListCard eyebrow="E" title="T" rows={baseRows} />);
    expect(screen.getByText("Injured")).toBeTruthy();
  });

  it("renders leading slot when provided", () => {
    const rows: ListRow[] = [
      { id: "r1", label: "Test", leading: <span data-testid="leading-slot">L</span> },
    ];
    render(<ListCard eyebrow="E" title="T" rows={rows} />);
    expect(screen.getByTestId("leading-slot")).toBeTruthy();
  });

  it("renders trailing slot when provided", () => {
    const rows: ListRow[] = [
      { id: "r1", label: "Test", trailing: <span data-testid="trailing-slot">T</span> },
    ];
    render(<ListCard eyebrow="E" title="T" rows={rows} />);
    expect(screen.getByTestId("trailing-slot")).toBeTruthy();
  });

  it("calls onClick handler when row is clicked", () => {
    const onClick = vi.fn();
    const rows: ListRow[] = [{ id: "r1", label: "Clickable", onClick }];
    render(<ListCard eyebrow="E" title="T" rows={rows} />);
    const row = screen.getByText("Clickable").closest("div")!;
    fireEvent.click(row);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("adds cursor-pointer class when row has onClick", () => {
    const rows: ListRow[] = [{ id: "r1", label: "Clickable", onClick: vi.fn() }];
    const { container } = render(<ListCard eyebrow="E" title="T" rows={rows} />);
    const row = container.querySelector(".flex.items-center.gap-2") as HTMLElement;
    expect(row.classList.contains("cursor-pointer")).toBe(true);
  });

  it("does not add cursor-pointer class when row has no onClick", () => {
    const rows: ListRow[] = [{ id: "r1", label: "Not Clickable" }];
    const { container } = render(<ListCard eyebrow="E" title="T" rows={rows} />);
    const row = container.querySelector(".flex.items-center.gap-2") as HTMLElement;
    expect(row.classList.contains("cursor-pointer")).toBe(false);
  });

  it("renders default emptyText when rows is empty", () => {
    render(<ListCard eyebrow="E" title="T" rows={[]} />);
    expect(screen.getByText("No data.")).toBeTruthy();
  });

  it("renders custom emptyText when rows is empty", () => {
    render(<ListCard eyebrow="E" title="T" rows={[]} emptyText="Nothing to show" />);
    expect(screen.getByText("Nothing to show")).toBeTruthy();
  });

  it("slices rows to maxRows count", () => {
    render(<ListCard eyebrow="E" title="T" rows={baseRows} maxRows={2} />);
    expect(screen.getByText("Rikishi A")).toBeTruthy();
    expect(screen.getByText("Rikishi B")).toBeTruthy();
    expect(screen.queryByText("Rikishi C")).toBeNull();
  });

  it("renders all rows when maxRows is not specified", () => {
    render(<ListCard eyebrow="E" title="T" rows={baseRows} />);
    expect(screen.getByText("Rikishi A")).toBeTruthy();
    expect(screen.getByText("Rikishi B")).toBeTruthy();
    expect(screen.getByText("Rikishi C")).toBeTruthy();
  });

  it.each([
    ["default", "text-foreground"],
    ["gold", "text-gold"],
    ["success", "text-success"],
    ["warning", "text-warning"],
    ["destructive", "text-destructive"],
    ["east", "text-east"],
    ["west", "text-west"],
  ] as const)("applies ROW_VALUE_TONE class for tone=%s", (tone, expectedClass) => {
    const rows: ListRow[] = [{ id: "r1", label: "Test", value: "1", tone }];
    const { container } = render(<ListCard eyebrow="E" title="T" rows={rows} />);
    const valueEl = container.querySelector(".font-mono.font-bold") as HTMLElement;
    expect(valueEl.classList.contains(expectedClass)).toBe(true);
  });

  it("merges custom className onto card container", () => {
    const { container } = render(
      <ListCard eyebrow="E" title="T" rows={baseRows} className="custom-card" />
    );
    const card = container.firstChild as HTMLElement;
    expect(card.classList.contains("custom-card")).toBe(true);
  });
});
