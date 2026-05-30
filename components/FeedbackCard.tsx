import type { PromptHistoryItem } from "@/lib/hair/types";
import { formatSeconds } from "@/lib/hair/format";

type FeedbackCardProps = {
  latestHistoryItem: PromptHistoryItem | null;
};

export function FeedbackCard({ latestHistoryItem }: FeedbackCardProps) {
  return (
    <section className="panel feedbackCard">
      <div className="panelHeader compact">
        <p className="eyebrow">反馈</p>
        <h3>理发师理解</h3>
      </div>

      {latestHistoryItem ? (
        <div className="barberUnderstanding">
          <div className="historyMeta">
            <span>{latestHistoryItem.parserLabel}</span>
            <span>{formatSeconds(latestHistoryItem.scores.elapsedSeconds)}</span>
          </div>
          <blockquote>{latestHistoryItem.prompt}</blockquote>
          <p>{latestHistoryItem.intent.interpretationNote}</p>
          {latestHistoryItem.appliedOperations.length ? (
            <ul>
              {latestHistoryItem.appliedOperations.map((operation, index) => (
                <li key={`${latestHistoryItem.id}-${index}`}>{operation.message}</li>
              ))}
            </ul>
          ) : (
            <p className="noticeText">没有实际修剪，因此不计入操作步数。</p>
          )}
          {latestHistoryItem.ambiguities.length ? (
            <div className="warningText">模糊点：{latestHistoryItem.ambiguities.join("；")}</div>
          ) : null}
          {latestHistoryItem.warnings.length ? (
            <div className="warningText">提醒：{latestHistoryItem.warnings.join("；")}</div>
          ) : null}
        </div>
      ) : (
        <p className="emptyText">还没有理发师理解结果。输入一条 prompt 后会显示这一轮的理解。</p>
      )}
    </section>
  );
}
