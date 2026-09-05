import {
  createRouter,
  createRoute,
  createRootRoute,
  Outlet,
  createHashHistory,
  createBrowserHistory,
  redirect,
} from "@tanstack/react-router";
import { lazy } from "react";
import { warn, error } from "./engine/utils/Logger";
import { SaveSlotService } from "./engine/persistence/SaveSlotService";
const MainMenu = lazy(() => import("./pages/MainMenu"));
const NewGameWizard = lazy(() => import("./pages/NewGameWizard"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
import { withSuspense } from "./routes-helpers";

const StablePage = lazy(() => import("./pages/StablePage"));
const TrainingPage = lazy(() => import("./pages/TrainingPage"));
const OyakataPage = lazy(() => import("./pages/OyakataPage"));
const RikishiPage = lazy(() => import("./pages/RikishiPage"));
const BashoPage = lazy(() => import("./pages/BashoPage"));
const SchedulePage = lazy(() => import("./pages/SchedulePage"));
const BanzukePage = lazy(() => import("./pages/BanzukePage"));
const RivalriesPage = lazy(() => import("./pages/RivalriesPage"));
const EconomyPage = lazy(() => import("./pages/EconomyPage"));
const TalentPoolPage = lazy(() => import("./pages/TalentPoolPage"));
const CandidatePoolPage = lazy(() => import("./pages/CandidatePoolPage"));
const FacilitiesPage = lazy(() => import("./pages/FacilitiesPage"));
const RecapPage = lazy(() => import("./pages/RecapPage"));
const WeeklyDigestPage = lazy(() => import("./pages/WeeklyDigestPage"));
const HistoryPage = lazy(() => import("./pages/HistoryPage"));
const AlmanacPage = lazy(() => import("./pages/AlmanacPage"));
const MediaPage = lazy(() => import("./pages/MediaPage"));
const HallOfFamePage = lazy(() => import("./pages/HallOfFamePage"));
const InjuryRecoveryPage = lazy(() => import("./pages/InjuryRecoveryPage"));
const BookmarksPage = lazy(() => import("./pages/BookmarksPage"));
const SponsorManagementPage = lazy(() => import("./pages/SponsorManagementPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const StaffPage = lazy(() => import("./pages/StaffPage"));
const TrendsPage = lazy(() => import("./pages/TrendsPage"));
const ScoutingPage = lazy(() => import("./pages/ScoutingPage"));
const GovernancePage = lazy(() => import("./pages/GovernancePage"));
const MyosekiMarketPage = lazy(() => import("./pages/MyosekiMarketPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const HistoryDashboard = lazy(() =>
  import("./pages/HistoryDashboard").then((m) => ({ default: m.HistoryDashboard }))
);
const GlobalCupPage = lazy(() => import("./pages/GlobalCupPage"));
const RegionalHubPage = lazy(() => import("./pages/RegionalHubPage"));
const GlossaryPage = lazy(() => import("./pages/GlossaryPage"));
const RivalStablesPage = lazy(() => import("./pages/RivalStablesPage"));
const YouthAcademyPage = lazy(() => import("./pages/YouthAcademyPage"));

// In Electron production the app loads from file://, where browser history
// path traversal fails (e.g. /dashboard → file:///dashboard — not found).
// Use hash routing (#/dashboard) in that case only.
// In Electron dev mode ELECTRON_RENDERER_URL is http://localhost:5173 so
// window.location.href starts with 'http' and browser history is used.
// In the PWA browser __ELECTRON__ is undefined so browser history is used.
const isElectronProd =
  typeof window !== "undefined" &&
  window.__ELECTRON__ === true &&
  !window.location.href.startsWith("http");

// Root route
const rootRoute = createRootRoute({
  component: () => <Outlet />,
  notFoundComponent: () => {
    warn("404: Not Found Component Triggered", "Routes");
    return <NotFound />;
  },
  errorComponent: ({ error: err }) => {
    error("Root Route Error caught by TanStack Router", "Routes", err);
    return (
      <div className="p-10 bg-destructive/10 text-destructive border border-destructive rounded-lg m-10">
        <h1 className="text-2xl font-bold mb-4">Application Error</h1>
        <p className="font-mono text-sm whitespace-pre-wrap">
          {err instanceof Error ? err.message : String(err)}
        </p>
        <button
          onClick={() => (window.location.href = "/")}
          className="mt-6 px-4 py-2 bg-destructive text-white rounded hover:bg-destructive/90 font-bold"
        >
          Reset Application
        </button>
      </div>
    );
  },
  // Redirect to dashboard in Electron production to handle file:// initial load
  beforeLoad: () => {
    if (isElectronProd) {
      // In Electron production, redirect from root to dashboard with hash
      if (window.location.hash === "" || window.location.hash === "#/") {
        window.location.hash = "#/dashboard";
      }
    }
  },
});

// Auth/Main Menu routes
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  // Redirect immediately before any render — avoids the blank-frame useEffect timing race.
  // Check for autosave in storage and redirect to dashboard if exists.
  // Dashboard will handle loading the autosave via its useEffect.
  beforeLoad: async () => {
    const storage = SaveSlotService.getStorage();
    if (storage && storage.getItem(SaveSlotService.getAutosaveKey())) {
      throw redirect({ to: "/dashboard", replace: true });
    }
    throw redirect({ to: "/main-menu", replace: true });
  },
  component: () => null,
});
const mainMenuRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/main-menu",
  component: () => withSuspense(MainMenu),
});
const newGameRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/new-game",
  validateSearch: (search: Record<string, unknown>) => ({
    heyaId: typeof search.heyaId === "string" ? search.heyaId : undefined,
  }),
  component: () => withSuspense(NewGameWizard),
});
const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  component: () => withSuspense(Dashboard),
});
const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: () => withSuspense(SettingsPage),
});
const recapRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/recap",
  component: () => withSuspense(RecapPage),
});
const weeklyDigestRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/digest",
  component: () => withSuspense(WeeklyDigestPage),
});
const bookmarksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/bookmarks",
  component: () => withSuspense(BookmarksPage),
});

// --- STABLE SECTION ---
const stableBaseRoute = createRoute({ getParentRoute: () => rootRoute, path: "/stable" });
const stableIndexRoute = createRoute({
  getParentRoute: () => stableBaseRoute,
  path: "/",
  component: () => withSuspense(StablePage),
});
const stableIdRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/stable/$id",
  component: () => withSuspense(StablePage),
});
const stableRosterRoute = createRoute({
  getParentRoute: () => stableBaseRoute,
  path: "/roster",
  component: () => withSuspense(RikishiPage),
});
const stableTrainingRoute = createRoute({
  getParentRoute: () => stableBaseRoute,
  path: "/training",
  component: () => withSuspense(TrainingPage),
});
const stableMedicalRoute = createRoute({
  getParentRoute: () => stableBaseRoute,
  path: "/medical",
  component: () => withSuspense(InjuryRecoveryPage),
});
const stableStaffRoute = createRoute({
  getParentRoute: () => stableBaseRoute,
  path: "/staff",
  component: () => withSuspense(StaffPage),
});
const stableOyakataRoute = createRoute({
  getParentRoute: () => stableBaseRoute,
  path: "/oyakata",
  component: () => withSuspense(OyakataPage),
});
const stableInfrastructureRoute = createRoute({
  getParentRoute: () => stableBaseRoute,
  path: "/infrastructure",
  beforeLoad: () => {
    throw redirect({ to: "/stable", replace: true });
  },
  component: () => null,
});

// --- OFFICE SECTION ---
const officeBaseRoute = createRoute({ getParentRoute: () => rootRoute, path: "/office" });
const economyRedirectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/economy",
  beforeLoad: () => {
    throw redirect({ to: "/office/finances", replace: true });
  },
  component: () => null,
});
const officeFinancesNestedRoute = createRoute({
  getParentRoute: () => officeBaseRoute,
  path: "/finances",
  component: () => withSuspense(EconomyPage),
});
const scoutingRedirectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/scouting",
  beforeLoad: () => {
    throw redirect({ to: "/office/scouting", replace: true });
  },
  component: () => null,
});
const officeScoutingNestedRoute = createRoute({
  getParentRoute: () => officeBaseRoute,
  path: "/scouting",
  component: () => withSuspense(ScoutingPage),
});
const sponsorsRedirectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/sponsors",
  beforeLoad: () => {
    throw redirect({ to: "/office/sponsors", replace: true });
  },
  component: () => null,
});
const officeSponsorsNestedRoute = createRoute({
  getParentRoute: () => officeBaseRoute,
  path: "/sponsors",
  component: () => withSuspense(SponsorManagementPage),
});
const officeFacilitiesRoute = createRoute({
  getParentRoute: () => officeBaseRoute,
  path: "/facilities",
  component: () => withSuspense(FacilitiesPage),
});

// --- ASSOCIATION (JSA) SECTION ---
const jsaBaseRoute = createRoute({ getParentRoute: () => rootRoute, path: "/jsa" });
const governanceRedirectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/governance",
  beforeLoad: () => {
    throw redirect({ to: "/jsa/governance", replace: true });
  },
  component: () => null,
});
const jsaGovernanceNestedRoute = createRoute({
  getParentRoute: () => jsaBaseRoute,
  path: "/governance",
  component: () => withSuspense(GovernancePage),
});
const jsaTrendsRoute = createRoute({
  getParentRoute: () => jsaBaseRoute,
  path: "/trends",
  component: () => withSuspense(TrendsPage),
});
const talentRedirectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/talent",
  beforeLoad: () => {
    throw redirect({ to: "/jsa/talent", replace: true });
  },
  component: () => null,
});
const jsaTalentNestedRoute = createRoute({
  getParentRoute: () => jsaBaseRoute,
  path: "/talent",
  component: () => withSuspense(TalentPoolPage),
});
const jsaCandidatePoolRoute = createRoute({
  getParentRoute: () => jsaBaseRoute,
  path: "/candidates",
  component: () => withSuspense(CandidatePoolPage),
});
const jsaMyosekiRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/myoseki",
  component: () => withSuspense(MyosekiMarketPage),
});

// --- TOURNAMENT SECTION (nested under /basho/*) ---

const bashoBaseRoute = createRoute({ getParentRoute: () => rootRoute, path: "/basho" });
const bashoIndexRoute = createRoute({
  getParentRoute: () => bashoBaseRoute,
  path: "/",
  component: () => withSuspense(BashoPage),
});
const bashoScheduleRoute = createRoute({
  getParentRoute: () => bashoBaseRoute,
  path: "/schedule",
  component: () => withSuspense(SchedulePage),
});
const bashoBanzukeRoute = createRoute({
  getParentRoute: () => bashoBaseRoute,
  path: "/banzuke",
  component: () => withSuspense(BanzukePage),
});
const bashoRivalriesRoute = createRoute({
  getParentRoute: () => bashoBaseRoute,
  path: "/rivalries",
  component: () => withSuspense(RivalriesPage),
});
const globalCupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/global-cup",
  component: () => withSuspense(GlobalCupPage),
});
const worldCircuitRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/world-circuit",
  component: () => withSuspense(RegionalHubPage),
});

// Redirect old top-level tournament routes to nested routes
const banzukeRedirectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/banzuke",
  beforeLoad: () => {
    throw redirect({ to: "/basho/banzuke", replace: true });
  },
  component: () => null,
});
const scheduleRedirectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/schedule",
  beforeLoad: () => {
    throw redirect({ to: "/basho/schedule", replace: true });
  },
  component: () => null,
});
const rivalriesRedirectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/rivalries",
  beforeLoad: () => {
    throw redirect({ to: "/basho/rivalries", replace: true });
  },
  component: () => null,
});

// --- ARCHIVES SECTION (nested under /records/*) ---
const recordsBaseRoute = createRoute({ getParentRoute: () => rootRoute, path: "/records" });
const recordsIndexRoute = createRoute({
  getParentRoute: () => recordsBaseRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/records/history", replace: true });
  },
  component: () => null,
});
const recordsHistoryRoute = createRoute({
  getParentRoute: () => recordsBaseRoute,
  path: "/history",
  component: () => withSuspense(HistoryPage),
});
const recordsAlmanacRoute = createRoute({
  getParentRoute: () => recordsBaseRoute,
  path: "/almanac",
  component: () => withSuspense(AlmanacPage),
});
const recordsHallOfFameRoute = createRoute({
  getParentRoute: () => recordsBaseRoute,
  path: "/hall-of-fame",
  component: () => withSuspense(HallOfFamePage),
});
const recordsMuseumRoute = createRoute({
  getParentRoute: () => recordsBaseRoute,
  path: "/museum",
  component: () => withSuspense(HistoryDashboard),
});
const mediaRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/media",
  component: () => withSuspense(MediaPage),
});

// Redirect old top-level archive routes to nested routes
const historyRedirectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/history",
  beforeLoad: () => {
    throw redirect({ to: "/records/history", replace: true });
  },
  component: () => null,
});
const almanacRedirectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/almanac",
  beforeLoad: () => {
    throw redirect({ to: "/records/almanac", replace: true });
  },
  component: () => null,
});
const hallOfFameRedirectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/hall-of-fame",
  beforeLoad: () => {
    throw redirect({ to: "/records/hall-of-fame", replace: true });
  },
  component: () => null,
});
const museumRedirectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/museum",
  beforeLoad: () => {
    throw redirect({ to: "/records/museum", replace: true });
  },
  component: () => null,
});

// Rikishi specific (Deep Dive)
const rikishiRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/rikishi",
  component: () => withSuspense(RikishiPage),
});
const rikishiIdRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/rikishi/$rikishiId",
  component: () => withSuspense(RikishiPage),
});

const glossaryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/glossary",
  component: () => withSuspense(GlossaryPage),
});

const rivalStablesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/rival-stables",
  component: () => withSuspense(RivalStablesPage),
});

const youthAcademyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/academy",
  component: () => withSuspense(YouthAcademyPage),
});

const notFoundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "$",
  component: () => withSuspense(NotFound),
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  mainMenuRoute,
  newGameRoute,
  dashboardRoute,
  settingsRoute,
  recapRoute,
  weeklyDigestRoute,
  bookmarksRoute,

  // Stable
  stableBaseRoute.addChildren([
    stableIndexRoute,
    stableRosterRoute,
    stableTrainingRoute,
    stableMedicalRoute,
    stableStaffRoute,
    stableOyakataRoute,
    stableInfrastructureRoute,
  ]),
  stableIdRoute,

  // Office
  officeBaseRoute.addChildren([
    officeFinancesNestedRoute,
    officeScoutingNestedRoute,
    officeSponsorsNestedRoute,
    officeFacilitiesRoute,
  ]),
  economyRedirectRoute,
  scoutingRedirectRoute,
  sponsorsRedirectRoute,

  // Association
  jsaBaseRoute.addChildren([
    jsaGovernanceNestedRoute,
    jsaTrendsRoute,
    jsaTalentNestedRoute,
    jsaCandidatePoolRoute,
  ]),
  governanceRedirectRoute,
  talentRedirectRoute,
  jsaMyosekiRoute,

  // Tournament (nested under /basho)
  bashoBaseRoute.addChildren([
    bashoIndexRoute,
    bashoScheduleRoute,
    bashoBanzukeRoute,
    bashoRivalriesRoute,
  ]),
  banzukeRedirectRoute,
  scheduleRedirectRoute,
  rivalriesRedirectRoute,
  globalCupRoute,
  worldCircuitRoute,

  // Archives (nested under /records)
  recordsBaseRoute.addChildren([
    recordsIndexRoute,
    recordsHistoryRoute,
    recordsAlmanacRoute,
    recordsHallOfFameRoute,
    recordsMuseumRoute,
  ]),
  historyRedirectRoute,
  almanacRedirectRoute,
  hallOfFameRedirectRoute,
  museumRedirectRoute,
  mediaRoute,

  // Rikishi
  rikishiRoute,
  rikishiIdRoute,

  // Glossary
  glossaryRoute,

  // Rival Stables & Youth Academy
  rivalStablesRoute,
  youthAcademyRoute,

  notFoundRoute,
]);

export const router = createRouter({
  routeTree,
  history: isElectronProd ? createHashHistory() : createBrowserHistory(),
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
