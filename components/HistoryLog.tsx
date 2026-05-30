import type { LevelConfig, PromptHistoryItem } from "@/lib/hair/types";
import { createBarberCopy } from "@/lib/hair/barberCopy";

type HistoryLogProps = {
  history: PromptHistoryItem[];
  level: LevelConfig;
};

export function HistoryLog({ history, level }: HistoryLogProps) {
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
          {history.map((item, index) => {
            const barberCopy = createBarberCopy({
              prompt: item.prompt,
              intent: {
                ...item.intent,
                ambiguities: item.ambiguities,
                warnings: item.warnings
              },
              appliedOperations: item.appliedOperations,
              scores: item.scores,
              level,
              stepIndex: history.length - index
            });

            return (
              <article key={item.id} className="historyItem">
                <blockquote>{item.prompt}</blockquote>
                <p>{barberCopy.spokenText}</p>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
