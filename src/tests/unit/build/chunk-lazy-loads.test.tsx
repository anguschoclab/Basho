import { describe, it, expect } from "vitest";
import { Suspense, isValidElement } from "react";
import { router } from "@/routes";

describe("chunk lazy loads — MainMenu, NewGameWizard, Dashboard", () => {
  it("MainMenu route component is wrapped with Suspense", () => {
    const route = router.routesById["/main-menu"] as unknown as {
      options: { component: () => React.ReactElement };
    };
    expect(route).toBeDefined();
    const comp = route.options.component;
    expect(typeof comp).toBe("function");
    const result = comp();
    expect(isValidElement(result)).toBe(true);
    expect(result.type).toBe(Suspense);
  });

  it("NewGameWizard route component is wrapped with Suspense", () => {
    const route = router.routesById["/new-game"] as unknown as {
      options: { component: () => React.ReactElement };
    };
    expect(route).toBeDefined();
    const comp = route.options.component;
    expect(typeof comp).toBe("function");
    const result = comp();
    expect(isValidElement(result)).toBe(true);
    expect(result.type).toBe(Suspense);
  });

  it("Dashboard route component is wrapped with Suspense", () => {
    const route = router.routesById["/dashboard"] as unknown as {
      options: { component: () => React.ReactElement };
    };
    expect(route).toBeDefined();
    const comp = route.options.component;
    expect(typeof comp).toBe("function");
    const result = comp();
    expect(isValidElement(result)).toBe(true);
    expect(result.type).toBe(Suspense);
  });
});
