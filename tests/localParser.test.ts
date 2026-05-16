import { describe, expect, it } from "vitest";
import { initialHairState } from "../lib/hair/levels";
import { parseHairPrompt } from "../lib/hair/localParser";

describe("local parser", () => {
  it("parses clear side shortening and top protection", () => {
    const intent = parseHairPrompt("两侧推短一点，顶部保留", initialHairState);
    expect(intent.operations.some((operation) => operation.field === "sideLength" && operation.operation === "decrement")).toBe(true);
    expect(intent.operations.some((operation) => operation.field === "topLength")).toBe(false);
    expect(intent.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it("handles vague shortening with ambiguity", () => {
    const intent = parseHairPrompt("剪短一点", initialHairState);
    expect(intent.operations.map((operation) => operation.field)).toContain("sideLength");
    expect(intent.operations.map((operation) => operation.field)).toContain("bangsLength");
    expect(intent.ambiguities.length).toBeGreaterThan(0);
    expect(intent.confidence).toBeLessThan(0.7);
  });

  it("does not count confirmation as an operation step", () => {
    const intent = parseHairPrompt("先别剪，确认一下你理解的是两侧推短", initialHairState);
    expect(intent.operations).toHaveLength(0);
    expect(intent.countsAsOperationStep).toBe(false);
  });
});
