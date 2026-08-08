import { Suspense, type LazyExoticComponent, type ComponentType, createElement } from "react";
import { PageLoader } from "@/components/PageLoader";

export function withSuspense(Comp: LazyExoticComponent<ComponentType>) {
  return createElement(Suspense, { fallback: createElement(PageLoader) }, createElement(Comp));
}
