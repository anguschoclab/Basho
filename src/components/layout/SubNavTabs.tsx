// SubNavTabs — FM-style page-level sub-navigation tabs
// Sits between the top nav bar and the main content area

import { useNavigate, useLocation } from "react-router-dom";

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
  activeTab: string;
  onTabChange?: (tabId: string) => void;
  /** Page title shown left of tabs */
  pageTitle?: string;
}

/**
 * sub nav tabs.
 *  * @param { tabs, activeTab, onTabChange, pageTitle } - The { tabs, active tab, on tab change, page title }.
 */
export function SubNavTabs({ tabs, activeTab, onTabChange, pageTitle }: SubNavTabsProps) {
  const navigate = useNavigate();

  return (
    <div className="border-b border-border bg-card/60 backdrop-blur">
      <div className="flex items-center gap-4 px-4 md:px-6 max-w-[1400px] mx-auto">
        {/* Page title */}
        {pageTitle && (
          <h1 className="font-display font-bold text-sm md:text-base py-2 shrink-0 mr-2">
            {pageTitle}
          </h1>
        )}
        
        {/* Tabs */}
        <nav className="flex items-center gap-0.5 overflow-x-auto scrollbar-none -mb-px">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.href) {
                    navigate(tab.href);
                  } else {
                    onTabChange?.(tab.id);
                  }
                }}
                className={`
                  relative px-3 py-2.5 text-xs font-medium whitespace-nowrap transition-colors
                  ${isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                  }
                `}
              >
                {tab.label}
                {/* Active indicator bar */}
                {isActive && (
                  <span className="absolute bottom-0 left-1 right-1 h-0.5 bg-primary rounded-t-full" />
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
