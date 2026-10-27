/**
 * SumoAvatar component tests — pixel rendering, fallback, resolved avatar prop.
 */

import { describe, it, expect, afterEach } from "vitest";
import React from "react";
import { render, cleanup } from "@testing-library/react";
import { SumoAvatar } from "@/components/avatar/SumoAvatar";
import { generateAvatarIdentity, deriveAvatarStage } from "@/engine/generation/avatarGenerator";

describe("SumoAvatar", () => {
  afterEach(cleanup);

  it("renders an SVG with pixel paths", () => {
    const identity = generateAvatarIdentity({ seed: "ui-1", nationality: "Japan", role: "rikishi" });
    const stage = deriveAvatarStage({ role: "rikishi", division: "juryo", age: 25 });
    const { container } = render(<SumoAvatar avatar={{ identity, stage }} />);
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute("shape-rendering")).toBe("crispEdges");
    expect(container.querySelectorAll("path").length).toBeGreaterThan(3);
  });

  it("falls back to initials when no data", () => {
    const { container, getByText } = render(<SumoAvatar fallback="Hakuho" />);
    expect(container.querySelector("svg")).toBeNull();
    expect(getByText("Ha")).toBeTruthy();
  });

  it("renders from a bare stored identity with a default stage", () => {
    const identity = generateAvatarIdentity({ seed: "ui-2", nationality: "Mongolia", role: "oyakata" });
    const { container } = render(<SumoAvatar config={identity} />);
    expect(container.querySelector("svg")).toBeTruthy();
  });
});
