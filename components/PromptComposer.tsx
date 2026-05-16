import { useState } from "react";
import type { LevelConfig, ParserMode } from "@/lib/hair/types";

type PromptComposerProps = {
  level: LevelConfig;
  parserMode: ParserMode;
  parserNotice: string;
  isSubmitting: boolean;
  onSetParserMode: (mode: ParserMode) => void;
  onSubmitPrompt: (prompt: string, confirmOnly?: boolean) => Promise<void>;
};

export function PromptComposer({
  level,
  parserMode,
  parserNotice,
  isSubmitting,
  onSetParserMode,
  onSubmitPrompt
}: PromptComposerProps) {
  const [prompt, setPrompt] = useState("");

  async function submit(confirmOnly = false) {
    const text = prompt.trim();
    if (!text) return;
    await onSubmitPrompt(text, confirmOnly);
    if (!confirmOnly) setPrompt("");
  }

  return (
    <section className="panel promptPanel">
      <div className="panelHeader">
        <p className="eyebrow">Prompt</p>
        <h2>输入理发指令</h2>
      </div>

      <label className="formLabel" htmlFor="parserMode">解析模式</label>
      <select id="parserMode" value={parserMode} onChange={(event) => onSetParserMode(event.target.value as ParserMode)}>
        <option value="auto">自动</option>
        <option value="local">本地解析</option>
        <option value="codex">Codex CLI</option>
        <option value="ai">API 解析</option>
      </select>
      <p className="noticeText">{parserNotice}</p>

      <label className="formLabel" htmlFor="hairPrompt">你的描述</label>
      <textarea
        id="hairPrompt"
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        placeholder="例如：两侧推短一点，顶部保留，刘海只打薄不要剪齐"
        rows={6}
      />

      <div className="promptActions">
        <button className="primaryButton" type="button" onClick={() => void submit(false)} disabled={isSubmitting || !prompt.trim()}>
          执行理发
        </button>
        <button className="secondaryButton" type="button" onClick={() => void submit(true)} disabled={isSubmitting || !prompt.trim()}>
          只确认理解
        </button>
      </div>

      <div className="hintBox">
        <h3>提示语</h3>
        <div className="hintChips">
          {level.hints.map((hint) => (
            <button key={hint} type="button" onClick={() => setPrompt(hint)}>
              {hint}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
