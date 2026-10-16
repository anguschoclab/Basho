## 2026-10-16 - Backstory Card Accessibility
**Learning:** Custom interactive elements representing selectable options (like backstory dossiers) require explicit roles, tab indices, keyboard activation handlers (Enter/Space), and screen reader labels to match standard accessibility expectations, as established by sibling components like FactionCard.
**Action:** Always wrap custom clickable cards with `role="button"`, `tabIndex={0}`, `onKeyDown={activationKeyHandler(...)}`, and `focus-visible` utility classes.
