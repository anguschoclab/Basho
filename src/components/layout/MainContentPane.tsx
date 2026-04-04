import { ReactNode } from "react";
import { SubNavTabs } from "./SubNavTabs";

interface MainContentPaneProps {
  children: ReactNode;
  pageTitle?: string;
  subNavTabs?: Array<{ id: string; label: string; href?: string }>;
  activeSubTab?: string;
}

export function MainContentPane({ children, pageTitle, subNavTabs, activeSubTab }: MainContentPaneProps) {
  return (
    <main id="main-content" className="flex-1 overflow-y-auto bg-muted/30 custom-scrollbar scroll-smooth">
      {/* Optional page title/header if not using sub-nav */}
      {!subNavTabs && pageTitle && (
        <div className="px-6 md:px-10 pt-8 pb-4">
          <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">{pageTitle}</h1>
        </div>
      )}

      {/* Optional Sub-Navigation Tabs */}
      {subNavTabs && (
        <div className="sticky top-0 z-30 bg-background/60 backdrop-blur-xl border-b border-border/40 shadow-sm">
          <div className="px-6 md:px-10 py-4 flex items-center justify-between">
             <div className="flex-1 overflow-x-auto no-scrollbar">
                <SubNavTabs tabs={subNavTabs} activeTab={activeSubTab} />
             </div>
             {pageTitle && (
               <div className="ml-4 hidden lg:block">
                 <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">{pageTitle}</span>
               </div>
             )}
          </div>
        </div>
      )}

      <div className="p-6 md:p-10 lg:p-12 max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-2 duration-700 ease-out">
        {children}
      </div>
    </main>
  );
}
