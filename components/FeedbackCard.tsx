import type { LevelConfig, PromptHistoryItem } from "@/lib/hair/types";
import { createBarberCopy } from "@/lib/hair/barberCopy";

type FeedbackCardProps = {
  latestHistoryItem: PromptHistoryItem | null;
  level: LevelConfig;
};

export function FeedbackCard({ latestHistoryItem, level }: FeedbackCardProps) {
  const barberCopy = latestHistoryItem
    ? createBarberCopy({
        prompt: latestHistoryItem.prompt,
        intent: {
          ...latestHistoryItem.intent,
          ambiguities: latestHistoryItem.ambiguities,
          warnings: latestHistoryItem.warnings
        },
        appliedOperations: latestHistoryItem.appliedOperations,
        scores: latestHistoryItem.scores,
        level,
        stepIndex: latestHistoryItem.scores.operationSteps
      })
    : null;

  return (
    <section className="panel feedbackCard">
      <div className="panelHeader compact">
        <p className="eyebrow">反馈</p>
        <h3>{barberCopy?.title ?? "理发师理解"}</h3>
      </div>

      {latestHistoryItem && barberCopy ? (
        <div className="barberUnderstanding">
          <blockquote>{latestHistoryItem.prompt}</blockquote>
          <p>{barberCopy.spokenText}</p>
        </div>
      ) : (
        <p className="emptyText">还没有理发师理解结果。输入一条 prompt 后会显示这一轮的理解。</p>
      )}
    </section>
  );
}
