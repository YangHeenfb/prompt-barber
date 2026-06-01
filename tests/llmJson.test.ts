import { describe, expect, it } from "vitest";
import { safeParseHairIntent } from "../lib/hair/schema";
import { safeParseBarberCopyResponse } from "../lib/hair/barberCopySchema";
import { extractJsonObjectText } from "../lib/llm/json";

const validIntentJson = JSON.stringify({
  operations: [],
  confidence: 0.8,
  ambiguities: [],
  warnings: [],
  interpretationNote: "保守理解。",
  countsAsOperationStep: false
});

describe("llm json extraction", () => {
  it("keeps pure JSON output parseable", () => {
    expect(safeParseHairIntent(extractJsonObjectText(validIntentJson))).not.toBeNull();
  });

  it("extracts JSON from common fenced model output", () => {
    const text = `当然可以：\n\n\`\`\`json\n${validIntentJson}\n\`\`\``;

    expect(safeParseHairIntent(extractJsonObjectText(text))).not.toBeNull();
  });

  it("extracts the first balanced JSON object from prose", () => {
    const text = `Here is the result: ${validIntentJson}\nDone.`;

    expect(safeParseHairIntent(extractJsonObjectText(text))).not.toBeNull();
  });

  it("preserves strings with braces while finding the JSON boundary", () => {
    const json = JSON.stringify({
      title: "镜前确认",
      spokenText: "这句我按{保守}理解，剪刀先稳住。",
      emotion: "careful"
    });

    expect(safeParseBarberCopyResponse(extractJsonObjectText(`Result:\n${json}\nextra`))).not.toBeNull();
  });

  it("does not make invalid schema output look valid", () => {
    const invalidJson = JSON.stringify({ operations: [] });

    expect(safeParseHairIntent(extractJsonObjectText(invalidJson))).toBeNull();
  });
});
