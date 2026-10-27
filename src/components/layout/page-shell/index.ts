/**
 * Page Shell Primitive Library
 * =================================
 * Shared layout primitives for all page-shell template pages.
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

export { PageHeader } from "@/components/layout/page-shell/PageHeader";
export { SectionHeader } from "@/components/layout/page-shell/SectionHeader";
export { KanjiTile } from "@/components/layout/page-shell/KanjiTile";
export { CardEyebrow } from "@/components/layout/page-shell/CardEyebrow";
export type { CardEyebrowProps } from "@/components/layout/page-shell/CardEyebrow";
export { StatCard } from "@/components/layout/page-shell/StatCard";
export type { StatItem, ProgressItem } from "@/components/layout/page-shell/StatCard";
export { ListCard } from "@/components/layout/page-shell/ListCard";
export type { ListRow } from "@/components/layout/page-shell/ListCard";
export { ProgressRow } from "@/components/layout/page-shell/ProgressRow";
export { SimpleRankBadge } from "@/components/layout/page-shell/RankBadge";
export { DataTable } from "@/components/layout/page-shell/DataTable";
export type { Column } from "@/components/layout/page-shell/DataTable";
