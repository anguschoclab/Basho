/**
 * SettingsPage.test.tsx
 * =====================
 * Page-shell contract: the shell renders the single "Settings" h1 via
 * pageTitle; the page must not render a duplicate inline heading or a
 * single-item subnav.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({
    children,
    pageTitle,
    subNavTabs,
  }: {
    children: React.ReactNode;
    pageTitle?: string;
    subNavTabs?: unknown[];
  }) => (
    <div data-testid="app-layout">
      {!subNavTabs && pageTitle && <h1 data-testid="shell-title">{pageTitle}</h1>}
      {children}
    </div>
  ),
}));

vi.mock("@/components/settings/SettingsSections", () => ({
  AppearanceCard: () => null,
  SaveLoadCard: () => null,
  ShortcutsCard: () => null,
  SimulationCard: () => null,
  AboutCard: () => null,
}));

import SettingsPage from "@/pages/SettingsPage";

describe("SettingsPage", () => {
  it("renders exactly one h1 — the shell's pageTitle", () => {
    render(<SettingsPage />);
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0].textContent).toBe("Settings");
  });
});
