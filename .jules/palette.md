## 2024-03-24 - Accessibility on Custom Triggers
**Learning:** Raw icon-only div triggers for tooltips (e.g. `<div cursor-help><Keyboard /></div>`) are inaccessible to screen readers and keyboard navigation (tabbing).
**Action:** Always refactor raw `div` triggers for tooltips into semantic `<Button variant="outline" size="icon" aria-label="...">` to ensure they are focusable, accessible, and provide proper context to screen readers, while leveraging the centralized `TooltipWrap` component.
