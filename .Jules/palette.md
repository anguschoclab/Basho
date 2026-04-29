## 2024-05-18 - Missing TooltipWrap Import
**Learning:** React files might be using `TooltipWrap` without importing it, likely depending on some global availability which fails during lint/typecheck or causes silent bugs if it's actually not globally available, or perhaps the lint is passing but the import is genuinely missing in some components like FloatingShortcuts.tsx.
**Action:** Always ensure `TooltipWrap` is explicitly imported from `@/components/ui/tooltip-wrap`.
## 2026-04-13 - Added Focus Ring to MentorOverlay Button
**Learning:** When adding keyboard focus states to generic button elements, using Tailwind's `focus-visible:` variants with `ring` and `ring-offset` provides standard, accessible visual feedback that matches the Shadcn UI defaults without affecting mouse clicks.
**Action:** Remember to explicitly add `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background` to plain HTML `<button>` tags that lack standard component wrapper focus styles.
## 2024-05-18 - Missing ARIA Labels on Icon Buttons
**Learning:** Shadcn UI Button components with `size="icon"` often lack intrinsic accessibility when only an SVG/Icon component is passed as children. This makes them invisible or unhelpful to screen readers.
**Action:** Always audit `size="icon"` Button components and ensure an `aria-label` or `title` property is added.
## 2026-04-20 - Keyboard Focus on Link-Styled Buttons
**Learning:** Custom link-styled interactive elements (like the 'Skip Tour' button) often miss critical focus indicators because they don't inherit default button outlines. Screen reader users can 'read' them via text, but keyboard users lose visual focus tracking without proper styling.
**Action:** Prefer using the shared `Button` component or `buttonVariants` helper to ensure consistent focus-visible states. For raw `<button>` elements where the component cannot be used, apply the standard focus ring utility classes.
## 2026-04-22 - TitleBar Window Controls Focus States
**Learning:** Custom window control buttons (minimize, maximize, close) using raw HTML `<button>` tags lacked visual focus indicators during keyboard navigation.
**Action:** For buttons flush with container edges (like TitleBar controls), use focus-visible:ring-inset instead of the standard offset to prevent focus ring clipping, while maintaining focus-visible:ring-2 for consistency.
