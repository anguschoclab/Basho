/**
 * Breadcrumbs.tsx
 * ==============
 * Route-aware breadcrumb navigation for deep page hierarchies.
 * Labels resolve from the real nested route tree; dynamic params
 * (/rikishi/$id, /stable/$id) resolve to entity names from world state.
 * Collapses middle segments on mobile — tap "..." to expand.
 */

import React, { useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { getHeya, getRikishiAnywhere } from "@/presenters/worldAccess";
import type { WorldState } from "@/presenters/uiDigest";

interface BreadcrumbItem {
  label: string;
  href: string;
  isCurrent?: boolean;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  /** World state — used to resolve dynamic route params to entity names. */
  world?: WorldState;
  className?: string;
}

// Route to breadcrumb label mapping — matches the real nested route tree.
// Names align with sidebarConfig.ts canonical labels.
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
  "/jsa/talent": "Talent Pools",
  "/jsa/candidates": "Candidate Pool",
  "/basho": "Basho",
  "/basho/schedule": "Schedule",
  "/basho/banzuke": "Banzuke",
  "/basho/rivalries": "Rivalries",
  "/records": "Records",
  "/records/history": "Stable History",
  "/records/almanac": "Almanac",
  "/records/hall-of-fame": "Hall of Fame",
  "/records/museum": "Museum",
  "/media": "Press & Rep",
  "/myoseki": "Elder Market",
  "/global-cup": "Global Cup",
  "/world-circuit": "World Circuit",
  "/rikishi": "Rikishi",
  "/recap": "Events & Recap",
  "/digest": "Weekly Report",
  "/bookmarks": "Bookmarks",
  "/glossary": "Glossary",
  "/rival-stables": "Rival Stables",
  "/academy": "Youth Academy",
  "/settings": "Settings",
  "/new-game": "New Game",
};

// Section base routes that have no index page — retarget the crumb to the
// section's landing child (matches sidebar ordering).
const SECTION_LANDING: Record<string, string> = {
  "/office": "/office/finances",
  "/jsa": "/jsa/governance",
};

function prettifySegment(segment: string): string {
  return segment
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Resolve a dynamic leaf segment to an entity name from world state. */
function resolveEntityLabel(
  segments: string[],
  index: number,
  world?: WorldState
): string | null {
  if (!world || index === 0) return null;
  const parent = segments[index - 1];
  const id = segments[index];
  if (parent === "rikishi") {
    return getRikishiAnywhere(world, id)?.shikona ?? null;
  }
  if (parent === "stable") {
    return getHeya(world, id)?.name ?? null;
  }
  return null;
}

function generateBreadcrumbs(pathname: string, world?: WorldState): BreadcrumbItem[] {
  const crumbs: BreadcrumbItem[] = [{ label: "Home", href: "/dashboard" }];

  // Build up path segments
  const segments = pathname.split("/").filter(Boolean);
  let currentPath = "";

  for (let i = 0; i < segments.length; i++) {
    currentPath += `/${segments[i]}`;
    const label =
      ROUTE_LABELS[currentPath] ??
      resolveEntityLabel(segments, i, world) ??
      prettifySegment(segments[i]);
    crumbs.push({
      label,
      href: SECTION_LANDING[currentPath] ?? currentPath,
      isCurrent: i === segments.length - 1,
    });
  }

  return crumbs;
}

export function Breadcrumbs({ items, world, className }: BreadcrumbsProps) {
  const location = useLocation();
  const isMobile = useIsMobile();
  const [expanded, setExpanded] = useState(false);
  const breadcrumbs = items || generateBreadcrumbs(location.pathname, world);

  // Mobile: collapse middle segments if more than 3 (expandable via "...")
  const collapsed = isMobile && !expanded && breadcrumbs.length > 3;
  const displayCrumbs = collapsed
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
              <button
                type="button"
                aria-label="Show all breadcrumbs"
                onClick={() => setExpanded(true)}
                className="px-1 text-muted-foreground/50 hover:text-foreground transition-colors"
              >
                ...
              </button>
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

export default Breadcrumbs;
