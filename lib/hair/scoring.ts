import type { FieldScoreDetail, HairField, HairState, LevelConfig, NumericHairField, ScoreBreakdown } from "./types";
import { fieldLabels, formatValue } from "./format";

const weights: Record<HairField, number> = {
  topLength: 15,
  sideLength: 15,
  bangsLength: 15,
  fadeHeight: 12,
  volume: 10,
  texture: 10,
  sideburns: 8,
  parting: 8,
  neckline: 7
};

const tolerances: Record<NumericHairField, number> = {
  topLength: 4,
  sideLength: 4,
  bangsLength: 4,
  fadeHeight: 3,
  volume: 5,
  texture: 5,
  sideburns: 4
};

const numericFields: NumericHairField[] = [
  "topLength",
  "sideLength",
  "bangsLength",
  "fadeHeight",
  "volume",
  "texture",
  "sideburns"
];

const allFields = Object.keys(weights) as HairField[];
const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function isNumericField(field: HairField): field is NumericHairField {
  return numericFields.includes(field as NumericHairField);
}

function categoricalRatio(field: HairField, current: string, target: string): number {
  if (current === target) return 1;
  if (field === "neckline" && ((current === "natural" && target === "tapered") || (current === "tapered" && target === "natural"))) {
    return 0.5;
  }
  return 0;
}

function makeFieldMessage(field: HairField, current: HairState[HairField], target: HairState[HairField], scorePercent: number): string {
  if (scorePercent >= 95) return `${fieldLabels[field]}已经非常接近目标。`;
  if (scorePercent >= 70) return `${fieldLabels[field]}基本接近，但还能微调。`;
  if (isNumericField(field)) {
    const diff = Number(current) - Number(target);
    if (diff > 0) return `${fieldLabels[field]}偏长或偏高。`;
    if (diff < 0) return `${fieldLabels[field]}偏短或偏低。`;
  }
  return `${fieldLabels[field]}与目标差距较大。`;
}

export function getFieldScoreDetails(current: HairState, target: HairState): FieldScoreDetail[] {
  return allFields.map((field) => {
    const weight = weights[field];
    let ratio = 0;

    if (isNumericField(field)) {
      const diff = Math.abs(Number(current[field]) - Number(target[field]));
      ratio = Math.max(0, 1 - diff / tolerances[field]);
    } else {
      ratio = categoricalRatio(field, String(current[field]), String(target[field]));
    }

    const rawScore = weight * ratio;
    const scorePercent = Math.round(ratio * 100);
    return {
      field,
      label: fieldLabels[field],
      weight,
      currentValue: current[field],
      targetValue: target[field],
      scorePercent,
      rawScore,
      message: makeFieldMessage(field, current[field], target[field], scorePercent)
    };
  });
}

export function calculateAccuracyScore(current: HairState, target: HairState): { accuracyScore: number; fieldScores: FieldScoreDetail[] } {
  const fieldScores = getFieldScoreDetails(current, target);
  const raw = fieldScores.reduce((sum, detail) => sum + detail.rawScore, 0);
  let normalized = (raw / totalWeight) * 100;

  const lengthFields: NumericHairField[] = ["topLength", "sideLength", "bangsLength", "sideburns"];
  for (const field of lengthFields) {
    if (Number(current[field]) < Number(target[field]) - 1) normalized -= 5;
  }
  if (current.fadeHeight > target.fadeHeight + 1) normalized -= 6;

  return { accuracyScore: clampScore(normalized), fieldScores };
}

export function calculateConstraintScore(level: LevelConfig, current: HairState): { constraintScore: number; violations: string[] } {
  const violations = level.forbiddenRules.filter((rule) => rule.evaluate(current)).map((rule) => rule.label);
  return {
    constraintScore: clampScore(100 - violations.length * 25),
    violations
  };
}

export function calculateStepScore(operationSteps: number, idealOperationSteps: number): number {
  return clampScore(100 - 12 * Math.max(0, operationSteps - idealOperationSteps));
}

export function calculateTimeScore(elapsedSeconds: number, timeTargetSeconds: number): number {
  if (elapsedSeconds <= timeTargetSeconds) return 100;
  return clampScore(100 - Math.ceil((elapsedSeconds - timeTargetSeconds) / 2));
}

export function rankScore(finalScore: number, accuracyScore: number, passThreshold: number): ScoreBreakdown["rank"] {
  if (accuracyScore < passThreshold) return "Fail";
  if (finalScore >= 92) return "S";
  if (finalScore >= 85) return "A";
  if (finalScore >= 75) return "B";
  return "C";
}

export function calculateScores(params: {
  current: HairState;
  level: LevelConfig;
  operationSteps: number;
  elapsedSeconds: number;
}): ScoreBreakdown {
  const { current, level, operationSteps, elapsedSeconds } = params;
  const { accuracyScore, fieldScores } = calculateAccuracyScore(current, level.target);
  const stepScore = calculateStepScore(operationSteps, level.idealOperationSteps);
  const timeScore = calculateTimeScore(elapsedSeconds, level.timeTargetSeconds);
  const { constraintScore, violations } = calculateConstraintScore(level, current);
  const finalScore = Math.round(accuracyScore * 0.7 + stepScore * 0.15 + timeScore * 0.1 + constraintScore * 0.05);
  const passed = accuracyScore >= level.passAccuracyThreshold;

  return {
    accuracyScore,
    stepScore,
    timeScore,
    constraintScore,
    finalScore,
    rank: rankScore(finalScore, accuracyScore, level.passAccuracyThreshold),
    passed,
    elapsedSeconds,
    operationSteps,
    violations,
    fieldScores
  };
}

export function summarizeFieldGap(detail: FieldScoreDetail): string {
  return `${detail.label}：当前 ${formatValue(detail.field, detail.currentValue)}，目标 ${formatValue(detail.field, detail.targetValue)}`;
}
