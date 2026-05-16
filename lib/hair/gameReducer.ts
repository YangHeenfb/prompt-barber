import { applyIntent } from "./applyIntent";
import { calculateScores } from "./scoring";
import { initialHairState, levels } from "./levels";
import type { HairIntent, HairState, ParserMode, PromptHistoryItem, ScoreBreakdown } from "./types";

export type GameState = {
  currentLevelIndex: number;
  currentHairState: HairState;
  history: PromptHistoryItem[];
  operationSteps: number;
  levelStartTime: number;
  elapsedSeconds: number;
  latestScores: ScoreBreakdown;
  debugVisible: boolean;
  parserMode: ParserMode;
  parserNotice: string;
};

export type PromptResultPayload = {
  prompt: string;
  intent: HairIntent;
  parserLabel: string;
  createdAt: number;
};

export type GameAction =
  | { type: "selectLevel"; index: number; now: number }
  | { type: "resetLevel"; now: number }
  | { type: "applyPromptResult"; payload: PromptResultPayload }
  | { type: "toggleDebug" }
  | { type: "setParserMode"; mode: ParserMode }
  | { type: "setParserNotice"; notice: string }
  | { type: "nextLevel"; now: number }
  | { type: "tick"; now: number };

function getElapsedSeconds(start: number, now: number): number {
  return Math.max(0, Math.floor((now - start) / 1000));
}

function scoresFor(state: Pick<GameState, "currentLevelIndex" | "currentHairState" | "operationSteps" | "elapsedSeconds">): ScoreBreakdown {
  return calculateScores({
    current: state.currentHairState,
    level: levels[state.currentLevelIndex],
    operationSteps: state.operationSteps,
    elapsedSeconds: state.elapsedSeconds
  });
}

function parserModeNotice(mode: ParserMode): string {
  switch (mode) {
    case "codex":
      return "Codex CLI 模式：通过本机 Codex CLI 解析；失败时不使用本地规则猜测。";
    case "ai":
      return "API 解析模式：通过 OpenAI API 解析；失败时不使用本地规则猜测。";
    default:
      return "自动模式：优先使用本机 Codex CLI，其次使用 API；失败时不使用本地规则猜测。";
  }
}

export function createInitialGameState(now = Date.now()): GameState {
  const base = {
    currentLevelIndex: 0,
    currentHairState: { ...initialHairState },
    operationSteps: 0,
    elapsedSeconds: 0
  };
  return {
    ...base,
    history: [],
    levelStartTime: now,
    latestScores: scoresFor(base),
    debugVisible: false,
    parserMode: "auto",
    parserNotice: parserModeNotice("auto")
  };
}

function resetToLevel(index: number, now: number, keepMode: ParserMode, debugVisible: boolean): GameState {
  const base = {
    currentLevelIndex: index,
    currentHairState: { ...initialHairState },
    operationSteps: 0,
    elapsedSeconds: 0
  };
  return {
    ...base,
    history: [],
    levelStartTime: now,
    latestScores: scoresFor(base),
    debugVisible,
    parserMode: keepMode,
    parserNotice: "已重置本关。"
  };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "selectLevel": {
      return resetToLevel(action.index, action.now, state.parserMode, state.debugVisible);
    }
    case "resetLevel": {
      return resetToLevel(state.currentLevelIndex, action.now, state.parserMode, state.debugVisible);
    }
    case "nextLevel": {
      const nextIndex = Math.min(levels.length - 1, state.currentLevelIndex + 1);
      return resetToLevel(nextIndex, action.now, state.parserMode, state.debugVisible);
    }
    case "toggleDebug": {
      return { ...state, debugVisible: !state.debugVisible };
    }
    case "setParserMode": {
      return { ...state, parserMode: action.mode, parserNotice: parserModeNotice(action.mode) };
    }
    case "setParserNotice": {
      return { ...state, parserNotice: action.notice };
    }
    case "tick": {
      const elapsedSeconds = getElapsedSeconds(state.levelStartTime, action.now);
      const latestScores = scoresFor({ ...state, elapsedSeconds });
      return { ...state, elapsedSeconds, latestScores };
    }
    case "applyPromptResult": {
      const beforeState = state.currentHairState;
      const applied = applyIntent(beforeState, action.payload.intent);
      const changed = applied.appliedOperations.some((item) => item.applied);
      const operationStepIncrement = action.payload.intent.countsAsOperationStep && changed ? 1 : 0;
      const operationSteps = state.operationSteps + operationStepIncrement;
      const elapsedSeconds = getElapsedSeconds(state.levelStartTime, action.payload.createdAt);
      const latestScores = calculateScores({
        current: applied.nextState,
        level: levels[state.currentLevelIndex],
        operationSteps,
        elapsedSeconds
      });
      const historyItem: PromptHistoryItem = {
        id: `${action.payload.createdAt}-${state.history.length}`,
        prompt: action.payload.prompt,
        parserLabel: action.payload.parserLabel,
        intent: action.payload.intent,
        appliedOperations: applied.appliedOperations,
        beforeState,
        afterState: applied.nextState,
        warnings: applied.warnings,
        ambiguities: action.payload.intent.ambiguities,
        scores: latestScores,
        createdAt: action.payload.createdAt
      };
      return {
        ...state,
        currentHairState: applied.nextState,
        operationSteps,
        elapsedSeconds,
        latestScores,
        history: [historyItem, ...state.history],
        parserNotice: `${action.payload.parserLabel}完成解析。`
      };
    }
    default:
      return state;
  }
}
