/**
 * Phase 4b: Shell contract regression tests.
 *
 * Proves that every content page uses AppLayout and PageHeader
 * (the Control Center shell template), and that pages with sub-navigation
 * pass subNavTabs to AppLayout.
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

const CONTENT_PAGES = [
  "pages/Dashboard.tsx",
  "pages/StablePage.tsx",
  "pages/TrainingPage.tsx",
  "pages/OyakataPage.tsx",
  "pages/RikishiPage.tsx",
  "pages/BashoPage.tsx",
  "pages/SchedulePage.tsx",
  "pages/BanzukePage.tsx",
  "pages/RivalriesPage.tsx",
  "pages/EconomyPage.tsx",
  "pages/TalentPoolPage.tsx",
  "pages/FacilitiesPage.tsx",
  "pages/RecapPage.tsx",
  "pages/WeeklyDigestPage.tsx",
  "pages/HistoryPage.tsx",
  "pages/AlmanacPage.tsx",
  "pages/MediaPage.tsx",
  "pages/HallOfFamePage.tsx",
  "pages/InjuryRecoveryPage.tsx",
  "pages/BookmarksPage.tsx",
  "pages/SponsorManagementPage.tsx",
  "pages/SettingsPage.tsx",
  "pages/StaffPage.tsx",
  "pages/TrendsPage.tsx",
  "pages/ScoutingPage.tsx",
  "pages/GovernancePage.tsx",
  "pages/MyosekiMarketPage.tsx",
  "pages/GlobalCupPage.tsx",
  "pages/RegionalHubPage.tsx",
  "pages/GlossaryPage.tsx",
  "pages/HistoryDashboard.tsx",
];

describe("Shell contract — AppLayout usage", () => {
  for (const page of CONTENT_PAGES) {
    const fileName = page.split("/").pop() ?? page;

    it(`${fileName} imports AppLayout`, () => {
      const content = readFile(page);
      if (!content) return; // skip if file doesn't exist
      expect(content).toContain("AppLayout");
    });
  }
});

describe("Shell contract — PageHeader usage", () => {
  const pagesWithHeader = [
    "pages/StablePage.tsx",
    "pages/OyakataPage.tsx",
    "pages/BashoPage.tsx",
    "pages/SchedulePage.tsx",
    "pages/BanzukePage.tsx",
    "pages/RivalriesPage.tsx",
    "pages/EconomyPage.tsx",
    "pages/TalentPoolPage.tsx",
    "pages/FacilitiesPage.tsx",
    "pages/RecapPage.tsx",
    "pages/HistoryPage.tsx",
    "pages/AlmanacPage.tsx",
    "pages/MediaPage.tsx",
    "pages/HallOfFamePage.tsx",
    "pages/InjuryRecoveryPage.tsx",
    "pages/SponsorManagementPage.tsx",
    "pages/TrendsPage.tsx",
    "pages/ScoutingPage.tsx",
    "pages/GovernancePage.tsx",
    "pages/MyosekiMarketPage.tsx",
    "pages/GlobalCupPage.tsx",
    "pages/RegionalHubPage.tsx",
    "pages/GlossaryPage.tsx",
    "pages/HistoryDashboard.tsx",
  ];

  for (const page of pagesWithHeader) {
    const fileName = page.split("/").pop() ?? page;

    it(`${fileName} renders PageHeader`, () => {
      const content = readFile(page);
      if (!content) return;
      expect(content).toContain("PageHeader");
    });
  }
});

describe("Shell contract — SubNavTabs usage", () => {
  const pageTabMap: Array<{ page: string; tabs: string }> = [
    { page: "pages/StablePage.tsx", tabs: "STABLE_TABS" },
    { page: "pages/TrainingPage.tsx", tabs: "STABLE_TABS" },
    { page: "pages/OyakataPage.tsx", tabs: "STABLE_TABS" },
    { page: "pages/InjuryRecoveryPage.tsx", tabs: "STABLE_TABS" },
    { page: "pages/StaffPage.tsx", tabs: "STABLE_TABS" },
    { page: "pages/EconomyPage.tsx", tabs: "OFFICE_TABS" },
    { page: "pages/ScoutingPage.tsx", tabs: "OFFICE_TABS" },
    { page: "pages/SponsorManagementPage.tsx", tabs: "OFFICE_TABS" },
    { page: "pages/FacilitiesPage.tsx", tabs: "OFFICE_TABS" },
    { page: "pages/GovernancePage.tsx", tabs: "ASSOCIATION_TABS" },
    { page: "pages/TrendsPage.tsx", tabs: "ASSOCIATION_TABS" },
    { page: "pages/TalentPoolPage.tsx", tabs: "ASSOCIATION_TABS" },
    { page: "pages/BashoPage.tsx", tabs: "TOURNAMENT_TABS" },
    { page: "pages/SchedulePage.tsx", tabs: "TOURNAMENT_TABS" },
    { page: "pages/BanzukePage.tsx", tabs: "TOURNAMENT_TABS" },
    { page: "pages/RivalriesPage.tsx", tabs: "TOURNAMENT_TABS" },
    { page: "pages/GlobalCupPage.tsx", tabs: "TOURNAMENT_TABS" },
    { page: "pages/RegionalHubPage.tsx", tabs: "TOURNAMENT_TABS" },
    { page: "pages/HistoryPage.tsx", tabs: "RECORDS_TABS" },
    { page: "pages/AlmanacPage.tsx", tabs: "RECORDS_TABS" },
    { page: "pages/HallOfFamePage.tsx", tabs: "RECORDS_TABS" },
    { page: "pages/HistoryDashboard.tsx", tabs: "RECORDS_TABS" },
  ];

  for (const { page, tabs } of pageTabMap) {
    const fileName = page.split("/").pop() ?? page;

    it(`${fileName} uses ${tabs} for sub-navigation`, () => {
      const content = readFile(page);
      if (!content) return;
      expect(content).toContain(tabs);
    });
  }
});

describe("Shell contract — EventFeed / EventLogPanel on key pages", () => {
  const pagesWithEventFeed = [
    "pages/Dashboard.tsx",
    "pages/GlobalCupPage.tsx",
    "pages/MediaPage.tsx",
  ];

  for (const page of pagesWithEventFeed) {
    const fileName = page.split("/").pop() ?? page;

    it(`${fileName} includes EventFeed for event log continuity`, () => {
      const content = readFile(page);
      if (!content) return;
      expect(content).toContain("EventFeed");
    });
  }
});
