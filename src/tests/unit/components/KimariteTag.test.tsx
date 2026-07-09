/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { KimariteTag } from "@/components/ui/KimariteTag";

// Mock TooltipWrap to inspect tooltip content
vi.mock("@/components/ui/tooltip-wrap", () => ({
  TooltipWrap: ({ children, content }: { children: React.ReactNode; content: React.ReactNode }) => (
    <div data-testid="tooltip-wrap">
      <div data-testid="tooltip-content">{content}</div>
      {children}
    </div>
  ),
}));

// Mock getKimarite from uiDigest
vi.mock("@/presenters/uiDigest", () => ({
  getKimarite: (id: string) => {
    if (id === "yorikiri") {
      return {
        id: "yorikiri",
        name: "Yorikiri",
        nameJa: "寄り切り",
        description:
          "Frontal force-out. The attacker drives his opponent backward out of the ring.",
        rarity: "common",
      };
    }
    if (id === "no-desc") {
      return {
        id: "no-desc",
        name: "NoDesc",
        nameJa: "ノーdesc",
        description: "NoDesc technique.",
      };
    }
    return undefined;
  },
}));

function renderWithProvider(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}

describe("KimariteTag", () => {
  it("renders kimarite name when valid kimariteId is provided", () => {
    renderWithProvider(<KimariteTag kimariteId="yorikiri" />);
    expect(screen.getByText("Yorikiri")).toBeTruthy();
  });

  it("wraps in tooltip when description is real (not placeholder)", () => {
    renderWithProvider(<KimariteTag kimariteId="yorikiri" />);
    const content = screen.getByTestId("tooltip-content");
    expect(content).toBeTruthy();
    expect(content.textContent).toContain("寄り切り");
    expect(content.textContent).toContain("Frontal force-out");
  });

  it("does not wrap in tooltip when description is placeholder", () => {
    renderWithProvider(<KimariteTag kimariteId="no-desc" kimariteName="NoDesc" />);
    expect(screen.queryByTestId("tooltip-wrap")).toBeNull();
    expect(screen.getByText("NoDesc")).toBeTruthy();
  });

  it("falls back to kimariteName when kimariteId not in registry", () => {
    renderWithProvider(<KimariteTag kimariteId="unknown" kimariteName="Custom Move" />);
    expect(screen.queryByTestId("tooltip-wrap")).toBeNull();
    expect(screen.getByText("Custom Move")).toBeTruthy();
  });

  it("falls back to kimariteId when neither lookup nor kimariteName works", () => {
    renderWithProvider(<KimariteTag kimariteId="unknown" />);
    expect(screen.getByText("unknown")).toBeTruthy();
  });

  it("accepts optional className prop", () => {
    renderWithProvider(<KimariteTag kimariteId="yorikiri" className="custom-class" />);
    const el = screen.getByText("Yorikiri");
    expect(el.className).toContain("custom-class");
  });
});
