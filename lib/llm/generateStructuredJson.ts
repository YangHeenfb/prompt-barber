import { extractJsonObjectText } from "./json";
import { getLlmProviderConfig } from "./providerConfig";
import { generateWithOpenAICompatible } from "./providers/openaiCompatible";
import { generateWithOpenAIResponses } from "./providers/openaiResponses";
import type { StructuredJsonRequest, StructuredJsonResult } from "./types";

export async function generateStructuredJson(request: StructuredJsonRequest): Promise<StructuredJsonResult> {
  const config = getLlmProviderConfig(request.task);
  const result = config.provider === "openai-compatible"
    ? await generateWithOpenAICompatible(config, request)
    : await generateWithOpenAIResponses(config, request);

  return {
    ...result,
    text: extractJsonObjectText(result.text)
  };
}
