import { describe, expect, it } from "vitest";
import { createBarberCopyFallback } from "../lib/hair/barberCopyFallback";
import { buildBarberCopyInput } from "../lib/hair/barberCopyInput";
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

function input(overrides: Partial<Parameters<typeof buildBarberCopyInput>[0]> = {}) {
  return buildBarberCopyInput({
    prompt: "两侧推短一点，顶部保留",
    intent: baseIntent,
    appliedOperations: [operation("sideLength", 6, 4)],
    scores: baseScores,
    level: levels[0],
    stepIndex: 1,
    ...overrides
  });
}

function playerText(copy: ReturnType<typeof createBarberCopyFallback>) {
  return `${copy.title}${copy.spokenText}`;
}

describe("createBarberCopyFallback", () => {
  it("does not include numeric parameter values in player copy", () => {
    expect(playerText(createBarberCopyFallback(input()))).not.toMatch(/\d/);
  });

  it("does not include raw field names in player copy", () => {
    const copy = createBarberCopyFallback(input({
      appliedOperations: [operation("bangsLength", 7, 5), operation("texture", 2, 4), operation("sideburns", 6, 4)]
    }));
    expect(playerText(copy)).not.toMatch(/bangsLength|texture|sideburns/);
  });

  it("does not include parser, Codex, confidence, latency, or debug terms", () => {
    expect(playerText(createBarberCopyFallback(input()))).not.toMatch(/parser|Codex|confidence|latency|debug|解析|模型|置信|延迟/i);
  });

  it("ambiguous input produces one natural paragraph", () => {
    const copy = createBarberCopyFallback(input({
      prompt: "剪短一点",
      intent: { ...baseIntent, ambiguities: ["没有说明具体区域"] }
    }));
    expect(copy.spokenText).toMatch(/保守|安全|收着|稳/);
    expect(copy.spokenText).not.toContain("没有说明具体区域");
    expect(copy.spokenText).not.toContain("\n");
  });

  it("warning input produces one natural paragraph", () => {
    const copy = createBarberCopyFallback(input({
      intent: { ...baseIntent, warnings: ["顶部长度不能在本轮变长"] }
    }));
    expect(copy.spokenText).toMatch(/谨慎|风险|反悔|收着/);
    expect(copy.spokenText).not.toContain("顶部长度不能在本轮变长");
    expect(copy.spokenText).not.toContain("\n");
  });

  it("confirm-only input says the scissors did not move", () => {
    const copy = createBarberCopyFallback(input({
      prompt: "你先确认一下，不要剪",
      intent: { ...baseIntent, countsAsOperationStep: false },
      appliedOperations: []
    }));
    expect(copy.spokenText).toContain("剪刀先");
    expect(copy.spokenText).toContain("还没下刀");
  });

  it("is deterministic for same input", () => {
    expect(createBarberCopyFallback(input())).toEqual(createBarberCopyFallback(input()));
  });

  it("does not invent operations not present in appliedOperations", () => {
    const copy = createBarberCopyFallback(input({
      prompt: "低渐变，不要太高",
      appliedOperations: [operation("fadeHeight", 0, 1)]
    }));
    expect(copy.spokenText).toContain("渐变");
    expect(copy.spokenText).not.toContain("顶部");
    expect(copy.spokenText).not.toContain("刘海");
    expect(copy.spokenText).not.toContain("鬓角");
  });

  it("responds to complaint about too little cutting before listing facts", () => {
    const copy = createBarberCopyFallback(input({
      prompt: "剪太少了，再明显一点",
      appliedOperations: [operation("topLength", 8, 7), operation("sideLength", 6, 5), operation("bangsLength", 7, 6)]
    }));
    expect(copy.emotion).toBe("reassuring");
    expect(copy.spokenText).toContain("听到了");
    expect(copy.spokenText).toContain("太斯文");
    expect(copy.spokenText).toContain("明确");
    expect(copy.spokenText).not.toContain("顶部有收短，两侧有收短，刘海有收短");
  });

  it("acknowledges do-not-cut-straight and other-areas-unchanged constraints", () => {
    const copy = createBarberCopyFallback(input({
      prompt: "不要剪太齐，其他不动",
      appliedOperations: [operation("bangsLength", 7, 6)]
    }));
    expect(copy.spokenText).toContain("不剪成一条直线");
    expect(copy.spokenText).toContain("其他地方");
    expect(copy.spokenText).toContain("不乱加戏");
  });
});
