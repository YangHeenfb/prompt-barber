export type LlmTask = "parse" | "barberCopy";

export type LlmProviderId = "openai-responses" | "openai-compatible";

export type LlmProviderConfig = {
  provider: LlmProviderId;
  apiKey?: string;
  baseUrl?: string;
  model: string;
};

export type StructuredJsonRequest = {
  task: LlmTask;
  schemaName: string;
  schema: unknown;
  systemInstruction: string;
  userPayload: unknown;
};

export type StructuredJsonResult = {
  provider: LlmProviderId;
  model: string;
  text: string;
};
