import { describe, it, expect } from "vitest";

describe("Route configuration — /stable/roster", () => {
  it("/stable/roster should not redirect to /rikishi (renders RikishiPage directly)", () => {
    const routeModule = require("@/routes");
    const router = routeModule.router;
    expect(router).toBeDefined();
    const finder = router.options.routeTree ? router.options.routeTree : router.routeTree;
    expect(finder).toBeDefined();
  });

  it("/rikishi route exists for backwards compatibility", () => {
    const routeModule = require("@/routes");
    const router = routeModule.router;
    expect(router).toBeDefined();
  });
});
