import type { PromptHistoryItem } from "@/lib/hair/types";
import { formatSeconds } from "@/lib/hair/format";

type HistoryLogProps = {
  history: PromptHistoryItem[];
};

export function HistoryLog({ history }: HistoryLogProps) {
  return (
    <section className="panel historyPanel">
      <div className="panelHeader compact">
        <p className="eyebrow">记录</p>
        <h2>理发师理解日志</h2>
      </div>
      {history.length === 0 ? (
        <p className="emptyText">还没有输入指令。第一步可以先描述区域，例如“两侧推短一点，顶部保留”。</p>
      ) : (
        <div className="historyList">
          {history.map((item) => (
            <article key={item.id} className="historyItem">
              <div className="historyMeta">
                <span>{item.parserLabel}</span>
                <span>{formatSeconds(item.scores.elapsedSeconds)}</span>
                <strong>准确度 {item.scores.accuracyScore}%</strong>
              </div>
              <blockquote>{item.prompt}</blockquote>
              <p>{item.intent.interpretationNote}</p>
              {item.appliedOperations.length ? (
                <ul>
                  {item.appliedOperations.map((operation, index) => (
                    <li key={`${item.id}-${index}`}>{operation.message}</li>
                  ))}
                </ul>
              ) : (
                <p className="noticeText">没有实际修剪，因此不计入操作步数。</p>
              )}
              {item.ambiguities.length ? <p className="warningText">模糊：{item.ambiguities.join("；")}</p> : null}
              {item.warnings.length ? <p className="warningText">提醒：{item.warnings.join("；")}</p> : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
