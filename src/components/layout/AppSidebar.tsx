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
  Scale 
} from "lucide-react";
import { UserSearch } from "lucide-react";
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
    title: "Economy",
    url: "/economy",
    icon: Coins,
  },
  {
    title: "Talent Pools",
    url: "/talent",
    icon: UserSearch,
  },
  {
    title: "Governance", // NEW MENU ITEM
    url: "/governance",
    icon: Scale,
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
];

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) {
    return `¥${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `¥${(amount / 1_000).toFixed(0)}K`;
  }
  return `¥${amount}`;
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
            <div className="text-xs text-green-600 font-mono mt-1">
              {formatCurrency(playerHeya.funds)}
            </div>
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
