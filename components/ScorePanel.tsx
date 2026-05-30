import type { ScoreBreakdown } from "@/lib/hair/types";
import { formatSeconds } from "@/lib/hair/format";

type ScorePanelProps = {
  scores: ScoreBreakdown;
  threshold: number;
};

export function ScorePanel({ scores, threshold }: ScorePanelProps) {
  const statusText = scores.passed
    ? scores.finalScore >= 92
      ? "完美"
      : scores.finalScore >= 85
        ? "优秀"
        : "已通关"
    : "未通关";

  return (
    <div className="scorePanel">
      <div className={`statusPill ${scores.passed ? "passed" : "failed"}`}>{statusText}</div>
      <div className="scoreHero">
        <span>最终分</span>
        <strong>{scores.finalScore}</strong>
        <em>{scores.rank}</em>
      </div>

      <div className="scoreGrid">
        <div>
          <span>准确度</span>
          <strong>{scores.accuracyScore}%</strong>
          <small>通关线 {threshold}%</small>
        </div>
        <div>
          <span>步数分</span>
          <strong>{scores.stepScore}</strong>
          <small>{scores.operationSteps} 个操作 prompt</small>
        </div>
        <div>
          <span>时间分</span>
          <strong>{scores.timeScore}</strong>
          <small>{formatSeconds(scores.elapsedSeconds)}</small>
        </div>
        <div>
          <span>顾客满意度</span>
          <strong>{scores.constraintScore}</strong>
          <small>根据整体观感变化</small>
        </div>
      </div>
    </div>
  );
}
