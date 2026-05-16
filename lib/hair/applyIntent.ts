import type { AppliedOperation, HairField, HairIntent, HairOperation, HairState, NumericHairField } from "./types";
import { fieldLabels, formatValue } from "./format";

const numericRanges: Record<NumericHairField, [number, number]> = {
  topLength: [0, 10],
  sideLength: [0, 10],
  bangsLength: [0, 10],
  fadeHeight: [0, 5],
  volume: [0, 10],
  texture: [0, 10],
  sideburns: [0, 10]
};

const lengthFields = new Set<HairField>(["topLength", "sideLength", "bangsLength", "sideburns"]);
const numericFields = new Set<HairField>(Object.keys(numericRanges) as HairField[]);

function isNumericField(field: HairField): field is NumericHairField {
  return numericFields.has(field);
}

function clampNumber(field: NumericHairField, value: number): number {
  const [min, max] = numericRanges[field];
  return Math.max(min, Math.min(max, Math.round(value)));
}

function applyNumberOperation(current: number, operation: HairOperation, field: NumericHairField): number {
  const rawValue = Number(operation.value);
  const safeValue = Number.isFinite(rawValue) ? rawValue : 0;
  if (operation.operation === "increment") return clampNumber(field, current + safeValue);
  if (operation.operation === "decrement") return clampNumber(field, current - safeValue);
  return clampNumber(field, safeValue);
}

export function applyIntent(currentState: HairState, intent: HairIntent): {
  nextState: HairState;
  appliedOperations: AppliedOperation[];
  warnings: string[];
} {
  const nextState: HairState = { ...currentState };
  const appliedOperations: AppliedOperation[] = [];
  const warnings: string[] = [...intent.warnings];

  for (const operation of intent.operations) {
    const field = operation.field;
    const before = nextState[field];

    if (isNumericField(field)) {
      const beforeNumber = Number(before);
      const nextNumber = applyNumberOperation(beforeNumber, operation, field);

      if (lengthFields.has(field) && nextNumber > beforeNumber) {
        const message = `${fieldLabels[field]}不能在本轮变长，已忽略“${operation.reason}”。`;
        warnings.push(message);
        appliedOperations.push({ operation, before, after: before, applied: false, message });
        continue;
      }

      nextState[field] = nextNumber as never;
      const applied = nextNumber !== beforeNumber;
      appliedOperations.push({
        operation,
        before,
        after: nextNumber,
        applied,
        message: applied
          ? `${fieldLabels[field]}：${formatValue(field, before)} → ${formatValue(field, nextNumber)}`
          : `${fieldLabels[field]}保持不变。`
      });
      continue;
    }

    if (field === "parting") {
      const value = String(operation.value);
      if (!["none", "middle", "left", "right"].includes(value)) {
        const message = `无法识别分缝值“${value}”。`;
        warnings.push(message);
        appliedOperations.push({ operation, before, after: before, applied: false, message });
        continue;
      }
      nextState.parting = value as HairState["parting"];
      appliedOperations.push({
        operation,
        before,
        after: nextState.parting,
        applied: before !== nextState.parting,
        message: before !== nextState.parting
          ? `${fieldLabels[field]}：${formatValue(field, before)} → ${formatValue(field, nextState.parting)}`
          : `${fieldLabels[field]}保持不变。`
      });
      continue;
    }

    if (field === "neckline") {
      const value = String(operation.value);
      if (!["natural", "clean", "tapered"].includes(value)) {
        const message = `无法识别后颈线条“${value}”。`;
        warnings.push(message);
        appliedOperations.push({ operation, before, after: before, applied: false, message });
        continue;
      }
      nextState.neckline = value as HairState["neckline"];
      appliedOperations.push({
        operation,
        before,
        after: nextState.neckline,
        applied: before !== nextState.neckline,
        message: before !== nextState.neckline
          ? `${fieldLabels[field]}：${formatValue(field, before)} → ${formatValue(field, nextState.neckline)}`
          : `${fieldLabels[field]}保持不变。`
      });
    }
  }

  return { nextState, appliedOperations, warnings };
}
