import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DataTable, type Column } from "@/components/layout/control-center/DataTable";

interface TestRow {
  id: string;
  name: string;
  age: number;
}

const data: TestRow[] = [
  { id: "1", name: "Charlie", age: 30 },
  { id: "2", name: "Alice", age: 25 },
  { id: "3", name: "Bob", age: 35 },
];

const columns: Column<TestRow>[] = [
  { key: "name", label: "Name", accessor: (r) => r.name, sortable: true },
  { key: "age", label: "Age", accessor: (r) => r.age, sortable: true },
  { key: "id", label: "ID", accessor: (r) => r.id, sortable: false },
];

const STORAGE_KEY = "basho_sort_datatable_test";

describe("DataTable", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("renders all column headers", () => {
    render(
      <DataTable
        columns={columns}
        rows={data}
        rowKey={(r) => r.id}
        storageKey={STORAGE_KEY}
        defaultSortKey="name"
        defaultSortOrder="asc"
      />
    );
    expect(screen.getByText("Name")).toBeTruthy();
    expect(screen.getByText("Age")).toBeTruthy();
    expect(screen.getByText("ID")).toBeTruthy();
  });

  it("renders all rows", () => {
    render(
      <DataTable
        columns={columns}
        rows={data}
        rowKey={(r) => r.id}
        storageKey={STORAGE_KEY}
        defaultSortKey="name"
        defaultSortOrder="asc"
      />
    );
    expect(screen.getByText("Charlie")).toBeTruthy();
    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.getByText("Bob")).toBeTruthy();
  });

  it("sorts rows by default sort key and order on initial render", () => {
    render(
      <DataTable
        columns={columns}
        rows={data}
        rowKey={(r) => r.id}
        storageKey={STORAGE_KEY}
        defaultSortKey="name"
        defaultSortOrder="asc"
      />
    );
    const cells = screen.getAllByTestId("dt-cell-name");
    expect(cells[0].textContent).toBe("Alice");
    expect(cells[1].textContent).toBe("Bob");
    expect(cells[2].textContent).toBe("Charlie");
  });

  it("clicking a sortable header changes sort key", () => {
    render(
      <DataTable
        columns={columns}
        rows={data}
        rowKey={(r) => r.id}
        storageKey={STORAGE_KEY}
        defaultSortKey="name"
        defaultSortOrder="asc"
      />
    );
    fireEvent.click(screen.getByText("Age"));
    const cells = screen.getAllByTestId("dt-cell-age");
    expect(cells[0].textContent).toBe("25");
    expect(cells[1].textContent).toBe("30");
    expect(cells[2].textContent).toBe("35");
  });

  it("clicking the same header toggles sort order", () => {
    render(
      <DataTable
        columns={columns}
        rows={data}
        rowKey={(r) => r.id}
        storageKey={STORAGE_KEY}
        defaultSortKey="name"
        defaultSortOrder="asc"
      />
    );
    // Click Age → asc (default reset)
    fireEvent.click(screen.getByText("Age"));
    let cells = screen.getAllByTestId("dt-cell-age");
    expect(cells[0].textContent).toBe("25");

    // Click Age again → desc
    fireEvent.click(screen.getByText("Age"));
    cells = screen.getAllByTestId("dt-cell-age");
    expect(cells[0].textContent).toBe("35");
  });

  it("sortable headers have role=button and tabIndex=0", () => {
    const { container } = render(
      <DataTable
        columns={columns}
        rows={data}
        rowKey={(r) => r.id}
        storageKey={STORAGE_KEY}
        defaultSortKey="name"
        defaultSortOrder="asc"
      />
    );
    const sortableHeaders = container.querySelectorAll("th[role='button']");
    expect(sortableHeaders.length).toBe(2); // name and age are sortable
    sortableHeaders.forEach((h) => {
      expect(h.getAttribute("tabindex")).toBe("0");
    });
  });

  it("non-sortable headers do not have role=button", () => {
    const { container } = render(
      <DataTable
        columns={columns}
        rows={data}
        rowKey={(r) => r.id}
        storageKey={STORAGE_KEY}
        defaultSortKey="name"
        defaultSortOrder="asc"
      />
    );
    const allHeaders = container.querySelectorAll("th");
    expect(allHeaders.length).toBe(3);
    const buttonHeaders = container.querySelectorAll("th[role='button']");
    expect(buttonHeaders.length).toBe(2);
  });

  it("keyboard Enter on sortable header triggers sort", () => {
    render(
      <DataTable
        columns={columns}
        rows={data}
        rowKey={(r) => r.id}
        storageKey={STORAGE_KEY}
        defaultSortKey="name"
        defaultSortOrder="asc"
      />
    );
    const ageHeader = screen.getByText("Age").closest("th")!;
    fireEvent.keyDown(ageHeader, { key: "Enter" });
    const cells = screen.getAllByTestId("dt-cell-age");
    expect(cells[0].textContent).toBe("25");
  });

  it("keyboard Space on sortable header triggers sort", () => {
    render(
      <DataTable
        columns={columns}
        rows={data}
        rowKey={(r) => r.id}
        storageKey={STORAGE_KEY}
        defaultSortKey="name"
        defaultSortOrder="asc"
      />
    );
    const ageHeader = screen.getByText("Age").closest("th")!;
    fireEvent.keyDown(ageHeader, { key: " " });
    const cells = screen.getAllByTestId("dt-cell-age");
    expect(cells[0].textContent).toBe("25");
  });

  it("renders empty state when rows is empty", () => {
    render(
      <DataTable
        columns={columns}
        rows={[]}
        rowKey={(r) => r.id}
        storageKey={STORAGE_KEY}
        defaultSortKey="name"
        defaultSortOrder="asc"
        emptyText="No data available"
      />
    );
    expect(screen.getByText("No data available")).toBeTruthy();
  });

  it("empty state colSpan matches column count", () => {
    const { container } = render(
      <DataTable
        columns={columns}
        rows={[]}
        rowKey={(r) => r.id}
        storageKey={STORAGE_KEY}
        defaultSortKey="name"
        defaultSortOrder="asc"
      />
    );
    const emptyCell = container.querySelector("td[colspan]");
    expect(emptyCell).not.toBeNull();
    expect(emptyCell?.getAttribute("colspan")).toBe("3");
  });

  it("persists sort state to localStorage", () => {
    render(
      <DataTable
        columns={columns}
        rows={data}
        rowKey={(r) => r.id}
        storageKey={STORAGE_KEY}
        defaultSortKey="name"
        defaultSortOrder="asc"
      />
    );
    fireEvent.click(screen.getByText("Age"));
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.key).toBe("age");
  });

  it("restores sort state from localStorage on init", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ key: "age", order: "desc" })
    );
    render(
      <DataTable
        columns={columns}
        rows={data}
        rowKey={(r) => r.id}
        storageKey={STORAGE_KEY}
        defaultSortKey="name"
        defaultSortOrder="asc"
      />
    );
    const cells = screen.getAllByTestId("dt-cell-age");
    expect(cells[0].textContent).toBe("35");
    expect(cells[2].textContent).toBe("25");
  });

  it("uses custom render function when provided", () => {
    const customColumns: Column<TestRow>[] = [
      {
        key: "name",
        label: "Name",
        accessor: (r) => r.name,
        sortable: true,
        render: (r) => <span data-testid="custom-name">{r.name.toUpperCase()}</span>,
      },
    ];
    render(
      <DataTable
        columns={customColumns}
        rows={data}
        rowKey={(r) => r.id}
        storageKey={STORAGE_KEY}
        defaultSortKey="name"
        defaultSortOrder="asc"
      />
    );
    expect(screen.getByText("ALICE")).toBeTruthy();
  });

  it("active sort header has primary text color", () => {
    render(
      <DataTable
        columns={columns}
        rows={data}
        rowKey={(r) => r.id}
        storageKey={STORAGE_KEY}
        defaultSortKey="name"
        defaultSortOrder="asc"
      />
    );
    const nameHeader = screen.getByText("Name").closest("th")!;
    expect(nameHeader.className).toContain("text-primary");
  });
});
