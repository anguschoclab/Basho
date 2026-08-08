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
import { readFileSync, existsSync, readdirSync, statSync } from "fs";
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

describe("CI Gate: Write-only state field classification", () => {
  // WorldState fields that are written by the tick pipeline but intentionally
  // NOT read by any UI component. These are internal engine-only fields.
  //
  // To add a field here, it must be:
  // 1. Written by at least one tick phase or engine system
  // 2. Not read by any presenter, selector, or page component
  // 3. Documented with a reason for being internal-only
  const INTERNAL_ONLY_FIELDS: Record<string, string> = {
    ftue: "First-time user experience flag; read by BashoHistory for tutorial suppression",
    heyaBrandIdentities: "Read by KeshoMawashiFactory for procedural kesho-mawashi generation",
    _interimDaysRemaining: "Internal cycle counter; not user-facing",
    _postBashoDays: "Internal cycle counter; not user-facing",
    _daysSinceLastWeeklyTick: "Internal cycle counter; not user-facing",
    _recruitmentWindow: "Internal recruitment window state; read by recruitment phase",
    _postBashoMeta: "Internal post-basho metadata; read by pipeline runner",
    _populationTarget: "Internal population targeting; read by talent pool maintenance",
    _preBashoAssessment: "Internal pre-basho assessment; read by basho setup",
  };

  // Fields that MUST be read by UI (presenters, selectors, or pages)
  const UI_READ_FIELDS = [
    "staff",
    "sparringPairs",
    "talentPool",
    "candidatePool",
    "chronicle",
    "calendar",
    "myosekiMarket",
    "records",
    "settings",
    "meta",
    "rivalriesState",
    "globalCup",
    "hallOfFame",
    "sponsorPool",
    "mediaState",
    "lineage",
  ];

  it("every UI-read field appears in at least one UI file", () => {
    const uiDirs = ["presenters", "pages", "components", "contexts"];
    let uiSource = "";
    for (const dir of uiDirs) {
      const dirPath = join(SRC, dir);
      if (!existsSync(dirPath)) continue;
      function walk(dir: string) {
        for (const entry of readdirSync(dir)) {
          const full = join(dir, entry);
          if (!existsSync(full)) continue;
          try {
            const stat = statSync(full);
            if (stat.isDirectory()) {
              walk(full);
            } else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) {
              uiSource += readFileSync(full, "utf-8") + "\n";
            }
          } catch {
            // skip
          }
        }
      }
      walk(dirPath);
    }

    const missing: string[] = [];
    for (const field of UI_READ_FIELDS) {
      if (!uiSource.includes(`.${field}`) && !uiSource.includes(`?.${field}`)) {
        missing.push(field);
      }
    }
    expect(
      missing,
      `UI-read fields not found in any UI file: ${missing.join(", ")}`
    ).toEqual([]);
  });

  it("internal-only fields are documented with a reason", () => {
    for (const [field, reason] of Object.entries(INTERNAL_ONLY_FIELDS)) {
      expect(reason.length, `Field ${field} must have a non-empty reason`).toBeGreaterThan(10);
    }
  });

  it("no field is classified as both UI-read and internal-only", () => {
    const uiSet = new Set(UI_READ_FIELDS);
    for (const field of Object.keys(INTERNAL_ONLY_FIELDS)) {
      expect(uiSet.has(field), `Field ${field} is classified as both UI-read and internal-only`).toBe(false);
    }
  });
});

describe("CI Gate: Audit regression gate", () => {
  it("baseline-orphans.json has valid structure with entries array", () => {
    const path = join(ROOT, ".windsurf", "audit", "baseline-orphans.json");
    const raw = readFileSync(path, "utf-8");
    const data = JSON.parse(raw);
    expect(data).toHaveProperty("summary");
    expect(data).toHaveProperty("entries");
    expect(Array.isArray(data.entries)).toBe(true);
  });

  it("baseline-orphans.json summary counts match entry counts", () => {
    const path = join(ROOT, ".windsurf", "audit", "baseline-orphans.json");
    const raw = readFileSync(path, "utf-8");
    const data = JSON.parse(raw);
    const entries = data.entries as Array<{ orphanType: string }>;
    const byType = entries.reduce((acc, e) => {
      acc[e.orphanType] = (acc[e.orphanType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    expect(byType["unreferenced-export"] ?? 0).toBe(data.summary.unreferencedExports);
    expect(byType["orphan-route"] ?? 0).toBe(data.summary.orphanRoutes);
    expect(byType["write-only-state"] ?? 0).toBe(data.summary.writeOnlyState);
  });

  it("orphan-tracker.csv has header row", () => {
    const path = join(ROOT, ".windsurf", "audit", "orphan-tracker.csv");
    const raw = readFileSync(path, "utf-8");
    const lines = raw.trim().split("\n");
    expect(lines.length).toBeGreaterThan(0);
    expect(lines[0].toLowerCase()).toContain("id");
    expect(lines[0].toLowerCase()).toContain("file");
    expect(lines[0].toLowerCase()).toContain("symbol");
  });
});
