## 2025-07-03 - Tooltips on disabled buttons
**Learning:** Native `disabled` attribute on HTML elements prevents all pointer events in most browsers, meaning tooltips (like Radix UI's) will never trigger on hover. Trying to change `disabled` to `aria-disabled` creates serious functional regressions if `asChild` is used, because Radix `Slot` triggers the child action before a parent `onClick={e.preventDefault()}` can stop it.
**Action:** When a tooltip is needed on a disabled button, wrap the disabled component in a standard inline block `<span className="cursor-not-allowed">` so the wrapper can receive hover events, and ensure the button inside maintains native `disabled` styling.

## 2024-07-28 - Auto-generating aria-labels from tooltips
**Learning:** Many icon-only buttons (`size="icon"`) throughout the application use the custom `tooltip` prop (a string) but miss an explicit `aria-label`, making them invisible to screen readers.
**Action:** Automatically setting `aria-label` from `tooltip` inside the core `<Button>` component improves accessibility across the entire application without needing manual refactors at 150+ callsites, providing a great global UX/a11y win.
## 2025-05-15 - Standardize EmptyStates across dashboard widgets
**Learning:** Hardcoded empty states (with arbitrary padding like `py-8` and inconsistent alignments) lead to scattered styling and an unpolished feel across dashboard widgets. Centralizing this pattern via `<EmptyState>` guarantees semantic HTML, uniform spacing, and robust accessibility out of the box.
**Action:** Always prefer utilizing the design system's `<EmptyState>` component over custom layout approximations for empty dataset scenarios (e.g. "No active basho", "No events yet").
## 2025-07-08 - Added Tooltip to disabled Buy Button
**Learning:** Disabled buttons without an explanation can lead to user confusion. In this codebase, the custom `Button` component accepts `tooltip` and `tooltipSide` props which make it easy to provide feedback natively.
**Action:** Always verify if a disabled state can benefit from a `tooltip` explaining why the action is restricted.
