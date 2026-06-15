/* eslint-env jest */
import React from "react";
import {render, screen} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import ApplicationAccessCenter, {buildApplicationAccessCenterSummary} from "./ApplicationAccessCenter";

const applications = [
  {
    owner: "admin",
    organization: "built-in",
    name: "app-complete",
    displayName: "AICodex Portal",
    clientId: "portal-client",
    clientSecret: "portal-secret-value",
    redirectUris: ["https://portal.example.com/callback"],
    scopes: ["openid", "profile", "email"],
    providers: [{name: "enterprise-oidc"}],
    grantTypes: ["authorization_code", "refresh_token"],
    disableSignin: false,
  },
  {
    owner: "admin",
    organization: "built-in",
    name: "app-missing-callback",
    displayName: "Missing Callback",
    clientId: "callback-client",
    clientSecret: "callback-secret-value",
    redirectUris: [],
    scopes: ["openid"],
    providers: [],
    grantTypes: ["authorization_code"],
    disableSignin: false,
  },
  {
    owner: "admin",
    organization: "built-in",
    name: "app-disabled",
    displayName: "Disabled Legacy App",
    clientId: "",
    clientSecret: "disabled-secret-value",
    redirectUris: ["https://legacy.example.com/callback"],
    scopes: [],
    providers: [{name: "legacy-provider"}],
    grantTypes: [],
    disableSignin: true,
  },
];

describe("ApplicationAccessCenter", () => {
  let consoleErrorSpy;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation((message, ...args) => {
      if (`${message}`.includes("ReactDOM.render is no longer supported")) {
        return;
      }

      consoleErrorSpy.mockRestore();
      throw new Error([message, ...args].map(item => `${item}`).join(" "));
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test("builds read-only access summary without exposing client secrets", () => {
    const summary = buildApplicationAccessCenterSummary(applications);

    expect(summary.metrics).toMatchObject({
      totalApplications: 3,
      enabledApplications: 2,
      completeApplications: 1,
      callbackReadyApplications: 2,
      scopedApplications: 2,
    });
    expect(summary.cards.map(card => card.status)).toEqual(["接入完整", "待补全", "已停用"]);
    expect(summary.riskItems).toEqual(expect.arrayContaining([
      expect.objectContaining({key: "missing-redirect-uris", count: 1}),
      expect.objectContaining({key: "missing-providers", count: 1}),
      expect.objectContaining({key: "missing-client-id", count: 1}),
    ]));
    expect(JSON.stringify(summary)).not.toContain("secret-value");
  });

  test("handles unnamed low-risk applications and scalar configuration fields", () => {
    const summary = buildApplicationAccessCenterSummary([
      {
        owner: "admin",
        displayName: "Unnamed Client",
        clientId: "unnamed-client",
        redirectUris: "https://unnamed.example.com/callback",
        scopes: [{scope: "openid"}],
        providers: [{name: "enterprise-oidc"}],
        grantTypes: "authorization_code",
      },
    ]);

    expect(summary.cards[0]).toMatchObject({
      displayName: "Unnamed Client",
      editPath: "/applications",
      status: "接入完整",
    });
    expect(summary.riskItems).toEqual([
      expect.objectContaining({
        key: "all-ready",
        title: "当前列表视图未发现接入缺口",
      }),
    ]);

    const ownerFallback = buildApplicationAccessCenterSummary([
      {
        owner: "tenant-a",
        name: "app-owner-fallback",
        clientId: "owner-client",
        redirectUris: ["https://owner.example.com/callback"],
        scopes: ["openid"],
        providers: [{name: "enterprise-oidc"}],
        grantTypes: ["authorization_code"],
      },
    ]);
    const adminFallback = buildApplicationAccessCenterSummary([
      {
        name: "app-admin-fallback",
        clientId: "admin-client",
        redirectUris: ["https://admin.example.com/callback"],
        scopes: ["openid"],
        providers: [{name: "enterprise-oidc"}],
        grantTypes: ["authorization_code"],
      },
    ]);
    const unnamedFallback = buildApplicationAccessCenterSummary([{}]);

    expect(buildApplicationAccessCenterSummary(null).metrics.totalApplications).toBe(0);
    expect(ownerFallback.cards[0].editPath).toBe("/applications/tenant-a/app-owner-fallback");
    expect(adminFallback.cards[0].editPath).toBe("/applications/admin/app-admin-fallback");
    expect(unnamedFallback.cards[0].displayName).toBe("未命名应用");
  });

  test("treats null configuration collections as missing access setup", () => {
    const summary = buildApplicationAccessCenterSummary([
      {
        owner: "admin",
        organization: "built-in",
        name: "app-null-config",
        redirectUris: null,
        scopes: null,
        providers: null,
        grantTypes: null,
      },
    ]);

    expect(summary.cards[0]).toMatchObject({
      status: "待补全",
      completeness: 0,
      callbackStatus: "回调地址待补全",
      scopeStatus: "授权范围待补全",
      providerStatus: "Provider 待绑定",
    });
    expect(summary.riskItems.map(item => item.key)).toEqual(expect.arrayContaining([
      "missing-redirect-uris",
      "missing-scopes",
      "missing-providers",
      "missing-client-id",
    ]));
  });

  test("renders status cards, risk summary, and existing configuration links", () => {
    render(
      <MemoryRouter>
        <ApplicationAccessCenter applications={applications} loading={false} />
      </MemoryRouter>
    );

    expect(screen.getByText("应用接入中心")).toBeInTheDocument();
    expect(screen.getByText("当前列表视图")).toBeInTheDocument();
    expect(screen.getByText("AICodex Portal")).toBeInTheDocument();
    expect(screen.getAllByText("接入完整").length).toBeGreaterThan(0);
    expect(screen.getByText("Missing Callback")).toBeInTheDocument();
    expect(screen.getByText("Disabled Legacy App")).toBeInTheDocument();
    expect(screen.getByText("缺少回调地址")).toBeInTheDocument();
    expect(screen.getByText("缺少 Provider 绑定")).toBeInTheDocument();
    expect(screen.getByText("应用列表").closest("a")).toHaveAttribute("href", "/applications");
    expect(screen.getAllByText("API 网关映射").some(item => item.closest("a")?.getAttribute("href") === "/platform-api-mappings")).toBe(true);
    expect(screen.getByText("OAuth/OIDC Provider").closest("a")).toHaveAttribute("href", "/providers");
    expect(screen.getAllByText("查看审计记录").some(item => item.closest("a")?.getAttribute("href") === "/records")).toBe(true);
    expect(screen.queryByText("portal-secret-value")).not.toBeInTheDocument();
  });

  test("renders low-risk fallback copy for complete unnamed current-view data", () => {
    render(
      <MemoryRouter>
        <ApplicationAccessCenter applications={[
          {
            owner: "admin",
            displayName: "Unnamed Client",
            clientId: "unnamed-client",
            redirectUris: "https://unnamed.example.com/callback",
            scopes: [{scope: "openid"}],
            providers: [{name: "enterprise-oidc"}],
            grantTypes: "authorization_code",
          },
        ]} />
      </MemoryRouter>
    );

    expect(screen.getByText("未配置技术名称")).toBeInTheDocument();
    expect(screen.getByText("当前列表视图未发现接入缺口")).toBeInTheDocument();
    expect(screen.getByText("低风险")).toBeInTheDocument();
  });

  test("keeps empty and loading states actionable", () => {
    const {unmount} = render(
      <MemoryRouter>
        <ApplicationAccessCenter applications={[]} loading={false} />
      </MemoryRouter>
    );

    expect(screen.getByText("暂无应用接入，先新增应用或进入 API 映射核对接入契约。")).toBeInTheDocument();
    expect(screen.getByText("新增应用").closest("a")).toHaveAttribute("href", "/applications");
    expect(screen.getAllByText("API 网关映射").some(item => item.closest("a")?.getAttribute("href") === "/platform-api-mappings")).toBe(true);

    unmount();

    render(
      <MemoryRouter>
        <ApplicationAccessCenter loading />
      </MemoryRouter>
    );

    expect(screen.getByText("加载应用接入状态...")).toBeInTheDocument();
  });
});
