import { useState } from "react";
type PromptComposerProps = {
  isSubmitting: boolean;
  onSubmitPrompt: (prompt: string, confirmOnly?: boolean) => Promise<void>;
};

export function PromptComposer({
  isSubmitting,
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
    </section>
  );
}
