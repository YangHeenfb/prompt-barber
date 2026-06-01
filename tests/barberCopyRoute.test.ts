import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routeSource = readFileSync(new URL("../app/api/barber-copy/route.ts", import.meta.url), "utf8");

describe("barber-copy route provider integration", () => {
  it("uses the shared structured JSON provider abstraction", () => {
    expect(routeSource).toContain("generateStructuredJson");
    expect(routeSource).toContain("@/lib/llm/generateStructuredJson");
  });

  it("does not import the OpenAI SDK or read legacy keys directly", () => {
    expect(routeSource).not.toMatch(/from ["']openai["']/);
    expect(routeSource).not.toMatch(/new OpenAI/);
    expect(routeSource).not.toMatch(/OPENAI_API_KEY/);
  });
});
