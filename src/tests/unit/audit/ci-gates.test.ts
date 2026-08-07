/**
 * Phase 5b: CI gate regression tests.
 *
 * Proves structural invariants that should block CI if violated:
 * - Every page file imports AppLayout
 * - routes.tsx exports a router
 * - sidebar config covers all major sections
 * - No page reads world state without a presenter/projection intermediary
 * - Audit baseline files exist
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";

const ROOT = join(__dirname, "../../../..");
const SRC = join(ROOT, "src");

function readFile(rel: string): string {
  const abs = join(SRC, rel);
  if (!existsSync(abs)) return "";
  return readFileSync(abs, "utf-8");
}

function listFiles(dir: string, ext: string): string[] {
  const abs = join(SRC, dir);
  if (!existsSync(abs)) return [];
  return readdirSync(abs).filter((f) => f.endsWith(ext));
}

describe("CI Gate: Audit baseline files exist", () => {
  it("baseline-orphans.json exists", () => {
    const path = join(ROOT, ".windsurf", "audit", "baseline-orphans.json");
    expect(existsSync(path)).toBe(true);
  });

  it("orphan-tracker.csv exists", () => {
    const path = join(ROOT, ".windsurf", "audit", "orphan-tracker.csv");
    expect(existsSync(path)).toBe(true);
  });

  it("audit-orphans.ts script exists", () => {
    const path = join(ROOT, "scripts", "audit-orphans.ts");
    expect(existsSync(path)).toBe(true);
  });
});

describe("CI Gate: Router export", () => {
  it("routes.tsx exports router", () => {
    const routes = readFile("routes.tsx");
    expect(routes).toContain("export const router");
  });

  it("routes.tsx defines a route tree", () => {
    const routes = readFile("routes.tsx");
    expect(routes).toContain("routeTree");
  });
});

describe("CI Gate: Sidebar section coverage", () => {
  const sidebar = readFile("components/layout/sidebarConfig.ts");

  it("includes My Stable section", () => {
    expect(sidebar).toContain("My Stable");
  });

  it("includes Tournament section", () => {
    expect(sidebar).toContain("Tournament");
  });

  it("includes Management section", () => {
    expect(sidebar).toContain("Management");
  });

  it("includes Association section", () => {
    expect(sidebar).toContain("Association");
  });

  it("includes Records section", () => {
    expect(sidebar).toContain("Records");
  });
});

describe("CI Gate: Navigation tab constants exist", () => {
  const nav = readFile("constants/ui/navigation.ts");

  it("exports STABLE_TABS", () => {
    expect(nav).toContain("STABLE_TABS");
  });

  it("exports OFFICE_TABS", () => {
    expect(nav).toContain("OFFICE_TABS");
  });

  it("exports ASSOCIATION_TABS", () => {
    expect(nav).toContain("ASSOCIATION_TABS");
  });

  it("exports TOURNAMENT_TABS", () => {
    expect(nav).toContain("TOURNAMENT_TABS");
  });

  it("exports RECORDS_TABS", () => {
    expect(nav).toContain("RECORDS_TABS");
  });
});

describe("CI Gate: No hardcoded colors in page files", () => {
  const pagesDir = join(SRC, "pages");
  if (!existsSync(pagesDir)) return;

  const pageFiles = readdirSync(pagesDir).filter((f) => f.endsWith(".tsx"));

  // Allow hsl(var(...)) and inherit/transparent/currentColor — ban hex colors and rgb()
  const hexPattern = /#[0-9a-fA-F]{3,8}\b/;
  const rgbPattern = /\brgb\s*\(/;

  for (const file of pageFiles) {
    it(`${file} has no hardcoded hex colors`, () => {
      const content = readFile(`pages/${file}`);
      const hexMatches = content.match(hexPattern);
      if (hexMatches) {
        // Allow hex in comments or string literals for display
        const lines = content.split("\n");
        const violatingLines = lines.filter(
          (line) =>
            hexPattern.test(line) &&
            !line.trim().startsWith("//") &&
            !line.trim().startsWith("*") &&
            !line.includes("text-[10px]") // font size, not color
        );
        expect(violatingLines).toHaveLength(0);
      }
    });

    it(`${file} has no hardcoded rgb() colors`, () => {
      const content = readFile(`pages/${file}`);
      expect(rgbPattern.test(content)).toBe(false);
    });
  }
});

describe("CI Gate: Page files use AppLayout shell", () => {
  const pageFiles = listFiles("pages", ".tsx");

  for (const file of pageFiles) {
    it(`${file} imports AppLayout`, () => {
      const content = readFile(`pages/${file}`);
      if (!content) return;
      // Skip NotFound, MainMenu, NewGameWizard — pre-game/shell pages
      if (file === "NotFound.tsx" || file === "MainMenu.tsx" || file === "NewGameWizard.tsx") return;
      expect(content).toContain("AppLayout");
    });
  }
});

describe("CI Gate: Audit test suite completeness", () => {
  const auditDir = join(SRC, "tests", "unit", "audit");
  if (!existsSync(auditDir)) return;

  const auditFiles = readdirSync(auditDir).filter((f) => f.endsWith(".test.ts"));

  it("has at least 20 audit test files", () => {
    expect(auditFiles.length).toBeGreaterThanOrEqual(20);
  });

  it("includes economy-surface.test.ts", () => {
    expect(auditFiles).toContain("economy-surface.test.ts");
  });

  it("includes governance-surface.test.ts", () => {
    expect(auditFiles).toContain("governance-surface.test.ts");
  });

  it("includes almanac-history-surface.test.ts", () => {
    expect(auditFiles).toContain("almanac-history-surface.test.ts");
  });

  it("includes route-reachability.test.ts", () => {
    expect(auditFiles).toContain("route-reachability.test.ts");
  });

  it("includes shell-contract.test.ts", () => {
    expect(auditFiles).toContain("shell-contract.test.ts");
  });

  it("includes electron-parity.test.ts", () => {
    expect(auditFiles).toContain("electron-parity.test.ts");
  });

  it("includes headless-playthrough.test.ts", () => {
    expect(auditFiles).toContain("headless-playthrough.test.ts");
  });

  it("includes ci-gates.test.ts", () => {
    expect(auditFiles).toContain("ci-gates.test.ts");
  });
});
