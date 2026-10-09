/**
 * Literal color palette for canvas 2D and SVG drawing code.
 *
 * `CanvasRenderingContext2D` (`ctx.fillStyle`, `ctx.strokeStyle`, gradient
 * stops) and raw SVG attributes cannot consume Tailwind utility tokens or
 * resolve `hsl(var(--token))` at draw time, so every literal used by
 * procedural artwork lives here as the single source of truth (§1.1).
 */

/** Build a CSS rgba() string for dynamic alpha (canvas fills). */
export const withAlpha = (r: number, g: number, b: number, a: number): string =>
  `rgba(${r},${g},${b},${a})`;

/** Dohyo wood floor, sand, rope, and shikoboshi tassels (bout replay canvas). */
export const DOHYO_COLORS = {
  wood: "#a07840",
  woodDark: "#7a5a28",
  sandCore: "#f8e8b8",
  sandMid: "#e8c878",
  sandEdge: "#c8a040",
  rope: "#8b6010",
  ropeShadow: withAlpha(160, 110, 30, 0.35),
  ringLine: withAlpha(160, 120, 40, 0.18),
  baleShadow: withAlpha(0, 0, 0, 0.2),
  baleEdge: withAlpha(0, 0, 0, 0.25),
  shikiri: withAlpha(255, 255, 255, 0.9),
  tasselEdge: withAlpha(0, 0, 0, 0.3),
  tasselGreen: "#16a34a",
  tasselRed: "#b91c1c",
  tasselWhite: "#d4d4d4",
  tasselBlack: "#1d1d1d",
} as const;

/** Rikishi figure rendering in the bout replay canvas. */
export const BOUT_FIGURE_COLORS = {
  skin: "#c8906a",
  skinShade: "#b07050",
  hairDark: "#18100a",
  hairLight: "#2a1a0a",
  mawashiEast: "#1d4ed8",
  mawashiWest: "#b91c1c",
  mawashiEastAccent: "#93c5fd",
  mawashiWestAccent: "#fca5a5",
  eastBadge: "#1d4ed8",
  westBadge: "#b91c1c",
  bodyShadow: withAlpha(0, 0, 0, 0.18),
  highlightSoft: withAlpha(255, 255, 255, 0.08),
  highlightFaint: withAlpha(255, 255, 255, 0.07),
  crease: withAlpha(40, 20, 5, 0.7),
  creaseFaint: withAlpha(40, 20, 5, 0.5),
  rankLabelText: withAlpha(255, 255, 255, 0.92),
} as const;

/** HUD overlays: intensity bar, kimarite banner, upset banner, particles. */
export const BOUT_HUD_COLORS = {
  barBackdrop: withAlpha(0, 0, 0, 0.3),
  barShadow: withAlpha(0, 0, 0, 0.4),
  barCharge: "#f59e0b",
  barClinch: "#6366f1",
  barNeutral: "#64748b",
  bannerTop: "#7c2d12",
  bannerBottom: "#451a03",
  bannerBorder: "#f59e0b",
  bannerText: "#fef3c7",
  bannerCaption: "#fcd34d",
  kinboshi: "#f59e0b",
  upset: "#ef4444",
  saltParticle: withAlpha(255, 255, 255, 0.85),
  sparkGold: withAlpha(255, 200, 80, 0.8),
  sparkWarm: withAlpha(255, 240, 160, 0.55),
  zabuton: ["#7c3aed", "#db2777", "#0891b2", "#059669"] as const,
} as const;

/** SVG avatar anatomy (face outline, hair, expression accents). */
export const AVATAR_COLORS = {
  ink: "#1a1a1a",
  paper: "#ffffff",
  mouthAccent: "#8b0000",
  skinShadow: "#c4987a",
  hairWhite: "#e0e0e0",
  hairGray: "#6b6b6b",
} as const;

/** Kesho-mawashi silk/sheen artwork and tsuna rope. */
export const KESHO_COLORS = {
  gold: "#FFD700",
  goldMid: "#FFA500",
  silk: "#FFFFFF",
  threadDark: "#000000",
  crimson: "#BC002D",
  dropShadow: withAlpha(0, 0, 0, 0.3),
} as const;

/** Named hexes used by the kesho-mawashi preset table below. */
export const KESHO_PRESET = {
  CRIMSON: "#8B0000",
  ANTIQUE_GOLD: "#D4AF37",
  GOLD: "#FFD700",
  PHOENIX: "#FF4500",
  NAVY: "#001F3F",
  OCEAN: "#0074D9",
  WHITE: "#FFFFFF",
  SLATE_GREEN: "#2F4F4F",
  BAMBOO: "#228B22",
  BEIGE: "#F5F5DC",
  INK: "#121212",
  INDIGO: "#4B0082",
  PALE_GRAY: "#E0E0E0",
} as const;

/** Multi-series chart colors (recharts/SVG lines where tokens can't apply). */
export const CHART_SERIES = [
  "#60a5fa",
  "#34d399",
  "#f472b6",
  "#fb923c",
  "#a78bfa",
  "#facc15",
  "#94a3b8",
] as const;

/** Rivalry-heat perception bands (SVG/canvas consumers). */
export const HEAT_BANDS = {
  redHot: "#ef4444",
  rising: "#f59e0b",
  notable: "#10b981",
  calm: "#6b7280",
} as const;

/** Perception-dimension ticks (drawn, not classed). */
export const PERCEPTION_TICKS = {
  technique: "#34d399",
  strength: "#f472b6",
  agility: "#fbbf24",
  hinkaku: "#f87171",
  intelligence: "#9ca3af",
  default: "#94a3b8",
} as const;
