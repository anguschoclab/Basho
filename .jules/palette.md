
## 2024-11-05 - Fix EmptyState loading spinner animation
**Learning:** When using the `EmptyState` component for loading states, applying `className="animate-pulse"` to the entire component wrapper makes the layout and text pulsate incorrectly.
**Action:** Always apply the animation directly to the `Loader2` icon using `iconClassName="animate-spin text-muted-foreground"` to get a clean spinning icon without affecting the text.
