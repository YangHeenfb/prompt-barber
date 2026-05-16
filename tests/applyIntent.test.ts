import { describe, expect, it } from "vitest";
import { applyIntent } from "../lib/hair/applyIntent";
import { initialHairState } from "../lib/hair/levels";
import type { HairIntent } from "../lib/hair/types";

describe("apply intent", () => {
  it("applies decrement operations", () => {
    const intent: HairIntent = {
      operations: [{ field: "sideLength", operation: "decrement", value: 2, reason: "test" }],
      confidence: 1,
      ambiguities: [],
      warnings: [],
      interpretationNote: "test",
      countsAsOperationStep: true
    };
    const result = applyIntent(initialHairState, intent);
    expect(result.nextState.sideLength).toBe(initialHairState.sideLength - 2);
    expect(result.appliedOperations[0].applied).toBe(true);
  });

  it("does not allow length fields to grow back", () => {
    const intent: HairIntent = {
      operations: [{ field: "bangsLength", operation: "increment", value: 2, reason: "try growing" }],
      confidence: 1,
      ambiguities: [],
      warnings: [],
      interpretationNote: "test",
      countsAsOperationStep: true
    };
    const result = applyIntent(initialHairState, intent);
    expect(result.nextState.bangsLength).toBe(initialHairState.bangsLength);
    expect(result.appliedOperations[0].applied).toBe(false);
    expect(result.warnings.join(" ")).toContain("不能在本轮变长");
  });
});
