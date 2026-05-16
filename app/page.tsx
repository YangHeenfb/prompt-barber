"use client";

import { useEffect, useMemo, useReducer, useState } from "react";
import { FeedbackCard } from "@/components/FeedbackCard";
import { GameStage } from "@/components/GameStage";
import { HistoryLog } from "@/components/HistoryLog";
import { LevelPanel } from "@/components/LevelPanel";
import { PromptComposer } from "@/components/PromptComposer";
import { createInitialGameState, gameReducer } from "@/lib/hair/gameReducer";
import { levels } from "@/lib/hair/levels";
import { parseHairPrompt } from "@/lib/hair/localParser";
import type { HairIntent, ParserMode } from "@/lib/hair/types";

type ApiParseResponse =
  | { ok: true; source: "codex" | "ai" | "local"; intent: HairIntent }
  | { ok: false; useLocal: true; reason: string };

const parserSourceLabels: Record<"codex" | "ai" | "local", string> = {
  codex: "Codex CLI 解析",
  ai: "API 解析",
  local: "本地解析"
};

async function parseWithApi(prompt: string, state: ReturnType<typeof createInitialGameState>): Promise<{ intent: HairIntent; parserLabel: string; notice: string }> {
  const level = levels[state.currentLevelIndex];
  const response = await fetch("/api/parse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      currentState: state.currentHairState,
      levelName: level.name,
      targetState: level.target,
      parserMode: state.parserMode
    })
  });
  const data = (await response.json()) as ApiParseResponse;
  if (data.ok) {
    const label = parserSourceLabels[data.source];
    return {
      intent: data.intent,
      parserLabel: label,
      notice: `${label}成功。`
    };
  }
  const fallback = parseHairPrompt(prompt, state.currentHairState);
  return {
    intent: fallback,
    parserLabel: "本地解析",
    notice: `${data.reason} 已自动切换到本地解析。`
  };
}

function parseLocally(prompt: string, state: ReturnType<typeof createInitialGameState>): { intent: HairIntent; parserLabel: string; notice: string } {
  return {
    intent: parseHairPrompt(prompt, state.currentHairState),
    parserLabel: "本地解析",
    notice: "本地解析完成。"
  };
}

export default function Home() {
  const [state, dispatch] = useReducer(gameReducer, undefined, () => createInitialGameState());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const currentLevel = levels[state.currentLevelIndex];
  const latestAmbiguities = state.history[0]?.ambiguities ?? [];
  const canGoNext = state.latestScores.passed && state.currentLevelIndex < levels.length - 1;

  useEffect(() => {
    const timer = window.setInterval(() => dispatch({ type: "tick", now: Date.now() }), 1000);
    return () => window.clearInterval(timer);
  }, []);

  async function submitPrompt(prompt: string, confirmOnly = false) {
    setIsSubmitting(true);
    try {
      const finalPrompt = confirmOnly ? `只确认理解，先不要剪：${prompt}` : prompt;
      let result: { intent: HairIntent; parserLabel: string; notice: string };
      if (confirmOnly) {
        result = parseLocally(finalPrompt, state);
      } else if (state.parserMode === "local") {
        result = parseLocally(prompt, state);
      } else {
        try {
          result = await parseWithApi(prompt, state);
        } catch (error) {
          const fallback = parseLocally(prompt, state);
          result = {
            ...fallback,
            notice: `服务端解析不可用，已使用本地解析。${error instanceof Error ? error.message : ""}`
          };
        }
      }

      const expectedLabel = state.parserMode === "codex"
        ? "Codex CLI 解析"
        : state.parserMode === "ai"
          ? "API 解析"
          : "";
      if (expectedLabel && result.parserLabel !== expectedLabel && !confirmOnly) {
        result.notice = `${expectedLabel}不可用，已使用本地解析。`;
      }

      dispatch({ type: "setParserNotice", notice: result.notice });
      dispatch({
        type: "applyPromptResult",
        payload: {
          prompt: finalPrompt,
          intent: result.intent,
          parserLabel: result.parserLabel,
          createdAt: Date.now()
        }
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const subtitle = useMemo(() => {
    if (state.latestScores.passed) return "已经过线。现在可以继续追求更少步数、更高准确度，或者进入下一关。";
    return "当前还没过线。把区域、程度和不要做什么说得更明确，分数会更稳定。";
  }, [state.latestScores.passed]);

  return (
    <main>
      <header className="hero">
        <div>
          <p className="eyebrow">MVP</p>
          <h1>Prompt Barber</h1>
          <p>用准确的描述，训练一位容易误解你的理发师。</p>
          <p className="heroSubtext">{subtitle}</p>
        </div>
        <div className="heroCard">
          <span>当前关卡</span>
          <strong>{state.currentLevelIndex + 1} / {levels.length}</strong>
          <em>{currentLevel.name}</em>
        </div>
      </header>

      <div className="gameGrid">
        <LevelPanel
          levels={levels}
          currentIndex={state.currentLevelIndex}
          onSelectLevel={(index) => dispatch({ type: "selectLevel", index, now: Date.now() })}
        />

        <GameStage
          level={currentLevel}
          currentHairState={state.currentHairState}
          scores={state.latestScores}
          debugVisible={state.debugVisible}
          canGoNext={canGoNext}
          onReset={() => dispatch({ type: "resetLevel", now: Date.now() })}
          onNext={() => dispatch({ type: "nextLevel", now: Date.now() })}
          onToggleDebug={() => dispatch({ type: "toggleDebug" })}
        />

        <div className="rightStack">
          <PromptComposer
            level={currentLevel}
            parserMode={state.parserMode}
            parserNotice={state.parserNotice}
            isSubmitting={isSubmitting}
            onSetParserMode={(mode: ParserMode) => dispatch({ type: "setParserMode", mode })}
            onSubmitPrompt={submitPrompt}
          />
          <FeedbackCard scores={state.latestScores} latestAmbiguities={latestAmbiguities} />
          <HistoryLog history={state.history} />
        </div>
      </div>
    </main>
  );
}
