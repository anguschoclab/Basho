import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Users,
  Trophy,
  ScrollText,
  Swords,
  Coins,
  History,
  BookOpen,
  Search,
  Newspaper,
  Dumbbell,
  Award,
  Heart,
  HandshakeIcon,
  Building2,
  Briefcase,
  Archive,
  ShieldAlert,
  Landmark,
  TrendingUp,
  Home,
  Calendar,
  AlertTriangle,
  Lock,
  ChevronRight,
} from "lucide-react";
import { Link, useLocation } from "@tanstack/react-router";
import { useGame } from "@/contexts/GameContext";

export function AppSidebar() {
  const { state } = useGame();
  const location = useLocation();
  const world = state.world;

  const isLoaded = !!world;
  const tutorialCompleted = world?.tutorialState?.completed ?? false;
  const playerHeya = isLoaded && world?.playerHeyaId
    ? world.heyas.get(world.playerHeyaId)
    : null;

  const inBasho = world?.cyclePhase === "active_basho";
  const bashoDay = world?.currentBasho?.day;
  const fundsLow = playerHeya && ["tight", "critical", "desperate"].includes(playerHeya.runwayBand ?? "");
  const fundsCritical = playerHeya && ["critical", "desperate"].includes(playerHeya.runwayBand ?? "");

  function isActive(url: string) {
    return location.pathname === url;
  }

  function isSectionActive(prefix: string) {
    return location.pathname === prefix || location.pathname.startsWith(prefix + "/");
  }

  const menuGroups = [
    {
      label: null,
      items: [
        { title: "Dashboard",       url: "/dashboard",  icon: LayoutDashboard, exactOnly: true },
        { title: "Events & Recap",  url: "/recap",      icon: Newspaper,       exactOnly: true },
      ],
    },
    {
      label: "My Stable",
      items: [
        { title: "Overview",        url: "/stable",             icon: Home,          exactOnly: true },
        { title: "Roster",          url: "/stable/roster",      icon: Users },
        { title: "Training",        url: "/stable/training",    icon: Dumbbell },
        { title: "Medical",         url: "/stable/medical",     icon: Heart },
        { title: "Staff",           url: "/stable/staff",       icon: Briefcase },
        { title: "Scouting",        url: "/office/scouting",    icon: Search,        locked: !tutorialCompleted },
      ],
    },
    {
      label: "Tournament",
      items: [
        {
          title: "Current Basho",   url: "/basho",      icon: Trophy,     exactOnly: true,
          badge: inBasho ? `Day ${bashoDay ?? 1}` : undefined,
          badgeKind: "basho" as const,
        },
        { title: "Banzuke",         url: "/banzuke",    icon: ScrollText },
        { title: "Schedule",        url: "/schedule",   icon: Calendar },
        { title: "Rivalries",       url: "/rivalries",  icon: Swords },
      ],
    },
    {
      label: "Management",
      items: [
        {
          title: "Finances",        url: "/office/finances",    icon: Coins,
          locked: !tutorialCompleted,
          badge: fundsCritical ? "!" : fundsLow ? "Low" : undefined,
          badgeKind: (fundsCritical ? "critical" : "warn") as "critical" | "warn",
        },
        { title: "Facilities",      url: "/office/facilities",  icon: Building2 },
        { title: "Sponsors",        url: "/office/sponsors",    icon: HandshakeIcon },
      ],
    },
    {
      label: "Association",
      items: [
        { title: "Governance",      url: "/jsa/governance",     icon: ShieldAlert },
        { title: "Elder Market",    url: "/jsa/myoseki",        icon: Landmark },
        { title: "Press & Rep",     url: "/media",              icon: Newspaper },
        { title: "Trends",          url: "/jsa/trends",         icon: TrendingUp },
      ],
    },
    {
      label: "Records",
      items: [
        { title: "Stable History",  url: "/history",        icon: Archive },
        { title: "Almanac",         url: "/almanac",        icon: BookOpen },
        { title: "Hall of Fame",    url: "/hall-of-fame",   icon: Award },
      ],
    },
  ];

  return (
    <Sidebar
      collapsible="icon"
      className="border-r-0 bg-[hsl(var(--sidebar-background))]"
      style={{
        /* Subtle washi paper dot texture */
        backgroundImage: "radial-gradient(circle, hsl(var(--sidebar-foreground) / 0.04) 1px, transparent 1px)",
        backgroundSize: "16px 16px",
      }}
    >
      {/* ─ Logo / Identity ─ */}
      <SidebarHeader className="p-3 pb-4">
        <Link
          to="/dashboard"
          className="flex items-center gap-3 px-1 py-1 rounded hover:opacity-85 transition-opacity group"
        >
          {/* 力 kanji in a lacquer-box style */}
          <div
            className="h-8 w-8 rounded shrink-0 flex items-center justify-center relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, hsl(var(--gold)) 0%, hsl(44 68% 40%) 100%)",
              boxShadow: "0 2px 8px hsl(var(--gold) / 0.4), inset 0 1px 0 hsl(38 80% 80% / 0.4)",
            }}
          >
            <span
              className="text-[hsl(222_32%_5%)] font-bold text-lg leading-none select-none"
              style={{ fontFamily: "var(--font-display)", textShadow: "0 1px 2px hsl(0 0% 0% / 0.2)" }}
            >
              力
            </span>
          </div>

          {/* Brand name — hidden when collapsed */}
          <div className="flex flex-col overflow-hidden group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0 transition-all duration-200">
            <span
              className="font-bold text-sm leading-tight text-[hsl(var(--sidebar-foreground))]"
              style={{ fontFamily: "var(--font-display)", letterSpacing: "0.03em" }}
            >
              Basho Manager
            </span>
            <span
              className="text-[9px] text-[hsl(var(--sidebar-foreground)/0.45)] uppercase leading-tight mt-0.5"
              style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.15em" }}
            >
              Pro Edition
            </span>
          </div>
        </Link>

        {/* Thin gold separator line below logo */}
        <div
          className="mt-3 mx-1 h-px group-data-[collapsible=icon]:hidden"
          style={{ background: "linear-gradient(to right, hsl(var(--gold) / 0.4), hsl(var(--gold) / 0.1), transparent)" }}
        />
      </SidebarHeader>

      {/* ─ Navigation ─ */}
      <SidebarContent className="custom-scrollbar overflow-x-hidden">
        {menuGroups.map((group, groupIdx) => (
          <SidebarGroup key={groupIdx} className="py-1 px-0">
            {/* Section label with hairline */}
            {group.label && (
              <div className="flex items-center gap-2 px-3 mb-1.5 group-data-[collapsible=icon]:hidden">
                <span
                  className="text-[9px] text-[hsl(var(--gold)/0.6)] uppercase"
                  style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.2em" }}
                >
                  {group.label}
                </span>
                <div
                  className="flex-1 h-px"
                  style={{ background: "linear-gradient(to right, hsl(var(--gold) / 0.2), transparent)" }}
                />
              </div>
            )}

            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const itemAny = item as typeof item & {
                    exactOnly?: boolean;
                    badge?: string;
                    badgeKind?: "basho" | "critical" | "warn";
                    locked?: boolean;
                  };

                  const active = itemAny.exactOnly
                    ? isActive(item.url)
                    : isSectionActive(item.url);

                  if (itemAny.locked) {
                    return (
                      <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton
                          tooltip={`${item.title} — Complete your first Basho to unlock`}
                          isActive={false}
                          className="mx-1.5 w-[calc(100%-0.75rem)] opacity-35 cursor-not-allowed pointer-events-none py-2 h-auto"
                        >
                          <div className="flex items-center gap-3 w-full">
                            <item.icon className="h-3.5 w-3.5 shrink-0 text-[hsl(var(--sidebar-foreground)/0.4)]" />
                            <span className="group-data-[collapsible=icon]:hidden flex-1 truncate text-[13px] text-[hsl(var(--sidebar-foreground)/0.4)]">
                              {item.title}
                            </span>
                            <Lock className="h-2.5 w-2.5 shrink-0 text-[hsl(var(--sidebar-foreground)/0.3)] group-data-[collapsible=icon]:hidden" />
                          </div>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  }

                  const badgeColor =
                    itemAny.badgeKind === "basho"  ? "hsl(var(--gold))"         :
                    itemAny.badgeKind === "critical"? "hsl(var(--destructive))"  :
                    itemAny.badgeKind === "warn"    ? "hsl(var(--warning))"      : "hsl(var(--muted-foreground))";

                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        asChild
                        tooltip={item.title}
                        isActive={active}
                        className={`
                          mx-1.5 w-[calc(100%-0.75rem)] py-2 h-auto rounded
                          transition-all duration-150
                          ${active
                            ? "bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]"
                            : "hover:bg-[hsl(var(--sidebar-foreground)/0.06)] text-[hsl(var(--sidebar-foreground)/0.7)] hover:text-[hsl(var(--sidebar-foreground))]"}
                        `}
                        style={active ? {
                          boxShadow: "inset 2px 0 0 hsl(var(--gold))",
                          borderRadius: "0 4px 4px 0",
                        } : undefined}
                      >
                        <Link to={item.url as any} className="flex items-center gap-3">
                          <item.icon
                            className={`h-3.5 w-3.5 shrink-0 transition-all duration-150 ${active ? "text-[hsl(var(--gold))]" : ""}`}
                          />
                          <span className="group-data-[collapsible=icon]:hidden flex-1 truncate text-[13px]">
                            {item.title}
                          </span>
                          {itemAny.badge && (
                            <span
                              className="group-data-[collapsible=icon]:hidden shrink-0 rounded px-1.5 py-px text-[9px] font-semibold border"
                              style={{
                                fontFamily: "var(--font-mono)",
                                color: badgeColor,
                                borderColor: `${badgeColor}50`,
                                background: `${badgeColor}15`,
                              }}
                            >
                              {itemAny.badge}
                            </span>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* ─ Footer: Stable Status + Basho Progress ─ */}
      <SidebarFooter className="p-3 pt-2">
        {/* Thin gold separator above footer */}
        <div
          className="mb-3 mx-1 h-px group-data-[collapsible=icon]:hidden"
          style={{ background: "linear-gradient(to right, transparent, hsl(var(--gold) / 0.25), transparent)" }}
        />

        {playerHeya && (
          <div className="flex items-center gap-2.5 px-1 group-data-[collapsible=icon]:justify-center">
            {/* Stable status dot */}
            <div
              className="h-7 w-7 rounded shrink-0 flex items-center justify-center"
              style={{
                background: fundsCritical
                  ? "hsl(var(--destructive) / 0.15)"
                  : "hsl(var(--sidebar-foreground) / 0.08)",
                border: `1px solid ${fundsCritical ? "hsl(var(--destructive) / 0.3)" : "hsl(var(--sidebar-border))"}`,
              }}
            >
              {fundsCritical
                ? <AlertTriangle className="h-3.5 w-3.5 text-[hsl(var(--destructive))]" />
                : <Building2 className="h-3.5 w-3.5 text-[hsl(var(--sidebar-foreground)/0.5)]" />
              }
            </div>

            <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
              <span
                className="text-[12px] font-semibold truncate text-[hsl(var(--sidebar-foreground))]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {playerHeya.name}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{
                    background:
                      playerHeya.runwayBand === "secure"      ? "hsl(var(--success))" :
                      playerHeya.runwayBand === "comfortable" ? "hsl(145 55% 48%)"    :
                      playerHeya.runwayBand === "tight"       ? "hsl(var(--warning))" :
                                                                "hsl(var(--destructive))",
                  }}
                />
                <span
                  className="text-[9px] uppercase truncate text-[hsl(var(--sidebar-foreground)/0.45)]"
                  style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.1em" }}
                >
                  {playerHeya.runwayBand}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Basho day progress — clay track style */}
        {inBasho && (
          <div className="mt-2.5 px-1 group-data-[collapsible=icon]:hidden">
            <div className="flex items-center justify-between mb-1.5">
              <span
                className="text-[9px] uppercase text-[hsl(var(--gold)/0.8)]"
                style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.15em" }}
              >
                Basho
              </span>
              <span
                className="text-[10px] text-[hsl(var(--sidebar-foreground)/0.5)]"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {bashoDay ?? 1} / 15
              </span>
            </div>
            <div
              className="w-full rounded-full h-1.5 overflow-hidden"
              style={{ background: "hsl(var(--sidebar-border))" }}
            >
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${((bashoDay ?? 1) / 15) * 100}%`,
                  background: "linear-gradient(to right, hsl(var(--east)), hsl(var(--gold)))",
                  boxShadow: "0 0 6px hsl(var(--gold) / 0.4)",
                }}
              />
            </div>
          </div>
        )}
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
