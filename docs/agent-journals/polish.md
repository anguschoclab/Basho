# Polish's Journal

## 2026-10-30 - Dead-code fallback on /stable/$id
**Issue:** `StablePage` returned `null` when `!heya` (bad/stale route param), rendering a black void — and the "Loading Stable" EmptyState below it was unreachable.
**Learning:** `/stable/$id` resolves ANY heya id (links from ClickableName, GlobalEntitySearch, DigestWidget), so stale ids are reachable in real usage. The route's `withWorldGuard` only covers the missing-world case; entity-not-found is the page's job. Sibling `RikishiPage` handles it via `RikishiNotFound` — entity-detail routes here each own a "not found" branch.
**Rule:** When a route param maps to a world entity, render the not-found state inside `AppLayout` (keep nav chrome + escape action); never fold `!entity` into the world guard's `return null`. `Building2` is the codebase's heya/stable icon.

## 2026-11-21 - History-derived surfaces are empty for the whole first tournament
**Issue:** `/jsa/trends` rendered a 400px blank Recharts canvas (axes + legend, no data) because `formatMetaTrends` returns `[]` when `world.history` is empty.
**Learning:** `world.history: BashoResult[]` only gains entries when a basho *completes* — so it stays empty through the entire first pre-basho + 15-day tournament window, i.e. the whole new-player onboarding period. Any chart/list fed by `world.history` (or `world.historyIndex`) has a guaranteed empty window early game, not just an edge case.
**Rule:** When a surface derives from `world.history`, give the zero-history window a real empty state inside the same fixed-height container (avoids layout shift when data lands). Recharts tests here mock the whole `recharts` module — follow `FinancialTrendsChart.test.tsx`, don't render the real ResponsiveContainer in jsdom.
