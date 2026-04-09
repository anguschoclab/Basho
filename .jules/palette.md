## 2024-04-09 - Accessible File Input Buttons
**Learning:** Hiding file inputs with `display: none` (`className="hidden"`) completely removes them from the tab order, stranding keyboard users when the input is wrapped in a custom UI component like a `<Button asChild>`.
**Action:** Always visually hide file inputs using `sr-only` instead of `hidden`, and use Tailwind's `peer` along with `peer-focus-visible` classes on the adjacent visible button to properly render a focus ring.
