/* eslint-env jest */
import React from "react";
import {act, render} from "@testing-library/react";
import {message} from "antd";
import {MemoryRouter} from "react-router-dom";
import {expect, jest} from "@jest/globals";
import i18next from "i18next";
import ApplicationUsageAccessPage from "./ApplicationUsageAccessPage";
import {
  getServiceCredentialGovernanceCredentialPresenceLabel,
  getServiceCredentialGovernanceDiagnosticStatusLabel,
  getServiceCredentialGovernanceDiagnosticTone,
  getServiceCredentialGovernanceDisplay,
  getServiceCredentialGovernanceHandoffReadinessLabel,
  getServiceCredentialGovernanceHandoffTone,
  getServiceCredentialGovernanceNextAction,
  getServiceCredentialGovernanceOperatorStatus,
  getServiceCredentialGovernancePrimaryGap,
  getServiceCredentialGovernanceReferencePlaceholder,
  getServiceCredentialGovernanceReferenceSourceHint,
  getServiceCredentialGovernanceRequiredConfigSummary,
  getServiceCredentialGovernanceSourceClassLabel,
  getServiceCredentialGovernanceSummary,
  getServiceCredentialGovernanceTone,
  getServiceCredentialReferenceStatusLabel,
  serviceCredentialGovernanceNeedsCredentialReference
} from "./ApplicationAccessServiceCredentialGovernancePanel";
import en from "./locales/en/data.json";
import zh from "./locales/zh/data.json";

jest.setTimeout(15000);

type LooseMock = {
  (...args: unknown[]): Promise<unknown>;
  mock: {calls: unknown[][]};
  mockReset: () => void;
  mockRejectedValueOnce: (value: unknown) => LooseMock;
  mockResolvedValue: (value: unknown) => LooseMock;
  mockResolvedValueOnce: (value: unknown) => LooseMock;
};

const mockGetServiceCredentialGovernanceStatus = jest.fn() as unknown as LooseMock;
const mockGetServiceCredentialGovernanceConfig = jest.fn() as unknown as LooseMock;
const mockSaveServiceCredentialGovernanceConfig = jest.fn() as unknown as LooseMock;
const mockDiagnoseServiceCredentialGovernanceConfig = jest.fn() as unknown as LooseMock;
const mockBuildServiceCredentialGovernanceHandoffPackage = jest.fn();
const mockCreateInsightAdminAccessPackage = jest.fn() as unknown as LooseMock;
const mockGetOrganizations = jest.fn() as unknown as LooseMock;
const mockCopyToClipboard = jest.fn((..._args: unknown[]) => true);

const {fireEvent} = require("@testing-library/react") as {
  fireEvent: {
    change: (element: Element | null, event: unknown) => boolean;
    click: (element: Element | null) => boolean;
    mouseDown: (element: Element | null) => boolean;
  };
};

jest.mock("./backend/ApplicationAccessServiceCredentialGovernanceBackend", () => {
  return {
    getServiceCredentialGovernanceStatus: (...args: unknown[]) => mockGetServiceCredentialGovernanceStatus(...args),
    getServiceCredentialGovernanceConfig: (...args: unknown[]) => mockGetServiceCredentialGovernanceConfig(...args),
    saveServiceCredentialGovernanceConfig: (...args: unknown[]) => mockSaveServiceCredentialGovernanceConfig(...args),
    diagnoseServiceCredentialGovernanceConfig: (...args: unknown[]) => mockDiagnoseServiceCredentialGovernanceConfig(...args),
    buildServiceCredentialGovernanceHandoffPackage: (...args: unknown[]) => mockBuildServiceCredentialGovernanceHandoffPackage(...args),
    createInsightAdminAccessPackage: (...args: unknown[]) => mockCreateInsightAdminAccessPackage(...args),
  };
});

jest.mock("./backend/OrganizationBackend", () => ({
  getOrganizations: (...args: unknown[]) => mockGetOrganizations(...args),
}));

jest.mock("copy-to-clipboard", () => (...args: unknown[]) => mockCopyToClipboard(...args));

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

const governanceStatusResponse = {
  status: "ok",
  data: {
    generatedAt: "2026-06-23T08:00:00Z",
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
        remediationRoute: "/providers",
        nextAction: "核对 Insight provider trust 白名单",
      },
      {
        key: "usage_identity_resolver",
        label: "Usage identity resolver",
        owner: "admin_outbound_resolver",
        status: "configured",
        configuredKeys: ["insightUsageIdentityResolverEndpoint"],
        missingKeys: [],
        credentialReferenceStatus: "configured",
        callerPolicy: "aicodex-admin",
        boundedRuntimePolicy: {
          timeoutMs: 1500,
          unsafeTokenValue: "resolver-secret-value",
          unsafeEndpoint: "https://resolver.internal.example.invalid/api/usage",
        },
        remediationRoute: "/applications",
        nextAction: "核对 resolver 凭据引用",
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
        keepInEnvKeys: ["dataSourceName"],
        remediationRoute: "env/config",
      },
    ],
  },
};

const governanceConfigResponse = {
  status: "ok",
  data: {
    updatedAt: "2026-06-23T08:01:00Z",
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
        credentialReferenceKey: "insight_service_token",
        callerPolicy: "aicodex-admin",
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
          unsafeEndpoint: "https://resolver.internal.example.invalid/api/usage",
        },
        nextAction: "核对 resolver 凭据引用",
      },
      {
        key: "gateway_organization_projection",
        label: "Gateway organization projection",
        enabled: false,
        owner: "admin_gateway_projection_producer",
        sourceClass: "admin_config",
        credentialReferenceStatus: "not_applicable",
        callerPolicy: "aicodex-admin",
        nextAction: "启用后核对 Gateway projection 凭据引用",
      },
      {
        key: "keep_in_env",
        label: "Keep in env/config",
        enabled: true,
        owner: "deployment_env_config",
        sourceClass: "env_config",
        credentialReferenceStatus: "external_secret",
        keepInEnv: true,
        nextAction: "在部署配置或外部 secret system 中维护",
      },
    ],
  },
};

const governanceDiagnosticResponse = {
  status: "ok",
  data: {
    generatedAt: "2026-06-23T08:03:00Z",
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
        blockedReasons: ["admin_service_credential_reference_unresolved"],
        nextAction: "交由 Insight 消费方按引用解析",
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
        blockedReasons: ["admin_service_credential_keep_in_env"],
      },
    ],
  },
};

function renderPage(path = "/application-usage-access") {
  window.history.pushState({}, "", path);
  return render(
    <MemoryRouter>
      <ApplicationUsageAccessPage />
    </MemoryRouter>
  );
}

function clickButtonByText(view: ReturnType<typeof render>, label: string): void {
  const button = view.getAllByText(label)
    .map((node: HTMLElement) => node.closest("button"))
    .find((candidate: HTMLButtonElement | null): candidate is HTMLButtonElement => Boolean(candidate));
  if (!button) {
    throw new Error(`Missing button for ${label}`);
  }
  fireEvent.click(button);
}

async function settleMotionFrames(): Promise<void> {
  // rc-motion 的完整状态队列每次推进需要两个 animation frame；等待八帧覆盖 open/close 全阶段。
  for (let frame = 0; frame < 8; frame += 1) {
    await new Promise<void>(resolve => window.requestAnimationFrame(() => resolve()));
  }
}

async function clickAndSettleMotion(element: Element): Promise<void> {
  await act(async() => {
    fireEvent.click(element);
    await settleMotionFrames();
  });
}

async function selectBusinessOrganization(view: ReturnType<typeof render>): Promise<void> {
  const selector = await view.findByRole("combobox", {name: "授权目标组织"});
  fireEvent.mouseDown(selector);
  fireEvent.click(await view.findByText("Business Organization (business-org)"));
}

describe("ApplicationUsageAccessPage", () => {
  let consoleErrorSpy: {mockRestore: () => void};

  beforeEach(async() => {
    await useTestLanguage("zh");
    mockGetServiceCredentialGovernanceStatus.mockReset();
    mockGetServiceCredentialGovernanceConfig.mockReset();
    mockSaveServiceCredentialGovernanceConfig.mockReset();
    mockDiagnoseServiceCredentialGovernanceConfig.mockReset();
    mockCreateInsightAdminAccessPackage.mockReset();
    mockGetOrganizations.mockReset();
    mockBuildServiceCredentialGovernanceHandoffPackage.mockReset();
    mockCopyToClipboard.mockReset();
    mockCopyToClipboard.mockReturnValue(true);
    mockGetOrganizations.mockResolvedValue({
      status: "ok",
      data: [
        {owner: "admin", name: "built-in", displayName: "Built-in Organization"},
        {owner: "admin", name: "business-org", displayName: "Business Organization"},
      ],
    });
    mockBuildServiceCredentialGovernanceHandoffPackage.mockReturnValue({
      schema: "aicodex.admin.serviceCredentialGovernanceHandoff",
      version: "2026-06-22",
      source: "admin_service_credential_governance_handoff_package",
      generatedAt: "2026-06-23T08:04:00Z",
      targetConsumerAlias: "insight_business_service_access",
      adminOwnerAlias: "admin_identity_application_access",
      insightProfile: {
        packageType: "copy_safe_handoff",
        source: "admin_copy_safe_profile_draft",
        targetConsumerAlias: "insight_business_service_access",
        adminOwnerAlias: "admin_identity_application_access",
        providerComponentAlias: "admin_owner_provider",
        wrapperCapabilityReadiness: "ready",
        wrapperCapabilities: [],
        credentialReferenceStatus: "external_secret",
        resolverCredentialReference: {
          credentialReferenceStatus: "external_secret",
          credentialReferenceKeySummary: "vault:usage-identity-resolver-updated",
          bindingMode: "manual_or_secret_ref",
          nextAction: "交由 Insight 消费方按引用解析",
          stableAliases: ["admin_service_credential_reference_unresolved"],
          blockedAliases: ["admin_service_credential_reference_unresolved"],
          cannotInferRuntimeTruth: true,
          keepInEnv: false,
        },
        stableAliases: ["admin_service_credential_reference_unresolved"],
        blockedAliases: ["admin_service_credential_reference_unresolved"],
        nextAction: "交由 Insight 消费方按引用解析",
        cannotInferRuntimeTruth: true,
        keepInEnv: false,
      },
      groups: [
        {
          key: "usage_identity_resolver",
          label: "Usage identity resolver",
          readiness: "cannot_infer",
          ownerHint: "admin_outbound_resolver",
          sourceClass: "external_secret_system",
          credentialReferenceStatus: "external_secret",
          credentialReferenceKeySummary: "vault:usage-identity-resolver-updated",
          callerPolicyPresent: true,
          callerPolicyAlias: "aicodex-admin",
          keepInEnv: false,
          cannotInferRuntimeTruth: true,
          nextAction: "交由 Insight 消费方按引用解析",
          stableAliases: ["admin_service_credential_reference_unresolved"],
          blockedAliases: ["admin_service_credential_reference_unresolved"],
        },
      ],
    });
    mockCreateInsightAdminAccessPackage.mockResolvedValueOnce({
      status: "ok",
      data: {
        schemaVersion: "aicodex.insight.access-package.v1",
        target: "insight.connection-profile.import",
        legacySchema: "aicodex.admin.insightAdminAccessPackage",
        legacyVersion: "2026-07-09",
        packageType: "insight_admin_access_package",
        source: "admin_owner_secure_handoff",
        generatedAt: "2026-06-23T08:04:00Z",
        targetConsumerAlias: "insight_business_service_access",
        adminOwnerAlias: "admin_identity_application_access",
        copySafeHandoff: {
          schema: "aicodex.admin.serviceCredentialGovernanceHandoff",
          version: "2026-06-22",
          source: "admin_service_credential_governance_handoff_package",
        },
        copySafeMetadata: {
          schema: "aicodex.admin.serviceCredentialGovernanceHandoff",
          version: "2026-06-22",
          source: "admin_service_credential_governance_handoff_package",
        },
        secureHandoffGrant: {
          schema: "aicodex.admin.secure_handoff_grant",
          version: "2026-07-09",
          grantId: "adm-grant-test",
          nonce: "adm-nonce-test",
          issuer: "aicodex-admin",
          environmentId: "admin-runtime",
          providerType: "admin_owner_provider",
          targetRegistrationId: "insight-profile-import-v1",
          targetWorkspaceId: "insight_business_service_access",
          targetOrganizationAlias: "business-org",
          expiresAt: "2026-06-23T08:14:00Z",
          traceMarker: "adm-trace-test",
          credentialSuffix: "test",
          ownerRegistryReadiness: "ready",
          ownerRegistry: {
            trustedEndpointAlias: "admin-secure-handoff",
            audience: "insight_profile_admin_handoff",
            serviceIdentity: "svc:aicodex-admin",
            endpointReadiness: "ready",
            targetRegistrationStatus: "approved",
          },
          packageHash: "sha256:test",
          audience: "insight_profile_admin_handoff",
          status: "issued",
          state: "issued",
        },
        fallbackBindingMode: "manual_or_secret_ref",
        nextAction: "导入 Insight Profile 后由 Insight 后端兑换安全交接授权并完成凭据绑定",
      },
    });
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation((message?: unknown, ...args: unknown[]) => {
      const serializedMessage = [message, ...args].map(item => `${item}`).join(" ");
      consoleErrorSpy.mockRestore();
      throw new Error(serializedMessage);
    });
  });

  afterEach(async() => {
    await act(async() => {
      message.destroy();
      await settleMotionFrames();
    });
    consoleErrorSpy.mockRestore();
    jest.clearAllMocks();
  });

  test("maps service credential machine states to operator-facing summaries", () => {
    expect(getServiceCredentialGovernanceTone("configured")).toBe("success");
    expect(getServiceCredentialGovernanceTone("blocked")).toBe("error");
    expect(getServiceCredentialGovernanceTone("partial")).toBe("warning");
    expect(getServiceCredentialGovernanceTone("not_applicable")).toBe("default");
    expect(getServiceCredentialGovernanceSummary(null).label).toBe("待加载");
    expect(getServiceCredentialGovernanceSummary({generatedAt: "", source: "admin_runtime_config", groups: [{key: "blocked", label: "Blocked", owner: "admin", status: "blocked", credentialReferenceStatus: "missing"}]}).label).toBe("不可用");
    expect(getServiceCredentialGovernanceSummary({generatedAt: "", source: "admin_runtime_config", groups: [{key: "partial", label: "Partial", owner: "admin", status: "partial", credentialReferenceStatus: "configured"}]}).label).toBe("需补材料");
    expect(getServiceCredentialGovernanceSummary({generatedAt: "", source: "admin_runtime_config", groups: [{key: "ok", label: "OK", owner: "admin", status: "configured", credentialReferenceStatus: "configured"}]}).label).toBe("可用");
    expect(getServiceCredentialGovernanceSourceClassLabel("external_secret_system")).toBe("外部凭据");
    expect(getServiceCredentialGovernanceSourceClassLabel("env_config")).toBe("环境配置");
    expect(getServiceCredentialGovernanceSourceClassLabel("admin_config")).toBe("Admin 管理");
    expect(getServiceCredentialReferenceStatusLabel("configured")).toBe("凭据已配置");
    expect(getServiceCredentialReferenceStatusLabel("external_secret")).toBe("外部凭据");
    expect(getServiceCredentialReferenceStatusLabel("missing")).toBe("缺少凭据");
    expect(getServiceCredentialReferenceStatusLabel("not_applicable")).toBe("无需引用");
  });

  test("maps diagnostic, readiness, gaps, and required config without raw aliases", () => {
    expect(getServiceCredentialGovernanceDiagnosticTone("ready")).toBe("success");
    expect(getServiceCredentialGovernanceDiagnosticTone("cannot_infer")).toBe("warning");
    expect(getServiceCredentialGovernanceDiagnosticTone("missing_reference")).toBe("error");
    expect(getServiceCredentialGovernanceDiagnosticStatusLabel("ready")).toBe("预检通过");
    expect(getServiceCredentialGovernanceDiagnosticStatusLabel("disabled")).toBe("未启用");
    expect(getServiceCredentialGovernanceDiagnosticStatusLabel("missing_reference")).toBe("缺少凭据");
    expect(getServiceCredentialGovernanceDiagnosticStatusLabel("keep_in_env")).toBe("由环境维护");
    expect(getServiceCredentialGovernanceDiagnosticStatusLabel("cannot_infer")).toBe("需下游确认");
    expect(getServiceCredentialGovernanceDiagnosticStatusLabel("blocked")).toBe("策略未放行");
    expect(getServiceCredentialGovernanceHandoffTone("ready")).toBe("success");
    expect(getServiceCredentialGovernanceHandoffTone("keep_in_env")).toBe("warning");
    expect(getServiceCredentialGovernanceHandoffTone("blocked")).toBe("error");
    expect(getServiceCredentialGovernanceHandoffReadinessLabel("ready")).toBe("可交付");
    expect(getServiceCredentialGovernanceHandoffReadinessLabel("keep_in_env")).toBe("由环境维护");
    expect(getServiceCredentialGovernanceHandoffReadinessLabel("cannot_infer")).toBe("需下游确认");
    expect(getServiceCredentialGovernanceHandoffReadinessLabel("blocked")).toBe("材料不全");
    expect(getServiceCredentialGovernanceOperatorStatus("missing").label).toBe("材料不全");
    expect(getServiceCredentialGovernanceOperatorStatus(undefined).description).toBe("请刷新状态");
    expect(getServiceCredentialGovernancePrimaryGap({key: "resolver", label: "Resolver", owner: "admin", status: "partial", credentialReferenceStatus: "missing"})).toBe("缺少凭据");
    expect(getServiceCredentialGovernancePrimaryGap({key: "resolver", label: "Resolver", owner: "admin", status: "partial", credentialReferenceStatus: "configured", missingKeys: ["callerPolicy"]})).toBe("缺少调用策略");
    expect(getServiceCredentialGovernancePrimaryGap({key: "resolver", label: "Resolver", owner: "admin", status: "partial", credentialReferenceStatus: "configured", missingKeys: ["boundedRuntimePolicy"]})).toBe("缺少运行策略");
    expect(getServiceCredentialGovernancePrimaryGap({key: "resolver", label: "Resolver", owner: "admin", status: "blocked", credentialReferenceStatus: "configured"})).toBe("策略未放行");
    expect(getServiceCredentialGovernanceNextAction([{statusGroup: {key: "resolver", label: "Resolver", owner: "admin", status: "missing", credentialReferenceStatus: "missing"}, configGroup: {key: "resolver", enabled: true, credentialReferenceStatus: "missing", nextAction: "补充 resolver 凭据引用"}}])).toBe("导入 Insight Profile 后，由 Insight 后端兑换安全交接授权并完成凭据绑定");
    expect(getServiceCredentialGovernanceNextAction([])).toBe("等待配置加载");
    expect(getServiceCredentialGovernanceRequiredConfigSummary([{key: "resolver", enabled: true, credentialReferenceStatus: "missing"}, {key: "env", enabled: true, keepInEnv: true, credentialReferenceStatus: "external_secret"}])).toBe("1 项缺少凭据引用");
    expect(getServiceCredentialGovernanceRequiredConfigSummary([{key: "resolver", enabled: true, credentialReferenceStatus: "configured"}])).toBe("1 项可维护配置");
    expect(getServiceCredentialGovernanceRequiredConfigSummary([{key: "env", enabled: true, keepInEnv: true, credentialReferenceStatus: "external_secret"}])).toBe("暂无可维护配置");
    expect(getServiceCredentialGovernanceCredentialPresenceLabel({key: "resolver", enabled: true, credentialReferenceStatus: "configured", credentialReferenceKey: "vault:resolver"})).toBe("已填写引用");
    expect(getServiceCredentialGovernanceCredentialPresenceLabel({key: "resolver", enabled: true, credentialReferenceStatus: "configured"})).toBe("待填写引用");
    expect(getServiceCredentialGovernanceCredentialPresenceLabel({key: "env", enabled: true, keepInEnv: true, credentialReferenceStatus: "external_secret"})).toBe("无需填写");
    expect(getServiceCredentialGovernanceDisplay("insight_provider_trust").title).toBe("Insight 调用信任");
    expect(getServiceCredentialGovernanceDisplay("usage_identity_resolver").title).toBe("用量身份解析");
    expect(getServiceCredentialGovernanceDisplay("gateway_organization_projection").title).toBe("Gateway 组织投影");
    expect(getServiceCredentialGovernanceDisplay("keep_in_env").title).toBe("环境维护项");
    expect(getServiceCredentialGovernanceReferenceSourceHint("usage_identity_resolver")).toBe("导入 Insight Profile 后，由 Insight 后端兑换安全交接授权并完成凭据绑定。");
    expect(getServiceCredentialGovernanceReferenceSourceHint("gateway_organization_projection")).toBe("导入 Insight Profile 后，由 Insight 后端兑换安全交接授权并完成凭据绑定。");
    expect(getServiceCredentialGovernanceReferencePlaceholder("gateway_organization_projection")).toBe("gatewayOrganizationProjectionToken");
    expect(serviceCredentialGovernanceNeedsCredentialReference({key: "gateway", enabled: false, credentialReferenceStatus: "not_applicable"}, {key: "gateway", label: "Gateway", owner: "admin", status: "partial", credentialReferenceStatus: "not_applicable", missingKeys: ["gatewayOrganizationProjectionToken"]})).toBe(true);
  });

  test("renders the Insight Admin Provider handoff page as the focused usage access content", async() => {
    mockGetServiceCredentialGovernanceStatus.mockResolvedValueOnce(governanceStatusResponse);
    mockGetServiceCredentialGovernanceConfig.mockResolvedValueOnce(governanceConfigResponse);

    const view = renderPage();

    expect(await view.findByText("Insight 接入包")).not.toBeNull();
    expect(view.getByText("应用接入 / 用量接入")).not.toBeNull();
    expect(view.queryByText("只维护 Admin 身份、组织、resolver、projection/trust 和服务凭据引用；API/Gateway 用量包不在这里生成。")).toBeNull();
    expect(view.queryByText("生成给 Insight 使用的 Admin 接入交接包；只维护身份、组织、resolver、projection/trust 和服务凭据引用。")).toBeNull();
    expect(view.queryByText("核对 Gateway 映射")).toBeNull();
    expect(view.getAllByText("接入状态").length).toBeGreaterThan(0);
    expect(view.queryByText("面向 Insight 的 Admin Provider 元数据交接页。")).toBeNull();
    expect(view.queryByText("Admin 交接包只包含元数据，不传递真实凭据。")).toBeNull();
    expect(view.container.textContent).not.toContain("P0");
    expect(view.container.textContent).not.toContain("Admin secure handoff 不在 P0");
    expect(view.container.textContent).not.toContain("copy-safe metadata");
    expect(view.getByLabelText("Admin 交接摘要")).not.toBeNull();
    expect(view.getByText("接入包状态")).not.toBeNull();
    expect(view.getByText("Provider 运行能力")).not.toBeNull();
    expect(view.queryByText("目标消费方")).toBeNull();
    expect(view.queryByText("包类型")).toBeNull();
    expect(view.queryByText("交接能力")).toBeNull();
    expect(view.getByText("交接包操作")).not.toBeNull();
    expect(view.queryByText("/api/admin-provider/insight/v1/current-user")).toBeNull();
    expect(view.queryByText("/current-user/scope")).toBeNull();
    expect(view.queryByText("/current-user/organization-tree")).toBeNull();
    expect(view.queryByText("当前状态")).toBeNull();
    expect(view.queryByText("补齐 Admin env/config，重启后刷新本页")).toBeNull();
    expect(view.getAllByText("接入包暂不可复制").length).toBeGreaterThan(0);
    expect(view.getByText("交接包不含真实凭据")).not.toBeNull();
    expect(view.queryByLabelText("关键阻断")).toBeNull();
    expect(view.queryByText("交接包可生成；导入 Insight Profile 后通过 manual/secretRef binding 绑定 resolver 凭据。交接包只包含元数据，不传递真实凭据。")).toBeNull();
    expect(view.queryByText("可生成元数据交接包，导入 Insight 后通过 manual/secretRef binding 绑定凭据。")).toBeNull();
    expect(view.queryByText("Admin 只交付 copy-safe metadata；Insight P0 使用 manual/secretRef binding，Admin secure handoff 不在 P0。")).toBeNull();
    expect(view.queryByText("在 Admin 部署配置或外部 secret system 维护凭据引用，完成后刷新本页再生成。")).toBeNull();
    expect(view.container.textContent).not.toContain("部署 Secret");
    expect(view.container.textContent).not.toContain("外部 secret system");
    expect(view.container.textContent).not.toContain(".env");
    expect(view.container.textContent).not.toContain("K8s Secret");
    expect(view.container.textContent).not.toContain("Vault");
    expect(view.container.textContent).not.toContain("KMS");
    expect(view.queryByText("查看交接项")).toBeNull();
    expect(view.queryByText("部分缺失")).toBeNull();
    expect(view.queryByText("刷新状态")).toBeNull();
    expect(view.queryByText("预检交接包")).toBeNull();
    expect(view.getByText("生成并复制 Insight Admin 接入包")).not.toBeNull();
    expect((view.getByText("生成并复制 Insight Admin 接入包").closest("button") as HTMLButtonElement).disabled).toBe(true);
    expect(view.getAllByText("请补齐交接包生成前置条件后重试").length).toBeGreaterThan(0);
    expect(view.queryByText("保存配置")).toBeNull();
    expect(view.queryByText("读取配置")).toBeNull();
    expect(view.queryByText("保存修正")).toBeNull();
    expect(view.queryByText("读取当前值")).toBeNull();
    expect(view.queryByText("高级修正")).toBeNull();
    expect(view.queryByText("Doctor")).toBeNull();
    expect(view.queryByText("恢复回读")).toBeNull();
    expect(view.queryByText("排障详情")).toBeNull();
    expect(view.queryByText("机器字段")).toBeNull();
    expect(view.queryByText("交接包材料")).toBeNull();
    expect(view.container.textContent).not.toContain("服务凭据治理状态");
    expect(view.container.textContent).not.toContain("服务凭据治理配置");
    expect(view.queryByText("身份接口")).toBeNull();
    expect(view.queryByText("Scope 接口")).toBeNull();
    expect(view.queryByText("组织树接口")).toBeNull();
    expect(view.queryByText("用量身份解析")).toBeNull();
    expect(view.queryByText("Gateway 组织投影")).toBeNull();
    expect(view.queryByLabelText("usage_identity_resolver capability status")).toBeNull();
    expect(view.queryByLabelText("gateway_organization_projection capability status")).toBeNull();
    expect(view.queryByText("环境维护项")).toBeNull();
    expect(view.queryByText("admin_outbound_resolver")).toBeNull();
    expect(view.queryByText("确认 Insight 调 Admin 接入接口时，调用来源在 Admin 信任范围内。")).toBeNull();
    expect(view.queryByLabelText("insight_provider_trust 凭据引用")).toBeNull();
    expect(view.queryByLabelText("usage_identity_resolver 凭据引用")).toBeNull();
    expect(view.queryByText("查看环境维护说明")).toBeNull();
    expect(view.queryByText("查看交接材料")).toBeNull();
    expect(view.getByText("能力详情")).not.toBeNull();
    expect(view.getByText(/\d+ 项扩展能力待配置 · \d+ 项运行能力可用/)).not.toBeNull();
    expect(view.getByText("查看能力详情")).not.toBeNull();
    const diagnosticsButton = view.getByLabelText("查看能力详情") as HTMLButtonElement;
    expect(diagnosticsButton.getAttribute("aria-expanded")).toBe("false");
    expect(view.queryByText("补凭据引用")).toBeNull();
    expect(view.queryByText("这里不保存密钥，也不配置 API/Gateway 用量 provider。请在 Admin 的 env/config 里补配置，补完重启后刷新。")).toBeNull();
    expect(view.queryByText("只补缺少的 Vault/Secret 引用名")).toBeNull();
    expect(view.queryByText("到 Vault/Secret 系统找到这项的引用名，填到下面；保存后再生成交接包。")).toBeNull();
    expect(view.queryByText("引用名")).toBeNull();
    expect(view.queryByText("允许调用方")).toBeNull();
    expect(view.queryByText("材料维护位置")).toBeNull();
    expect(view.queryByText("启用治理项")).toBeNull();
    expect(view.queryByLabelText("gateway_organization_projection 凭据引用")).toBeNull();
    expect(view.queryByPlaceholderText("gatewayOrganizationProjectionToken")).toBeNull();
    expect(view.queryByText("gatewayOrganizationProjectionToken")).toBeNull();
    expect(view.queryByText("insightProviderAllowedIssuers")).toBeNull();
    fireEvent.click(view.getByText("查看能力详情"));
    expect(diagnosticsButton.getAttribute("aria-expanded")).toBe("true");
    expect(await view.findByText("待配置的扩展能力")).not.toBeNull();
    expect(view.getByText("可用能力")).not.toBeNull();
    expect(view.queryByText("技术详情")).toBeNull();
    expect(view.getByText("收起能力详情")).not.toBeNull();
    expect(window.location.search).not.toContain("diagnostics=1");
    expect(view.queryByText("交接能力")).toBeNull();
    expect(view.getByText(/身份接口 · 已就绪/)).not.toBeNull();
    expect(view.getByText(/Scope 接口 · 已就绪/)).not.toBeNull();
    expect(view.getByText(/组织树接口 · 已就绪/)).not.toBeNull();
    expect(view.getByLabelText("usage_identity_resolver available capability").textContent).toContain("已就绪");
    expect(view.getByLabelText("usage_identity_resolver available capability").className).toContain("application-access-service-credential-capability-chip");
    const gatewayCapability = view.getByLabelText("gateway_organization_projection runtime capability");
    expect(gatewayCapability.textContent).toContain("Gateway 组织投影");
    expect(gatewayCapability.textContent).toContain("缺凭据引用");
    expect(view.queryByText("跳到生成区")).toBeNull();
    fireEvent.click(view.getByText("收起能力详情"));
    expect(diagnosticsButton.getAttribute("aria-expanded")).toBe("false");
    expect(window.location.search).not.toContain("diagnostics=1");
    await clickAndSettleMotion(view.getByText("查看技术诊断"));
    expect(await view.findByText("/api/admin-provider/insight/v1/current-user")).not.toBeNull();
    expect(view.getByText("/api/admin-provider/insight/v1/current-user").getAttribute("translate")).toBe("no");
    expect(view.getByText("/current-user/scope")).not.toBeNull();
    expect(view.getByText("/current-user/organization-tree")).not.toBeNull();
    expect(view.getByLabelText("gateway_organization_projection owner evidence")).not.toBeNull();
    expect(view.getByLabelText("usage_identity_resolver owner evidence").textContent).toContain("admin_outbound_resolver");
    expect(view.queryByLabelText("keep_in_env owner evidence")).toBeNull();
    expect(view.queryByText("环境维护项")).toBeNull();
    expect(view.container.textContent).not.toContain("在部署配置或外部 secret system 中维护");
    expect(view.getByText("gatewayOrganizationProjectionToken")).not.toBeNull();
    expect(view.getByText("gatewayOrganizationProjectionToken").getAttribute("translate")).toBe("no");
    expect(view.getByText("insightProviderAllowedIssuers")).not.toBeNull();
    expect(view.queryByLabelText("gateway_organization_projection 调用策略")).toBeNull();
    expect(view.container.textContent).not.toContain("resolver-secret-value");
    expect(view.container.textContent).not.toContain("resolver-token-value");
    expect(view.container.textContent).not.toContain("resolver.internal.example.invalid");
    await clickAndSettleMotion(view.getByText("关闭技术诊断"));
    expect(view.container.textContent).not.toContain("gateway_projection_token_missing");
    expect(view.container.textContent).not.toContain("admin_service_credential_reference_unresolved");
  });

  test("previews Insight Admin Provider handoff after Admin deployment config is ready", async() => {
    mockGetServiceCredentialGovernanceStatus.mockResolvedValueOnce({
      ...governanceStatusResponse,
      data: {
        ...governanceStatusResponse.data,
        groups: governanceStatusResponse.data.groups.map(group => ({
          ...group,
          status: "configured",
          missingKeys: [],
          credentialReferenceStatus: group.credentialReferenceStatus === "missing" ? "configured" : group.credentialReferenceStatus,
          blockedReasons: [],
        })),
      },
    });
    mockGetServiceCredentialGovernanceConfig.mockResolvedValueOnce(governanceConfigResponse);

    const view = renderPage();
    await selectBusinessOrganization(view);
    expect(await view.findByText("材料已齐，点击生成并复制 Insight Admin 接入包。")).not.toBeNull();
    expect(view.getByText("交接包操作")).not.toBeNull();
    expect(view.queryByText("交接能力")).toBeNull();
    expect(view.getByText("能力详情")).not.toBeNull();
    expect(view.getByText("查看能力详情")).not.toBeNull();
    expect(view.getByText("接入状态")).not.toBeNull();
    expect((view.getAllByText("接入包可复制")).length).toBeGreaterThan(0);
    expect(view.getByText("Provider 运行能力全部可用")).not.toBeNull();
    expect(view.getByText("生成并复制 Insight Admin 接入包，再导入 Insight Profile")).not.toBeNull();
    expect(view.getByText("可生成并复制 Insight Admin 接入包")).not.toBeNull();
    expect(view.queryByLabelText("usage_identity_resolver capability status")).toBeNull();
    expect(view.queryByLabelText("gateway_organization_projection capability status")).toBeNull();
    expect(view.queryByText("admin_provider_trust")).toBeNull();
    fireEvent.click(view.getByText("查看能力详情"));
    expect(await view.findByText("待配置的扩展能力")).not.toBeNull();
    expect(view.getByText("可用能力")).not.toBeNull();
    expect(view.queryByText("技术详情")).toBeNull();
    expect(view.queryByText("交接能力")).toBeNull();
    expect(view.getByLabelText("usage_identity_resolver available capability").textContent).toContain("已就绪");
    expect(view.getByLabelText("gateway_organization_projection available capability").textContent).toContain("已就绪");
    await clickAndSettleMotion(view.getByText("查看技术诊断"));
    expect(await view.findByLabelText("insight_provider_trust owner evidence")).not.toBeNull();
    expect(view.getByLabelText("insight_provider_trust owner evidence").textContent).toContain("admin_provider_trust");
    expect(view.getByLabelText("usage_identity_resolver owner evidence").textContent).toContain("用量身份解析");
    expect(view.getByLabelText("gateway_organization_projection owner evidence").textContent).toContain("Gateway 组织投影");
    expect(view.queryByLabelText("keep_in_env owner evidence")).toBeNull();
    expect(view.queryByText("环境维护项")).toBeNull();
    expect(view.container.textContent).not.toContain("在部署配置或外部 secret system 中维护");
    expect(view.queryByText("待补配置")).toBeNull();
    expect(view.queryByText("下一步：材料已齐，可以生成 Admin 交接包")).toBeNull();
    expect(view.queryByText("保存修正")).toBeNull();
    expect(mockSaveServiceCredentialGovernanceConfig).not.toHaveBeenCalled();
    expect(view.container.textContent).not.toContain("admin_service_credential_reference_unresolved");
    expect(mockDiagnoseServiceCredentialGovernanceConfig).not.toHaveBeenCalled();
    const generateButton = view.getByText("生成并复制 Insight Admin 接入包").closest("button") as HTMLButtonElement;
    expect(generateButton.disabled).toBe(false);
    expect(generateButton.className).toContain("ant-btn-primary");

    clickButtonByText(view, "生成并复制 Insight Admin 接入包");
    expect((await view.findAllByText("Insight Admin 接入包已复制")).length).toBeGreaterThan(0);
    expect(mockCreateInsightAdminAccessPackage).toHaveBeenCalledTimes(1);
    expect(mockCreateInsightAdminAccessPackage).toHaveBeenCalledWith(expect.any(Object), "business-org");
    const handoffInput = mockBuildServiceCredentialGovernanceHandoffPackage.mock.calls[0]?.[0] as {config?: unknown; status?: unknown};
    expect(handoffInput).toHaveProperty("config");
    expect(handoffInput).toEqual(expect.objectContaining({
      config: expect.objectContaining({
        source: "admin_service_credential_governance_config",
        isConfigured: true,
        groups: expect.arrayContaining([
          expect.objectContaining({
            key: "usage_identity_resolver",
            credentialReferenceStatus: "external_secret",
            credentialReferenceKey: "vault:usage-identity-resolver",
            boundedRuntimePolicy: {timeoutMs: 1500},
          }),
          expect.objectContaining({
            key: "gateway_organization_projection",
            credentialReferenceStatus: "not_applicable",
          }),
        ]),
      }),
      status: expect.objectContaining({
        groups: expect.arrayContaining([
          expect.objectContaining({key: "usage_identity_resolver", status: "configured", credentialReferenceStatus: "configured"}),
          expect.objectContaining({key: "gateway_organization_projection", status: "configured", credentialReferenceStatus: "configured"}),
        ]),
      }),
    }));
    expect(view.queryByText("材料已齐，点击生成并复制 Insight Admin 接入包。")).toBeNull();
    const regenerateButton = view.getByText("重新生成并复制 Insight Admin 接入包").closest("button") as HTMLButtonElement;
    expect(regenerateButton).not.toBeNull();
    expect(regenerateButton.className).not.toContain("ant-btn-primary");
    expect(view.getByText("接入包不直接包含真实凭据；导入 Insight 后由后端完成兑换和绑定。")).not.toBeNull();
    expect(view.container.textContent).not.toContain("Admin secure handoff 不在 P0");
    clickButtonByText(view, "复制接入包 JSON");
    expect(mockCopyToClipboard).toHaveBeenCalledTimes(2);
    const copiedPackage = String(mockCopyToClipboard.mock.calls[mockCopyToClipboard.mock.calls.length - 1]?.[0] ?? "");
    expect(copiedPackage).toContain("aicodex.insight.access-package.v1");
    expect(copiedPackage).toContain("insight.connection-profile.import");
    expect(copiedPackage).toContain("secureHandoffGrant");
    expect(copiedPackage).toContain("\"nonce\": \"adm-nonce-test\"");
    expect(copiedPackage).toContain("copySafeHandoff");
    expect(copiedPackage).not.toContain("resolver-secret-value");
    expect(copiedPackage).not.toContain("resolver-token-value");
    expect(copiedPackage).not.toContain("resolver.internal.example.invalid");
    expect(view.queryByText("高级修正")).toBeNull();
    expect(view.queryByText("排障详情")).toBeNull();
    expect(view.queryByText("机器字段")).toBeNull();
    expect(view.container.textContent).not.toContain("insight_business_service_access");
    expect(view.container.textContent).not.toContain("admin_identity_application_access");
    expect(view.container.textContent).not.toContain("vault:gateway-organization-projection");
    expect(view.container.textContent).not.toContain("resolver-secret-value");
    expect(view.container.textContent).not.toContain("resolver-token-value");
    expect(view.container.textContent).not.toContain("resolver.internal.example.invalid");
    await clickAndSettleMotion(view.getByText("关闭技术诊断"));
  });

  test("requires an explicit target and locks the selector while generating a package", async() => {
    mockGetServiceCredentialGovernanceStatus.mockResolvedValueOnce({
      ...governanceStatusResponse,
      data: {
        ...governanceStatusResponse.data,
        groups: governanceStatusResponse.data.groups.map(group => ({
          ...group,
          status: "configured",
          missingKeys: [],
          credentialReferenceStatus: group.credentialReferenceStatus === "missing" ? "configured" : group.credentialReferenceStatus,
          blockedReasons: [],
        })),
      },
    });
    mockGetServiceCredentialGovernanceConfig.mockResolvedValueOnce(governanceConfigResponse);
    mockCreateInsightAdminAccessPackage.mockReset();
    mockCreateInsightAdminAccessPackage.mockResolvedValueOnce(new Promise(() => {}));

    const view = renderPage();
    const generateButton = view.getByText("生成并复制 Insight Admin 接入包").closest("button") as HTMLButtonElement;
    expect(generateButton.disabled).toBe(true);

    const selector = await view.findByRole("combobox", {name: "授权目标组织"});
    expect(selector.compareDocumentPosition(generateButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(view.getByText("该组织决定 Insight 可读取的 Admin 组织与用量范围。")).not.toBeNull();
    expect(view.getByText("请选择授权目标组织后再生成接入包")).not.toBeNull();

    await selectBusinessOrganization(view);
    await view.findAllByText("接入包可复制");
    expect(generateButton.disabled).toBe(false);

    clickButtonByText(view, "生成并复制 Insight Admin 接入包");
    expect(generateButton.disabled).toBe(true);
    expect((view.getByRole("combobox", {name: "授权目标组织"}) as HTMLInputElement).disabled).toBe(true);
  });

  test("shows the generated package target and clears the result when the target changes", async() => {
    mockGetOrganizations.mockReset();
    mockGetOrganizations.mockResolvedValueOnce({
      status: "ok",
      data: [
        {owner: "admin", name: "built-in", displayName: "Built-in Organization"},
        {owner: "admin", name: "business-org", displayName: "Business Organization"},
        {owner: "admin", name: "second-org", displayName: "A second business organization with a deliberately long display name"},
      ],
    });
    mockGetServiceCredentialGovernanceStatus.mockResolvedValueOnce({
      ...governanceStatusResponse,
      data: {
        ...governanceStatusResponse.data,
        groups: governanceStatusResponse.data.groups.map(group => ({
          ...group,
          status: "configured",
          missingKeys: [],
          credentialReferenceStatus: group.credentialReferenceStatus === "missing" ? "configured" : group.credentialReferenceStatus,
          blockedReasons: [],
        })),
      },
    });
    mockGetServiceCredentialGovernanceConfig.mockResolvedValueOnce(governanceConfigResponse);

    const view = renderPage();
    await selectBusinessOrganization(view);
    clickButtonByText(view, "生成并复制 Insight Admin 接入包");

    expect(await view.findByText("本接入包授权给：Business Organization")).not.toBeNull();
    expect(view.getByText("组织别名：business-org")).not.toBeNull();
    expect(view.getByText("本接入包授权给：Business Organization").getAttribute("title")).toBe("Business Organization (business-org)");

    const selector = view.getByRole("combobox", {name: "授权目标组织"});
    fireEvent.mouseDown(selector);
    fireEvent.click(await view.findByText("A second business organization with a deliberately long display name (second-org)"));

    expect(view.queryByText("Insight Admin 接入包已复制")).toBeNull();
    expect(view.queryByText("本接入包授权给：Business Organization")).toBeNull();
    expect(view.queryByText("组织别名：business-org")).toBeNull();
    expect(view.getByText("生成并复制 Insight Admin 接入包")).not.toBeNull();
  });

  test("blocks access-package generation when no eligible business organization exists", async() => {
    mockGetOrganizations.mockReset();
    mockGetOrganizations.mockResolvedValueOnce({
      status: "ok",
      data: [{owner: "admin", name: "built-in", displayName: "Built-in Organization"}],
    });
    mockGetServiceCredentialGovernanceStatus.mockResolvedValueOnce({
      ...governanceStatusResponse,
      data: {
        ...governanceStatusResponse.data,
        groups: governanceStatusResponse.data.groups.map(group => ({
          ...group,
          status: "configured",
          missingKeys: [],
          credentialReferenceStatus: group.credentialReferenceStatus === "missing" ? "configured" : group.credentialReferenceStatus,
          blockedReasons: [],
        })),
      },
    });
    mockGetServiceCredentialGovernanceConfig.mockResolvedValueOnce(governanceConfigResponse);

    const view = renderPage();
    expect(view.getByText("加载可用业务组织...")).not.toBeNull();
    const selector = await view.findByRole("combobox", {name: "授权目标组织"});
    const selectorRoot = selector.closest(".ant-select") as HTMLElement | null;
    expect(selectorRoot?.style.width).toBe("100%");
    expect(selectorRoot?.style.maxWidth).toBe("360px");
    expect(await view.findByText("暂无可用于接入包的业务组织")).not.toBeNull();
    expect((view.getByText("生成并复制 Insight Admin 接入包").closest("button") as HTMLButtonElement).disabled).toBe(true);
    expect(mockCreateInsightAdminAccessPackage).not.toHaveBeenCalled();
  });

  test("shows a retryable target organization error", async() => {
    mockGetOrganizations.mockReset();
    mockGetOrganizations.mockRejectedValueOnce(new Error("organization list unavailable"));
    mockGetServiceCredentialGovernanceStatus.mockResolvedValueOnce(governanceStatusResponse);
    mockGetServiceCredentialGovernanceConfig.mockResolvedValueOnce(governanceConfigResponse);

    const view = renderPage();
    expect(await view.findByText("业务组织加载失败，请刷新后重试")).not.toBeNull();
    expect(view.container.textContent).not.toContain("organization list unavailable");
    expect((view.getByText("生成并复制 Insight Admin 接入包").closest("button") as HTMLButtonElement).disabled).toBe(true);
  });

  test("separates a copy-ready package from two runtime capabilities that still need attention", async() => {
    mockGetServiceCredentialGovernanceStatus.mockResolvedValueOnce({
      status: "ok",
      data: {
        generatedAt: "2026-07-14T08:00:00Z",
        source: "admin_runtime_config",
        groups: [
          {key: "usage_identity_resolver", label: "Usage identity resolver", owner: "admin_outbound_resolver", status: "partial", configuredKeys: [], missingKeys: ["resolverReference"], credentialReferenceStatus: "missing"},
          {key: "gateway_organization_projection", label: "Gateway organization projection", owner: "admin_gateway_projection_producer", status: "blocked", configuredKeys: [], missingKeys: ["gatewayReference"], credentialReferenceStatus: "missing"},
        ],
      },
    });
    mockGetServiceCredentialGovernanceConfig.mockResolvedValueOnce({
      status: "ok",
      data: {
        updatedAt: "2026-07-14T08:00:00Z",
        source: "admin_service_credential_governance_config",
        isConfigured: true,
        groups: [
          {key: "usage_identity_resolver", label: "Usage identity resolver", enabled: true, sourceClass: "admin_config", credentialReferenceStatus: "missing"},
          {key: "gateway_organization_projection", label: "Gateway organization projection", enabled: true, sourceClass: "admin_config", credentialReferenceStatus: "missing"},
        ],
      },
    });

    const view = renderPage();

    await selectBusinessOrganization(view);
    expect((await view.findAllByText("接入包可复制")).length).toBeGreaterThan(0);
    expect(view.getByText("2 项扩展能力待配置")).not.toBeNull();
    expect(view.getAllByText("可继续导入；扩展能力配置不影响接入包导入与 Profile 启用").length).toBeGreaterThan(0);
    expect((view.getByText("生成并复制 Insight Admin 接入包").closest("button") as HTMLButtonElement).disabled).toBe(false);
    expect(view.queryByText("部分缺失")).toBeNull();
    expect(view.queryByText("阻断项")).toBeNull();
    expect(view.getByText("交接包不含真实凭据")).not.toBeNull();

    fireEvent.click(view.getByText("查看能力详情"));
    expect(await view.findByText("待配置的扩展能力")).not.toBeNull();
    expect(view.getByLabelText("待配置的扩展能力")).not.toBeNull();
    expect((await view.findByLabelText("usage_identity_resolver runtime capability")).textContent).toContain("用量身份映射");
    expect((await view.findByLabelText("gateway_organization_projection runtime capability")).textContent).toContain("Gateway 组织投影");
    expect(view.queryByText("admin_outbound_resolver")).toBeNull();
    expect(view.queryByText("/api/admin-provider/insight/v1/current-user")).toBeNull();

    await clickAndSettleMotion(view.getByText("查看技术诊断"));
    expect(await view.findByText("admin_outbound_resolver")).not.toBeNull();
    await clickAndSettleMotion(view.getByText("关闭技术诊断"));
  });

  test("keeps the package CTA fail-closed when package generation prerequisites are blocked", async() => {
    mockGetServiceCredentialGovernanceStatus.mockResolvedValueOnce({
      status: "ok",
      data: {
        generatedAt: "2026-07-14T08:00:00Z",
        source: "admin_runtime_config",
        groups: [
          {key: "insight_provider_trust", label: "Insight provider trust", status: "missing", configuredKeys: [], missingKeys: ["issuer"], credentialReferenceStatus: "configured"},
        ],
      },
    });
    mockGetServiceCredentialGovernanceConfig.mockResolvedValueOnce({
      status: "ok",
      data: {
        updatedAt: "2026-07-14T08:00:00Z",
        source: "admin_service_credential_governance_config",
        isConfigured: true,
        groups: [
          {key: "insight_provider_trust", label: "Insight provider trust", enabled: true, sourceClass: "admin_config", credentialReferenceStatus: "configured"},
        ],
      },
    });

    const view = renderPage();

    expect((await view.findAllByText("接入包暂不可复制")).length).toBeGreaterThan(0);
    expect((view.getByText("生成并复制 Insight Admin 接入包").closest("button") as HTMLButtonElement).disabled).toBe(true);
    expect((await view.findAllByText("请补齐交接包生成前置条件后重试")).length).toBeGreaterThan(0);
  });

  test("aligns status, config, and diagnostics by governance item key", async() => {
    mockGetServiceCredentialGovernanceStatus.mockResolvedValueOnce(governanceStatusResponse);
    mockGetServiceCredentialGovernanceConfig.mockResolvedValueOnce(governanceConfigResponse);
    mockDiagnoseServiceCredentialGovernanceConfig.mockResolvedValueOnce(governanceDiagnosticResponse);

    const view = renderPage();
    await view.findAllByText("接入包暂不可复制");

    expect(view.queryByLabelText("gateway_organization_projection capability status")).toBeNull();
    expect(view.queryByText("admin_gateway_projection_producer")).toBeNull();
    expect(view.queryByText("gatewayOrganizationProjectionToken")).toBeNull();
    expect(view.queryByLabelText("usage_identity_resolver 凭据引用")).toBeNull();
    fireEvent.click(view.getByText("查看能力详情"));
    expect(await view.findByText("待配置的扩展能力")).not.toBeNull();
    expect(view.getByText("可用能力")).not.toBeNull();
    expect(view.queryByText("技术详情")).toBeNull();
    const gatewayCapabilityBeforeDiagnostic = await view.findByLabelText("gateway_organization_projection runtime capability");
    expect(gatewayCapabilityBeforeDiagnostic.textContent).toContain("缺凭据引用");
    await clickAndSettleMotion(view.getByText("查看技术诊断"));
    const gatewayRowBeforeDiagnostic = await view.findByLabelText("gateway_organization_projection owner evidence");
    expect(gatewayRowBeforeDiagnostic.textContent).toContain("不可用");
    expect(gatewayRowBeforeDiagnostic.textContent).toContain("admin_gateway_projection_producer");
    expect(view.getByText("gatewayOrganizationProjectionToken")).not.toBeNull();

    expect(view.container.textContent).not.toContain("admin_service_credential_reference_unresolved");
    expect(view.queryByText("高级修正")).toBeNull();
    expect(view.container.textContent).not.toContain("admin_service_credential_reference_unresolved");
    expect(view.queryByText("排障详情")).toBeNull();
    expect(view.queryByText("机器字段")).toBeNull();
    await clickAndSettleMotion(view.getByText("关闭技术诊断"));
  });

  test("keeps Insight Admin Provider loading, empty, and error states actionable", async() => {
    mockGetServiceCredentialGovernanceStatus.mockResolvedValueOnce({
      status: "ok",
      data: {generatedAt: "2026-06-23T08:02:00Z", source: "admin_runtime_config", groups: []},
    });
    mockGetServiceCredentialGovernanceConfig.mockResolvedValueOnce({
      status: "ok",
      data: {updatedAt: "2026-06-23T08:02:00Z", source: "admin_service_credential_governance_config", isConfigured: false, groups: []},
    });
    const emptyView = renderPage();
    expect(await emptyView.findByText("暂无 Insight Admin Provider 交接状态")).not.toBeNull();
    expect(emptyView.getByText("暂无 Insight Admin Provider 交接配置")).not.toBeNull();
    expect(emptyView.container.textContent).not.toContain("服务凭据治理状态");
    expect(emptyView.container.textContent).not.toContain("服务凭据治理配置");
    expect(emptyView.queryByText("接入中心")).toBeNull();
    emptyView.unmount();

    mockGetServiceCredentialGovernanceStatus.mockRejectedValueOnce(new Error("unavailable"));
    mockGetServiceCredentialGovernanceConfig.mockRejectedValueOnce(new Error("unavailable"));
    const errorView = renderPage();
    expect(await errorView.findByText("Insight Admin Provider 交接状态暂不可用")).not.toBeNull();
    expect(errorView.getByText("Insight Admin Provider 交接配置暂不可用")).not.toBeNull();
    expect(errorView.container.textContent).not.toContain("服务凭据治理状态");
    expect(errorView.container.textContent).not.toContain("服务凭据治理配置");
    expect(errorView.queryByText("接入中心")).toBeNull();
  });

  test("surfaces status and config API errors without blocking the application access fallback", async() => {
    mockGetServiceCredentialGovernanceStatus.mockResolvedValueOnce({status: "error", msg: "status unavailable"});
    mockGetServiceCredentialGovernanceConfig.mockResolvedValueOnce({status: "error", msg: "config unavailable"});

    const view = renderPage();

    expect(await view.findByText("Insight Admin Provider 交接状态暂不可用")).not.toBeNull();
    expect(view.getByText("Insight Admin Provider 交接配置暂不可用")).not.toBeNull();
    expect(view.container.textContent).not.toContain("服务凭据治理状态");
    expect(view.container.textContent).not.toContain("服务凭据治理配置");
    expect(view.queryByText("接入中心")).toBeNull();
    expect(view.queryByText("预检交接包")).toBeNull();
    expect((view.getByText("生成并复制 Insight Admin 接入包").closest("button") as HTMLButtonElement | null)?.disabled).toBe(true);
  });

  test("maps diagnostic status labels for all focused service credential governance outcomes", async() => {
    mockGetServiceCredentialGovernanceStatus.mockResolvedValueOnce({
      status: "ok",
      data: {
        generatedAt: "2026-06-23T08:07:00Z",
        source: "admin_runtime_config",
        groups: [
          {
            key: "ready_group",
            label: "Ready group",
            owner: "admin_provider_trust",
            status: "configured",
            configuredKeys: ["readyKey"],
            missingKeys: [],
            credentialReferenceStatus: "configured",
          },
          {
            key: "disabled_group",
            label: "Disabled group",
            owner: "admin_outbound_resolver",
            status: "not_applicable",
            configuredKeys: [],
            missingKeys: [],
            credentialReferenceStatus: "not_applicable",
          },
          {
            key: "missing_reference_group",
            label: "Missing reference group",
            owner: "admin_gateway_projection_producer",
            status: "missing",
            configuredKeys: [],
            missingKeys: ["credentialReferenceKey"],
            credentialReferenceStatus: "missing",
          },
          {
            key: "blocked_group",
            label: "Blocked group",
            owner: "admin_gateway_projection_producer",
            status: "blocked",
            configuredKeys: [],
            missingKeys: ["callerPolicy"],
            credentialReferenceStatus: "configured",
            blockedReasons: ["caller_policy_missing"],
          },
        ],
      },
    });
    mockGetServiceCredentialGovernanceConfig.mockResolvedValueOnce({
      status: "ok",
      data: {
        updatedAt: "2026-06-23T08:07:30Z",
        source: "admin_service_credential_governance_config",
        isConfigured: true,
        groups: [
          {key: "ready_group", label: "Ready group", enabled: true, sourceClass: "admin_config", credentialReferenceStatus: "configured", credentialReferenceKey: "ready-reference", callerPolicy: "aicodex-admin"},
          {key: "disabled_group", label: "Disabled group", enabled: false, sourceClass: "admin_config", credentialReferenceStatus: "not_applicable"},
          {key: "missing_reference_group", label: "Missing reference group", enabled: true, sourceClass: "admin_config", credentialReferenceStatus: "missing"},
          {key: "blocked_group", label: "Blocked group", enabled: true, sourceClass: "admin_config", credentialReferenceStatus: "configured", credentialReferenceKey: "blocked-reference"},
        ],
      },
    });
    mockDiagnoseServiceCredentialGovernanceConfig.mockResolvedValueOnce({
      status: "ok",
      data: {
        generatedAt: "2026-06-23T08:08:00Z",
        source: "admin_service_credential_governance_diagnostic",
        groups: [
          {key: "ready_group", label: "Ready group", status: "ready", stableAlias: "ready_alias", owner: "admin_provider_trust", sourceClass: "admin_config", credentialReferenceStatus: "configured", callerPolicyPresent: true, keepInEnv: false, cannotInfer: false},
          {key: "disabled_group", label: "Disabled group", status: "disabled", stableAlias: "disabled_alias", owner: "admin_outbound_resolver", sourceClass: "admin_config", credentialReferenceStatus: "not_applicable", callerPolicyPresent: false, keepInEnv: false, cannotInfer: false},
          {key: "missing_reference_group", label: "Missing reference group", status: "missing_reference", stableAlias: "missing_reference_alias", owner: "admin_gateway_projection_producer", sourceClass: "admin_config", credentialReferenceStatus: "missing", callerPolicyPresent: true, keepInEnv: false, cannotInfer: false},
          {key: "blocked_group", label: "Blocked group", status: "blocked", stableAlias: "blocked_alias", owner: "admin_gateway_projection_producer", sourceClass: "admin_config", credentialReferenceStatus: "configured", callerPolicyPresent: false, keepInEnv: false, cannotInfer: false, blockedReasons: ["caller_policy_missing"]},
        ],
      },
    });

    const view = renderPage();
    expect(await view.findByText("交接包操作")).not.toBeNull();
    await selectBusinessOrganization(view);
    expect(view.queryByText("可生成 copy-safe 元数据包，仍需补凭据引用。")).toBeNull();
    expect(view.queryByText("可生成元数据交接包，导入 Insight 后通过 manual/secretRef binding 绑定凭据。")).toBeNull();
    expect(view.container.textContent).not.toContain("copy-safe metadata");
    expect(view.queryByText("材料已齐，点击生成并复制 Insight Admin 接入包。")).toBeNull();
    expect(view.queryByText("部分缺失")).toBeNull();
    expect((view.getAllByText("接入包可复制")).length).toBeGreaterThan(0);
    expect(view.getByText("2 项扩展能力待配置")).not.toBeNull();
    expect(view.getAllByText("可继续导入；扩展能力配置不影响接入包导入与 Profile 启用").length).toBeGreaterThan(0);
    expect(view.queryByLabelText("关键阻断")).toBeNull();
    expect(view.queryByText("导入 Insight Profile 后通过 manual/secretRef binding 绑定 resolver 凭据")).toBeNull();
    expect(view.queryByText("生成包后导入 Insight Profile；补齐 resolver 凭据引用后完成 P0 manual/secretRef binding。")).toBeNull();
    expect(view.queryByText("在 Admin 部署配置或外部 secret system 维护凭据引用，完成后刷新本页再生成。")).toBeNull();
    expect(view.container.textContent).not.toContain("部署 Secret");
    expect(view.container.textContent).not.toContain("外部 secret system");
    expect(view.container.textContent).not.toContain(".env");
    expect(view.container.textContent).not.toContain("K8s Secret");
    expect(view.container.textContent).not.toContain("Vault");
    expect(view.container.textContent).not.toContain("KMS");
    expect(view.queryByText("Ready group")).toBeNull();
    expect(view.getByText("能力详情")).not.toBeNull();
    expect(view.getByText("查看能力详情")).not.toBeNull();
    fireEvent.click(view.getByText("查看能力详情"));
    expect(await view.findByText("待配置的扩展能力")).not.toBeNull();
    expect(view.getByText("可用能力")).not.toBeNull();
    expect(view.queryByText("技术详情")).toBeNull();
    await clickAndSettleMotion(view.getByText("查看技术诊断"));
    expect(await view.findByLabelText("ready_group owner evidence")).not.toBeNull();
    expect(view.getByLabelText("current-user available capability").className).toContain("application-access-service-credential-capability-chip");
    expect(view.getByLabelText("ready_group owner evidence").textContent).toContain("Ready group");
    expect(view.getByLabelText("disabled_group owner evidence").textContent).toContain("Disabled group");
    expect(view.getByLabelText("missing_reference_group owner evidence").textContent).toContain("Missing reference group");
    expect(view.getByLabelText("blocked_group owner evidence").textContent).toContain("Blocked group");
    expect(view.container.textContent).not.toContain("credentialReferenceKey");
    expect(view.container.textContent).not.toContain("callerPolicy");
    expect(view.container.textContent).not.toContain("caller_policy_missing");

    expect(view.queryByText("预检通过")).toBeNull();
    expect(view.queryByText("待补 Admin 配置")).toBeNull();
    expect(view.queryByText("策略未放行")).toBeNull();
    expect(view.queryByText("高级修正")).toBeNull();
    expect(view.container.textContent).not.toContain("ready_alias");
    expect(view.container.textContent).not.toContain("missing_reference_alias");
    expect(view.queryByText("排障详情")).toBeNull();
    expect(view.queryByText("机器字段")).toBeNull();
    clickButtonByText(view, "生成并复制 Insight Admin 接入包");
    expect((await view.findAllByText("Insight Admin 接入包已复制")).length).toBeGreaterThan(0);
    expect(view.getByText("接入包包含脱敏元数据和安全交接授权摘要；真实凭据只由 Insight 后端兑换。")).not.toBeNull();
    expect(view.container.textContent).not.toContain("copy-safe metadata");
    expect(view.queryByText("Insight Admin 接入交接包已生成")).toBeNull();
    expect(mockCreateInsightAdminAccessPackage).toHaveBeenCalledTimes(1);
    const handoffInput = mockBuildServiceCredentialGovernanceHandoffPackage.mock.calls[0]?.[0] as {config?: unknown; status?: unknown};
    expect(handoffInput).toHaveProperty("config");
    expect(handoffInput).toEqual(expect.objectContaining({
      config: expect.objectContaining({
        groups: expect.arrayContaining([
          expect.objectContaining({key: "missing_reference_group", credentialReferenceStatus: "missing"}),
          expect.objectContaining({key: "blocked_group", credentialReferenceStatus: "configured", credentialReferenceKey: "blocked-reference"}),
        ]),
      }),
      status: expect.objectContaining({
        groups: expect.arrayContaining([
          expect.objectContaining({key: "missing_reference_group", status: "configured", missingKeys: [], blockedReasons: [], credentialReferenceStatus: "configured"}),
          expect.objectContaining({key: "blocked_group", status: "configured", missingKeys: [], blockedReasons: []}),
        ]),
      }),
    }));
    await clickAndSettleMotion(view.getByText("关闭技术诊断"));
  });

  test("allows access-package generation when only the legacy credential reference is missing", async() => {
    mockGetServiceCredentialGovernanceStatus.mockResolvedValueOnce({
      status: "ok",
      data: {
        generatedAt: "2026-07-09T02:20:00Z",
        source: "admin_runtime_config",
        groups: [
          {key: "usage_identity_resolver", label: "Usage identity resolver", owner: "admin_outbound_resolver", status: "partial", configuredKeys: [], missingKeys: ["insightUsageIdentityResolverToken"], credentialReferenceStatus: "missing"},
        ],
      },
    });
    mockGetServiceCredentialGovernanceConfig.mockResolvedValueOnce({
      status: "ok",
      data: {
        updatedAt: "2026-07-09T02:20:30Z",
        source: "admin_service_credential_governance_config",
        isConfigured: true,
        groups: [
          {key: "usage_identity_resolver", label: "Usage identity resolver", enabled: true, sourceClass: "admin_config", credentialReferenceStatus: "missing"},
        ],
      },
    });

    const view = renderPage();

    expect(await view.findByText("交接包操作")).not.toBeNull();
    await selectBusinessOrganization(view);
    expect((await view.findAllByText("接入包可复制")).length).toBeGreaterThan(0);
    expect(view.getByText("2 项扩展能力待配置")).not.toBeNull();
    expect(view.getAllByText("可继续导入；扩展能力配置不影响接入包导入与 Profile 启用").length).toBeGreaterThan(0);
    expect((view.getByText("生成并复制 Insight Admin 接入包").closest("button") as HTMLButtonElement).disabled).toBe(false);
    clickButtonByText(view, "生成并复制 Insight Admin 接入包");

    expect((await view.findAllByText("Insight Admin 接入包已复制")).length).toBeGreaterThan(0);
    expect(mockCreateInsightAdminAccessPackage).toHaveBeenCalledTimes(1);
    expect(view.queryByText("Admin 交接包暂不可用")).toBeNull();
    const handoffInput = mockBuildServiceCredentialGovernanceHandoffPackage.mock.calls[0]?.[0] as {status?: unknown};
    expect(handoffInput).toEqual(expect.objectContaining({
      status: expect.objectContaining({
        groups: expect.arrayContaining([
          expect.objectContaining({key: "usage_identity_resolver", status: "configured", missingKeys: [], blockedReasons: [], credentialReferenceStatus: "configured"}),
        ]),
      }),
    }));
  });

  test("shows a specific access-package permission error instead of the generic unavailable message", async() => {
    mockGetServiceCredentialGovernanceStatus.mockResolvedValueOnce({
      status: "ok",
      data: {
        generatedAt: "2026-07-09T02:30:00Z",
        source: "admin_runtime_config",
        groups: [
          {key: "usage_identity_resolver", label: "Usage identity resolver", owner: "admin_outbound_resolver", status: "partial", configuredKeys: [], missingKeys: ["insightUsageIdentityResolverToken"], credentialReferenceStatus: "missing"},
        ],
      },
    });
    mockGetServiceCredentialGovernanceConfig.mockResolvedValueOnce({
      status: "ok",
      data: {
        updatedAt: "2026-07-09T02:30:30Z",
        source: "admin_service_credential_governance_config",
        isConfigured: true,
        groups: [
          {key: "usage_identity_resolver", label: "Usage identity resolver", enabled: true, sourceClass: "admin_config", credentialReferenceStatus: "missing"},
        ],
      },
    });
    mockCreateInsightAdminAccessPackage.mockReset();
    mockCreateInsightAdminAccessPackage.mockResolvedValueOnce({status: "error", msg: "Unauthorized operation"});

    const view = renderPage();

    expect(await view.findByText("交接包操作")).not.toBeNull();
    await selectBusinessOrganization(view);
    expect((view.getByText("生成并复制 Insight Admin 接入包").closest("button") as HTMLButtonElement).disabled).toBe(false);
    clickButtonByText(view, "生成并复制 Insight Admin 接入包");

    expect(await view.findByText("当前登录态无权生成 Insight Admin 接入包，请使用 Admin owner 权限重试。")).not.toBeNull();
    expect(view.queryByText("Admin 交接包暂不可用")).toBeNull();
  });

  test("previews handoff readiness labels without exposing unsafe runtime material", async() => {
    mockGetServiceCredentialGovernanceStatus.mockResolvedValueOnce({
      status: "ok",
      data: {
        generatedAt: "2026-06-23T08:09:00Z",
        source: "admin_runtime_config",
        groups: [
          {key: "ready_group", label: "Ready group", owner: "admin_provider_trust", status: "configured", configuredKeys: ["readyKey"], missingKeys: [], credentialReferenceStatus: "configured"},
          {key: "env_group", label: "Env group", owner: "deployment_env_config", status: "configured", configuredKeys: ["env/config"], missingKeys: [], credentialReferenceStatus: "external_secret"},
          {key: "blocked_group", label: "Blocked group", owner: "admin_gateway_projection_producer", status: "missing", configuredKeys: [], missingKeys: ["gatewayOrganizationProjectionToken"], credentialReferenceStatus: "missing"},
        ],
      },
    });
    mockGetServiceCredentialGovernanceConfig.mockResolvedValueOnce({
      status: "ok",
      data: {
        updatedAt: "2026-06-23T08:09:30Z",
        source: "admin_service_credential_governance_config",
        isConfigured: true,
        groups: [
          {key: "ready_group", label: "Ready group", enabled: true, sourceClass: "admin_config", credentialReferenceStatus: "configured", credentialReferenceKey: "ready-reference", callerPolicy: "aicodex-admin"},
          {key: "env_group", label: "Env group", enabled: true, sourceClass: "env_config", credentialReferenceStatus: "external_secret", keepInEnv: true},
          {key: "blocked_group", label: "Blocked group", enabled: true, sourceClass: "admin_config", credentialReferenceStatus: "missing", blockedReasons: ["admin_service_credential_reference_missing"]},
        ],
      },
    });
    mockBuildServiceCredentialGovernanceHandoffPackage.mockReturnValueOnce({
      schema: "aicodex.admin.serviceCredentialGovernanceHandoff",
      version: "2026-06-22",
      source: "admin_service_credential_governance_handoff_package",
      generatedAt: "2026-06-23T08:10:00Z",
      targetConsumerAlias: "insight_business_service_access",
      adminOwnerAlias: "admin_identity_application_access",
      groups: [
        {
          key: "ready_group",
          label: "Ready group",
          readiness: "ready",
          ownerHint: "admin_provider_trust",
          sourceClass: "admin_config",
          credentialReferenceStatus: "configured",
          credentialReferenceKeySummary: "ready-reference",
          callerPolicyPresent: true,
          callerPolicyAlias: "aicodex-admin",
          keepInEnv: false,
          cannotInferRuntimeTruth: false,
          nextAction: "交接给 Insight 消费方",
          stableAliases: ["ready_alias"],
          blockedAliases: [],
        },
        {
          key: "env_group",
          label: "Env group",
          readiness: "keep_in_env",
          ownerHint: "deployment_env_config",
          sourceClass: "env_config",
          credentialReferenceStatus: "external_secret",
          callerPolicyPresent: false,
          keepInEnv: true,
          cannotInferRuntimeTruth: true,
          stableAliases: ["admin_service_credential_keep_in_env"],
          blockedAliases: ["admin_service_credential_keep_in_env"],
        },
        {
          key: "blocked_group",
          label: "Blocked group",
          readiness: "blocked",
          ownerHint: "admin_gateway_projection_producer",
          sourceClass: "admin_config",
          credentialReferenceStatus: "missing",
          callerPolicyPresent: false,
          keepInEnv: false,
          cannotInferRuntimeTruth: false,
          nextAction: "补齐服务凭据引用",
          stableAliases: ["admin_service_credential_reference_missing"],
          blockedAliases: ["admin_service_credential_reference_missing"],
        },
      ],
    });

    const view = renderPage();
    await selectBusinessOrganization(view);
    await view.findAllByText("接入包可复制");
    expect(view.queryByLabelText("blocked_group owner evidence")).toBeNull();
    await clickAndSettleMotion(view.getByText("查看技术诊断"));
    await view.findByLabelText("blocked_group owner evidence");
    expect(view.getByLabelText("ready_group owner evidence").textContent).toContain("Ready group");
    expect((view.getByText("生成并复制 Insight Admin 接入包").closest("button") as HTMLButtonElement).disabled).toBe(false);
    clickButtonByText(view, "生成并复制 Insight Admin 接入包");

    expect((await view.findAllByText("Insight Admin 接入包已复制")).length).toBeGreaterThan(0);
    expect(view.getByText("接入包包含脱敏元数据和安全交接授权摘要；真实凭据只由 Insight 后端兑换。")).not.toBeNull();
    expect(view.container.textContent).not.toContain("copy-safe metadata");
    expect(view.queryByText("Insight Admin 接入交接包已生成")).toBeNull();
    expect(mockBuildServiceCredentialGovernanceHandoffPackage).toHaveBeenCalledTimes(1);
    expect(mockCreateInsightAdminAccessPackage).toHaveBeenCalledTimes(1);
    expect(mockCopyToClipboard).toHaveBeenCalledWith(expect.stringContaining("\"ownerRegistry\""));
    expect(mockCopyToClipboard).toHaveBeenCalledWith(expect.stringContaining("\"trustedEndpointAlias\": \"admin-secure-handoff\""));
    expect(mockCopyToClipboard).toHaveBeenCalledWith(expect.stringContaining("\"serviceIdentity\": \"svc:aicodex-admin\""));
    expect(mockCopyToClipboard).toHaveBeenCalledWith(expect.stringContaining("\"targetRegistrationStatus\": \"approved\""));
    expect(view.container.textContent).not.toContain("可交付");
    expect(view.queryByText("高级修正")).toBeNull();
    expect(view.container.textContent).not.toContain("调用策略缺失");
    expect(view.container.textContent).not.toContain("admin_service_credential_reference_missing");
    expect(view.queryByText("admin_service_credential_reference_missing")).toBeNull();
    expect(view.container.textContent).not.toContain("https://");
    expect(view.container.textContent).not.toContain("token-value");
    await clickAndSettleMotion(view.getByText("关闭技术诊断"));
  });

  test("opens diagnostics from URL query for shareable troubleshooting links", async() => {
    mockGetServiceCredentialGovernanceStatus.mockResolvedValueOnce(governanceStatusResponse);
    mockGetServiceCredentialGovernanceConfig.mockResolvedValueOnce(governanceConfigResponse);

    const view = renderPage("/application-usage-access?diagnostics=1");

    expect(await view.findByText("技术诊断（仅供排障）")).not.toBeNull();
    expect((view.getByLabelText("查看能力详情") as HTMLButtonElement).getAttribute("aria-expanded")).toBe("false");
    await clickAndSettleMotion(view.getByText("关闭技术诊断"));
  });

  test("opens technical diagnostics in a modal without nesting it in capability details", async() => {
    mockGetServiceCredentialGovernanceStatus.mockResolvedValueOnce(governanceStatusResponse);
    mockGetServiceCredentialGovernanceConfig.mockResolvedValueOnce(governanceConfigResponse);

    const view = renderPage();
    await view.findByText("能力详情");

    expect(view.getByText("查看技术诊断")).not.toBeNull();
    expect(view.queryByText("技术详情")).toBeNull();
    await clickAndSettleMotion(view.getByText("查看技术诊断"));
    expect(await view.findByText("技术诊断（仅供排障）")).not.toBeNull();
    expect(window.location.search).toContain("diagnostics=1");

    await clickAndSettleMotion(view.getByText("关闭技术诊断"));
    expect(view.queryByText("技术诊断（仅供排障）")).toBeNull();
    expect(window.location.search).not.toContain("diagnostics=1");
  });
});
