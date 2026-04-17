import { useNavigate, useLocation } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { TooltipWrap } from "@/components/ui/tooltip-wrap";

export interface SubNavTab {
  id: string;
  label: string;
  href?: string;
}

interface SubNavTabsProps {
  tabs: SubNavTab[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  pageTitle?: string;
  className?: string;
}

export function SubNavTabs({
  tabs,
  activeTab,
  onTabChange,
  pageTitle,
  className,
}: SubNavTabsProps) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className={cn("flex items-center h-11 gap-0 overflow-x-auto no-scrollbar", className)}>
      {/* Optional page title */}
      {pageTitle && (
        <div className="flex items-center gap-3 shrink-0 pr-5">
          <h1
            className="font-semibold text-[11px] uppercase text-[hsl(var(--muted-foreground))]"
            style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.18em" }}
          >
            {pageTitle}
          </h1>
          <div className="h-4 w-px bg-[hsl(var(--border))]" />
        </div>
      )}

      {/* Tabs */}
      <nav className="flex items-center h-full" aria-label="Sub navigation">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id || (tab.href && location.pathname === tab.href);
          return (
            <TooltipWrap key={tab.id} content={`View ${tab.label}`} side="bottom">
              <button
                aria-current={isActive ? "page" : undefined}
                onClick={() => {
                  if (tab.href) {
                    navigate({ to: tab.href });
                  } else {
                    onTabChange?.(tab.id);
                  }
                }}
                className={cn(
                  "relative h-full px-4 flex items-center transition-all duration-150 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
                  isActive
                    ? "text-[hsl(var(--primary))]"
                    : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                )}
                style={{ fontFamily: "var(--font-mono)" }}
              >
                <span className="text-[11px] font-semibold tracking-wider uppercase relative z-10">
                  {tab.label}
                </span>

                {/* Hover background */}
                {!isActive && (
                  <span className="absolute inset-x-1 inset-y-2 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-[hsl(var(--muted)/0.5)]" />
                )}

                {/* Active underline — gold rule */}
                {isActive && (
                  <span
                    className="absolute bottom-0 left-1 right-1 h-[2px] rounded-t"
                    style={{
                      background:
                        "linear-gradient(to right, hsl(var(--gold) / 0.6), hsl(var(--primary)), hsl(var(--gold) / 0.6))",
                      boxShadow: "0 -1px 8px hsl(var(--primary) / 0.3)",
                      animation: "fadeIn 0.2s ease-out",
                    }}
                  />
                )}
              </button>
            </TooltipWrap>
          );
        })}
      </nav>
    </div>
  );
}
