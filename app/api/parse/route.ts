import { NextResponse } from "next/server";
import { spawn } from "node:child_process";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { hairIntentJsonSchema, safeParseHairIntent, validateHairIntent } from "@/lib/hair/schema";
import { parseHairPrompt } from "@/lib/hair/localParser";
import type { HairIntent, HairState, ParserMode } from "@/lib/hair/types";

export const runtime = "nodejs";

type ParseRequest = {
  prompt?: string;
  currentState?: HairState;
  levelName?: string;
  targetState?: HairState;
  parserMode?: ParserMode;
};

type ParserSource = "codex" | "ai" | "local";

const fallbackCodexPath = "/Applications/Codex.app/Contents/Resources/codex";
const codexTimeoutMs = Number(process.env.CODEX_CLI_TIMEOUT_MS ?? 30000);

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

function runCodexCli(command: string, args: string[], input: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
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

async function parseWithCodexCli(body: ParseRequest, prompt: string): Promise<HairIntent> {
  if (process.env.CODEX_CLI_DISABLED === "1") {
    throw new Error("CODEX_CLI_DISABLED=1，已关闭 Codex CLI 解析。");
  }

  const workDir = await mkdtemp(join(tmpdir(), "prompt-barber-codex-"));
  const schemaPath = join(workDir, "hair-intent.schema.json");
  const outputPath = join(workDir, "hair-intent.output.json");

  try {
    await writeFile(schemaPath, JSON.stringify(hairIntentJsonSchema, null, 2), "utf8");

    const command = await resolveCodexCliPath();
    const model = process.env.CODEX_CLI_MODEL || process.env.OPENAI_MODEL || "gpt-5.4-mini";
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
      'model_reasoning_effort="low"',
      "--output-schema",
      schemaPath,
      "--output-last-message",
      outputPath,
      "-"
    ];

    const cliPrompt = [
      "你是 Prompt Barber 游戏的理发指令解析器。",
      "把玩家自然语言转换为结构化发型操作，只能返回符合 JSON Schema 的 JSON，不要返回 Markdown、解释或额外字段。",
      "保持操作保守；如果表达模糊，在 ambiguities 中说明并降低 confidence。",
      "尊重不可逆规则：同一次尝试中长度字段不能主动变长。",
      "notes、warnings、ambiguities、reason 使用简体中文。",
      "",
      JSON.stringify(
        {
          prompt,
          currentState: body.currentState,
          levelName: body.levelName,
          targetState: body.targetState
        },
        null,
        2
      )
    ].join("\n");

    await runCodexCli(command, args, cliPrompt);
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

async function parseWithOpenAI(body: ParseRequest, prompt: string): Promise<HairIntent> {
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
          "You are a haircut instruction parser for a game. Convert player language into structured hairstyle operations. Do not invent fields outside the schema. Keep operations conservative. Respect irreversibility: length fields cannot grow back during an attempt. If the user is ambiguous, return ambiguities and lower confidence. Output only the structured object. Use concise Simplified Chinese in notes, warnings, ambiguities, and reasons."
      },
      {
        role: "user",
        content: JSON.stringify({
          prompt,
          currentState: body.currentState,
          levelName: body.levelName,
          targetState: body.targetState
        })
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
    return NextResponse.json({ ok: false, useLocal: true, reason: "请求体不是有效 JSON。" }, { status: 400 });
  }

  const prompt = body.prompt?.trim() ?? "";
  if (!prompt) {
    return NextResponse.json({ ok: true, source: "local" satisfies ParserSource, intent: parseHairPrompt(prompt, body.currentState) });
  }

  const mode = body.parserMode ?? "auto";
  if (mode === "local") {
    return NextResponse.json({ ok: true, source: "local" satisfies ParserSource, intent: parseHairPrompt(prompt, body.currentState) });
  }

  const errors: string[] = [];

  if (shouldTryCodex(mode)) {
    try {
      const intent = await parseWithCodexCli(body, prompt);
      return NextResponse.json({ ok: true, source: "codex" satisfies ParserSource, intent });
    } catch (error) {
      errors.push(error instanceof Error ? `Codex CLI 解析失败：${error.message}` : "Codex CLI 解析失败。");
    }
  }

  if (shouldTryOpenAI(mode)) {
    try {
      const intent = await parseWithOpenAI(body, prompt);
      return NextResponse.json({ ok: true, source: "ai" satisfies ParserSource, intent });
    } catch (error) {
      errors.push(error instanceof Error ? `API 解析失败：${error.message}` : "API 解析失败。");
    }
  }

  return NextResponse.json({ ok: false, useLocal: true, reason: fallbackReason(errors) });
}
