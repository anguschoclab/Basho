1. **Target Component**: `src/components/layout/Breadcrumbs.tsx`.
2. **Issue**: The "Show all breadcrumbs" ellipsis button (`...`) and the navigation links (`<Link>`) lack `focus-visible` styling for keyboard navigation, and the button might be hard to interact with or distinguish.
3. **Change**:
   - Add `focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm` (or `rounded-xs` following v4 standards) to the `className` of both the `<button>` and `<Link>` components.
   - For the ellipsis button, consider updating it to `rounded-xs` as well.
4. **Verification**:
   - Run `pnpm lint` (or `bun run lint:strict` as per repo guidelines) and `bun x vitest` to ensure no regressions.
5. **Pre-commit**: Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
