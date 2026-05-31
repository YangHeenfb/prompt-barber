import { describe, expect, it } from "vitest";
import {
  buildStageHistoryEntries,
  getNextStageReviewStep,
  getPreviousStageReviewStep,
  resolveStageReviewView
} from "../components/GameStage";
import { initialHairState, levels } from "../lib/hair/levels";
import { calculateScores } from "../lib/hair/scoring";
import type { HairState, PromptHistoryItem } from "../lib/hair/types";

function makeHistoryItem(id: string, prompt: string, afterState: HairState, operationSteps: number): PromptHistoryItem {
  return {
    id,
    prompt,
    parserLabel: "Codex CLI 解析",
    intent: {
      operations: [{ field: "sideLength", operation: "decrement", value: 1, reason: "test" }],
      confidence: 1,
      ambiguities: [],
      warnings: [],
      interpretationNote: `${prompt} 的理解结果`,
      countsAsOperationStep: true
    },
    appliedOperations: [
      {
        operation: { field: "sideLength", operation: "decrement", value: 1, reason: "test" },
        before: initialHairState.sideLength,
        after: afterState.sideLength,
        applied: true,
        message: `两侧长度变为 ${afterState.sideLength}`
      }
    ],
    beforeState: initialHairState,
    afterState,
    warnings: [],
    ambiguities: [],
    scores: calculateScores({
      current: afterState,
      level: levels[0],
      operationSteps,
      elapsedSeconds: operationSteps * 10
    }),
    createdAt: 1_700_000_000_000 + operationSteps * 10_000
  };
}

describe("stage history review", () => {
  it("maps newest-first history into execution-order stage steps", () => {
    const first = makeHistoryItem("first", "第一步：两侧剪短", { ...initialHairState, sideLength: 5 }, 1);
    const second = makeHistoryItem("second", "第二步：刘海打薄", { ...first.afterState, bangsLength: 5 }, 2);

    const entries = buildStageHistoryEntries([second, first]);

    expect(entries.map((entry) => entry.stepNumber)).toEqual([1, 2]);
    expect(entries.map((entry) => entry.item.prompt)).toEqual(["第一步：两侧剪短", "第二步：刘海打薄"]);
  });

  it("defaults to the latest step when there is prompt history", () => {
    const first = makeHistoryItem("first", "第一步：两侧剪短", { ...initialHairState, sideLength: 5 }, 1);
    const second = makeHistoryItem("second", "第二步：刘海打薄", { ...first.afterState, bangsLength: 5 }, 2);

    const view = resolveStageReviewView(second.afterState, [second, first], null);

    expect(view.stepNumber).toBe(2);
    expect(view.item?.prompt).toBe("第二步：刘海打薄");
    expect(view.hairState).toEqual(second.afterState);
  });

  it("can resolve an older step without changing the current hair state", () => {
    const first = makeHistoryItem("first", "第一步：两侧剪短", { ...initialHairState, sideLength: 5 }, 1);
    const second = makeHistoryItem("second", "第二步：刘海打薄", { ...first.afterState, bangsLength: 5 }, 2);

    const view = resolveStageReviewView(second.afterState, [second, first], 1);

    expect(view.stepNumber).toBe(1);
    expect(view.item?.prompt).toBe("第一步：两侧剪短");
    expect(view.hairState).toEqual(first.afterState);
    expect(second.afterState.bangsLength).toBe(5);
  });

  it("can resolve step zero as the initial hair state", () => {
    const first = makeHistoryItem("first", "第一步：两侧剪短", { ...initialHairState, sideLength: 5 }, 1);

    const view = resolveStageReviewView(first.afterState, [first], 0);

    expect(view.stepNumber).toBe(0);
    expect(view.item).toBeNull();
    expect(view.isInitialStep).toBe(true);
    expect(view.hairState).toEqual(initialHairState);
  });

  it("moves through history with previous and next arrows", () => {
    expect(getPreviousStageReviewStep(null, 1)).toBe(0);
    expect(getPreviousStageReviewStep(1, 1)).toBe(0);
    expect(getPreviousStageReviewStep(0, 1)).toBe(0);
    expect(getNextStageReviewStep(0, 1)).toBeNull();

    expect(getPreviousStageReviewStep(null, 3)).toBe(2);
    expect(getPreviousStageReviewStep(2, 3)).toBe(1);
    expect(getPreviousStageReviewStep(1, 3)).toBe(0);
    expect(getPreviousStageReviewStep(0, 3)).toBe(0);
    expect(getNextStageReviewStep(0, 3)).toBe(1);
    expect(getNextStageReviewStep(1, 3)).toBe(2);
    expect(getNextStageReviewStep(2, 3)).toBeNull();
    expect(getNextStageReviewStep(null, 3)).toBeNull();
  });
});
