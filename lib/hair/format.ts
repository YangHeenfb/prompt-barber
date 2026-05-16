import type { HairField, HairState, Neckline, Parting } from "./types";

export const fieldLabels: Record<HairField, string> = {
  topLength: "顶部长度",
  sideLength: "两侧长度",
  bangsLength: "刘海长度",
  fadeHeight: "渐变高度",
  volume: "蓬松度",
  texture: "纹理层次",
  sideburns: "鬓角长度",
  parting: "分缝",
  neckline: "后颈线条"
};

export const partingLabels: Record<Parting, string> = {
  none: "无分缝",
  middle: "中分",
  left: "左分",
  right: "右分"
};

export const necklineLabels: Record<Neckline, string> = {
  natural: "自然",
  clean: "干净",
  tapered: "渐变收尾"
};

export function formatValue(field: HairField, value: HairState[HairField] | string | number): string {
  if (field === "parting") {
    return partingLabels[value as Parting] ?? String(value);
  }
  if (field === "neckline") {
    return necklineLabels[value as Neckline] ?? String(value);
  }
  return String(value);
}

export function formatSeconds(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes <= 0) return `${rest} 秒`;
  return `${minutes} 分 ${rest.toString().padStart(2, "0")} 秒`;
}

export function describeHairState(state: HairState): string {
  return [
    `顶部 ${state.topLength}`,
    `两侧 ${state.sideLength}`,
    `刘海 ${state.bangsLength}`,
    `渐变 ${state.fadeHeight}`,
    `蓬松 ${state.volume}`,
    `纹理 ${state.texture}`,
    `鬓角 ${state.sideburns}`,
    `分缝 ${formatValue("parting", state.parting)}`,
    `后颈 ${formatValue("neckline", state.neckline)}`
  ].join("，");
}
