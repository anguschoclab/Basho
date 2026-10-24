/**
 * sidebarConfig.test.tsx
 * ======================
 * Thematic-label contract for the app sidebar: navigation must use the
 * canonical names ("Dashboard", "Scouting") and must never surface the
 * retired off-theme labels.
 */

import { describe, it, expect } from "vitest";
import { getMenuGroups } from "@/components/layout/sidebarConfig";

function collectLabels(): string[] {
  const groups = getMenuGroups(true, false, undefined, false, false);
  return groups
    .flatMap((g) => [g.label, ...g.items.map((i) => i.title)])
    .filter((l): l is string => l !== null);
}

describe("sidebarConfig thematic labels", () => {
  it("labels the dashboard 'Dashboard'", () => {
    expect(collectLabels()).toContain("Dashboard");
  });

  it("never surfaces the retired 'Control Center' label", () => {
    expect(collectLabels()).not.toContain("Control Center");
  });

  it("never surfaces spy-flavored 'Scout Intel'", () => {
    const labels = collectLabels();
    expect(labels).not.toContain("Scout Intel");
    expect(labels.some((l) => /intel/i.test(l))).toBe(false);
  });

  it("never labels stable content 'Institution'", () => {
    const labels = collectLabels();
    expect(labels.some((l) => /^Institution/.test(l))).toBe(false);
  });
});
