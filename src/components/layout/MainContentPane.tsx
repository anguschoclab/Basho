import { ReactNode } from "react";
import { SubNavTabs } from "./SubNavTabs";

interface MainContentPaneProps {
  children: ReactNode;
  pageTitle?: string;
  subNavTabs?: Array<{ id: string; label: string; href?: string }>;
  activeSubTab?: string;
}

export function MainContentPane({
  children,
  pageTitle,
  subNavTabs,
  activeSubTab,
}: MainContentPaneProps) {
  return (
    <main
      id="main-content"
      className="flex-1 overflow-y-auto custom-scrollbar scroll-smooth"
      style={{ background: "hsl(var(--background))" }}
    >
      {/* Page title when there's no sub-nav */}
      {!subNavTabs && pageTitle && (
        <div className="px-6 md:px-10 pt-8 pb-3">
          <h1
            className="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {pageTitle}
          </h1>
        </div>
      )}

      {/* Sub-navigation */}
      {subNavTabs && (
        <div
          className="sticky top-0 z-30 border-b"
          style={{
            background: "hsl(var(--card))",
            borderColor: "hsl(var(--border))",
            boxShadow: "0 1px 0 hsl(var(--border))",
          }}
        >
          <div className="px-6 md:px-8 py-0 flex items-center justify-between">
            <div className="flex-1 overflow-x-auto no-scrollbar">
              <SubNavTabs tabs={subNavTabs} activeTab={activeSubTab} />
            </div>
            {pageTitle && (
              <div className="ml-4 hidden lg:block shrink-0">
                <span
                  className="text-[9px] uppercase text-[hsl(var(--muted-foreground)/0.55)]"
                  style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.2em" }}
                >
                  {pageTitle}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-5 md:p-8 lg:p-10 max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-1 duration-500 ease-out">
        {children}
      </div>
    </main>
  );
}
