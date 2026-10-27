// App Layout - 3-pane FM-inspired layout with persistent Sidebar, Top Nav, and Right Event Log
import { ReactNode, useState } from "react";
import { useGame } from "@/state/game/useGame";
import { TopNavBar } from "@/components/layout/TopNavBar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { EventLogPanel } from "@/components/layout/EventLogPanel";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { MobileEventLog } from "@/components/layout/MobileEventLog";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { openSaveLoadDialog } from "@/components/menu/saveLoadDialogSignal";
import { MainContentPane } from "@/components/layout/MainContentPane";
import { FloatingShortcuts } from "@/components/layout/FloatingShortcuts";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { projectEventLogData } from "@/presenters/uiDigest";

/** Defines the structure for app layout props. */
interface AppLayoutProps {
  children: ReactNode;
  pageTitle?: string;
  subNavTabs?: Array<{ id: string; label: string; href?: string }>;
  activeSubTab?: string;
  breadcrumbItems?: Array<{ label: string; href: string; isCurrent?: boolean }>;
}

/**
 * app layout.
 * FM-inspired 3-pane layout: Sidebar | Main Content | Event Log
 */
export function AppLayout({
  children,
  pageTitle,
  subNavTabs,
  activeSubTab,
  breadcrumbItems,
}: AppLayoutProps) {
  const { state } = useGame();
  const world = state.world;
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
          <TopNavBar />

          {/* Breadcrumbs - shown when world is loaded */}
          {world && (
            <div className="px-4 py-2 border-b border-border/50 bg-card/30">
              <Breadcrumbs items={breadcrumbItems} world={world} />
            </div>
          )}

          <div className="flex flex-1 overflow-hidden">
            {/* Main Content Pane */}
            <MainContentPane
              pageTitle={pageTitle}
              subNavTabs={subNavTabs}
              activeSubTab={activeSubTab}
            >
              {children}
            </MainContentPane>

            {/* Right Pane: Event Log (Collapsible) */}
            {eventLogOpen && (
              <aside className="w-80 border-l border-border bg-card/50 hidden xl:flex flex-col animate-in slide-in-from-right duration-300">
                <EventLogPanel
                  className="h-full"
                  eventLogData={world ? projectEventLogData(world) : null}
                />
              </aside>
            )}
          </div>

          {/* Floaties & Hints */}
          <FloatingShortcuts eventLogOpen={eventLogOpen} setEventLogOpen={setEventLogOpen} />

          {/* Mobile Event Log FAB */}
          <MobileEventLog />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
