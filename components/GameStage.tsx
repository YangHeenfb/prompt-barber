import { HairRenderer } from "./HairRenderer";
import { ScorePanel } from "./ScorePanel";
import type { HairState, LevelConfig, PromptHistoryItem, ScoreBreakdown } from "@/lib/hair/types";
import { fieldLabels, formatSeconds, formatValue } from "@/lib/hair/format";

export type StageHistoryEntry = {
  item: PromptHistoryItem;
  stepNumber: number;
};

export type StageReviewView = {
  hairState: HairState;
  item: PromptHistoryItem | null;
  stepNumber: number | null;
  totalSteps: number;
  isInitialStep: boolean;
};

export function buildStageHistoryEntries(history: PromptHistoryItem[]): StageHistoryEntry[] {
  return [...history].reverse().map((item, index) => ({
    item,
    stepNumber: index + 1
  }));
}

export function resolveStageReviewStep(selectedStep: number | null, historyLength: number): number | null {
  if (historyLength === 0) return null;
  if (selectedStep === null) return historyLength;
  return Math.max(0, Math.min(historyLength, selectedStep));
}

export function getPreviousStageReviewStep(selectedStep: number | null, historyLength: number): number | null {
  const currentStep = resolveStageReviewStep(selectedStep, historyLength);
  if (currentStep === null || currentStep <= 0) return selectedStep;
  return currentStep - 1;
}

export function getNextStageReviewStep(selectedStep: number | null, historyLength: number): number | null {
  const currentStep = resolveStageReviewStep(selectedStep, historyLength);
  if (currentStep === null || currentStep >= historyLength) return selectedStep;
  const nextStep = currentStep + 1;
  return nextStep === historyLength ? null : nextStep;
}

export function resolveStageReviewView(
  currentHairState: HairState,
  history: PromptHistoryItem[],
  selectedStep: number | null
): StageReviewView {
  const entries = buildStageHistoryEntries(history);
  const stepNumber = resolveStageReviewStep(selectedStep, entries.length);

  if (stepNumber === 0) {
    return {
      hairState: entries[0]?.item.beforeState ?? currentHairState,
      item: null,
      stepNumber: 0,
      totalSteps: entries.length,
      isInitialStep: true
    };
  }

  const entry = stepNumber === null ? undefined : entries.find((item) => item.stepNumber === stepNumber);

  if (!entry) {
    return {
      hairState: currentHairState,
      item: null,
      stepNumber: null,
      totalSteps: entries.length,
      isInitialStep: false
    };
  }

  return {
    hairState: entry.item.afterState,
    item: entry.item,
    stepNumber: entry.stepNumber,
    totalSteps: entries.length,
    isInitialStep: false
  };
}

type GameStageProps = {
  level: LevelConfig;
  currentHairState: HairState;
  history: PromptHistoryItem[];
  selectedHistoryStep: number | null;
  scores: ScoreBreakdown;
  debugVisible: boolean;
  canGoNext: boolean;
  onSelectHistoryStep: (step: number | null) => void;
  onReset: () => void;
  onNext: () => void;
  onToggleDebug: () => void;
};

export function GameStage({
  level,
  currentHairState,
  history,
  selectedHistoryStep,
  scores,
  debugVisible,
  canGoNext,
  onSelectHistoryStep,
  onReset,
  onNext,
  onToggleDebug
}: GameStageProps) {
  const reviewView = resolveStageReviewView(currentHairState, history, selectedHistoryStep);
  const previousStep = getPreviousStageReviewStep(selectedHistoryStep, history.length);
  const nextStep = getNextStageReviewStep(selectedHistoryStep, history.length);
  const canReviewPrevious = previousStep !== selectedHistoryStep;
  const canReviewNext = nextStep !== selectedHistoryStep;
  const reviewLabel = reviewView.stepNumber === null
    ? "当前顾客"
    : reviewView.isInitialStep
      ? "第 0 步 · 初始状态"
      : `第 ${reviewView.stepNumber} 步后发型`;
  const reviewHeading = reviewView.stepNumber === null
    ? "当前发型"
    : reviewView.isInitialStep
      ? "第 0 步 · 初始状态"
    : `第 ${reviewView.stepNumber} 步后${reviewView.stepNumber === reviewView.totalSteps ? " · 当前" : ""}`;
  const reviewScores = reviewView.item?.scores ?? scores;
  const reviewPrompt = reviewView.isInitialStep
    ? "还没下刀，这是本关开始时的发型。"
    : reviewView.item?.prompt ?? "还没有历史步骤，下一条 prompt 会从当前发型继续。";

  return (
    <section className="panel stagePanel">
      <div className="panelHeader stageHeader">
        <div>
          <p className="eyebrow">顾客当前发型</p>
          <h2>用文字指挥理发师</h2>
        </div>
        <div className="stageActions">
          <button type="button" className="secondaryButton" onClick={onReset}>重置本关</button>
          <button type="button" className="primaryButton" onClick={onNext} disabled={!canGoNext}>下一关</button>
        </div>
      </div>

      <div className="rendererShell">
        {history.length > 0 ? (
          <div className="stageReviewControls" aria-label="发型历史回看">
            <button
              type="button"
              className="stageArrowButton"
              aria-label="查看上一步"
              onClick={() => onSelectHistoryStep(previousStep)}
              disabled={!canReviewPrevious}
            >
              <span aria-hidden="true">‹</span>
            </button>
            <button
              type="button"
              className="stageArrowButton"
              aria-label="查看下一步"
              onClick={() => onSelectHistoryStep(nextStep)}
              disabled={!canReviewNext}
            >
              <span aria-hidden="true">›</span>
            </button>
          </div>
        ) : null}

        <HairRenderer state={reviewView.hairState} label={reviewLabel} />

        {history.length > 0 ? (
          <div className="stageReviewInfo">
            <div className="stageReviewMeta">
              <span>{reviewHeading}</span>
              {reviewView.isInitialStep ? (
                <strong>初始状态</strong>
              ) : (
                <>
                  <strong>准确度 {reviewScores.accuracyScore}%</strong>
                  <span>{formatSeconds(reviewScores.elapsedSeconds)}</span>
                </>
              )}
            </div>
            <p>{reviewPrompt}</p>
          </div>
        ) : null}
      </div>

      <ScorePanel scores={scores} threshold={level.passAccuracyThreshold} />

      <button type="button" className="debugToggle" onClick={onToggleDebug}>
        {debugVisible ? "隐藏参数" : "显示参数"}
      </button>

      {debugVisible ? (
        <div className="debugTable">
          {(Object.keys(currentHairState) as Array<keyof HairState>).map((field) => (
            <div key={field}>
              <span>{fieldLabels[field]}</span>
              <strong>{formatValue(field, currentHairState[field])}</strong>
              <small>目标 {formatValue(field, level.target[field])}</small>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
