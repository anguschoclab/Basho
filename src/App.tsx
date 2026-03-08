import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GameProvider } from "./contexts/GameContext";
import { ThemeProvider } from "./components/ThemeProvider";

import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import StablePage from "./pages/StablePage";
import RikishiPage from "./pages/RikishiPage";
import BashoPage from "./pages/BashoPage";
import BanzukePage from "./pages/BanzukePage";
import RivalriesPage from "./pages/RivalriesPage";
import EconomyPage from "./pages/EconomyPage";
import GovernancePage from "./pages/GovernancePage";
import HistoryPage from "./pages/HistoryPage";
import AlmanacPage from "./pages/AlmanacPage";
import TalentPoolPage from "./pages/TalentPoolPage";
import ScoutingPage from "./pages/ScoutingPage";
import RecapPage from "./pages/RecapPage";
import TrainingPage from "./pages/TrainingPage";
import MainMenu from "./pages/MainMenu";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark">
      <TooltipProvider>
        <GameProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/demo" element={<Index />} />
              <Route path="/main-menu" element={<MainMenu />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/stable" element={<StablePage />} />
              <Route path="/training" element={<TrainingPage />} />
              <Route path="/rikishi/:rikishiId?" element={<RikishiPage />} />
              <Route path="/basho" element={<BashoPage />} />
              <Route path="/banzuke" element={<BanzukePage />} />
              <Route path="/rivalries" element={<RivalriesPage />} />
              <Route path="/economy" element={<EconomyPage />} />
              <Route path="/talent" element={<TalentPoolPage />} />
              <Route path="/scouting" element={<ScoutingPage />} />
              <Route path="/governance" element={<GovernancePage />} />
              <Route path="/recap" element={<RecapPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/almanac" element={<AlmanacPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </GameProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
