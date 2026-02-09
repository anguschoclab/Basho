// App Layout - Main layout wrapper with sidebar
// Provides consistent navigation and structure

import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useGame } from "@/contexts/GameContext";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { state } = useGame();
  
  // Don't show sidebar on menu screen
  if (state.phase === "menu") {
    return <>{children}</>;
  }

  return (
    <SidebarProvider defaultOpen>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
            <SidebarTrigger className="-ml-1">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Menu className="h-4 w-4" />
                <span className="sr-only">Toggle sidebar</span>
              </Button>
            </SidebarTrigger>
            
            <div className="flex-1" />
            
            {/* Quick status in header */}
            {state.world?.currentBasho && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Day</span>
                <span className="font-display font-semibold">
                  {state.world.currentBasho.day}日目
                </span>
              </div>
            )}
          </header>
          
          <main className="flex-1">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
