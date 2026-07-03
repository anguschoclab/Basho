import { describe, it, expect } from "vitest";
import { parseEntityLinks } from "@/presenters/entityLinks";

describe("parseEntityLinks", () => {
  it("returns single text segment for plain text", () => {
    const segments = parseEntityLinks("Hello world");
    expect(segments).toHaveLength(1);
    expect(segments[0]).toEqual({ type: "text", content: "Hello world" });
  });

  it("returns single link segment for pure entity markup", () => {
    const segments = parseEntityLinks("[[rikishi:r-1:Asanoyama]]");
    expect(segments).toHaveLength(1);
    expect(segments[0]).toEqual({
      type: "link",
      entityType: "rikishi",
      entityId: "r-1",
      label: "Asanoyama",
    });
  });

  it("parses mixed text and links", () => {
    const segments = parseEntityLinks(
      "Winner [[rikishi:r-1:Asanoyama]] defeats [[rikishi:r-2:Terunofuji]]"
    );
    expect(segments).toHaveLength(4);
    expect(segments[0]).toEqual({ type: "text", content: "Winner " });
    expect(segments[1]).toEqual({
      type: "link",
      entityType: "rikishi",
      entityId: "r-1",
      label: "Asanoyama",
    });
    expect(segments[2]).toEqual({ type: "text", content: " defeats " });
    expect(segments[3]).toEqual({
      type: "link",
      entityType: "rikishi",
      entityId: "r-2",
      label: "Terunofuji",
    });
  });

  it("handles multiple consecutive links", () => {
    const segments = parseEntityLinks("[[rikishi:r-1:A]][[rikishi:r-2:B]]");
    expect(segments).toHaveLength(2);
    expect(segments[0]).toEqual({
      type: "link",
      entityType: "rikishi",
      entityId: "r-1",
      label: "A",
    });
    expect(segments[1]).toEqual({
      type: "link",
      entityType: "rikishi",
      entityId: "r-2",
      label: "B",
    });
  });

  it("does not crash on malformed markup", () => {
    const segments = parseEntityLinks("[[rikishi:");
    expect(segments).toHaveLength(1);
    expect(segments[0]).toEqual({ type: "text", content: "[[rikishi:" });
  });

  it("returns plain text for string with no brackets", () => {
    const segments = parseEntityLinks("no brackets here");
    expect(segments).toHaveLength(1);
    expect(segments[0]).toEqual({ type: "text", content: "no brackets here" });
  });

  it("handles stable entity type", () => {
    const segments = parseEntityLinks("[[stable:h-1:Kokonoe]]");
    expect(segments).toHaveLength(1);
    expect(segments[0]).toEqual({
      type: "link",
      entityType: "stable",
      entityId: "h-1",
      label: "Kokonoe",
    });
  });

  it("handles oyakata entity type", () => {
    const segments = parseEntityLinks("[[oyakata:o-1:Michinoku]]");
    expect(segments).toHaveLength(1);
    expect(segments[0]).toEqual({
      type: "link",
      entityType: "oyakata",
      entityId: "o-1",
      label: "Michinoku",
    });
  });

  it("handles empty string", () => {
    const segments = parseEntityLinks("");
    expect(segments).toHaveLength(1);
    expect(segments[0]).toEqual({ type: "text", content: "" });
  });

  it("handles link at end of string with no trailing text", () => {
    const segments = parseEntityLinks("The winner is [[rikishi:r-1:Asanoyama]]");
    expect(segments).toHaveLength(2);
    expect(segments[0]).toEqual({ type: "text", content: "The winner is " });
    expect(segments[1]).toEqual({
      type: "link",
      entityType: "rikishi",
      entityId: "r-1",
      label: "Asanoyama",
    });
  });
});
