# Implementation Plan

## Status: ✅ All prior plans completed

Previous plan items (Rivalries Page, PBP integration, clickable names, branding) are all implemented.

## Recent Refactoring (Latest)

### Deleted Orphaned Files
- `src/engine/leverageClass.ts` — zero imports
- `src/components/game/BashoSummaryBanner.tsx` — zero imports  
- `src/components/NavLink.tsx` — unused custom wrapper
- `src/App.css` — Vite boilerplate, never imported
- `src/components/ui/use-toast.ts` — trivial re-export wrapper (consumers redirected to `@/hooks/use-toast`)
- `src/pages/Index.tsx` — demo-only landing page
- `src/components/game/BoutViewer.tsx` — demo-only bout viewer
- `src/engine/mockData.ts` — demo-only mock data
- `src/engine/index.ts` — barrel file with zero consumers (all imports are direct)
- `src/components/game/RikishiCard.tsx` — orphaned after BoutViewer removal
- `src/pages/RikishiCard.tsx` — orphaned component, no imports

### Route Cleanup
- Removed `/demo` route (demo page deleted)
- Consolidated `/talent-pool` duplicate → single `/talent` route

### Import Cleanup
- 5 files redirected from deleted `use-toast.ts` wrapper → `@/hooks/use-toast`

### DTO Projection Layer (`uiModels.ts`)
- Rebuilt with proper types: `UIRikishi`, `UIRosterEntry`, `UIHeya`, `UIBoutRow`, `UIBashoSummary`
- Wired into: `RikishiPage.tsx`, `StablePage.tsx` roster tab
