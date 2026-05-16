import { NextResponse } from "next/server";
import { spawn } from "node:child_process";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { hairIntentJsonSchema, safeParseHairIntent, validateHairIntent } from "@/lib/hair/schema";
import type { HairIntent, ParserMode } from "@/lib/hair/types";

export const runtime = "nodejs";

type ParseRequest = {
  prompt?: string;
  parserMode?: ParserMode;
};

type ParserSource = "codex" | "ai";

const fallbackCodexPath = "/Applications/Codex.app/Contents/Resources/codex";
const codexTimeoutMs = Number(process.env.CODEX_CLI_TIMEOUT_MS ?? 30000);
const defaultCodexCliModel = "gpt-5.4";
const defaultCodexReasoningEffort = "low";
const defaultCodexServiceTier = "priority";

function extractOutputText(response: unknown): string {
  const candidate = response as { output_text?: string; output?: Array<{ content?: Array<{ text?: string; type?: string }> }> };
  if (typeof candidate.output_text === "string") return candidate.output_text;
  const firstText = candidate.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => content.text)
    .find((text) => typeof text === "string");
  return firstText ?? "";
}

function parseIntentFromText(text: string): HairIntent | null {
  const direct = safeParseHairIntent(text.trim());
  if (direct) return direct;

  const withoutFence = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
  const unfenced = safeParseHairIntent(withoutFence);
  if (unfenced) return unfenced;

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  return safeParseHairIntent(text.slice(start, end + 1));
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function resolveCodexCliPath(): Promise<string> {
  if (process.env.CODEX_CLI_PATH) return process.env.CODEX_CLI_PATH;
  if (await pathExists(fallbackCodexPath)) return fallbackCodexPath;
  return "codex";
}

function runCodexCli(command: string, args: string[], input: string, cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, NO_COLOR: "1" },
      stdio: ["pipe", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    let settled = false;
    const timeout = setTimeout(() => {
      settled = true;
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 2000);
      reject(new Error(`Codex CLI 超过 ${Math.round(codexTimeoutMs / 1000)} 秒未返回。`));
    }, codexTimeoutMs);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
      if (stdout.length > 12000) stdout = stdout.slice(-12000);
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
      if (stderr.length > 12000) stderr = stderr.slice(-12000);
    });

    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(error);
    });

    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (code === 0) {
        resolve();
        return;
      }
      const detail = [stderr.trim(), stdout.trim()].filter(Boolean).join("\n").slice(0, 1000);
      reject(new Error(detail || `Codex CLI 退出码 ${code}`));
    });

    child.stdin.end(input);
  });
}

async function parseWithCodexCli(prompt: string): Promise<HairIntent> {
  if (process.env.CODEX_CLI_DISABLED === "1") {
    throw new Error("CODEX_CLI_DISABLED=1，已关闭 Codex CLI 解析。");
  }

  const workDir = await mkdtemp(join(tmpdir(), "prompt-barber-codex-"));
  const schemaPath = join(workDir, "hair-intent.schema.json");
  const outputPath = join(workDir, "hair-intent.output.json");

  try {
    await writeFile(schemaPath, JSON.stringify(hairIntentJsonSchema, null, 2), "utf8");

    const command = await resolveCodexCliPath();
    const model = process.env.CODEX_CLI_MODEL || process.env.OPENAI_MODEL || defaultCodexCliModel;
    const reasoningEffort = process.env.CODEX_CLI_REASONING_EFFORT || defaultCodexReasoningEffort;
    const serviceTier = process.env.CODEX_CLI_SERVICE_TIER || defaultCodexServiceTier;
    const args = [
      "exec",
      "--skip-git-repo-check",
      "--ephemeral",
      "--ignore-user-config",
      "--ignore-rules",
      "--sandbox",
      "read-only",
      "-m",
      model,
      "-c",
      `model_reasoning_effort=${JSON.stringify(reasoningEffort)}`,
      "-c",
      `service_tier=${JSON.stringify(serviceTier)}`,
      "--output-schema",
      schemaPath,
      "--output-last-message",
      outputPath,
      "-"
    ];

    const cliPrompt = [
      "你是 Prompt Barber 游戏的理发指令解析器。",
      "把玩家自然语言转换为结构化发型操作，只能返回符合 JSON Schema 的 JSON，不要返回 Markdown、解释或额外字段。",
      "你只能使用这里给出的通用游戏背景和玩家输入；不要根据外部上下文推断任何具体目标或状态。",
      "游戏发型参数包括：topLength 顶部长度 0-10、sideLength 两侧长度 0-10、bangsLength 刘海长度 0-10、fadeHeight 渐变高度 0-5、volume 蓬松度 0-10、texture 纹理层次 0-10、sideburns 鬓角长度 0-10、parting 分缝 none/middle/left/right、neckline 后颈线 natural/clean/tapered。",
      "HairOperation.operation 只能是 set、increment 或 decrement；value 是变化量或要设置的枚举值。",
      "玩家可能说的是整体风格目标，而不是明确的区域动作。你必须只根据玩家这句话推断合理操作。",
      "例如“帮我剪成短发”“剪清爽一点”“修精神点”都应该输出保守的多字段理发操作，而不是因为没有区域词就拒绝。",
      "保持操作保守；如果表达模糊，在 ambiguities 中说明并降低 confidence。",
      "不要向玩家提问；先给出你能执行的保守理解。",
      "尊重不可逆规则：topLength、sideLength、bangsLength、sideburns 这些长度字段不能主动变长；如果玩家要求变长，只给 warning，不输出让长度增加的操作。",
      "只有当玩家明显不是在提出理发需求，或明确只是确认理解/先别剪时，才返回空 operations。",
      "notes、warnings、ambiguities、reason 使用简体中文。",
      "",
      JSON.stringify({ prompt }, null, 2)
    ].join("\n");

    await runCodexCli(command, args, cliPrompt, workDir);
    const outputText = await readFile(outputPath, "utf8");
    const parsed = parseIntentFromText(outputText);
    if (!parsed || !validateHairIntent(parsed)) {
      throw new Error("Codex CLI 返回格式未通过校验。");
    }
    return parsed;
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

async function parseWithOpenAI(prompt: string): Promise<HairIntent> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("未设置 OPENAI_API_KEY。");
  }

  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_MODEL || "gpt-5.4-mini";

  const response = await client.responses.create({
    model,
    input: [
      {
        role: "system",
        content:
          "You are a haircut instruction parser for the game Prompt Barber. Convert player language into structured hairstyle operations. Use only this generic game background and the player's instruction; do not infer any concrete goal or state from outside context. Do not invent fields outside the schema. Hairstyle fields are topLength, sideLength, bangsLength, fadeHeight, volume, texture, sideburns, parting, and neckline. The player may give a holistic style goal instead of explicit region-by-region instructions. Infer reasonable conservative operations only from the player's instruction. For example, requests like '帮我剪成短发', '剪清爽一点', or '修精神点' should produce conservative multi-field haircut operations, not a refusal just because no exact region was named. Keep operations conservative. Do not ask follow-up questions; execute the safest reasonable interpretation. Respect irreversibility: topLength, sideLength, bangsLength, and sideburns cannot grow back during an attempt; if the player asks for longer hair, add a warning and do not output operations that increase these length fields. If the user is ambiguous, return ambiguities and lower confidence. Return empty operations only when the player clearly is not making a haircut request or explicitly asks only for confirmation/no cutting. Output only the structured object. Use concise Simplified Chinese in notes, warnings, ambiguities, and reasons."
      },
      {
        role: "user",
        content: JSON.stringify({ prompt })
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "hair_intent",
        strict: true,
        schema: hairIntentJsonSchema
      }
    }
  } as never);

  const outputText = extractOutputText(response);
  const parsed = safeParseHairIntent(outputText);
  if (!parsed || !validateHairIntent(parsed)) {
    throw new Error("API 返回格式未通过校验。");
  }
  return parsed;
}

function shouldTryCodex(mode: ParserMode): boolean {
  return mode === "auto" || mode === "codex";
}

function shouldTryOpenAI(mode: ParserMode): boolean {
  return mode === "auto" || mode === "ai";
}

function fallbackReason(errors: string[]): string {
  if (errors.length === 0) return "服务端解析不可用。";
  return errors.join("；");
}

export async function POST(request: Request) {
  let body: ParseRequest;
  try {
    body = (await request.json()) as ParseRequest;
  } catch {
    return NextResponse.json({ ok: false, reason: "请求体不是有效 JSON。" }, { status: 400 });
  }

  const prompt = body.prompt?.trim() ?? "";
  if (!prompt) {
    return NextResponse.json({ ok: false, reason: "空白输入无法解析。" }, { status: 400 });
  }

  const mode = body.parserMode ?? "auto";
  const errors: string[] = [];

  if (shouldTryCodex(mode)) {
    try {
      const intent = await parseWithCodexCli(prompt);
      return NextResponse.json({ ok: true, source: "codex" satisfies ParserSource, intent });
    } catch (error) {
      errors.push(error instanceof Error ? `Codex CLI 解析失败：${error.message}` : "Codex CLI 解析失败。");
    }
  }

  if (shouldTryOpenAI(mode)) {
    try {
      const intent = await parseWithOpenAI(prompt);
      return NextResponse.json({ ok: true, source: "ai" satisfies ParserSource, intent });
    } catch (error) {
      errors.push(error instanceof Error ? `API 解析失败：${error.message}` : "API 解析失败。");
    }
  }

  return NextResponse.json({ ok: false, reason: fallbackReason(errors) });
}
