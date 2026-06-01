import type { LlmProviderConfig, StructuredJsonRequest, StructuredJsonResult } from "../types";

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

function extractMessageContent(response: ChatCompletionResponse): string {
  const content = response.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((item) => item.text)
      .filter((text): text is string => typeof text === "string")
      .join("");
  }
  return "";
}

export async function generateWithOpenAICompatible(
  config: LlmProviderConfig,
  request: StructuredJsonRequest
): Promise<StructuredJsonResult> {
  if (!config.apiKey) {
    throw new Error("未设置 PROMPT_BARBER_LLM_API_KEY 或 OPENAI_API_KEY。");
  }
  if (!config.baseUrl) {
    throw new Error("openai-compatible provider 需要设置 PROMPT_BARBER_LLM_BASE_URL。");
  }

  const response = await fetch(joinUrl(config.baseUrl, "/chat/completions"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: "system",
          content: [
            request.systemInstruction,
            "Return only a JSON object that matches this JSON Schema. Do not wrap it in Markdown.",
            JSON.stringify(request.schema)
          ].join("\n\n")
        },
        {
          role: "user",
          content: JSON.stringify(request.userPayload, null, 2)
        }
      ],
      temperature: 0.2
    })
  });

  const body = (await response.json().catch(() => null)) as ChatCompletionResponse | null;
  if (!response.ok) {
    throw new Error(body?.error?.message || `OpenAI-compatible API returned ${response.status}`);
  }

  return {
    provider: config.provider,
    model: config.model,
    text: body ? extractMessageContent(body) : ""
  };
}
