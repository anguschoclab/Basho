import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join, extname } from "path";
import { findFiles } from "@/tests/helpers/fsScan";

const ROOT = join(__dirname, "../../../..");
const SRC = join(ROOT, "src");

function isTestFile(filePath: string): boolean {
  return (
    filePath.includes(".test.") || filePath.includes(".spec.") || filePath.includes("__tests__")
  );
}

function isScriptFile(filePath: string): boolean {
  return filePath.includes("/scripts/");
}

const allSrcFiles = findFiles(SRC);
const runtimeFiles = allSrcFiles.filter((f) => !isTestFile(f) && !isScriptFile(f));

// ─── Write-only state field tests ─────────────────────────────────────────────
// These fields are written to WorldState but never read by any UI component.
// The tests assert they ARE read by a presenter/selector — they will fail until
// a selector is added.

const GENUINE_WRITE_ONLY_FIELDS = [
  "awardLog",
  "globalKimariteStats",
  "allTimeKimariteStats",
  "playerKnowledge",
  "almanacSnapshots",
  "closedHeyas",
  "bloodlineRegistry",
  "encouragementLog",
  "yokozunaVacancyStreak",
] as const;

describe("Write-only state fields — surface to UI", () => {
  for (const field of GENUINE_WRITE_ONLY_FIELDS) {
    describe(`WorldState.${field}`, () => {
      it("is read by at least one .tsx page/component or .ts UI-layer hook", () => {
        // UI layer = .tsx anywhere, plus .ts under hooks/components/pages —
        // a field consumed via a derived-state hook (useAlmanacDerived.ts)
        // still surfaces to the screen even though no .tsx names it directly.
        const uiLayerFiles = runtimeFiles.filter((f) => {
          if (extname(f) === ".tsx") return true;
          if (extname(f) !== ".ts") return false;
          return ["/hooks/", "/components/", "/pages/"].some((dir) => f.includes(dir));
        });
        const uiBlob = uiLayerFiles.map((f) => readFileSync(f, "utf-8")).join("\n");
        const pattern = new RegExp(`\\.${field}\\b`);
        expect(pattern.test(uiBlob), `${field} is not read by any UI-layer file`).toBe(true);
      });

      it("is read by a presenter or selector", () => {
        const presenterFiles = findFiles(join(SRC, "presenters")).filter((f) => !isTestFile(f));
        const selectorFiles = [
          join(SRC, "engine", "selectors.ts"),
          join(SRC, "presenters", "selectors.ts"),
        ].filter((f) => existsSync(f));
        const blob = [...presenterFiles, ...selectorFiles]
          .map((f) => readFileSync(f, "utf-8"))
          .join("\n");
        const pattern = new RegExp(`\\.${field}\\b`);
        expect(pattern.test(blob), `${field} is not read by any presenter or selector`).toBe(true);
      });
    });
  }
});

// ─── Unticked service test ────────────────────────────────────────────────────

describe("MyosekiTradingService — tick phase wiring", () => {
  it("is imported by a tick phase or NPC AI file", () => {
    const tickDir = join(SRC, "engine", "tick", "phases");
    const npcDir = join(SRC, "engine", "npcAI");
    const agentsDir = join(SRC, "engine", "agents");
    const strategyDir = join(SRC, "engine", "strategy");

    const candidateDirs = [tickDir, npcDir, agentsDir, strategyDir];
    let found = false;
    for (const dir of candidateDirs) {
      if (!existsSync(dir)) continue;
      const files = findFiles(dir).filter((f) => !isTestFile(f));
      for (const f of files) {
        const content = readFileSync(f, "utf-8");
        if (content.includes("MyosekiTradingService")) {
          found = true;
          break;
        }
      }
      if (found) break;
    }
    expect(found, "MyosekiTradingService is not imported by any tick/NPC/strategy file").toBe(true);
  });
});

// ─── Unused component test ────────────────────────────────────────────────────

describe("menu-core.tsx — dead code removal", () => {
  it("has been removed (was unused duplicate of dropdown-menu.tsx)", () => {
    const menuCorePath = join(SRC, "components", "ui", "menu-core.tsx");
    expect(existsSync(menuCorePath), "menu-core.tsx should have been deleted as dead code").toBe(
      false
    );
  });
});

// ─── Orphan route tests (false positive filters) ─────────────────────────────

describe("Orphan route classification", () => {
  const INTENTIONAL_NON_SIDEBAR_ROUTES = ["/main-menu", "/new-game", "/settings"];
  const REDIRECT_ROUTES = [
    "/infrastructure",
    "/economy",
    "/talent",
    "/scouting",
    "/sponsors",
    "/governance",
    "/banzuke",
    "/schedule",
    "/rivalries",
  ];

  for (const route of INTENTIONAL_NON_SIDEBAR_ROUTES) {
    it(`${route} is intentionally not in sidebar (pre-game/settings route)`, () => {
      const sidebarContent = readFileSync(
        join(SRC, "components", "layout", "sidebarConfig.ts"),
        "utf-8"
      );
      expect(sidebarContent).not.toContain(`"${route}"`);
    });
  }

  for (const route of REDIRECT_ROUTES) {
    it(`${route} is a redirect route (not an orphan)`, () => {
      const routesContent = readFileSync(join(SRC, "routes.tsx"), "utf-8");
      expect(routesContent).toContain(`path: "${route}"`);
      expect(routesContent).toContain("redirect");
    });
  }
});
