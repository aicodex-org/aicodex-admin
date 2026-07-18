import {afterEach, beforeEach, describe, expect, test, vi} from "vitest";
import React from "react";
import {cleanup, render, waitFor} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import i18next from "i18next";
import IdentityAssetRelationshipDrawer from "./IdentityAssetRelationshipDrawer";
import {
  buildApplicationIdentityAssetDetail,
  buildProviderIdentityAssetDetail
} from "./identityAssetRelationship";
import en from "./locales/en/data.json";
import zh from "./locales/zh/data.json";

async function useTestLanguage(language: string) {
  if (!i18next.isInitialized) {
    await i18next.init({
      lng: language,
      fallbackLng: "en",
      resources: {en, zh},
      ns: Object.keys(en),
      keySeparator: false,
    });
  }

  i18next.addResourceBundle("en", "identityAssetRelationship", en.identityAssetRelationship, true, true);
  i18next.addResourceBundle("zh", "identityAssetRelationship", zh.identityAssetRelationship, true, true);
  i18next.addResourceBundle("en", "general", en.general, true, true);
  i18next.addResourceBundle("zh", "general", zh.general, true, true);
  await i18next.changeLanguage(language);
}

describe("IdentityAssetRelationshipDrawer", () => {
  let consoleErrorSpy: {mockRestore: () => void};

  beforeEach(async() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      throw new Error(args.map(item => String(item)).join(" "));
    });
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    });
    await useTestLanguage("zh");
  });

  afterEach(() => {
    cleanup();
    consoleErrorSpy.mockRestore();
  });

  test("renders an empty state before an identity asset is selected", () => {
    const view = render(
      <MemoryRouter>
        <IdentityAssetRelationshipDrawer open asset={null} onClose={vi.fn()} />
      </MemoryRouter>
    );

    expect(view.getByText("暂无选中的身份资产")).not.toBeNull();
    expect(view.queryByText("对象类型")).toBeNull();
  });

  test("unmounts hidden details and reopens with the current identity asset", async() => {
    const first = buildApplicationIdentityAssetDetail({
      owner: "admin",
      organization: "built-in",
      name: "first-app",
      displayName: "First identity app",
      providers: [],
    }, {pagePath: "/applications", loadedRows: 1});
    const second = buildApplicationIdentityAssetDetail({
      owner: "admin",
      organization: "built-in",
      name: "second-app",
      displayName: "Second identity app",
      providers: [],
    }, {pagePath: "/applications", loadedRows: 1});
    const onClose = vi.fn();
    const view = render(
      <MemoryRouter>
        <IdentityAssetRelationshipDrawer open asset={first} onClose={onClose} />
      </MemoryRouter>
    );

    expect(view.getByText("First identity app")).not.toBeNull();
    view.rerender(
      <MemoryRouter>
        <IdentityAssetRelationshipDrawer open={false} asset={first} onClose={onClose} />
      </MemoryRouter>
    );
    await waitFor(() => expect(view.queryByText("First identity app")).toBeNull());

    view.rerender(
      <MemoryRouter>
        <IdentityAssetRelationshipDrawer open asset={second} onClose={onClose} />
      </MemoryRouter>
    );
    expect(await view.findByText("Second identity app")).not.toBeNull();
    expect(view.queryByText("First identity app")).toBeNull();
  });

  test("renders application boundaries, current-view relationships, evidence links, and redaction state", () => {
    const detail = buildApplicationIdentityAssetDetail({
      owner: "admin",
      organization: "built-in",
      name: "portal",
      displayName: "AICodex Portal",
      clientId: "portal-client",
      clientSecret: "secret-value",
      redirectUris: ["https://private.example.com/callback"],
      scopes: ["openid"],
      providers: [{name: "enterprise-oidc", category: "OAuth", targetOrganization: "built-in"}],
    }, {
      pagePath: "/applications",
      loadedRows: 1,
      totalRows: 12,
    });

    const view = render(
      <MemoryRouter>
        <IdentityAssetRelationshipDrawer open asset={detail} onClose={vi.fn()} />
      </MemoryRouter>
    );

    expect(view.getByText("身份资产对象信息")).not.toBeNull();
    expect(view.getAllByText("Application").length).toBeGreaterThan(0);
    expect(view.getByText("AICodex Portal")).not.toBeNull();
    expect(view.getAllByText("当前视图").length).toBeGreaterThan(0);
    expect(view.getByText("Provider 绑定")).not.toBeNull();
    expect(view.getByText("目标组织")).not.toBeNull();
    expect(view.getByText("审计记录").closest("a")?.getAttribute("href")).toBe("/records");
    expect(view.getByText("令牌管理").closest("a")?.getAttribute("href")).toBe("/tokens");
    expect(view.baseElement.textContent).toContain("后续只读聚合接口");
    expect(view.getByText("已隐藏敏感字段")).not.toBeNull();
    expect(view.baseElement.textContent).not.toContain("secret-value");
    expect(view.baseElement.textContent).not.toContain("private.example.com");
  });

  test("renders configured status and no-credential redaction copy", () => {
    const detail = buildApplicationIdentityAssetDetail({
      owner: "admin",
      organization: "built-in",
      name: "console",
      displayName: "Identity Console",
      disableSignin: false,
      scopes: [{name: "openid"}],
      providers: [],
    }, {
      pagePath: "/applications",
      loadedRows: 1,
    });

    const view = render(
      <MemoryRouter>
        <IdentityAssetRelationshipDrawer open asset={detail} onClose={vi.fn()} />
      </MemoryRouter>
    );

    expect(view.getByText("Identity Console")).not.toBeNull();
    expect(view.getAllByText("built-in").length).toBeGreaterThan(0);
    expect(view.getByText("当前对象可核对")).not.toBeNull();
    expect(view.getByText("未渲染凭据原值")).not.toBeNull();
  });

  test("renders relationship copy in English without Chinese fallbacks", async() => {
    await useTestLanguage("en");
    const detail = buildApplicationIdentityAssetDetail({
      owner: "admin",
      organization: "built-in",
      name: "portal",
      displayName: "AICodex Portal",
      redirectUris: ["https://private.example.com/callback"],
      scopes: ["openid"],
      providers: [{name: "enterprise-oidc", category: "OAuth", targetOrganization: "built-in"}],
    }, {
      pagePath: "/applications",
      loadedRows: 1,
      totalRows: 12,
    });

    const view = render(
      <MemoryRouter>
        <IdentityAssetRelationshipDrawer open asset={detail} onClose={vi.fn()} />
      </MemoryRouter>
    );

    expect(view.getByText("Identity asset object context")).not.toBeNull();
    expect(view.getByText("Provider binding")).not.toBeNull();
    expect(view.getByText("Target organization")).not.toBeNull();
    expect(view.getByText("Audit records").closest("a")?.getAttribute("href")).toBe("/records");
    expect(view.baseElement.textContent).not.toMatch(/[\u4e00-\u9fff]/);
  });

  test("renders cannot infer and permission states without leaking object details", () => {
    const providerDetail = buildProviderIdentityAssetDetail({
      owner: "admin",
      name: "enterprise-oidc",
      displayName: "Enterprise OIDC",
      category: "OAuth",
      type: "OIDC",
      clientSecret: "secret-value",
    }, {
      pagePath: "/providers",
      loadedRows: 1,
    });

    const view = render(
      <MemoryRouter>
        <IdentityAssetRelationshipDrawer open asset={providerDetail} onClose={vi.fn()} />
      </MemoryRouter>
    );

    expect(view.baseElement.textContent).toContain("应用绑定需从应用列表核对");
    expect(view.getByText("当前对象信息不足")).not.toBeNull();
    expect(view.baseElement.textContent).not.toContain("secret-value");

    view.rerender(
      <MemoryRouter>
        <IdentityAssetRelationshipDrawer
          open
          asset={{...providerDetail, permission: {allowed: false, reason: "restricted"}}}
          onClose={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(view.getByText("无权查看该对象关系")).not.toBeNull();
    expect(view.queryByText("Enterprise OIDC")).toBeNull();
  });

  test("maps provider diagnostics to synced organization source pages", () => {
    const feishuDetail = buildProviderIdentityAssetDetail({
      owner: "admin",
      name: "feishu-main",
      displayName: "飞书 SSO",
      category: "OAuth",
      type: "Feishu",
    }, {
      pagePath: "/providers",
      loadedRows: 1,
    });
    const dingtalkDetail = buildProviderIdentityAssetDetail({
      owner: "admin",
      name: "dingtalk-main",
      displayName: "钉钉 SSO",
      category: "OAuth",
      type: "DingTalk",
    }, {
      pagePath: "/providers",
      loadedRows: 1,
    });

    expect(feishuDetail.relationships.find(item => item.key === "sync-diagnostics")).toMatchObject({
      value: "飞书诊断",
      to: "/feishu-org-sync",
    });
    expect(dingtalkDetail.relationships.find(item => item.key === "sync-diagnostics")).toMatchObject({
      value: "钉钉诊断",
      to: "/dingtalk-org-sync",
    });
  });
});
