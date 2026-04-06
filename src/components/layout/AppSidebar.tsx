import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarRail,
  SidebarSeparator,
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
} from "lucide-react";
import { Link, useLocation } from "@tanstack/react-router";
import { useGame } from "@/contexts/GameContext";
import { Badge } from "@/components/ui/badge";

/** app sidebar. */
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

  // Active path: exact match or startsWith with "/" boundary to avoid partial matches
  function isActive(url: string) {
    if (location.pathname === url) return true;
    // Only match prefix if next char is "/" (e.g. /stable/roster matches /stable section but not for /stable item)
    return false;
  }

  // Section-level active: any sub-path starting with this prefix
  function isSectionActive(prefix: string) {
    return location.pathname === prefix || location.pathname.startsWith(prefix + "/");
  }

  const menuGroups = [
    {
      label: null, // no label for top-level items
      items: [
        {
          title: "Dashboard",
          url: "/dashboard",
          icon: LayoutDashboard,
          exactOnly: true,
        },
        {
          title: "Events & Recap",
          url: "/recap",
          icon: Newspaper,
          exactOnly: true,
        },
      ],
    },
    {
      label: "My Stable",
      items: [
        { title: "Overview", url: "/stable", icon: Home, exactOnly: true },
        { title: "Roster", url: "/stable/roster", icon: Users },
        { title: "Training", url: "/stable/training", icon: Dumbbell },
        { title: "Medical", url: "/stable/medical", icon: Heart },
        { title: "Staff & Coaches", url: "/stable/staff", icon: Briefcase },
        { title: "Scouting", url: "/office/scouting", icon: Search, locked: !tutorialCompleted },
      ],
    },
    {
      label: "Tournament",
      items: [
        {
          title: "Current Basho",
          url: "/basho",
          icon: Trophy,
          exactOnly: true,
          badge: inBasho ? `Day ${bashoDay ?? 1}` : undefined,
          badgeClass: "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30",
        },
        { title: "Banzuke", url: "/banzuke", icon: ScrollText },
        { title: "Schedule", url: "/schedule", icon: Calendar },
        { title: "Rivalries", url: "/rivalries", icon: Swords },
      ],
    },
    {
      label: "Management",
      items: [
        {
          title: "Finances",
          url: "/office/finances",
          icon: Coins,
          locked: !tutorialCompleted,
          badge: fundsCritical ? "!" : fundsLow ? "Low" : undefined,
          badgeClass: fundsCritical
            ? "bg-destructive/20 text-destructive border-destructive/30"
            : "bg-warning/20 text-warning border-warning/30",
        },
        { title: "Facilities", url: "/office/facilities", icon: Building2 },
        { title: "Sponsors", url: "/office/sponsors", icon: HandshakeIcon },
      ],
    },
    {
      label: "Association",
      items: [
        { title: "Governance", url: "/jsa/governance", icon: ShieldAlert },
        { title: "Elder Market", url: "/jsa/myoseki", icon: Landmark },
        { title: "Press & Rep", url: "/media", icon: Newspaper },
        { title: "Trends", url: "/jsa/trends", icon: TrendingUp },
      ],
    },
    {
      label: "Records",
      items: [
        { title: "Stable History", url: "/history", icon: Archive },
        { title: "Almanac", url: "/almanac", icon: BookOpen },
        { title: "Hall of Fame", url: "/hall-of-fame", icon: Award },
      ],
    },
  ];

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50 bg-card/50 backdrop-blur-md">
      <SidebarHeader className="p-4 border-b border-border/50">
        <Link to="/dashboard" className="flex items-center gap-3 px-1 hover:opacity-80 transition-opacity">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
            <span className="text-primary-foreground font-bold text-lg">力</span>
          </div>
          <div className="flex flex-col overflow-hidden transition-all duration-300 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0">
            <span className="font-bold text-sm leading-tight tracking-tight uppercase">Basho Manager</span>
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest leading-tight">Pro Edition v2.0</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="custom-scrollbar">
        {menuGroups.map((group, groupIdx) => (
          <SidebarGroup key={groupIdx}>
            {group.label && (
              <SidebarGroupLabel className="px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/70 mb-1 group-data-[collapsible=icon]:hidden">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const itemAny = item as typeof item & { exactOnly?: boolean; badge?: string; badgeClass?: string; locked?: boolean };
                  const active = itemAny.exactOnly
                    ? isActive(item.url)
                    : isSectionActive(item.url);

                  if (itemAny.locked) {
                    return (
                      <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton
                          tooltip={`${item.title} — Complete your first Basho to unlock`}
                          isActive={false}
                          className="mx-2 w-[calc(100%-1rem)] opacity-40 cursor-not-allowed pointer-events-none"
                        >
                          <div className="flex items-center gap-3 w-full">
                            <item.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="group-data-[collapsible=icon]:hidden flex-1 truncate text-muted-foreground">{item.title}</span>
                            <Lock className="h-3 w-3 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden" />
                          </div>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  }

                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        asChild
                        tooltip={item.title}
                        isActive={active}
                        className={`
                          mx-2 w-[calc(100%-1rem)] transition-all duration-200
                          ${active
                            ? "bg-primary/10 text-primary font-semibold shadow-sm shadow-primary/5"
                            : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"}
                        `}
                      >
                        <Link to={item.url as any} className="flex items-center gap-3">
                          <item.icon className={`h-4 w-4 shrink-0 transition-transform duration-300 ${active ? "scale-110" : ""}`} />
                          <span className="group-data-[collapsible=icon]:hidden flex-1 truncate">{item.title}</span>
                          {itemAny.badge && (
                            <Badge
                              variant="outline"
                              className={`group-data-[collapsible=icon]:hidden text-[9px] px-1.5 h-4 shrink-0 font-semibold border ${itemAny.badgeClass ?? "bg-muted text-muted-foreground"}`}
                            >
                              {itemAny.badge}
                            </Badge>
                          )}
                          {active && !itemAny.badge && (
                            <div className="ml-auto w-1 h-4 bg-primary rounded-full group-data-[collapsible=icon]:hidden" />
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

      <SidebarFooter className="p-4 border-t border-border/50">
        {playerHeya && (
          <div className="flex items-center gap-3 px-1 group-data-[collapsible=icon]:justify-center">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 border ${
              fundsCritical ? "bg-destructive/10 border-destructive/30" : "bg-muted border-border/50"
            }`}>
              {fundsCritical
                ? <AlertTriangle className="h-4 w-4 text-destructive" />
                : <Building2 className="h-4 w-4 text-muted-foreground" />
              }
            </div>
            <div className="flex flex-col min-w-0 transition-all duration-300 group-data-[collapsible=icon]:hidden">
              <span className="text-xs font-bold truncate">{playerHeya.name}</span>
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${
                  playerHeya.runwayBand === "secure" ? "bg-emerald-500" :
                  playerHeya.runwayBand === "comfortable" ? "bg-green-500" :
                  playerHeya.runwayBand === "tight" ? "bg-yellow-500" : "bg-red-500"
                }`} />
                <span className={`text-[10px] font-medium uppercase truncate ${fundsCritical ? "text-destructive" : "text-muted-foreground"}`}>
                  {playerHeya.runwayBand}
                </span>
              </div>
            </div>
          </div>
        )}
        {inBasho && (
          <div className="mt-2 px-1 group-data-[collapsible=icon]:hidden">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
              <span className="font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">Tournament</span>
              <span className="font-mono">{bashoDay ?? 1}/15</span>
            </div>
            <div className="w-full bg-muted rounded-full h-1">
              <div
                className="bg-amber-500 h-1 rounded-full transition-all duration-500"
                style={{ width: `${((bashoDay ?? 1) / 15) * 100}%` }}
              />
            </div>
          </div>
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
