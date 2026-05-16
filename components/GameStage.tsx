import { HairRenderer } from "./HairRenderer";
import { ScorePanel } from "./ScorePanel";
import type { HairState, LevelConfig, ScoreBreakdown } from "@/lib/hair/types";
import { fieldLabels, formatValue } from "@/lib/hair/format";

type GameStageProps = {
  level: LevelConfig;
  currentHairState: HairState;
  scores: ScoreBreakdown;
  debugVisible: boolean;
  canGoNext: boolean;
  onReset: () => void;
  onNext: () => void;
  onToggleDebug: () => void;
};

export function GameStage({
  level,
  currentHairState,
  scores,
  debugVisible,
  canGoNext,
  onReset,
  onNext,
  onToggleDebug
}: GameStageProps) {
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
        <HairRenderer state={currentHairState} label="当前顾客" />
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
