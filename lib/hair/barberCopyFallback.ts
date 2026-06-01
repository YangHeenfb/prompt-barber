import type { BarberCopyInput } from "./barberCopyInput";
import type { BarberCopyResponse } from "./barberCopySchema";

const normalTitles = ["镜前确认一下", "托尼听明白了", "这次照镜说", "下刀前对一下"] as const;
const ambiguousTitles = ["这句有点含糊", "方向盘给我了", "这次先稳着来"] as const;
const confirmTitles = ["剪刀先上保险", "先不下刀", "只做确认"] as const;
const starts = ["收到", "明白", "好嘞", "行"] as const;
const conservativeNotes = [
  "这句有点像把方向盘递给我了，我先保守动刀",
  "这里我先收着来，别一剪子变事故现场",
  "我先按安全剪法走，不给发型加戏"
] as const;
const warningNotes = ["剪短不好反悔，我会收着点", "这块我会慢一点，别一刀过头", "这里我会谨慎处理，留点回旋余地"] as const;
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
  return hashString(`${input.playerPrompt}|${input.stepIndex}|${input.barberFacts.join("|")}`);
}

function joinFacts(facts: string[]): string {
  const visibleFacts = facts.filter((fact) => !fact.includes("剪短属于不可逆操作")).slice(0, 3);
  if (visibleFacts.length === 0) return "发型先保持住";
  if (visibleFacts.length === 1) return visibleFacts[0];
  return `${visibleFacts.slice(0, -1).join("，")}，${visibleFacts[visibleFacts.length - 1]}`;
}

function hasGuidance(input: BarberCopyInput, text: string): boolean {
  return input.interactionGuidance.some((item) => item.includes(text));
}

function promptIncludesAny(input: BarberCopyInput, words: string[]): boolean {
  return words.some((word) => input.playerPrompt.includes(word));
}

export function createBarberCopyFallback(input: BarberCopyInput): BarberCopyResponse {
  const seed = seedFrom(input);
  const wantsNotTooStraight =
    hasGuidance(input, "不要剪齐") || promptIncludesAny(input, ["不要剪太齐", "别剪太齐", "不要太齐", "别太齐"]);
  const wantsOtherAreasLocked =
    hasGuidance(input, "其他地方不要动") || promptIncludesAny(input, ["其他不动", "其他别动", "别动其他"]);
  const actionText = joinFacts(input.barberFacts);

  if (input.wasConfirmOnly || input.barberFacts.includes("剪刀没有动")) {
    return {
      title: pick(confirmTitles, seed, 1),
      spokenText: "剪刀先上保险，现在还没下刀；我先把意思听明白，等你点头再动。",
      emotion: "confirming"
    };
  }

  if (hasGuidance(input, "剪得太少") || hasGuidance(input, "更明显一点")) {
    return {
      title: "听到了，这次明显点",
      spokenText: "听到了，刚才是有点太斯文；这次我下刀明确点，但不一口气剪过头。",
      emotion: "reassuring"
    };
  }

  if (hasGuidance(input, "语气有点急")) {
    return {
      title: "别急，我听明白了",
      spokenText: "别急，托尼把手刹拉上了；这次先把方向拽回来，能动的地方再动。",
      emotion: "reassuring"
    };
  }

  if (wantsNotTooStraight && wantsOtherAreasLocked) {
    return {
      title: "不剪齐，其他按住",
      spokenText: "明白，不剪成一条直线；其他地方我先按住，不乱加戏。",
      emotion: "careful"
    };
  }

  if (wantsNotTooStraight) {
    return {
      title: "不剪成一条线",
      spokenText: "明白，不剪成一条直线；我会留点自然碎感，别像尺子量过。",
      emotion: "careful"
    };
  }

  if (wantsOtherAreasLocked) {
    return {
      title: "其他地方按住不动",
      spokenText: `${pick(starts, seed, 8)}，${actionText}；其他地方我先按住，不乱加戏。`,
      emotion: "careful"
    };
  }

  const hasAmbiguity = input.ambiguityFacts.length > 0;
  const hasWarning = input.warningFacts.length > 0 || input.scoreContext.overcutRisk;
  const firstSentence = hasAmbiguity
    ? `${pick(conservativeNotes, seed, 2)}，${actionText}。`
    : `${pick(starts, seed, 3)}，${actionText}。`;
  const secondSentence = hasWarning
    ? `${pick(warningNotes, seed, 4)}。`
    : input.scoreContext.accuracyBand === "high" || input.scoreContext.accuracyBand === "nearPerfect"
      ? `${pick(highAccuracyNotes, seed, 5)}。`
      : "";

  return {
    title: hasAmbiguity ? pick(ambiguousTitles, seed, 6) : pick(normalTitles, seed, 7),
    spokenText: `${firstSentence}${secondSentence}`,
    emotion: hasWarning ? "warning" : hasAmbiguity ? "careful" : "calm"
  };
}
