// App Layout - 3-pane FM-inspired layout with persistent Sidebar, Top Nav, and Right Event Log
import { ReactNode, useState } from "react";
import { useGame } from "@/contexts/GameContext";
import { TopNavBar } from "./TopNavBar";
import { AppSidebar } from "./AppSidebar";
import { EventLogPanel } from "./EventLogPanel";
import { SubNavTabs } from "./SubNavTabs";
import { useKeyboardShortcuts, SHORTCUT_REFERENCE } from "@/hooks/useKeyboardShortcuts";
import { openSaveLoadDialog } from "@/components/game/SaveLoadDialog";
import { Badge } from "@/components/ui/badge";
import { Keyboard, PanelRightClose, PanelRightOpen } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

/** Defines the structure for app layout props. */
interface AppLayoutProps {
  children: ReactNode;
  pageTitle?: string;
  subNavTabs?: Array<{ id: string; label: string; href?: string }>;
  activeSubTab?: string;
}

/**
 * app layout.
 * FM-inspired 3-pane layout: Sidebar | Main Content | Event Log
 */
export function AppLayout({ children, pageTitle, subNavTabs, activeSubTab }: AppLayoutProps) {
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
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-background text-foreground overflow-hidden">
        {/* Left Pane: Sidebar */}
        <AppSidebar />

        {/* Middle and Right Panes: Inset contains TopNav, Content, and EventLog */}
        <SidebarInset className="flex flex-col flex-1 overflow-hidden relative">
          {/* Persistent Header */}
          <TopNavBar
            eventLogOpen={eventLogOpen}
            onToggleEventLog={() => setEventLogOpen((v) => !v)}
          />

          <div className="flex flex-1 overflow-hidden">
            {/* Main Content Pane */}
            <main className="flex-1 overflow-y-auto bg-muted/20 custom-scrollbar">
              {/* Optional page title/header if not using sub-nav */}
              {!subNavTabs && pageTitle && (
                <div className="px-4 md:px-8 pt-6 pb-2">
                  <h1 className="text-2xl font-display font-bold text-foreground/90">{pageTitle}</h1>
                </div>
              )}

              {/* Optional Sub-Navigation Tabs */}
              {subNavTabs && (
                <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/50">
                  <div className="px-4 md:px-8 pt-4">
                     <SubNavTabs tabs={subNavTabs} activeTab={activeSubTab} />
                  </div>
                </div>
              )}

              <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
                {children}
              </div>
            </main>

            {/* Right Pane: Event Log (Collapsible) */}
            {eventLogOpen && (
              <aside className="w-80 border-l border-border bg-card/50 backdrop-blur-sm hidden xl:flex flex-col animate-in slide-in-from-right duration-300">
                <EventLogPanel className="h-full" />
              </aside>
            )}
          </div>

          {/* Floaties & Hints */}
          <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2">
            {!eventLogOpen && (
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 bg-card shadow-sm border-border/50 hover:bg-accent"
                onClick={() => setEventLogOpen(true)}
                title="Open Event Log"
              >
                <PanelRightOpen className="h-4 w-4 text-muted-foreground" />
              </Button>
            )}
            
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="h-9 w-9 flex items-center justify-center rounded-lg bg-card/80 backdrop-blur border border-border/50 cursor-help shadow-sm">
                  <Keyboard className="h-4 w-4 text-muted-foreground" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="left" className="p-3 w-64">
                <div className="space-y-2">
                  <div className="font-semibold text-xs border-b pb-1.5 mb-2">Keyboard Shortcuts</div>
                  {SHORTCUT_REFERENCE.map((s) => (
                    <div key={s.key} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{s.action}</span>
                      <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0 h-4">
                        {s.key}
                      </Badge>
                    </div>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
