## 2025-08-09 - Accessible Interactive List Items
**Learning:** Found that custom `div` elements functioning as buttons (`role="button"`) in list cards lacked `aria-label`s, rendering them opaque to screen readers despite having visual text and `onClick` handlers.
**Action:** Always ensure custom interactive elements like clickable rows explicitly forward or define `aria-label` using their primary text content.
## 2026-09-09 - Added keyboard accessibility to Rival Oyakata cards
**Learning:** Attaching onClick handlers directly to `<div>` elements without proper ARIA and keyboard support prevents keyboard-only users from accessing the content. When making non-semantic elements clickable, it's crucial to explicitly add `role="button"`, `tabIndex={0}`, and an `onKeyDown` handler that supports 'Enter' and 'Space', ensuring `e.preventDefault()` is called for 'Space' to prevent page scrolling.
**Action:** Always follow the accessibility coding standards for interactive elements and use proper focus-visible styles for visual feedback on keyboard focus.
