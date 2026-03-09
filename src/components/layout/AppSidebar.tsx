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
  Menu,
  CalendarDays,
  Scale,
  Search,
  UserSearch,
  Newspaper,
  Dumbbell,
  Crown,
  Award,
  Heart,
  HandshakeIcon,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useGame } from "@/contexts/GameContext";

// Menu items.
const items = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Stable",
    url: "/stable",
    icon: Home,
  },
  {
    title: "Training",
    url: "/training",
    icon: Dumbbell,
  },
  {
    title: "Oyakata",
    url: "/oyakata",
    icon: Crown,
  },
  {
    title: "Rikishi",
    url: "/rikishi",
    icon: Users,
  },
  {
    title: "Basho",
    url: "/basho",
    icon: Trophy,
  },
  {
    title: "Schedule",
    url: "/schedule",
    icon: CalendarDays,
  },
  {
    title: "Banzuke",
    url: "/banzuke",
    icon: ScrollText,
  },
  {
    title: "Rivalries",
    url: "/rivalries",
    icon: Swords,
  },
  {
    title: "Injuries",
    url: "/injuries",
    icon: Heart,
  },
  {
    title: "Economy",
    url: "/economy",
    icon: Coins,
  },
  {
    title: "Scouting",
    url: "/scouting",
    icon: Search,
  },
  {
    title: "Talent Pools",
    url: "/talent",
    icon: UserSearch,
  },
  {
    title: "Sponsors",
    url: "/sponsors",
    icon: HandshakeIcon,
  },
  {
    title: "Governance",
    url: "/governance",
    icon: Scale,
  },
  {
    title: "Recap",
    url: "/recap",
    icon: Newspaper,
  },
  {
    title: "History",
    url: "/history",
    icon: History,
  },
  {
    title: "Almanac",
    url: "/almanac",
    icon: BookOpen,
  },
  {
    title: "Media",
    url: "/media",
    icon: Newspaper,
  },
  {
    title: "Hall of Fame",
    url: "/hall-of-fame",
    icon: Award,
  },
];

function describeRunwayBrief(funds: number): { label: string; color: string } {
  if (funds >= 50_000_000) return { label: "Secure", color: "text-emerald-500" };
  if (funds >= 20_000_000) return { label: "Comfortable", color: "text-green-500" };
  if (funds >= 5_000_000) return { label: "Tight", color: "text-yellow-500" };
  if (funds >= 1_000_000) return { label: "Critical", color: "text-orange-500" };
  return { label: "Desperate", color: "text-red-500" };
}

export function AppSidebar() {
  const { state } = useGame();
  
  const isLoaded = !!state.world;
  const playerHeya = isLoaded && state.world?.playerHeyaId
    ? state.world.heyas.get(state.world.playerHeyaId) 
    : null;

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b">
        <div className="flex items-center gap-2 font-bold text-xl">
          <Menu className="h-6 w-6" />
          <span>Sumo Manager</span>
        </div>
        {playerHeya && (
          <div className="mt-4">
            <div className="text-sm font-medium text-muted-foreground">My Stable</div>
            <div className="font-bold truncate">{playerHeya.name}</div>
            {(() => {
              const runway = describeRunwayBrief(playerHeya.funds);
              return (
                <div className={`text-xs font-medium mt-1 ${runway.color}`}>
                  {runway.label}
                </div>
              );
            })()}
          </div>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink 
                      to={item.url}
                      className={({ isActive }) => 
                        isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""
                      }
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
