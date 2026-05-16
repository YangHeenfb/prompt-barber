import { describe, expect, it } from "vitest";
import { calculateAccuracyScore, calculateScores } from "../lib/hair/scoring";
import { levels } from "../lib/hair/levels";

describe("scoring", () => {
  it("gives a perfect accuracy score for the exact target", () => {
    const level = levels[0];
    const result = calculateAccuracyScore(level.target, level.target);
    expect(result.accuracyScore).toBe(100);
  });

  it("penalizes overcut length fields", () => {
    const level = levels[0];
    const current = { ...level.target, bangsLength: 1 };
    const result = calculateAccuracyScore(current, level.target);
    expect(result.accuracyScore).toBeLessThan(90);
  });

  it("passes based on accuracy threshold, not final score alone", () => {
    const level = levels[0];
    const scores = calculateScores({ current: level.target, level, operationSteps: 8, elapsedSeconds: 200 });
    expect(scores.passed).toBe(true);
    expect(scores.accuracyScore).toBe(100);
    expect(scores.stepScore).toBeLessThan(100);
    expect(scores.timeScore).toBeLessThan(100);
  });
});
