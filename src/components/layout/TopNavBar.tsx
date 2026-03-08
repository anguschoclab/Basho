import { useLocation, useNavigate } from "react-router-dom";
import { useGame } from "@/contexts/GameContext";
import { SaveLoadDialog } from "@/components/game/SaveLoadDialog";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
  Scale,
  Search,
  UserSearch,
  Newspaper,
  Dumbbell,
  ChevronDown,
  Sun,
  Moon,
  Settings,
  Play,
  FastForward,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import type { ReactNode } from "react";

interface NavGroup {
  label: string;
  items: { title: string; url: string; icon: any }[];
}

const navGroups: NavGroup[] = [
  {
    label: "Stable",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { title: "My Stable", url: "/stable", icon: Home },
      { title: "Training", url: "/training", icon: Dumbbell },
      { title: "Rikishi", url: "/rikishi", icon: Users },
    ],
  },
  {
    label: "Competition",
    items: [
      { title: "Basho", url: "/basho", icon: Trophy },
      { title: "Banzuke", url: "/banzuke", icon: ScrollText },
      { title: "Rivalries", url: "/rivalries", icon: Swords },
    ],
  },
  {
    label: "Management",
    items: [
      { title: "Economy", url: "/economy", icon: Coins },
      { title: "Scouting", url: "/scouting", icon: Search },
      { title: "Talent Pools", url: "/talent", icon: UserSearch },
      { title: "Governance", url: "/governance", icon: Scale },
    ],
  },
  {
    label: "Records",
    items: [
      { title: "Recap", url: "/recap", icon: Newspaper },
      { title: "History", url: "/history", icon: History },
      { title: "Almanac", url: "/almanac", icon: BookOpen },
    ],
  },
];

function NavDropdown({ group }: { group: NavGroup }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isGroupActive = group.items.some((i) => location.pathname === i.url);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`gap-1 text-xs font-medium uppercase tracking-wider ${
            isGroupActive ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {group.label}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[180px]">
        {group.items.map((item) => {
          const active = location.pathname === item.url;
          return (
            <DropdownMenuItem
              key={item.url}
              onClick={() => navigate(item.url)}
              className={active ? "bg-primary/10 text-primary" : ""}
            >
              <item.icon className="h-4 w-4 mr-2" />
              {item.title}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Quick nav links visible directly (not in dropdown) for common pages
function QuickNavLink({ url, label, icon: Icon }: { url: string; label: string; icon: any }) {
  const location = useLocation();
  const navigate = useNavigate();
  const active = location.pathname === url;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => navigate(url)}
      className={`text-xs ${active ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"}`}
    >
      <Icon className="h-3.5 w-3.5 mr-1" />
      {label}
    </Button>
  );
}

interface TopNavBarProps {
  eventLogOpen: boolean;
  onToggleEventLog: () => void;
}

export function TopNavBar({ eventLogOpen, onToggleEventLog }: TopNavBarProps) {
  const { state, advanceInterim, advanceOneDay, startBasho } = useGame();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const navigate = useNavigate();
  const world = state.world;

  const playerHeya = world?.playerHeyaId ? world.heyas.get(world.playerHeyaId) : null;
  const inBasho = world?.cyclePhase === "active_basho";
  const bashoDay = world?.currentBasho?.day;

  // Format date display
  const dateLabel = world
    ? `${world.calendar?.year ?? world.year} · W${world.calendar?.currentWeek ?? world.week}`
    : "";

  const phaseLabel = world?.cyclePhase === "active_basho"
    ? `Day ${bashoDay}日目`
    : world?.cyclePhase === "pre_basho"
      ? "Pre-Basho"
      : world?.cyclePhase === "post_basho"
        ? "Post-Basho"
        : "Interim";

  const handleContinue = () => {
    if (!world) return;
    if (world.cyclePhase === "interim" || world.cyclePhase === "pre_basho") {
      advanceOneDay();
    } else if (world.cyclePhase === "post_basho") {
      advanceOneDay();
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      {/* Primary row - brand + nav groups + date/controls */}
      <div className="flex items-center h-11 px-2 gap-1">
        {/* Event log toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={onToggleEventLog}
          title={eventLogOpen ? "Hide event log" : "Show event log"}
        >
          {eventLogOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
        </Button>

        {/* Brand */}
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 px-2 shrink-0"
        >
          <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-display text-xs font-bold">力</span>
          </div>
          <span className="font-display font-bold text-sm hidden sm:inline">Sumo Manager</span>
        </button>

        {/* Stable name */}
        {playerHeya && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/stable")}
            className="text-xs text-muted-foreground hover:text-foreground hidden md:flex"
          >
            {playerHeya.name}
          </Button>
        )}

        {/* Nav groups - hidden on mobile, shown on md+ */}
        <nav className="hidden lg:flex items-center gap-0.5 ml-2">
          {navGroups.map((g) => (
            <NavDropdown key={g.label} group={g} />
          ))}
        </nav>

        {/* Mobile nav - single dropdown */}
        <div className="lg:hidden ml-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                Navigate <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[200px] max-h-[70vh] overflow-y-auto">
              {navGroups.map((g) => (
                <div key={g.label}>
                  <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {g.label}
                  </div>
                  {g.items.map((item) => (
                    <DropdownMenuItem key={item.url} onClick={() => navigate(item.url)}>
                      <item.icon className="h-4 w-4 mr-2" />
                      {item.title}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Save/Load + Theme toggle */}
        {world && <SaveLoadDialog />}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          title="Toggle theme"
        >
          {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* Date / Phase display */}
        {world && (
          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right hidden sm:block">
              <div className="text-[10px] text-muted-foreground leading-tight">{dateLabel}</div>
              <div className="text-xs font-medium leading-tight">{phaseLabel}</div>
            </div>

            {/* Continue button */}
            {!inBasho && (
              <Button
                size="sm"
                className="h-8 gap-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={handleContinue}
              >
                Continue
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Secondary row - quick links (visible on md+) */}
      <div className="hidden md:flex items-center h-8 px-2 gap-0.5 border-t border-border/50 bg-muted/30">
        <QuickNavLink url="/dashboard" label="Overview" icon={LayoutDashboard} />
        <QuickNavLink url="/basho" label="Basho" icon={Trophy} />
        <QuickNavLink url="/banzuke" label="Banzuke" icon={ScrollText} />
        <QuickNavLink url="/rikishi" label="Rikishi" icon={Users} />
        <QuickNavLink url="/stable" label="Stable" icon={Home} />
        <QuickNavLink url="/economy" label="Economy" icon={Coins} />
        <QuickNavLink url="/scouting" label="Scouting" icon={Search} />
      </div>
    </header>
  );
}
