/**
 * Control Center Primitive Library
 * =================================
 * Shared layout primitives for all Control Center template pages.
 *
 * Convention
 * ----------
 * All pages MUST use these primitives rather than reaching for raw shadcn
 * Card/CardHeader/CardContent or ad-hoc headings. This keeps the visual
 * language consistent across the game.
 *
 * Hierarchy:
 *   PageHeader     — one per page, full-width, gold eyebrow, 2rem display title
 *   SectionHeader  — mid-page dividers within tabs or multi-section layouts
 *   StatCard       — key-metric summary blocks (grid of values + optional bars)
 *   ListCard       — scrollable item lists (label / value / tone rows)
 *   DataTable      — tabular data with typed columns and row callbacks
 *   HeroDossier    — prominent decision/narrative banners (gold/vermillion/indigo)
 *   ProgressRow    — standalone progress bar; also used inside StatCard
 *   KanjiTile      — decorative kanji accent (used inside HeroDossier)
 *   RankBadge      — division/rank chip
 *   SideIndicator  — east/west color strip
 */

export { PageHeader } from "./PageHeader";
export { SectionHeader } from "./SectionHeader";
export { KanjiTile } from "./KanjiTile";
export { HeroDossier } from "./HeroDossier";
export { StatCard } from "./StatCard";
export type { StatItem, ProgressItem } from "./StatCard";
export { ListCard } from "./ListCard";
export type { ListRow } from "./ListCard";
export { ProgressRow } from "./ProgressRow";
export { DataTable } from "./DataTable";
export type { DataColumn } from "./DataTable";
export { RankBadge } from "./RankBadge";
export { SideIndicator } from "./SideIndicator";
