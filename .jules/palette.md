
## 2024-05-15 - Icon-only Button Accessibility
**Learning:** Icon-only buttons used for primary actions (like "Load Save" or "Delete Save" in save slots) often lack accessible names for screen readers and visible labels for mouse/keyboard users.
**Action:** Always ensure custom icon-only `<Button>` implementations include descriptive `aria-label`s, and take advantage of the component's built-in `tooltip` prop to provide visual context on hover/focus.
