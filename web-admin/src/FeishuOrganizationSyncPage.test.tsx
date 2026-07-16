/* eslint-env jest */

import React from "react";
import {expect as jestExpect, jest as jestValue} from "@jest/globals";
import {act, render} from "@testing-library/react";
import FeishuOrganizationSyncPage from "./FeishuOrganizationSyncPage";
import * as FeishuOrganizationSyncBackend from "./backend/FeishuOrganizationSyncBackend";
import * as OrganizationBackend from "./backend/OrganizationBackend";
import * as WecomOrganizationSyncBackend from "./backend/WecomOrganizationSyncBackend";
import * as Setting from "./Setting";
import {type ConsoleCallSpy, getReactActWarnings} from "./testUtils/reactAsyncWarnings";

declare const jest: typeof jestValue;

type DomMatcherResult = ReturnType<typeof jestExpect> & {
  toBeInTheDocument: () => void;
  toHaveAttribute: (attr: string, value?: unknown) => void;
  toHaveStyle: (style: string | Record<string, unknown>) => void;
  toHaveTextContent: (text: string | RegExp) => void;
  toBeDisabled: () => void;
  not: ReturnType<typeof jestExpect> & {
    toBeInTheDocument: () => void;
    toHaveBeenCalled: () => void;
    toBeDisabled: () => void;
  };
};

type TestExpect = {
  (actual: unknown): DomMatcherResult;
  objectContaining: typeof jestExpect.objectContaining;
  stringContaining: typeof jestExpect.stringContaining;
};

const expect = jestExpect as unknown as TestExpect;
let consoleErrorSpy: ConsoleCallSpy;

jest.mock("./backend/FeishuOrganizationSyncBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    getFeishuOrganizationSyncConfig: factoryJest.fn(),
    saveFeishuOrganizationSyncConfig: factoryJest.fn(),
    testFeishuOrganizationSyncConfig: factoryJest.fn(),
    dryRunFeishuOrganizationSyncPreview: factoryJest.fn(),
    getFeishuOrganizationSyncDryRunHistories: factoryJest.fn(),
    getFeishuOrganizationSyncDryRunHistory: factoryJest.fn(),
    getFeishuOrganizationSyncUserBindingConflicts: factoryJest.fn(),
    getFeishuOrganizationSyncHandoffEvidence: factoryJest.fn(),
    startFeishuOrganizationSyncRun: factoryJest.fn(),
    getFeishuOrganizationSyncRuns: factoryJest.fn(),
  };
});

jest.mock("./backend/WecomOrganizationSyncBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    getWecomOrganizationSyncConfig: factoryJest.fn(),
  };
});

jest.mock("./backend/OrganizationBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    addOrganization: factoryJest.fn(),
    updateOrganization: factoryJest.fn(),
    deleteOrganization: factoryJest.fn(),
  };
});

jest.mock("./common/select/OrganizationSelect", () => function OrganizationSelectMock(props: {initValue?: string; excludedOrganizations?: string[]; onChange?: (value: string) => void; onOrganizationsLoaded?: (organizations: Array<{name: string; displayName: string}>) => void}) {
  const mockReact = require("react") as {useEffect: (effect: () => void, deps?: unknown[]) => void};
  mockReact.useEffect(() => {
    props.onOrganizationsLoaded?.([
      {name: "built-in", displayName: "Built-in Organization"},
      {name: "engineering", displayName: "测试组织"},
      {name: "wecom-occupied", displayName: "WeCom Occupied"},
      {name: "support", displayName: "Support"},
    ]);
  }, [props.onOrganizationsLoaded]);
  const organizations = [
    {value: "built-in", label: "Built-in Organization"},
    {value: "engineering", label: "engineering"},
    {value: "wecom-occupied", label: "wecom-occupied"},
    {value: "support", label: "support"},
  ].filter(organization => !(props.excludedOrganizations || []).includes(organization.value));
  return (
    <select aria-label="organization-select" value={props.initValue || ""} onChange={event => props.onChange?.(event.target.value)}>
      {organizations.map(organization => <option key={organization.value} value={organization.value}>{organization.label}</option>)}
    </select>
  );
});

type LooseMock = {
  (...args: unknown[]): unknown;
  mockResolvedValue: (value: unknown) => LooseMock;
  mockResolvedValueOnce: (value: unknown) => LooseMock;
  mockRejectedValueOnce: (value: unknown) => LooseMock;
};
type FeishuBackendMock = Record<keyof typeof FeishuOrganizationSyncBackend, LooseMock>;
type WecomBackendMock = Record<keyof typeof WecomOrganizationSyncBackend, LooseMock>;
type OrganizationBackendMock = Record<keyof typeof OrganizationBackend, LooseMock>;

const feishuBackendMock = FeishuOrganizationSyncBackend as unknown as FeishuBackendMock;
const wecomBackendMock = WecomOrganizationSyncBackend as unknown as WecomBackendMock;
const organizationBackendMock = OrganizationBackend as unknown as OrganizationBackendMock;
const {fireEvent, screen} = require("@testing-library/react") as {
  fireEvent: {
    click: (element: Element | null) => boolean;
    change: (element: Element | null, event: unknown) => boolean;
    keyDown: (element: Element | null, event: unknown) => boolean;
  };
  screen: {
    findByText: (text: string | RegExp) => Promise<HTMLElement>;
    getByText: (text: string | RegExp) => HTMLElement;
    getAllByText: (text: string | RegExp) => HTMLElement[];
    queryByText: (text: string | RegExp) => HTMLElement | null;
    getByAltText: (text: string | RegExp) => HTMLElement;
    getByLabelText: (text: string | RegExp) => HTMLElement;
    getByDisplayValue: (text: string | RegExp) => HTMLElement;
    queryByDisplayValue: (text: string | RegExp) => HTMLElement | null;
    getByRole: (role: string, options?: {name?: string | RegExp}) => HTMLElement;
    queryByRole: (role: string, options?: {name?: string | RegExp}) => HTMLElement | null;
    findAllByText: (text: string | RegExp) => Promise<HTMLElement[]>;
  };
};

const mockMatchMedia = (query: string): MediaQueryList => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: jestValue.fn(),
  removeListener: jestValue.fn(),
  addEventListener: jestValue.fn(),
  removeEventListener: jestValue.fn(),
  dispatchEvent: jestValue.fn(),
} as unknown as MediaQueryList);

beforeEach(() => {
  consoleErrorSpy = jestValue.spyOn(console, "error") as unknown as ConsoleCallSpy;
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: mockMatchMedia,
  });
  localStorage.removeItem("feishu-org-sync:lastOrganization");
  jestValue.spyOn(Setting, "showMessage").mockImplementation(() => {});
  jestValue.spyOn(Setting, "getRandomName").mockReturnValue("abc123");
  organizationBackendMock.addOrganization.mockResolvedValue({status: "ok"});
  organizationBackendMock.updateOrganization.mockResolvedValue({status: "ok"});
  organizationBackendMock.deleteOrganization.mockResolvedValue({status: "ok"});
  feishuBackendMock.getFeishuOrganizationSyncConfig.mockResolvedValue({
    status: "ok",
    data: {
      organization: "engineering",
      defaultOrganization: "engineering",
      config: {
        organization: "engineering",
        appId: "cli_123",
        appSecret: "***",
        endpointMode: "feishu",
        isEnabled: true,
        softDisableMissingData: true,
      },
    },
  });
  wecomBackendMock.getWecomOrganizationSyncConfig.mockResolvedValue({status: "ok", data: {config: null}});
  feishuBackendMock.getFeishuOrganizationSyncRuns.mockResolvedValue({status: "ok", data: [], data2: 0});
  feishuBackendMock.getFeishuOrganizationSyncDryRunHistories.mockResolvedValue({
    status: "ok",
    data: [{
      name: "history-1",
      status: "failed",
      createdAt: "2026-06-15T10:10:00Z",
      appAlias: "app-history",
      tenantAlias: "tenant-history",
      snapshotDepartmentCount: 1,
      snapshotUserCount: 2,
      snapshotMembershipCount: 3,
      departmentToCreate: 1,
      userToUpdate: 2,
      membershipToSoftDisable: 1,
      diagnosticAlias: "contact_permission_missing",
      safeSummary: "permission denied user_id=***",
      retentionDays: 90,
      redactionApplied: true,
      redactionVersion: "feishu-dry-run-history-redaction-v1",
    }],
  });
  feishuBackendMock.getFeishuOrganizationSyncDryRunHistory.mockResolvedValue({
    status: "ok",
    data: {
      name: "history-1",
      status: "failed",
      createdAt: "2026-06-15T10:10:00Z",
      appAlias: "app-history",
      tenantAlias: "tenant-history",
      requestMarker: "request-abcdef",
      operatorHash: "operator-abcdef",
      reasonCounts: {contact_permission_missing: 1},
      diagnostics: {
        failedStage: "tenant_token",
        failureCategory: "permission",
        retryReadiness: "not_ready",
        operatorAction: "grant_contact_scope",
        safeSummary: "permission denied user_id=***",
      },
      safeSummary: "permission denied user_id=***",
      retentionDays: 90,
      redactionApplied: true,
      redactionVersion: "feishu-dry-run-history-redaction-v1",
    },
  });
  feishuBackendMock.getFeishuOrganizationSyncUserBindingConflicts.mockResolvedValue({
    status: "ok",
    data: {
      organization: "engineering",
      status: "blocked",
      riskLevel: "critical",
      sourceConnectionIdHash: "source-abcdef",
      configured: true,
      enabled: true,
      endpointMode: "feishu",
      appAlias: "app-safe",
      tenantAlias: "tenant-safe",
      counts: {
        total: 1,
        duplicateUserIdBinding: 1,
        localUserMultiTenant: 0,
        legacyIdentifierSplit: 0,
        missingTenantKey: 0,
        endpointModeMismatch: 0,
      },
      issues: [{
        id: "binding-1",
        type: "duplicate_user_id_binding",
        riskLevel: "critical",
        safeSummary: "同一飞书 user_id 命中多个本地用户 user_id=***",
        recommendedAction: "confirm_primary_user",
        blockedReason: "duplicate_user_id_binding_blocks_safe_sync",
        sourceConnectionIdHash: "source-abcdef",
        stableHashes: {issue: "issue-abcdef"},
        sampleAliases: ["sample-a", "sample-b"],
        latestRun: {id: "run-1", status: "failed", createdAt: "2026-06-15T11:00:00Z"},
        latestDryRunHistory: {id: "history-1", status: "failed", createdAt: "2026-06-15T10:10:00Z"},
      }],
      latestRun: {id: "run-1", status: "failed", createdAt: "2026-06-15T11:00:00Z"},
      latestDryRunHistory: {id: "history-1", status: "failed", createdAt: "2026-06-15T10:10:00Z"},
      redaction: {applied: true, version: "feishu-user-binding-conflict-redaction-v1"},
      generatedAt: "2026-06-15T12:00:00Z",
      safeSummary: "发现 1 个飞书用户绑定风险，最高风险级别为 critical，建议先处理后再正式同步。",
    },
  });
  feishuBackendMock.getFeishuOrganizationSyncHandoffEvidence.mockResolvedValue({
    status: "ok",
    data: {
      organization: "engineering",
      evidenceVersion: "feishu-org-sync-handoff-evidence-v1",
      sourceType: "dry_run_history",
      sourceIdHash: "dry-run-safe",
      sourceStatus: "succeeded",
      endpointMode: "feishu",
      appAlias: "app-safe",
      tenantAlias: "tenant-safe",
      sourceConnectionIdHash: "source-safe",
      readiness: "ready",
      counts: {
        departments: {toCreate: 1, toUpdate: 1, toSoftDisable: 0, conflict: 0, invalid: 0},
        users: {toCreate: 2, toUpdate: 0, toSoftDisable: 1, conflict: 0, invalid: 0},
        memberships: {toCreate: 3, toUpdate: 0, toSoftDisable: 0, conflict: 0, invalid: 0},
      },
      bindingConflicts: {
        status: "ok",
        riskLevel: "none",
        blocked: false,
        total: 0,
        safeSummary: "未发现阻断级飞书用户绑定风险。",
      },
      blockedReasons: [],
      operatorNextActions: ["export_evidence_json"],
      cannotInfer: ["live_contact_v3_credentials"],
      redaction: {applied: true, version: "feishu-handoff-evidence-redaction-v1"},
      acceptanceChecklist: {
        version: "feishu-handoff-acceptance-checklist-v1",
        executionMode: "manual_review_only",
        manualReviewOnly: true,
        safeSource: {
          sourceType: "dry_run_history",
          sourceIdHash: "dry-run-safe",
          sourceConnectionIdHash: "source-safe",
          readiness: "ready",
          endpointMode: "feishu",
          appAlias: "app-safe",
          tenantAlias: "tenant-safe",
        },
        summary: {
          total: 6,
          passed: 4,
          needsReview: 0,
          blocked: 0,
          missing: 0,
          cannotInfer: 2,
          safeSummary: "交接证据已就绪，可复制或导出脱敏 JSON 供真实租户测试和验收交接。",
          derivedOnly: true,
          noFallback: true,
          providerGaps: 4,
          manualActions: 3,
        },
        items: [
          {id: "redaction", status: "passed", severity: "info", source: "admin_local_metadata", safeSummary: "仅包含安全别名和聚合计数。", manualReviewOnly: true},
          {id: "provider_truth", status: "cannot_infer", severity: "review", source: "external_owner_required", safeSummary: "Provider tenant truth requires live validation.", recommendedActionAlias: "validate_real_tenant_runtime", providerOwned: true, manualReviewOnly: true, cannotInfer: true, noFallback: true},
        ],
        providerOwnedEvidenceMissing: ["live_contact_v3_credentials", "gateway_projection_consumption", "production_readiness"],
        manualReviewActions: ["validate_real_tenant_runtime", "copy_acceptance_checklist_json", "export_acceptance_checklist_markdown"],
        cannotInfer: ["provider_truth", "sync_full_success", "production_readiness"],
        noFallback: ["provider_truth", "production_readiness"],
        redaction: {applied: true, version: "feishu-handoff-evidence-redaction-v1"},
        retention: {redactionApplied: true, redactionVersion: "feishu-handoff-evidence-redaction-v1", retentionDays: 90, retentionPolicy: "redacted_summary_retained"},
      },
      generatedAt: "2026-06-15T12:30:00Z",
      safeSummary: "交接证据已就绪，可复制或导出脱敏 JSON 供真实租户测试和验收交接。",
    },
  });
  feishuBackendMock.dryRunFeishuOrganizationSyncPreview.mockResolvedValue({
    status: "ok",
    data: {
      status: "succeeded",
      source: {appAlias: "app-abc", tenantAlias: "tenant-def", previewedAt: "2026-06-15T10:00:00Z"},
      snapshotStats: {departmentCount: 2, userCount: 3, membershipCount: 4},
      diff: {
        departments: {toCreate: 1, toUpdate: 1, toSoftDisable: 0, unchanged: 0, conflict: 0, invalid: 0},
        users: {toCreate: 2, toUpdate: 0, toSoftDisable: 1, unchanged: 0, conflict: 0, invalid: 0},
        memberships: {toCreate: 3, toUpdate: 0, toSoftDisable: 1, unchanged: 1, conflict: 0, invalid: 0},
      },
      reasonCounts: {would_soft_disable: 2},
      diagnostics: {safeSummary: "preview completed"},
    },
  });
});

afterEach(() => {
  const actWarnings = getReactActWarnings(consoleErrorSpy.mock.calls);
  consoleErrorSpy.mockRestore();
  jestValue.restoreAllMocks();
  jestValue.clearAllMocks();
  expect(actWarnings).toEqual([]);
});

async function flushPromises() {
  await act(async() => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

test("restores configured Feishu organization when account owner is built-in", async() => {
  render(<FeishuOrganizationSyncPage account={{owner: "built-in"}} />);

  expect(await screen.findByText("飞书组织架构同步")).toBeInTheDocument();
  expect(await screen.findByText("同步目标组织")).toBeInTheDocument();
  expect(screen.getByText("新建组织")).toBeInTheDocument();
  expect(screen.getByDisplayValue("cli_123")).toBeInTheDocument();
  expect(screen.getByDisplayValue("cli_123")).toHaveAttribute("name", "feishu-organization-sync-app-id");
  expect(screen.getByDisplayValue("cli_123")).toHaveAttribute("autocomplete", "off");
  expect(document.querySelector("input[name='feishu-organization-sync-app-secret']")).toHaveAttribute("autocomplete", "new-password");
  expect(feishuBackendMock.getFeishuOrganizationSyncConfig).toHaveBeenCalledWith("");
  expect(feishuBackendMock.getFeishuOrganizationSyncRuns).toHaveBeenCalledWith("engineering", 1, 10);
});

test("opens an unsaved organization draft when creating Feishu sync target organization", async() => {
  const history = {push: jestValue.fn()};
  const dispatchEventSpy = jestValue.spyOn(window, "dispatchEvent");
  render(<FeishuOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} history={history} />);

  fireEvent.click(await screen.findByText("新建组织"));
  await flushPromises();

  expect(organizationBackendMock.addOrganization).not.toHaveBeenCalled();
  expect(organizationBackendMock.updateOrganization).not.toHaveBeenCalled();
  expect(organizationBackendMock.deleteOrganization).not.toHaveBeenCalled();
  expect(Setting.showMessage).not.toHaveBeenCalled();
  expect(dispatchEventSpy).not.toHaveBeenCalledWith(expect.objectContaining({type: "storageOrganizationsChanged"}));
  expect(history.push).toHaveBeenCalledWith({
    pathname: "/organizations/organization_abc123",
    state: {
      mode: "add",
      organization: expect.objectContaining({
        owner: "admin",
        name: "organization_abc123",
        displayName: "New Organization - abc123",
        passwordType: "bcrypt",
        countryCodes: ["US"],
      }),
    },
  });
});

test("shows source conflict warning and disables saving or enabling Feishu full sync", async() => {
  feishuBackendMock.getFeishuOrganizationSyncConfig.mockResolvedValue({
    status: "ok",
    data: {
      organization: "engineering",
      defaultOrganization: "engineering",
      conflictingProvider: "WeCom",
      conflictingOrganization: "engineering",
      conflictingConfigured: true,
      conflictingEnabled: true,
      conflictingOrganizations: ["engineering"],
      config: {
        organization: "engineering",
        appId: "cli_123",
        appSecret: "***",
        endpointMode: "feishu",
        isEnabled: false,
        softDisableMissingData: true,
      },
    },
  });

  render(<FeishuOrganizationSyncPage account={{owner: "engineering"}} />);

  expect(await screen.findByText("WeCom 已选择为当前组织的通讯录同步来源")).toBeInTheDocument();
  expect(await screen.findByText(/当前组织 测试组织 已被 WeCom 占用/)).toBeInTheDocument();
  expect(screen.queryByText(/当前组织 engineering 已被 WeCom 占用/)).not.toBeInTheDocument();
  const enableSwitch = screen.getByText("启用同步").closest(".ant-space")?.querySelector("button") || null;
  expect(enableSwitch).toBeDisabled();
  expect(screen.getByText("开始全量同步").closest("button")).toBeDisabled();
  expect(screen.getByText("保存").closest("button")).toBeDisabled();
});

test("keeps already-enabled Feishu source read-only when another source occupies organization", async() => {
  feishuBackendMock.getFeishuOrganizationSyncConfig.mockResolvedValue({
    status: "ok",
    data: {
      organization: "engineering",
      defaultOrganization: "engineering",
      conflictingProvider: "WeCom",
      conflictingOrganization: "engineering",
      conflictingConfigured: true,
      conflictingEnabled: true,
      conflictingOrganizations: ["engineering"],
      config: {
        organization: "engineering",
        appId: "cli_123",
        appSecret: "***",
        endpointMode: "feishu",
        isEnabled: true,
        softDisableMissingData: true,
      },
    },
  });

  render(<FeishuOrganizationSyncPage account={{owner: "engineering"}} />);

  expect(await screen.findByText("WeCom 已选择为当前组织的通讯录同步来源")).toBeInTheDocument();
  const enableSwitch = screen.getByText("启用同步").closest(".ant-space")?.querySelector("button") || null;
  const saveButton = document.querySelector(".organization-sync-action-bar button");
  expect(enableSwitch).toBeDisabled();
  expect(saveButton).toBeDisabled();
  expect(feishuBackendMock.saveFeishuOrganizationSyncConfig).not.toHaveBeenCalled();
});

test("detects WeCom conflict from legacy backend response without source status", async() => {
  feishuBackendMock.getFeishuOrganizationSyncConfig.mockResolvedValue({
    status: "ok",
    data: {
      organization: "engineering",
      config: {
        organization: "engineering",
        appId: "cli_123",
        appSecret: "***",
        endpointMode: "feishu",
        isEnabled: false,
      },
    },
  });
  wecomBackendMock.getWecomOrganizationSyncConfig.mockResolvedValue({
    status: "ok",
    data: {
      config: {
        organization: "engineering",
        isEnabled: false,
      },
    },
  });

  render(<FeishuOrganizationSyncPage account={{owner: "engineering"}} />);

  expect(await screen.findByText("WeCom 已选择为当前组织的通讯录同步来源")).toBeInTheDocument();
  expect(screen.getByText(/已被 WeCom 占用/)).toBeInTheDocument();
});

test("filters organizations occupied by WeCom from the sync target selector", async() => {
  feishuBackendMock.getFeishuOrganizationSyncConfig.mockResolvedValue({
    status: "ok",
    data: {
      organization: "engineering",
      defaultOrganization: "engineering",
      conflictingOrganizations: ["wecom-occupied"],
      config: {
        organization: "engineering",
        appId: "cli_123",
        appSecret: "***",
        endpointMode: "feishu",
        isEnabled: false,
        softDisableMissingData: true,
      },
    },
  });

  render(<FeishuOrganizationSyncPage account={{owner: "engineering"}} />);

  expect(await screen.findByText("飞书组织架构同步")).toBeInTheDocument();
  expect(screen.getByText("engineering")).toBeInTheDocument();
  expect(screen.queryByText("wecom-occupied")).not.toBeInTheDocument();
  expect(screen.getByText("support")).toBeInTheDocument();
  expect(screen.queryByText("WeCom 已选择为当前组织的通讯录同步来源")).not.toBeInTheDocument();
  expect(screen.getByText("保存").closest("button")).not.toBeDisabled();
});

type TestStatePatch = Record<string, unknown> | ((state: Record<string, unknown>) => Record<string, unknown> | null) | null;
type FeishuPageHarness = FeishuOrganizationSyncPage & {
  state: Record<string, unknown>;
  setState: (patch: TestStatePatch, callback?: () => void) => void;
  refresh: (organization: string) => unknown;
};

function createFeishuPageHarness(): FeishuPageHarness {
  const page = new FeishuOrganizationSyncPage({account: {owner: "engineering", isAdmin: true}});
  const pageState = page as unknown as {state: Record<string, unknown>};
  pageState.state = {
    ...pageState.state,
    organization: "engineering",
    config: page.normalizeConfig("engineering", null),
    pagination: {current: 1, pageSize: 10, total: 0},
  };
  Object.defineProperty(page, "setState", {
    configurable: true,
    value: (patch: TestStatePatch, callback?: () => void) => {
      const nextPatch = typeof patch === "function" ? patch(pageState.state) : patch;
      if (nextPatch !== null) {
        pageState.state = {...pageState.state, ...nextPatch};
      }
      callback?.();
    },
  });
  return page as unknown as FeishuPageHarness;
}

test("renders Feishu organization sync config and endpoint mode", async() => {
  const {container} = render(<FeishuOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);

  expect(await screen.findByText("飞书组织架构同步")).toBeInTheDocument();
  expect(screen.getByAltText("Feishu/Lark provider logo")).toHaveAttribute("src", expect.stringContaining("/img/social_lark.png"));
  expect(feishuBackendMock.getFeishuOrganizationSyncConfig).toHaveBeenCalledWith("engineering");
  expect(screen.getByText("飞书组织架构同步")).toBeInTheDocument();
  expect(screen.getByText("服务区域")).toBeInTheDocument();
  expect(screen.getByText("飞书（中国大陆）")).toBeInTheDocument();
  expect(screen.getByText("未启用定时同步")).toBeInTheDocument();
  expect(screen.queryByText("Cron 表达式")).not.toBeInTheDocument();
  expect(screen.queryByText("时区")).not.toBeInTheDocument();
  expect(screen.getByDisplayValue("cli_123")).toBeInTheDocument();
  const permissionAlert = container.querySelector(".organization-sync-permission-alert");
  const permissionAlertRow = permissionAlert?.closest(".organization-sync-permission-alert-row");
  expect(permissionAlert).not.toBeNull();
  expect(permissionAlertRow).not.toBeNull();
  expect(permissionAlertRow?.classList.contains("ant-col-24")).toBe(true);
});

test("expands Feishu schedule fields only after enabling scheduled sync", async() => {
  render(<FeishuOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);

  expect(await screen.findByText("定时同步")).toBeInTheDocument();
  expect(screen.queryByDisplayValue("0 2 * * *")).not.toBeInTheDocument();

  const scheduleSwitch = screen.getByText("启用定时同步").closest(".ant-space")?.querySelector("button");
  fireEvent.click(scheduleSwitch || null);

  expect(screen.getByText("Cron 表达式")).toBeInTheDocument();
  expect(screen.getByText("时区")).toBeInTheDocument();
});

test("renders Feishu scheduled sync details after enabling schedule", async() => {
  feishuBackendMock.getFeishuOrganizationSyncConfig.mockResolvedValueOnce({
    status: "ok",
    data: {
      config: {
        organization: "engineering",
        appId: "cli_123",
        appSecret: "***",
        endpointMode: "feishu",
        isEnabled: true,
        softDisableMissingData: true,
        scheduleEnabled: true,
        scheduleCron: "0 2 * * *",
        scheduleTimezone: "Asia/Shanghai",
        scheduleLastFireAt: "2026-06-15T10:00:00Z",
        scheduleLastStatus: "failed",
        scheduleLastErrorText: "network timeout",
      },
    },
  });

  render(<FeishuOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);

  expect(await screen.findByText("定时同步")).toBeInTheDocument();
  expect(screen.queryByText("未启用定时同步")).not.toBeInTheDocument();
  expect(screen.getByText("Cron 表达式")).toBeInTheDocument();
  expect(screen.getByText("时区")).toBeInTheDocument();
  expect(screen.getByText(/最近调度：/)).toBeInTheDocument();
  expect(screen.getByText("最近结果：failed，network timeout")).toBeInTheDocument();
});

test("renders run diagnostics with compact labels and redacted summary", async() => {
  feishuBackendMock.getFeishuOrganizationSyncRuns.mockResolvedValue({
    status: "ok",
    data: [{
      name: "run-failed",
      status: "failed",
      stage: "fetching",
      triggerType: "scheduled",
      diagnostics: {
        failedStage: "tenant_token",
        failureCategory: "credentials",
        retryReadiness: "not_ready",
        operatorAction: "fix_credentials",
        safeSummary: "invalid app credentials user_id=*** *** ***",
        durationMs: 125000,
        stats: {
          departmentCount: 3,
          userCount: 5,
          membershipCount: 7,
          disabledCount: 1,
        },
      },
      errorText: "tenant_access_token open_id=<redacted-open-id> email=<redacted-email> phone=<redacted-phone>",
    }],
    data2: 1,
  });

  render(<FeishuOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);

  expect(await screen.findByText("失败")).toBeInTheDocument();
  expect(screen.getByText("序号")).toBeInTheDocument();
  expect(screen.queryByText("运行 ID")).not.toBeInTheDocument();
  expect(screen.queryByText("run-failed")).not.toBeInTheDocument();
  expect(screen.getByText("凭证")).toBeInTheDocument();
  expect(screen.getByText("租户 token")).toBeInTheDocument();
  expect(screen.getByText("修凭证")).toBeInTheDocument();
  expect(screen.getByText("部 3 / 人 5 / 关系 7 / 禁 1")).toBeInTheDocument();
  expect(screen.getByText("2 分 5 秒")).toBeInTheDocument();
  expect(screen.getByText("invalid app credentials user_id=*** *** ***")).toBeInTheDocument();
  expect(screen.queryByText(/open_1/)).not.toBeInTheDocument();
  expect(screen.queryByText(/raw-email-sentinel/)).not.toBeInTheDocument();
  expect(screen.queryByText(/raw-phone-sentinel/)).not.toBeInTheDocument();
});

test("runs dry-run preview and renders compact diff summary", async() => {
  render(<FeishuOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);

  fireEvent.click(await screen.findByText("预览影响"));

  expect(feishuBackendMock.dryRunFeishuOrganizationSyncPreview).toHaveBeenCalledWith("engineering");
  expect(await screen.findByText("Dry-run 预览")).toBeInTheDocument();
  expect(screen.getByText("app-abc / tenant-def")).toBeInTheDocument();
  expect(screen.getAllByText(/预览时间/).length).toBeGreaterThan(0);
  expect(screen.getByText("部门 2 / 用户 3 / 关系 4")).toBeInTheDocument();
  expect(screen.getByText("新增 1 / 更新 1 / 软禁 0")).toBeInTheDocument();
  expect(screen.getByText("新增 2 / 更新 0 / 软禁 1")).toBeInTheDocument();
  expect(screen.getByText("将软禁缺失数据: 2")).toBeInTheDocument();
  expect(screen.queryByText("新增 1 / 更新 1 / 软禁 0 / 冲突 0 / 无效 0")).not.toBeInTheDocument();
});

test("renders dry-run reason counts with safe Chinese labels", async() => {
  feishuBackendMock.dryRunFeishuOrganizationSyncPreview.mockResolvedValueOnce({
    status: "ok",
    data: {
      status: "succeeded",
      source: {appAlias: "app-abc", tenantAlias: "tenant-def", previewedAt: "2026-06-15T10:00:00Z"},
      snapshotStats: {departmentCount: 0, userCount: 56, membershipCount: 56},
      diff: {
        departments: {toCreate: 0, toUpdate: 0, toSoftDisable: 0, unchanged: 0, conflict: 0, invalid: 0},
        users: {toCreate: 0, toUpdate: 56, toSoftDisable: 0, unchanged: 0, conflict: 0, invalid: 0},
        memberships: {toCreate: 0, toUpdate: 0, toSoftDisable: 0, unchanged: 0, conflict: 0, invalid: 56},
      },
      reasonCounts: {unmapped_department: 56},
      diagnostics: {safeSummary: "preview completed"},
    },
  });
  render(<FeishuOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);

  fireEvent.click(await screen.findByText("预览影响"));

  expect(await screen.findByText("成员所属部门未返回: 56")).toBeInTheDocument();
  expect(screen.queryByText(/unmapped_department/)).not.toBeInTheDocument();
});

test("opens dry-run history modal and safe detail modal", async() => {
  render(<FeishuOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);

  expect(await screen.findByText("查看预览历史")).toBeInTheDocument();
  expect(screen.queryByText(/最近 1 次 dry-run 预览/)).not.toBeInTheDocument();
  expect(screen.queryByText("history-1")).not.toBeInTheDocument();

  fireEvent.click(screen.getByText("查看预览历史"));

  expect(screen.getByRole("dialog", {name: "Dry-run 历史"})).toBeInTheDocument();
  expect(screen.getByText("history-1")).toBeInTheDocument();
  expect(screen.getByText("通讯录权限不足")).toBeInTheDocument();
  expect(screen.getByText("permission denied user_id=***")).toBeInTheDocument();

  fireEvent.click(screen.getByLabelText("dry-run-history-detail-history-1"));

  expect(feishuBackendMock.getFeishuOrganizationSyncDryRunHistory).toHaveBeenCalledWith("engineering", "history-1");
  expect(await screen.findByText("Dry-run 详情")).toBeInTheDocument();
  expect(screen.getByText(/request-abcdef/)).toBeInTheDocument();
  expect(screen.getByText(/operator-abcdef/)).toBeInTheDocument();
  expect(screen.getByText("通讯录权限不足: 1")).toBeInTheDocument();
  expect(screen.queryByText(/raw-email-sentinel/)).not.toBeInTheDocument();
  expect(screen.queryByText(/raw-phone-sentinel/)).not.toBeInTheDocument();
});

test("renders user binding diagnostics and opens redacted detail drawer", async() => {
  render(<FeishuOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);

  expect(await screen.findByText("绑定冲突 / 身份匹配诊断")).toBeInTheDocument();
  expect(feishuBackendMock.getFeishuOrganizationSyncUserBindingConflicts).toHaveBeenCalledWith("engineering", {limit: 20});
  expect(screen.getByText("阻断")).toBeInTheDocument();
  expect(screen.getAllByText("严重").length).toBeGreaterThan(0);
  expect(screen.getByText("查看冲突详情")).toBeInTheDocument();
  expect(screen.getByText("已收起 1 条脱敏诊断详情")).toBeInTheDocument();
  expect(screen.queryByText("sample-a")).not.toBeInTheDocument();

  fireEvent.click(screen.getByLabelText("toggle-binding-diagnostics-issues"));

  expect(screen.getByText("user_id 多用户")).toBeInTheDocument();
  expect(screen.getByText("确认主账号")).toBeInTheDocument();
  expect(screen.getByText("sample-a")).toBeInTheDocument();
  expect(screen.queryByText(/raw-email-sentinel/)).not.toBeInTheDocument();

  fireEvent.click(screen.getByLabelText("binding-diagnostics-detail-binding-1"));

  expect(await screen.findByText("绑定诊断详情")).toBeInTheDocument();
  expect(screen.getAllByText(/duplicate_user_id_binding_blocks_safe_sync/).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/source-abcdef/).length).toBeGreaterThan(0);
  expect(screen.queryByText(/ou-shared/)).not.toBeInTheDocument();
});

test("renders healthy user binding diagnostics as a compact row", async() => {
  feishuBackendMock.getFeishuOrganizationSyncUserBindingConflicts.mockResolvedValue({
    status: "ok",
    data: {
      organization: "engineering",
      status: "ok",
      riskLevel: "none",
      configured: true,
      enabled: true,
      counts: {total: 0},
      issues: [],
      generatedAt: "2026-06-15T12:00:00Z",
      safeSummary: "未发现阻断级飞书用户绑定风险。",
      redaction: {applied: true, version: "feishu-user-binding-conflict-redaction-v1"},
    },
  });

  render(<FeishuOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);

  expect(await screen.findByText("身份匹配：正常")).toBeInTheDocument();
  expect(screen.getAllByText("未发现阻断级飞书用户绑定风险。").length).toBeGreaterThan(0);
  expect(screen.queryByText("绑定冲突 / 身份匹配诊断")).not.toBeInTheDocument();
  expect(screen.queryByText("无风险")).not.toBeInTheDocument();
});

test("renders handoff evidence ready summary in a centered modal", async() => {
  const {container} = render(<FeishuOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);

  expect(await screen.findByText("交接资料")).toBeInTheDocument();
  expect(feishuBackendMock.getFeishuOrganizationSyncHandoffEvidence).toHaveBeenCalledWith("engineering", {sourceType: "latest"});
  expect(screen.getByText("可交接")).toBeInTheDocument();
  expect(screen.queryByText("部门：新 1 / 更 1 / 软禁 0 / 冲突 0 / 无效 0")).not.toBeInTheDocument();
  expect(screen.getByText("查看验收资料")).toBeInTheDocument();
  expect(container.querySelector(".ant-alert-success")).not.toBeInTheDocument();
  expect(screen.queryByText("dry-run-safe")).not.toBeInTheDocument();
  expect(screen.queryByText("source-safe")).not.toBeInTheDocument();
  expect(screen.queryByText("live_contact_v3_credentials")).not.toBeInTheDocument();
  expect(screen.queryByText("provider_truth")).not.toBeInTheDocument();
  expect(screen.queryByText("production_readiness")).not.toBeInTheDocument();
  fireEvent.click(screen.getByLabelText("toggle-handoff-evidence-details"));
  expect(screen.getByText("验收资料")).toBeInTheDocument();
  expect(document.body.querySelector(".ant-drawer")).not.toBeInTheDocument();
  expect(document.body.querySelector(".ant-modal")).toBeInTheDocument();
  expect(screen.getByText("验收清单")).toBeInTheDocument();
  expect(screen.getByText("交接资料已就绪，完整审计清单保留在导出的 JSON / Markdown 中。")).toBeInTheDocument();
  expect(screen.getByLabelText("copy-handoff-acceptance-checklist-json")).toBeInTheDocument();
  expect(screen.getByLabelText("export-handoff-acceptance-checklist-markdown")).toBeInTheDocument();
  expect(screen.queryByText("真实租户运行验证")).not.toBeInTheDocument();
  expect(screen.queryByText("飞书通讯录权限需真实验证")).not.toBeInTheDocument();
  expect(screen.queryByText("生产就绪需人工确认")).not.toBeInTheDocument();
  expect(screen.queryByText("详细清单和安全别名")).not.toBeInTheDocument();
  expect(screen.queryByText("dry-run-safe")).not.toBeInTheDocument();
  expect(screen.queryByText("source-safe")).not.toBeInTheDocument();
  expect(screen.queryByText("manual_review_only")).not.toBeInTheDocument();
  expect(screen.queryByText("provider_truth")).not.toBeInTheDocument();
  expect(screen.queryByText("production_readiness")).not.toBeInTheDocument();
  expect(screen.queryByText("validate_real_tenant_runtime")).not.toBeInTheDocument();
  expect(screen.queryByText(/cli-real/)).not.toBeInTheDocument();
  expect(screen.queryByText(/tenant-real/)).not.toBeInTheDocument();
});

test("renders running handoff evidence as non-blocking compact status", async() => {
  feishuBackendMock.getFeishuOrganizationSyncUserBindingConflicts.mockResolvedValue({
    status: "ok",
    data: {
      organization: "engineering",
      status: "ok",
      riskLevel: "none",
      configured: true,
      enabled: true,
      counts: {total: 0},
      issues: [],
      generatedAt: "2026-06-15T12:00:00Z",
      safeSummary: "未发现阻断级飞书用户绑定风险。",
      redaction: {applied: true, version: "feishu-user-binding-conflict-redaction-v1"},
    },
  });
  feishuBackendMock.getFeishuOrganizationSyncHandoffEvidence.mockResolvedValue({
    status: "ok",
    data: {
      organization: "engineering",
      evidenceVersion: "feishu-org-sync-handoff-evidence-v1",
      sourceType: "run",
      sourceIdHash: "run-safe",
      sourceStatus: "running",
      readiness: "running",
      counts: {
        departments: {toCreate: 0, toUpdate: 0, toSoftDisable: 0, conflict: 0, invalid: 0},
        users: {toCreate: 0, toUpdate: 0, toSoftDisable: 0, conflict: 0, invalid: 0},
        memberships: {toCreate: 0, toUpdate: 0, toSoftDisable: 0, conflict: 0, invalid: 0},
      },
      bindingConflicts: {status: "ok", riskLevel: "none", blocked: false, total: 0, safeSummary: "未发现阻断级飞书用户绑定风险。"},
      blockedReasons: [],
      operatorNextActions: ["wait_sync_completion", "refresh_handoff_evidence"],
      redaction: {applied: true, version: "feishu-handoff-evidence-redaction-v1"},
      acceptanceChecklist: {
        version: "feishu-handoff-acceptance-checklist-v1",
        summary: {total: 1, passed: 0, needsReview: 1, blocked: 0, missing: 0, cannotInfer: 0},
        items: [{id: "handoff_readiness", status: "needs_review", safeSummary: "同步任务正在运行，交接证据会在任务完成后更新。"}],
        manualReviewActions: ["wait_sync_completion"],
        retention: {redactionApplied: true, retentionDays: 90},
      },
      generatedAt: "2026-06-15T12:30:00Z",
      safeSummary: "同步任务正在运行，交接证据会在任务完成后更新。",
    },
  });
  const {container} = render(<FeishuOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);

  expect(await screen.findByText("同步中")).toBeInTheDocument();
  expect(screen.getByText("同步任务正在运行，交接资料会在任务完成后更新。")).toBeInTheDocument();
  expect(screen.queryByText(/阻断原因/)).not.toBeInTheDocument();
  expect(container.querySelector(".ant-alert-error")).not.toBeInTheDocument();
});

test("keeps dry-run history off the main page and opens it in a modal", async() => {
  render(<FeishuOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);

  expect(await screen.findByText("查看预览历史")).toBeInTheDocument();
  expect(screen.queryByText("最近 1 次 dry-run 预览")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", {name: /collapsed Dry-run 历史/})).not.toBeInTheDocument();
  expect(screen.queryByRole("columnheader", {name: "记录 ID"})).not.toBeInTheDocument();

  fireEvent.click(screen.getByText("查看预览历史"));

  expect(screen.getByRole("dialog", {name: "Dry-run 历史"})).toBeInTheDocument();
  expect(document.body.querySelector(".ant-drawer")).not.toBeInTheDocument();
  expect(screen.getByRole("columnheader", {name: "记录 ID"})).toBeInTheDocument();
  expect(screen.getByText("通讯录权限不足")).toBeInTheDocument();
  expect(screen.getByText("permission denied user_id=***")).toBeInTheDocument();
});

test("renders sync runs without forcing horizontal table scroll", async() => {
  const writeText = jestValue.fn((text: string) => Promise.resolve(text));
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {writeText},
  });
  feishuBackendMock.getFeishuOrganizationSyncRuns.mockResolvedValueOnce({
    status: "ok",
    data: [{
      name: "feishu-sync-run-1781681971079340586",
      status: "succeeded",
      triggerType: "manual",
      stage: "completed",
      actor: "built-in/aicodex-admin",
      startedAt: "2026-06-17T15:39:31Z",
      finishedAt: "2026-06-17T15:39:33Z",
      departmentCreatedCount: 0,
      departmentUpdatedCount: 0,
      departmentDisabledCount: 0,
      userCreatedCount: 0,
      userUpdatedCount: 56,
      userDisabledCount: 0,
      membershipUpdatedCount: 56,
    }],
    data2: 1,
  });
  const {container} = render(<FeishuOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);

  expect(await screen.findByText("同步记录")).toBeInTheDocument();
  expect(screen.queryByText("feishu-sync-run-1781681971079340586")).not.toBeInTheDocument();
  expect(screen.getByText("序号")).toBeInTheDocument();
  const runIndexCell = container.querySelector("tbody tr[data-row-key='feishu-sync-run-1781681971079340586'] td:first-child");
  expect(runIndexCell?.textContent).toBe("1");
  expect(container.querySelector(".ant-typography-copy")).not.toBeInTheDocument();
  const runIndexButton = runIndexCell?.querySelector("[role='button']") || null;
  fireEvent.click(runIndexButton);
  fireEvent.keyDown(runIndexButton, {key: " "});
  expect(writeText).toHaveBeenCalledWith("feishu-sync-run-1781681971079340586");
  expect(screen.queryByText("运行 ID")).not.toBeInTheDocument();
  expect(screen.getByText("触发方式")).toBeInTheDocument();
  expect(screen.getByText("部门")).toBeInTheDocument();
  expect(screen.getByText("用户")).toBeInTheDocument();
  expect(screen.getByText("关系")).toBeInTheDocument();
  expect(screen.getByText("错误摘要").closest("th")).toHaveStyle("white-space: nowrap");
  expect(screen.queryByText("影响统计")).not.toBeInTheDocument();
  expect(screen.queryByText("诊断 / 错误")).not.toBeInTheDocument();
  expect(screen.getByText("新 0 / 更 0 / 禁 0")).toBeInTheDocument();
  expect(screen.getAllByText("新 0 / 更 56 / 禁 0").length).toBeGreaterThan(1);
  const horizontallyScrollableTables = Array.from(container.querySelectorAll(".ant-table-content"))
    .filter(element => element.getAttribute("style")?.includes("overflow-x: auto"));
  expect(horizontallyScrollableTables).toHaveLength(0);
});

test("copies Feishu run ID through keyboard, fallback, and failure paths", async() => {
  const originalClipboard = navigator.clipboard;
  const originalExecCommand = document.execCommand;
  const page = new FeishuOrganizationSyncPage({account: {owner: "engineering", isAdmin: true}});
  const writeText = jestValue.fn((text: string) => Promise.resolve(text));

  try {
    page.copyRunId("");
    expect(Setting.showMessage).not.toHaveBeenCalled();

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {writeText},
    });

    const event = {key: "Enter", preventDefault: jestValue.fn()};
    page.handleRunIndexKeyDown(event as unknown as React.KeyboardEvent<HTMLElement>, "run-keyboard");

    expect(event.preventDefault).toHaveBeenCalled();
    expect(writeText).toHaveBeenCalledWith("run-keyboard");
    await flushPromises();
    expect(Setting.showMessage).toHaveBeenCalledWith("success", "已复制运行 ID");

    writeText.mockRejectedValueOnce(new Error("clipboard denied"));
    page.copyRunId("run-failed");
    await flushPromises();
    expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("复制失败："));

    const execCommand = jestValue.fn(() => true);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: execCommand,
    });

    page.copyRunId("run-fallback");

    expect(execCommand).toHaveBeenCalledWith("copy");
    expect(Setting.showMessage).toHaveBeenCalledWith("success", "已复制运行 ID");
  } finally {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: originalClipboard,
    });
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: originalExecCommand,
    });
  }
});

test("copies handoff evidence JSON without raw tenant identifiers", async() => {
  const writeText = jestValue.fn((text: string) => Promise.resolve(text));
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {writeText},
  });
  render(<FeishuOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);

  expect(await screen.findByText("交接资料")).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText("copy-handoff-evidence-json"));

  expect(writeText).toHaveBeenCalledTimes(1);
  const copied = writeText.mock.calls[0][0];
  expect(copied).toContain("dry-run-safe");
  expect(copied).toContain("source-safe");
  expect(copied).not.toContain("cli-real");
  expect(copied).not.toContain("tenant-real");
});

test("copies handoff acceptance checklist JSON and Markdown without raw tenant identifiers", async() => {
  const writeText = jestValue.fn((text: string) => Promise.resolve(text));
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {writeText},
  });
  render(<FeishuOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);

  expect(await screen.findByText("交接资料")).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText("toggle-handoff-evidence-details"));
  expect(screen.getByText("验收清单")).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText("copy-handoff-acceptance-checklist-json"));
  fireEvent.click(screen.getByLabelText("copy-handoff-acceptance-checklist-markdown"));

  expect(writeText).toHaveBeenCalledTimes(2);
  const copiedJson = writeText.mock.calls[0][0];
  const copiedMarkdown = writeText.mock.calls[1][0];
  expect(copiedJson).toContain("feishu-handoff-acceptance-checklist-v1");
  expect(copiedJson).toContain("source-safe");
  expect(copiedMarkdown).toContain("# Feishu Handoff Acceptance Checklist");
  expect(copiedMarkdown).toContain("provider_truth");
  expect(`${copiedJson}\n${copiedMarkdown}`).not.toContain("cli-real");
  expect(`${copiedJson}\n${copiedMarkdown}`).not.toContain("tenant-real");
});

test("exports handoff acceptance checklist JSON and Markdown", async() => {
  const createObjectURL = jestValue.fn(() => "blob:feishu-checklist");
  const revokeObjectURL = jestValue.fn();
  const clickSpy = jestValue.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: createObjectURL,
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: revokeObjectURL,
  });
  render(<FeishuOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);

  expect(await screen.findByText("交接资料")).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText("toggle-handoff-evidence-details"));
  expect(screen.getByText("验收清单")).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText("export-handoff-acceptance-checklist-json"));
  fireEvent.click(screen.getByLabelText("export-handoff-acceptance-checklist-markdown"));

  expect(createObjectURL).toHaveBeenCalledTimes(2);
  expect(revokeObjectURL).toHaveBeenCalledTimes(2);
  expect(clickSpy).toHaveBeenCalledTimes(2);
  clickSpy.mockRestore();
});

test("renders handoff evidence blocked and no-run states", async() => {
  feishuBackendMock.getFeishuOrganizationSyncHandoffEvidence.mockResolvedValueOnce({
    status: "ok",
    data: {
      readiness: "blocked",
      sourceType: "run",
      sourceIdHash: "run-safe",
      blockedReasons: ["sync_run_failed", "binding_conflict_blocked", "dry_run_diff_conflict_or_invalid"],
      operatorNextActions: ["inspect_sync_diagnostics", "review_dry_run_diff"],
      cannotInfer: ["insight_acceptance"],
      redaction: {applied: true, version: "feishu-handoff-evidence-redaction-v1"},
      acceptanceChecklist: {
        version: "feishu-handoff-acceptance-checklist-v1",
        executionMode: "manual_review_only",
        manualReviewOnly: true,
        safeSource: {sourceType: "run", sourceIdHash: "run-safe", readiness: "blocked"},
        summary: {total: 2, passed: 0, needsReview: 0, blocked: 1, missing: 0, cannotInfer: 1, derivedOnly: true, noFallback: true, providerGaps: 1, manualActions: 2},
        items: [
          {id: "handoff_readiness", status: "blocked", severity: "blocking", source: "admin_local_metadata", safeSummary: "交接证据存在 3 个阻断原因，需处理后再交接。", blockedReasonAlias: "sync_run_failed,binding_conflict_blocked,dry_run_diff_conflict_or_invalid", recommendedActionAlias: "review_dry_run_diff", manualReviewOnly: true},
          {id: "provider_truth", status: "cannot_infer", severity: "review", source: "external_owner_required", safeSummary: "Provider truth requires runtime validation.", recommendedActionAlias: "validate_real_tenant_runtime", providerOwned: true, manualReviewOnly: true, cannotInfer: true, noFallback: true},
        ],
        providerOwnedEvidenceMissing: ["insight_acceptance"],
        manualReviewActions: ["inspect_sync_diagnostics", "review_dry_run_diff"],
        cannotInfer: ["provider_truth"],
        noFallback: ["production_readiness"],
        retention: {redactionApplied: true, retentionDays: 90, retentionPolicy: "redacted_summary_retained"},
      },
      generatedAt: "2026-06-15T12:30:00Z",
      safeSummary: "交接证据存在 3 个阻断原因，需处理后再交接。",
    },
  });
  render(<FeishuOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);

  expect((await screen.findAllByText("交接资料存在 3 个阻断原因，需处理后再交接。")).length).toBeGreaterThan(0);
  expect(screen.queryByText("sync_run_failed")).not.toBeInTheDocument();
  expect(screen.queryByText("dry_run_diff_conflict_or_invalid")).not.toBeInTheDocument();
  expect(screen.getByText("查看验收资料")).toBeInTheDocument();
  fireEvent.click(screen.getByText("查看验收资料"));
  expect(screen.getByText("预览影响存在冲突或无效关系")).toBeInTheDocument();
  expect(screen.getAllByText("复核预览影响").length).toBeGreaterThan(0);
  expect(screen.queryByText("review_dry_run_diff")).not.toBeInTheDocument();
  expect(screen.queryByText("dry_run_diff_conflict_or_invalid")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", {name: "Close"}));

  feishuBackendMock.getFeishuOrganizationSyncHandoffEvidence.mockResolvedValueOnce({
    status: "ok",
    data: {
      readiness: "no_run",
      blockedReasons: [],
      operatorNextActions: ["run_dry_run_preview"],
      cannotInfer: ["live_contact_v3_credentials"],
      redaction: {applied: true, version: "feishu-handoff-evidence-redaction-v1"},
      acceptanceChecklist: {
        version: "feishu-handoff-acceptance-checklist-v1",
        executionMode: "manual_review_only",
        manualReviewOnly: true,
        safeSource: {sourceType: "latest", readiness: "no_run"},
        summary: {total: 2, passed: 0, needsReview: 0, blocked: 0, missing: 1, cannotInfer: 1, derivedOnly: true, noFallback: true, providerGaps: 2, manualActions: 1},
        items: [
          {id: "source_evidence", status: "missing", severity: "review", source: "admin_local_metadata", safeSummary: "No local run or dry-run summary is available.", recommendedActionAlias: "run_dry_run_preview", manualReviewOnly: true},
          {id: "provider_truth", status: "cannot_infer", severity: "review", source: "external_owner_required", safeSummary: "Provider truth requires runtime validation.", recommendedActionAlias: "validate_real_tenant_runtime", providerOwned: true, manualReviewOnly: true, cannotInfer: true, noFallback: true},
        ],
        providerOwnedEvidenceMissing: ["live_contact_v3_credentials", "production_readiness"],
        manualReviewActions: ["run_dry_run_preview"],
        cannotInfer: ["provider_truth"],
        noFallback: ["production_readiness"],
        retention: {redactionApplied: true, retentionDays: 90, retentionPolicy: "redacted_summary_retained"},
      },
      generatedAt: "2026-06-15T12:31:00Z",
      safeSummary: "未发现可用于交接的飞书同步 run 或 dry-run history。",
    },
  });
  fireEvent.click(screen.getByLabelText("refresh-handoff-evidence"));

  expect((await screen.findAllByText("无记录")).length).toBeGreaterThan(0);
  expect(screen.getByText("查看验收资料")).toBeInTheDocument();
  expect(screen.queryByText("source_evidence")).not.toBeInTheDocument();
  expect(screen.queryByText("production_readiness")).not.toBeInTheDocument();
});

test("renders disabled user binding diagnostics state", async() => {
  feishuBackendMock.getFeishuOrganizationSyncUserBindingConflicts.mockResolvedValue({
    status: "ok",
    data: {
      organization: "engineering",
      status: "disabled",
      riskLevel: "none",
      counts: {total: 0},
      issues: [],
      generatedAt: "2026-06-15T12:00:00Z",
      safeSummary: "飞书组织同步未配置或未启用，绑定诊断未执行。",
      redaction: {applied: true, version: "feishu-user-binding-conflict-redaction-v1"},
    },
  });

  render(<FeishuOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);

  expect(await screen.findByText("身份匹配：未启用")).toBeInTheDocument();
  expect(screen.queryByText("绑定冲突 / 身份匹配诊断")).not.toBeInTheDocument();
  expect(screen.getAllByText("飞书组织同步未配置或未启用，绑定诊断未执行。").length).toBeGreaterThan(0);
});

test("saves config and reports failed connection test without changing page contract", async() => {
  feishuBackendMock.saveFeishuOrganizationSyncConfig.mockResolvedValue({
    status: "ok",
    data: {
      organization: "engineering",
      config: {
        organization: "engineering",
        appId: "cli_saved",
        appSecret: "***",
        endpointMode: "lark",
        isEnabled: true,
        softDisableMissingData: true,
      },
    },
  });
  feishuBackendMock.testFeishuOrganizationSyncConfig.mockResolvedValueOnce({
    status: "error",
    msg: "contact scope missing",
  });

  render(<FeishuOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);

  expect(await screen.findByText("飞书组织架构同步")).toBeInTheDocument();
  fireEvent.click(screen.getByText("保存"));
  await flushPromises();

  expect(feishuBackendMock.saveFeishuOrganizationSyncConfig).toHaveBeenCalledWith(expect.objectContaining({
    organization: "engineering",
    endpointMode: "feishu",
  }));
  expect(Setting.showMessage).toHaveBeenCalledWith("success", "保存成功");

  fireEvent.click(screen.getByText("测试连接"));
  await flushPromises();

  expect(feishuBackendMock.testFeishuOrganizationSyncConfig).toHaveBeenCalledWith(expect.objectContaining({
    organization: "engineering",
  }));
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "连接测试失败：contact scope missing");
});

test("records refresh read-model errors without dropping fail-closed status", async() => {
  const page = createFeishuPageHarness();
  feishuBackendMock.getFeishuOrganizationSyncConfig.mockResolvedValueOnce({status: "error", msg: "config failed"});
  feishuBackendMock.getFeishuOrganizationSyncRuns.mockResolvedValueOnce({status: "error", msg: "runs failed"});
  feishuBackendMock.getFeishuOrganizationSyncDryRunHistories.mockResolvedValueOnce({status: "error", msg: "history failed"});
  feishuBackendMock.getFeishuOrganizationSyncUserBindingConflicts.mockResolvedValueOnce({status: "error", msg: "binding failed"});
  feishuBackendMock.getFeishuOrganizationSyncHandoffEvidence.mockResolvedValueOnce({status: "error", msg: "handoff failed"});

  await page.refreshRuns("engineering", {refreshConfig: true});

  expect(Setting.showMessage).toHaveBeenCalledWith("error", "config failed");
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "runs failed");
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "history failed");
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "binding failed");
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "handoff failed");
  expect(page.state.loading).toBe(false);
  expect(page.state.runRefreshError).toBe("同步记录刷新失败，请手动刷新重试。");
  expect(page.state.dryRunHistoryError).toBe("Dry-run 历史刷新失败，请手动刷新重试。");
  expect(page.state.bindingDiagnosticsError).toBe("绑定冲突诊断刷新失败，请手动刷新重试。");
  expect(page.state.handoffEvidenceError).toBe("交接资料刷新失败，请手动刷新重试。");
});

test("pauses refresh and auxiliary panels on backend rejections", async() => {
  const page = createFeishuPageHarness();

  feishuBackendMock.getFeishuOrganizationSyncRuns.mockRejectedValueOnce(new Error("runs network down"));
  await page.refreshRuns("engineering");
  expect(page.state.loading).toBe(false);
  expect(page.state.runRefreshError).toBe("自动刷新已暂停，请手动刷新重试。");
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("runs network down"));

  feishuBackendMock.getFeishuOrganizationSyncDryRunHistories.mockResolvedValueOnce({status: "error", msg: "history denied"});
  await page.refreshDryRunHistory("engineering");
  expect(page.state.dryRunHistoryLoading).toBe(false);
  expect(page.state.dryRunHistoryError).toBe("history denied");

  feishuBackendMock.getFeishuOrganizationSyncUserBindingConflicts.mockRejectedValueOnce(new Error("binding network down"));
  await page.refreshBindingDiagnostics("engineering");
  expect(page.state.bindingDiagnosticsLoading).toBe(false);
  expect(`${page.state.bindingDiagnosticsError}`).toContain("binding network down");

  feishuBackendMock.getFeishuOrganizationSyncHandoffEvidence.mockResolvedValueOnce({status: "error", msg: "handoff unavailable"});
  await page.refreshHandoffEvidence("engineering", "latest");
  expect(page.state.handoffEvidenceLoading).toBe(false);
  expect(page.state.handoffEvidenceError).toBe("handoff unavailable");
});

test("handles sync start success, duplicate running task, api error and rejection", async() => {
  const page = createFeishuPageHarness();
  const refreshSpy = jestValue.fn();
  page.refresh = refreshSpy;

  feishuBackendMock.startFeishuOrganizationSyncRun.mockResolvedValueOnce({status: "ok", data: {name: "run-ok"}});
  page.startSync();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("success", "同步任务已启动");
  expect(refreshSpy).toHaveBeenCalledWith("engineering");
  expect(page.state.syncing).toBe(false);

  feishuBackendMock.startFeishuOrganizationSyncRun.mockResolvedValueOnce({status: "error", msg: "already running"});
  page.startSync();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("info", "已有同步任务在运行，已刷新同步记录。");

  feishuBackendMock.startFeishuOrganizationSyncRun.mockResolvedValueOnce({status: "error", msg: "permission denied"});
  page.startSync();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "同步失败：permission denied");

  feishuBackendMock.startFeishuOrganizationSyncRun.mockRejectedValueOnce(new Error("sync network down"));
  page.startSync();
  await flushPromises();
  expect(page.state.syncing).toBe(false);
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("sync network down"));
});

test("clears transient panels when organization changes", () => {
  const page = createFeishuPageHarness();
  const refreshSpy = jestValue.fn();
  page.refresh = refreshSpy;
  page.state = {
    ...page.state,
    previewResult: {status: "succeeded"},
    previewError: "old preview",
    dryRunHistories: [{name: "history-old"}],
    dryRunHistoryError: "old history",
    dryRunHistoryOpen: true,
    dryRunHistoryDetail: {name: "history-old"},
    dryRunHistoryDetailOpen: true,
    dryRunHistoryDetailError: "old detail",
    bindingDiagnostics: {status: "blocked"},
    bindingDiagnosticsError: "old binding",
    bindingDiagnosticsDetail: {id: "binding-old"},
    bindingDiagnosticsDetailOpen: true,
    handoffEvidence: {readiness: "blocked"},
    handoffEvidenceError: "old handoff",
    handoffEvidenceDetailsOpen: true,
  };

  page.changeOrganization("sales");

  expect(page.state.organization).toBe("sales");
  expect(page.state.config).toBeNull();
  expect(page.state.previewResult).toBeNull();
  expect(page.state.previewError).toBe("");
  expect(page.state.dryRunHistories).toEqual([]);
  expect(page.state.dryRunHistoryOpen).toBe(false);
  expect(page.state.bindingDiagnostics).toBeNull();
  expect(page.state.handoffEvidence).toBeNull();
  expect(refreshSpy).toHaveBeenCalledWith("sales");
});

test("schedules and clears run refresh polling for running syncs", () => {
  jestValue.useFakeTimers();
  const page = createFeishuPageHarness();
  const refreshRunsSpy = jestValue.fn();
  Object.defineProperty(page, "refreshRuns", {
    configurable: true,
    value: refreshRunsSpy,
  });

  page.scheduleRunRefresh("");
  expect(refreshRunsSpy).not.toHaveBeenCalled();

  page.syncRunRefreshLoop("engineering", [{status: "running", name: "run-1"}]);
  jestValue.runOnlyPendingTimers();
  expect(refreshRunsSpy).toHaveBeenCalledWith("engineering");

  page.syncRunRefreshLoop("other", [{status: "running", name: "run-2"}]);
  jestValue.runOnlyPendingTimers();
  expect(refreshRunsSpy).toHaveBeenCalledTimes(1);

  jestValue.useRealTimers();
});

test("reports preview, save and connection-test failure branches", async() => {
  const page = createFeishuPageHarness();

  feishuBackendMock.dryRunFeishuOrganizationSyncPreview.mockResolvedValueOnce({status: "ok", data: {status: "failed", diagnostics: {safeSummary: "preview failed"}}});
  page.previewSyncImpact();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("warning", "Dry-run 预览未通过，请查看诊断信息。");
  expect(page.state.previewResult).toEqual(expect.objectContaining({status: "failed"}));

  feishuBackendMock.dryRunFeishuOrganizationSyncPreview.mockResolvedValueOnce({status: "error", msg: "preview denied"});
  page.previewSyncImpact();
  await flushPromises();
  expect(page.state.previewError).toBe("preview denied");
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "Dry-run 预览失败：preview denied");

  feishuBackendMock.dryRunFeishuOrganizationSyncPreview.mockRejectedValueOnce(new Error("preview network down"));
  page.previewSyncImpact();
  await flushPromises();
  expect(`${page.state.previewError}`).toContain("preview network down");

  feishuBackendMock.saveFeishuOrganizationSyncConfig.mockResolvedValueOnce({status: "error", msg: "save denied"});
  page.saveConfig();
  await flushPromises();
  expect(page.state.saving).toBe(false);
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "保存失败: save denied");

  feishuBackendMock.saveFeishuOrganizationSyncConfig.mockRejectedValueOnce(new Error("save network down"));
  page.saveConfig();
  await flushPromises();
  expect(page.state.saving).toBe(false);
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("save network down"));

  feishuBackendMock.testFeishuOrganizationSyncConfig.mockResolvedValueOnce({status: "ok", data: {departmentCount: 1, userCount: 2}});
  page.testConfig();
  await flushPromises();
  expect(page.state.testing).toBe(false);
  expect(page.state.testResult).toEqual(expect.objectContaining({departmentCount: 1, userCount: 2}));
  expect(Setting.showMessage).toHaveBeenCalledWith("success", "飞书通讯录连接测试通过");

  feishuBackendMock.testFeishuOrganizationSyncConfig.mockRejectedValueOnce(new Error("test network down"));
  page.testConfig();
  await flushPromises();
  expect(page.state.testing).toBe(false);
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("test network down"));
});

test("formats fallback labels and redacted handoff checklist exports", () => {
  const page = new FeishuOrganizationSyncPage({account: {owner: "engineering", isAdmin: true}});
  const checklist = {
    version: "feishu-handoff-acceptance-checklist-v1",
    executionMode: "manual_review_only",
    manualReviewOnly: true,
    safeSource: {
      readiness: "ready",
      sourceType: "latest",
      sourceIdHash: "source-safe",
      sourceConnectionIdHash: "connection-safe",
    },
    summary: {
      total: 2,
      passed: 1,
      needsReview: 1,
      blocked: 0,
      missing: 0,
      cannotInfer: 1,
      derivedOnly: true,
      noFallback: true,
    },
    items: [
      {id: "handoff_readiness", status: "passed", source: "admin_local_metadata", safeSummary: "Ready summary.", recommendedActionAlias: "refresh_handoff_evidence"},
      {id: "provider_truth", status: "cannot_infer", source: "external_owner_required", safeSummary: "Provider truth requires runtime validation.", providerOwned: true, manualReviewOnly: true, noFallback: true},
    ],
    providerOwnedEvidenceMissing: ["provider_truth"],
    manualReviewActions: ["validate_real_tenant_runtime"],
    cannotInfer: ["provider_truth"],
    noFallback: ["production_readiness"],
    retention: {redactionApplied: true, redactionVersion: "redaction-v1", retentionDays: 90, retentionPolicy: "redacted_summary_retained"},
    redaction: {version: "redaction-v1"},
  };

  expect(page.getAccountOrganization()).toBe("");
  expect(page.normalizeConfig("engineering", null)).toEqual(expect.objectContaining({
    organization: "engineering",
    endpointMode: "feishu",
    scheduleCron: "0 2 * * *",
  }));
  expect(page.formatPreviewCounts({toCreate: 1, toUpdate: 2, toSoftDisable: 3, conflict: 4, invalid: 5})).toBe("新增 1 / 更新 2 / 软禁 3 / 冲突 4 / 无效 5");
  expect(page.formatDryRunDiff({departmentToCreate: 1, userToUpdate: 2, membershipToSoftDisable: 3})).toContain("关系 0/0/3");
  expect(page.getDryRunSourceAlias({appAlias: "app-safe", tenantAlias: "tenant-safe"})).toBe("app-safe / tenant-safe");
  expect(page.getBindingIssueTypeLabel("custom_issue")).toBe("custom_issue");
  expect(page.getBindingActionLabel("custom_action")).toBe("custom_action");
  expect(page.getHandoffSummaryText("交接证据已生成")).toBe("交接资料已生成");
  expect(page.formatRunTime("0001-01-01T00:00:00Z")).toBe("-");
  expect(page.getStageText("fetching", "failed")).toBe("拉取数据");

  const checklistJson = page.getHandoffAcceptanceChecklistJson(checklist);
  const checklistMarkdown = page.getHandoffAcceptanceChecklistMarkdown(checklist);

  expect(checklistJson).toContain("source-safe");
  expect(checklistMarkdown).toContain("# Feishu Handoff Acceptance Checklist");
  expect(checklistMarkdown).toContain("provider_truth");
  expect(`${checklistJson}\n${checklistMarkdown}`).not.toContain("cli-real");
});

test("renders full handoff checklist and uses fallback copy/export helpers", () => {
  const page = new FeishuOrganizationSyncPage({account: {owner: "engineering", isAdmin: true}});
  const execCommand = jestValue.fn(() => true);
  const createObjectURL = jestValue.fn(() => "blob:feishu-binding");
  const revokeObjectURL = jestValue.fn();
  const clickSpy = jestValue.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: undefined,
  });
  Object.defineProperty(document, "execCommand", {
    configurable: true,
    value: execCommand,
  });
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: createObjectURL,
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: revokeObjectURL,
  });

  const diagnostics = {
    generatedAt: "2026-06-15T12:00:00Z",
    status: "blocked",
    riskLevel: "critical",
    safeSummary: "safe binding summary",
    counts: {total: 1, duplicateUserIdBinding: 1},
  };
  const checklist = {
    version: "feishu-handoff-acceptance-checklist-v1",
    manualReviewOnly: true,
    summary: {total: 1, passed: 0, needsReview: 1, blocked: 0, missing: 0, cannotInfer: 1, derivedOnly: true, noFallback: true},
    safeSource: {sourceIdHash: "source-safe", sourceConnectionIdHash: "connection-safe"},
    items: [
      {id: "provider_truth", status: "cannot_infer", source: "external_owner_required", safeSummary: "Provider truth requires runtime validation.", recommendedActionAlias: "validate_real_tenant_runtime", providerOwned: true, manualReviewOnly: true, noFallback: true},
    ],
    providerOwnedEvidenceMissing: ["provider_truth"],
    manualReviewActions: ["validate_real_tenant_runtime"],
    cannotInfer: ["provider_truth"],
    noFallback: ["production_readiness"],
    retention: {redactionApplied: true, redactionVersion: "redaction-v1", retentionDays: 90},
  };

  render(page.renderHandoffAcceptanceChecklist(checklist, {compact: false}));
  expect(screen.getByText("验收清单")).toBeInTheDocument();
  expect(screen.getByText("Provider truth requires runtime validation.")).toBeInTheDocument();
  expect(screen.getAllByText("真实租户运行验证").length).toBeGreaterThan(0);

  page.copyBindingDiagnosticsJson(diagnostics);
  page.exportBindingDiagnosticsJson(diagnostics);
  page.copyHandoffEvidenceJson({generatedAt: "2026-06-15T12:00:00Z", readiness: "ready", safeSummary: "safe evidence"});
  page.exportHandoffEvidenceJson({generatedAt: "2026-06-15T12:00:00Z", readiness: "ready", safeSummary: "safe evidence"});

  expect(execCommand).toHaveBeenCalledWith("copy");
  expect(createObjectURL).toHaveBeenCalledTimes(2);
  expect(clickSpy).toHaveBeenCalled();
  expect(revokeObjectURL).toHaveBeenCalled();
  expect(Setting.showMessage).toHaveBeenCalledWith("success", "已复制脱敏 JSON");
  expect(Setting.showMessage).toHaveBeenCalledWith("success", "已复制交接资料 JSON");
});
