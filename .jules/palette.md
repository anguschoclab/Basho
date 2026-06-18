## 2024-05-18 - TopNavBar Smart Advance Focus State
**Learning:** The primary navigation action ("Smart Advance" button) had `focus-visible:ring-offset-2` but lacked the base `focus-visible:ring-2` and `focus-visible:ring-ring` classes, resulting in no visible focus ring during keyboard navigation. This happens easily when combining complex custom styling with utility classes.
**Action:** When adding focus states to elements using Shadcn/Tailwind utilities, always ensure the complete suite of focus ring classes is present: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background`.

## 2025-02-18 - TitleBar Window Controls Need Tooltips
**Learning:** Custom window controls (Minimize, Maximize, Close) in Electron apps often rely on icon-only buttons (`variant="ghost" size="icon"`). While `aria-label` provides screen reader accessibility, mouse users lack visual feedback for these ambiguous icons. Since the codebase's custom `Button` natively supports tooltips via the `tooltip` and `tooltipSide` props, it's crucial to utilize them on all custom window controls.
**Action:** When implementing or reviewing custom window control bars (like `TitleBar.tsx`), always verify that icon-only `Button` elements include both `aria-label` (for screen readers) and `tooltip` (for mouse users), ensuring consistent UX across interaction modalities.

## 2026-06-06 - TooltipWrap is redundant for the Custom Button Component
**Learning:** The project's custom `<Button>` component (`src/components/ui/button.tsx`) natively supports tooltips via the `tooltip` and `tooltipSide` props. Many components were incorrectly importing and wrapping `Button` inside an explicit `<TooltipWrap>`, which adds unnecessary boilerplate. Other standard components like `<SidebarTrigger>` do not support these props and still require wrapping, but standard `<Button>`s shouldn't be wrapped manually.
**Action:** Always verify if a component supports built-in tooltip props (like `tooltip` and `tooltipSide` on `<Button>`) before manually wrapping it in `<TooltipWrap>` to maintain clean JSX structures and avoid redundancy.

## 2025-02-27 - Icon-Only Button Tooltips
**Learning:** The project's custom `Button` component (`src/components/ui/button.tsx`) natively supports `tooltip` and `tooltipSide` props. It automatically wraps the button in a `TooltipWrap` (Radix UI) when the `tooltip` prop is provided.
**Action:** Use these props directly instead of manually wrapping icon-only buttons in `Tooltip` components to ensure adequate visual affordance for desktop/mouse users alongside `aria-label` for screen readers.

## 2024-05-18 - Missing tooltips on custom UI buttons
**Learning:** Native `title` attributes on custom `button` wrappers bypass the project's standard tooltip implementation, resulting in double-tooltips or inaccessible tooltips depending on the screen reader.
**Action:** Replace `title` attributes with the project's `TooltipWrap` component on custom button implementations.
