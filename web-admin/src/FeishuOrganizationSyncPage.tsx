// Copyright 2026 The AICodex Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");

import React from "react";
import {Alert, Button, Col, Collapse, Drawer, Input, Modal, Row, Select, Space, Switch, Table, Tag, Tooltip, Typography} from "antd";
import {CloudSyncOutlined, CopyOutlined, DownloadOutlined, PlayCircleOutlined, PlusOutlined, ReloadOutlined, SaveOutlined, ToolOutlined} from "@ant-design/icons";
import * as Setting from "./Setting";
import * as FeishuOrganizationSyncBackend from "./backend/FeishuOrganizationSyncBackend";
import * as WecomOrganizationSyncBackend from "./backend/WecomOrganizationSyncBackend";
import OrganizationSelect from "./common/select/OrganizationSelect";
import {getDefaultTablePagination, getTablePaginationProps} from "./common/table/TablePagination";
import i18next from "i18next";
import {getFeishuBusinessOrganizationNameFromTenantKey} from "./FeishuOrganizationSyncPageUtils";
import {
  OrganizationSyncActionBar,
  OrganizationSyncPageHeader,
  OrganizationSyncRunRecordHeader,
  OrganizationSyncSectionCard
} from "./organizationSync/OrganizationSyncShell";
import {getFeishuEndpointContextText} from "./organizationSync/FeishuOrganizationSyncTypes";
import {getDirectorySourceUiStatus} from "./organizationDirectorySourceStatus";
import {openNewSyncTargetOrganization} from "./organizationSync/SyncTargetOrganization";
import {
  areOrganizationDisplayNameMapsEqual,
  buildOrganizationDisplayNameMap,
  resolveOrganizationDisplayName
} from "./organizationSync/OrganizationDisplayNames";

const {Text} = Typography;
const syncRunPollIntervalMs = 3000;
const runStatisticTextStyle: React.CSSProperties = {fontVariantNumeric: "tabular-nums"};
const nowrapHeaderCell: React.ThHTMLAttributes<HTMLElement> = {style: {whiteSpace: "nowrap"}};
const lastFeishuOrganizationSyncOrganizationKey = "feishu-org-sync:lastOrganization";
const credentialTextInputProps = {
  autoComplete: "off",
  spellCheck: false,
} as const;
const credentialSecretInputProps = {
  autoComplete: "new-password",
  spellCheck: false,
} as const;

type LabelMap = Record<string, string>;
type FeishuDiffCounts = FeishuOrganizationSyncBackend.FeishuDiffCounts;
type FeishuDryRunHistoryRecord = FeishuOrganizationSyncBackend.FeishuDryRunHistoryRecord;
type FeishuDryRunPreviewResult = FeishuOrganizationSyncBackend.FeishuDryRunPreviewResult;
type FeishuHandoffAcceptanceChecklist = FeishuOrganizationSyncBackend.FeishuHandoffAcceptanceChecklist;
type FeishuHandoffCounts = FeishuOrganizationSyncBackend.FeishuHandoffCounts;
type FeishuHandoffEvidence = FeishuOrganizationSyncBackend.FeishuHandoffEvidence;
type FeishuOrganizationSyncConfig = FeishuOrganizationSyncBackend.FeishuOrganizationSyncConfig;
type OrganizationSyncSourceStatus = FeishuOrganizationSyncBackend.OrganizationSyncSourceStatus;
type OrganizationDisplayNameMap = ReturnType<typeof buildOrganizationDisplayNameMap>;
type OrganizationDisplayNameRecords = NonNullable<Parameters<typeof buildOrganizationDisplayNameMap>[0]>;
type FeishuOrganizationSyncRunRecord = FeishuOrganizationSyncBackend.FeishuOrganizationSyncRunRecord;
type FeishuUserBindingConflictCounts = FeishuOrganizationSyncBackend.FeishuUserBindingConflictCounts;
type FeishuUserBindingConflictIssue = FeishuOrganizationSyncBackend.FeishuUserBindingConflictIssue;
type FeishuUserBindingConflictSummary = FeishuOrganizationSyncBackend.FeishuUserBindingConflictSummary;

interface LegacyWecomOrganizationSyncConfigResponse {
  status?: string;
  data?: {
    config?: {
      organization?: string;
      isEnabled?: boolean;
    };
  };
}

interface FeishuOrganizationSyncPageAccount {
  owner?: string;
  [key: string]: unknown;
}

interface FeishuOrganizationSyncPageProps {
  account?: FeishuOrganizationSyncPageAccount;
  history?: {
    push?: (location: string | {pathname: string; mode?: string}) => void;
  };
}

interface FeishuTablePagination {
  current?: number;
  pageSize?: number;
  total?: number;
  showQuickJumper?: unknown;
  showSizeChanger?: unknown;
}

interface FeishuRefreshRunsOptions {
  refreshConfig?: boolean;
  pagination?: FeishuTablePagination;
}

interface HandoffAcceptanceRenderOptions {
  compact?: boolean;
  showAuditDetails?: boolean;
}

interface HandoffCountsRenderOptions {
  compact?: boolean;
}

interface BindingLinkage {
  id?: string;
}

type BindingDiagnosticsPayload = FeishuUserBindingConflictSummary | FeishuUserBindingConflictIssue | null;

interface FeishuOrganizationSyncPageState {
  organization: string;
  organizationDisplayNames: OrganizationDisplayNameMap;
  config: FeishuOrganizationSyncConfig | null;
  sourceStatus: OrganizationSyncSourceStatus;
  runs: FeishuOrganizationSyncRunRecord[];
  runCount: number;
  pagination: FeishuTablePagination;
  loading: boolean;
  lastRunsRefreshAt: string;
  runRefreshError: string;
  saving: boolean;
  testing: boolean;
  previewing: boolean;
  syncing: boolean;
  testResult: Record<string, unknown> | null;
  previewResult: FeishuDryRunPreviewResult | null;
  previewError: string;
  dryRunHistories: FeishuDryRunHistoryRecord[];
  dryRunHistoryLoading: boolean;
  dryRunHistoryError: string;
  dryRunHistoryOpen: boolean;
  dryRunHistoryDetail: FeishuDryRunHistoryRecord | null;
  dryRunHistoryDetailOpen: boolean;
  dryRunHistoryDetailLoading: boolean;
  dryRunHistoryDetailError: string;
  bindingDiagnostics: FeishuUserBindingConflictSummary | null;
  bindingDiagnosticsLoading: boolean;
  bindingDiagnosticsError: string;
  bindingDiagnosticsIssuesOpen: boolean;
  bindingDiagnosticsDetail: FeishuUserBindingConflictIssue | null;
  bindingDiagnosticsDetailOpen: boolean;
  handoffEvidence: FeishuHandoffEvidence | null;
  handoffEvidenceLoading: boolean;
  handoffEvidenceError: string;
  handoffEvidenceSourceType: string;
  handoffEvidenceDetailsOpen: boolean;
}

const diagnosticStageLabels: LabelMap = {
  config_validation: "配置校验",
  tenant_token: "租户 token",
  department_fetch: "部门拉取",
  user_fetch: "用户拉取",
  upsert_department: "部门写入",
  upsert_user: "用户写入",
  upsert_membership: "关系写入",
  projection: "主数据投影",
  soft_disable: "软禁用",
  scheduler: "调度",
  unknown: "未知",
};
const diagnosticCategoryLabels: LabelMap = {
  configuration: "配置",
  credentials: "凭证",
  permission: "权限",
  provider: "飞书服务",
  contract: "数据契约",
  local_apply: "本地写入",
  projection: "主数据投影",
  partial_sync: "部分同步",
  unknown: "未知",
};
const diagnosticActionLabels: LabelMap = {
  fix_credentials: "修凭证",
  grant_contact_scope: "授权通讯录",
  wait_rate_limit: "等限流",
  inspect_mapping_conflict: "查映射",
  inspect_projection: "查投影",
  manual_review: "人工确认",
  unknown: "待确认",
};
const diagnosticRetryLabels: LabelMap = {
  safe_retry: "可重试",
  wait_rate_limit: "等待限流",
  not_ready: "先处理",
  unknown: "待确认",
};
const bindingRiskLabels: LabelMap = {
  none: "无风险",
  low: "低",
  medium: "中",
  high: "高",
  critical: "严重",
};
const bindingStatusLabels: LabelMap = {
  disabled: "未启用",
  empty: "无数据",
  ok: "正常",
  warning: "需关注",
  blocked: "阻断",
};
const bindingIssueTypeLabels: LabelMap = {
  duplicate_user_id_binding: "user_id 多用户",
  local_user_multi_tenant_binding: "本地用户多租户",
  legacy_identifier_split: "历史标识分裂",
  missing_tenant_key: "缺少 tenant_key",
  endpoint_mode_mismatch: "Endpoint 不一致",
};
const bindingActionLabels: LabelMap = {
  inspect_mapping: "检查映射",
  confirm_primary_user: "确认主账号",
  backfill_tenant_key: "补 tenant_key",
  align_endpoint_mode: "对齐 endpoint",
  no_action: "无需处理",
};
const handoffReadinessLabels: LabelMap = {
  ready: "可交接",
  blocked: "阻断",
  running: "同步中",
  no_run: "无记录",
  unsupported: "不可用",
};
const handoffSourceTypeLabels: LabelMap = {
  latest: "最近证据",
  run: "最近同步",
  dry_run_history: "最近 Dry-run",
};
const handoffAcceptanceStatusLabels: LabelMap = {
  passed: "通过",
  needs_review: "待复核",
  blocked: "阻断",
  missing: "缺失",
  cannot_infer: "无法推断",
};
const handoffAcceptanceStatusColors: LabelMap = {
  passed: "green",
  needs_review: "gold",
  blocked: "red",
  missing: "orange",
  cannot_infer: "blue",
};
const handoffActionLabels: LabelMap = {
  configure_feishu_sync: "配置飞书同步",
  resolve_binding_conflicts: "处理绑定冲突",
  review_blocked_reasons: "复核阻断原因",
  review_binding_diagnostics: "复核绑定诊断",
  review_dry_run_diff: "复核预览影响",
  review_soft_disable_summary: "复核软禁用影响",
  validate_real_tenant_runtime: "真实租户运行验证",
  coordinate_gateway_insight_acceptance: "协调下游验收",
  copy_acceptance_checklist_json: "复制验收清单",
  export_acceptance_checklist_markdown: "导出验收清单",
  export_evidence_json: "导出交接资料",
  export_sanitized_evidence_only: "仅导出脱敏证据",
  inspect_sync_diagnostics: "查看同步诊断",
  run_dry_run_preview: "先预览影响",
  wait_sync_completion: "等待同步完成",
  refresh_handoff_evidence: "刷新交接资料",
};
const handoffEvidenceAliasLabels: LabelMap = {
  live_contact_v3_credentials: "飞书通讯录权限需真实验证",
  gateway_projection_consumption: "Gateway 消费需下游验收",
  insight_acceptance: "Insight 验收需下游确认",
  provider_payload_validation: "飞书返回数据需运行态验证",
  production_readiness: "生产就绪需人工确认",
  provider_truth: "飞书租户真值需外部验证",
  sync_full_success: "完整同步成功需运行态验证",
};
const handoffChecklistItemLabels: LabelMap = {
  redaction: "脱敏检查",
  handoff_readiness: "交接就绪",
  admin_local_metadata: "Admin 本地元数据",
  external_owner_required: "外部系统确认",
};
const handoffBlockedReasonLabels: LabelMap = {
  binding_conflict_blocked: "存在绑定冲突",
  sync_run_failed: "最近同步失败",
  dry_run_failed: "最近预览失败",
  dry_run_not_succeeded: "最近预览未成功",
  dry_run_diff_conflict_or_invalid: "预览影响存在冲突或无效关系",
  no_run: "没有同步记录",
  no_dry_run_history: "没有预览记录",
  source_connection_missing: "同步连接缺失",
  config_disabled: "同步配置未启用",
};
const dryRunReasonLabels: LabelMap = {
  duplicate_external_identifier: "外部标识重复",
  missing_department_identifier: "部门标识缺失",
  missing_parent_department: "上级部门未返回",
  missing_user_identifier: "用户标识缺失",
  unmapped_user: "成员未返回",
  unmapped_department: "成员所属部门未返回",
  would_soft_disable: "将软禁缺失数据",
  contact_permission_missing: "通讯录权限不足",
  invalid_app_credentials: "应用凭证无效",
  credential_missing: "凭证未配置",
  runtime_authorization_required: "需要运行态授权",
};

class FeishuOrganizationSyncPage extends React.Component<FeishuOrganizationSyncPageProps, FeishuOrganizationSyncPageState> {
  private runRefreshTimer: ReturnType<typeof setTimeout> | null;
  private isUnmounted: boolean;

  constructor(props: FeishuOrganizationSyncPageProps) {
    super(props);
    this.runRefreshTimer = null;
    this.isUnmounted = false;
    const organization = this.getInitialOrganization(props.account);
    this.state = {
      organization,
      organizationDisplayNames: {},
      config: null,
      sourceStatus: {},
      runs: [],
      runCount: 0,
      pagination: getDefaultTablePagination(),
      loading: false,
      lastRunsRefreshAt: "",
      runRefreshError: "",
      saving: false,
      testing: false,
      previewing: false,
      syncing: false,
      testResult: null,
      previewResult: null,
      previewError: "",
      dryRunHistories: [],
      dryRunHistoryLoading: false,
      dryRunHistoryError: "",
      dryRunHistoryOpen: false,
      dryRunHistoryDetail: null,
      dryRunHistoryDetailOpen: false,
      dryRunHistoryDetailLoading: false,
      dryRunHistoryDetailError: "",
      bindingDiagnostics: null,
      bindingDiagnosticsLoading: false,
      bindingDiagnosticsError: "",
      bindingDiagnosticsIssuesOpen: false,
      bindingDiagnosticsDetail: null,
      bindingDiagnosticsDetailOpen: false,
      handoffEvidence: null,
      handoffEvidenceLoading: false,
      handoffEvidenceError: "",
      handoffEvidenceSourceType: "latest",
      handoffEvidenceDetailsOpen: false,
    };
  }

  componentDidMount() {
    this.refresh(this.state.organization);
  }

  componentWillUnmount() {
    this.isUnmounted = true;
    this.clearRunRefreshTimer();
  }

  componentDidUpdate() {
    if (this.state.organization) {
      return;
    }
    const organization = this.getInitialOrganization(this.props.account);
    if (organization) {
      this.changeOrganization(organization, false);
    }
  }

  getAccountOrganization(account?: FeishuOrganizationSyncPageAccount): string {
    if (!account?.owner) {
      return "";
    }
    return Setting.getRequestOrganization(account) || account.owner;
  }

  getInitialOrganization(account?: FeishuOrganizationSyncPageAccount): string {
    return this.getBusinessOrganization(this.getLastSelectedOrganization())
      || this.getBusinessOrganization(this.getAccountOrganization(account));
  }

  getBusinessOrganization(organization?: string): string {
    const normalized = `${organization || ""}`.trim();
    if (normalized === "" || normalized === "built-in") {
      return "";
    }
    return normalized;
  }

  getLastSelectedOrganization(): string {
    try {
      return localStorage.getItem(lastFeishuOrganizationSyncOrganizationKey) || "";
    } catch {
      return "";
    }
  }

  rememberOrganization(organization: string): void {
    const normalized = this.getBusinessOrganization(organization);
    if (!normalized) {
      return;
    }
    try {
      localStorage.setItem(lastFeishuOrganizationSyncOrganizationKey, normalized);
    } catch {
      // 本地存储不可用不影响同步页主流程。
    }
  }

  clearRunRefreshTimer(): void {
    if (this.runRefreshTimer !== null) {
      clearTimeout(this.runRefreshTimer);
      this.runRefreshTimer = null;
    }
  }

  hasRunningRuns(runs: FeishuOrganizationSyncRunRecord[] = []): boolean {
    return (runs || []).some(run => run?.status === "running");
  }

  scheduleRunRefresh(organization: string): void {
    if (!organization || this.runRefreshTimer !== null) {
      return;
    }
    this.runRefreshTimer = setTimeout(() => {
      this.runRefreshTimer = null;
      this.refreshRuns(organization);
    }, syncRunPollIntervalMs);
  }

  syncRunRefreshLoop(organization: string, runs: FeishuOrganizationSyncRunRecord[]): void {
    if (this.state.organization !== organization) {
      this.clearRunRefreshTimer();
      return;
    }
    if (this.hasRunningRuns(runs)) {
      this.scheduleRunRefresh(organization);
      return;
    }
    this.clearRunRefreshTimer();
  }

  refreshRuns(organization: string, options: FeishuRefreshRunsOptions = {}): Promise<void> {
    const requestedOrganization = `${organization || ""}`.trim();
    if (!requestedOrganization && !options.refreshConfig) {
      return Promise.resolve();
    }
    const {refreshConfig = false, pagination = this.state.pagination} = options;
    const nextPagination = getDefaultTablePagination(pagination) as FeishuTablePagination;

    this.clearRunRefreshTimer();
    this.setState({loading: true});
    const runsRequest = requestedOrganization
      ? FeishuOrganizationSyncBackend.getFeishuOrganizationSyncRuns(requestedOrganization, nextPagination.current, nextPagination.pageSize)
      : Promise.resolve({status: "ok", data: [], data2: 0} as FeishuOrganizationSyncBackend.FeishuApiResponse<FeishuOrganizationSyncRunRecord[]>);
    const dryRunHistoryRequest = requestedOrganization
      ? FeishuOrganizationSyncBackend.getFeishuOrganizationSyncDryRunHistories(requestedOrganization, {topN: 10})
      : Promise.resolve({status: "ok", data: []} as FeishuOrganizationSyncBackend.FeishuApiResponse<FeishuDryRunHistoryRecord[]>);
    const bindingDiagnosticsRequest = requestedOrganization
      ? FeishuOrganizationSyncBackend.getFeishuOrganizationSyncUserBindingConflicts(requestedOrganization, {limit: 20})
      : Promise.resolve({status: "ok", data: null} as FeishuOrganizationSyncBackend.FeishuApiResponse<FeishuUserBindingConflictSummary | null>);
    const handoffEvidenceRequest = requestedOrganization
      ? FeishuOrganizationSyncBackend.getFeishuOrganizationSyncHandoffEvidence(requestedOrganization, {sourceType: this.state.handoffEvidenceSourceType})
      : Promise.resolve({status: "ok", data: null} as FeishuOrganizationSyncBackend.FeishuApiResponse<FeishuHandoffEvidence | null>);
    const configRequest = refreshConfig
      ? FeishuOrganizationSyncBackend.getFeishuOrganizationSyncConfig(requestedOrganization)
      : Promise.resolve(null);
    const legacySourceConflictRequest = configRequest.then(configRes => {
      if (configRes === null || configRes?.status === "error") {
        return {};
      }
      if (this.hasNativeSourceStatus(configRes?.data)) {
        return {};
      }
      const sourceStatus = this.normalizeSourceStatus(configRes?.data);
      if (sourceStatus.conflictingConfigured || sourceStatus.conflictingEnabled) {
        return {};
      }
      return this.resolveLegacyWecomSourceConflict(this.resolveConfigResponseOrganization(requestedOrganization, configRes?.data));
    }).catch(() => ({}));

    return Promise.all([configRequest, runsRequest, dryRunHistoryRequest, bindingDiagnosticsRequest, handoffEvidenceRequest, legacySourceConflictRequest]).then(([configRes, runsRes, dryRunHistoryRes, bindingDiagnosticsRes, handoffEvidenceRes, legacySourceConflict]) => {
      if (configRes?.status === "error") {
        Setting.showMessage("error", configRes.msg);
      }
      if (runsRes.status === "error") {
        Setting.showMessage("error", runsRes.msg);
      }
      if (dryRunHistoryRes.status === "error") {
        Setting.showMessage("error", dryRunHistoryRes.msg);
      }
      if (bindingDiagnosticsRes.status === "error") {
        Setting.showMessage("error", bindingDiagnosticsRes.msg);
      }
      if (handoffEvidenceRes.status === "error") {
        Setting.showMessage("error", handoffEvidenceRes.msg);
      }
      if (this.isUnmounted || (requestedOrganization && this.state.organization !== requestedOrganization)) {
        return;
      }
      const nextState: Partial<FeishuOrganizationSyncPageState> = {loading: false};
      let resolvedOrganization = requestedOrganization;
      let shouldRefreshResolvedRuns = false;
      if (configRes !== null) {
        resolvedOrganization = this.resolveConfigResponseOrganization(requestedOrganization, configRes?.data);
        const nextConfig = this.normalizeConfig(resolvedOrganization, configRes?.data?.config);
        nextState.organization = resolvedOrganization;
        nextState.sourceStatus = this.mergeSourceStatus(configRes?.data, legacySourceConflict);
        nextState.config = nextConfig;
        nextState.testResult = null;
        nextState.previewResult = null;
        nextState.previewError = "";
        shouldRefreshResolvedRuns = !requestedOrganization && !!resolvedOrganization;
      }
      if (runsRes.status === "ok") {
        nextState.runs = runsRes.data || [];
        nextState.runCount = runsRes.data2 || 0;
        nextState.pagination = {...nextPagination, total: runsRes.data2 || 0};
        nextState.lastRunsRefreshAt = Setting.getFormattedDate(new Date().toISOString()) || "";
        nextState.runRefreshError = "";
      } else {
        nextState.runRefreshError = "同步记录刷新失败，请手动刷新重试。";
      }
      if (dryRunHistoryRes.status === "ok") {
        nextState.dryRunHistories = dryRunHistoryRes.data || [];
        nextState.dryRunHistoryError = "";
      } else {
        nextState.dryRunHistoryError = "Dry-run 历史刷新失败，请手动刷新重试。";
      }
      if (bindingDiagnosticsRes.status === "ok") {
        nextState.bindingDiagnostics = bindingDiagnosticsRes.data || null;
        nextState.bindingDiagnosticsError = "";
        nextState.bindingDiagnosticsIssuesOpen = false;
      } else {
        nextState.bindingDiagnosticsError = "绑定冲突诊断刷新失败，请手动刷新重试。";
      }
      if (handoffEvidenceRes.status === "ok") {
        nextState.handoffEvidence = handoffEvidenceRes.data || null;
        nextState.handoffEvidenceError = "";
        nextState.handoffEvidenceDetailsOpen = false;
      } else {
        nextState.handoffEvidenceError = "交接资料刷新失败，请手动刷新重试。";
      }
      this.setState(nextState as Pick<FeishuOrganizationSyncPageState, keyof FeishuOrganizationSyncPageState>, () => {
        if (shouldRefreshResolvedRuns) {
          this.refreshRuns(resolvedOrganization, {pagination: getDefaultTablePagination()}).catch(() => {});
          return;
        }
        this.syncRunRefreshLoop(resolvedOrganization, nextState.runs || this.state.runs);
      });
    }).catch(error => {
      this.clearRunRefreshTimer();
      if (this.isUnmounted || (requestedOrganization && this.state.organization !== requestedOrganization)) {
        return;
      }
      this.setState({loading: false, runRefreshError: "自动刷新已暂停，请手动刷新重试。"});
      Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
    });
  }

  refreshDryRunHistory(organization = this.state.organization): Promise<void> {
    if (!organization) {
      return Promise.resolve();
    }
    this.setState({dryRunHistoryLoading: true});
    return FeishuOrganizationSyncBackend.getFeishuOrganizationSyncDryRunHistories(organization, {topN: 10})
      .then(res => {
        if (this.isUnmounted || this.state.organization !== organization) {
          return;
        }
        if (res.status === "ok") {
          this.setState({dryRunHistoryLoading: false, dryRunHistories: res.data || [], dryRunHistoryError: ""});
        } else {
          this.setState({dryRunHistoryLoading: false, dryRunHistoryError: res.msg || "Dry-run 历史刷新失败"});
        }
      }).catch(error => {
        if (this.isUnmounted || this.state.organization !== organization) {
          return;
        }
        this.setState({dryRunHistoryLoading: false, dryRunHistoryError: `${i18next.t("general:Failed to connect to server")}: ${error}`});
      });
  }

  refreshBindingDiagnostics(organization = this.state.organization): Promise<void> {
    if (!organization) {
      return Promise.resolve();
    }
    this.setState({bindingDiagnosticsLoading: true});
    return FeishuOrganizationSyncBackend.getFeishuOrganizationSyncUserBindingConflicts(organization, {limit: 20})
      .then(res => {
        if (this.isUnmounted || this.state.organization !== organization) {
          return;
        }
        if (res.status === "ok") {
          this.setState({bindingDiagnosticsLoading: false, bindingDiagnostics: res.data || null, bindingDiagnosticsError: "", bindingDiagnosticsIssuesOpen: false});
        } else {
          this.setState({bindingDiagnosticsLoading: false, bindingDiagnosticsError: res.msg || "绑定冲突诊断刷新失败"});
        }
      }).catch(error => {
        if (this.isUnmounted || this.state.organization !== organization) {
          return;
        }
        this.setState({bindingDiagnosticsLoading: false, bindingDiagnosticsError: `${i18next.t("general:Failed to connect to server")}: ${error}`});
      });
  }

  refreshHandoffEvidence(organization = this.state.organization, sourceType = this.state.handoffEvidenceSourceType): Promise<void> {
    if (!organization) {
      return Promise.resolve();
    }
    this.setState({handoffEvidenceLoading: true});
    return FeishuOrganizationSyncBackend.getFeishuOrganizationSyncHandoffEvidence(organization, {sourceType})
      .then(res => {
        if (this.isUnmounted || this.state.organization !== organization) {
          return;
        }
        if (res.status === "ok") {
          this.setState({handoffEvidenceLoading: false, handoffEvidence: res.data || null, handoffEvidenceError: "", handoffEvidenceDetailsOpen: false});
        } else {
          this.setState({handoffEvidenceLoading: false, handoffEvidenceError: res.msg || "交接资料刷新失败"});
        }
      }).catch(error => {
        if (this.isUnmounted || this.state.organization !== organization) {
          return;
        }
        this.setState({handoffEvidenceLoading: false, handoffEvidenceError: `${i18next.t("general:Failed to connect to server")}: ${error}`});
      });
  }

  refresh(organization: string): void {
    this.refreshRuns(organization, {refreshConfig: true, pagination: getDefaultTablePagination()}).catch(() => {});
  }

  resolveConfigResponseOrganization(requestedOrganization: string, data?: FeishuOrganizationSyncBackend.FeishuOrganizationSyncConfigResponse): string {
    return this.getBusinessOrganization(data?.config?.organization)
      || this.getBusinessOrganization(data?.organization)
      || this.getBusinessOrganization(data?.defaultOrganization)
      || this.getBusinessOrganization(requestedOrganization);
  }

  normalizeSourceStatus(data?: FeishuOrganizationSyncBackend.FeishuOrganizationSyncConfigResponse | null): OrganizationSyncSourceStatus {
    const conflictingOrganization = this.getBusinessOrganization(data?.conflictingOrganization);
    return {
      defaultOrganization: data?.defaultOrganization || "",
      defaultOrganizationSource: data?.defaultOrganizationSource || "",
      conflictingProvider: data?.conflictingProvider || "",
      conflictingOrganization,
      conflictingConfigured: Boolean(data?.conflictingConfigured),
      conflictingEnabled: Boolean(data?.conflictingEnabled),
      conflictingOrganizations: this.normalizeOrganizations(data?.conflictingOrganizations, conflictingOrganization),
      sourceStatus: data?.sourceStatus,
    };
  }

  hasNativeSourceStatus(data?: FeishuOrganizationSyncBackend.FeishuOrganizationSyncConfigResponse | null): boolean {
    if (!data) {
      return false;
    }
    return ["sourceStatus", "conflictingProvider", "conflictingOrganization", "conflictingConfigured", "conflictingEnabled", "conflictingOrganizations"]
      .some(key => Object.prototype.hasOwnProperty.call(data, key));
  }

  mergeSourceStatus(data: FeishuOrganizationSyncBackend.FeishuOrganizationSyncConfigResponse | null | undefined, fallbackStatus: OrganizationSyncSourceStatus): OrganizationSyncSourceStatus {
    const sourceStatus = this.normalizeSourceStatus(data);
    const fallbackConflict = Boolean(fallbackStatus.conflictingConfigured || fallbackStatus.conflictingEnabled);
    const sourceConflict = Boolean(sourceStatus.conflictingConfigured || sourceStatus.conflictingEnabled);
    const conflictStatus = sourceConflict ? sourceStatus : fallbackConflict ? fallbackStatus : sourceStatus;
    return {
      ...conflictStatus,
      defaultOrganization: sourceStatus.defaultOrganization || fallbackStatus.defaultOrganization || "",
      defaultOrganizationSource: sourceStatus.defaultOrganizationSource || fallbackStatus.defaultOrganizationSource || "",
      sourceStatus: sourceStatus.sourceStatus || fallbackStatus.sourceStatus,
      conflictingOrganizations: this.normalizeOrganizations(
        sourceStatus.conflictingOrganizations,
        sourceStatus.conflictingOrganization,
        fallbackStatus.conflictingOrganizations,
        fallbackStatus.conflictingOrganization
      ),
    };
  }

  normalizeOrganizations(...values: Array<string | string[] | undefined>): string[] {
    const seen: Record<string, boolean> = {};
    const organizations: string[] = [];
    values.forEach(value => {
      const candidates = Array.isArray(value) ? value : [value];
      candidates.forEach(candidate => {
        const organization = this.getBusinessOrganization(candidate);
        if (!organization || seen[organization]) {
          return;
        }
        seen[organization] = true;
        organizations.push(organization);
      });
    });
    return organizations;
  }

  getExcludedSourceOrganizations(): string[] {
    const currentOrganization = this.getBusinessOrganization(this.state.organization);
    return getDirectorySourceUiStatus(this.state.sourceStatus).organizations
      .map(organization => this.getBusinessOrganization(organization))
      .filter(organization => organization && organization !== currentOrganization);
  }

  updateOrganizationDisplayNames(organizations: OrganizationDisplayNameRecords): void {
    const organizationDisplayNames = buildOrganizationDisplayNameMap(organizations);
    if (areOrganizationDisplayNameMapsEqual(this.state.organizationDisplayNames, organizationDisplayNames)) {
      return;
    }
    this.setState({organizationDisplayNames});
  }

  getOrganizationDisplayName(organization?: string): string {
    return resolveOrganizationDisplayName(this.state.organizationDisplayNames, organization);
  }

  hasStatusConflict(status: OrganizationSyncSourceStatus): boolean {
    return getDirectorySourceUiStatus(status).blocked;
  }

  hasSourceConflict(): boolean {
    return this.hasStatusConflict(this.state.sourceStatus);
  }

  getSourceConflictActionMessage(actionText: string): string {
    const status = getDirectorySourceUiStatus(this.state.sourceStatus);
    if (status.abnormal) {
      const organization = this.getOrganizationDisplayName(status.organization || this.state.organization);
      return `当前组织 ${organization} 存在多个已配置通讯录来源，属于数据异常，请排障或新建组织后再操作。`;
    }
    return `当前组织已被其他通讯录同步来源占用，${actionText}`;
  }

  updateSyncEnabled(checked: boolean): void {
    if (this.hasSourceConflict()) {
      Setting.showMessage("warning", this.getSourceConflictActionMessage("请新建组织后配置飞书同步。"));
      return;
    }
    this.updateConfigField("isEnabled", checked);
  }

  resolveLegacyWecomSourceConflict(organization: string): Promise<OrganizationSyncSourceStatus> {
    const targetOrganization = this.getBusinessOrganization(organization);
    if (!targetOrganization) {
      return Promise.resolve({});
    }
    return (WecomOrganizationSyncBackend.getWecomOrganizationSyncConfig(targetOrganization) as Promise<LegacyWecomOrganizationSyncConfigResponse>)
      .then(res => {
        const config = res?.data?.config;
        if (res?.status !== "ok" || config === null || config === undefined) {
          return {};
        }
        const conflictingOrganization = this.getBusinessOrganization(config.organization) || targetOrganization;
        if (conflictingOrganization !== targetOrganization) {
          return {};
        }
        return {
          conflictingProvider: "WeCom",
          conflictingOrganization,
          conflictingConfigured: true,
          conflictingEnabled: Boolean(config.isEnabled),
          conflictingOrganizations: [conflictingOrganization],
        };
      })
      .catch(() => ({}));
  }

  normalizeConfig(organization: string, config?: FeishuOrganizationSyncConfig | null): FeishuOrganizationSyncConfig {
    return {
      owner: organization,
      name: "feishu-organization-sync",
      organization,
      appId: "",
      appSecret: "",
      endpointMode: "feishu",
      tenantKey: "",
      isEnabled: false,
      softDisableMissingData: true,
      scheduleEnabled: false,
      scheduleCron: "0 2 * * *",
      scheduleTimezone: "Asia/Shanghai",
      ...(config || {}),
    };
  }

  updateConfigField(key: string, value: unknown): void {
    const config = this.normalizeConfig(this.state.organization, this.state.config);
    this.setState({config: {...config, [key]: value}});
  }

  changeOrganization(organization: string, remember = true): void {
    const targetOrganization = this.getBusinessOrganization(organization);
    if (remember) {
      this.rememberOrganization(targetOrganization);
    }
    this.clearRunRefreshTimer();
    this.setState({
      organization: targetOrganization,
      config: null,
      sourceStatus: {},
      runs: [],
      runCount: 0,
      pagination: getDefaultTablePagination(),
      previewResult: null,
      previewError: "",
      dryRunHistories: [],
      dryRunHistoryError: "",
      dryRunHistoryOpen: false,
      dryRunHistoryDetail: null,
      dryRunHistoryDetailOpen: false,
      dryRunHistoryDetailError: "",
      bindingDiagnostics: null,
      bindingDiagnosticsError: "",
      bindingDiagnosticsDetail: null,
      bindingDiagnosticsDetailOpen: false,
      handoffEvidence: null,
      handoffEvidenceError: "",
      handoffEvidenceDetailsOpen: false,
    }, () => this.refresh(targetOrganization));
  }

  createSyncTargetOrganization() {
    void openNewSyncTargetOrganization(this.props.history);
  }

  saveConfig() {
    if (this.hasSourceConflict()) {
      Setting.showMessage("warning", this.getSourceConflictActionMessage("暂不能保存飞书配置。"));
      return;
    }
    this.setState({saving: true});
    FeishuOrganizationSyncBackend.saveFeishuOrganizationSyncConfig(this.state.config)
      .then(res => {
        if (res.status === "ok") {
          const resolvedOrganization = res.data?.config?.organization || res.data?.organization || this.state.organization;
          const nextConfig = this.normalizeConfig(resolvedOrganization, res.data?.config);
          this.rememberOrganization(resolvedOrganization);
          this.setState({
            saving: false,
            organization: resolvedOrganization,
            config: nextConfig,
            sourceStatus: this.normalizeSourceStatus(res.data),
            previewResult: null,
            previewError: "",
          });
          Setting.showMessage("success", i18next.t("general:Successfully saved"));
        } else {
          this.setState({saving: false});
          Setting.showMessage("error", `${i18next.t("general:Failed to save")}: ${res.msg}`);
        }
      }).catch(error => {
        this.setState({saving: false});
        Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
      });
  }

  testConfig() {
    this.setState({testing: true});
    FeishuOrganizationSyncBackend.testFeishuOrganizationSyncConfig(this.state.config)
      .then(res => {
        this.setState({testing: false});
        if (res.status === "ok") {
          const tenantKey = `${res.data?.tenantKey || ""}`.trim();
          if (tenantKey !== "") {
            this.setState({testResult: res.data || null, config: {...this.normalizeConfig(this.state.organization, this.state.config), tenantKey}});
          } else {
            this.setState({testResult: res.data || null});
          }
          Setting.showMessage("success", "飞书通讯录连接测试通过");
        } else {
          Setting.showMessage("error", `连接测试失败：${res.msg}`);
        }
      }).catch(error => {
        this.setState({testing: false});
        Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
      });
  }

  previewSyncImpact() {
    this.setState({previewing: true, previewError: ""});
    FeishuOrganizationSyncBackend.dryRunFeishuOrganizationSyncPreview(this.state.organization)
      .then(res => {
        this.setState({previewing: false});
        if (res.status === "ok") {
          this.setState({previewResult: res.data || null, previewError: ""});
          this.refreshDryRunHistory(this.state.organization).catch(() => {});
          this.refreshBindingDiagnostics(this.state.organization).catch(() => {});
          if (res.data?.status === "failed") {
            Setting.showMessage("warning", "Dry-run 预览未通过，请查看诊断信息。");
          }
        } else {
          this.setState({previewError: res.msg || "Dry-run 预览失败"});
          Setting.showMessage("error", `Dry-run 预览失败：${res.msg}`);
        }
      }).catch(error => {
        this.setState({previewing: false, previewError: `${i18next.t("general:Failed to connect to server")}: ${error}`});
        Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
      });
  }

  startSync() {
    if (this.hasSourceConflict()) {
      Setting.showMessage("warning", this.getSourceConflictActionMessage("暂不能开始飞书正式同步。"));
      return;
    }
    this.setState({syncing: true});
    FeishuOrganizationSyncBackend.startFeishuOrganizationSyncRun(this.state.organization)
      .then(res => {
        this.setState({syncing: false});
        if (res.status === "ok") {
          Setting.showMessage("success", "同步任务已启动");
          this.refresh(this.state.organization);
        } else if (typeof res.msg === "string" && res.msg.toLowerCase().includes("already running")) {
          Setting.showMessage("info", "已有同步任务在运行，已刷新同步记录。");
          this.refresh(this.state.organization);
        } else {
          Setting.showMessage("error", `同步失败：${res.msg}`);
        }
      }).catch(error => {
        this.setState({syncing: false});
        Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
      });
  }

  formatPreviewCounts(counts: FeishuDiffCounts = {}) {
    const parts = [
      `新增 ${counts.toCreate || 0}`,
      `更新 ${counts.toUpdate || 0}`,
      `软禁 ${counts.toSoftDisable || 0}`,
    ];
    if (Number(counts.conflict || 0) > 0) {
      parts.push(`冲突 ${counts.conflict || 0}`);
    }
    if (Number(counts.invalid || 0) > 0) {
      parts.push(`无效 ${counts.invalid || 0}`);
    }
    return parts.join(" / ");
  }

  renderPreviewReasonCounts(reasonCounts?: Record<string, number>) {
    const entries = Object.entries(reasonCounts || {}).filter(([, value]) => Number(value || 0) > 0);
    if (entries.length === 0) {
      return <Text type="secondary">无风险原因计数</Text>;
    }
    return (
      <Space size={4} wrap>
        {entries.map(([reason, count]) => <Tag key={reason}>{dryRunReasonLabels[reason] || reason}: {count}</Tag>)}
      </Space>
    );
  }

  formatDryRunDiff(record: FeishuDryRunHistoryRecord = {}) {
    return `部 ${record.departmentToCreate || 0}/${record.departmentToUpdate || 0}/${record.departmentToSoftDisable || 0} · 人 ${record.userToCreate || 0}/${record.userToUpdate || 0}/${record.userToSoftDisable || 0} · 关系 ${record.membershipToCreate || 0}/${record.membershipToUpdate || 0}/${record.membershipToSoftDisable || 0}`;
  }

  getDryRunSourceAlias(record: FeishuDryRunHistoryRecord = {}) {
    return [record.appAlias, record.tenantAlias].filter(Boolean).join(" / ") || "-";
  }

  openDryRunHistoryDetail(record: FeishuDryRunHistoryRecord) {
    this.setState({
      dryRunHistoryDetailOpen: true,
      dryRunHistoryDetailLoading: true,
      dryRunHistoryDetail: record,
      dryRunHistoryDetailError: "",
    });
    FeishuOrganizationSyncBackend.getFeishuOrganizationSyncDryRunHistory(this.state.organization, record.name || "")
      .then(res => {
        if (this.isUnmounted) {
          return;
        }
        if (res.status === "ok") {
          this.setState({dryRunHistoryDetailLoading: false, dryRunHistoryDetail: res.data || null, dryRunHistoryDetailError: ""});
        } else {
          this.setState({dryRunHistoryDetailLoading: false, dryRunHistoryDetailError: res.msg || "Dry-run 详情加载失败"});
        }
      }).catch(error => {
        if (this.isUnmounted) {
          return;
        }
        this.setState({dryRunHistoryDetailLoading: false, dryRunHistoryDetailError: `${i18next.t("general:Failed to connect to server")}: ${error}`});
      });
  }

  getBindingRiskTag(riskLevel?: string) {
    const colorMap: LabelMap = {none: "green", low: "lime", medium: "orange", high: "volcano", critical: "red"};
    const key = riskLevel || "";
    return <Tag color={colorMap[key] || "default"}>{bindingRiskLabels[key] || key || "-"}</Tag>;
  }

  getBindingStatusTag(status?: string) {
    const colorMap: LabelMap = {disabled: "default", empty: "default", ok: "green", warning: "orange", blocked: "red"};
    const key = status || "";
    return <Tag color={colorMap[key] || "default"}>{bindingStatusLabels[key] || key || "-"}</Tag>;
  }

  getBindingIssueTypeLabel(type?: string) {
    const key = type || "";
    return bindingIssueTypeLabels[key] || key || "-";
  }

  getBindingActionLabel(action?: string) {
    const key = action || "";
    return bindingActionLabels[key] || key || "-";
  }

  getBindingDiagnosticsJson(payload: BindingDiagnosticsPayload = this.state.bindingDiagnostics) {
    return JSON.stringify(payload || {}, null, 2);
  }

  copyBindingDiagnosticsJson(payload: BindingDiagnosticsPayload): void {
    const text = this.getBindingDiagnosticsJson(payload);
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => Setting.showMessage("success", "已复制脱敏 JSON"))
        .catch(error => Setting.showMessage("error", `复制失败：${error}`));
      return;
    }
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    Setting.showMessage("success", "已复制脱敏 JSON");
  }

  exportBindingDiagnosticsJson(payload: BindingDiagnosticsPayload = this.state.bindingDiagnostics): void {
    const blob = new Blob([this.getBindingDiagnosticsJson(payload)], {type: "application/json;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const generatedAt = (payload?.generatedAt || new Date().toISOString()).replace(/[:.]/g, "-");
    link.href = url;
    link.download = `feishu-user-binding-diagnostics-${generatedAt}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  getHandoffReadinessTag(readiness?: string) {
    const colorMap: LabelMap = {ready: "green", blocked: "red", running: "processing", no_run: "default", unsupported: "default"};
    const key = readiness || "";
    return <Tag color={colorMap[key] || "default"}>{handoffReadinessLabels[key] || key || "-"}</Tag>;
  }

  getHandoffEvidenceJson(payload: FeishuHandoffEvidence | null = this.state.handoffEvidence) {
    return JSON.stringify(payload || {}, null, 2);
  }

  getHandoffSummaryText(text?: string) {
    return (text || "").replace(/交接证据/g, "交接资料");
  }

  copyHandoffEvidenceJson(payload: FeishuHandoffEvidence | null = this.state.handoffEvidence): void {
    const text = this.getHandoffEvidenceJson(payload);
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => Setting.showMessage("success", "已复制交接资料 JSON"))
        .catch(error => Setting.showMessage("error", `复制失败：${error}`));
      return;
    }
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    Setting.showMessage("success", "已复制交接资料 JSON");
  }

  exportHandoffEvidenceJson(payload: FeishuHandoffEvidence | null = this.state.handoffEvidence): void {
    const blob = new Blob([this.getHandoffEvidenceJson(payload)], {type: "application/json;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const generatedAt = (payload?.generatedAt || new Date().toISOString()).replace(/[:.]/g, "-");
    link.href = url;
    link.download = `feishu-handoff-evidence-${generatedAt}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  getHandoffAcceptanceChecklistJson(payload?: FeishuHandoffAcceptanceChecklist) {
    return JSON.stringify(payload || {}, null, 2);
  }

  copyHandoffAcceptanceChecklistJson(payload?: FeishuHandoffAcceptanceChecklist): void {
    const text = this.getHandoffAcceptanceChecklistJson(payload);
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => Setting.showMessage("success", "已复制验收清单 JSON"))
        .catch(error => Setting.showMessage("error", `复制失败：${error}`));
      return;
    }
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    Setting.showMessage("success", "已复制验收清单 JSON");
  }

  exportHandoffAcceptanceChecklistJson(payload?: FeishuHandoffAcceptanceChecklist): void {
    const blob = new Blob([this.getHandoffAcceptanceChecklistJson(payload)], {type: "application/json;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const generatedAt = (this.state.handoffEvidence?.generatedAt || new Date().toISOString()).replace(/[:.]/g, "-");
    link.href = url;
    link.download = `feishu-handoff-acceptance-checklist-${generatedAt}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  getHandoffAcceptanceChecklistMarkdown(payload?: FeishuHandoffAcceptanceChecklist) {
    const checklist: FeishuHandoffAcceptanceChecklist = payload || {};
    const summary = checklist.summary || {};
    const safeSource = checklist.safeSource || {};
    const lines = [
      "# Feishu Handoff Acceptance Checklist",
      "",
      `- version: ${checklist.version || "-"}`,
      `- executionMode: ${checklist.executionMode || "-"}`,
      `- manualReviewOnly: ${checklist.manualReviewOnly ? "true" : "false"}`,
      `- readiness: ${safeSource.readiness || "-"}`,
      `- sourceType: ${safeSource.sourceType || "-"}`,
      `- sourceIdHash: ${safeSource.sourceIdHash || "-"}`,
      `- sourceConnectionIdHash: ${safeSource.sourceConnectionIdHash || "-"}`,
      `- summary: total=${summary.total || 0}, passed=${summary.passed || 0}, needsReview=${summary.needsReview || 0}, blocked=${summary.blocked || 0}, missing=${summary.missing || 0}, cannotInfer=${summary.cannotInfer || 0}`,
      "",
      "## Provider-Owned Missing",
      ...(checklist.providerOwnedEvidenceMissing || ["-"]).map(item => `- ${item}`),
      "",
      "## Manual Review Actions",
      ...(checklist.manualReviewActions || ["-"]).map(item => `- ${item}`),
      "",
      "## Cannot Infer",
      ...(checklist.cannotInfer || ["-"]).map(item => `- ${item}`),
      "",
      "## No Fallback",
      ...(checklist.noFallback || ["-"]).map(item => `- ${item}`),
      "",
      "## Items",
      ...((checklist.items || []).length === 0 ? ["- -"] : (checklist.items || []).map(item => `- ${item.id || "-"}: ${item.status || "-"} / ${item.source || "-"} / ${item.recommendedActionAlias || "-"}`)),
      "",
      "## Retention And Redaction",
      `- redactionApplied: ${checklist.retention?.redactionApplied ? "true" : "false"}`,
      `- redactionVersion: ${checklist.retention?.redactionVersion || checklist.redaction?.version || "-"}`,
      `- retentionDays: ${checklist.retention?.retentionDays || 0}`,
      `- retentionPolicy: ${checklist.retention?.retentionPolicy || "-"}`,
    ];
    return lines.join("\n");
  }

  copyHandoffAcceptanceChecklistMarkdown(payload?: FeishuHandoffAcceptanceChecklist): void {
    const text = this.getHandoffAcceptanceChecklistMarkdown(payload);
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => Setting.showMessage("success", "已复制验收清单 Markdown"))
        .catch(error => Setting.showMessage("error", `复制失败：${error}`));
      return;
    }
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    Setting.showMessage("success", "已复制验收清单 Markdown");
  }

  exportHandoffAcceptanceChecklistMarkdown(payload?: FeishuHandoffAcceptanceChecklist): void {
    const blob = new Blob([this.getHandoffAcceptanceChecklistMarkdown(payload)], {type: "text/markdown;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const generatedAt = (this.state.handoffEvidence?.generatedAt || new Date().toISOString()).replace(/[:.]/g, "-");
    link.href = url;
    link.download = `feishu-handoff-acceptance-checklist-${generatedAt}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  renderHandoffCounts(counts: FeishuHandoffCounts = {}, options: HandoffCountsRenderOptions = {}) {
    const {compact = false} = options;
    const format = (item?: FeishuDiffCounts) => `新 ${item?.toCreate || 0} / 更 ${item?.toUpdate || 0} / 软禁 ${item?.toSoftDisable || 0} / 冲突 ${item?.conflict || 0} / 无效 ${item?.invalid || 0}`;
    const items = [
      <Text key="departments">{`部门：${format(counts.departments)}`}</Text>,
      <Text key="users">{`用户：${format(counts.users)}`}</Text>,
      <Text key="memberships">{`关系：${format(counts.memberships)}`}</Text>,
    ];
    if (compact) {
      return <Space size={8} wrap>{items}</Space>;
    }
    return (
      <Space direction="vertical" size={2}>
        {items}
      </Space>
    );
  }

  getHandoffAliasLabel(alias?: string) {
    const key = alias || "";
    return handoffChecklistItemLabels[key] || handoffActionLabels[key] || handoffEvidenceAliasLabels[key] || handoffBlockedReasonLabels[key] || key || "-";
  }

  renderHandoffAliasList(items: string[] = [], color = "blue") {
    const normalized = Array.from(new Set((items || []).filter(Boolean)));
    if (normalized.length === 0) {
      return <Text type="secondary">无</Text>;
    }
    return (
      <Space size={4} wrap>
        {normalized.map(item => <Tag color={color} key={item}>{this.getHandoffAliasLabel(item)}</Tag>)}
      </Space>
    );
  }

  renderAcceptanceStatusTag(status?: string) {
    const key = status || "";
    return <Tag color={handoffAcceptanceStatusColors[key] || "default"}>{handoffAcceptanceStatusLabels[key] || key || "-"}</Tag>;
  }

  renderHandoffAcceptanceChecklist(checklist?: FeishuHandoffAcceptanceChecklist, options: HandoffAcceptanceRenderOptions = {}) {
    const {compact = false, showAuditDetails = true} = options;
    if (!checklist?.version) {
      return (
        <Alert
          style={{marginTop: 12}}
          type="info"
          showIcon
          message="验收清单"
          description="暂无验收清单；刷新交接资料后可复制或导出脱敏 checklist。"
        />
      );
    }
    const summary = checklist.summary || {};
    const safeSource = checklist.safeSource || {};
    const checklistRows = (checklist.items || []).map((item, index) => ({...item, key: item.id || index}));
    const actionItems = [...(checklist.manualReviewActions || []), ...(checklist.noFallback || [])];
    const evidenceItems = [...(checklist.providerOwnedEvidenceMissing || []), ...(checklist.cannotInfer || [])];
    const detailContent = (
      <Space direction="vertical" size={8} style={{width: "100%"}}>
        <Space size={4} wrap>
          {checklist.executionMode && <Tag color="blue">人工复核模式</Tag>}
          {checklist.manualReviewOnly && <Tag color="gold">仅作验收辅助</Tag>}
          {checklist.retention?.redactionApplied && <Tag color="green">已脱敏</Tag>}
          {Number(checklist.retention?.retentionDays || 0) > 0 && <Tag>{`保留 ${checklist.retention?.retentionDays || 0} 天`}</Tag>}
        </Space>
        <Space direction="vertical" size={6} style={{width: "100%"}}>
          <Text type="secondary">外部补充材料</Text>
          {this.renderHandoffAliasList(checklist.providerOwnedEvidenceMissing, "blue")}
          <Text type="secondary">人工复核动作</Text>
          {this.renderHandoffAliasList(checklist.manualReviewActions, "gold")}
          <Text type="secondary">无法自动证明</Text>
          {this.renderHandoffAliasList([...(checklist.cannotInfer || []), ...(checklist.noFallback || [])], "volcano")}
        </Space>
        <Space direction="vertical" size={8} style={{width: "100%"}}>
          {checklistRows.length === 0 ? <Text type="secondary">暂无验收项</Text> : checklistRows.map(item => (
            <div key={item.key} style={{border: "1px solid #f0f0f0", borderRadius: 4, padding: 10}}>
              <Row gutter={[8, 8]} align="top">
                <Col xs={24} md={8}>
                  <Space direction="vertical" size={4}>
                    <Space size={4} wrap>
                      <Text strong>{this.getHandoffAliasLabel(item.id)}</Text>
                      {this.renderAcceptanceStatusTag(item.status)}
                    </Space>
                    <Space size={4} wrap>
                      {item.source && <Tag>{this.getHandoffAliasLabel(item.source)}</Tag>}
                      {item.manualReviewOnly && <Tag color="gold">人工复核</Tag>}
                      {item.providerOwned && <Tag color="blue">外部材料</Tag>}
                      {item.noFallback && <Tag color="volcano">无自动兜底</Tag>}
                    </Space>
                  </Space>
                </Col>
                <Col xs={24} md={16}>
                  <Space direction="vertical" size={4} style={{width: "100%"}}>
                    <Typography.Paragraph style={{marginBottom: 0}} ellipsis={{rows: 3, expandable: true}}>
                      {this.getHandoffSummaryText(item.safeSummary) || "-"}
                    </Typography.Paragraph>
                    {item.recommendedActionAlias && (
                      <Space size={4} wrap>
                        <Text type="secondary">建议</Text>
                        <Tag color="blue">{this.getHandoffAliasLabel(item.recommendedActionAlias)}</Tag>
                      </Space>
                    )}
                  </Space>
                </Col>
              </Row>
            </div>
          ))}
        </Space>
      </Space>
    );
    return (
      <Space direction="vertical" size={8} style={{width: "100%", marginTop: 12}}>
        <Row align="middle" justify="space-between">
          <Col>
            <Space direction="vertical" size={2}>
              <Text strong>验收清单</Text>
              {compact ? (
                <Text type="secondary">
                  {showAuditDetails ? "只展示脱敏摘要；完整安全别名和逐项清单可展开查看。" : "交接资料已就绪，完整审计清单保留在导出的 JSON / Markdown 中。"}
                </Text>
              ) : (
                <Space wrap size={4}>
                  {checklist.version && <Tag>{checklist.version}</Tag>}
                  {checklist.executionMode && <Tag color="blue">{checklist.executionMode}</Tag>}
                  {checklist.manualReviewOnly && <Tag color="gold">manual_review_only</Tag>}
                  {safeSource.sourceIdHash && <Tag>{safeSource.sourceIdHash}</Tag>}
                  {safeSource.sourceConnectionIdHash && <Tag>{safeSource.sourceConnectionIdHash}</Tag>}
                </Space>
              )}
            </Space>
          </Col>
          <Col>
            <Space wrap>
              <Button aria-label="copy-handoff-acceptance-checklist-json" icon={<CopyOutlined />} onClick={() => this.copyHandoffAcceptanceChecklistJson(checklist)}>复制清单 JSON</Button>
              <Button aria-label="copy-handoff-acceptance-checklist-markdown" icon={<CopyOutlined />} onClick={() => this.copyHandoffAcceptanceChecklistMarkdown(checklist)}>复制 Markdown</Button>
              <Button aria-label="export-handoff-acceptance-checklist-json" icon={<DownloadOutlined />} onClick={() => this.exportHandoffAcceptanceChecklistJson(checklist)}>导出清单 JSON</Button>
              <Button aria-label="export-handoff-acceptance-checklist-markdown" icon={<DownloadOutlined />} onClick={() => this.exportHandoffAcceptanceChecklistMarkdown(checklist)}>导出 Markdown</Button>
            </Space>
          </Col>
        </Row>
        {showAuditDetails ? (
          <Space wrap size={4}>
            <Tag>{`总 ${summary.total || 0}`}</Tag>
            <Tag color="green">{`通过 ${summary.passed || 0}`}</Tag>
            <Tag color="gold">{`待复核 ${summary.needsReview || 0}`}</Tag>
            <Tag color="red">{`阻断 ${summary.blocked || 0}`}</Tag>
            <Tag color="orange">{`缺失 ${summary.missing || 0}`}</Tag>
            <Tag color="blue">{`无法推断 ${summary.cannotInfer || 0}`}</Tag>
            {!compact && summary.derivedOnly && <Tag>derived</Tag>}
            {!compact && summary.noFallback && <Tag color="volcano">noFallback</Tag>}
            {!compact && checklist.retention?.redactionApplied && <Tag color="green">{checklist.retention.redactionVersion || "redacted"}</Tag>}
            {!compact && Number(checklist.retention?.retentionDays || 0) > 0 && <Tag>{`retention ${checklist.retention?.retentionDays || 0}d`}</Tag>}
          </Space>
        ) : (
          <Space wrap size={4}>
            <Tag>{`总 ${summary.total || 0}`}</Tag>
            <Tag color="green">{`通过 ${summary.passed || 0}`}</Tag>
            {checklist.retention?.redactionApplied && <Tag color="green">已脱敏</Tag>}
            {Number(checklist.retention?.retentionDays || 0) > 0 && <Tag>{`保留 ${checklist.retention?.retentionDays || 0} 天`}</Tag>}
          </Space>
        )}
        {compact && showAuditDetails && (
          <Row gutter={[12, 12]}>
            <Col xs={24} md={12}>
              <Space direction="vertical" size={4} style={{width: "100%"}}>
                <Text type="secondary">建议下一步</Text>
                {this.renderHandoffAliasList(actionItems, "gold")}
              </Space>
            </Col>
            <Col xs={24} md={12}>
              <Space direction="vertical" size={4} style={{width: "100%"}}>
                <Text type="secondary">无法在本页证明的事项</Text>
                {this.renderHandoffAliasList(evidenceItems, "blue")}
              </Space>
            </Col>
          </Row>
        )}
        {compact ? (showAuditDetails ? (
          <Collapse
            size="small"
            destroyInactivePanel
            items={[{
              key: "details",
              label: "详细清单和安全别名",
              children: detailContent,
            }]}
          />
        ) : null) : detailContent}
      </Space>
    );
  }

  renderHandoffEvidenceDetailsModal(evidence: FeishuHandoffEvidence, hasHandoffDetails: boolean) {
    const blockedReasons = evidence.blockedReasons || [];
    const operatorNextActions = evidence.operatorNextActions || [];
    const cannotInfer = evidence.cannotInfer || [];
    const isReady = evidence.readiness === "ready";
    return (
      <Modal
        title="验收资料"
        width={720}
        centered
        footer={null}
        open={this.state.handoffEvidenceDetailsOpen}
        onCancel={() => this.setState({handoffEvidenceDetailsOpen: false})}
      >
        {!hasHandoffDetails ? (
          <Alert type="info" showIcon message="暂无验收资料" description="当前交接资料只有摘要信息。" />
        ) : (
          <Space direction="vertical" size={10} style={{width: "100%"}}>
            <Alert
              type={evidence.readiness === "blocked" ? "warning" : "info"}
              showIcon
              message={
                <Space wrap>
                  {this.getHandoffReadinessTag(evidence.readiness)}
                  {evidence.sourceType && <Tag>{handoffSourceTypeLabels[evidence.sourceType] || evidence.sourceType}</Tag>}
                  {evidence.redaction?.applied && <Tag color="green">已脱敏</Tag>}
                </Space>
              }
              description={<Typography.Paragraph style={{marginBottom: 0}} ellipsis={{rows: 3, expandable: true}}>{this.getHandoffSummaryText(evidence.safeSummary) || "-"}</Typography.Paragraph>}
            />
            {blockedReasons.length > 0 && (
              <Space direction="vertical" size={2}>
                <Text type="secondary">当前阻断</Text>
                {this.renderHandoffAliasList(blockedReasons, "red")}
              </Space>
            )}
            {!isReady && operatorNextActions.length > 0 && (
              <Space direction="vertical" size={2}>
                <Text type="secondary">建议下一步</Text>
                {this.renderHandoffAliasList(operatorNextActions, "gold")}
              </Space>
            )}
            {!isReady && cannotInfer.length > 0 && (
              <Space direction="vertical" size={2}>
                <Text type="secondary">无法在本页证明</Text>
                {this.renderHandoffAliasList(cannotInfer, "blue")}
              </Space>
            )}
            {this.renderHandoffAcceptanceChecklist(evidence.acceptanceChecklist, {compact: true, showAuditDetails: !isReady})}
          </Space>
        )}
      </Modal>
    );
  }

  renderHandoffEvidence() {
    const evidence = this.state.handoffEvidence || {};
    const hasHandoffProblem = Boolean(this.state.handoffEvidenceError) || evidence.readiness === "blocked";
    const readinessType = this.state.handoffEvidenceError ? "error" : evidence.readiness === "blocked" ? "warning" : "info";
    const hasHandoffDetails = Boolean(evidence.sourceConnectionIdHash || evidence.endpointMode || evidence.appAlias || evidence.tenantAlias || evidence.acceptanceChecklist?.version ||
      (evidence.blockedReasons || []).length > 0 || (evidence.operatorNextActions || []).length > 0 || (evidence.cannotInfer || []).length > 0);
    const sourceTypeOptions = [
      {value: "latest", label: handoffSourceTypeLabels.latest},
      {value: "run", label: handoffSourceTypeLabels.run},
      {value: "dry_run_history", label: handoffSourceTypeLabels.dry_run_history},
    ];
    const summary = this.state.handoffEvidenceError || this.getHandoffSummaryText(evidence.safeSummary) || (evidence.readiness ? "可按需复制或导出脱敏资料。" : "刷新后可查看最近的脱敏交接资料。");
    return (
      <>
        <Row align="middle" justify="space-between" gutter={[12, 8]} style={{marginBottom: hasHandoffProblem ? 8 : 0}}>
          <Col flex="auto">
            <Space size={8} wrap>
              <Text strong>交接资料</Text>
              {evidence.readiness && this.getHandoffReadinessTag(evidence.readiness)}
              {evidence.sourceType && <Tag>{handoffSourceTypeLabels[evidence.sourceType] || evidence.sourceType}</Tag>}
              {evidence.redaction?.applied && <Tag color="green">已脱敏</Tag>}
              <Text type={this.state.handoffEvidenceError ? "danger" : "secondary"}>{summary}</Text>
            </Space>
          </Col>
          <Col>
            <Space wrap>
              <Select
                size="small"
                value={this.state.handoffEvidenceSourceType}
                style={{width: 120}}
                options={sourceTypeOptions}
                onChange={sourceType => this.setState({handoffEvidenceSourceType: sourceType}, () => this.refreshHandoffEvidence(this.state.organization, sourceType).catch(() => {}))}
              />
              {hasHandoffDetails && (
                <Button
                  size="small"
                  type="link"
                  style={{padding: 0, height: "auto"}}
                  aria-label="toggle-handoff-evidence-details"
                  onClick={() => this.setState({handoffEvidenceDetailsOpen: true})}
                >
                  查看验收资料
                </Button>
              )}
              <Button size="small" type="link" aria-label="copy-handoff-evidence-json" icon={<CopyOutlined />} disabled={!evidence.generatedAt} onClick={() => this.copyHandoffEvidenceJson(evidence)}>复制 JSON</Button>
              <Button size="small" type="link" icon={<DownloadOutlined />} disabled={!evidence.generatedAt} onClick={() => this.exportHandoffEvidenceJson(evidence)}>导出 JSON</Button>
              <Button
                size="small"
                type="link"
                aria-label="refresh-handoff-evidence"
                icon={<ReloadOutlined />}
                loading={this.state.handoffEvidenceLoading}
                onClick={() => this.refreshHandoffEvidence().catch(() => {})}
              >
                刷新
              </Button>
            </Space>
          </Col>
        </Row>
        {evidence.readiness && hasHandoffProblem && (
          <Alert
            style={{marginBottom: 12}}
            type={readinessType}
            showIcon
            message={
              <Space wrap>
                {this.getHandoffReadinessTag(evidence.readiness)}
                {evidence.sourceType && <Tag>{handoffSourceTypeLabels[evidence.sourceType] || evidence.sourceType}</Tag>}
                {evidence.redaction?.applied && <Tag color="green">已脱敏</Tag>}
              </Space>
            }
            description={
              <Space direction="vertical" size={6} style={{width: "100%"}}>
                <Text>{this.getHandoffSummaryText(evidence.safeSummary) || "-"}</Text>
                {this.renderHandoffCounts(evidence.counts)}
                {evidence.bindingConflicts?.safeSummary && <Text type={evidence.bindingConflicts?.blocked ? "danger" : "secondary"}>{evidence.bindingConflicts.safeSummary}</Text>}
              </Space>
            }
          />
        )}
        {this.renderHandoffEvidenceDetailsModal(evidence, hasHandoffDetails)}
      </>
    );
  }

  openBindingDiagnosticsDetail(issue: FeishuUserBindingConflictIssue): void {
    this.setState({bindingDiagnosticsDetail: issue, bindingDiagnosticsDetailOpen: true});
  }

  renderBindingCounts(counts: FeishuUserBindingConflictCounts = {}) {
    const entries = [
      ["总数", counts.total],
      ["user_id 多用户", counts.duplicateUserIdBinding],
      ["本地多租户", counts.localUserMultiTenant],
      ["历史标识", counts.legacyIdentifierSplit],
      ["缺 tenant_key", counts.missingTenantKey],
      ["Endpoint", counts.endpointModeMismatch],
    ].filter(([, value]) => Number(value || 0) > 0);
    if (entries.length === 0) {
      return <Tag>风险 0</Tag>;
    }
    return (
      <Space size={4} wrap>
        {entries.map(([label, value]) => <Tag key={label}>{label}: {value}</Tag>)}
      </Space>
    );
  }

  renderBindingLinkage(linkage: BindingLinkage | undefined, prefix: string) {
    if (!linkage?.id) {
      return null;
    }
    return <Tag>{`${prefix}: ${linkage.id}`}</Tag>;
  }

  renderBindingDiagnostics() {
    const diagnostics: FeishuUserBindingConflictSummary = this.state.bindingDiagnostics || {};
    const issues = diagnostics.issues || [];
    const hasIssues = issues.length > 0;
    const columns = [
      {title: "风险", dataIndex: "riskLevel", key: "riskLevel", width: 90, render: (risk: string) => this.getBindingRiskTag(risk)},
      {title: "类型", dataIndex: "type", key: "type", width: 150, render: (type: string) => this.getBindingIssueTypeLabel(type)},
      {title: "摘要", dataIndex: "safeSummary", key: "safeSummary", width: 320, render: (text: string) => <Typography.Paragraph style={{marginBottom: 0}} ellipsis={{rows: 2, expandable: true}}>{text || "-"}</Typography.Paragraph>},
      {title: "样本", dataIndex: "sampleAliases", key: "sampleAliases", width: 210, render: (aliases: string[] = []) => (
        <Space size={4} wrap>{(aliases || []).map((alias: string) => <Tag key={alias}>{alias}</Tag>)}</Space>
      )},
      {title: "建议动作", dataIndex: "recommendedAction", key: "recommendedAction", width: 130, render: (action: string) => this.getBindingActionLabel(action)},
      {title: "关联", key: "linkage", width: 230, render: (_: unknown, record: FeishuUserBindingConflictIssue) => (
        <Space size={4} wrap>
          {this.renderBindingLinkage(record.latestRun, "run")}
          {this.renderBindingLinkage(record.latestDryRunHistory, "history")}
        </Space>
      )},
      {title: "操作", key: "action", width: 90, render: (_: unknown, record: FeishuUserBindingConflictIssue) => <Button size="small" aria-label={`binding-diagnostics-detail-${record.id}`} onClick={() => this.openBindingDiagnosticsDetail(record)}>详情</Button>},
    ];
    const statusType = diagnostics.status === "blocked" ? "error" : diagnostics.status === "warning" ? "warning" : diagnostics.status === "ok" ? "success" : "info";
    const hasProblem = Boolean(this.state.bindingDiagnosticsError) || diagnostics.status === "blocked" || diagnostics.status === "warning" || hasIssues;
    if (!hasProblem) {
      return (
        <>
          <Row align="middle" justify="space-between" style={{marginBottom: 12}}>
            <Col>
              <Space size={8} wrap>
                <Text strong>{`身份匹配：${bindingStatusLabels[diagnostics.status || ""] || "待刷新"}`}</Text>
                <Text type="secondary">{diagnostics.safeSummary || "仅展示脱敏绑定风险摘要。"}</Text>
              </Space>
            </Col>
            <Col>
              <Button icon={<ReloadOutlined />} loading={this.state.bindingDiagnosticsLoading} onClick={() => this.refreshBindingDiagnostics().catch(() => {})}>刷新</Button>
            </Col>
          </Row>
          {this.renderBindingDiagnosticsDetailDrawer()}
        </>
      );
    }
    return (
      <>
        <Row align="middle" justify="space-between" style={{marginBottom: 12}}>
          <Col>
            <Space direction="vertical" size={2}>
              <Text strong>绑定冲突 / 身份匹配诊断</Text>
              <Text type={this.state.bindingDiagnosticsError ? "danger" : "secondary"}>
                {this.state.bindingDiagnosticsError || diagnostics.safeSummary || "仅展示脱敏绑定风险摘要。"}
              </Text>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button icon={<CopyOutlined />} disabled={!diagnostics.generatedAt} onClick={() => this.copyBindingDiagnosticsJson(diagnostics)}>复制 JSON</Button>
              <Button icon={<DownloadOutlined />} disabled={!diagnostics.generatedAt} onClick={() => this.exportBindingDiagnosticsJson(diagnostics)}>导出 JSON</Button>
              <Button icon={<ReloadOutlined />} loading={this.state.bindingDiagnosticsLoading} onClick={() => this.refreshBindingDiagnostics().catch(() => {})}>刷新</Button>
            </Space>
          </Col>
        </Row>
        {diagnostics.status && (
          <Alert
            style={{marginBottom: 12}}
            type={statusType}
            showIcon
            message={<Space wrap>{this.getBindingStatusTag(diagnostics.status)}{this.getBindingRiskTag(diagnostics.riskLevel)}{this.renderBindingCounts(diagnostics.counts)}</Space>}
            description={
              <Space direction="vertical" size={6} style={{width: "100%"}}>
                <Text>{diagnostics.safeSummary || "-"}</Text>
                {hasIssues && (
                  <Space wrap>
                    <Button
                      size="small"
                      type="link"
                      style={{padding: 0, height: "auto"}}
                      aria-label="toggle-binding-diagnostics-issues"
                      onClick={() => this.setState({bindingDiagnosticsIssuesOpen: !this.state.bindingDiagnosticsIssuesOpen})}
                    >
                      {this.state.bindingDiagnosticsIssuesOpen ? "收起冲突详情" : "查看冲突详情"}
                    </Button>
                    {!this.state.bindingDiagnosticsIssuesOpen && <Text type="secondary">{`已收起 ${issues.length} 条脱敏诊断详情`}</Text>}
                  </Space>
                )}
                {this.state.bindingDiagnosticsIssuesOpen && (
                  <Space size={4} wrap>
                    {diagnostics.sourceConnectionIdHash && <Tag>{diagnostics.sourceConnectionIdHash}</Tag>}
                    {this.renderBindingLinkage(diagnostics.latestRun, "run")}
                    {this.renderBindingLinkage(diagnostics.latestDryRunHistory, "history")}
                    {diagnostics.redaction?.applied && <Tag color="green">{diagnostics.redaction.version || "已脱敏"}</Tag>}
                  </Space>
                )}
              </Space>
            }
          />
        )}
        {this.state.bindingDiagnosticsIssuesOpen && (
          <Table
            rowKey="id"
            size="middle"
            bordered
            loading={this.state.loading || this.state.bindingDiagnosticsLoading}
            columns={columns}
            dataSource={issues}
            locale={{emptyText: this.state.bindingDiagnosticsError || (diagnostics.status === "disabled" ? "飞书组织同步未启用" : "暂无绑定冲突")}}
            scroll={{x: 1220}}
            pagination={false}
          />
        )}
        {this.renderBindingDiagnosticsDetailDrawer()}
      </>
    );
  }

  renderBindingDiagnosticsDetailDrawer() {
    const detail = (this.state.bindingDiagnosticsDetail || this.state.bindingDiagnostics || {}) as FeishuUserBindingConflictIssue & FeishuUserBindingConflictSummary;
    return (
      <Drawer
        title="绑定诊断详情"
        width={560}
        open={this.state.bindingDiagnosticsDetailOpen}
        onClose={() => this.setState({bindingDiagnosticsDetailOpen: false})}
      >
        <Space direction="vertical" size={10} style={{width: "100%"}}>
          <Space wrap>
            {detail.riskLevel && this.getBindingRiskTag(detail.riskLevel)}
            {detail.type && <Tag>{this.getBindingIssueTypeLabel(detail.type)}</Tag>}
            {detail.recommendedAction && <Tag color="blue">{this.getBindingActionLabel(detail.recommendedAction)}</Tag>}
          </Space>
          <Typography.Paragraph ellipsis={{rows: 4, expandable: true}}>
            {detail.safeSummary || "-"}
          </Typography.Paragraph>
          {detail.blockedReason && <Text type="danger">{`阻断原因：${detail.blockedReason}`}</Text>}
          <Space size={4} wrap>
            {detail.sourceConnectionIdHash && <Tag>{detail.sourceConnectionIdHash}</Tag>}
            {this.renderBindingLinkage(detail.latestRun, "run")}
            {this.renderBindingLinkage(detail.latestDryRunHistory, "history")}
          </Space>
          <Space>
            <Button icon={<CopyOutlined />} onClick={() => this.copyBindingDiagnosticsJson(detail)}>复制 JSON</Button>
            <Button icon={<DownloadOutlined />} onClick={() => this.exportBindingDiagnosticsJson(detail)}>导出 JSON</Button>
          </Space>
          <pre style={{whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 420, overflow: "auto", background: "#f5f5f5", padding: 12, borderRadius: 4}}>
            {this.getBindingDiagnosticsJson(detail)}
          </pre>
        </Space>
      </Drawer>
    );
  }

  renderDryRunHistory() {
    const columns = [
      {title: "记录 ID", dataIndex: "name", key: "name", width: 180, render: (text: string) => <Text style={{wordBreak: "break-all"}}>{text || "-"}</Text>},
      {title: "状态 / 时间", key: "status", width: 150, render: (_: unknown, record: FeishuDryRunHistoryRecord) => (
        <Space direction="vertical" size={2}>
          {this.getStatusTag(record.status)}
          <Text type="secondary">{this.formatRunTime(record.createdAt)}</Text>
        </Space>
      )},
      {title: "影响", key: "impact", width: 220, render: (_: unknown, record: FeishuDryRunHistoryRecord) => (
        <Space direction="vertical" size={2}>
          <Text>{`快照：部 ${record.snapshotDepartmentCount || 0} / 人 ${record.snapshotUserCount || 0} / 关系 ${record.snapshotMembershipCount || 0}`}</Text>
          <Text type="secondary">{this.formatDryRunDiff(record)}</Text>
        </Space>
      )},
      {title: "诊断摘要", key: "summary", render: (_: unknown, record: FeishuDryRunHistoryRecord) => (
        <Space direction="vertical" size={4} style={{width: "100%"}}>
          <Space size={4} wrap>
            {record.diagnosticAlias && <Tag>{dryRunReasonLabels[record.diagnosticAlias] || record.diagnosticAlias}</Tag>}
            <Tag>{`${record.retentionDays || 0} 天`}</Tag>
            <Tag color={record.redactionApplied ? "green" : "default"}>{record.redactionApplied ? "已脱敏" : "未标记"}</Tag>
          </Space>
          <Typography.Paragraph style={{marginBottom: 0}} ellipsis={{rows: 2, expandable: true}}>
            {record.safeSummary || "-"}
          </Typography.Paragraph>
        </Space>
      )},
      {title: "操作", key: "action", width: 90, render: (_: unknown, record: FeishuDryRunHistoryRecord) => <Button size="small" aria-label={`dry-run-history-detail-${record.name}`} onClick={() => this.openDryRunHistoryDetail(record)}>详情</Button>},
    ];
    return (
      <>
        <Modal
          title="Dry-run 历史"
          width={960}
          centered
          footer={null}
          open={this.state.dryRunHistoryOpen}
          onCancel={() => this.setState({dryRunHistoryOpen: false})}
        >
          <Table
            rowKey="name"
            size="middle"
            bordered
            loading={this.state.loading || this.state.dryRunHistoryLoading}
            columns={columns}
            dataSource={this.state.dryRunHistories}
            locale={{emptyText: this.state.dryRunHistoryError || "暂无 Dry-run 历史"}}
            pagination={false}
          />
        </Modal>
        {this.renderDryRunHistoryDetailModal()}
      </>
    );
  }

  renderDryRunHistoryDetailModal() {
    const detail = this.state.dryRunHistoryDetail || {};
    const diagnostics = detail.diagnostics || {};
    return (
      <Modal
        title="Dry-run 详情"
        width={560}
        centered
        footer={null}
        open={this.state.dryRunHistoryDetailOpen}
        onCancel={() => this.setState({dryRunHistoryDetailOpen: false})}
      >
        {this.state.dryRunHistoryDetailError && <Alert type="error" showIcon style={{marginBottom: 12}} message={this.state.dryRunHistoryDetailError} />}
        <Space direction="vertical" size={10} style={{width: "100%"}}>
          <Text strong>{detail.name || "-"}</Text>
          <Text type="secondary">{this.getDryRunSourceAlias(detail)}</Text>
          <Space wrap>{this.getStatusTag(detail.status)}{detail.diagnosticAlias && <Tag>{detail.diagnosticAlias}</Tag>}</Space>
          <Text>{`预览时间 ${this.formatRunTime(detail.createdAt)}`}</Text>
          <Text>{`快照：部门 ${detail.snapshotDepartmentCount || 0} / 用户 ${detail.snapshotUserCount || 0} / 关系 ${detail.snapshotMembershipCount || 0}`}</Text>
          <Text>{`Diff：${this.formatDryRunDiff(detail)}`}</Text>
          {this.renderPreviewReasonCounts(detail.reasonCounts)}
          <Typography.Paragraph ellipsis={{rows: 3, expandable: true}}>
            {diagnostics.safeSummary || detail.safeSummary || "-"}
          </Typography.Paragraph>
          <Text>{`Request marker：${detail.requestMarker || "-"}`}</Text>
          <Text>{`Operator：${detail.operatorHash || "-"}`}</Text>
          <Space wrap>
            <Tag>{`保留 ${detail.retentionDays || 0} 天`}</Tag>
            <Tag color={detail.redactionApplied ? "green" : "default"}>{detail.redactionApplied ? "已脱敏" : "未标记"}</Tag>
            {detail.redactionVersion && <Tag>{detail.redactionVersion}</Tag>}
          </Space>
        </Space>
      </Modal>
    );
  }

  renderDryRunPreview() {
    const preview = this.state.previewResult;
    if (!preview && !this.state.previewError) {
      return null;
    }
    if (this.state.previewError) {
      return (
        <Alert
          style={{marginTop: 16}}
          type="error"
          showIcon
          message="Dry-run 预览"
          description={this.state.previewError}
        />
      );
    }
    const source = preview?.source || {};
    const stats = preview?.snapshotStats || {};
    const diff = preview?.diff || {};
    const diagnostics = preview?.diagnostics || {};
    const sourceAlias = [source.appAlias, source.tenantAlias].filter(Boolean).join(" / ") || "-";
    const previewStatus = preview?.status === "failed" ? "warning" : "success";
    return (
      <Alert
        style={{marginTop: 16}}
        type={previewStatus}
        showIcon
        message="Dry-run 预览"
        description={
          <Space direction="vertical" size={6}>
            <Text>{sourceAlias}</Text>
            <Text type="secondary">{`预览时间 ${this.formatRunTime(source.previewedAt)}`}</Text>
            <Text>{`部门 ${stats.departmentCount || 0} / 用户 ${stats.userCount || 0} / 关系 ${stats.membershipCount || 0}`}</Text>
            <Space size={8}><Text type="secondary">部门</Text><Text>{this.formatPreviewCounts(diff.departments)}</Text></Space>
            <Space size={8}><Text type="secondary">用户</Text><Text>{this.formatPreviewCounts(diff.users)}</Text></Space>
            <Space size={8}><Text type="secondary">关系</Text><Text>{this.formatPreviewCounts(diff.memberships)}</Text></Space>
            {this.renderPreviewReasonCounts(preview?.reasonCounts)}
            {diagnostics.safeSummary && <Text type={preview?.status === "failed" ? "danger" : "secondary"}>{diagnostics.safeSummary}</Text>}
          </Space>
        }
      />
    );
  }

  formatRunTime(text?: string): string {
    if (!text || String(text).startsWith("0001-01-01")) {
      return "-";
    }
    return Setting.getFormattedDate(text) || "-";
  }

  getStatusTag(status?: string) {
    const colorMap: LabelMap = {running: "processing", succeeded: "success", failed: "error", partial: "warning"};
    const labelMap: LabelMap = {running: "运行中", succeeded: "成功", failed: "失败", partial: "部分成功"};
    const key = status || "";
    return <Tag color={colorMap[key] || "default"}>{labelMap[key] || key || "-"}</Tag>;
  }

  getTriggerTag(triggerType?: string) {
    const colorMap: LabelMap = {manual: "blue", scheduled: "cyan"};
    const labelMap: LabelMap = {manual: "手动", scheduled: "定时"};
    const key = triggerType || "";
    return <Tag color={colorMap[key] || "default"}>{labelMap[key] || key || "-"}</Tag>;
  }

  getStageText(stage?: string, status?: string) {
    if (status === "succeeded") {
      return "已完成";
    }
    const labelMap: LabelMap = {fetching: "拉取数据", planning: "计算差异", applying: "应用变更", finalizing: "收尾处理"};
    const key = stage || "";
    return labelMap[key] || key || "-";
  }

  getDiagnosticLabel(labels: LabelMap, value?: string) {
    const key = value || "";
    return labels[key] || key || "-";
  }

  getDiagnosticTagColor(kind: "category" | "action", value?: string) {
    const key = value || "";
    if (kind === "category") {
      const colorMap: LabelMap = {
        configuration: "orange",
        credentials: "red",
        permission: "volcano",
        provider: "gold",
        contract: "purple",
        local_apply: "magenta",
        projection: "geekblue",
        partial_sync: "warning",
        unknown: "default",
      };
      return colorMap[key] || "default";
    }
    if (kind === "action") {
      const colorMap: LabelMap = {
        fix_credentials: "red",
        grant_contact_scope: "volcano",
        wait_rate_limit: "gold",
        inspect_mapping_conflict: "magenta",
        inspect_projection: "geekblue",
        manual_review: "blue",
        unknown: "default",
      };
      return colorMap[key] || "default";
    }
    return "default";
  }

  formatDurationMs(durationMs?: number) {
    const value = Number(durationMs || 0);
    if (!Number.isFinite(value) || value <= 0) {
      return "-";
    }
    const totalSeconds = Math.round(value / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes > 0) {
      return `${minutes} 分 ${seconds} 秒`;
    }
    return `${seconds} 秒`;
  }

  renderDiagnostics(record: FeishuOrganizationSyncRunRecord) {
    const diagnostics = record?.diagnostics;
    if (!diagnostics) {
      return "-";
    }
    const category = diagnostics.failureCategory;
    const stage = diagnostics.failedStage;
    const action = diagnostics.operatorAction;
    return (
      <Space size={4} wrap>
        {category && <Tag color={this.getDiagnosticTagColor("category", category)}>{this.getDiagnosticLabel(diagnosticCategoryLabels, category)}</Tag>}
        {stage && <Tag>{this.getDiagnosticLabel(diagnosticStageLabels, stage)}</Tag>}
        {action && <Tag color={this.getDiagnosticTagColor("action", action)}>{this.getDiagnosticLabel(diagnosticActionLabels, action)}</Tag>}
        {diagnostics.retryReadiness && <Tag>{this.getDiagnosticLabel(diagnosticRetryLabels, diagnostics.retryReadiness)}</Tag>}
      </Space>
    );
  }

  renderDiagnosticStats(record: FeishuOrganizationSyncRunRecord) {
    const diagnostics = record?.diagnostics;
    const stats = diagnostics?.stats || {};
    const hasStats = diagnostics && ["departmentCount", "userCount", "membershipCount", "disabledCount"].some(key => stats[key] !== undefined);
    if (!hasStats && !diagnostics?.durationMs) {
      return "-";
    }
    return (
      <Space direction="vertical" size={0}>
        {hasStats && <span>{`部 ${stats.departmentCount || 0} / 人 ${stats.userCount || 0} / 关系 ${stats.membershipCount || 0} / 禁 ${stats.disabledCount || 0}`}</span>}
        <Text type="secondary">{this.formatDurationMs(diagnostics.durationMs)}</Text>
      </Space>
    );
  }

  getRunSafeSummary(record: FeishuOrganizationSyncRunRecord) {
    return record?.diagnostics?.safeSummary || record?.errorText || "";
  }

  renderRunStatus(record: FeishuOrganizationSyncRunRecord) {
    return (
      <Space size={4} wrap>
        {this.getStatusTag(record.status)}
      </Space>
    );
  }

  formatImpactCounts(created?: number, updated?: number, disabled?: number) {
    return (
      <Text style={runStatisticTextStyle}>
        {`新 ${created || 0} / 更 ${updated || 0} / 禁 ${disabled || 0}`}
      </Text>
    );
  }

  renderRunErrorSummary(record: FeishuOrganizationSyncRunRecord) {
    const summary = this.getRunSafeSummary(record);
    const shouldShowDiagnostics = record?.status && record.status !== "succeeded" && record?.diagnostics;
    if (!summary && !shouldShowDiagnostics) {
      return "-";
    }
    return (
      <Space direction="vertical" size={4} style={{width: "100%"}}>
        {shouldShowDiagnostics && this.renderDiagnostics(record)}
        {shouldShowDiagnostics && this.renderDiagnosticStats(record)}
        <Typography.Paragraph style={{marginBottom: 0}} ellipsis={{rows: 2, expandable: true}}>
          {summary || "-"}
        </Typography.Paragraph>
      </Space>
    );
  }

  renderDryRunQuickAccess() {
    const latest = this.state.dryRunHistories?.[0];
    const latestText = latest?.createdAt ? `最近预览：${this.formatRunTime(latest.createdAt)}` : "可查看最近的 dry-run 预览历史。";
    return (
      <Space size={8} wrap style={{marginTop: 8}}>
        <Text type={this.state.dryRunHistoryError ? "danger" : "secondary"}>
          {this.state.dryRunHistoryError || latestText}
        </Text>
        <Button
          type="link"
          size="small"
          style={{padding: 0, height: "auto"}}
          loading={this.state.dryRunHistoryLoading}
          onClick={() => this.setState({dryRunHistoryOpen: true})}
        >
          查看预览历史
        </Button>
      </Space>
    );
  }

  renderAuxiliaryChecks() {
    return (
      <div style={{marginTop: 12}}>
        <Space direction="vertical" size={6} style={{width: "100%"}}>
          <div>{this.renderBindingDiagnostics()}</div>
          <div>{this.renderHandoffEvidence()}</div>
        </Space>
      </div>
    );
  }

  renderTestResult() {
    const result = this.state.testResult;
    if (!result) {
      return null;
    }
    const tenantKey = `${result.tenantKey || ""}`.trim();
    const targetOrganization = getFeishuBusinessOrganizationNameFromTenantKey(tenantKey);
    return (
      <Alert
        style={{marginTop: 16}}
        type="success"
        showIcon
        message="通讯录权限已满足"
        description={`部门：${result.departmentCount || 0}，成员：${result.userCount || 0}${targetOrganization ? `，保存后同步组织：${targetOrganization}` : ""}`}
      />
    );
  }

  renderRuns() {
    const columns = [
      {title: "序号", key: "index", width: 72, align: "center" as const, onHeaderCell: () => nowrapHeaderCell, render: (_: unknown, record: FeishuOrganizationSyncRunRecord, index: number) => this.renderRunIndex(record, index)},
      {title: "状态", key: "status", width: 110, render: (_: unknown, record: FeishuOrganizationSyncRunRecord) => this.renderRunStatus(record)},
      {title: "触发方式", dataIndex: "triggerType", key: "triggerType", width: 110, render: (triggerType: string) => this.getTriggerTag(triggerType)},
      {title: "阶段", dataIndex: "stage", key: "stage", width: 110, render: (stage: string, record: FeishuOrganizationSyncRunRecord) => this.getStageText(stage, record.status)},
      {title: "执行人", dataIndex: "actor", key: "actor", width: 140, ellipsis: true, render: (actor: string) => this.renderActor(actor)},
      {title: "开始时间", dataIndex: "startedAt", key: "startedAt", width: 170, render: (text: string) => this.formatRunTime(text)},
      {title: "结束时间", dataIndex: "finishedAt", key: "finishedAt", width: 170, render: (text: string) => this.formatRunTime(text)},
      {title: "部门", key: "departments", width: 150, render: (_: unknown, record: FeishuOrganizationSyncRunRecord) => this.formatImpactCounts(record.departmentCreatedCount, record.departmentUpdatedCount, record.departmentDisabledCount)},
      {title: "用户", key: "users", width: 150, render: (_: unknown, record: FeishuOrganizationSyncRunRecord) => this.formatImpactCounts(record.userCreatedCount, record.userUpdatedCount, record.userDisabledCount)},
      {title: "关系", key: "memberships", width: 150, render: (_: unknown, record: FeishuOrganizationSyncRunRecord) => this.formatImpactCounts(record.membershipCreatedCount, record.membershipUpdatedCount, record.membershipDisabledCount)},
      {title: "错误摘要", key: "diagnostics", onHeaderCell: () => nowrapHeaderCell, render: (_: unknown, record: FeishuOrganizationSyncRunRecord) => this.renderRunErrorSummary(record)},
    ];
    return (
      <Table
        rowKey="name"
        size="middle"
        bordered
        loading={this.state.loading}
        columns={columns}
        dataSource={this.state.runs}
        pagination={getTablePaginationProps({...this.state.pagination, total: this.state.runCount || this.state.runs.length})}
        onChange={pagination => this.refreshRuns(this.state.organization, {pagination}).catch(() => {})}
      />
    );
  }

  renderSourceConflictAlert() {
    if (!this.hasSourceConflict()) {
      return null;
    }
    const status = getDirectorySourceUiStatus(this.state.sourceStatus);
    const provider = status.provider || "另一通讯录来源";
    const organization = this.getOrganizationDisplayName(status.organization || this.state.organization);
    if (status.abnormal) {
      return (
        <Alert
          style={{marginTop: 16}}
          type="error"
          showIcon
          message="数据异常：当前组织存在多个通讯录同步来源"
          description={`同一 Admin 组织只能保留一个通讯录主数据源。当前组织 ${organization} 同时存在 ${provider} 配置，请排障或新建组织后再操作。`}
        />
      );
    }
    return (
      <Alert
        style={{marginTop: 16}}
        type="warning"
        showIcon
        message={`${provider} 已选择为当前组织的通讯录同步来源`}
        description={`同一 Admin 组织只能保留一个通讯录主数据源。当前组织 ${organization} 已被 ${provider} 占用；如需验证其他通讯录来源，请新建组织后配置。`}
      />
    );
  }

  getRunRowNumber(index: number): number {
    const current = this.state.pagination?.current || 1;
    const pageSize = this.state.pagination?.pageSize || 10;
    return (current - 1) * pageSize + index + 1;
  }

  copyRunId(runId: string): void {
    if (!runId) {
      return;
    }
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(runId)
        .then(() => Setting.showMessage("success", "已复制运行 ID"))
        .catch(error => Setting.showMessage("error", `复制失败：${error}`));
      return;
    }
    const textarea = document.createElement("textarea");
    textarea.value = runId;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    Setting.showMessage("success", "已复制运行 ID");
  }

  handleRunIndexKeyDown(event: React.KeyboardEvent<HTMLElement>, runId: string): void {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      this.copyRunId(runId);
    }
  }

  renderRunIndex(record: FeishuOrganizationSyncRunRecord, index: number) {
    const runId = record?.name || "";
    return (
      <Tooltip title={runId ? `运行 ID：${runId}，点击复制` : "运行 ID：-"}>
        <Text
          role={runId ? "button" : undefined}
          tabIndex={runId ? 0 : undefined}
          onClick={() => this.copyRunId(runId)}
          onKeyDown={event => this.handleRunIndexKeyDown(event, runId)}
          style={runId ? {cursor: "pointer"} : undefined}
        >
          {this.getRunRowNumber(index)}
        </Text>
      </Tooltip>
    );
  }

  renderActor(actor?: string) {
    const text = actor || "-";
    return (
      <Tooltip title={text}>
        <Text ellipsis style={{display: "inline-block", maxWidth: 132}}>
          {text}
        </Text>
      </Tooltip>
    );
  }

  renderOrganizationSelector() {
    return (
      <div className="organization-sync-target-selector">
        <Space style={{marginBottom: 8}}>
          <Text strong>同步目标组织</Text>
        </Space>
        <Space.Compact style={{width: "100%"}}>
          <OrganizationSelect
            initValue={this.state.organization}
            onChange={(organization: string) => this.changeOrganization(organization)}
            onOrganizationsLoaded={(organizations: OrganizationDisplayNameRecords) => this.updateOrganizationDisplayNames(organizations)}
            excludedOrganizations={["built-in", ...this.getExcludedSourceOrganizations()]}
            style={{minWidth: 280, width: "100%"}}
          />
          <Button icon={<PlusOutlined />} onClick={() => this.createSyncTargetOrganization()}>
            新建组织
          </Button>
        </Space.Compact>
        <div style={{marginTop: 6}}>
          <Text type="secondary">
            选择要绑定飞书通讯录的 aicodex-admin 组织。不同组织的 App ID、App Secret 和同步记录互不混用。
          </Text>
        </div>
      </div>
    );
  }

  render() {
    const config = this.state.config;
    if (config === null) {
      return (
        <div className="organization-sync-page feishu-organization-sync-page">
          <OrganizationSyncPageHeader
            className="organization-sync-page-title"
            provider="feishu"
            title="飞书组织架构同步"
            subtitle="配置通讯录同步、预览影响并查看正式同步记录。"
          />
          <Text type="secondary">正在加载飞书同步页面...</Text>
        </div>
      );
    }
    const hasRunningRuns = this.hasRunningRuns(this.state.runs);
    const hasSourceConflict = this.hasSourceConflict();
    const lastRefreshText = this.state.lastRunsRefreshAt ? `上次刷新：${this.state.lastRunsRefreshAt}` : "";
    const runRefreshHint = `${this.state.runRefreshError || (hasRunningRuns ? `检测到运行中任务，自动每 ${syncRunPollIntervalMs / 1000} 秒刷新。` : "当前无运行中任务，可手动刷新同步记录。")} ${lastRefreshText}`;
    return (
      <div className="organization-sync-page feishu-organization-sync-page">
        <OrganizationSyncPageHeader
          className="organization-sync-page-title"
          provider="feishu"
          title="飞书组织架构同步"
          subtitle={`配置通讯录同步、预览影响并查看正式同步记录。${getFeishuEndpointContextText(config.endpointMode)}`}
        />

        <OrganizationSyncSectionCard variant="config">
          <Row className="organization-sync-config-grid" gutter={[16, 16]}>
            <Col xs={24} md={12}>
              {this.renderOrganizationSelector()}
            </Col>
            <Col xs={24} md={12}>
              <div style={{marginBottom: 8}}>服务区域</div>
              <Select
                value={config.endpointMode}
                onChange={value => this.updateConfigField("endpointMode", value)}
                style={{width: "100%"}}
                options={[
                  {value: "feishu", label: "飞书（中国大陆）"},
                  {value: "lark", label: "Lark（海外）"},
                ]}
              />
            </Col>
            <Col xs={24} md={12}>
              <div style={{marginBottom: 8}}>App ID</div>
              <Input
                {...credentialTextInputProps}
                name="feishu-organization-sync-app-id"
                value={config.appId}
                onChange={event => this.updateConfigField("appId", event.target.value)}
              />
            </Col>
            <Col xs={24} md={12}>
              <div style={{marginBottom: 8}}>App Secret</div>
              <Input.Password
                {...credentialSecretInputProps}
                name="feishu-organization-sync-app-secret"
                value={config.appSecret}
                onChange={event => this.updateConfigField("appSecret", event.target.value)}
              />
            </Col>
            <Col xs={24} md={12}>
              <div style={{marginBottom: 8}}>同步选项</div>
              <Space direction="vertical" size={8}>
                <Space><Switch checked={config.isEnabled} disabled={hasSourceConflict} onChange={checked => this.updateSyncEnabled(checked)} /><span>启用同步</span></Space>
                <Space><Switch checked={config.softDisableMissingData} onChange={checked => this.updateConfigField("softDisableMissingData", checked)} /><span>全量同步成功后软禁用缺失数据</span></Space>
              </Space>
            </Col>
            <Col xs={24} md={12}>
              <div style={{marginBottom: 8}}>定时同步</div>
              <Space direction="vertical" size={8} style={{width: "100%"}}>
                <Space><Switch checked={config.scheduleEnabled} onChange={checked => this.updateConfigField("scheduleEnabled", checked)} /><span>启用定时同步</span></Space>
                {!config.scheduleEnabled ? (
                  <Text type="secondary">未启用定时同步</Text>
                ) : (
                  <>
                    <div>
                      <div style={{marginBottom: 4}}>Cron 表达式</div>
                      <Input value={config.scheduleCron} onChange={event => this.updateConfigField("scheduleCron", event.target.value)} placeholder="0 2 * * *" />
                    </div>
                    <div>
                      <div style={{marginBottom: 4}}>时区</div>
                      <Input value={config.scheduleTimezone} onChange={event => this.updateConfigField("scheduleTimezone", event.target.value)} placeholder="Asia/Shanghai" />
                    </div>
                    {config.scheduleLastFireAt && (
                      <Text type="secondary">最近调度：{this.formatRunTime(config.scheduleLastFireAt)}</Text>
                    )}
                    {config.scheduleLastStatus && (
                      <Text type="secondary">最近结果：{config.scheduleLastStatus}{config.scheduleLastErrorText ? `，${config.scheduleLastErrorText}` : ""}</Text>
                    )}
                  </>
                )}
              </Space>
            </Col>
            <Col span={24} className="organization-sync-permission-alert-row">
              <Alert
                className="organization-sync-permission-alert"
                type="info"
                showIcon
                message="通讯录读取权限要求"
                description="请使用与 endpoint 模式匹配的飞书/Lark 自建应用凭证，并确保应用已获得 Contact v3 部门和用户读取权限；扫码登录可用不代表通讯录同步权限足够。"
              />
            </Col>
          </Row>

          {this.renderSourceConflictAlert()}

          {this.renderTestResult()}

          <OrganizationSyncActionBar
            className="organization-sync-action-bar"
            actions={[
              {key: "save", label: `${i18next.t("general:Save")}`, icon: <SaveOutlined />, type: "primary", loading: this.state.saving, disabled: hasSourceConflict, onClick: () => this.saveConfig()},
              {key: "test", label: "测试连接", icon: <ToolOutlined />, loading: this.state.testing, onClick: () => this.testConfig()},
              {key: "preview", label: "预览影响", icon: <CloudSyncOutlined />, loading: this.state.previewing, disabled: !config.isEnabled, onClick: () => this.previewSyncImpact()},
              {key: "sync", label: hasRunningRuns ? "同步进行中" : "开始全量同步", icon: <PlayCircleOutlined />, loading: this.state.syncing, disabled: hasSourceConflict || !config.isEnabled || hasRunningRuns, onClick: () => this.startSync()},
            ]}
          />
          {this.renderDryRunQuickAccess()}
          {this.renderDryRunPreview()}
          {this.renderDryRunHistory()}

          {this.renderAuxiliaryChecks()}
        </OrganizationSyncSectionCard>

        <OrganizationSyncSectionCard variant="record">
          <OrganizationSyncRunRecordHeader
            className="organization-sync-record-header"
            title="同步记录"
            hint={runRefreshHint}
            hintType={this.state.runRefreshError ? "danger" : "secondary"}
            refreshAction={{
              label: "刷新",
              icon: <ReloadOutlined />,
              loading: this.state.loading,
              onClick: () => this.refreshRuns(this.state.organization).catch(() => {}),
            }}
          />
          {this.renderRuns()}
        </OrganizationSyncSectionCard>
      </div>
    );
  }
}

export default FeishuOrganizationSyncPage;
