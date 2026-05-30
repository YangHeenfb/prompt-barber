import { fieldLabels, formatValue } from "./format";
import type { AppliedOperation, HairIntent, HairState, LevelConfig, ScoreBreakdown } from "./types";

export type BarberCopy = {
  title: string;
  spokenText: string;
  debug?: {
    parserMode?: string;
    latencyMs?: number;
    operationSummary?: string[];
    ambiguitySummary?: string[];
    warningSummary?: string[];
  };
};

type BarberCopyInput = {
  prompt: string;
  intent: HairIntent;
  appliedOperations: AppliedOperation[];
  scores: ScoreBreakdown;
  level: LevelConfig;
  stepIndex: number;
};

const lengthFields = new Set<keyof HairState>(["topLength", "sideLength", "bangsLength", "sideburns"]);

const normalTitles = ["镜前确认一下", "这次我这样处理", "师傅听明白了", "下刀前说清楚"] as const;
const ambiguousTitles = ["这句有点含糊", "我先保守处理", "这次先稳着来"] as const;
const confirmTitles = ["剪刀先放下", "先不下刀", "只做确认"] as const;

const starts = ["收到", "明白", "好", "行"] as const;
const conservativeNotes = ["你这句范围有点大，我先按安全剪法来", "这里我会保守一点，不做大动作", "我先收着来，避免一刀过头"] as const;
const warningNotes = ["这里有点风险，我会放慢手", "这个地方不好反悔，我会收着点", "这块我会谨慎处理"] as const;
const highAccuracyNotes = ["现在挺接近了，别贪刀", "已经差不多到位，后面轻修就好", "这个状态不错，别再下太狠"] as const;

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pick<T>(items: readonly T[], seed: number, salt: number): T {
  return items[(seed + salt) % items.length];
}

function seedFrom(input: BarberCopyInput): number {
  const operationKey = input.appliedOperations
    .map((item) => `${item.operation.field}:${item.before}->${item.after}:${item.applied}`)
    .join("|");
  return hashString(`${input.prompt}|${input.stepIndex}|${operationKey}`);
}

function isShortening(operation: AppliedOperation): boolean {
  return operation.applied && lengthFields.has(operation.operation.field) && Number(operation.after) < Number(operation.before);
}

function fieldNoun(field: keyof HairState): string {
  switch (field) {
    case "topLength":
      return "顶部";
    case "sideLength":
      return "两侧";
    case "bangsLength":
      return "刘海";
    case "fadeHeight":
      return "渐变";
    case "volume":
      return "整体蓬松感";
    case "texture":
      return "发尾层次";
    case "sideburns":
      return "鬓角";
    case "parting":
      return "分线";
    case "neckline":
      return "后颈";
  }
}

function categoricalPhrase(operation: AppliedOperation): string {
  const field = operation.operation.field;
  if (field === "parting") {
    const value = String(operation.after);
    if (value === "middle") return "分线做成中分";
    if (value === "left") return "分线往左边走";
    if (value === "right") return "分线往右边走";
    return "分线先拿掉";
  }

  const value = String(operation.after);
  if (value === "clean") return "后颈收干净";
  if (value === "tapered") return "后颈做自然过渡";
  return "后颈保留自然边缘";
}

function operationPhrase(operation: AppliedOperation): string | null {
  if (!operation.applied) {
    return null;
  }

  const field = operation.operation.field;
  if (field === "parting" || field === "neckline") {
    return categoricalPhrase(operation);
  }

  const before = Number(operation.before);
  const after = Number(operation.after);
  const noun = fieldNoun(field);
  if (after < before) {
    if (field === "fadeHeight") return "渐变压低一点";
    if (field === "volume") return "整体蓬松感压低一点";
    if (field === "texture") return "发尾层次收柔一点";
    return `${noun}稍微收短`;
  }
  if (after > before) {
    if (field === "fadeHeight") return "渐变往上带一点";
    if (field === "volume") return "整体蓬松感抬起来";
    if (field === "texture") return "发尾层次做碎一点";
    return `${noun}轻轻调整`;
  }
  return null;
}

function joinPhrases(phrases: string[]): string {
  if (phrases.length === 0) {
    return "";
  }
  if (phrases.length === 1) {
    return phrases[0];
  }
  return `${phrases.slice(0, -1).join("，")}，${phrases[phrases.length - 1]}`;
}

function makeSpokenText(input: BarberCopyInput, seed: number): string {
  const appliedPhrases = input.appliedOperations
    .map(operationPhrase)
    .filter((phrase): phrase is string => Boolean(phrase))
    .slice(0, 3);
  const hasShortening = input.appliedOperations.some(isShortening);
  const hasWarning = input.intent.warnings.length > 0 || hasShortening;
  const hasAmbiguity = input.intent.ambiguities.length > 0;

  if (!input.intent.countsAsOperationStep || input.appliedOperations.length === 0) {
    const second = hasAmbiguity ? "你这句我先按保守意思记着，等你点头再动。" : "我先把意思核清楚，等你点头再动。";
    return `剪刀先不动，现在还没下刀。${second}`;
  }

  if (appliedPhrases.length === 0) {
    return "这轮发型没实际变化，我先按你的意思稳住。要动哪里，我们下一句说清楚。";
  }

  const actionText = joinPhrases(appliedPhrases);
  const firstSentence = hasAmbiguity
    ? `${pick(conservativeNotes, seed, 1)}，${actionText}。`
    : `${pick(starts, seed, 2)}，${actionText}。`;

  if (hasWarning) {
    return `${firstSentence}${pick(warningNotes, seed, 3)}。`;
  }

  if (input.scores.accuracyScore >= 85) {
    return `${firstSentence}${pick(highAccuracyNotes, seed, 4)}。`;
  }

  return firstSentence;
}

function makeTitle(input: BarberCopyInput, seed: number): string {
  if (!input.intent.countsAsOperationStep || input.appliedOperations.length === 0) {
    return pick(confirmTitles, seed, 5);
  }
  if (input.intent.ambiguities.length > 0) {
    return pick(ambiguousTitles, seed, 6);
  }
  return pick(normalTitles, seed, 7);
}

function makeDebug(input: BarberCopyInput): BarberCopy["debug"] {
  return {
    operationSummary: input.appliedOperations.map((item) => {
      const field = item.operation.field;
      return item.applied
        ? `${fieldLabels[field]}：${formatValue(field, item.before)} → ${formatValue(field, item.after)}`
        : `${fieldLabels[field]}：保持 ${formatValue(field, item.before)}`;
    }),
    ambiguitySummary: input.intent.ambiguities,
    warningSummary: input.intent.warnings
  };
}

export function createBarberCopy(input: BarberCopyInput): BarberCopy {
  const seed = seedFrom(input);
  return {
    title: makeTitle(input, seed),
    spokenText: makeSpokenText(input, seed),
    debug: makeDebug(input)
  };
}
