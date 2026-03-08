// App Layout - FM-inspired layout with top nav and left event log
import { ReactNode, useState } from "react";
import { useGame } from "@/contexts/GameContext";
import { TopNavBar } from "./TopNavBar";
import { EventLogPanel } from "./EventLogPanel";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { state } = useGame();
  const [eventLogOpen, setEventLogOpen] = useState(true);

  // Don't show layout on menu screen
  if (state.phase === "menu") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col w-full">
      <TopNavBar
        eventLogOpen={eventLogOpen}
        onToggleEventLog={() => setEventLogOpen((v) => !v)}
      />
      <div className="flex flex-1 overflow-hidden">
        {/* Event log panel - collapsible */}
        {eventLogOpen && (
          <EventLogPanel className="w-72 xl:w-80 shrink-0 hidden sm:flex" />
        )}
        
        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 max-w-[1400px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
