"use client";

import { useEffect, useMemo, useState } from "react";
import type { LevelConfig, PromptHistoryItem } from "@/lib/hair/types";
import { getBarberCopy } from "@/lib/hair/barberCopyClient";
import { createBarberCopyFallback } from "@/lib/hair/barberCopyFallback";
import { buildBarberCopyInputFromHistory, buildRecentHistorySummary } from "@/lib/hair/barberCopyInput";
import type { BarberCopyResponse } from "@/lib/hair/barberCopySchema";

type FeedbackCardProps = {
  latestHistoryItem: PromptHistoryItem | null;
  history: PromptHistoryItem[];
  level: LevelConfig;
};

export function FeedbackCard({ latestHistoryItem, history, level }: FeedbackCardProps) {
  const previousItem = history[1] ?? null;
  const previousFallback = useMemo(
    () => previousItem ? createBarberCopyFallback(buildBarberCopyInputFromHistory(previousItem, level, previousItem.scores.operationSteps)) : null,
    [previousItem, level]
  );
  const copyInput = useMemo(() => {
    if (!latestHistoryItem) return null;
    return buildBarberCopyInputFromHistory(latestHistoryItem, level, latestHistoryItem.scores.operationSteps, {
      previousPlayerPrompt: previousItem?.prompt,
      previousBarberSpokenText: previousFallback?.spokenText,
      recentHistorySummary: buildRecentHistorySummary(history, level, 0)
    });
  }, [latestHistoryItem, level, previousItem, previousFallback, history]);
  const fallbackCopy = useMemo(() => copyInput ? createBarberCopyFallback(copyInput) : null, [copyInput]);
  const [barberCopy, setBarberCopy] = useState<BarberCopyResponse | null>(fallbackCopy);

  useEffect(() => {
    let active = true;
    setBarberCopy(fallbackCopy);
    if (!copyInput) return () => {
      active = false;
    };

    void getBarberCopy(copyInput).then((copy) => {
      if (active) setBarberCopy(copy);
    });

    return () => {
      active = false;
    };
  }, [copyInput, fallbackCopy]);

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
