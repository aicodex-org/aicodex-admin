/* eslint-env jest */
import {expect} from "@jest/globals";
import React from "react";
import {MemoryRouter} from "react-router-dom";
import {render} from "@testing-library/react";
import i18next from "i18next";
import LlmAiGatewayCenter, {buildLlmAiGatewayCenterSummary} from "./LlmAiGatewayCenter";
import en from "./locales/en/data.json";
import zh from "./locales/zh/data.json";

const agents = [
  {
    owner: "org-alpha",
    name: "agent-one",
    displayName: "Identity Copilot",
    url: "https://private-gateway.example.invalid/listen",
    token: "secret-agent-token",
    application: "app-admin",
  },
  {
    owner: "org-alpha",
    name: "agent-two",
    displayName: "",
    url: "",
    token: "",
    application: "",
  },
];

async function useTestLanguage(language: string) {
  if (!i18next.isInitialized) {
    await i18next.init({
      lng: language,
      fallbackLng: "en",
      resources: {en, zh},
      ns: Object.keys(en),
      keySeparator: false,
    });
    return;
  }

  i18next.addResourceBundle("en", "general", en.general, true, true);
  i18next.addResourceBundle("zh", "general", zh.general, true, true);
  await i18next.changeLanguage(language);
}

describe("LlmAiGatewayCenter", () => {
  beforeEach(async() => {
    await useTestLanguage("zh");
  });

  test("builds read-only summary without leaking agent credentials or private URLs", () => {
    const summary = buildLlmAiGatewayCenterSummary({agents, totalAgents: 8});

    expect(summary.metrics.totalAgents).toBe(8);
    expect(summary.metrics.currentViewAgents).toBe(2);
    expect(summary.metrics.agentsWithApplications).toBe(1);
    expect(summary.metrics.agentsWithListeningEndpoints).toBe(1);
    expect(summary.riskItems.find(item => item.key === "agent-application-missing")).toEqual(expect.objectContaining({
      count: 1,
      path: "/agents",
    }));
    expect(summary.entryLinks.map(item => item.to)).toEqual([
      "/agents",
      "/servers",
      "/server-store",
      "/entries",
      "/sites",
      "/rules",
      "/platform-api-mappings",
      "/records",
    ]);
    expect(JSON.stringify(summary)).not.toContain("secret-agent-token");
    expect(JSON.stringify(summary)).not.toContain("private-gateway.example.invalid");
  });

  test("renders gateway center around existing LLM AI routes", () => {
    const view = render(
      <MemoryRouter>
        <LlmAiGatewayCenter agents={agents} totalAgents={8} loading={false} />
      </MemoryRouter>
    );

    expect(view.getByText("LLM AI 网关中心")).not.toBeNull();
    expect(view.getAllByText("当前 Agent 视图").length).toBeGreaterThan(0);
    expect(view.getByText("Agent 绑定应用待补全")).not.toBeNull();
    expect(view.getAllByText("API 网关身份映射").some((item: HTMLElement) => item.closest("a")?.getAttribute("href") === "/platform-api-mappings")).toBe(true);
    expect(view.getAllByText("MCP Server").some((item: HTMLElement) => item.closest("a")?.getAttribute("href") === "/servers")).toBe(true);
    expect(view.queryByText(/Gateway 投影/)).toBeNull();
    expect(view.queryByText(/secret-agent-token|private-gateway/)).toBeNull();
  });

  test("keeps empty and loading states actionable", () => {
    const view = render(
      <MemoryRouter>
        <LlmAiGatewayCenter agents={[]} totalAgents={0} loading={false} />
      </MemoryRouter>
    );

    expect(view.getByText("暂无 Agent 接入，先新增 Agent 或核对 MCP Server 与网关身份映射。")).not.toBeNull();

    view.rerender(
      <MemoryRouter>
        <LlmAiGatewayCenter agents={[]} totalAgents={0} loading />
      </MemoryRouter>
    );

    expect(view.getByText("正在加载 LLM AI 网关状态...")).not.toBeNull();
  });
});
