## 2025-07-03 - Tooltips on disabled buttons
**Learning:** Native `disabled` attribute on HTML elements prevents all pointer events in most browsers, meaning tooltips (like Radix UI's) will never trigger on hover. Trying to change `disabled` to `aria-disabled` creates serious functional regressions if `asChild` is used, because Radix `Slot` triggers the child action before a parent `onClick={e.preventDefault()}` can stop it.
**Action:** When a tooltip is needed on a disabled button, wrap the disabled component in a standard inline block `<span className="cursor-not-allowed">` so the wrapper can receive hover events, and ensure the button inside maintains native `disabled` styling.

## 2024-07-28 - Auto-generating aria-labels from tooltips
**Learning:** Many icon-only buttons (`size="icon"`) throughout the application use the custom `tooltip` prop (a string) but miss an explicit `aria-label`, making them invisible to screen readers.
**Action:** Automatically setting `aria-label` from `tooltip` inside the core `<Button>` component improves accessibility across the entire application without needing manual refactors at 150+ callsites, providing a great global UX/a11y win.
