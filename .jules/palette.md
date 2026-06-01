## 2024-05-18 - TopNavBar Smart Advance Focus State
**Learning:** The primary navigation action ("Smart Advance" button) had `focus-visible:ring-offset-2` but lacked the base `focus-visible:ring-2` and `focus-visible:ring-ring` classes, resulting in no visible focus ring during keyboard navigation. This happens easily when combining complex custom styling with utility classes.
**Action:** When adding focus states to elements using Shadcn/Tailwind utilities, always ensure the complete suite of focus ring classes is present: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background`.

## 2025-02-18 - TitleBar Window Controls Need Tooltips
**Learning:** Custom window controls (Minimize, Maximize, Close) in Electron apps often rely on icon-only buttons (`variant="ghost" size="icon"`). While `aria-label` provides screen reader accessibility, mouse users lack visual feedback for these ambiguous icons. Since the codebase's custom `Button` natively supports tooltips via the `tooltip` and `tooltipSide` props, it's crucial to utilize them on all custom window controls.
**Action:** When implementing or reviewing custom window control bars (like `TitleBar.tsx`), always verify that icon-only `Button` elements include both `aria-label` (for screen readers) and `tooltip` (for mouse users), ensuring consistent UX across interaction modalities.

## 2025-02-18 - Ensure icon-only buttons use Button tooltip prop
**Learning:** Found some icon-only buttons using the custom `Button` component that had `aria-label` but lacked visual tooltips for mouse users (e.g. `SidebarTrigger`, "Generate random name"). The custom `Button` component at `src/components/ui/button.tsx` natively supports `tooltip` and `tooltipSide` properties.
**Action:** Utilize the built-in `tooltip` and `tooltipSide` props directly on the custom `Button` component for icon-only buttons instead of manually wrapping them or leaving them inaccessible to mouse hover.
