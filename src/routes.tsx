// @ts-nocheck
import { RouterProvider, createRouter, createRoute, createRootRoute } from '@tanstack/react-router'
import App from './App'
import MainMenu from './pages/MainMenu'
import NewGameWizard from './pages/NewGameWizard'
import Dashboard from './pages/Dashboard'
import StablePage from './pages/StablePage'
import TrainingPage from './pages/TrainingPage'
import OyakataPage from './pages/OyakataPage'
import RikishiPage from './pages/RikishiPage'
import BashoPage from './pages/BashoPage'
import SchedulePage from './pages/SchedulePage'
import BanzukePage from './pages/BanzukePage'
import RivalriesPage from './pages/RivalriesPage'
import EconomyPage from './pages/EconomyPage'
import TalentPoolPage from './pages/TalentPoolPage'
import ScoutingPage from './pages/ScoutingPage'
import GovernancePage from './pages/GovernancePage'
import MyosekiMarketPage from './pages/MyosekiMarketPage'
import RecapPage from './pages/RecapPage'
import HistoryPage from './pages/HistoryPage'
import AlmanacPage from './pages/AlmanacPage'
import MediaPage from './pages/MediaPage'
import HallOfFamePage from './pages/HallOfFamePage'
// MyosekiMarketPage already imported above
import InjuryRecoveryPage from './pages/InjuryRecoveryPage'
import SponsorManagementPage from './pages/SponsorManagementPage'
import SettingsPage from './pages/SettingsPage'
import NotFound from './pages/NotFound'
import { Outlet } from '@tanstack/react-router'

const rootRoute = createRootRoute({
  component: () => <Outlet />,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Dashboard,
})

const mainMenuRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/main-menu',
  component: MainMenu,
})

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  component: Dashboard,
})

const stableRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/stable',
  component: StablePage,
})

const stableIdRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/stable/$id',
  component: StablePage,
})

const trainingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/training',
  component: TrainingPage,
})

const oyakataRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/oyakata',
  component: OyakataPage,
})

const rikishiRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/rikishi',
  component: RikishiPage,
})

const rikishiIdRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/rikishi/$rikishiId',
  component: RikishiPage,
})

const bashoRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/basho',
  component: BashoPage,
})

const scheduleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/schedule',
  component: SchedulePage,
})

const banzukeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/banzuke',
  component: BanzukePage,
})

const rivalriesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/rivalries',
  component: RivalriesPage,
})

const economyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/economy',
  component: EconomyPage,
})

const talentRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/talent',
  component: TalentPoolPage,
})

const scoutingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/scouting',
  component: ScoutingPage,
})

const governanceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/governance',
  component: GovernancePage,
})

const recapRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/recap',
  component: RecapPage,
})

const historyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/history',
  component: HistoryPage,
})

const almanacRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/almanac',
  component: AlmanacPage,
})

const mediaRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/media',
  component: MediaPage,
})

const hallOfFameRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/hall-of-fame',
  component: HallOfFamePage,
})

const myosekiRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/myoseki',
  component: MyosekiMarketPage,
})

const injuriesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/injuries',
  component: InjuryRecoveryPage,
})

const sponsorsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sponsors',
  component: SponsorManagementPage,
})

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsPage,
})

// Add catch-all route correctly in Tanstack Router v1

const newGameRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/new-game',
  component: NewGameWizard,
})
const notFoundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '$',
  component: NotFound,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  mainMenuRoute,
  newGameRoute,
  dashboardRoute,
  stableRoute,
  stableIdRoute,
  trainingRoute,
  oyakataRoute,
  rikishiRoute,
  rikishiIdRoute,
  bashoRoute,
  scheduleRoute,
  banzukeRoute,
  rivalriesRoute,
  economyRoute,
  talentRoute,
  scoutingRoute,
  governanceRoute,
  myosekiRoute,
  recapRoute,
  historyRoute,
  almanacRoute,
  mediaRoute,
  hallOfFameRoute,
  injuriesRoute,
  sponsorsRoute,
  settingsRoute,
  notFoundRoute,
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
