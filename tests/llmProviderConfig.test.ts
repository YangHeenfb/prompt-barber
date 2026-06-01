import { describe, expect, it } from "vitest";
import { getLlmProviderConfig } from "../lib/llm/providerConfig";

describe("llm provider config", () => {
  it("keeps legacy OpenAI environment variables compatible by default", () => {
    const config = getLlmProviderConfig("parse", {
      OPENAI_API_KEY: "legacy-key",
      OPENAI_MODEL: "legacy-model"
    });

    expect(config).toEqual({
      provider: "openai-responses",
      apiKey: "legacy-key",
      baseUrl: undefined,
      model: "legacy-model"
    });
  });

  it("prefers Prompt Barber provider environment variables over legacy OpenAI variables", () => {
    const parseConfig = getLlmProviderConfig("parse", {
      PROMPT_BARBER_LLM_PROVIDER: "openai-compatible",
      PROMPT_BARBER_LLM_API_KEY: "new-key",
      PROMPT_BARBER_LLM_BASE_URL: "https://llm.example/v1",
      PROMPT_BARBER_LLM_MODEL: "shared-model",
      PROMPT_BARBER_PARSE_MODEL: "parse-model",
      OPENAI_API_KEY: "legacy-key",
      OPENAI_MODEL: "legacy-model"
    });

    const copyConfig = getLlmProviderConfig("barberCopy", {
      PROMPT_BARBER_LLM_PROVIDER: "openai-compatible",
      PROMPT_BARBER_LLM_API_KEY: "new-key",
      PROMPT_BARBER_LLM_BASE_URL: "https://llm.example/v1",
      PROMPT_BARBER_LLM_MODEL: "shared-model",
      PROMPT_BARBER_BARBER_COPY_MODEL: "copy-model",
      OPENAI_BARBER_COPY_MODEL: "legacy-copy-model",
      OPENAI_MODEL: "legacy-model"
    });

    expect(parseConfig).toMatchObject({
      provider: "openai-compatible",
      apiKey: "new-key",
      baseUrl: "https://llm.example/v1",
      model: "parse-model"
    });
    expect(copyConfig).toMatchObject({
      provider: "openai-compatible",
      model: "copy-model"
    });
  });

  it("uses the shared Prompt Barber model when task-specific models are not set", () => {
    expect(getLlmProviderConfig("parse", { PROMPT_BARBER_LLM_MODEL: "shared-model" }).model).toBe("shared-model");
    expect(getLlmProviderConfig("barberCopy", { PROMPT_BARBER_LLM_MODEL: "shared-model" }).model).toBe("shared-model");
  });

  it("selects the OpenAI-compatible provider when a base URL is configured", () => {
    const config = getLlmProviderConfig("parse", {
      PROMPT_BARBER_LLM_BASE_URL: "https://openrouter.ai/api/v1"
    });

    expect(config.provider).toBe("openai-compatible");
  });

  it("rejects unsupported provider ids clearly", () => {
    expect(() => getLlmProviderConfig("parse", { PROMPT_BARBER_LLM_PROVIDER: "anthropic" })).toThrow(
      "Unsupported LLM provider"
    );
  });
});
