import type { AppliedOperation, HairIntent, HairState, LevelConfig, PromptHistoryItem, ScoreBreakdown } from "./types";

export type BarberCopyAccuracyBand = "low" | "medium" | "high" | "nearPerfect";

export type BarberCopyRequestBody = {
  playerPrompt: string;
  previousPlayerPrompt?: string;
  previousBarberSpokenText?: string;
  recentHistorySummary?: string;
  levelName: string;
  levelGoal: string;
  wasConfirmOnly: boolean;
  countsAsOperationStep: boolean;
  interactionGuidance: string[];
  barberFacts: string[];
  changedRegions: string[];
  lockedRegions: string[];
  ambiguityFacts: string[];
  warningFacts: string[];
  scoreContext: {
    passed: boolean;
    accuracyBand: BarberCopyAccuracyBand;
    overcutRisk: boolean;
  };
};

export type BarberCopyInput = BarberCopyRequestBody & {
  stepIndex: number;
};

const lengthFields = new Set<keyof HairState>(["topLength", "sideLength", "bangsLength", "sideburns"]);

function regionName(field: keyof HairState): string {
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

function categoricalFact(operation: AppliedOperation): string {
  const field = operation.operation.field;
  const after = String(operation.after);
  if (field === "parting") {
    if (after === "middle") return "分线做成中分";
    if (after === "left") return "分线往左边走";
    if (after === "right") return "分线往右边走";
    return "分线先拿掉";
  }
  if (after === "clean") return "后颈收干净";
  if (after === "tapered") return "后颈保持自然过渡";
  return "后颈保留自然边缘";
}

function operationFact(operation: AppliedOperation): string | null {
  const field = operation.operation.field;
  if (!operation.applied) {
    return `${regionName(field)}保持不动`;
  }
  if (field === "parting" || field === "neckline") {
    return categoricalFact(operation);
  }

  const before = Number(operation.before);
  const after = Number(operation.after);
  if (after < before) {
    if (field === "fadeHeight") return "渐变位置压低";
    if (field === "volume") return "整体蓬松感压低一点";
    if (field === "texture") return "发尾层次收柔一点";
    return `${regionName(field)}有收短`;
  }
  if (after > before) {
    if (field === "fadeHeight") return "渐变往上带一点";
    if (field === "volume") return "整体蓬松感抬起来";
    if (field === "texture") return "发尾层次做碎一点";
    return `${regionName(field)}轻轻调整`;
  }
  return `${regionName(field)}保持不动`;
}

function accuracyBand(score: number): BarberCopyAccuracyBand {
  if (score >= 95) return "nearPerfect";
  if (score >= 85) return "high";
  if (score >= 60) return "medium";
  return "low";
}

function isShortening(operation: AppliedOperation): boolean {
  return operation.applied && lengthFields.has(operation.operation.field) && Number(operation.after) < Number(operation.before);
}

export function buildBarberCopyInput(params: {
  prompt: string;
  intent: HairIntent;
  appliedOperations: AppliedOperation[];
  scores: ScoreBreakdown;
  level: LevelConfig;
  stepIndex: number;
  ambiguities?: string[];
  warnings?: string[];
  previousPlayerPrompt?: string;
  previousBarberSpokenText?: string;
  recentHistorySummary?: string;
}): BarberCopyInput {
  const wasConfirmOnly = !params.intent.countsAsOperationStep;
  const barberFacts = params.appliedOperations.map(operationFact).filter((fact): fact is string => Boolean(fact));
  const shortening = params.appliedOperations.some(isShortening);

  if (wasConfirmOnly || params.appliedOperations.length === 0) {
    barberFacts.unshift("这一步只是确认，还没有下刀", "剪刀没有动");
  }
  if (shortening) {
    barberFacts.push("剪短属于不可逆操作，所以这次会保守处理");
  }

  const changedRegions = Array.from(new Set(params.appliedOperations.filter((item) => item.applied).map((item) => regionName(item.operation.field))));
  const lockedRegions = Array.from(new Set(params.appliedOperations.filter((item) => !item.applied).map((item) => regionName(item.operation.field))));
  const ambiguityFacts = params.ambiguities ?? params.intent.ambiguities;
  const warningFacts = params.warnings ?? params.intent.warnings;
  const guidance = buildInteractionGuidance({
    prompt: params.prompt,
    wasConfirmOnly,
    ambiguityFacts,
    warningFacts,
    scores: params.scores,
    shortening,
    changedRegions,
    lockedRegions
  });

  return {
    playerPrompt: params.prompt,
    previousPlayerPrompt: params.previousPlayerPrompt,
    previousBarberSpokenText: params.previousBarberSpokenText,
    recentHistorySummary: params.recentHistorySummary,
    levelName: params.level.name,
    levelGoal: params.level.goal,
    wasConfirmOnly,
    countsAsOperationStep: params.intent.countsAsOperationStep,
    interactionGuidance: guidance,
    barberFacts,
    changedRegions,
    lockedRegions,
    ambiguityFacts,
    warningFacts,
    scoreContext: {
      passed: params.scores.passed,
      accuracyBand: accuracyBand(params.scores.accuracyScore),
      overcutRisk: shortening || warningFacts.some((warning) => warning.includes("不能") || warning.includes("长回来"))
    },
    stepIndex: params.stepIndex
  };
}

function includesAny(text: string, words: string[]): boolean {
  return words.some((word) => text.includes(word));
}

function buildInteractionGuidance(params: {
  prompt: string;
  wasConfirmOnly: boolean;
  ambiguityFacts: string[];
  warningFacts: string[];
  scores: ScoreBreakdown;
  shortening: boolean;
  changedRegions: string[];
  lockedRegions: string[];
}): string[] {
  const prompt = params.prompt;
  const guidance: string[] = [];
  if (params.wasConfirmOnly || includesAny(prompt, ["确认", "不要剪", "先别剪", "别动"])) {
    guidance.push("玩家要求只确认，不要真的剪。");
  }
  if (includesAny(prompt, ["剪太少", "太少了", "不够短", "再短", "明显一点", "下刀重一点", "太保守"])) {
    guidance.push("玩家在抱怨上一步剪得太少，希望这次更明显一点。");
  }
  if (includesAny(prompt, ["听不懂", "不是这个意思", "不对", "搞错", "你怎么"])) {
    guidance.push("玩家语气有点急，需要先安抚再回应。");
  }
  if (includesAny(prompt, ["不要剪太齐", "别剪太齐", "不要太齐", "别太齐"])) {
    guidance.push("玩家强调不要剪齐。");
  }
  if (includesAny(prompt, ["其他不动", "其他别动", "别动其他", "只动", "只剪"])) {
    guidance.push("玩家强调其他地方不要动。");
  }
  if (params.ambiguityFacts.length > 0) {
    guidance.push("玩家没有说明具体区域，需要保守理解。");
  }
  if (params.warningFacts.length > 0 || params.shortening) {
    guidance.push("剪短不好撤回，需要自然提醒风险。");
  }
  if (params.scores.accuracyScore >= 85) {
    guidance.push("玩家已经接近目标，需要提醒别贪刀。");
  }
  if (params.changedRegions.length > 2) {
    guidance.push("不要机械列出所有变化，优先回应玩家这句话。");
  }
  return guidance;
}

export function buildRecentHistorySummary(history: PromptHistoryItem[], level: LevelConfig, currentIndex = 0): string {
  return history
    .slice(currentIndex + 1, currentIndex + 4)
    .map((item, offset) => {
      const fallback = buildBarberCopyInputFromHistory(item, level, currentIndex + offset + 1);
      return `玩家说：${item.prompt}；理发师回：${fallback.barberFacts.slice(0, 2).join("，") || "先确认理解"}`;
    })
    .join("。");
}

export function buildBarberCopyInputFromHistory(
  item: PromptHistoryItem,
  level: LevelConfig,
  stepIndex: number,
  context?: {
    previousPlayerPrompt?: string;
    previousBarberSpokenText?: string;
    recentHistorySummary?: string;
  }
): BarberCopyInput {
  return buildBarberCopyInput({
    prompt: item.prompt,
    intent: item.intent,
    appliedOperations: item.appliedOperations,
    scores: item.scores,
    level,
    stepIndex,
    ambiguities: item.ambiguities,
    warnings: item.warnings,
    previousPlayerPrompt: context?.previousPlayerPrompt,
    previousBarberSpokenText: context?.previousBarberSpokenText,
    recentHistorySummary: context?.recentHistorySummary
  });
}
