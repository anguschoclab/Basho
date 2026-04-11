## 2024-05-18 - Missing TooltipWrap Import
**Learning:** React files might be using `TooltipWrap` without importing it, likely depending on some global availability which fails during lint/typecheck or causes silent bugs if it's actually not globally available, or perhaps the lint is passing but the import is genuinely missing in some components like FloatingShortcuts.tsx.
**Action:** Always ensure `TooltipWrap` is explicitly imported from `@/components/ui/tooltip-wrap`.
