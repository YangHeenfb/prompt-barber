import type { HairField, HairIntent, HairOperation } from "./types";

export const hairFields: HairField[] = [
  "topLength",
  "sideLength",
  "bangsLength",
  "fadeHeight",
  "volume",
  "texture",
  "sideburns",
  "parting",
  "neckline"
];

export const hairIntentJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["operations", "confidence", "ambiguities", "warnings", "interpretationNote", "countsAsOperationStep"],
  properties: {
    operations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["field", "operation", "value", "reason"],
        properties: {
          field: { type: "string", enum: hairFields },
          operation: { type: "string", enum: ["set", "increment", "decrement"] },
          value: {
            anyOf: [{ type: "number" }, { type: "string" }]
          },
          reason: { type: "string" }
        }
      }
    },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    ambiguities: { type: "array", items: { type: "string" } },
    warnings: { type: "array", items: { type: "string" } },
    interpretationNote: { type: "string" },
    countsAsOperationStep: { type: "boolean" }
  }
} as const;

function isOperation(value: unknown): value is HairOperation {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<HairOperation>;
  return (
    typeof candidate.field === "string" &&
    hairFields.includes(candidate.field as HairField) &&
    ["set", "increment", "decrement"].includes(String(candidate.operation)) &&
    (typeof candidate.value === "number" || typeof candidate.value === "string") &&
    typeof candidate.reason === "string"
  );
}

export function validateHairIntent(value: unknown): value is HairIntent {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<HairIntent>;
  return (
    Array.isArray(candidate.operations) &&
    candidate.operations.every(isOperation) &&
    typeof candidate.confidence === "number" &&
    candidate.confidence >= 0 &&
    candidate.confidence <= 1 &&
    Array.isArray(candidate.ambiguities) &&
    candidate.ambiguities.every((item) => typeof item === "string") &&
    Array.isArray(candidate.warnings) &&
    candidate.warnings.every((item) => typeof item === "string") &&
    typeof candidate.interpretationNote === "string" &&
    typeof candidate.countsAsOperationStep === "boolean"
  );
}

export function safeParseHairIntent(text: string): HairIntent | null {
  try {
    const parsed: unknown = JSON.parse(text);
    return validateHairIntent(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
