import {describe, expect, test} from "vitest";
import zh from "./locales/zh/data.json";

describe("LLM AI/Gateway Chinese labels", () => {
  test("uses enterprise authentication-center labels for gateway route names", () => {
    expect(zh.general["Agents"]).toBe("AI Agent 入口");
    expect(zh.general["Entries"]).toBe("入口配置");
    expect(zh.general["Sites"]).toBe("站点范围");
    expect(zh.general["Rules"]).toBe("治理规则");
    expect(zh.general["MCP Servers"]).toBe("MCP Server");
  });

  test("uses Chinese labels for gateway listening fields and edit titles", () => {
    expect(zh.general["Listening URL"]).toBe("监听入口 URL");
    expect(zh.general["Listening URL - Tooltip"]).toBe("AI Agent 或入口配置对外监听的 URL");
    expect(zh.agent["Edit Agent"]).toBe("编辑 AI Agent");
    expect(zh.agent["New Agent"]).toBe("新建 AI Agent");
    expect(zh.entry["Edit Entry"]).toBe("编辑入口配置");
    expect(zh.entry["New Entry"]).toBe("新建入口配置");
    expect(zh.rule["Edit Rule"]).toBe("编辑治理规则");
    expect(zh.site["Edit Site"]).toBe("编辑站点范围");
    expect(zh.server["Edit MCP Server"]).toBe("编辑 MCP Server");
    expect(zh.server["New MCP Server"]).toBe("新建 MCP Server");
  });
});
