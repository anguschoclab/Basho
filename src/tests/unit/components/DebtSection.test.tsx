import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { DebtSection } from "@/components/economy/DebtSection";

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, className, ...props }: any) => (
    <button onClick={onClick} className={className} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
  CardContent: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, variant, className }: any) => (
    <span data-variant={variant} className={className}>{children}</span>
  ),
}));

vi.mock("@/utils/engineUtils", () => ({
  formatYen: (n: number) => `¥${n.toLocaleString()}`,
}));

interface Loan {
  id: string;
  type: string;
  providerName: string;
  amount: number;
  interestRate: number;
  dueWeek: number;
  remainingBalance: number;
  principal: number;
  monthlyPayment: number;
  stringsAttached?: string[];
}

function makeLoan(overrides: Partial<Loan> = {}): Loan {
  return {
    id: "l1",
    type: "institutional",
    providerName: "Bank A",
    amount: 1_000_000,
    interestRate: 0.05,
    dueWeek: 10,
    remainingBalance: 800_000,
    principal: 1_000_000,
    monthlyPayment: 50_000,
    ...overrides,
  };
}

function getProviderNames(): string[] {
  const cards = document.querySelectorAll(".p-4.rounded-lg");
  return Array.from(cards).map((c) => {
    const span = c.querySelector(".font-bold");
    return span?.textContent ?? "";
  });
}

const STORAGE_KEY = "basho_sort_debt";

describe("DebtSection sorting", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("renders SortMenu control when loans exist", () => {
    render(<DebtSection activeLoans={[makeLoan()]} />);
    expect(screen.getByRole("combobox")).toBeTruthy();
  });

  it("does not render SortMenu when no loans", () => {
    render(<DebtSection activeLoans={[]} />);
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("defaults to remainingBalance descending", () => {
    const loans = [
      makeLoan({ id: "l1", providerName: "Small", remainingBalance: 100_000 }),
      makeLoan({ id: "l2", providerName: "Large", remainingBalance: 900_000 }),
      makeLoan({ id: "l3", providerName: "Medium", remainingBalance: 500_000 }),
    ];
    render(<DebtSection activeLoans={loans} />);
    const order = getProviderNames();
    expect(order).toEqual(["Large", "Medium", "Small"]);
  });

  it("sorting by provider name descending reorders reverse-alphabetically", () => {
    const loans = [
      makeLoan({ id: "l1", providerName: "Zeta Bank", remainingBalance: 100_000 }),
      makeLoan({ id: "l2", providerName: "Alpha Bank", remainingBalance: 900_000 }),
      makeLoan({ id: "l3", providerName: "Mid Bank", remainingBalance: 500_000 }),
    ];
    render(<DebtSection activeLoans={loans} />);
    const trigger = screen.getByRole("combobox");
    fireEvent.keyDown(trigger, { key: "Enter", code: "Enter", charCode: 13 });
    const providerOption = screen.getByText("Provider");
    fireEvent.click(providerOption);
    const order = getProviderNames();
    // desc: Z -> A
    expect(order).toEqual(["Zeta Bank", "Mid Bank", "Alpha Bank"]);
  });

  it("sorting by interest rate descending", () => {
    const loans = [
      makeLoan({ id: "l1", providerName: "High", interestRate: 0.1, remainingBalance: 100 }),
      makeLoan({ id: "l2", providerName: "Low", interestRate: 0.01, remainingBalance: 900 }),
      makeLoan({ id: "l3", providerName: "Mid", interestRate: 0.05, remainingBalance: 500 }),
    ];
    render(<DebtSection activeLoans={loans} />);
    const trigger = screen.getByRole("combobox");
    fireEvent.keyDown(trigger, { key: "Enter", code: "Enter", charCode: 13 });
    fireEvent.click(screen.getAllByText("Interest").pop()!);
    const order = getProviderNames();
    // desc: 0.1, 0.05, 0.01
    expect(order).toEqual(["High", "Mid", "Low"]);
  });

  it("persists sort state to localStorage", () => {
    render(<DebtSection activeLoans={[makeLoan()]} />);
    const trigger = screen.getByRole("combobox");
    fireEvent.keyDown(trigger, { key: "Enter", code: "Enter", charCode: 13 });
    fireEvent.click(screen.getAllByText("Principal").pop()!);
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.key).toBe("principal");
    expect(stored.order).toBe("desc");
  });

  it("restores sort state from localStorage on init", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ key: "providerName", order: "asc" }));
    const loans = [
      makeLoan({ id: "l1", providerName: "Zeta", remainingBalance: 100 }),
      makeLoan({ id: "l2", providerName: "Alpha", remainingBalance: 900 }),
    ];
    render(<DebtSection activeLoans={loans} />);
    const order = getProviderNames();
    expect(order).toEqual(["Alpha", "Zeta"]);
  });
});
