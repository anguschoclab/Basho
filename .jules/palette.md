## 2024-05-24 - Breadcrumbs Keyboard Accessibility
**Learning:** Custom interactive elements within navigation paths (like `<button>` and `<Link>` in breadcrumbs) were missing visible focus outlines, breaking keyboard navigation parity.
**Action:** Added `focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-xs` to ensure consistent focus rings across all breadcrumb items.
