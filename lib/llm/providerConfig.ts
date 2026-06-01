import type { LlmProviderConfig, LlmProviderId, LlmTask } from "./types";

type EnvLike = Record<string, string | undefined>;

const defaultModel = "gpt-5.4-mini";
const providerIds = new Set<LlmProviderId>(["openai-responses", "openai-compatible"]);

function readProvider(env: EnvLike): LlmProviderId {
  const configuredProvider = env.PROMPT_BARBER_LLM_PROVIDER?.trim();
  if (configuredProvider) {
    if (!providerIds.has(configuredProvider as LlmProviderId)) {
      throw new Error(`Unsupported LLM provider: ${configuredProvider}`);
    }
    return configuredProvider as LlmProviderId;
  }

  return env.PROMPT_BARBER_LLM_BASE_URL ? "openai-compatible" : "openai-responses";
}

function readModel(task: LlmTask, env: EnvLike): string {
  const taskModel = task === "parse"
    ? env.PROMPT_BARBER_PARSE_MODEL
    : env.PROMPT_BARBER_BARBER_COPY_MODEL;
  const legacyTaskModel = task === "barberCopy" ? env.OPENAI_BARBER_COPY_MODEL : undefined;

  return (
    taskModel?.trim() ||
    env.PROMPT_BARBER_LLM_MODEL?.trim() ||
    legacyTaskModel?.trim() ||
    env.OPENAI_MODEL?.trim() ||
    defaultModel
  );
}

export function getLlmProviderConfig(task: LlmTask, env: EnvLike = process.env): LlmProviderConfig {
  return {
    provider: readProvider(env),
    apiKey: env.PROMPT_BARBER_LLM_API_KEY || env.OPENAI_API_KEY,
    baseUrl: env.PROMPT_BARBER_LLM_BASE_URL,
    model: readModel(task, env)
  };
}
