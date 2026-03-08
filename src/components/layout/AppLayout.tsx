// App Layout - FM-inspired layout with top nav, sub-nav tabs, and left event log
import { ReactNode, useState } from "react";
import { useGame } from "@/contexts/GameContext";
import { TopNavBar } from "./TopNavBar";
import { EventLogPanel } from "./EventLogPanel";
import { SubNavTabs, type SubNavTab } from "./SubNavTabs";
import { useKeyboardShortcuts, SHORTCUT_REFERENCE } from "@/hooks/useKeyboardShortcuts";
import { openSaveLoadDialog } from "@/components/game/SaveLoadDialog";
import { Badge } from "@/components/ui/badge";
import { Keyboard } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AppLayoutProps {
  children: ReactNode;
  subNavTabs?: SubNavTab[];
  activeSubTab?: string;
  onSubTabChange?: (tabId: string) => void;
  pageTitle?: string;
}

export function AppLayout({ children, subNavTabs, activeSubTab, onSubTabChange, pageTitle }: AppLayoutProps) {
  const { state } = useGame();
  const [eventLogOpen, setEventLogOpen] = useState(true);

  // Register keyboard shortcuts
  useKeyboardShortcuts({
    eventLogOpen,
    onToggleEventLog: () => setEventLogOpen((v) => !v),
    onOpenSaveLoad: openSaveLoadDialog,
  });

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

      {/* Keyboard shortcuts hint */}
      <div className="fixed bottom-3 right-3 z-40">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="p-2 rounded-lg bg-card/80 backdrop-blur border border-border/50 cursor-help">
              <Keyboard className="h-4 w-4 text-muted-foreground" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-xs">
            <div className="space-y-1.5">
              <div className="font-medium text-xs mb-2">Keyboard Shortcuts</div>
              {SHORTCUT_REFERENCE.map((s) => (
                <div key={s.key} className="flex items-center gap-2 text-xs">
                  <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">
                    {s.key}
                  </Badge>
                  <span className="text-muted-foreground">{s.action}</span>
                </div>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
