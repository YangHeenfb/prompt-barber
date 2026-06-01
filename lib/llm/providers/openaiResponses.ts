import type { LlmProviderConfig, StructuredJsonRequest, StructuredJsonResult } from "../types";

function extractOutputText(response: unknown): string {
  const candidate = response as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> };
  if (typeof candidate.output_text === "string") return candidate.output_text;
  const firstText = candidate.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => content.text)
    .find((text) => typeof text === "string");
  return firstText ?? "";
}

export async function generateWithOpenAIResponses(
  config: LlmProviderConfig,
  request: StructuredJsonRequest
): Promise<StructuredJsonResult> {
  if (!config.apiKey) {
    throw new Error("未设置 PROMPT_BARBER_LLM_API_KEY 或 OPENAI_API_KEY。");
  }

  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({
    apiKey: config.apiKey,
    ...(config.baseUrl ? { baseURL: config.baseUrl } : {})
  });

  const response = await client.responses.create({
    model: config.model,
    input: [
      {
        role: "system",
        content: request.systemInstruction
      },
      {
        role: "user",
        content: JSON.stringify(request.userPayload, null, 2)
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: request.schemaName,
        strict: true,
        schema: request.schema
      }
    }
  } as never);

  return {
    provider: config.provider,
    model: config.model,
    text: extractOutputText(response)
  };
}
