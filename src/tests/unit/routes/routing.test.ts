import { describe, it, expect } from "vitest";
import { router } from "@/routes";

describe("Route configuration — /stable/roster", () => {
  it("router is defined", () => {
    expect(router).toBeDefined();
  });

  it("router has route tree", () => {
    const routeTree = router.options?.routeTree ?? router.routeTree;
    expect(routeTree).toBeDefined();
  });
});
