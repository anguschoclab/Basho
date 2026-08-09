import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SortMenu, type SortOption } from "@/components/ui/SortMenu";

const options: SortOption[] = [
  { key: "name", label: "Name" },
  { key: "age", label: "Age" },
  { key: "rank", label: "Rank" },
];

const STORAGE_KEY = "basho_sort_sortmenu_test";

describe("SortMenu", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders a sort key select trigger", () => {
    render(
      <SortMenu
        options={options}
        storageKey={STORAGE_KEY}
        defaultSortKey="name"
        defaultSortOrder="asc"
        onSortChange={vi.fn()}
      />
    );
    // The trigger should show the current sort key label
    expect(screen.getByText("Name")).toBeTruthy();
  });

  it("renders an asc/desc toggle button", () => {
    render(
      <SortMenu
        options={options}
        storageKey={STORAGE_KEY}
        defaultSortKey="name"
        defaultSortOrder="asc"
        onSortChange={vi.fn()}
      />
    );
    const toggle = screen.getByRole("button", { name: /toggle sort order/i });
    expect(toggle).toBeTruthy();
  });

  it("calls onSortChange when toggle button is clicked", () => {
    const onSortChange = vi.fn();
    render(
      <SortMenu
        options={options}
        storageKey={STORAGE_KEY}
        defaultSortKey="name"
        defaultSortOrder="asc"
        onSortChange={onSortChange}
      />
    );
    const toggle = screen.getByRole("button", { name: /toggle sort order/i });
    fireEvent.click(toggle);
    expect(onSortChange).toHaveBeenCalledWith("name", "desc");
  });

  it("calls onSortChange when a new sort key is selected", () => {
    const onSortChange = vi.fn();
    render(
      <SortMenu
        options={options}
        storageKey={STORAGE_KEY}
        defaultSortKey="name"
        defaultSortOrder="asc"
        onSortChange={onSortChange}
      />
    );
    // Open the select dropdown
    const trigger = screen.getByRole("combobox");
    fireEvent.keyDown(trigger, {
      key: "Enter",
      code: "Enter",
      charCode: 13,
    });
    // Click the "Age" option
    const ageOption = screen.getByText("Age");
    fireEvent.click(ageOption);
    expect(onSortChange).toHaveBeenCalledWith("age", "asc");
  });

  it("persists sort state to localStorage on key change", () => {
    render(
      <SortMenu
        options={options}
        storageKey={STORAGE_KEY}
        defaultSortKey="name"
        defaultSortOrder="asc"
        onSortChange={vi.fn()}
      />
    );
    const toggle = screen.getByRole("button", { name: /toggle sort order/i });
    fireEvent.click(toggle);
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.key).toBe("name");
    expect(stored.order).toBe("desc");
  });

  it("restores sort state from localStorage on init", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ key: "age", order: "desc" }));
    const onSortChange = vi.fn();
    render(
      <SortMenu
        options={options}
        storageKey={STORAGE_KEY}
        defaultSortKey="name"
        defaultSortOrder="asc"
        onSortChange={onSortChange}
      />
    );
    // The trigger should show "Age" (restored from localStorage)
    expect(screen.getByText("Age")).toBeTruthy();
    // Toggle should show desc indicator
    const toggle = screen.getByRole("button", { name: /toggle sort order/i });
    expect(toggle.getAttribute("aria-label")).toContain("descending");
  });

  it("toggle button aria-label reflects current order", () => {
    render(
      <SortMenu
        options={options}
        storageKey={STORAGE_KEY}
        defaultSortKey="name"
        defaultSortOrder="asc"
        onSortChange={vi.fn()}
      />
    );
    const toggle = screen.getByRole("button", { name: /toggle sort order/i });
    expect(toggle.getAttribute("aria-label")).toContain("ascending");
  });
});
