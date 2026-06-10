import { describe, it, expect } from "vitest";
import { parseLLMResponse, safeParse } from "../jsonParser";

describe("parseLLMResponse", () => {
  it("parses valid strict JSON", () => {
    const input = '{"hello": "world", "count": 1}';
    expect(parseLLMResponse(input)).toEqual({ hello: "world", count: 1 });
  });

  it("strips markdown json blocks", () => {
    const input = '```json\n{"hello": "world"}\n```';
    expect(parseLLMResponse(input)).toEqual({ hello: "world" });
  });

  it("throws a descriptive error on completely invalid JSON", () => {
    const input = "not json at all";
    expect(() => parseLLMResponse(input)).toThrow(/Failed to parse LLM payload/);
  });

  it("throws descriptive error when JSON fails after sanitization", () => {
    const input = '```json\n{unclosed: "bracket"\n```';
    expect(() => parseLLMResponse(input)).toThrow(/Failed to parse LLM payload/);
  });

  it("parses arrays with markdown blocks", () => {
    const input = '```json\n["item1", "item2"]\n```';
    expect(parseLLMResponse<string[]>(input)).toEqual(["item1", "item2"]);
  });

  it("prevents prototype pollution in parseLLMResponse", () => {
    const input = '{"__proto__": {"polluted": true}, "hello": "world"}';
    const result = parseLLMResponse(input);
    expect(result).toEqual({ hello: "world" });
     
    expect((result as any).__proto__.polluted).toBeUndefined();
  });

  it("includes specific guidance in error message", () => {
    const input = '```json\n{invalid\n```';
    expect(() => parseLLMResponse(input)).toThrow(/generationConfig\.responseMimeType/);
  });

  it("parses nested objects with strict JSON", () => {
    const input = '{"outer": {"inner": "value"}}';
    expect(parseLLMResponse(input)).toEqual({ outer: { inner: "value" } });
  });
});

describe("safeParse", () => {
  it("parses valid JSON successfully", () => {
    const input = '{"hello": "world"}';
    const fallback = { hello: "fallback" };
    expect(safeParse(input, fallback)).toEqual({ hello: "world" });
  });

  it("returns fallback for invalid JSON", () => {
    const input = "invalid json";
    const fallback = { hello: "fallback" };
    expect(safeParse(input, fallback)).toEqual(fallback);
  });

  it("returns fallback for non-object JSON", () => {
    const input = "123";
    const fallback = { hello: "fallback" };
    expect(safeParse(input, fallback)).toEqual(fallback);
  });

  it("prevents prototype pollution", () => {
    const input = '{"__proto__": {"polluted": true}, "hello": "world"}';
    const fallback = { hello: "fallback" };
    const result = safeParse(input, fallback);
    expect(result).toEqual({ hello: "world" });
     
    expect((result as any).__proto__.polluted).toBeUndefined();
    expect({}["polluted" as keyof object]).toBeUndefined();
  });
});
