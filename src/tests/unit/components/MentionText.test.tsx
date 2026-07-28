/**
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { MentionText } from "@/components/MentionText";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
  }: {
    to: string;
    children?: React.ReactNode;
  }) => {
    const safeHref = to.startsWith("/") && !to.includes("://") ? to : "#";
    return (
      <a href={safeHref} data-testid="router-link">
        {children}
      </a>
    );
  },
}));

describe("MentionText regex hardening", () => {
  it("renders valid entity link as ClickableName", () => {
    render(<MentionText text="[[rikishi:r-1:Asanoyama]]" />);
    const link = screen.getByTestId("router-link");
    expect(link.getAttribute("href")).toBe("/rikishi/r-1");
    expect(screen.getByText("Asanoyama")).toBeTruthy();
  });

  it("matches id 'javascript' from colon-containing string (sanitizeId handles downstream)", () => {
    // [[rikishi:javascript:alert(1):Asanoyama]] matches with id=javascript, label=alert(1):Asanoyama
    // because [a-zA-Z0-9_-]+ matches 'javascript' and [^\]]+ matches 'alert(1):Asanoyama'
    // The id 'javascript' is valid alphanumeric — sanitizeId passes it, but it's not a real entity
    render(<MentionText text="[[rikishi:javascript:alert(1):Asanoyama]]" />);
    const link = screen.getByTestId("router-link");
    expect(link.getAttribute("href")).toBe("/rikishi/javascript");
  });

  it("matches id 'javascript' as valid alphanumeric (sanitizeId passes it)", () => {
    render(<MentionText text="[[rikishi:javascript:Asanoyama]]" />);
    const link = screen.getByTestId("router-link");
    expect(link.getAttribute("href")).toBe("/rikishi/javascript");
  });

  it("does not match id with whitespace", () => {
    const text = "[[rikishi:java script:Asanoyama]]";
    render(<MentionText text={text} />);
    expect(screen.queryByTestId("router-link")).toBeNull();
  });

  it("does not match id with special chars ($)", () => {
    const text = "[[rikishi:r$1:Asanoyama]]";
    render(<MentionText text={text} />);
    expect(screen.queryByTestId("router-link")).toBeNull();
  });

  it("does not match id with URL-encoded chars", () => {
    const text = "[[rikishi:javascript%3Aalert:Asanoyama]]";
    render(<MentionText text={text} />);
    expect(screen.queryByTestId("router-link")).toBeNull();
  });

  it("does not match label containing ] (regex requires ]] terminator)", () => {
    render(<MentionText text="[[rikishi:r-1:Asano]yama]]" />);
    expect(screen.queryByTestId("router-link")).toBeNull();
  });

  it("renders mixed text and valid links", () => {
    const { container } = render(<MentionText text="Winner [[rikishi:r-1:Asanoyama]] wins!" />);
    const link = screen.getByTestId("router-link");
    expect(link.getAttribute("href")).toBe("/rikishi/r-1");
    expect(screen.getByText("Asanoyama")).toBeTruthy();
    expect(container.textContent).toContain("Winner");
    expect(container.textContent).toContain("wins!");
  });
});
