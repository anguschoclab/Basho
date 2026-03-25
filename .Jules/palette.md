## 2025-02-14 - Event Log Toggle Accessibility
**Learning:** Adding ARIA states to interactive elements built with `div`/`button` wrappers in complex layouts (like the `EventLogPanel`'s nested groups) ensures that screen readers accurately announce the toggle states.
**Action:** Next time, actively check for custom filter buttons or expand/collapse elements that use conditional classes instead of native interactive states or proper ARIA flags, and add `aria-pressed` or `aria-expanded` attributes respectively.
## 2024-03-20 - Adding Accessibility Labels to Icon-Only Buttons
**Learning:** React components often lack contextual `aria-label` attributes on dynamically generated icon-only buttons (like map/reduce output where the content varies per element), rendering them opaque to screen readers.
**Action:** When adding accessibility features to dynamic lists, ensure the `aria-label` incorporates a descriptive property from the mapped object (e.g., `alert.text`) to provide distinct, contextual meaning for each interactive element rather than a generic label.

## 2024-03-21 - Added ARIA labels to buttons
**Learning:** Icon-only buttons or interactive elements like 'more' without context require `aria-label` attributes to ensure screen reader users can interact with them. Additionally, `aria-expanded`, `aria-pressed`, and `aria-current` provide helpful context to users regarding the state of these elements.
**Action:** Always add descriptive `aria-label`s to interactive elements without text or when text is ambiguous out of context. Also apply correct `aria-state` and ARIA roles for custom tabbed interfaces.
## 2024-03-25 - Custom interactive controls missing focus states
**Learning:** In the `TrainingPage`, custom `<button>` elements that used dynamic `className` strings did not define any `:focus` or `:focus-visible` outline styles, making them entirely invisible to keyboard navigation. Relying strictly on Tailwind class strings rather than a standard `<Button>` component makes it easy to omit fundamental accessibility.
**Action:** Always append standard `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2` when constructing custom interactive components in Tailwind.
