# Palette's Journal

## 2026-11-05 - SidebarInset was a hidden second `<main>` on every page
**Learning:** shadcn's `SidebarInset` renders `<main>` by design (upstream intends it as the content host), but this app nests the real `<main id="main-content">` (`MainContentPane`) inside it — so every route shipped two nested main landmarks, which is invalid HTML and confuses screen-reader landmark nav. It also made `getByRole("main")` / `page.locator("main")` ambiguous for Playwright. `id="main-content"` existed as an orphan skip-target with no skip link pointing at it.
**Action:** When an id like `main-content`/`content` exists, grep for the anchor that should target it — orphan targets reveal half-finished a11y work. In this codebase, treat shadcn `SidebarInset` as a layout `<div>` (it is now); `MainContentPane` owns the sole `main` landmark. New landmark-bearing wrappers should be checked against nested-`main`/`nav` duplication.
