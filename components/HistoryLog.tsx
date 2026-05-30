"use client";

import { useEffect, useMemo, useState } from "react";
import type { LevelConfig, PromptHistoryItem } from "@/lib/hair/types";
import { getBarberCopy } from "@/lib/hair/barberCopyClient";
import { createBarberCopyFallback } from "@/lib/hair/barberCopyFallback";
import { buildBarberCopyInputFromHistory, buildRecentHistorySummary } from "@/lib/hair/barberCopyInput";
import type { BarberCopyResponse } from "@/lib/hair/barberCopySchema";

type HistoryLogProps = {
  history: PromptHistoryItem[];
  level: LevelConfig;
};

export function HistoryLog({ history, level }: HistoryLogProps) {
  const copyInputs = useMemo(
    () => history.map((item, index) => ({
      id: item.id,
      input: buildBarberCopyInputFromHistory(item, level, history.length - index, {
        previousPlayerPrompt: history[index + 1]?.prompt,
        previousBarberSpokenText: history[index + 1]
          ? createBarberCopyFallback(buildBarberCopyInputFromHistory(history[index + 1], level, history.length - index - 1)).spokenText
          : undefined,
        recentHistorySummary: buildRecentHistorySummary(history, level, index)
      })
    })),
    [history, level]
  );
  const [copies, setCopies] = useState<Record<string, BarberCopyResponse>>({});

  useEffect(() => {
    let active = true;
    const fallbackCopies = Object.fromEntries(copyInputs.map(({ id, input }) => [id, createBarberCopyFallback(input)]));
    setCopies(fallbackCopies);

    copyInputs.forEach(({ id, input }) => {
      void getBarberCopy(input).then((copy) => {
        if (!active) return;
        setCopies((current) => ({ ...current, [id]: copy }));
      });
    });

    return () => {
      active = false;
    };
  }, [copyInputs]);

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
            const barberCopy = copies[item.id] ?? createBarberCopyFallback(copyInputs[index].input);

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
