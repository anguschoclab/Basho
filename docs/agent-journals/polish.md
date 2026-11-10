# Polish's Journal

## 2026-10-30 - Dead-code fallback on /stable/$id
**Issue:** `StablePage` returned `null` when `!heya` (bad/stale route param), rendering a black void — and the "Loading Stable" EmptyState below it was unreachable.
**Learning:** `/stable/$id` resolves ANY heya id (links from ClickableName, GlobalEntitySearch, DigestWidget), so stale ids are reachable in real usage. The route's `withWorldGuard` only covers the missing-world case; entity-not-found is the page's job. Sibling `RikishiPage` handles it via `RikishiNotFound` — entity-detail routes here each own a "not found" branch.
**Rule:** When a route param maps to a world entity, render the not-found state inside `AppLayout` (keep nav chrome + escape action); never fold `!entity` into the world guard's `return null`. `Building2` is the codebase's heya/stable icon.
