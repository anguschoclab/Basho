// App Layout - FM-inspired layout with top nav, sub-nav tabs, and left event log
import { ReactNode, useState } from "react";
import { useGame } from "@/contexts/GameContext";
import { TopNavBar } from "./TopNavBar";
import { EventLogPanel } from "./EventLogPanel";
import { SubNavTabs, type SubNavTab } from "./SubNavTabs";

interface AppLayoutProps {
  children: ReactNode;
  /** Optional sub-navigation tabs for the current page */
  subNavTabs?: SubNavTab[];
  activeSubTab?: string;
  onSubTabChange?: (tabId: string) => void;
  /** Page title shown in the sub-nav bar */
  pageTitle?: string;
}

export function AppLayout({ children, subNavTabs, activeSubTab, onSubTabChange, pageTitle }: AppLayoutProps) {
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
      
      {/* Sub-navigation tabs */}
      {subNavTabs && subNavTabs.length > 0 && activeSubTab && (
        <SubNavTabs
          tabs={subNavTabs}
          activeTab={activeSubTab}
          onTabChange={onSubTabChange}
          pageTitle={pageTitle}
        />
      )}
      
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
