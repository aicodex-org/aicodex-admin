/* eslint-env jest */
import React from "react";
import {render} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import {expect, jest} from "@jest/globals";
import i18next from "i18next";
import ApplicationUsageAccessPage from "./ApplicationUsageAccessPage";
import {
  getServiceCredentialGovernanceCredentialPresenceLabel,
  getServiceCredentialGovernanceDiagnosticStatusLabel,
  getServiceCredentialGovernanceDiagnosticTone,
  getServiceCredentialGovernanceHandoffReadinessLabel,
  getServiceCredentialGovernanceHandoffTone,
  getServiceCredentialGovernanceNextAction,
  getServiceCredentialGovernanceOperatorStatus,
  getServiceCredentialGovernancePrimaryGap,
  getServiceCredentialGovernanceRequiredConfigSummary,
  getServiceCredentialGovernanceSourceClassLabel,
  getServiceCredentialGovernanceSummary,
  getServiceCredentialGovernanceTone,
  getServiceCredentialReferenceStatusLabel
} from "./ApplicationAccessServiceCredentialGovernancePanel";
import en from "./locales/en/data.json";
import zh from "./locales/zh/data.json";

type LooseMock = {
  (...args: unknown[]): Promise<unknown>;
  mock: {calls: unknown[][]};
  mockReset: () => void;
  mockRejectedValueOnce: (value: unknown) => LooseMock;
  mockResolvedValueOnce: (value: unknown) => LooseMock;
};

const mockGetServiceCredentialGovernanceStatus = jest.fn() as unknown as LooseMock;
const mockGetServiceCredentialGovernanceConfig = jest.fn() as unknown as LooseMock;
const mockSaveServiceCredentialGovernanceConfig = jest.fn() as unknown as LooseMock;
const mockDiagnoseServiceCredentialGovernanceConfig = jest.fn() as unknown as LooseMock;
const mockBuildServiceCredentialGovernanceHandoffPackage = jest.fn();

const {fireEvent} = require("@testing-library/react") as {
  fireEvent: {
    change: (element: Element | null, event: unknown) => boolean;
    click: (element: Element | null) => boolean;
  };
};

jest.setTimeout(15000);

jest.mock("./backend/ApplicationAccessServiceCredentialGovernanceBackend", () => {
  return {
    getServiceCredentialGovernanceStatus: (...args: unknown[]) => mockGetServiceCredentialGovernanceStatus(...args),
    getServiceCredentialGovernanceConfig: (...args: unknown[]) => mockGetServiceCredentialGovernanceConfig(...args),
    saveServiceCredentialGovernanceConfig: (...args: unknown[]) => mockSaveServiceCredentialGovernanceConfig(...args),
    diagnoseServiceCredentialGovernanceConfig: (...args: unknown[]) => mockDiagnoseServiceCredentialGovernanceConfig(...args),
    buildServiceCredentialGovernanceHandoffPackage: (...args: unknown[]) => mockBuildServiceCredentialGovernanceHandoffPackage(...args),
  };
});

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

function renderPage() {
  return render(
    <MemoryRouter>
      <ApplicationUsageAccessPage />
    </MemoryRouter>
  );
}

async function openConfigDetails(view: ReturnType<typeof render>, key: string): Promise<HTMLElement> {
  const row = await view.findByLabelText(`${key} 治理项对齐`);
  const header = row.querySelector(".application-access-service-credential-row-details .ant-collapse-header");
  if (!header) {
    throw new Error(`Missing config details header for ${key}`);
  }
  fireEvent.click(header);
  return row as HTMLElement;
}

async function openAdvancedInformation(view: ReturnType<typeof render>): Promise<HTMLElement> {
  const advancedLabel = await view.findByText("高级信息");
  const header = advancedLabel.closest(".ant-collapse-header");
  if (!header) {
    throw new Error("Missing advanced information header");
  }
  fireEvent.click(header);
  return view.findByLabelText("服务凭据治理高级信息");
}

function expandMetadataSections(view: ReturnType<typeof render>, label: string): void {
  view.getAllByText(label).forEach((node: HTMLElement) => {
    const header = node.closest(".ant-collapse-header");
    if (header) {
      fireEvent.click(header);
    }
  });
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

describe("ApplicationUsageAccessPage", () => {
  let consoleErrorSpy: {mockRestore: () => void};

  beforeEach(async() => {
    await useTestLanguage("zh");
    mockGetServiceCredentialGovernanceStatus.mockReset();
    mockGetServiceCredentialGovernanceConfig.mockReset();
    mockSaveServiceCredentialGovernanceConfig.mockReset();
    mockDiagnoseServiceCredentialGovernanceConfig.mockReset();
    mockBuildServiceCredentialGovernanceHandoffPackage.mockReset();
    mockBuildServiceCredentialGovernanceHandoffPackage.mockReturnValue({
      schema: "aicodex.admin.serviceCredentialGovernanceHandoff",
      version: "2026-06-22",
      source: "admin_service_credential_governance_handoff_package",
      generatedAt: "2026-06-23T08:04:00Z",
      targetConsumerAlias: "insight_business_service_access",
      adminOwnerAlias: "admin_identity_application_access",
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
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation((message?: unknown, ...args: unknown[]) => {
      if (`${message}`.includes("ReactDOM.render is no longer supported")) {
        return;
      }
      const serializedMessage = [message, ...args].map(item => `${item}`).join(" ");
      if (serializedMessage.includes("not wrapped in act") && serializedMessage.includes("BaseSelect")) {
        return;
      }

      consoleErrorSpy.mockRestore();
      throw new Error(serializedMessage);
    });
  });

  afterEach(async() => {
    await new Promise(resolve => setTimeout(resolve, 20));
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
    expect(getServiceCredentialGovernanceSummary({generatedAt: "", source: "admin_runtime_config", groups: [{key: "partial", label: "Partial", owner: "admin", status: "partial", credentialReferenceStatus: "configured"}]}).label).toBe("需补配置");
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
    expect(getServiceCredentialGovernanceHandoffReadinessLabel("ready")).toBe("可交接");
    expect(getServiceCredentialGovernanceHandoffReadinessLabel("keep_in_env")).toBe("保留在 env/config");
    expect(getServiceCredentialGovernanceHandoffReadinessLabel("cannot_infer")).toBe("不能推断");
    expect(getServiceCredentialGovernanceHandoffReadinessLabel("blocked")).toBe("已阻断");
    expect(getServiceCredentialGovernanceOperatorStatus("missing").label).toBe("未完成配置");
    expect(getServiceCredentialGovernanceOperatorStatus(undefined).description).toBe("请刷新状态");
    expect(getServiceCredentialGovernancePrimaryGap({key: "resolver", label: "Resolver", owner: "admin", status: "partial", credentialReferenceStatus: "missing"})).toBe("缺少凭据");
    expect(getServiceCredentialGovernancePrimaryGap({key: "resolver", label: "Resolver", owner: "admin", status: "partial", credentialReferenceStatus: "configured", missingKeys: ["callerPolicy"]})).toBe("缺少调用策略");
    expect(getServiceCredentialGovernancePrimaryGap({key: "resolver", label: "Resolver", owner: "admin", status: "partial", credentialReferenceStatus: "configured", missingKeys: ["boundedRuntimePolicy"]})).toBe("缺少运行策略");
    expect(getServiceCredentialGovernancePrimaryGap({key: "resolver", label: "Resolver", owner: "admin", status: "blocked", credentialReferenceStatus: "configured"})).toBe("策略未放行");
    expect(getServiceCredentialGovernanceNextAction([{statusGroup: {key: "resolver", label: "Resolver", owner: "admin", status: "missing", credentialReferenceStatus: "missing"}, configGroup: {key: "resolver", enabled: true, credentialReferenceStatus: "missing", nextAction: "补充 resolver 凭据引用"}}])).toBe("补充 resolver 凭据引用");
    expect(getServiceCredentialGovernanceNextAction([])).toBe("等待配置加载");
    expect(getServiceCredentialGovernanceRequiredConfigSummary([{key: "resolver", enabled: true, credentialReferenceStatus: "missing"}, {key: "env", enabled: true, keepInEnv: true, credentialReferenceStatus: "external_secret"}])).toBe("1 项缺少凭据引用");
    expect(getServiceCredentialGovernanceRequiredConfigSummary([{key: "resolver", enabled: true, credentialReferenceStatus: "configured"}])).toBe("1 项可维护配置");
    expect(getServiceCredentialGovernanceRequiredConfigSummary([{key: "env", enabled: true, keepInEnv: true, credentialReferenceStatus: "external_secret"}])).toBe("暂无可维护配置");
    expect(getServiceCredentialGovernanceCredentialPresenceLabel({key: "resolver", enabled: true, credentialReferenceStatus: "configured", credentialReferenceKey: "vault:resolver"})).toBe("已填写引用");
    expect(getServiceCredentialGovernanceCredentialPresenceLabel({key: "resolver", enabled: true, credentialReferenceStatus: "configured"})).toBe("待填写引用");
    expect(getServiceCredentialGovernanceCredentialPresenceLabel({key: "env", enabled: true, keepInEnv: true, credentialReferenceStatus: "external_secret"})).toBe("无需填写");
  });

  test("renders the service credential governance panel as the focused usage access content", async() => {
    mockGetServiceCredentialGovernanceStatus.mockResolvedValueOnce(governanceStatusResponse);
    mockGetServiceCredentialGovernanceConfig.mockResolvedValueOnce(governanceConfigResponse);

    const view = renderPage();

    expect(await view.findByText("用量接入")).not.toBeNull();
    expect(view.getByText("应用接入 / 用量接入")).not.toBeNull();
    expect(view.getAllByText("服务凭据治理").length).toBeGreaterThan(0);
    expect(view.getByLabelText("服务接入配置总览")).not.toBeNull();
    expect(view.getByText("当前状态")).not.toBeNull();
    expect(view.getByText("下一步")).not.toBeNull();
    expect(view.getByText("治理项对齐")).not.toBeNull();
    expect(view.getByText("保存配置")).not.toBeNull();
    expect(view.getByText("刷新状态")).not.toBeNull();
    expect(view.getByText("读取配置")).not.toBeNull();
    expect(view.getByText("恢复回读")).not.toBeNull();
    expect(view.getByText("Dry-run/Readiness")).not.toBeNull();
    expect(view.getByText("Doctor")).not.toBeNull();
    expect(view.getByText("Handoff/Evidence")).not.toBeNull();
    expect(view.getAllByText("必填配置").length).toBeGreaterThan(0);
    await openConfigDetails(view, "usage_identity_resolver");
    expect((view.getByLabelText("usage_identity_resolver 凭据引用") as HTMLInputElement).value).toBe("vault:usage-identity-resolver");
    expect((view.getByLabelText("usage_identity_resolver 调用策略") as HTMLInputElement).value).toBe("aicodex-admin");
    expect(view.getAllByText("外部凭据").length).toBeGreaterThan(0);
    expect(view.getAllByText("环境配置").length).toBeGreaterThan(0);
    expect(view.container.textContent).not.toContain("resolver-secret-value");
    expect(view.container.textContent).not.toContain("resolver-token-value");
    expect(view.container.textContent).not.toContain("resolver.internal.example.invalid");
    expect(view.container.textContent).not.toContain("gateway_projection_token_missing");
    expect(view.container.textContent).not.toContain("admin_service_credential_reference_unresolved");
  });

  test("saves, diagnoses, and previews service credential governance handoff from usage access", async() => {
    mockGetServiceCredentialGovernanceStatus.mockResolvedValueOnce(governanceStatusResponse);
    mockGetServiceCredentialGovernanceConfig.mockResolvedValueOnce(governanceConfigResponse);
    mockSaveServiceCredentialGovernanceConfig.mockResolvedValueOnce({
      ...governanceConfigResponse,
      data: {
        ...governanceConfigResponse.data,
        groups: governanceConfigResponse.data.groups.map(group => group.key === "usage_identity_resolver"
          ? {...group, credentialReferenceKey: "vault:usage-identity-resolver-updated", nextAction: "已回读脱敏配置"}
          : group),
      },
    });
    mockDiagnoseServiceCredentialGovernanceConfig.mockResolvedValueOnce(governanceDiagnosticResponse);

    const view = renderPage();
    await openConfigDetails(view, "usage_identity_resolver");
    const resolverReferenceInput = await view.findByLabelText("usage_identity_resolver 凭据引用");
    fireEvent.change(resolverReferenceInput, {target: {value: "vault:usage-identity-resolver-updated"}});
    fireEvent.click(view.getByText("保存配置"));

    expect(await view.findByText("配置已保存")).not.toBeNull();
    expect(mockSaveServiceCredentialGovernanceConfig).toHaveBeenCalledWith(expect.objectContaining({
      source: "admin_service_credential_governance_config",
      isConfigured: true,
      groups: expect.any(Array),
    }));
    const savePayload = JSON.stringify(mockSaveServiceCredentialGovernanceConfig.mock.calls[0]?.[0]);
    expect(savePayload).toContain("vault:usage-identity-resolver-updated");
    expect(savePayload).not.toContain("resolver-token-value");
    expect(savePayload).not.toContain("resolver.internal.example.invalid");

    fireEvent.click(view.getByText("Dry-run/Readiness"));
    const resolverRowAfterDiagnostic = await view.findByLabelText("usage_identity_resolver 治理项对齐");
    expect(resolverRowAfterDiagnostic.textContent).toContain("预检");
    expect(resolverRowAfterDiagnostic.textContent).toContain("需下游确认");
    expect(resolverRowAfterDiagnostic.textContent).not.toContain("admin_service_credential_reference_unresolved");
    expect(view.container.textContent).not.toContain("admin_service_credential_reference_unresolved");
    expect(mockDiagnoseServiceCredentialGovernanceConfig).toHaveBeenCalledTimes(1);

    clickButtonByText(view, "Handoff/Evidence");
    expect(await view.findByText("Evidence 已生成")).not.toBeNull();
    await openAdvancedInformation(view);
    expandMetadataSections(view, "Evidence 元数据");
    expect(view.getByText("insight_business_service_access")).not.toBeNull();
    expect(view.getByText("admin_identity_application_access")).not.toBeNull();
    expect(view.container.textContent).not.toContain("vault:usage-identity-resolver-updated");
    expect(view.container.textContent).toContain("cannotInferRuntimeTruth");
    expect(view.container.textContent).not.toContain("resolver-secret-value");
    expect(view.container.textContent).not.toContain("resolver-token-value");
    expect(view.container.textContent).not.toContain("resolver.internal.example.invalid");
  });

  test("aligns status, config, and diagnostics by governance item key", async() => {
    mockGetServiceCredentialGovernanceStatus.mockResolvedValueOnce(governanceStatusResponse);
    mockGetServiceCredentialGovernanceConfig.mockResolvedValueOnce(governanceConfigResponse);
    mockDiagnoseServiceCredentialGovernanceConfig.mockResolvedValueOnce(governanceDiagnosticResponse);

    const view = renderPage();
    await view.findByLabelText("usage_identity_resolver 治理项对齐");

    const resolverRowBeforeDiagnostic = view.getByLabelText("usage_identity_resolver 治理项对齐");
    expect(resolverRowBeforeDiagnostic.textContent).toContain("可用");
    expect(resolverRowBeforeDiagnostic.textContent).toContain("必填配置");
    await openConfigDetails(view, "usage_identity_resolver");
    expect((view.getByLabelText("usage_identity_resolver 凭据引用") as HTMLInputElement).value).toBe("vault:usage-identity-resolver");
    expect(resolverRowBeforeDiagnostic.textContent).toContain("预检");
    expect(resolverRowBeforeDiagnostic.textContent).toContain("尚未诊断");

    fireEvent.click(view.getByText("Dry-run/Readiness"));

    const resolverRowAfterDiagnostic = await view.findByLabelText("usage_identity_resolver 治理项对齐");
    expect(resolverRowAfterDiagnostic.textContent).toContain("必填配置");
    expect(resolverRowAfterDiagnostic.textContent).toContain("预检");
    expect(resolverRowAfterDiagnostic.textContent).toContain("需下游确认");
    expect(resolverRowAfterDiagnostic.textContent).not.toContain("admin_service_credential_reference_unresolved");
    expect(view.container.textContent).not.toContain("admin_service_credential_reference_unresolved");
    await openAdvancedInformation(view);
    expandMetadataSections(view, "诊断元数据");
    expect(view.getAllByText("admin_service_credential_reference_unresolved").length).toBeGreaterThan(0);
  });

  test("keeps loading, empty, and error states actionable", async() => {
    mockGetServiceCredentialGovernanceStatus.mockResolvedValueOnce({
      status: "ok",
      data: {generatedAt: "2026-06-23T08:02:00Z", source: "admin_runtime_config", groups: []},
    });
    mockGetServiceCredentialGovernanceConfig.mockResolvedValueOnce({
      status: "ok",
      data: {updatedAt: "2026-06-23T08:02:00Z", source: "admin_service_credential_governance_config", isConfigured: false, groups: []},
    });
    const emptyView = renderPage();
    expect(await emptyView.findByText("暂无服务凭据治理状态")).not.toBeNull();
    expect(emptyView.getByText("应用接入中心").closest("a")?.getAttribute("href")).toBe("/applications");
    emptyView.unmount();

    mockGetServiceCredentialGovernanceStatus.mockRejectedValueOnce(new Error("unavailable"));
    mockGetServiceCredentialGovernanceConfig.mockRejectedValueOnce(new Error("unavailable"));
    const errorView = renderPage();
    expect(await errorView.findByText("服务凭据治理状态暂不可用")).not.toBeNull();
    expect(errorView.getByText("应用接入中心").closest("a")?.getAttribute("href")).toBe("/applications");
  });

  test("surfaces status and config API errors without blocking the application access fallback", async() => {
    mockGetServiceCredentialGovernanceStatus.mockResolvedValueOnce({status: "error", msg: "status unavailable"});
    mockGetServiceCredentialGovernanceConfig.mockResolvedValueOnce({status: "error", msg: "config unavailable"});

    const view = renderPage();

    expect(await view.findByText("服务凭据治理状态暂不可用")).not.toBeNull();
    expect(view.getByText("服务凭据治理配置暂不可用")).not.toBeNull();
    expect(view.getByText("应用接入中心").closest("a")?.getAttribute("href")).toBe("/applications");
    expect((view.getByText("Dry-run/Readiness").closest("button") as HTMLButtonElement | null)?.disabled).toBe(true);
    expect((view.getByText("Handoff/Evidence").closest("button") as HTMLButtonElement | null)?.disabled).toBe(true);
  });

  test("keeps save and diagnostic failures visible and resets stale diagnostic output after edits", async() => {
    mockGetServiceCredentialGovernanceStatus.mockResolvedValueOnce(governanceStatusResponse);
    mockGetServiceCredentialGovernanceConfig.mockResolvedValueOnce(governanceConfigResponse);
    mockSaveServiceCredentialGovernanceConfig.mockRejectedValueOnce(new Error("save failed"));
    mockDiagnoseServiceCredentialGovernanceConfig
      .mockRejectedValueOnce(new Error("diagnostic failed"))
      .mockResolvedValueOnce({
        status: "ok",
        data: {
          generatedAt: "2026-06-23T08:06:00Z",
          source: "admin_service_credential_governance_diagnostic",
          groups: [],
        },
      });

    const view = renderPage();
    await openConfigDetails(view, "usage_identity_resolver");
    const resolverReferenceInput = await view.findByLabelText("usage_identity_resolver 凭据引用");

    fireEvent.click(view.getByText("保存配置"));
    expect(await view.findByText("服务凭据治理配置保存失败")).not.toBeNull();

    fireEvent.click(view.getByText("Dry-run/Readiness"));
    expect((await view.findAllByText("诊断暂不可用")).length).toBeGreaterThan(0);

    fireEvent.change(resolverReferenceInput, {target: {value: "vault:usage-identity-resolver-after-error"}});
    const resolverRowAfterEdit = view.getByLabelText("usage_identity_resolver 治理项对齐");
    expect(resolverRowAfterEdit.textContent).toContain("尚未诊断");
    expect(resolverRowAfterEdit.textContent).not.toContain("诊断暂不可用");

    fireEvent.click(view.getByText("Dry-run/Readiness"));
    expect((await view.findAllByText("无诊断结果")).length).toBeGreaterThan(0);
    const diagnosticPayload = JSON.stringify(mockDiagnoseServiceCredentialGovernanceConfig.mock.calls[1]?.[0]);
    expect(diagnosticPayload).toContain("vault:usage-identity-resolver-after-error");
    expect(diagnosticPayload).not.toContain("resolver-token-value");
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
    await view.findByLabelText("ready_group 治理项对齐");
    expect(view.getByLabelText("disabled_group 治理项对齐").textContent).toContain("未启用");
    expect(view.getByLabelText("missing_reference_group 治理项对齐").textContent).toContain("未完成配置");
    expect(view.getByLabelText("blocked_group 治理项对齐").textContent).toContain("不可用");
    expect(view.getByLabelText("blocked_group 治理项对齐").textContent).not.toContain("caller_policy_missing");

    fireEvent.click(view.getByText("Dry-run/Readiness"));

    expect((await view.findAllByText("预检通过")).length).toBeGreaterThan(0);
    expect(view.getAllByText("未启用").length).toBeGreaterThan(0);
    expect(view.getAllByText("缺少凭据").length).toBeGreaterThan(0);
    expect(view.getAllByText("策略未放行").length).toBeGreaterThan(0);
    await openAdvancedInformation(view);
    expandMetadataSections(view, "诊断元数据");
    expect(view.getByText("ready_alias")).not.toBeNull();
    expect(view.getByText("missing_reference_alias")).not.toBeNull();
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
    await view.findByLabelText("ready_group 治理项对齐");
    clickButtonByText(view, "Handoff/Evidence");

    expect(await view.findByText("可交接")).not.toBeNull();
    expect(view.getAllByText("保留在 env/config").length).toBeGreaterThan(0);
    expect(view.getAllByText("已阻断").length).toBeGreaterThan(0);
    expect(view.container.textContent).toContain("调用策略缺失");
    await openAdvancedInformation(view);
    expandMetadataSections(view, "Evidence 元数据");
    expect(view.getByText("admin_service_credential_reference_missing")).not.toBeNull();
    expect(view.container.textContent).not.toContain("https://");
    expect(view.container.textContent).not.toContain("token-value");
  });
});
