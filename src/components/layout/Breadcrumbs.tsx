/**
 * Breadcrumbs.tsx
 * ==============
 * Route-aware breadcrumb navigation for deep page hierarchies.
 * Collapses middle segments on mobile for space efficiency.
 */

import { Link, useLocation } from "@tanstack/react-router";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href: string;
  isCurrent?: boolean;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  className?: string;
}

// Route to breadcrumb label mapping
const ROUTE_LABELS: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/stable": "Stable",
  "/stable/roster": "Roster",
  "/stable/training": "Training",
  "/stable/medical": "Medical",
  "/stable/staff": "Staff",
  "/stable/oyakata": "Oyakata",
  "/office": "Office",
  "/office/finances": "Finances",
  "/office/facilities": "Facilities",
  "/office/sponsors": "Sponsors",
  "/office/scouting": "Scouting",
  "/jsa": "Association",
  "/jsa/governance": "Governance",
  "/jsa/trends": "Trends",
  "/basho": "Basho",
  "/banzuke": "Banzuke",
  "/schedule": "Schedule",
  "/rivalries": "Rivalries",
  "/history": "History",
  "/almanac": "Almanac",
  "/hall-of-fame": "Hall of Fame",
  "/museum": "Museum",
  "/media": "Media",
  "/myoseki": "Elder Market",
  "/global-cup": "Global Cup",
  "/world-circuit": "World Circuit",
  "/rikishi": "Rikishi",
  "/recap": "Recap",
  "/settings": "Settings",
};

function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const crumbs: BreadcrumbItem[] = [{ label: "Home", href: "/dashboard" }];

  // Build up path segments
  const segments = pathname.split("/").filter(Boolean);
  let currentPath = "";

  for (let i = 0; i < segments.length; i++) {
    currentPath += `/${segments[i]}`;
    const label = ROUTE_LABELS[currentPath] || segments[i];
    crumbs.push({
      label,
      href: currentPath,
      isCurrent: i === segments.length - 1,
    });
  }

  return crumbs;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  const location = useLocation();
  const breadcrumbs = items || generateBreadcrumbs(location.pathname);

  // Mobile: collapse middle segments if more than 3
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const displayCrumbs =
    isMobile && breadcrumbs.length > 3
      ? [
          breadcrumbs[0],
          { label: "...", href: "", isCurrent: false },
          breadcrumbs[breadcrumbs.length - 1],
        ]
      : breadcrumbs;

  if (breadcrumbs.length <= 1) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center gap-1 text-[11px] text-muted-foreground", className)}
    >
      {displayCrumbs.map((crumb, index) => {
        const isLast = index === displayCrumbs.length - 1;
        const isEllipsis = crumb.label === "...";

        return (
          <React.Fragment key={index}>
            {index > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/50" />}

            {isEllipsis ? (
              <span className="px-1 text-muted-foreground/50">...</span>
            ) : isLast ? (
              <span className="font-medium text-foreground px-1" aria-current="page">
                {crumb.label}
              </span>
            ) : (
              <Link
                to={crumb.href}
                className="hover:text-foreground transition-colors px-1 flex items-center gap-1"
              >
                {index === 0 && <Home className="h-3 w-3" />}
                <span className={index === 0 ? "hidden sm:inline" : ""}>{crumb.label}</span>
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

import React from "react";

export default Breadcrumbs;
