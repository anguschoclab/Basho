// @ts-nocheck
import {
  createRouter,
  createRoute,
  createRootRoute,
  Outlet,
  createHashHistory,
  createBrowserHistory,
  redirect,
} from "@tanstack/react-router";
import MainMenu from "./pages/MainMenu";
import NewGameWizard from "./pages/NewGameWizard";
import Dashboard from "./pages/Dashboard";
import StablePage from "./pages/StablePage";
import TrainingPage from "./pages/TrainingPage";
import OyakataPage from "./pages/OyakataPage";
import RikishiPage from "./pages/RikishiPage";
import BashoPage from "./pages/BashoPage";
import SchedulePage from "./pages/SchedulePage";
import BanzukePage from "./pages/BanzukePage";
import RivalriesPage from "./pages/RivalriesPage";
import EconomyPage from "./pages/EconomyPage";
import TalentPoolPage from "./pages/TalentPoolPage";
import FacilitiesPage from "./pages/FacilitiesPage";
import RecapPage from "./pages/RecapPage";
import HistoryPage from "./pages/HistoryPage";
import AlmanacPage from "./pages/AlmanacPage";
import MediaPage from "./pages/MediaPage";
import HallOfFamePage from "./pages/HallOfFamePage";
import InjuryRecoveryPage from "./pages/InjuryRecoveryPage";
import SponsorManagementPage from "./pages/SponsorManagementPage";
import SettingsPage from "./pages/SettingsPage";
import StaffPage from "./pages/StaffPage";
import TrendsPage from "./pages/TrendsPage";
import ScoutingPage from "./pages/ScoutingPage";
import GovernancePage from "./pages/GovernancePage";
import MyosekiMarketPage from "./pages/MyosekiMarketPage";
import NotFound from "./pages/NotFound";
import { HistoryDashboard } from "./pages/HistoryDashboard";
import GlobalCupPage from "./pages/GlobalCupPage";
import RegionalHubPage from "./pages/RegionalHubPage";

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
  errorComponent: ({ error }) => {
    console.error("Root Route Error caught by TanStack Router:", error);
    return (
      <div className="p-10 bg-destructive/10 text-destructive border border-destructive rounded-lg m-10">
        <h1 className="text-2xl font-bold mb-4">Application Error</h1>
        <p className="font-mono text-sm whitespace-pre-wrap">
          {error instanceof Error ? error.message : String(error)}
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
  // MainMenu handles autosave loading internally.
  beforeLoad: async () => {
    throw redirect({ to: "/main-menu", replace: true });
  },
  component: () => null,
});
const mainMenuRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/main-menu",
  component: MainMenu,
});
const newGameRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/new-game",
  component: NewGameWizard,
});
const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  component: Dashboard,
});
const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: SettingsPage,
});
const recapRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/recap",
  component: RecapPage,
});

// --- STABLE SECTION ---
const stableBaseRoute = createRoute({ getParentRoute: () => rootRoute, path: "/stable" });
const stableIndexRoute = createRoute({
  getParentRoute: () => stableBaseRoute,
  path: "/",
  component: StablePage,
});
const stableIdRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/stable/$id",
  component: StablePage,
});
const stableRosterRoute = createRoute({
  getParentRoute: () => stableBaseRoute,
  path: "/roster",
  beforeLoad: () => {
    throw redirect({ to: "/rikishi", replace: true });
  },
  component: () => null,
});
const stableTrainingRoute = createRoute({
  getParentRoute: () => stableBaseRoute,
  path: "/training",
  component: TrainingPage,
});
const stableMedicalRoute = createRoute({
  getParentRoute: () => stableBaseRoute,
  path: "/medical",
  component: InjuryRecoveryPage,
});
const stableStaffRoute = createRoute({
  getParentRoute: () => stableBaseRoute,
  path: "/staff",
  component: StaffPage,
});
const stableOyakataRoute = createRoute({
  getParentRoute: () => stableBaseRoute,
  path: "/oyakata",
  component: OyakataPage,
});

// --- OFFICE SECTION ---
const officeBaseRoute = createRoute({ getParentRoute: () => rootRoute, path: "/office" });
const officeFinanceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/economy",
  component: EconomyPage,
}); // Keep for legacy compat
const officeFinancesNestedRoute = createRoute({
  getParentRoute: () => officeBaseRoute,
  path: "/finances",
  component: EconomyPage,
});
const officeScoutingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/scouting",
  component: ScoutingPage,
});
const officeScoutingNestedRoute = createRoute({
  getParentRoute: () => officeBaseRoute,
  path: "/scouting",
  component: ScoutingPage,
});
const officeSponsorsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/sponsors",
  component: SponsorManagementPage,
});
const officeSponsorsNestedRoute = createRoute({
  getParentRoute: () => officeBaseRoute,
  path: "/sponsors",
  component: SponsorManagementPage,
});
const officeFacilitiesRoute = createRoute({
  getParentRoute: () => officeBaseRoute,
  path: "/facilities",
  component: FacilitiesPage,
});

// --- ASSOCIATION (JSA) SECTION ---
const jsaBaseRoute = createRoute({ getParentRoute: () => rootRoute, path: "/jsa" });
const jsaGovernanceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/governance",
  component: GovernancePage,
});
const jsaGovernanceNestedRoute = createRoute({
  getParentRoute: () => jsaBaseRoute,
  path: "/governance",
  component: GovernancePage,
});
const jsaTrendsRoute = createRoute({
  getParentRoute: () => jsaBaseRoute,
  path: "/trends",
  component: TrendsPage,
});
const jsaTalentRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/talent",
  component: TalentPoolPage,
});
const jsaTalentNestedRoute = createRoute({
  getParentRoute: () => jsaBaseRoute,
  path: "/talent",
  component: TalentPoolPage,
});
const jsaMyosekiRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/myoseki",
  component: MyosekiMarketPage,
});

// --- TOURNAMENT SECTION ---

const bashoRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/basho",
  component: BashoPage,
});
const banzukeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/banzuke",
  component: BanzukePage,
});
const scheduleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/schedule",
  component: SchedulePage,
});
const rivalriesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/rivalries",
  component: RivalriesPage,
});
const globalCupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/global-cup",
  component: GlobalCupPage,
});
const worldCircuitRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/world-circuit",
  component: RegionalHubPage,
});

// --- ARCHIVES SECTION ---
const historyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/history",
  component: HistoryPage,
});
const museumRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/museum",
  component: HistoryDashboard,
});
const almanacRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/almanac",
  component: AlmanacPage,
});
const mediaRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/media",
  component: MediaPage,
});
const hallOfFameRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/hall-of-fame",
  component: HallOfFamePage,
});

// Rikishi specific (Deep Dive)
const rikishiRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/rikishi",
  component: RikishiPage,
});
const rikishiIdRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/rikishi/$rikishiId",
  component: RikishiPage,
});

const notFoundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "$",
  component: NotFound,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  mainMenuRoute,
  newGameRoute,
  dashboardRoute,
  settingsRoute,
  recapRoute,

  // Stable
  stableBaseRoute.addChildren([
    stableIndexRoute,
    stableRosterRoute,
    stableTrainingRoute,
    stableMedicalRoute,
    stableStaffRoute,
    stableOyakataRoute,
  ]),
  stableIdRoute,

  // Office
  officeBaseRoute.addChildren([
    officeFinancesNestedRoute,
    officeScoutingNestedRoute,
    officeSponsorsNestedRoute,
    officeFacilitiesRoute,
  ]),
  officeFinanceRoute,
  officeScoutingRoute,
  officeSponsorsRoute,

  // Association
  jsaBaseRoute.addChildren([jsaGovernanceNestedRoute, jsaTrendsRoute, jsaTalentNestedRoute]),
  jsaGovernanceRoute,
  jsaTalentRoute,
  jsaMyosekiRoute,

  // Tournament (legacy top-level for now)
  bashoRoute,
  banzukeRoute,
  scheduleRoute,
  rivalriesRoute,
  globalCupRoute,
  worldCircuitRoute,

  // Archives
  historyRoute,
  museumRoute,
  almanacRoute,
  mediaRoute,
  hallOfFameRoute,

  // Rikishi
  rikishiRoute,
  rikishiIdRoute,

  notFoundRoute,
]);

export const router = createRouter({
  routeTree,
  history: isElectronProd ? createHashHistory() : createBrowserHistory(),
  notFoundComponent: () => {
    console.warn("[Routes] 404: Not Found Component Triggered");
    return <NotFound />;
  },
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
