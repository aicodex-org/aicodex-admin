/* eslint-env jest */
import {expect} from "@jest/globals";
import i18next from "i18next";
import {
  buildAggregatedIdentityAssetDetail,
  buildApplicationIdentityAssetDetail,
  buildProviderIdentityAssetDetail,
  getSourceScopeDisplay,
  isGlobalFactScope,
  redactSensitiveText
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
  await i18next.changeLanguage(language);
}

describe("identityAssetRelationship", () => {
  beforeEach(async() => {
    await useTestLanguage("zh");
  });

  test("labels current view and current filter scopes without global wording", () => {
    const currentView = getSourceScopeDisplay({
      kind: "current_view",
      pagePath: "/applications",
      loadedRows: 2,
      totalRows: 18,
    });
    const currentFilter = getSourceScopeDisplay({
      kind: "current_filter",
      pagePath: "/providers",
      filterSummary: "type=OIDC",
      loadedRows: 1,
    });

    expect(currentView.label).toBe("当前视图");
    expect(currentView.description).toContain("已加载 2 行");
    expect(currentView.description).toContain("total 18");
    expect(currentView.description).not.toMatch(/全局|全部|跨组织/);
    expect(currentFilter.label).toBe("当前筛选");
    expect(currentFilter.description).toContain("type=OIDC");
    expect(isGlobalFactScope(currentView)).toBe(false);
    expect(isGlobalFactScope(currentFilter)).toBe(false);
  });

  test("labels object, read-only review, and backend aggregation scopes explicitly", () => {
    const currentObject = getSourceScopeDisplay({
      kind: "current_object",
      pagePath: "/applications",
      objectType: "Application",
      objectId: "built-in/portal",
    });
    const readOnlyReview = getSourceScopeDisplay({
      kind: "read_only_review",
      pagePath: "/providers",
    });
    const backendAggregation = getSourceScopeDisplay({
      kind: "global_aggregation",
      pagePath: "/records",
      sourceOfTruth: "audit-service",
      generatedAt: "2026-06-17T14:00:00Z",
    });

    expect(currentObject.label).toBe("当前对象上下文");
    expect(currentObject.description).toContain("built-in");
    expect(currentObject.description).toContain("portal");
    expect(readOnlyReview.label).toBe("只读核对");
    expect(readOnlyReview.description).toContain("providers");
    expect(backendAggregation.label).toBe("全局聚合事实");
    expect(backendAggregation.description).toContain("audit-service");
    expect(isGlobalFactScope(backendAggregation)).toBe(true);
  });

  test("redacts sensitive values and summarizes hidden fields", () => {
    const redacted = redactSensitiveText("clientSecret=secret-value token=abc123 https://private.example.com/callback");

    expect(redacted.text).toContain("[已脱敏]");
    expect(redacted.text).not.toContain("secret-value");
    expect(redacted.text).not.toContain("abc123");
    expect(redacted.text).not.toContain("private.example.com");
    expect(redacted.hiddenFields).toEqual(expect.arrayContaining(["clientSecret", "token", "privateUrl"]));
  });

  test("handles object-shaped scopes, empty providers, and disabled applications", () => {
    const detail = buildApplicationIdentityAssetDetail({
      owner: "admin",
      name: "minimal",
      disableSignin: true,
      scopes: [{name: "email"}, {scope: "profile"}, {value: "openid"}],
      providers: "",
    }, {
      pagePath: "/applications",
    });

    expect(detail.object.id).toBe("admin/minimal");
    expect(detail.object.organization).toBe("");
    expect(detail.object.status).toBe("已停用");
    expect(detail.relationships.find(item => item.type === "provider_binding")?.status).toBe("gap");
    expect(detail.relationships.find(item => item.type === "authorization_scope")?.value).toBe("email, profile, openid");
    expect(detail.source.kind).toBe("current_view");
  });

  test("normalizes single-value inputs and conservative fallback scopes", () => {
    const singleValueDetail = buildApplicationIdentityAssetDetail({
      displayName: "Fallback App",
      redirectUris: "https://private.example.com/callback",
      scopes: "openid",
      providers: {
        name: "nested-saml",
        provider: {category: "SAML"},
        targetOrganization: "operations",
      },
    }, {
      pagePath: "/applications",
      filterSummary: "displayName=Fallback",
      loadedRows: 1,
    });
    const gapDetail = buildApplicationIdentityAssetDetail({
      owner: "admin",
      name: "empty-app",
    }, {
      pagePath: "/applications",
    });
    const fallbackScope = getSourceScopeDisplay({kind: "legacy" as never, pagePath: "/legacy"});

    expect(singleValueDetail.object.id).toBe("admin/Fallback App");
    expect(singleValueDetail.source.kind).toBe("current_filter");
    expect(singleValueDetail.relationships.find(item => item.type === "provider_binding")?.status).toBe("ready");
    expect(singleValueDetail.relationships.find(item => item.type === "target_organization")?.value).toBe("operations");
    expect(singleValueDetail.relationships.find(item => item.type === "authorization_scope")?.value).toBe("openid");
    expect(JSON.stringify(singleValueDetail)).not.toContain("private.example.com");
    expect(gapDetail.relationships.find(item => item.type === "callback")?.status).toBe("gap");
    expect(gapDetail.relationships.find(item => item.type === "authorization_scope")?.value).toBe("未配置");
    expect(fallbackScope.label).toBe("当前视图");
  });

  test("builds application relationship details from current object context", () => {
    const detail = buildApplicationIdentityAssetDetail({
      owner: "admin",
      organization: "built-in",
      name: "portal",
      displayName: "AICodex Portal",
      clientId: "portal-client",
      clientSecret: "secret-value",
      redirectUris: ["https://private.example.com/callback"],
      scopes: ["openid", "profile"],
      providers: [
        {name: "enterprise-oidc", category: "OAuth", targetOrganization: "built-in"},
        {name: "sms-main", category: "SMS"},
      ],
    }, {
      pagePath: "/applications",
      loadedRows: 2,
      totalRows: 8,
    });

    expect(detail.object.type).toBe("Application");
    expect(detail.object.displayName).toBe("AICodex Portal");
    expect(detail.relationships.map(item => item.type)).toEqual(expect.arrayContaining(["provider_binding", "target_organization", "callback", "authorization_scope"]));
    expect(detail.evidenceEntries.map(item => item.to)).toEqual(expect.arrayContaining(["/records", "/tokens", "/verifications", "/platform-api-mappings"]));
    expect(detail.source.kind).toBe("current_view");
    expect(detail.cannotInfer.map(item => item.reason)).toEqual(expect.arrayContaining(["global_relationships_require_aggregation"]));
    expect(JSON.stringify(detail)).not.toContain("secret-value");
    expect(JSON.stringify(detail)).not.toContain("private.example.com");
  });

  test("adapts read-only aggregation responses without falling back to current-view facts", () => {
    const detail = buildAggregatedIdentityAssetDetail({
      object: {
        type: "Application",
        id: "built-in/portal",
        displayName: "AICodex Portal",
        owner: "admin",
        organization: "built-in",
        status: "healthy",
      },
      scope: {
        sourceOfTruth: "admin-readonly-relationship-aggregation",
        generatedAt: "2026-06-18T06:00:00Z",
      },
      relationships: [
        {
          key: "provider-binding",
          type: "provider_binding",
          label: "Provider 绑定",
          value: "enterprise-oidc",
          status: "ready",
          to: "/providers/admin/enterprise-oidc",
          description: "clientSecret=secret-value Provider binding is complete",
        },
      ],
      evidenceEntries: [
        {
          key: "audit-records",
          label: "审计证据",
          to: "/records?object=portal",
          description: "https://private.example.com/audit payload",
        },
      ],
      cannotInfer: [
        {
          reason: "audit_window_not_loaded",
          message: "部分审计窗口需要后端继续聚合",
          safeNextAction: {key: "records", label: "查看审计记录", to: "/records"},
        },
      ],
      redactionSummary: {
        hiddenFields: ["clientSecret"],
        note: "后端已脱敏",
      },
    });

    expect(detail.source.kind).toBe("global_aggregation");
    expect(detail.source.sourceOfTruth).toBe("admin-readonly-relationship-aggregation");
    expect(detail.source.generatedAt).toBe("2026-06-18T06:00:00Z");
    expect(isGlobalFactScope(detail.source)).toBe(true);
    expect(detail.relationships[0].source.kind).toBe("global_aggregation");
    expect(detail.evidenceEntries[0].source.kind).toBe("global_aggregation");
    expect(detail.cannotInfer[0].reason).toBe("audit_window_not_loaded");
    expect(JSON.stringify(detail)).not.toContain("secret-value");
    expect(JSON.stringify(detail)).not.toContain("private.example.com");
  });

  test("keeps aggregation permission and empty partial responses explicit", () => {
    const detail = buildAggregatedIdentityAssetDetail({
      object: {
        type: "Provider",
        id: "admin/oidc",
        displayName: "Enterprise OIDC",
      },
      scope: {},
      permission: {
        allowed: false,
        reason: "relationship_scope_denied",
      },
    });

    expect(detail.source.kind).toBe("global_aggregation");
    expect(detail.source.pagePath).toBe("/identity-assets");
    expect(detail.source.sourceOfTruth).toBe("admin-readonly-relationship-aggregation");
    expect(detail.relationships).toEqual([]);
    expect(detail.evidenceEntries).toEqual([]);
    expect(detail.cannotInfer).toEqual([]);
    expect(detail.safeNextActions).toEqual([]);
    expect(detail.permission?.allowed).toBe(false);
    expect(detail.redactionSummary.hiddenFields).toEqual([]);
    expect(detail.redactionSummary.note).toBe("未展示敏感原值");
  });

  test("builds provider detail with current view gaps instead of inferred global bindings", () => {
    const detail = buildProviderIdentityAssetDetail({
      owner: "admin",
      name: "enterprise-oidc",
      displayName: "Enterprise OIDC",
      category: "OAuth",
      type: "OIDC",
      clientId: "oidc-client",
      clientSecret: "secret-value",
      providerUrl: "https://private-idp.example.com/.well-known/openid-configuration",
    }, {
      pagePath: "/providers",
      filterSummary: "category=OAuth",
      loadedRows: 1,
      totalRows: 4,
    });

    expect(detail.object.type).toBe("Provider");
    expect(detail.relationships.map(item => item.type)).toEqual(expect.arrayContaining(["auth_source", "sync_diagnostics", "application_binding_lookup"]));
    expect(detail.relationships.find(item => item.type === "application_binding_lookup")?.status).toBe("cannot_infer");
    expect(detail.cannotInfer.map(item => item.reason)).toEqual(expect.arrayContaining(["application_bindings_require_application_view"]));
    expect(detail.source.kind).toBe("current_filter");
    expect(JSON.stringify(detail)).not.toContain("secret-value");
    expect(JSON.stringify(detail)).not.toContain("private-idp.example.com");
  });

  test("classifies provider diagnostics and configuration completeness without executing actions", () => {
    const larkProvider = buildProviderIdentityAssetDetail({
      owner: "admin",
      name: "lark-main",
      type: "Lark",
      clientId: "lark-client",
      providerUrl: "https://private-lark.example.com",
    }, {
      pagePath: "/providers",
    });
    const wecomProvider = buildProviderIdentityAssetDetail({
      owner: "admin",
      name: "wecom-main",
      type: "WeCom",
      clientId: "wecom-client",
    }, {
      pagePath: "/providers",
    });
    const genericProvider = buildProviderIdentityAssetDetail({
      owner: "admin",
      name: "custom-main",
    }, {
      pagePath: "/providers",
    });

    expect(larkProvider.relationships.find(item => item.type === "sync_diagnostics")?.to).toBe("/feishu-org-sync");
    expect(larkProvider.relationships.find(item => item.type === "configuration")?.status).toBe("ready");
    expect(wecomProvider.relationships.find(item => item.type === "sync_diagnostics")?.to).toBe("/wecom-org-sync");
    expect(wecomProvider.relationships.find(item => item.type === "configuration")?.value).toBe("1/2");
    expect(genericProvider.relationships.find(item => item.type === "sync_diagnostics")?.to).toBe("/records");
    expect(genericProvider.relationships.find(item => item.type === "configuration")?.status).toBe("gap");
    expect(JSON.stringify(larkProvider)).not.toContain("private-lark.example.com");
  });

  test("keeps non-sensitive text unchanged and reports no hidden fields", () => {
    const redacted = redactSensitiveText("displayName=Identity Console");

    expect(redacted.text).toBe("displayName=Identity Console");
    expect(redacted.hiddenFields).toEqual([]);
  });
});
