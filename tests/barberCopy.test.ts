import { describe, expect, it } from "vitest";
import { createBarberCopy } from "../lib/hair/barberCopy";
import { levels } from "../lib/hair/levels";
import type { AppliedOperation, HairIntent, ScoreBreakdown } from "../lib/hair/types";

const baseIntent: HairIntent = {
  operations: [],
  confidence: 0.9,
  ambiguities: [],
  warnings: [],
  interpretationNote: "机械说明不应该直接展示。",
  countsAsOperationStep: true
};

const baseScores: ScoreBreakdown = {
  accuracyScore: 72,
  stepScore: 100,
  timeScore: 100,
  constraintScore: 100,
  finalScore: 80,
  rank: "B",
  passed: false,
  elapsedSeconds: 10,
  operationSteps: 1,
  violations: [],
  fieldScores: []
};

function operation(field: AppliedOperation["operation"]["field"], before: number | string, after: number | string): AppliedOperation {
  return {
    operation: {
      field,
      operation: "set",
      value: after,
      reason: "测试"
    },
    before,
    after,
    applied: before !== after,
    message: "机械操作说明"
  };
}

function copy(overrides: Partial<Parameters<typeof createBarberCopy>[0]> = {}) {
  return createBarberCopy({
    prompt: "两侧推短一点，顶部保留",
    intent: baseIntent,
    appliedOperations: [operation("sideLength", 6, 4)],
    scores: baseScores,
    level: levels[0],
    stepIndex: 1,
    ...overrides
  });
}

function playerText(result: ReturnType<typeof createBarberCopy>) {
  return `${result.title}${result.spokenText}`;
}

describe("createBarberCopy", () => {
  it("does not include numeric parameter values in player copy", () => {
    expect(playerText(copy())).not.toMatch(/\d/);
  });

  it("does not include raw field names in player copy", () => {
    expect(playerText(copy({ appliedOperations: [operation("bangsLength", 7, 5), operation("texture", 2, 4), operation("sideburns", 6, 4)] }))).not.toMatch(
      /bangsLength|texture|sideburns/
    );
  });

  it("does not include parser, Codex, confidence, latency, or debug terms", () => {
    expect(playerText(copy())).not.toMatch(/parser|Codex|confidence|latency|debug|解析|模型|置信|延迟/i);
  });

  it("ambiguous input produces one natural paragraph", () => {
    const result = copy({
      prompt: "剪短一点",
      intent: { ...baseIntent, ambiguities: ["没有说明具体区域"] }
    });
    expect(result.spokenText).toContain("保守");
    expect(result.spokenText).not.toContain("没有说明具体区域");
    expect(result.spokenText).not.toContain("\n");
  });

  it("warning input produces one natural paragraph", () => {
    const result = copy({
      intent: { ...baseIntent, warnings: ["顶部长度不能在本轮变长"] }
    });
    expect(result.spokenText).toMatch(/谨慎|风险|反悔|收着/);
    expect(result.spokenText).not.toContain("顶部长度不能在本轮变长");
    expect(result.spokenText).not.toContain("\n");
  });

  it("confirm-only input says the scissors did not move", () => {
    const result = copy({
      prompt: "你先确认一下，不要剪",
      intent: { ...baseIntent, countsAsOperationStep: false },
      appliedOperations: []
    });
    expect(result.spokenText).toContain("剪刀先不动");
  });

  it("is deterministic for same input", () => {
    expect(copy()).toEqual(copy());
  });

  it("does not invent operations not present in appliedOperations", () => {
    const result = copy({
      prompt: "低渐变，不要太高",
      appliedOperations: [operation("fadeHeight", 0, 1)]
    });
    expect(result.spokenText).toContain("渐变");
    expect(result.spokenText).not.toContain("顶部");
    expect(result.spokenText).not.toContain("刘海");
    expect(result.spokenText).not.toContain("鬓角");
  });
});
