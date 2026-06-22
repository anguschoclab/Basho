/**
 * Navigation tab constants for the application.
 */

export const STABLE_TABS = [
  { id: "stable", label: "Overview", href: "/stable" },
  { id: "roster", label: "Roster", href: "/stable/roster" },
  { id: "training", label: "Training", href: "/stable/training" },
  { id: "staff", label: "Staff", href: "/stable/staff" },
  { id: "medical", label: "Medical", href: "/stable/medical" },
  { id: "oyakata", label: "Oyakata", href: "/stable/oyakata" },
];

export const OFFICE_TABS = [
  { id: "economy", label: "Finances", href: "/office/finances" },
  { id: "facilities", label: "Facilities", href: "/office/facilities" },
  { id: "sponsors", label: "Sponsors", href: "/office/sponsors" },
  { id: "scouting", label: "Scout Intel", href: "/office/scouting" },
  { id: "prospects", label: "Talent Pool", href: "/jsa/talent" },
];

export const ASSOCIATION_TABS = [
  { id: "governance", label: "Governance", href: "/jsa/governance" },
  { id: "myoseki", label: "Elder Market", href: "/myoseki" },
  { id: "media", label: "Press & Rep", href: "/media" },
  { id: "trends", label: "Trends", href: "/jsa/trends" },
];

export const TOURNAMENT_TABS = [
  { id: "basho", label: "Basho", href: "/basho" },
  { id: "banzuke", label: "Banzuke", href: "/basho/banzuke" },
  { id: "schedule", label: "Schedule", href: "/basho/schedule" },
  { id: "rivalries", label: "Rivalries", href: "/basho/rivalries" },
  { id: "global-cup", label: "Global Cup", href: "/global-cup" },
];

export const RECORDS_TABS = [
  { id: "history", label: "History", href: "/records/history" },
  { id: "almanac", label: "Almanac", href: "/records/almanac" },
  { id: "hall-of-fame", label: "Hall of Fame", href: "/records/hall-of-fame" },
  { id: "museum", label: "Museum", href: "/records/museum" },
];
