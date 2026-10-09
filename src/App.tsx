import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { SonnerToaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RouterProvider } from "@tanstack/react-router";
import { GameProvider } from "./contexts/GameContext";
import { OpfsQuotaListener } from "./components/OpfsQuotaListener";
import { ThemeProvider } from "./components/ThemeProvider";
import { TitleBar } from "./components/TitleBar";
import { router } from "./routes";
import { WorkerInitializer } from "./components/worker/WorkerInitializer";
import { InboxNewsTicker } from "./components/game/InboxNewsTicker";
import { CrisisModal } from "./components/game/CrisisModal";
import { GlobalErrorBanner } from "./components/layout/GlobalErrorBanner";

import { ErrorBoundary } from "./components/ErrorBoundary";

const App = () => {
  useEffect(() => {
    // Sweep stale Radix body locks after each navigation. A dialog that
    // unmounts mid-close-animation during a route change (e.g. the End
    // Basho AlertDialog when the basho_recap phase effect navigates to
    // /recap) can leave pointer-events:none on <body> — deadlocking all
    // user input with no dialog visible. Radix's close animation runs
    // ~150-200ms; sweep after it settles and only when nothing is open.
    const unsub = router.subscribe("onResolved", () => {
      window.setTimeout(() => {
        const anyOpen = document.querySelector(
          '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]'
        );
        if (!anyOpen && document.body.style.pointerEvents === "none") {
          document.body.style.pointerEvents = "";
        }
      }, 400);
    });
    return unsub;
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <GameProvider>
            <WorkerInitializer />
            <InboxNewsTicker />
            <CrisisModal />
            <GlobalErrorBanner />
            <Toaster />
            <OpfsQuotaListener />
            <SonnerToaster />
            <TitleBar />
            <RouterProvider router={router} />
          </GameProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
