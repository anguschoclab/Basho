/**
 * sidebarConfig.ts
 *
 * Configuration and helper functions for AppSidebar.
 */

import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  Trophy,
  ScrollText,
  Swords,
  Coins,
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
  Globe,
  Crown,
  Bookmark,
  GraduationCap,
  UsersRound,
} from "lucide-react";

export interface MenuItem {
  title: string;
  url: string;
  icon: LucideIcon;
  exactOnly?: boolean;
  badge?: string;
  badgeKind?: "basho" | "critical" | "warn";
  locked?: boolean;
}

export interface MenuGroup {
  label: string | null;
  items: MenuItem[];
}

export function getMenuGroups(
  tutorialCompleted: boolean,
  inBasho: boolean,
  bashoDay: number | undefined,
  fundsLow: boolean,
  fundsCritical: boolean
): MenuGroup[] {
  return [
    {
      label: null,
      items: [
        { title: "Control Center", url: "/dashboard", icon: LayoutDashboard, exactOnly: true },
        { title: "Events & Recap", url: "/recap", icon: Newspaper, exactOnly: true },
        { title: "Weekly Report", url: "/digest", icon: TrendingUp, exactOnly: true },
      ],
    },
    {
      label: "My Stable",
      items: [
        { title: "Overview", url: "/stable", icon: Home, exactOnly: true },
        { title: "Roster", url: "/stable/roster", icon: Users },
        { title: "Training", url: "/stable/training", icon: Dumbbell },
        { title: "Medical", url: "/stable/medical", icon: Heart },
        { title: "Staff", url: "/stable/staff", icon: Briefcase },
        { title: "Oyakata", url: "/stable/oyakata", icon: Crown },
        { title: "Scouting", url: "/office/scouting", icon: Search, locked: !tutorialCompleted },
        { title: "Youth Academy", url: "/academy", icon: GraduationCap },
        { title: "Bookmarks", url: "/bookmarks", icon: Bookmark },
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
          badgeKind: "basho" as const,
        },
        { title: "Banzuke", url: "/basho/banzuke", icon: ScrollText },
        { title: "Schedule", url: "/basho/schedule", icon: Calendar },
        { title: "Rivalries", url: "/basho/rivalries", icon: Swords },
        { title: "Global Cup", url: "/global-cup", icon: Trophy },
        { title: "World Circuit", url: "/world-circuit", icon: Globe },
        { title: "Rival Stables", url: "/rival-stables", icon: UsersRound },
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
          badgeKind: (fundsCritical ? "critical" : "warn") as "critical" | "warn",
        },
        { title: "Facilities", url: "/office/facilities", icon: Building2 },
        { title: "Sponsors", url: "/office/sponsors", icon: HandshakeIcon },
      ],
    },
    {
      label: "Association",
      items: [
        { title: "Governance", url: "/jsa/governance", icon: ShieldAlert },
        { title: "Elder Market", url: "/myoseki", icon: Landmark },
        { title: "Press & Rep", url: "/media", icon: Newspaper },
        { title: "Trends", url: "/jsa/trends", icon: TrendingUp },
      ],
    },
    {
      label: "Records",
      items: [
        { title: "Stable History", url: "/records/history", icon: Archive },
        { title: "Almanac", url: "/records/almanac", icon: BookOpen },
        { title: "Hall of Fame", url: "/records/hall-of-fame", icon: Award },
        { title: "Museum", url: "/records/museum", icon: Crown },
        { title: "Glossary", url: "/glossary", icon: BookOpen },
      ],
    },
  ];
}
