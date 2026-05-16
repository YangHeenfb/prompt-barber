import type { HairField, HairIntent, HairOperation, HairState, NumericHairField } from "./types";
import { describeHairState, fieldLabels } from "./format";

const regionKeywords: Array<{ field: HairField; keywords: string[] }> = [
  { field: "topLength", keywords: ["顶部", "头顶", "上面", "上方", "top"] },
  { field: "sideLength", keywords: ["两侧", "两边", "旁边", "侧边", "鬓边", "sides", "side"] },
  { field: "bangsLength", keywords: ["刘海", "前面", "bangs", "fringe"] },
  { field: "fadeHeight", keywords: ["渐变", "推高", "铲青", "fade"] },
  { field: "sideburns", keywords: ["鬓角", "sideburns", "sideburn"] },
  { field: "neckline", keywords: ["后颈", "后脑", "脖子后面", "颈线", "neckline", "nape"] },
  { field: "parting", keywords: ["中分", "偏左", "偏右", "分缝", "左分", "右分", "part", "parting"] },
  { field: "volume", keywords: ["蓬松", "服帖", "贴头", "volume", "flat"] },
  { field: "texture", keywords: ["层次", "纹理", "打薄", "碎一点", "碎发", "texture", "thin", "thinning"] }
];

const lengthFields = new Set<HairField>(["topLength", "sideLength", "bangsLength", "sideburns"]);
const numericFields = new Set<HairField>(["topLength", "sideLength", "bangsLength", "fadeHeight", "volume", "texture", "sideburns"]);
const shortKeywords = ["剪短", "推短", "短一点", "短一些", "再短", "修短", "短点", "shorter", "trim", "short"];
const protectKeywords = ["保留", "别动", "不要剪", "不剪", "别剪", "先留", "keep", "leave"];
const negativeKeywords = ["不要", "别", "不", "禁止", "avoid", "don't", "do not"];
const confirmationKeywords = ["确认一下", "你理解", "理解一下", "先别剪", "先不要剪", "复述", "只确认", "confirm", "check first"];

function hasAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

function findMentionedFields(text: string): HairField[] {
  const fields: HairField[] = [];
  for (const group of regionKeywords) {
    if (hasAny(text, group.keywords)) fields.push(group.field);
  }
  return [...new Set(fields)];
}

function findProtectedFields(text: string): HairField[] {
  const protectedFields: HairField[] = [];
  const clauses = text.split(/[，,。；;、]/g);
  for (const clause of clauses) {
    if (!hasAny(clause, protectKeywords)) continue;
    for (const field of findMentionedFields(clause)) protectedFields.push(field);
  }
  return [...new Set(protectedFields)];
}

function hasNegatedAction(text: string, actionKeywords: string[]): boolean {
  const clauses = text.split(/[，,。；;、]/g);
  return clauses.some((clause) => hasAny(clause, negativeKeywords) && hasAny(clause, actionKeywords));
}

function parseRequestedAmount(text: string): number {
  if (/(很多|大幅|明显|多一点|多一些|特别短|很短|短很多|major|much)/.test(text)) return 2;
  if (/(一点|一些|稍微|轻微|微调|little|slightly)/.test(text)) return 1;
  const millimeterMatch = text.match(/(\d+)\s*(mm|毫米)/i);
  if (millimeterMatch) {
    const mm = Number(millimeterMatch[1]);
    if (mm <= 3) return 4;
    if (mm <= 6) return 3;
    if (mm <= 9) return 2;
    return 1;
  }
  return 1;
}

function parseSetLengthFromText(text: string): number | null {
  const centimeterMatch = text.match(/(\d+(?:\.\d+)?)\s*(cm|厘米|公分)/i);
  if (!centimeterMatch) return null;
  const cm = Number(centimeterMatch[1]);
  if (!Number.isFinite(cm)) return null;
  return Math.max(0, Math.min(10, Math.round(cm)));
}

function pushOperation(operations: HairOperation[], operation: HairOperation, protectedFields: Set<HairField>, warnings: string[]) {
  if (protectedFields.has(operation.field)) {
    warnings.push(`${fieldLabels[operation.field]}被你标记为保留，所以没有执行“${operation.reason}”。`);
    return;
  }
  operations.push(operation);
}

function op(field: HairField, operation: HairOperation["operation"], value: number | string, reason: string): HairOperation {
  return { field, operation, value, reason };
}

function confirmOnlyIntent(prompt: string, currentState?: HairState): HairIntent {
  const summary = currentState ? `当前发型参数是：${describeHairState(currentState)}。` : "这次只确认理解，不会实际动刀。";
  return {
    operations: [],
    confidence: 0.7,
    ambiguities: prompt.trim() ? [] : ["你还没有给出具体理发指令。"],
    warnings: ["这次是确认，不计入操作步数。"],
    interpretationNote: `理发师只做理解确认，没有执行修剪。${summary}`,
    countsAsOperationStep: false
  };
}

export function parseHairPrompt(prompt: string, currentState?: HairState): HairIntent {
  const raw = prompt.trim();
  const text = raw.toLowerCase();
  const operations: HairOperation[] = [];
  const ambiguities: string[] = [];
  const warnings: string[] = [];

  if (!raw) {
    return {
      operations: [],
      confidence: 0,
      ambiguities: ["空白输入无法被理发师理解。"],
      warnings: [],
      interpretationNote: "没有收到有效指令。",
      countsAsOperationStep: false
    };
  }

  if (hasAny(text, confirmationKeywords)) return confirmOnlyIntent(raw, currentState);

  const mentionedFields = findMentionedFields(text);
  const protectedFields = new Set(findProtectedFields(text));
  for (const field of protectedFields) {
    warnings.push(`${fieldLabels[field]}已被标记为保留。`);
  }

  const amount = parseRequestedAmount(text);
  const explicitLength = parseSetLengthFromText(text);
  const hasShortIntent = hasAny(text, shortKeywords);

  if (hasNegatedAction(text, ["高渐变", "high fade"])) {
    warnings.push("你明确说了不要高渐变，因此不会把渐变推高。");
  } else if (/(低渐变|low fade)/.test(text)) {
    pushOperation(operations, op("fadeHeight", "set", 2, "识别到低渐变"), protectedFields, warnings);
  } else if (/(中渐变|mid fade|medium fade)/.test(text)) {
    pushOperation(operations, op("fadeHeight", "set", 3, "识别到中渐变"), protectedFields, warnings);
  } else if (/(高渐变|high fade)/.test(text)) {
    pushOperation(operations, op("fadeHeight", "set", 5, "识别到高渐变"), protectedFields, warnings);
  } else if (/(渐变|fade|推高|铲青)/.test(text) && !hasNegatedAction(text, ["渐变", "fade", "推高", "铲青"])) {
    pushOperation(operations, op("fadeHeight", "increment", 1, "提到了渐变，但没有说明高度，默认轻微提高"), protectedFields, warnings);
    ambiguities.push("你提到了渐变，但没有说明低、中、高，理发师默认只轻微提高。");
  }

  if (hasNegatedAction(text, ["中分", "分缝", "part"])) {
    warnings.push("你说了不要调整分缝，因此没有改变分缝。 ");
  } else if (/(中分|middle part|center part)/.test(text)) {
    operations.push(op("parting", "set", "middle", "设置为中分"));
  } else if (/(左分|偏左|left part)/.test(text)) {
    operations.push(op("parting", "set", "left", "设置为左分"));
  } else if (/(右分|偏右|right part)/.test(text)) {
    operations.push(op("parting", "set", "right", "设置为右分"));
  }

  if (hasNegatedAction(text, ["打薄", "纹理", "层次", "碎", "texture", "thin"])) {
    warnings.push("你说了不要打薄或增加纹理，因此没有改变纹理层次。 ");
  } else if (/(打薄|纹理|层次|碎一点|碎一些|碎发|texture|thin|thinning)/.test(text)) {
    pushOperation(operations, op("texture", "increment", amount, "增加纹理或打薄效果"), protectedFields, warnings);
  }

  if (/(蓬松一点|蓬松些|更蓬松|volume up|more volume)/.test(text) && !hasNegatedAction(text, ["蓬松", "volume"])) {
    pushOperation(operations, op("volume", "increment", amount, "增加蓬松度"), protectedFields, warnings);
  }
  if (/(服帖|贴头|压低|不要太蓬松|less volume|flat)/.test(text)) {
    pushOperation(operations, op("volume", "decrement", amount, "降低蓬松度，让头发更服帖"), protectedFields, warnings);
  }

  if (/(干净后颈|后颈.*干净|颈线.*干净|收干净|clean neckline)/.test(text)) {
    operations.push(op("neckline", "set", "clean", "后颈收干净"));
  } else if (/(自然后颈|后颈.*自然|自然收尾|natural neckline)/.test(text)) {
    operations.push(op("neckline", "set", "natural", "后颈保持自然"));
  } else if (/(后颈.*渐变|颈线.*渐变|tapered neckline|taper)/.test(text)) {
    operations.push(op("neckline", "set", "tapered", "后颈做渐变收尾"));
  }

  if (hasShortIntent && hasNegatedAction(text, shortKeywords)) {
    warnings.push("你用了否定表达，理发师不会执行剪短动作。 ");
  } else if (hasShortIntent) {
    const lengthTargets = mentionedFields.filter((field) => lengthFields.has(field));
    if (lengthTargets.length > 0) {
      for (const field of lengthTargets) {
        if (explicitLength !== null) {
          pushOperation(operations, op(field, "set", explicitLength, `把${fieldLabels[field]}设为 ${explicitLength}`), protectedFields, warnings);
        } else {
          pushOperation(operations, op(field, "decrement", amount, `${fieldLabels[field]}剪短 ${amount} 档`), protectedFields, warnings);
        }
      }
    } else if (mentionedFields.length === 0) {
      operations.push(op("sideLength", "decrement", 1, "没有说明区域，默认先处理两侧"));
      operations.push(op("bangsLength", "decrement", 1, "没有说明区域，默认也处理刘海"));
      ambiguities.push("你没有说明具体区域，理发师默认处理了两侧和刘海。 ");
    }
  }

  if (/(别太贴|不要贴头|not too flat)/.test(text)) {
    pushOperation(operations, op("volume", "increment", 1, "避免太贴头，略微增加蓬松度"), protectedFields, warnings);
  }

  const uniqueOperations = operations.filter((operation, index, array) => {
    return array.findIndex((item) => item.field === operation.field && item.operation === operation.operation && item.value === operation.value) === index;
  });

  if (uniqueOperations.length === 0 && warnings.length === 0) {
    ambiguities.push("理发师没有从这句话里找到明确可执行的修剪动作。请说明区域和动作。 ");
  }

  const clearFieldAndAction = mentionedFields.length > 0 && uniqueOperations.length > 0 && ambiguities.length === 0;
  const confidence = clearFieldAndAction ? 0.86 : uniqueOperations.length > 0 ? 0.58 : 0.35;
  const changedFields = uniqueOperations.map((operation) => fieldLabels[operation.field]).join("、");

  return {
    operations: uniqueOperations,
    confidence,
    ambiguities,
    warnings,
    interpretationNote: uniqueOperations.length > 0
      ? `理发师准备调整：${changedFields}。`
      : "理发师没有执行修剪。",
    countsAsOperationStep: uniqueOperations.length > 0
  };
}
