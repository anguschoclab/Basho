1. **Fix missing aria-labels on interactive elements**
   - In `src/components/layout/control-center/DataTable.tsx`, `role="button"` elements like headers and rows are missing `aria-label` which breaks accessibility for screen readers.
     - For table headers, add `aria-label={`Sort by ${col.label}`}` to indicate action.
     - For table rows, if `onRowClick` is passed, since the row is an aggregate, giving it an aria-label like "Select row" is less useful than letting it be read, but we should add `aria-label="Select row"` or similar if `onRowClick` is provided, though usually screen readers read row content better without it on the `tr` if it doesn't represent a single atomic button. However, `role="button"` on `tr` without an aria-label was specifically called out. Let's add `aria-label="Select row"` on the `tr` if `onRowClick` is present.
   - In `src/components/game/StableStatsTable.tsx`, headers and filter badges with `role="button"` need `aria-label`s.
     - Header: `aria-label={`Sort by ${label}`}`
     - Badge: `aria-label={`Filter by ${division}`}`
   - In `src/components/dashboard/BaseWidget.tsx`, the main wrapper with `role="button"` needs `aria-label={title}`.
   - These fixes directly address Palette's journal entry regarding missing `aria-label`s on elements with `role="button"`.
2. **Run testing commands**
   - Use `bun run test`, `bun run lint`, and `bun run format` to verify the codebase after changes.
3. **Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.**
4. **Submit PR**
   - PR Title: `🎨 Palette: Add missing ARIA labels to interactive elements`
   - Description with `💡 What`, `🎯 Why`, `📸 Before/After`, and `♿ Accessibility`.
