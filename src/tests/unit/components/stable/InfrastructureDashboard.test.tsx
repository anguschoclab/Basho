/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { InfrastructureDashboard } from "@/components/stable/InfrastructureDashboard";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";

describe("InfrastructureDashboard", () => {
  it("shows a tooltip on the disabled upgrade button when a facility is under construction", () => {
    const heya = MockFactory.createHeya("h1", {
      constructionQueue: [
        {
          facilityId: "weights_room",
          completionYear: 2026,
          completionBasho: "hatsu",
          level: 1,
        },
      ],
    });

    render(
      <TooltipProvider>
        <InfrastructureDashboard heya={heya} onUpgrade={vi.fn()} />
      </TooltipProvider>
    );

    const button = screen.getByText("Building...").closest("button") as HTMLButtonElement;
    expect(button).toBeTruthy();
    expect(button.disabled).toBe(true);
    expect(button.getAttribute("aria-label")).toBeTruthy();
  });
});
