/* eslint-env jest */
import React from "react";
import {render} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import {expect, jest} from "@jest/globals";
import i18next from "i18next";
import ApplicationAccessCenter, {buildApplicationAccessCenterSummary} from "./ApplicationAccessCenter";
import {buildServiceCredentialGovernanceHandoffPackage} from "./backend/ApplicationAccessServiceCredentialGovernanceBackend";
import type {ServiceCredentialGovernanceConfigResponse, ServiceCredentialGovernanceDiagnosticResponse, ServiceCredentialGovernanceStatusResponse} from "./backend/ApplicationAccessServiceCredentialGovernanceBackend";
import en from "./locales/en/data.json";
import zh from "./locales/zh/data.json";

type FetchCall = [string, {body?: string; credentials?: string; method?: string}?];
type MockFetch = {
  (...args: unknown[]): unknown;
  mock: {calls: FetchCall[]};
  mockRejectedValueOnce: (value: unknown) => MockFetch;
  mockResolvedValueOnce: (value: unknown) => MockFetch;
};

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
    providers: [{name: "enterprise-oidc", category: "OAuth", targetOrganization: "built-in"}],
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

const serviceCredentialGovernanceResponse = {
  status: "ok",
  data: {
    generatedAt: "2026-06-21T03:40:00Z",
    source: "admin_runtime_config",
    groups: [
      {
        key: "insight_provider_trust",
        label: "Insight provider trust",
        owner: "admin_provider_trust",
        status: "partial",
        configuredKeys: ["insightProviderAllowedAudiences"],
        missingKeys: ["insightProviderAllowedIssuers"],
        credentialReferenceStatus: "not_applicable",
        boundedRuntimePolicy: {requiredScopesDefaulted: true},
        remediationRoute: "/providers",
      },
      {
        key: "usage_identity_resolver",
        label: "Usage identity resolver",
        owner: "admin_outbound_resolver",
        status: "configured",
        configuredKeys: ["insightUsageIdentityResolverEndpoint", "insightUsageIdentityResolverToken"],
        missingKeys: [],
        credentialReferenceStatus: "configured",
        callerPolicy: "aicodex-admin",
        boundedRuntimePolicy: {
          maxItems: 25,
          timeoutMs: 1500,
          unsafeTokenValue: "resolver-secret-value",
          unsafeEndpoint: "https://resolver.internal.example.invalid/api/usage",
        },
        remediationRoute: "/platform-api-mappings",
      },
      {
        key: "gateway_organization_projection",
        label: "Gateway organization projection",
        owner: "admin_gateway_projection_producer",
        status: "blocked",
        configuredKeys: ["gatewayOrganizationProjectionEndpoint"],
        missingKeys: ["gatewayOrganizationProjectionToken"],
        credentialReferenceStatus: "missing",
        callerPolicy: "aicodex-admin",
        boundedRuntimePolicy: {
          enabled: true,
          unsafeTokenValue: "projection-secret-value",
          unsafeEndpoint: "https://gateway.internal.example.invalid/api/projection",
        },
        blockedReasons: ["gateway_projection_token_missing"],
        remediationRoute: "/platform-api-mappings",
      },
      {
        key: "keep_in_env",
        label: "Keep in env/config",
        owner: "deployment_env_config",
        status: "configured",
        configuredKeys: ["env/config"],
        credentialReferenceStatus: "external_secret",
        keepInEnvKeys: ["dataSourceName", "redisEndpoint"],
        remediationRoute: "env/config",
      },
    ],
  },
};

const serviceCredentialGovernanceConfigResponse = {
  status: "ok",
  data: {
    updatedAt: "2026-06-21T06:00:00Z",
    source: "admin_service_credential_governance_config",
    isConfigured: true,
    groups: [
      {
        key: "insight_provider_trust",
        label: "Insight provider trust",
        enabled: true,
        owner: "admin_provider_trust",
        sourceClass: "admin_config",
        credentialReferenceStatus: "not_applicable",
        callerPolicy: "insight_service_token",
        remediationRoute: "/providers",
        nextAction: "核对 Insight provider trust 白名单",
      },
      {
        key: "usage_identity_resolver",
        label: "Usage identity resolver",
        enabled: true,
        owner: "admin_outbound_resolver",
        sourceClass: "external_secret_system",
        credentialReferenceStatus: "external_secret",
        credentialReferenceKey: "vault:usage-identity-resolver",
        callerPolicy: "aicodex-admin",
        boundedRuntimePolicy: {
          timeoutMs: 1500,
          unsafeAccessToken: "resolver-token-value",
          unsafeTokenValue: "resolver-secret-value",
          rawId: "raw-id-123",
          unsafeEndpoint: "https://resolver.internal.example.invalid/api/usage",
        },
        remediationRoute: "/platform-api-mappings",
        nextAction: "核对 resolver 凭据引用",
      },
      {
        key: "gateway_organization_projection",
        label: "Gateway organization projection",
        enabled: true,
        owner: "admin_gateway_projection_producer",
        sourceClass: "external_secret_system",
        credentialReferenceStatus: "external_secret",
        credentialReferenceKey: "vault:gateway-projection-publisher",
        callerPolicy: "aicodex-admin",
        boundedRuntimePolicy: {timeoutMs: 2500, maxRetries: 2},
        remediationRoute: "/platform-api-mappings",
        nextAction: "核对 Gateway projection 发布凭据引用",
      },
      {
        key: "keep_in_env",
        label: "Keep in env/config",
        enabled: true,
        owner: "deployment_env_config",
        sourceClass: "env_config",
        credentialReferenceStatus: "external_secret",
        keepInEnv: true,
        keepInEnvKeys: ["dataSourceName", "redisEndpoint"],
        remediationRoute: "env/config",
        nextAction: "在部署配置或外部 secret system 中维护",
      },
    ],
  },
};

const serviceCredentialGovernanceDiagnosticResponse = {
  status: "ok",
  data: {
    generatedAt: "2026-06-22T01:02:03Z",
    source: "admin_service_credential_governance_diagnostic",
    groups: [
      {
        key: "usage_identity_resolver",
        label: "Usage identity resolver",
        status: "cannot_infer",
        stableAlias: "admin_service_credential_reference_unresolved",
        owner: "admin_outbound_resolver",
        sourceClass: "external_secret_system",
        credentialReferenceStatus: "external_secret",
        callerPolicyPresent: true,
        keepInEnv: false,
        cannotInfer: true,
        nextAction: "Admin 只能确认外部引用别名，需在运行态验证外部 Secret 解析",
        blockedReasons: ["admin_service_credential_reference_unresolved"],
      },
      {
        key: "keep_in_env",
        label: "Keep in env/config",
        status: "keep_in_env",
        stableAlias: "admin_service_credential_keep_in_env",
        owner: "deployment_env_config",
        sourceClass: "env_config",
        credentialReferenceStatus: "external_secret",
        callerPolicyPresent: false,
        keepInEnv: true,
        cannotInfer: true,
        nextAction: "运行时 secret 保留在 env/config，Admin 仅能确认归属边界",
      },
    ],
  },
};

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

describe("ApplicationAccessCenter", () => {
  let consoleErrorSpy: {mockRestore: () => void};

  beforeEach(async() => {
    await useTestLanguage("zh");
    Object.defineProperty(global, "fetch", {
      value: jest.fn(() => new Promise(() => {})),
      writable: true,
    });
    const spy = jest.spyOn(console, "error").mockImplementation((message?: unknown, ...args: unknown[]) => {
      if (`${message}`.includes("ReactDOM.render is no longer supported")) {
        return;
      }

      consoleErrorSpy.mockRestore();
      throw new Error([message, ...args].map(item => `${item}`).join(" "));
    });
    consoleErrorSpy = spy;
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    jest.clearAllMocks();
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
        title: "本页未发现接入缺口",
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
      providerStatus: "认证源待绑定",
    });
    expect(summary.riskItems.map(item => item.key)).toEqual(expect.arrayContaining([
      "missing-redirect-uris",
      "missing-scopes",
      "missing-providers",
      "missing-client-id",
    ]));
  });

  test("summarizes provider identity source target organization readiness", () => {
    const summary = buildApplicationAccessCenterSummary([
      {
        owner: "admin",
        name: "app-explicit-provider-org",
        clientId: "explicit-client",
        redirectUris: ["https://explicit.example.com/callback"],
        scopes: ["openid"],
        providers: [{name: "lark-main", category: "OAuth", targetOrganization: "feishu-test"}],
        grantTypes: ["authorization_code"],
      },
      {
        owner: "admin",
        organization: "wecom-org",
        name: "app-fallback-provider-org",
        clientId: "fallback-client",
        redirectUris: ["https://fallback.example.com/callback"],
        scopes: ["openid"],
        providers: [{name: "wecom-main", category: "OAuth"}],
        grantTypes: ["authorization_code"],
      },
      {
        owner: "admin",
        name: "app-missing-provider-org",
        clientId: "missing-client",
        redirectUris: ["https://missing.example.com/callback"],
        scopes: ["openid"],
        providers: [{name: "lark-missing", category: "OAuth"}],
        grantTypes: ["authorization_code"],
      },
    ]);

    expect(summary.cards.map(card => card.identitySourceStatus)).toEqual([
      "身份源组织已显式绑定",
      "身份源使用应用默认组织",
      "身份源目标组织待补全",
    ]);
    expect(summary.cards.map(card => card.status)).toEqual(["接入完整", "接入完整", "待补全"]);
    expect(summary.riskItems).toEqual(expect.arrayContaining([
      expect.objectContaining({key: "missing-identity-source-organization", count: 1}),
    ]));
  });

  test("renders list-first summary, risk summary, and existing configuration links", () => {
    const view = render(
      <MemoryRouter>
        <ApplicationAccessCenter applications={applications} loading={false} />
      </MemoryRouter>
    );
    const {container} = view;

    expect(view.getByText("应用接入中心")).not.toBeNull();
    expect(container.querySelector(".application-access-readiness-rail")).not.toBeNull();
    expect(container.querySelector(".application-access-readiness-rail-compact")).not.toBeNull();
    expect(container.querySelector(".enterprise-identity-status-card")).toBeNull();
    expect(container.querySelector(".application-access-center .enterprise-identity-action-grid")).toBeNull();
    expect(view.getByText("应用")).not.toBeNull();
    expect(view.getByText("优先处理")).not.toBeNull();
    expect(view.queryByText("当前列表视图")).toBeNull();
    expect(view.queryByText("只读推导")).toBeNull();
    expect(view.queryByText("只读核对")).toBeNull();
    expect(view.queryByText("AICodex Portal")).toBeNull();
    expect(view.getAllByText("接入完整").length).toBeGreaterThan(0);
    expect(view.getByText("缺少回调地址")).not.toBeNull();
    expect(view.getByText("缺少认证源绑定")).not.toBeNull();
    expect(view.getByText("身份源已绑定")).not.toBeNull();
    expect(view.queryByText("配置入口")).toBeNull();
    expect(view.getAllByText("API 网关映射").some((item: HTMLElement) => item.closest("a")?.getAttribute("href") === "/platform-api-mappings")).toBe(true);
    expect(view.getByText("认证源").closest("a")?.getAttribute("href")).toBe("/providers");
    expect(view.queryByText("OAuth/OIDC Provider")).toBeNull();
    expect(view.getAllByText("查看审计记录").some((item: HTMLElement) => item.closest("a")?.getAttribute("href") === "/records")).toBe(true);
    expect(view.queryByText("portal-secret-value")).toBeNull();
  });

  test("renders low-risk fallback copy for complete unnamed visible data", () => {
    const view = render(
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

    expect(view.queryByText("未配置技术名称")).toBeNull();
    expect(view.getByText("本页未发现接入缺口")).not.toBeNull();
    expect(view.getByText("低风险")).not.toBeNull();
  });

  test("keeps empty and loading states actionable", () => {
    const emptyView = render(
      <MemoryRouter>
        <ApplicationAccessCenter applications={[]} loading={false} />
      </MemoryRouter>
    );
    const {unmount} = emptyView;

    expect(emptyView.getByText("暂无应用接入，先新增应用或进入 API 映射核对接入契约。")).not.toBeNull();
    expect(emptyView.getByText("新增应用").closest("a")?.getAttribute("href")).toBe("/applications");
    expect(emptyView.getAllByText("API 网关映射").some((item: HTMLElement) => item.closest("a")?.getAttribute("href") === "/platform-api-mappings")).toBe(true);

    unmount();

    const loadingView = render(
      <MemoryRouter>
        <ApplicationAccessCenter loading />
      </MemoryRouter>
    );

    expect(loadingView.getByText("加载应用接入状态...")).not.toBeNull();
  });

  test("keeps service credential governance out of the application access center", () => {
    const view = render(
      <MemoryRouter>
        <ApplicationAccessCenter applications={applications} loading={false} />
      </MemoryRouter>
    );

    expect(view.queryByText("服务凭据治理")).toBeNull();
    expect(view.queryByText("详细治理已迁移到用量接入")).toBeNull();
    expect(view.queryByText("进入用量接入")).toBeNull();
    expect(global.fetch).not.toHaveBeenCalledWith(
      "/api/application-access/service-credential-governance-status",
      expect.anything()
    );
    expect(view.getByText("新增应用").closest("a")?.getAttribute("href")).toBe("/applications");
    expect(view.getAllByText("API 网关映射").some((item: HTMLElement) => item.closest("a")?.getAttribute("href") === "/platform-api-mappings")).toBe(true);
  });

  test("builds copy-safe service credential governance handoff package with fail-closed readiness", () => {
    const handoffPackage = buildServiceCredentialGovernanceHandoffPackage({
      config: serviceCredentialGovernanceConfigResponse.data as ServiceCredentialGovernanceConfigResponse,
      status: serviceCredentialGovernanceResponse.data as ServiceCredentialGovernanceStatusResponse,
      diagnostic: serviceCredentialGovernanceDiagnosticResponse.data as ServiceCredentialGovernanceDiagnosticResponse,
    });

    expect(handoffPackage).toMatchObject({
      schema: "aicodex.admin.serviceCredentialGovernanceHandoff",
      version: "2026-06-22",
      source: "admin_service_credential_governance_handoff_package",
      targetConsumerAlias: "insight_business_service_access",
      adminOwnerAlias: "admin_identity_application_access",
    });
    expect(handoffPackage.groups.find(group => group.key === "usage_identity_resolver")).toMatchObject({
      readiness: "cannot_infer",
      credentialReferenceStatus: "external_secret",
      credentialReferenceKeySummary: "vault:usage-identity-resolver",
      callerPolicyPresent: true,
      callerPolicyAlias: "aicodex-admin",
      cannotInferRuntimeTruth: true,
      stableAliases: expect.arrayContaining(["admin_service_credential_reference_unresolved"]),
      blockedAliases: expect.arrayContaining(["admin_service_credential_reference_unresolved"]),
    });
    expect(handoffPackage.groups.find(group => group.key === "gateway_organization_projection")).toMatchObject({
      readiness: "cannot_infer",
      credentialReferenceKeySummary: "vault:gateway-projection-publisher",
      cannotInferRuntimeTruth: true,
      blockedAliases: expect.arrayContaining(["admin_service_credential_external_reference_unresolved"]),
    });
    expect(handoffPackage.groups.find(group => group.key === "keep_in_env")).toMatchObject({
      readiness: "keep_in_env",
      keepInEnv: true,
      cannotInferRuntimeTruth: true,
      blockedAliases: expect.arrayContaining(["admin_service_credential_keep_in_env"]),
    });

    const serializedPackage = JSON.stringify(handoffPackage);
    expect(serializedPackage).not.toContain("resolver-secret-value");
    expect(serializedPackage).not.toContain("resolver-token-value");
    expect(serializedPackage).not.toContain("projection-secret-value");
    expect(serializedPackage).not.toContain("resolver.internal.example.invalid");
    expect(serializedPackage).not.toContain("gateway.internal.example.invalid");
    expect(serializedPackage).not.toContain("raw-id-123");
    expect(serializedPackage).not.toContain("clientSecret");
    expect(serializedPackage).not.toContain("Authorization");
    expect(serializedPackage).not.toContain("Cookie");
    expect(serializedPackage).not.toContain("rawPayload");
  });

});
