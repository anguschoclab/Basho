import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GameProvider } from "./contexts/GameContext";

import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import StablePage from "./pages/StablePage";
import RikishiPage from "./pages/RikishiPage";
import BashoPage from "./pages/BashoPage";
import BanzukePage from "./pages/BanzukePage";
import RivalriesPage from "./pages/RivalriesPage";
import EconomyPage from "./pages/EconomyPage";
import GovernancePage from "./pages/GovernancePage"; // NEW IMPORT
import HistoryPage from "./pages/HistoryPage";
import AlmanacPage from "./pages/AlmanacPage";
import TalentPoolPage from "./pages/TalentPoolPage";
import MainMenu from "./pages/MainMenu";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <GameProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/*
              IMPORTANT:
              / previously routed to <Index /> which runs a standalone demo bout sim (engine/bout.ts)
              and bypasses the world orchestration (engine/world.ts) used by the actual game.
              Keep the demo accessible at /demo, but make / the real game entry.
            */}
            <Route path="/" element={<Dashboard />} />
            <Route path="/demo" element={<Index />} />
            <Route path="/main-menu" element={<MainMenu />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/stable" element={<StablePage />} />
            <Route path="/rikishi/:rikishiId?" element={<RikishiPage />} />
            <Route path="/basho" element={<BashoPage />} />
            <Route path="/banzuke" element={<BanzukePage />} />
            <Route path="/rivalries" element={<RivalriesPage />} />
            <Route path="/economy" element={<EconomyPage />} />
            <Route path="/talent" element={<TalentPoolPage />} />
            <Route path="/governance" element={<GovernancePage />} /> {/* NEW ROUTE */}
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/almanac" element={<AlmanacPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </GameProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
