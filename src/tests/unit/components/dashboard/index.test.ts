/**
 * dashboard/index.test.ts
 * =======================
 * Export contract for the dashboard barrel: renamed components are exported
 * under their canonical names and retired names are gone.
 */

import { describe, it, expect } from "vitest";
import * as dashboard from "@/components/dashboard";

describe("dashboard barrel exports", () => {
  it("exports StableHealthWidget (renamed from InstitutionWidget)", () => {
    expect(dashboard.StableHealthWidget).toBeDefined();
    expect((dashboard as Record<string, unknown>).InstitutionWidget).toBeUndefined();
  });

  it("exports AdvisorPanel (renamed from IntelligencePanel)", () => {
    expect(dashboard.AdvisorPanel).toBeDefined();
    expect((dashboard as Record<string, unknown>).IntelligencePanel).toBeUndefined();
  });

  it("still exports the stable overview StableWidget", () => {
    expect(dashboard.StableWidget).toBeDefined();
  });
});
