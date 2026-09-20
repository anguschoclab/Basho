## 2024-05-24 - Interactive Cards Lack Keyboard Accessibility
**Learning:** Custom interactive `<Card>` components used for selections (like in OyakataPage) rely solely on `onClick` by default, making them inaccessible to keyboard users and screen readers. They also lack visible focus indicators.
**Action:** Whenever converting a non-semantic element like `<Card>` into an interactive button, always add `role="button"`, `tabIndex={0}`, an `onKeyDown` handler (handling 'Enter' and ' ' with `e.preventDefault()`), and `focus-visible` Tailwind classes to ensure full accessibility.
