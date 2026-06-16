/* eslint-env jest */

import React from "react";
import {fireEvent, render, screen} from "@testing-library/react";
import FeishuOrganizationSyncPage from "./FeishuOrganizationSyncPage";
import * as FeishuOrganizationSyncBackend from "./backend/FeishuOrganizationSyncBackend";

jest.mock("./backend/FeishuOrganizationSyncBackend", () => ({
  getFeishuOrganizationSyncConfig: jest.fn(),
  saveFeishuOrganizationSyncConfig: jest.fn(),
  testFeishuOrganizationSyncConfig: jest.fn(),
  dryRunFeishuOrganizationSyncPreview: jest.fn(),
  getFeishuOrganizationSyncDryRunHistories: jest.fn(),
  getFeishuOrganizationSyncDryRunHistory: jest.fn(),
  getFeishuOrganizationSyncUserBindingConflicts: jest.fn(),
  getFeishuOrganizationSyncHandoffEvidence: jest.fn(),
  startFeishuOrganizationSyncRun: jest.fn(),
  getFeishuOrganizationSyncRuns: jest.fn(),
}));

jest.mock("./common/select/OrganizationSelect", () => function OrganizationSelectMock(props) {
  return <input aria-label="organization-select" value={props.initValue || ""} readOnly />;
});

const mockMatchMedia = query => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: jest.fn(),
  removeListener: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
});

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: mockMatchMedia,
  });
  FeishuOrganizationSyncBackend.getFeishuOrganizationSyncConfig.mockResolvedValue({
    status: "ok",
    data: {
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
  FeishuOrganizationSyncBackend.getFeishuOrganizationSyncRuns.mockResolvedValue({status: "ok", data: [], data2: 0});
  FeishuOrganizationSyncBackend.getFeishuOrganizationSyncDryRunHistories.mockResolvedValue({
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
  FeishuOrganizationSyncBackend.getFeishuOrganizationSyncDryRunHistory.mockResolvedValue({
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
  FeishuOrganizationSyncBackend.getFeishuOrganizationSyncUserBindingConflicts.mockResolvedValue({
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
  FeishuOrganizationSyncBackend.getFeishuOrganizationSyncHandoffEvidence.mockResolvedValue({
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
      generatedAt: "2026-06-15T12:30:00Z",
      safeSummary: "交接证据已就绪，可复制或导出脱敏 JSON 供真实租户测试和验收交接。",
    },
  });
  FeishuOrganizationSyncBackend.dryRunFeishuOrganizationSyncPreview.mockResolvedValue({
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
  jest.clearAllMocks();
});

test("renders Feishu organization sync config and endpoint mode", async() => {
  render(<FeishuOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);

  expect(await screen.findByText("飞书组织架构同步")).toBeInTheDocument();
  expect(FeishuOrganizationSyncBackend.getFeishuOrganizationSyncConfig).toHaveBeenCalledWith("engineering");
  expect(screen.getByText("飞书组织架构同步")).toBeInTheDocument();
  expect(screen.getByText("国内飞书（open.feishu.cn）")).toBeInTheDocument();
  expect(screen.getByDisplayValue("cli_123")).toBeInTheDocument();
});

test("renders run diagnostics with compact labels and redacted summary", async() => {
  FeishuOrganizationSyncBackend.getFeishuOrganizationSyncRuns.mockResolvedValue({
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
      errorText: "tenant_access_token open_id=open_1 alice@example.test 13800138000",
    }],
    data2: 1,
  });

  render(<FeishuOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);

  expect(await screen.findByText("run-failed")).toBeInTheDocument();
  expect(screen.getByText("凭证")).toBeInTheDocument();
  expect(screen.getByText("租户 token")).toBeInTheDocument();
  expect(screen.getByText("修凭证")).toBeInTheDocument();
  expect(screen.getByText("部 3 / 人 5 / 关系 7 / 禁 1")).toBeInTheDocument();
  expect(screen.getByText("2 分 5 秒")).toBeInTheDocument();
  expect(screen.getByText("invalid app credentials user_id=*** *** ***")).toBeInTheDocument();
  expect(screen.queryByText(/open_1/)).not.toBeInTheDocument();
  expect(screen.queryByText(/alice@example\.test/)).not.toBeInTheDocument();
  expect(screen.queryByText(/13800138000/)).not.toBeInTheDocument();
});

test("runs dry-run preview and renders compact diff summary", async() => {
  render(<FeishuOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);

  fireEvent.click(await screen.findByText("预览影响"));

  expect(FeishuOrganizationSyncBackend.dryRunFeishuOrganizationSyncPreview).toHaveBeenCalledWith("engineering");
  expect(await screen.findByText("Dry-run 预览")).toBeInTheDocument();
  expect(screen.getByText("app-abc / tenant-def")).toBeInTheDocument();
  expect(screen.getAllByText(/预览时间/).length).toBeGreaterThan(0);
  expect(screen.getByText("部门 2 / 用户 3 / 关系 4")).toBeInTheDocument();
  expect(screen.getByText("新增 1 / 更新 1 / 软禁 0 / 冲突 0 / 无效 0")).toBeInTheDocument();
  expect(screen.getByText("新增 2 / 更新 0 / 软禁 1 / 冲突 0 / 无效 0")).toBeInTheDocument();
  expect(screen.getByText("would_soft_disable: 2")).toBeInTheDocument();
});

test("renders dry-run history and opens safe detail drawer", async() => {
  render(<FeishuOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);

  expect(await screen.findByText("Dry-run 历史")).toBeInTheDocument();
  expect(screen.getByText("history-1")).toBeInTheDocument();
  expect(screen.getByText("app-history / tenant-history")).toBeInTheDocument();
  expect(screen.getByText("permission denied user_id=***")).toBeInTheDocument();

  fireEvent.click(screen.getByLabelText("dry-run-history-detail-history-1"));

  expect(FeishuOrganizationSyncBackend.getFeishuOrganizationSyncDryRunHistory).toHaveBeenCalledWith("engineering", "history-1");
  expect(await screen.findByText("Dry-run 详情")).toBeInTheDocument();
  expect(screen.getByText(/request-abcdef/)).toBeInTheDocument();
  expect(screen.getByText(/operator-abcdef/)).toBeInTheDocument();
  expect(screen.getByText("contact_permission_missing: 1")).toBeInTheDocument();
  expect(screen.queryByText(/alice@example\.test/)).not.toBeInTheDocument();
  expect(screen.queryByText(/13800138000/)).not.toBeInTheDocument();
});

test("renders user binding diagnostics and opens redacted detail drawer", async() => {
  render(<FeishuOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);

  expect(await screen.findByText("绑定冲突 / 身份匹配诊断")).toBeInTheDocument();
  expect(FeishuOrganizationSyncBackend.getFeishuOrganizationSyncUserBindingConflicts).toHaveBeenCalledWith("engineering", {limit: 20});
  expect(screen.getByText("阻断")).toBeInTheDocument();
  expect(screen.getAllByText("严重").length).toBeGreaterThan(0);
  expect(screen.getByText("user_id 多用户")).toBeInTheDocument();
  expect(screen.getByText("确认主账号")).toBeInTheDocument();
  expect(screen.getByText("sample-a")).toBeInTheDocument();
  expect(screen.queryByText(/alice@example\\.test/)).not.toBeInTheDocument();

  fireEvent.click(screen.getByLabelText("binding-diagnostics-detail-binding-1"));

  expect(await screen.findByText("绑定诊断详情")).toBeInTheDocument();
  expect(screen.getAllByText(/duplicate_user_id_binding_blocks_safe_sync/).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/source-abcdef/).length).toBeGreaterThan(0);
  expect(screen.queryByText(/ou-shared/)).not.toBeInTheDocument();
});

test("renders handoff evidence ready summary and safe markers", async() => {
  render(<FeishuOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);

  expect(await screen.findByText("交接证据")).toBeInTheDocument();
  expect(FeishuOrganizationSyncBackend.getFeishuOrganizationSyncHandoffEvidence).toHaveBeenCalledWith("engineering", {sourceType: "latest"});
  expect(screen.getByText("可交接")).toBeInTheDocument();
  expect(screen.getByText("dry-run-safe")).toBeInTheDocument();
  expect(screen.getByText("source-safe")).toBeInTheDocument();
  expect(screen.getByText("部门：新 1 / 更 1 / 软禁 0 / 冲突 0 / 无效 0")).toBeInTheDocument();
  expect(screen.getByText("live_contact_v3_credentials")).toBeInTheDocument();
  expect(screen.queryByText(/cli-real/)).not.toBeInTheDocument();
  expect(screen.queryByText(/tenant-real/)).not.toBeInTheDocument();
});

test("copies handoff evidence JSON without raw tenant identifiers", async() => {
  const writeText = jest.fn(() => Promise.resolve());
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {writeText},
  });
  render(<FeishuOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);

  expect(await screen.findByText("交接证据")).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText("copy-handoff-evidence-json"));

  expect(writeText).toHaveBeenCalledTimes(1);
  const copied = writeText.mock.calls[0][0];
  expect(copied).toContain("dry-run-safe");
  expect(copied).toContain("source-safe");
  expect(copied).not.toContain("cli-real");
  expect(copied).not.toContain("tenant-real");
});

test("renders handoff evidence blocked and no-run states", async() => {
  FeishuOrganizationSyncBackend.getFeishuOrganizationSyncHandoffEvidence.mockResolvedValueOnce({
    status: "ok",
    data: {
      readiness: "blocked",
      sourceType: "run",
      sourceIdHash: "run-safe",
      blockedReasons: ["sync_run_failed", "binding_conflict_blocked"],
      operatorNextActions: ["inspect_sync_diagnostics"],
      cannotInfer: ["insight_acceptance"],
      redaction: {applied: true, version: "feishu-handoff-evidence-redaction-v1"},
      generatedAt: "2026-06-15T12:30:00Z",
      safeSummary: "交接证据存在 2 个阻断原因，需处理后再交接。",
    },
  });
  render(<FeishuOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);

  expect((await screen.findAllByText("交接证据存在 2 个阻断原因，需处理后再交接。")).length).toBeGreaterThan(0);
  expect(screen.getByText("sync_run_failed")).toBeInTheDocument();
  expect(screen.getByText("binding_conflict_blocked")).toBeInTheDocument();

  FeishuOrganizationSyncBackend.getFeishuOrganizationSyncHandoffEvidence.mockResolvedValueOnce({
    status: "ok",
    data: {
      readiness: "no_run",
      blockedReasons: [],
      operatorNextActions: ["run_dry_run_preview"],
      cannotInfer: ["live_contact_v3_credentials"],
      redaction: {applied: true, version: "feishu-handoff-evidence-redaction-v1"},
      generatedAt: "2026-06-15T12:31:00Z",
      safeSummary: "未发现可用于交接的飞书同步 run 或 dry-run history。",
    },
  });
  fireEvent.click(screen.getByLabelText("refresh-handoff-evidence"));

  expect(await screen.findByText("无记录")).toBeInTheDocument();
  expect(screen.getByText("run_dry_run_preview")).toBeInTheDocument();
});

test("renders disabled user binding diagnostics state", async() => {
  FeishuOrganizationSyncBackend.getFeishuOrganizationSyncUserBindingConflicts.mockResolvedValue({
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

  expect(await screen.findByText("绑定冲突 / 身份匹配诊断")).toBeInTheDocument();
  expect(screen.getByText("未启用")).toBeInTheDocument();
  expect(screen.getAllByText("飞书组织同步未配置或未启用，绑定诊断未执行。").length).toBeGreaterThan(0);
});
