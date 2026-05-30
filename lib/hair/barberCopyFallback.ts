import type { BarberCopyInput } from "./barberCopyInput";
import type { BarberCopyResponse } from "./barberCopySchema";

const normalTitles = ["镜前确认一下", "这次我这样处理", "托尼听明白了", "下刀前说清楚"] as const;
const ambiguousTitles = ["这句有点含糊", "我先保守处理", "这次先稳着来"] as const;
const confirmTitles = ["剪刀先放下", "先不下刀", "只做确认"] as const;
const starts = ["收到", "明白", "好", "行"] as const;
const conservativeNotes = ["你这句范围有点大，我先按安全剪法来", "这里我会保守一点，不做大动作", "我先收着来，避免一刀过头"] as const;
const warningNotes = ["这个地方不好反悔，我会收着点", "这里有点风险，我会放慢手", "这块我会谨慎处理"] as const;
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

export function createBarberCopyFallback(input: BarberCopyInput): BarberCopyResponse {
  const seed = seedFrom(input);

  if (input.wasConfirmOnly || input.barberFacts.includes("剪刀没有动")) {
    return {
      title: pick(confirmTitles, seed, 1),
      spokenText: "剪刀先不动，现在还没下刀；我先把意思核清楚，等你点头再动。",
      emotion: "confirming"
    };
  }

  if (hasGuidance(input, "剪得太少") || hasGuidance(input, "更明显一点")) {
    return {
      title: "听到了，这次明显点",
      spokenText: "听到了，你是嫌刚才太保守；这次我会下刀更明确一点，但不一口气剪过头。",
      emotion: "reassuring"
    };
  }

  if (hasGuidance(input, "语气有点急")) {
    return {
      title: "别急，我听明白了",
      spokenText: "我明白你的意思，这次先把方向拉回来；能动的地方我会处理，其他别乱碰。",
      emotion: "reassuring"
    };
  }

  if (hasGuidance(input, "不要剪齐")) {
    return {
      title: "不剪成一条线",
      spokenText: "明白，不会剪成一条齐线；我会留点自然碎感，其他地方先稳住。",
      emotion: "careful"
    };
  }

  if (hasGuidance(input, "其他地方不要动")) {
    const actionText = joinFacts(input.barberFacts);
    return {
      title: "其他地方按住不动",
      spokenText: `${pick(starts, seed, 8)}，${actionText}；其他地方我先按住，不乱加戏。`,
      emotion: "careful"
    };
  }

  const hasAmbiguity = input.ambiguityFacts.length > 0;
  const hasWarning = input.warningFacts.length > 0 || input.scoreContext.overcutRisk;
  const actionText = joinFacts(input.barberFacts);
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
