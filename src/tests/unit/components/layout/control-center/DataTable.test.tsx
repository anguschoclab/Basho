/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DataTable, type DataColumn } from "@/components/layout/control-center/DataTable";

interface TestRow {
  id: string;
  name: string;
  score: number;
}

const sampleRows: TestRow[] = [
  { id: "r1", name: "Alice", score: 90 },
  { id: "r2", name: "Bob", score: 85 },
];

const sampleColumns: DataColumn<TestRow>[] = [
  { key: "name", header: "Name" },
  { key: "score", header: "Score", align: "right" },
];

describe("DataTable", () => {
  it("renders column headers", () => {
    render(<DataTable columns={sampleColumns} rows={sampleRows} />);
    expect(screen.getByText("Name")).toBeTruthy();
    expect(screen.getByText("Score")).toBeTruthy();
  });

  it("renders cell values via default key access", () => {
    render(<DataTable columns={sampleColumns} rows={sampleRows} />);
    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.getByText("90")).toBeTruthy();
  });

  it("renders cell values via render function", () => {
    const columns: DataColumn<TestRow>[] = [
      { key: "name", header: "Name", render: (row) => <span data-testid="custom-{row.id}">{row.name.toUpperCase()}</span> },
    ];
    render(<DataTable columns={columns} rows={sampleRows} />);
    expect(screen.getByText("ALICE")).toBeTruthy();
    expect(screen.getByText("BOB")).toBeTruthy();
  });

  it("render function overrides default key access", () => {
    const columns: DataColumn<TestRow>[] = [
      { key: "name", header: "Name", render: () => "RENDERED" },
    ];
    render(<DataTable columns={columns} rows={sampleRows} />);
    expect(screen.getAllByText("RENDERED")).toHaveLength(2);
    expect(screen.queryByText("Alice")).toBeNull();
  });

  it("renders em dash for missing key value", () => {
    const columns: DataColumn<TestRow>[] = [
      { key: "missing", header: "Missing" },
    ];
    render(<DataTable columns={columns} rows={sampleRows} />);
    expect(screen.getAllByText("—")).toHaveLength(2);
  });

  it.each([
    ["left", "text-left"],
    ["right", "text-right"],
    ["center", "text-center"],
  ] as const)("applies align class for align=%s", (align, expectedClass) => {
    const columns: DataColumn<TestRow>[] = [
      { key: "name", header: "Name", align },
    ];
    const { container } = render(<DataTable columns={columns} rows={sampleRows} />);
    const th = container.querySelector("th") as HTMLElement;
    expect(th.classList.contains(expectedClass)).toBe(true);
  });

  it("defaults align to left", () => {
    const columns: DataColumn<TestRow>[] = [
      { key: "name", header: "Name" },
    ];
    const { container } = render(<DataTable columns={columns} rows={sampleRows} />);
    const th = container.querySelector("th") as HTMLElement;
    expect(th.classList.contains("text-left")).toBe(true);
  });

  it("renders empty text when rows is empty", () => {
    render(<DataTable columns={sampleColumns} rows={[]} />);
    expect(screen.getByText("No records.")).toBeTruthy();
  });

  it("renders custom emptyText when rows is empty", () => {
    render(<DataTable columns={sampleColumns} rows={[]} emptyText="Nothing here" />);
    expect(screen.getByText("Nothing here")).toBeTruthy();
  });

  it("empty row td has correct colSpan", () => {
    const { container } = render(<DataTable columns={sampleColumns} rows={[]} />);
    const td = container.querySelector("tbody td") as HTMLElement;
    expect(td.getAttribute("colSpan")).toBe(String(sampleColumns.length));
  });

  it("calls onRowClick with row when row is clicked", () => {
    const onRowClick = vi.fn();
    const { container } = render(
      <DataTable columns={sampleColumns} rows={sampleRows} onRowClick={onRowClick} />
    );
    const firstRow = container.querySelector("tbody tr") as HTMLElement;
    fireEvent.click(firstRow);
    expect(onRowClick).toHaveBeenCalledWith(sampleRows[0]);
  });

  it("adds cursor-pointer class when onRowClick is provided", () => {
    const { container } = render(
      <DataTable columns={sampleColumns} rows={sampleRows} onRowClick={vi.fn()} />
    );
    const firstRow = container.querySelector("tbody tr") as HTMLElement;
    expect(firstRow.classList.contains("cursor-pointer")).toBe(true);
  });

  it("does not add cursor-pointer class when onRowClick is absent", () => {
    const { container } = render(<DataTable columns={sampleColumns} rows={sampleRows} />);
    const firstRow = container.querySelector("tbody tr") as HTMLElement;
    expect(firstRow.classList.contains("cursor-pointer")).toBe(false);
  });

  it("adds highlight classes when highlightRow returns true", () => {
    const { container } = render(
      <DataTable
        columns={sampleColumns}
        rows={sampleRows}
        highlightRow={(row) => row.id === "r1"}
      />
    );
    const firstRow = container.querySelectorAll("tbody tr")[0] as HTMLElement;
    expect(firstRow.classList.contains("bg-primary/5")).toBe(true);
    expect(firstRow.classList.contains("border-l-2")).toBe(true);
  });

  it("does not add highlight classes when highlightRow returns false", () => {
    const { container } = render(
      <DataTable
        columns={sampleColumns}
        rows={sampleRows}
        highlightRow={() => false}
      />
    );
    const firstRow = container.querySelectorAll("tbody tr")[0] as HTMLElement;
    expect(firstRow.classList.contains("bg-primary/5")).toBe(false);
  });

  it("does not add highlight classes when highlightRow is absent", () => {
    const { container } = render(<DataTable columns={sampleColumns} rows={sampleRows} />);
    const firstRow = container.querySelector("tbody tr") as HTMLElement;
    expect(firstRow.classList.contains("bg-primary/5")).toBe(false);
  });

  it("merges custom className onto container", () => {
    const { container } = render(
      <DataTable columns={sampleColumns} rows={sampleRows} className="custom-table" />
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.classList.contains("custom-table")).toBe(true);
  });

  it("merges column className onto th and td", () => {
    const columns: DataColumn<TestRow>[] = [
      { key: "name", header: "Name", className: "col-custom" },
    ];
    const { container } = render(<DataTable columns={columns} rows={sampleRows} />);
    const th = container.querySelector("th") as HTMLElement;
    const td = container.querySelector("td") as HTMLElement;
    expect(th.classList.contains("col-custom")).toBe(true);
    expect(td.classList.contains("col-custom")).toBe(true);
  });
});
