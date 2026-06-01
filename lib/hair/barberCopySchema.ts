export type BarberCopyEmotion = "calm" | "careful" | "playful" | "warning" | "confirming" | "reassuring";

export type BarberCopyResponse = {
  title: string;
  spokenText: string;
  emotion: BarberCopyEmotion;
};

export const barberCopyJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "spokenText", "emotion"],
  properties: {
    title: {
      type: "string",
      minLength: 1,
      maxLength: 16
    },
    spokenText: {
      type: "string",
      minLength: 1,
      maxLength: 140
    },
    emotion: {
      type: "string",
      enum: ["calm", "careful", "playful", "warning", "confirming", "reassuring"]
    }
  }
} as const;

const emotions = new Set<BarberCopyEmotion>(["calm", "careful", "playful", "warning", "confirming", "reassuring"]);
const forbiddenCopyPatterns = [
  /\b(?:topLength|sideLength|bangsLength|fadeHeight|volume|texture|sideburns|parting|neckline)\b/,
  /(?:parser|codex|openai|model|json|debug|confidence|latency|api|provider|parameters?)/i,
  /(?:解析|模型|置信|延迟|调试|参数|字段)/,
  /\d/
];

export function validateBarberCopyResponse(value: unknown): value is BarberCopyResponse {
  const candidate = value as Partial<BarberCopyResponse>;
  if (!candidate || typeof candidate !== "object") return false;
  if (typeof candidate.title !== "string" || typeof candidate.spokenText !== "string") return false;
  if (!emotions.has(candidate.emotion as BarberCopyEmotion)) return false;
  if (candidate.title.length === 0 || candidate.title.length > 16) return false;
  if (candidate.spokenText.length === 0 || candidate.spokenText.length > 140) return false;
  if (candidate.spokenText.includes("\n")) return false;
  const sentenceCount = (candidate.spokenText.match(/[。！？!?]/g) ?? []).length;
  if (sentenceCount > 2) return false;
  const playerText = `${candidate.title}${candidate.spokenText}`;
  return forbiddenCopyPatterns.every((pattern) => !pattern.test(playerText));
}

export function safeParseBarberCopyResponse(text: string): BarberCopyResponse | null {
  try {
    const parsed = JSON.parse(text) as unknown;
    return validateBarberCopyResponse(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
