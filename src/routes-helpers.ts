import { Suspense, type LazyExoticComponent, type ComponentType, createElement } from "react";
import { PageLoader } from "@/components/PageLoader";
import { RequireWorld } from "@/components/RequireWorld";

export function withSuspense(Comp: LazyExoticComponent<ComponentType>) {
  return createElement(Suspense, { fallback: createElement(PageLoader) }, createElement(Comp));
}

/**
 * Route-level world guard: renders the page only when a world is loaded.
 * On cold boot / reload the guard restores the autosave in place (or
 * redirects to /main-menu when there is nothing to restore), so deep links
 * never strand the player on a blank page.
 */
export function withWorldGuard(Comp: LazyExoticComponent<ComponentType>) {
  return createElement(RequireWorld, null, withSuspense(Comp));
}
