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
} from "@/components/ui/sidebar";
import { 
  LayoutDashboard, 
  Home, 
  Users, 
  Trophy, 
  ScrollText, 
  Swords, 
  Coins, 
  History, 
  BookOpen, 
  Search,
  UserSearch,
  Newspaper,
  Dumbbell,
  Crown,
  Award,
  Heart,
  HandshakeIcon,
  Building2,
  Briefcase,
  Globe,
  Archive,
  Star,
  Settings,
  ChevronRight,
} from "lucide-react";
import { Link, useLocation } from "@tanstack/react-router";
import { useGame } from "@/contexts/GameContext";
import { Badge } from "@/components/ui/badge";

const menuGroups = [
  {
    label: "Dashboard",
    items: [
      { title: "Home", url: "/dashboard", icon: LayoutDashboard },
      { title: "News Feed", url: "/recap", icon: Newspaper },
    ]
  },
  {
    label: "Stable",
    items: [
      { title: "Overview", url: "/stable", icon: Home },
      { title: "Roster", url: "/rikishi", icon: Users },
      { title: "Training", url: "/training", icon: Dumbbell },
      { title: "Staff", url: "/stable/staff", icon: Briefcase },
      { title: "Medical", url: "/injuries", icon: Heart },
    ]
  },
  {
    label: "Office",
    items: [
      { title: "Finances", url: "/economy", icon: Coins },
      { title: "Scouting", url: "/scouting", icon: Search },
      { title: "Sponsors", url: "/sponsors", icon: HandshakeIcon },
      { title: "Facilities", url: "/stable/facilities", icon: Building2 },
    ]
  },
  {
    label: "Association",
    items: [
      { title: "JSA Trends", url: "/jsa/trends", icon: Globe },
      { title: "Governance", url: "/governance", icon: Crown },
      { title: "Talent Pools", url: "/talent", icon: UserSearch },
    ]
  },
  {
    label: "Tournament",
    items: [
      { title: "Current Basho", url: "/basho", icon: Trophy },
      { title: "Banzuke", url: "/banzuke", icon: ScrollText },
      { title: "Schedule", url: "/schedule", icon: History },
      { title: "Rivalries", url: "/rivalries", icon: Swords },
    ]
  },
  {
    label: "Archives",
    items: [
      { title: "History", url: "/history", icon: Archive },
      { title: "Almanac", url: "/almanac", icon: BookOpen },
      { title: "Hall of Fame", url: "/hall-of-fame", icon: Award },
      { title: "Media", url: "/media", icon: Newspaper },
    ]
  }
];

/** app sidebar. */
export function AppSidebar() {
  const { state } = useGame();
  const location = useLocation();
  
  const isLoaded = !!state.world;
  const playerHeya = isLoaded && state.world?.playerHeyaId
    ? state.world.heyas.get(state.world.playerHeyaId) 
    : null;

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
        {menuGroups.map((group) => (group.items.length > 0 && (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/70 mb-1 group-data-[collapsible=icon]:hidden">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = location.pathname.startsWith(item.url);
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        tooltip={item.title}
                        isActive={isActive}
                        className={`
                          mx-2 w-[calc(100%-1rem)] transition-all duration-200
                          ${isActive 
                            ? "bg-primary/10 text-primary font-semibold shadow-sm shadow-primary/5" 
                            : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"}
                        `}
                      >
                        <Link to={item.url as any} className="flex items-center gap-3">
                          <item.icon className={`h-4 w-4 shrink-0 transition-transform duration-300 ${isActive ? "scale-110" : ""}`} />
                          <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                          {isActive && (
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
        )))}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-border/50">
        {playerHeya && (
          <div className="flex items-center gap-3 px-1 group-data-[collapsible=icon]:justify-center">
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0 border border-border/50">
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex flex-col min-w-0 transition-all duration-300 group-data-[collapsible=icon]:hidden">
              <span className="text-xs font-bold truncate">{playerHeya.name}</span>
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${
                  playerHeya.runwayBand === "secure" ? "bg-emerald-500" :
                  playerHeya.runwayBand === "comfortable" ? "bg-green-500" :
                  playerHeya.runwayBand === "tight" ? "bg-yellow-500" : "bg-red-500"
                }`} />
                <span className="text-[10px] text-muted-foreground font-medium uppercase truncate">
                  {playerHeya.runwayBand}
                </span>
              </div>
            </div>
          </div>
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
