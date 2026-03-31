import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { GameProvider } from "./contexts/GameContext";
import { OpfsQuotaListener } from "./components/OpfsQuotaListener";
import { ThemeProvider } from "./components/ThemeProvider";
import ScoutingPage from './pages/ScoutingPage';
import { HistoryDashboard } from './pages/HistoryDashboard';
import { router } from "./routes";

const queryClient = new QueryClient();

import { WorkerInitializer } from "./components/worker/WorkerInitializer";
import { InboxNewsTicker } from "./components/game/InboxNewsTicker";
import { CrisisModal } from "./components/game/CrisisModal";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark">
      <TooltipProvider>
        <GameProvider>
          <WorkerInitializer />
          <InboxNewsTicker />
          <CrisisModal />
          <Toaster />
          <OpfsQuotaListener />
          <Sonner />
          <RouterProvider router={router} />
        </GameProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
