import { describe, it, expect } from "vitest";
import { parseEntityLinks } from "@/presenters/entityLinks";

describe("Bug O: entityLinks regex matches MentionText pattern", () => {
  it("parses rikishi entity links", () => {
    const segments = parseEntityLinks("[[rikishi:r-1:Asanoyama]]");
    expect(segments).toHaveLength(1);
    expect(segments[0].type).toBe("link");
    if (segments[0].type === "link") {
      expect(segments[0].entityType).toBe("rikishi");
      expect(segments[0].entityId).toBe("r-1");
      expect(segments[0].label).toBe("Asanoyama");
    }
  });

  it("parses stable entity links", () => {
    const segments = parseEntityLinks("[[stable:h-1:Kokonoe]]");
    expect(segments).toHaveLength(1);
    expect(segments[0].type).toBe("link");
    if (segments[0].type === "link") {
      expect(segments[0].entityType).toBe("stable");
    }
  });

  it("parses oyakata entity links", () => {
    const segments = parseEntityLinks("[[oyakata:o-1:Michinoku]]");
    expect(segments).toHaveLength(1);
    expect(segments[0].type).toBe("link");
    if (segments[0].type === "link") {
      expect(segments[0].entityType).toBe("oyakata");
    }
  });

  it("does not match unknown entity types like 'heya'", () => {
    const segments = parseEntityLinks("[[heya:h-1:Kokonoe]]");
    expect(segments).toHaveLength(1);
    expect(segments[0].type).toBe("text");
  });

  it("does not match arbitrary word entity types", () => {
    const segments = parseEntityLinks("[[unknown:x-1:Foo]]");
    expect(segments).toHaveLength(1);
    expect(segments[0].type).toBe("text");
  });
});
