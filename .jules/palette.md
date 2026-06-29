## 2024-06-20 - Icon-Only Button Accessibility and Affordance
**Learning:** The project's custom `Button` component (`src/components/ui/button.tsx`) natively supports `tooltip` and `tooltipSide` props which wrap the component in a Radix tooltip. Additionally, `size="icon"` buttons should always include an `aria-label` for screen reader accessibility alongside the `tooltip` for visual affordance. Using the native `title` attribute is insufficient.
**Action:** Always verify that `variant="ghost" size="icon"` buttons (and similar icon buttons) use the built-in `tooltip` prop instead of native `title` attributes or manual TooltipWraps, and ensure a corresponding `aria-label` is present.

## 2024-06-20 - Disabled Button Tooltips
**Learning:** Disabled buttons do not trigger hover events reliably across all browsers, which can prevent standard tooltips from appearing. The custom `Button` component's `tooltip` prop provides a consistent way to show explanations for disabled states (e.g., "Insufficient funds"), reducing user friction.
**Action:** Whenever a `<Button>` is disabled due to state or logic (like lack of funds or missing selection), always provide a `tooltip` explaining why the action is unavailable.
