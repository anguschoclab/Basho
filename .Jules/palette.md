## 2024-06-20 - Icon-Only Button Accessibility and Affordance
**Learning:** The project's custom `Button` component (`src/components/ui/button.tsx`) natively supports `tooltip` and `tooltipSide` props which wrap the component in a Radix tooltip. Additionally, `size="icon"` buttons should always include an `aria-label` for screen reader accessibility alongside the `tooltip` for visual affordance. Using the native `title` attribute is insufficient.
**Action:** Always verify that `variant="ghost" size="icon"` buttons (and similar icon buttons) use the built-in `tooltip` prop instead of native `title` attributes or manual TooltipWraps, and ensure a corresponding `aria-label` is present.
## 2025-06-25 - Contextually Disabled Buttons Tooltips
**Learning:** Buttons disabled due to contextual logic (e.g. active background processes) need tooltip explanations to avoid user confusion and friction, as outlined in the UX standards.
**Action:** Applied tooltips to buttons with dynamic `disabled` states in AutoSimControls. Will ensure future contextual disabled states include explanatory tooltips.
