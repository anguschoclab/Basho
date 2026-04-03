// SubNavTabs — FM-style page-level sub-navigation tabs
// Sits between the top nav bar and the main content area

import { useNavigate, useLocation } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TooltipWrap } from "@/components/ui/tooltip-wrap";

/** Defines the structure for sub nav tab. */
export interface SubNavTab {
  id: string;
  label: string;
  /** If provided, clicking navigates to this URL instead of using the tab id */
  href?: string;
}

/** Defines the structure for sub nav tabs props. */
interface SubNavTabsProps {
  tabs: SubNavTab[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  /** Page title shown left of tabs */
  pageTitle?: string;
  className?: string;
}

/**
 * sub nav tabs.
 * FM-inspired sub-navigation for deep-dives.
 */
export function SubNavTabs({ tabs, activeTab, onTabChange, pageTitle, className }: SubNavTabsProps) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className={cn("border-b border-border/50 bg-card/30 backdrop-blur-md sticky top-0 z-30", className)}>
      <div className="flex items-center h-12 px-6 max-w-[1600px] mx-auto gap-8">
        {/* Page title */}
        {pageTitle && (
          <div className="flex items-center gap-3 shrink-0 py-1">
            <h1 className="font-bold text-sm uppercase tracking-tight text-foreground">
              {pageTitle}
            </h1>
            <div className="h-4 w-[1px] bg-border/60" />
          </div>
        )}
        
        {/* Tabs */}
        <nav className="flex items-center h-full gap-1 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id || (tab.href && location.pathname === tab.href);
            return (
              <TooltipWrap key={tab.id} content={`View ${tab.label} section`} side="bottom">
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (tab.href) {
                      navigate({ to: tab.href as any });
                    } else {
                      onTabChange?.(tab.id);
                    }
                  }}
                  className={cn(
                    "relative h-full px-4 flex items-center text-xs font-bold transition-all duration-200 group hover:bg-transparent rounded-none",
                    isActive
                      ? "text-primary hover:text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span className="relative z-10">{tab.label.toUpperCase()}</span>
                  
                  {/* Hover effect background */}
                  {!isActive && (
                    <div className="absolute inset-x-1 inset-y-2 rounded-md bg-muted/0 group-hover:bg-muted/50 transition-colors duration-200" />
                  )}

                  {/* Active indicator bar */}
                  {isActive && (
                    <div className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-primary animate-in fade-in slide-in-from-bottom-1 duration-300 shadow-[0_-2px_10px_rgba(var(--primary),0.3)]" />
                  )}
                </Button>
              </TooltipWrap>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
