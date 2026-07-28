/**
 */
import { describe, it, expect } from "vitest";
import { router } from "@/routes";

describe("router", () => {
  it("should be defined", () => {
    expect(router).toBeDefined();
  });

  it("should have correct routeTree configuration", () => {
    expect(router.routeTree).toBeDefined();
    expect(router.routeTree.children).toBeDefined();
  });

  it("should register essential top-level routes", () => {
    const routeIds = Object.keys(router.routesById);

    // Core App Routes
    expect(routeIds).toContain("/");
    expect(routeIds).toContain("/main-menu");
    expect(routeIds).toContain("/new-game");
    expect(routeIds).toContain("/dashboard");
    expect(routeIds).toContain("/settings");

    // Top-level sections (some are legacy)
    expect(routeIds).toContain("/basho");
    expect(routeIds).toContain("/banzuke");
    expect(routeIds).toContain("/schedule");
    expect(routeIds).toContain("/economy");
    expect(routeIds).toContain("/scouting");
  });

  it("should register stable nested routes", () => {
    const routeIds = Object.keys(router.routesById);
    expect(routeIds).toContain("/stable");
    expect(routeIds).toContain("/stable/");
    expect(routeIds).toContain("/stable/roster");
    expect(routeIds).toContain("/stable/training");
    expect(routeIds).toContain("/stable/medical");
    expect(routeIds).toContain("/stable/staff");
    expect(routeIds).toContain("/stable/oyakata");
  });

  it("should register office nested routes", () => {
    const routeIds = Object.keys(router.routesById);
    expect(routeIds).toContain("/office");
    expect(routeIds).toContain("/office/finances");
    expect(routeIds).toContain("/office/scouting");
    expect(routeIds).toContain("/office/sponsors");
    expect(routeIds).toContain("/office/facilities");
  });

  it("should register JSA nested routes", () => {
    const routeIds = Object.keys(router.routesById);
    expect(routeIds).toContain("/jsa");
    expect(routeIds).toContain("/jsa/governance");
    expect(routeIds).toContain("/jsa/trends");
    expect(routeIds).toContain("/jsa/talent");
  });

  it("should register dynamic parameter routes", () => {
    const routeIds = Object.keys(router.routesById);
    expect(routeIds).toContain("/stable/$id");
    expect(routeIds).toContain("/rikishi/$rikishiId");
  });

  it("should register a not-found catch-all route", () => {
    const routeIds = Object.keys(router.routesById);
    expect(routeIds).toContain("/$");
  });
});
