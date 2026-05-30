import { describe, expect, it } from "vitest";
import { safeParseBarberCopyResponse, validateBarberCopyResponse } from "../lib/hair/barberCopySchema";

describe("barberCopySchema", () => {
  it("accepts valid barber copy", () => {
    expect(validateBarberCopyResponse({
      title: "镜前确认一下",
      spokenText: "刘海我会稍微收短，但不剪成一条齐线；边缘留点碎感，其他地方先稳住。",
      emotion: "careful"
    })).toBe(true);
  });

  it("accepts reassuring emotion", () => {
    expect(validateBarberCopyResponse({
      title: "听到了，这次明显点",
      spokenText: "听到了，你是嫌刚才太保守；这次我会下刀更明确一点，但不一口气剪过头。",
      emotion: "reassuring"
    })).toBe(true);
  });

  it("rejects technical or numeric player copy", () => {
    expect(validateBarberCopyResponse({
      title: "调试",
      spokenText: "bangsLength 从 7 到 6，Codex 解析完成。",
      emotion: "careful"
    })).toBe(false);
  });

  it("parses only valid structured JSON", () => {
    expect(safeParseBarberCopyResponse(JSON.stringify({
      title: "剪刀先放下",
      spokenText: "剪刀先不动，现在还没下刀；我先把意思核清楚，等你点头再动。",
      emotion: "confirming"
    }))).not.toBeNull();
    expect(safeParseBarberCopyResponse("not json")).toBeNull();
  });
});
