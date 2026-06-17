import React from "react";
import {render, screen} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import i18next from "i18next";
import AuthSourceCenter, {buildAuthSourceCenterCards} from "./AuthSourceCenter";
import en from "./locales/en/data.json";
import zh from "./locales/zh/data.json";

const providers = [
  {
    owner: "admin",
    name: "wecom-main",
    displayName: "企业微信主认证",
    category: "OAuth",
    type: "WeCom",
    clientId: "corp-id",
    clientSecret: "wecom-secret-value",
    providerUrl: "https://qyapi.weixin.qq.com",
  },
  {
    owner: "admin",
    name: "feishu-main",
    displayName: "飞书 SSO",
    category: "OAuth",
    type: "Lark",
    clientId: "app-id",
    clientSecret: "",
    providerUrl: "https://open.feishu.cn",
  },
  {
    owner: "admin",
    name: "enterprise-oidc",
    displayName: "Enterprise OIDC",
    category: "OAuth",
    type: "OIDC",
    clientId: "oidc-client",
    clientSecret: "oidc-secret-value",
    providerUrl: "https://idp.example.com/.well-known/openid-configuration",
  },
];

async function useTestLanguage(language) {
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

describe("AuthSourceCenter", () => {
  beforeEach(async() => {
    await useTestLanguage("zh");
  });

  test("builds auth source cards from existing providers without exposing secrets", () => {
    const cards = buildAuthSourceCenterCards(providers);

    expect(cards.map(card => card.title)).toEqual(["企业微信", "飞书", "OIDC"]);
    expect(cards[0]).toMatchObject({
      status: "已启用",
      completeness: 100,
      providerName: "wecom-main",
    });
    expect(cards[1]).toMatchObject({
      status: "待补全",
      completeness: 67,
      providerName: "feishu-main",
    });
    expect(cards[2]).toMatchObject({
      status: "已启用",
      completeness: 100,
      providerName: "enterprise-oidc",
    });
    expect(JSON.stringify(cards)).not.toContain("secret-value");
  });

  test("renders compact diagnostics, diagnostic links, and failure summary", () => {
    const {container} = render(
      <MemoryRouter>
        <AuthSourceCenter providers={providers} loading={false} />
      </MemoryRouter>
    );

    expect(screen.getByText("认证源中心")).toBeInTheDocument();
    expect(container.querySelector(".auth-source-diagnostics-rail")).not.toBeNull();
    expect(container.querySelector(".enterprise-identity-status-card")).toBeNull();
    expect(screen.getAllByText("企业微信").length).toBeGreaterThan(0);
    expect(screen.getAllByText("飞书").length).toBeGreaterThan(0);
    expect(screen.getAllByText("OIDC").length).toBeGreaterThan(0);
    expect(screen.getByText(/企业微信主认证/)).toBeInTheDocument();
    expect(screen.getAllByText("100%")).toHaveLength(2);
    expect(screen.getByText("67%")).toBeInTheDocument();
    expect(screen.getByText("以同步页面和审计记录为准")).toBeInTheDocument();
    expect(screen.getAllByText("企业微信诊断").some(item => item.closest("a")?.getAttribute("href") === "/wecom-org-sync")).toBe(true);
    expect(screen.getAllByText("飞书诊断").some(item => item.closest("a")?.getAttribute("href") === "/feishu-org-sync")).toBe(true);
    expect(screen.getAllByText("查看审计记录").some(item => item.closest("a")?.getAttribute("href") === "/records")).toBe(true);
    expect(screen.queryByText("wecom-secret-value")).not.toBeInTheDocument();
  });

  test("keeps configuration and diagnostic entries available when providers are empty", () => {
    render(
      <MemoryRouter>
        <AuthSourceCenter providers={[]} loading={false} />
      </MemoryRouter>
    );

    expect(screen.getAllByText("未启用").length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText("暂无认证源配置，先从 Provider 列表新增或进入同步诊断页面核对。")).toBeInTheDocument();
    expect(screen.getByText("配置认证源").closest("a")).toHaveAttribute("href", "/providers");
    expect(screen.getAllByText("OIDC 配置").some(item => item.closest("a")?.getAttribute("href") === "/providers")).toBe(true);
  });

  test("covers loading and fallback summaries for incomplete provider fields", () => {
    const cards = buildAuthSourceCenterCards([
      {
        owner: "admin",
        name: "wechat-basic",
        type: "WeChat",
        clientId: null,
        providerUrl: "",
      },
    ]);

    expect(buildAuthSourceCenterCards()).toHaveLength(3);
    expect(cards[0]).toMatchObject({
      status: "待补全",
      completeness: 0,
      providerDisplayName: "wechat-basic",
    });

    render(
      <MemoryRouter>
        <AuthSourceCenter loading />
      </MemoryRouter>
    );

    expect(screen.getByText("加载认证源状态...")).toBeInTheDocument();
    expect(screen.getAllByText("未启用").length).toBeGreaterThanOrEqual(3);
  });
});
