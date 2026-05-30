import type { HairState, LevelConfig } from "./types";

export const initialHairState: HairState = {
  topLength: 8,
  sideLength: 6,
  bangsLength: 7,
  fadeHeight: 0,
  volume: 7,
  texture: 2,
  sideburns: 6,
  parting: "none",
  neckline: "natural"
};

export const levels: LevelConfig[] = [
  {
    id: "fresh-short",
    name: "清爽短发",
    goal: "练习把理发区域说清楚，例如顶部、两侧、刘海和鬓角。",
    target: {
      topLength: 5,
      sideLength: 3,
      bangsLength: 4,
      fadeHeight: 1,
      volume: 3,
      texture: 3,
      sideburns: 3,
      parting: "none",
      neckline: "clean"
    },
    passAccuracyThreshold: 70,
    idealOperationSteps: 3,
    timeTargetSeconds: 90,
    forbiddenRules: [],
    hints: [
      "两侧推短一点，顶部先保留",
      "刘海剪短一点，但不要剪太齐",
      "鬓角收干净，后颈也修干净",
      "顶部稍微降低一点蓬松度",
      "整体保持清爽，但不要铲太高"
    ]
  },
  {
    id: "low-fade-texture",
    name: "低渐变碎盖",
    goal: "练习描述程度和边界，例如低渐变、只打薄、控制推剪高度。",
    target: {
      topLength: 6,
      sideLength: 2,
      bangsLength: 5,
      fadeHeight: 2,
      volume: 5,
      texture: 6,
      sideburns: 2,
      parting: "none",
      neckline: "tapered"
    },
    passAccuracyThreshold: 75,
    idealOperationSteps: 5,
    timeTargetSeconds: 120,
    forbiddenRules: [
      {
        id: "fade-too-high",
        label: "不要把渐变推到 3 以上",
        evaluate: (state) => state.fadeHeight > 3
      },
      {
        id: "bangs-too-short",
        label: "刘海不要短于 4",
        evaluate: (state) => state.bangsLength < 4
      }
    ],
    hints: [
      "两侧推短，做低渐变，不要推太高",
      "顶部保留长度，只增加一点纹理",
      "刘海只打薄，不要剪短到眉毛上方",
      "鬓角收短，后颈做自然过渡",
      "整体碎一点，但不要让顶部塌掉"
    ]
  },
  {
    id: "korean-middle-part",
    name: "韩式中分",
    goal: "练习描述风格、方向和整体轮廓，例如中分、保留长度、自然过渡。",
    target: {
      topLength: 7,
      sideLength: 4,
      bangsLength: 7,
      fadeHeight: 0,
      volume: 6,
      texture: 4,
      sideburns: 4,
      parting: "middle",
      neckline: "natural"
    },
    passAccuracyThreshold: 80,
    idealOperationSteps: 6,
    timeTargetSeconds: 150,
    forbiddenRules: [
      {
        id: "sides-too-short",
        label: "两侧不要短于 3",
        evaluate: (state) => state.sideLength < 3
      },
      {
        id: "fade-above-one",
        label: "不要做高于 1 的渐变",
        evaluate: (state) => state.fadeHeight > 1
      },
      {
        id: "bangs-too-short-middle",
        label: "刘海不要短于 6",
        evaluate: (state) => state.bangsLength < 6
      },
      {
        id: "missing-parting",
        label: "必须保留中分分缝",
        evaluate: (state) => state.parting !== "middle"
      }
    ],
    hints: [
      "先做中分，顶部和刘海都保留长度",
      "两侧稍微修短，但不要推得太贴头",
      "不要做渐变，也不要把刘海剪短",
      "整体稍微蓬松一点，纹理自然一点",
      "后颈保持自然，不要收得太锋利"
    ]
  }
];
