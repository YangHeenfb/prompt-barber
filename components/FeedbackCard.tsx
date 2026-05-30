import type { ScoreBreakdown } from "@/lib/hair/types";
import { summarizeFieldGap } from "@/lib/hair/scoring";

type FeedbackCardProps = {
  scores: ScoreBreakdown;
  latestAmbiguities: string[];
};

export function FeedbackCard({ scores, latestAmbiguities }: FeedbackCardProps) {
  const sorted = [...scores.fieldScores].sort((a, b) => b.scorePercent - a.scorePercent);
  const closest = sorted.slice(0, 2);
  const biggestGaps = sorted.slice(-2).reverse();

  return (
    <div className="feedbackCard">
      <div className="panelHeader compact">
        <p className="eyebrow">反馈</p>
        <h3>这一轮哪里接近，哪里偏了</h3>
      </div>
      <div className="feedbackColumns">
        <div>
          <h4>最接近目标</h4>
          {closest.map((detail) => (
            <p key={detail.field}>{summarizeFieldGap(detail)}</p>
          ))}
        </div>
        <div>
          <h4>偏差最大</h4>
          {biggestGaps.map((detail) => (
            <p key={detail.field}>{detail.message} {summarizeFieldGap(detail)}</p>
          ))}
        </div>
      </div>
      {latestAmbiguities.length ? <div className="warningText">模糊点：{latestAmbiguities.join("；")}</div> : null}
    </div>
  );
}
