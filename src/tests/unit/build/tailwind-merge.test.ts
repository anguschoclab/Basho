import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("tailwind-merge v3 compatibility", () => {
  it("merges conflicting background classes", () => {
    expect(cn("bg-primary", "bg-card")).toBe("bg-card");
  });

  it("merges conflicting text color classes", () => {
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("preserves non-conflicting classes", () => {
    expect(cn("px-4", "py-2")).toBe("px-4 py-2");
  });

  it("merges conflicting padding classes", () => {
    expect(cn("px-4", "px-8")).toBe("px-8");
  });

  it("handles conditional classes", () => {
    const isHidden = false;
    expect(cn("base", isHidden && "hidden", "visible")).toBe("base visible");
  });
});
