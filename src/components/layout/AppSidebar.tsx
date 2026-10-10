/**
 * AppSidebar.tsx
 *
 * Application sidebar — composition shell. Sections live in
 * ./AppSidebarSections.tsx (brand, nav groups, status footer).
 */

import { Sidebar, SidebarContent, SidebarRail } from "@/components/ui/sidebar";
import { useLocation } from "@tanstack/react-router";
import { useRef, useEffect } from "react";
import { useGame } from "@/contexts/useGame";
import { getMenuGroups } from "./sidebarConfig";
import { getPlayerHeya } from "@/presenters/engineAccess";
import { SidebarBrand, SidebarNav, SidebarStatusFooter } from "./AppSidebarSections";

export function AppSidebar() {
  const { state } = useGame();
  const location = useLocation();
  const world = state.world;
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollPosRef = useRef<number>(0);

  const isLoaded = !!world;
  const tutorialCompleted = world?.tutorialState?.completed ?? false;
  const playerHeya = isLoaded && world ? (getPlayerHeya(world) ?? null) : null;

  const inBasho = world?.cyclePhase === "active_basho";
  const bashoDay = world?.currentBasho?.day;
  const fundsLow =
    playerHeya && ["tight", "critical", "desperate"].includes(playerHeya.runwayBand ?? "");
  const fundsCritical =
    playerHeya && ["critical", "desperate"].includes(playerHeya.runwayBand ?? "");

  function isActive(url: string) {
    return location.pathname === url;
  }

  function isSectionActive(prefix: string) {
    return location.pathname === prefix || location.pathname.startsWith(prefix + "/");
  }

  const menuGroups = getMenuGroups(
    tutorialCompleted,
    inBasho,
    bashoDay,
    !!fundsLow,
    !!fundsCritical
  );

  // Capture scroll position as user scrolls
  const handleScroll = () => {
    if (contentRef.current) {
      scrollPosRef.current = contentRef.current.scrollTop;
    }
  };

  // Restore scroll position after navigation.
  // useEffect + rAF: runs after the browser has finished layout for the new
  // route, preventing the browser's own scroll-to-top from clobbering us.
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const savedPos = scrollPosRef.current;
    const id = requestAnimationFrame(() => {
      el.scrollTop = savedPos;
    });
    return () => cancelAnimationFrame(id);
  }, [location.pathname]);

  return (
    <Sidebar
      collapsible="icon"
      className="border-r-0 bg-[hsl(var(--sidebar-background))]"
      style={{
        /* Subtle washi paper dot texture */
        backgroundImage:
          "radial-gradient(circle, hsl(var(--sidebar-foreground) / 0.04) 1px, transparent 1px)",
        backgroundSize: "16px 16px",
      }}
    >
      <SidebarBrand />

      <SidebarContent
        ref={contentRef}
        onScroll={handleScroll}
        className="custom-scrollbar overflow-x-hidden"
      >
        <SidebarNav menuGroups={menuGroups} isActive={isActive} isSectionActive={isSectionActive} />
      </SidebarContent>

      <SidebarStatusFooter
        playerHeya={playerHeya}
        fundsCritical={!!fundsCritical}
        inBasho={!!inBasho}
        bashoDay={bashoDay}
      />

      <SidebarRail />
    </Sidebar>
  );
}
