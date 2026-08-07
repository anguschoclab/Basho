/**
 * Phase 4a: Route reachability regression tests.
 *
 * Proves that every route in routes.tsx has a valid component or redirect,
 * and that sidebar-config routes match defined routes.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const ROOT = join(__dirname, "../../../..");
const SRC = join(ROOT, "src");

function readFile(rel: string): string {
  const abs = join(SRC, rel);
  if (!existsSync(abs)) return "";
  return readFileSync(abs, "utf-8");
}

describe("routes.tsx — structural integrity", () => {
  const routes = readFile("routes.tsx");

  it("exports router", () => {
    expect(routes).toContain("export const router");
  });

  it("uses createRouter with routeTree", () => {
    expect(routes).toContain("createRouter");
    expect(routes).toContain("routeTree");
  });

  it("defines root route with notFoundComponent", () => {
    expect(routes).toContain("createRootRoute");
    expect(routes).toContain("notFoundComponent");
  });

  it("supports both hash and browser history for Electron/PWA parity", () => {
    expect(routes).toContain("createHashHistory");
    expect(routes).toContain("createBrowserHistory");
  });
});

describe("Content routes — all page routes have components", () => {
  const routes = readFile("routes.tsx");

  // Top-level routes (path is defined directly in createRoute)
  const topLevelRoutes: Array<{ path: string; component: string }> = [
    { path: "/dashboard", component: "Dashboard" },
    { path: "/main-menu", component: "MainMenu" },
    { path: "/new-game", component: "NewGameWizard" },
    { path: "/settings", component: "SettingsPage" },
    { path: "/recap", component: "RecapPage" },
    { path: "/digest", component: "WeeklyDigestPage" },
    { path: "/bookmarks", component: "BookmarksPage" },
    { path: "/global-cup", component: "GlobalCupPage" },
    { path: "/world-circuit", component: "RegionalHubPage" },
    { path: "/myoseki", component: "MyosekiMarketPage" },
    { path: "/media", component: "MediaPage" },
    { path: "/rikishi", component: "RikishiPage" },
    { path: "/glossary", component: "GlossaryPage" },
  ];

  // Nested routes: parent base route + child path
  const nestedRoutes: Array<{ parent: string; child: string; component: string }> = [
    { parent: "/stable", child: "/", component: "StablePage" },
    { parent: "/stable", child: "/roster", component: "RikishiPage" },
    { parent: "/stable", child: "/training", component: "TrainingPage" },
    { parent: "/stable", child: "/medical", component: "InjuryRecoveryPage" },
    { parent: "/stable", child: "/staff", component: "StaffPage" },
    { parent: "/stable", child: "/oyakata", component: "OyakataPage" },
    { parent: "/office", child: "/finances", component: "EconomyPage" },
    { parent: "/office", child: "/scouting", component: "ScoutingPage" },
    { parent: "/office", child: "/sponsors", component: "SponsorManagementPage" },
    { parent: "/office", child: "/facilities", component: "FacilitiesPage" },
    { parent: "/jsa", child: "/governance", component: "GovernancePage" },
    { parent: "/jsa", child: "/trends", component: "TrendsPage" },
    { parent: "/jsa", child: "/talent", component: "TalentPoolPage" },
    { parent: "/basho", child: "/", component: "BashoPage" },
    { parent: "/basho", child: "/schedule", component: "SchedulePage" },
    { parent: "/basho", child: "/banzuke", component: "BanzukePage" },
    { parent: "/basho", child: "/rivalries", component: "RivalriesPage" },
    { parent: "/records", child: "/history", component: "HistoryPage" },
    { parent: "/records", child: "/almanac", component: "AlmanacPage" },
    { parent: "/records", child: "/hall-of-fame", component: "HallOfFamePage" },
    { parent: "/records", child: "/museum", component: "HistoryDashboard" },
  ];

  for (const route of topLevelRoutes) {
    it(`route ${route.path} uses ${route.component}`, () => {
      expect(routes).toContain(route.path);
      expect(routes).toContain(route.component);
    });
  }

  for (const route of nestedRoutes) {
    it(`nested route ${route.parent}${route.child} uses ${route.component}`, () => {
      expect(routes).toContain(route.parent);
      expect(routes).toContain(`path: "${route.child}"`);
      expect(routes).toContain(route.component);
    });
  }
});

describe("Redirect routes — all redirects point to valid targets", () => {
  const routes = readFile("routes.tsx");

  const redirects: Array<{ from: string; to: string }> = [
    { from: "/economy", to: "/office/finances" },
    { from: "/scouting", to: "/office/scouting" },
    { from: "/sponsors", to: "/office/sponsors" },
    { from: "/governance", to: "/jsa/governance" },
    { from: "/talent", to: "/jsa/talent" },
    { from: "/banzuke", to: "/basho/banzuke" },
    { from: "/schedule", to: "/basho/schedule" },
    { from: "/rivalries", to: "/basho/rivalries" },
    { from: "/history", to: "/records/history" },
    { from: "/almanac", to: "/records/almanac" },
    { from: "/hall-of-fame", to: "/records/hall-of-fame" },
    { from: "/museum", to: "/records/museum" },
    { from: "/infrastructure", to: "/stable" },
  ];

  for (const redirect of redirects) {
    it(`redirect ${redirect.from} → ${redirect.to}`, () => {
      expect(routes).toContain(redirect.from);
      expect(routes).toContain(redirect.to);
      expect(routes).toContain("redirect");
    });
  }
});

describe("Sidebar routes — all sidebar entries match defined routes", () => {
  const sidebar = readFile("components/layout/sidebarConfig.ts");
  const routes = readFile("routes.tsx");

  // Map sidebar URLs to component names — nested routes won't appear as
  // literal full paths in routes.tsx, so we verify the component is wired.
  const sidebarRouteMap: Array<{ url: string; component: string }> = [
    { url: "/dashboard", component: "Dashboard" },
    { url: "/recap", component: "RecapPage" },
    { url: "/digest", component: "WeeklyDigestPage" },
    { url: "/stable", component: "StablePage" },
    { url: "/stable/roster", component: "RikishiPage" },
    { url: "/stable/training", component: "TrainingPage" },
    { url: "/stable/medical", component: "InjuryRecoveryPage" },
    { url: "/stable/staff", component: "StaffPage" },
    { url: "/stable/oyakata", component: "OyakataPage" },
    { url: "/office/scouting", component: "ScoutingPage" },
    { url: "/bookmarks", component: "BookmarksPage" },
    { url: "/basho", component: "BashoPage" },
    { url: "/basho/banzuke", component: "BanzukePage" },
    { url: "/basho/schedule", component: "SchedulePage" },
    { url: "/basho/rivalries", component: "RivalriesPage" },
    { url: "/global-cup", component: "GlobalCupPage" },
    { url: "/world-circuit", component: "RegionalHubPage" },
    { url: "/office/finances", component: "EconomyPage" },
    { url: "/office/facilities", component: "FacilitiesPage" },
    { url: "/office/sponsors", component: "SponsorManagementPage" },
    { url: "/jsa/governance", component: "GovernancePage" },
    { url: "/myoseki", component: "MyosekiMarketPage" },
    { url: "/media", component: "MediaPage" },
    { url: "/jsa/trends", component: "TrendsPage" },
    { url: "/records/history", component: "HistoryPage" },
    { url: "/records/almanac", component: "AlmanacPage" },
    { url: "/records/hall-of-fame", component: "HallOfFamePage" },
    { url: "/records/museum", component: "HistoryDashboard" },
    { url: "/glossary", component: "GlossaryPage" },
  ];

  for (const { url, component } of sidebarRouteMap) {
    it(`sidebar URL ${url} is in sidebar config and component ${component} is in routes.tsx`, () => {
      expect(sidebar).toContain(url);
      expect(routes).toContain(component);
    });
  }
});

describe("Pre-game routes — intentionally not in sidebar", () => {
  const sidebar = readFile("components/layout/sidebarConfig.ts");

  it("/main-menu is not in sidebar (pre-game route)", () => {
    expect(sidebar).not.toContain('"/main-menu"');
  });

  it("/new-game is not in sidebar (pre-game route)", () => {
    expect(sidebar).not.toContain('"/new-game"');
  });

  it("/settings is not in sidebar (settings route)", () => {
    expect(sidebar).not.toContain('"/settings"');
  });
});
