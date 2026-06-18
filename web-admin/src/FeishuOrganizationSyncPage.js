// Copyright 2026 The AICodex Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");

import React from "react";
import {Alert, Button, Col, Collapse, Divider, Drawer, Input, Modal, Row, Select, Space, Switch, Table, Tag, Typography} from "antd";
import {CloudSyncOutlined, CopyOutlined, DownloadOutlined, PlayCircleOutlined, ReloadOutlined, SaveOutlined, ToolOutlined} from "@ant-design/icons";
import * as Setting from "./Setting";
import * as FeishuOrganizationSyncBackend from "./backend/FeishuOrganizationSyncBackend";
import OrganizationSelect from "./common/select/OrganizationSelect";
import {getDefaultTablePagination, getTablePaginationProps} from "./common/table/TablePagination";
import i18next from "i18next";
import {getFeishuBusinessOrganizationNameFromTenantKey} from "./FeishuOrganizationSyncPageUtils";

const {Text} = Typography;
const syncRunPollIntervalMs = 3000;

const diagnosticStageLabels = {
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
const diagnosticCategoryLabels = {
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
const diagnosticActionLabels = {
  fix_credentials: "修凭证",
  grant_contact_scope: "授权通讯录",
  wait_rate_limit: "等限流",
  inspect_mapping_conflict: "查映射",
  inspect_projection: "查投影",
  manual_review: "人工确认",
  unknown: "待确认",
};
const diagnosticRetryLabels = {
  safe_retry: "可重试",
  wait_rate_limit: "等待限流",
  not_ready: "先处理",
  unknown: "待确认",
};
const bindingRiskLabels = {
  none: "无风险",
  low: "低",
  medium: "中",
  high: "高",
  critical: "严重",
};
const bindingStatusLabels = {
  disabled: "未启用",
  empty: "无数据",
  ok: "正常",
  warning: "需关注",
  blocked: "阻断",
};
const bindingIssueTypeLabels = {
  duplicate_user_id_binding: "user_id 多用户",
  local_user_multi_tenant_binding: "本地用户多租户",
  legacy_identifier_split: "历史标识分裂",
  missing_tenant_key: "缺少 tenant_key",
  endpoint_mode_mismatch: "Endpoint 不一致",
};
const bindingActionLabels = {
  inspect_mapping: "检查映射",
  confirm_primary_user: "确认主账号",
  backfill_tenant_key: "补 tenant_key",
  align_endpoint_mode: "对齐 endpoint",
  no_action: "无需处理",
};
const handoffReadinessLabels = {
  ready: "可交接",
  blocked: "阻断",
  running: "同步中",
  no_run: "无记录",
  unsupported: "不可用",
};
const handoffSourceTypeLabels = {
  latest: "最近证据",
  run: "最近同步",
  dry_run_history: "最近 Dry-run",
};
const handoffAcceptanceStatusLabels = {
  passed: "通过",
  needs_review: "待复核",
  blocked: "阻断",
  missing: "缺失",
  cannot_infer: "无法推断",
};
const handoffAcceptanceStatusColors = {
  passed: "green",
  needs_review: "gold",
  blocked: "red",
  missing: "orange",
  cannot_infer: "blue",
};
const handoffActionLabels = {
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
  export_evidence_json: "导出交接证据",
  export_sanitized_evidence_only: "仅导出脱敏证据",
  inspect_sync_diagnostics: "查看同步诊断",
  run_dry_run_preview: "先预览影响",
  wait_sync_completion: "等待同步完成",
  refresh_handoff_evidence: "刷新交接证据",
};
const handoffEvidenceAliasLabels = {
  live_contact_v3_credentials: "飞书通讯录权限需真实验证",
  gateway_projection_consumption: "Gateway 消费需下游验收",
  insight_acceptance: "Insight 验收需下游确认",
  provider_payload_validation: "飞书返回数据需运行态验证",
  production_readiness: "生产就绪需人工确认",
  provider_truth: "飞书租户真值需外部验证",
  sync_full_success: "完整同步成功需运行态验证",
};
const handoffChecklistItemLabels = {
  redaction: "脱敏检查",
  handoff_readiness: "交接就绪",
  admin_local_metadata: "Admin 本地元数据",
  external_owner_required: "外部系统确认",
};
const handoffBlockedReasonLabels = {
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
const dryRunReasonLabels = {
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

class FeishuOrganizationSyncPage extends React.Component {
  constructor(props) {
    super(props);
    this.runRefreshTimer = null;
    this.isUnmounted = false;
    const organization = this.getAccountOrganization(props.account);
    this.state = {
      organization,
      config: null,
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
    const organization = this.getAccountOrganization(this.props.account);
    if (organization) {
      this.changeOrganization(organization);
    }
  }

  getAccountOrganization(account) {
    if (!account?.owner) {
      return "";
    }
    return Setting.getRequestOrganization(account) || account.owner;
  }

  clearRunRefreshTimer() {
    if (this.runRefreshTimer !== null) {
      clearTimeout(this.runRefreshTimer);
      this.runRefreshTimer = null;
    }
  }

  hasRunningRuns(runs) {
    return (runs || []).some(run => run?.status === "running");
  }

  scheduleRunRefresh(organization) {
    if (!organization || this.runRefreshTimer !== null) {
      return;
    }
    this.runRefreshTimer = setTimeout(() => {
      this.runRefreshTimer = null;
      this.refreshRuns(organization, false);
    }, syncRunPollIntervalMs);
  }

  syncRunRefreshLoop(organization, runs) {
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

  refreshRuns(organization, options = {}) {
    if (!organization) {
      return Promise.resolve();
    }
    const {refreshConfig = false, pagination = this.state.pagination} = options;
    const nextPagination = getDefaultTablePagination(pagination);

    this.clearRunRefreshTimer();
    this.setState({loading: true});
    const runsRequest = FeishuOrganizationSyncBackend.getFeishuOrganizationSyncRuns(organization, nextPagination.current, nextPagination.pageSize);
    const dryRunHistoryRequest = FeishuOrganizationSyncBackend.getFeishuOrganizationSyncDryRunHistories(organization, {topN: 10});
    const bindingDiagnosticsRequest = FeishuOrganizationSyncBackend.getFeishuOrganizationSyncUserBindingConflicts(organization, {limit: 20});
    const handoffEvidenceRequest = FeishuOrganizationSyncBackend.getFeishuOrganizationSyncHandoffEvidence(organization, {sourceType: this.state.handoffEvidenceSourceType});
    const configRequest = refreshConfig
      ? FeishuOrganizationSyncBackend.getFeishuOrganizationSyncConfig(organization)
      : Promise.resolve(null);

    return Promise.all([configRequest, runsRequest, dryRunHistoryRequest, bindingDiagnosticsRequest, handoffEvidenceRequest]).then(([configRes, runsRes, dryRunHistoryRes, bindingDiagnosticsRes, handoffEvidenceRes]) => {
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
      if (this.isUnmounted || this.state.organization !== organization) {
        return;
      }
      const nextState = {loading: false};
      if (configRes !== null) {
        nextState.config = this.normalizeConfig(organization, configRes?.data?.config);
        nextState.testResult = null;
        nextState.previewResult = null;
        nextState.previewError = "";
      }
      if (runsRes.status === "ok") {
        nextState.runs = runsRes.data || [];
        nextState.runCount = runsRes.data2 || 0;
        nextState.pagination = {...nextPagination, total: runsRes.data2 || 0};
        nextState.lastRunsRefreshAt = Setting.getFormattedDate(new Date().toISOString());
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
        nextState.handoffEvidenceError = "交接证据刷新失败，请手动刷新重试。";
      }
      this.setState(nextState, () => this.syncRunRefreshLoop(organization, nextState.runs || this.state.runs));
    }).catch(error => {
      this.clearRunRefreshTimer();
      if (this.isUnmounted || this.state.organization !== organization) {
        return;
      }
      this.setState({loading: false, runRefreshError: "自动刷新已暂停，请手动刷新重试。"});
      Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
    });
  }

  refreshDryRunHistory(organization = this.state.organization) {
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

  refreshBindingDiagnostics(organization = this.state.organization) {
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

  refreshHandoffEvidence(organization = this.state.organization, sourceType = this.state.handoffEvidenceSourceType) {
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
          this.setState({handoffEvidenceLoading: false, handoffEvidenceError: res.msg || "交接证据刷新失败"});
        }
      }).catch(error => {
        if (this.isUnmounted || this.state.organization !== organization) {
          return;
        }
        this.setState({handoffEvidenceLoading: false, handoffEvidenceError: `${i18next.t("general:Failed to connect to server")}: ${error}`});
      });
  }

  refresh(organization) {
    if (organization) {
      this.refreshRuns(organization, {refreshConfig: true, pagination: getDefaultTablePagination()}).catch(() => {});
    }
  }

  normalizeConfig(organization, config) {
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

  updateConfigField(key, value) {
    this.setState({config: {...this.state.config, [key]: value}});
  }

  changeOrganization(organization) {
    this.clearRunRefreshTimer();
    this.setState({
      organization,
      config: null,
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
    }, () => this.refresh(organization));
  }

  saveConfig() {
    this.setState({saving: true});
    FeishuOrganizationSyncBackend.saveFeishuOrganizationSyncConfig(this.state.config)
      .then(res => {
        if (res.status === "ok") {
          const resolvedOrganization = res.data?.config?.organization || res.data?.organization || this.state.organization;
          this.setState({
            saving: false,
            organization: resolvedOrganization,
            config: this.normalizeConfig(resolvedOrganization, res.data?.config),
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
          const nextState = {testResult: res.data};
          if (tenantKey !== "") {
            nextState.config = {...this.state.config, tenantKey};
          }
          this.setState(nextState);
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
          this.setState({previewResult: res.data, previewError: ""});
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

  formatPreviewCounts(counts = {}) {
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

  renderPreviewReasonCounts(reasonCounts) {
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

  formatDryRunDiff(record = {}) {
    return `部 ${record.departmentToCreate || 0}/${record.departmentToUpdate || 0}/${record.departmentToSoftDisable || 0} · 人 ${record.userToCreate || 0}/${record.userToUpdate || 0}/${record.userToSoftDisable || 0} · 关系 ${record.membershipToCreate || 0}/${record.membershipToUpdate || 0}/${record.membershipToSoftDisable || 0}`;
  }

  getDryRunSourceAlias(record = {}) {
    return [record.appAlias, record.tenantAlias].filter(Boolean).join(" / ") || "-";
  }

  openDryRunHistoryDetail(record) {
    this.setState({
      dryRunHistoryDetailOpen: true,
      dryRunHistoryDetailLoading: true,
      dryRunHistoryDetail: record,
      dryRunHistoryDetailError: "",
    });
    FeishuOrganizationSyncBackend.getFeishuOrganizationSyncDryRunHistory(this.state.organization, record.name)
      .then(res => {
        if (this.isUnmounted) {
          return;
        }
        if (res.status === "ok") {
          this.setState({dryRunHistoryDetailLoading: false, dryRunHistoryDetail: res.data, dryRunHistoryDetailError: ""});
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

  getBindingRiskTag(riskLevel) {
    const colorMap = {none: "green", low: "lime", medium: "orange", high: "volcano", critical: "red"};
    return <Tag color={colorMap[riskLevel] || "default"}>{bindingRiskLabels[riskLevel] || riskLevel || "-"}</Tag>;
  }

  getBindingStatusTag(status) {
    const colorMap = {disabled: "default", empty: "default", ok: "green", warning: "orange", blocked: "red"};
    return <Tag color={colorMap[status] || "default"}>{bindingStatusLabels[status] || status || "-"}</Tag>;
  }

  getBindingIssueTypeLabel(type) {
    return bindingIssueTypeLabels[type] || type || "-";
  }

  getBindingActionLabel(action) {
    return bindingActionLabels[action] || action || "-";
  }

  getBindingDiagnosticsJson(payload = this.state.bindingDiagnostics) {
    return JSON.stringify(payload || {}, null, 2);
  }

  copyBindingDiagnosticsJson(payload) {
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

  exportBindingDiagnosticsJson(payload = this.state.bindingDiagnostics) {
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

  getHandoffReadinessTag(readiness) {
    const colorMap = {ready: "green", blocked: "red", running: "processing", no_run: "default", unsupported: "default"};
    return <Tag color={colorMap[readiness] || "default"}>{handoffReadinessLabels[readiness] || readiness || "-"}</Tag>;
  }

  getHandoffEvidenceJson(payload = this.state.handoffEvidence) {
    return JSON.stringify(payload || {}, null, 2);
  }

  copyHandoffEvidenceJson(payload = this.state.handoffEvidence) {
    const text = this.getHandoffEvidenceJson(payload);
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => Setting.showMessage("success", "已复制交接证据 JSON"))
        .catch(error => Setting.showMessage("error", `复制失败：${error}`));
      return;
    }
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    Setting.showMessage("success", "已复制交接证据 JSON");
  }

  exportHandoffEvidenceJson(payload = this.state.handoffEvidence) {
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

  getHandoffAcceptanceChecklistJson(payload = this.state.handoffEvidence?.acceptanceChecklist) {
    return JSON.stringify(payload || {}, null, 2);
  }

  copyHandoffAcceptanceChecklistJson(payload = this.state.handoffEvidence?.acceptanceChecklist) {
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

  exportHandoffAcceptanceChecklistJson(payload = this.state.handoffEvidence?.acceptanceChecklist) {
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

  getHandoffAcceptanceChecklistMarkdown(payload = this.state.handoffEvidence?.acceptanceChecklist) {
    const checklist = payload || {};
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
      ...((checklist.items || []).length === 0 ? ["- -"] : checklist.items.map(item => `- ${item.id || "-"}: ${item.status || "-"} / ${item.source || "-"} / ${item.recommendedActionAlias || "-"}`)),
      "",
      "## Retention And Redaction",
      `- redactionApplied: ${checklist.retention?.redactionApplied ? "true" : "false"}`,
      `- redactionVersion: ${checklist.retention?.redactionVersion || checklist.redaction?.version || "-"}`,
      `- retentionDays: ${checklist.retention?.retentionDays || 0}`,
      `- retentionPolicy: ${checklist.retention?.retentionPolicy || "-"}`,
    ];
    return lines.join("\n");
  }

  copyHandoffAcceptanceChecklistMarkdown(payload = this.state.handoffEvidence?.acceptanceChecklist) {
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

  exportHandoffAcceptanceChecklistMarkdown(payload = this.state.handoffEvidence?.acceptanceChecklist) {
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

  renderHandoffCounts(counts = {}, options = {}) {
    const {compact = false} = options;
    const format = item => `新 ${item?.toCreate || 0} / 更 ${item?.toUpdate || 0} / 软禁 ${item?.toSoftDisable || 0} / 冲突 ${item?.conflict || 0} / 无效 ${item?.invalid || 0}`;
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

  getHandoffAliasLabel(alias) {
    return handoffChecklistItemLabels[alias] || handoffActionLabels[alias] || handoffEvidenceAliasLabels[alias] || handoffBlockedReasonLabels[alias] || alias || "-";
  }

  renderHandoffAliasList(items = [], color = "blue") {
    const normalized = [...new Set((items || []).filter(Boolean))];
    if (normalized.length === 0) {
      return <Text type="secondary">无</Text>;
    }
    return (
      <Space size={4} wrap>
        {normalized.map(item => <Tag color={color} key={item}>{this.getHandoffAliasLabel(item)}</Tag>)}
      </Space>
    );
  }

  renderAcceptanceStatusTag(status) {
    return <Tag color={handoffAcceptanceStatusColors[status] || "default"}>{handoffAcceptanceStatusLabels[status] || status || "-"}</Tag>;
  }

  renderHandoffAcceptanceChecklist(checklist, options = {}) {
    const {compact = false, showAuditDetails = true} = options;
    if (!checklist?.version) {
      return (
        <Alert
          style={{marginTop: 12}}
          type="info"
          showIcon
          message="验收清单"
          description="暂无验收清单；刷新交接证据后可复制或导出脱敏 checklist。"
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
          {checklist.retention?.retentionDays > 0 && <Tag>{`保留 ${checklist.retention.retentionDays} 天`}</Tag>}
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
                      {item.safeSummary || "-"}
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
            {!compact && checklist.retention?.retentionDays > 0 && <Tag>{`retention ${checklist.retention.retentionDays}d`}</Tag>}
          </Space>
        ) : (
          <Space wrap size={4}>
            <Tag>{`总 ${summary.total || 0}`}</Tag>
            <Tag color="green">{`通过 ${summary.passed || 0}`}</Tag>
            {checklist.retention?.redactionApplied && <Tag color="green">已脱敏</Tag>}
            {checklist.retention?.retentionDays > 0 && <Tag>{`保留 ${checklist.retention.retentionDays} 天`}</Tag>}
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
            destroyOnHidden
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

  renderHandoffEvidenceDetailsModal(evidence, hasHandoffDetails) {
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
          <Alert type="info" showIcon message="暂无验收资料" description="当前交接证据只有摘要信息。" />
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
              description={<Typography.Paragraph style={{marginBottom: 0}} ellipsis={{rows: 3, expandable: true}}>{evidence.safeSummary || "-"}</Typography.Paragraph>}
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
    const readinessType = hasHandoffProblem ? "error" : evidence.readiness === "ready" ? "success" : "info";
    const hasHandoffDetails = Boolean(evidence.sourceConnectionIdHash || evidence.endpointMode || evidence.appAlias || evidence.tenantAlias || evidence.acceptanceChecklist?.version ||
      (evidence.blockedReasons || []).length > 0 || (evidence.operatorNextActions || []).length > 0 || (evidence.cannotInfer || []).length > 0);
    return (
      <>
        <Row align="middle" justify="space-between" style={{marginBottom: 12}}>
          <Col>
            <Space direction="vertical" size={2}>
              <Text strong>交接证据</Text>
              <Text type={this.state.handoffEvidenceError ? "danger" : "secondary"}>
                {this.state.handoffEvidenceError || evidence.safeSummary || "复制或导出脱敏 evidence JSON，用于真实租户测试和验收交接。"}
              </Text>
            </Space>
          </Col>
          <Col>
            <Space wrap>
              <Select
                value={this.state.handoffEvidenceSourceType}
                style={{width: 140}}
                options={[
                  {value: "latest", label: handoffSourceTypeLabels.latest},
                  {value: "run", label: handoffSourceTypeLabels.run},
                  {value: "dry_run_history", label: handoffSourceTypeLabels.dry_run_history},
                ]}
                onChange={sourceType => this.setState({handoffEvidenceSourceType: sourceType}, () => this.refreshHandoffEvidence(this.state.organization, sourceType).catch(() => {}))}
              />
              <Button aria-label="copy-handoff-evidence-json" icon={<CopyOutlined />} disabled={!evidence.generatedAt} onClick={() => this.copyHandoffEvidenceJson(evidence)}>复制 JSON</Button>
              <Button icon={<DownloadOutlined />} disabled={!evidence.generatedAt} onClick={() => this.exportHandoffEvidenceJson(evidence)}>导出 JSON</Button>
              <Button aria-label="refresh-handoff-evidence" icon={<ReloadOutlined />} loading={this.state.handoffEvidenceLoading} onClick={() => this.refreshHandoffEvidence().catch(() => {})}>刷新</Button>
            </Space>
          </Col>
        </Row>
        {evidence.readiness && !hasHandoffProblem && (
          <Row align="middle" justify="space-between" style={{marginBottom: 12}}>
            <Col flex="auto">
              <Space size={8} wrap>
                {this.getHandoffReadinessTag(evidence.readiness)}
                {evidence.sourceType && <Tag>{handoffSourceTypeLabels[evidence.sourceType] || evidence.sourceType}</Tag>}
                {evidence.redaction?.applied && <Tag color="green">已脱敏</Tag>}
                {this.renderHandoffCounts(evidence.counts, {compact: true})}
              </Space>
            </Col>
            {hasHandoffDetails && (
              <Col>
                <Button
                  size="small"
                  type="link"
                  style={{padding: 0, height: "auto"}}
                  aria-label="toggle-handoff-evidence-details"
                  onClick={() => this.setState({handoffEvidenceDetailsOpen: true})}
                >
                  查看验收资料
                </Button>
              </Col>
            )}
          </Row>
        )}
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
                <Text>{evidence.safeSummary || "-"}</Text>
                {this.renderHandoffCounts(evidence.counts)}
                {evidence.bindingConflicts?.safeSummary && <Text type={evidence.bindingConflicts?.blocked ? "danger" : "secondary"}>{evidence.bindingConflicts.safeSummary}</Text>}
                {hasHandoffDetails && (
                  <Button
                    size="small"
                    type="link"
                    style={{padding: 0, height: "auto", alignSelf: "flex-start"}}
                    aria-label="toggle-handoff-evidence-details"
                    onClick={() => this.setState({handoffEvidenceDetailsOpen: true})}
                  >
                    查看验收资料
                  </Button>
                )}
              </Space>
            }
          />
        )}
        {this.renderHandoffEvidenceDetailsModal(evidence, hasHandoffDetails)}
        {!evidence.readiness && (
          <Table
            rowKey="state"
            size="middle"
            bordered
            loading={this.state.loading || this.state.handoffEvidenceLoading}
            columns={[{title: "状态", dataIndex: "state"}]}
            dataSource={[]}
            locale={{emptyText: this.state.handoffEvidenceError || "暂无交接证据"}}
            pagination={false}
          />
        )}
      </>
    );
  }

  openBindingDiagnosticsDetail(issue) {
    this.setState({bindingDiagnosticsDetail: issue, bindingDiagnosticsDetailOpen: true});
  }

  renderBindingCounts(counts = {}) {
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

  renderBindingLinkage(linkage, prefix) {
    if (!linkage?.id) {
      return null;
    }
    return <Tag>{`${prefix}: ${linkage.id}`}</Tag>;
  }

  renderBindingDiagnostics() {
    const diagnostics = this.state.bindingDiagnostics || {};
    const issues = diagnostics.issues || [];
    const hasIssues = issues.length > 0;
    const columns = [
      {title: "风险", dataIndex: "riskLevel", key: "riskLevel", width: 90, render: risk => this.getBindingRiskTag(risk)},
      {title: "类型", dataIndex: "type", key: "type", width: 150, render: type => this.getBindingIssueTypeLabel(type)},
      {title: "摘要", dataIndex: "safeSummary", key: "safeSummary", width: 320, render: text => <Typography.Paragraph style={{marginBottom: 0}} ellipsis={{rows: 2, expandable: true}}>{text || "-"}</Typography.Paragraph>},
      {title: "样本", dataIndex: "sampleAliases", key: "sampleAliases", width: 210, render: aliases => (
        <Space size={4} wrap>{(aliases || []).map(alias => <Tag key={alias}>{alias}</Tag>)}</Space>
      )},
      {title: "建议动作", dataIndex: "recommendedAction", key: "recommendedAction", width: 130, render: action => this.getBindingActionLabel(action)},
      {title: "关联", key: "linkage", width: 230, render: (_, record) => (
        <Space size={4} wrap>
          {this.renderBindingLinkage(record.latestRun, "run")}
          {this.renderBindingLinkage(record.latestDryRunHistory, "history")}
        </Space>
      )},
      {title: "操作", key: "action", width: 90, render: (_, record) => <Button size="small" aria-label={`binding-diagnostics-detail-${record.id}`} onClick={() => this.openBindingDiagnosticsDetail(record)}>详情</Button>},
    ];
    const statusType = diagnostics.status === "blocked" ? "error" : diagnostics.status === "warning" ? "warning" : diagnostics.status === "ok" ? "success" : "info";
    const hasProblem = Boolean(this.state.bindingDiagnosticsError) || diagnostics.status === "blocked" || diagnostics.status === "warning" || hasIssues;
    if (!hasProblem) {
      return (
        <>
          <Row align="middle" justify="space-between" style={{marginBottom: 12}}>
            <Col>
              <Space size={8} wrap>
                <Text strong>{`身份匹配：${bindingStatusLabels[diagnostics.status] || "待刷新"}`}</Text>
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
    const detail = this.state.bindingDiagnosticsDetail || this.state.bindingDiagnostics || {};
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
      {title: "记录 ID", dataIndex: "name", key: "name", width: 180, render: text => <Text style={{wordBreak: "break-all"}}>{text || "-"}</Text>},
      {title: "状态 / 时间", key: "status", width: 150, render: (_, record) => (
        <Space direction="vertical" size={2}>
          {this.getStatusTag(record.status)}
          <Text type="secondary">{this.formatRunTime(record.createdAt)}</Text>
        </Space>
      )},
      {title: "影响", key: "impact", width: 220, render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text>{`快照：部 ${record.snapshotDepartmentCount || 0} / 人 ${record.snapshotUserCount || 0} / 关系 ${record.snapshotMembershipCount || 0}`}</Text>
          <Text type="secondary">{this.formatDryRunDiff(record)}</Text>
        </Space>
      )},
      {title: "诊断摘要", key: "summary", render: (_, record) => (
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
      {title: "操作", key: "action", width: 90, render: (_, record) => <Button size="small" aria-label={`dry-run-history-detail-${record.name}`} onClick={() => this.openDryRunHistoryDetail(record)}>详情</Button>},
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

  formatRunTime(text) {
    if (!text || String(text).startsWith("0001-01-01")) {
      return "-";
    }
    return Setting.getFormattedDate(text);
  }

  getStatusTag(status) {
    const colorMap = {running: "processing", succeeded: "success", failed: "error", partial: "warning"};
    const labelMap = {running: "运行中", succeeded: "成功", failed: "失败", partial: "部分成功"};
    return <Tag color={colorMap[status] || "default"}>{labelMap[status] || status || "-"}</Tag>;
  }

  getTriggerTag(triggerType) {
    const colorMap = {manual: "blue", scheduled: "cyan"};
    const labelMap = {manual: "手动", scheduled: "定时"};
    return <Tag color={colorMap[triggerType] || "default"}>{labelMap[triggerType] || triggerType || "-"}</Tag>;
  }

  getStageText(stage, status) {
    if (status === "succeeded") {
      return "已完成";
    }
    const labelMap = {fetching: "拉取数据", planning: "计算差异", applying: "应用变更", finalizing: "收尾处理"};
    return labelMap[stage] || stage || "-";
  }

  getDiagnosticLabel(labels, value) {
    return labels[value] || value || "-";
  }

  getDiagnosticTagColor(kind, value) {
    if (kind === "category") {
      return {
        configuration: "orange",
        credentials: "red",
        permission: "volcano",
        provider: "gold",
        contract: "purple",
        local_apply: "magenta",
        projection: "geekblue",
        partial_sync: "warning",
        unknown: "default",
      }[value] || "default";
    }
    if (kind === "action") {
      return {
        fix_credentials: "red",
        grant_contact_scope: "volcano",
        wait_rate_limit: "gold",
        inspect_mapping_conflict: "magenta",
        inspect_projection: "geekblue",
        manual_review: "blue",
        unknown: "default",
      }[value] || "default";
    }
    return "default";
  }

  formatDurationMs(durationMs) {
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

  renderDiagnostics(record) {
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

  renderDiagnosticStats(record) {
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

  getRunSafeSummary(record) {
    return record?.diagnostics?.safeSummary || record?.errorText || "";
  }

  renderRunStatus(record) {
    return (
      <Space size={4} wrap>
        {this.getStatusTag(record.status)}
        {this.getTriggerTag(record.triggerType)}
        <Tag>{this.getStageText(record.stage, record.status)}</Tag>
      </Space>
    );
  }

  renderRunTime(record) {
    return (
      <Space direction="vertical" size={0}>
        <Text>{this.formatRunTime(record.startedAt)}</Text>
        <Text type="secondary">{this.formatRunTime(record.finishedAt)}</Text>
      </Space>
    );
  }

  renderRunImpact(record) {
    return (
      <Space direction="vertical" size={0}>
        <Text>{`部门 ${record.departmentCreatedCount || 0} / ${record.departmentUpdatedCount || 0} / ${record.departmentDisabledCount || 0}`}</Text>
        <Text>{`用户 ${record.userCreatedCount || 0} / ${record.userUpdatedCount || 0} / ${record.userDisabledCount || 0}`}</Text>
        <Text>{`关系 ${record.membershipUpdatedCount || 0}`}</Text>
      </Space>
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
      {title: "运行", dataIndex: "name", key: "name", width: 220, render: (_, record) => (
        <Space direction="vertical" size={2} style={{width: "100%"}}>
          <Text style={{wordBreak: "break-all"}}>{record.name || "-"}</Text>
          {record.actor && <Text type="secondary" style={{wordBreak: "break-all"}}>{record.actor}</Text>}
        </Space>
      )},
      {title: "状态", key: "status", width: 210, render: (_, record) => this.renderRunStatus(record)},
      {title: "时间", key: "time", width: 170, render: (_, record) => this.renderRunTime(record)},
      {title: "影响统计", key: "impact", width: 160, render: (_, record) => this.renderRunImpact(record)},
      {title: "诊断 / 错误", key: "diagnostics", render: (_, record) => (
        <Space direction="vertical" size={4} style={{width: "100%"}}>
          {this.renderDiagnostics(record)}
          {this.renderDiagnosticStats(record)}
          <Typography.Paragraph style={{marginBottom: 0}} ellipsis={{rows: 2, expandable: true}}>
            {this.getRunSafeSummary(record) || "-"}
          </Typography.Paragraph>
        </Space>
      )},
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

  render() {
    const config = this.state.config;
    if (config === null) {
      return (
        <div>
          <Space style={{marginBottom: 16}}><CloudSyncOutlined /><Text strong>飞书组织架构同步</Text></Space>
          <Text type="secondary">正在加载飞书同步页面...</Text>
        </div>
      );
    }
    const hasRunningRuns = this.hasRunningRuns(this.state.runs);
    const lastRefreshText = this.state.lastRunsRefreshAt ? `上次刷新：${this.state.lastRunsRefreshAt}` : "";
    return (
      <div>
        <Space style={{marginBottom: 16}}><CloudSyncOutlined /><Text strong>飞书组织架构同步</Text></Space>

        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <div style={{marginBottom: 8}}>同步目标组织</div>
            <OrganizationSelect
              initValue={this.state.organization}
              onChange={organization => this.changeOrganization(organization)}
              excludedOrganizations={["built-in"]}
              style={{minWidth: 280, width: "100%"}}
            />
          </Col>
          <Col xs={24} md={12}>
            <div style={{marginBottom: 8}}>Endpoint 模式</div>
            <Select
              value={config.endpointMode}
              onChange={value => this.updateConfigField("endpointMode", value)}
              style={{width: "100%"}}
              options={[
                {value: "feishu", label: "国内飞书（open.feishu.cn）"},
                {value: "lark", label: "海外 Lark（open.larksuite.com）"},
              ]}
            />
          </Col>
          <Col xs={24} md={12}>
            <div style={{marginBottom: 8}}>App ID</div>
            <Input value={config.appId} onChange={event => this.updateConfigField("appId", event.target.value)} />
          </Col>
          <Col xs={24} md={12}>
            <div style={{marginBottom: 8}}>App Secret</div>
            <Input.Password value={config.appSecret} onChange={event => this.updateConfigField("appSecret", event.target.value)} />
          </Col>
          <Col xs={24} md={12}>
            <div style={{marginBottom: 8}}>同步选项</div>
            <Space direction="vertical" size={8}>
              <Space><Switch checked={config.isEnabled} onChange={checked => this.updateConfigField("isEnabled", checked)} /><span>启用同步</span></Space>
              <Space><Switch checked={config.softDisableMissingData} onChange={checked => this.updateConfigField("softDisableMissingData", checked)} /><span>全量同步成功后软禁用缺失数据</span></Space>
            </Space>
          </Col>
          <Col xs={24} md={12}>
            <div style={{marginBottom: 8}}>定时同步</div>
            <Space direction="vertical" size={8} style={{width: "100%"}}>
              <Space><Switch checked={config.scheduleEnabled} onChange={checked => this.updateConfigField("scheduleEnabled", checked)} /><span>启用定时同步</span></Space>
              <Input value={config.scheduleCron} onChange={event => this.updateConfigField("scheduleCron", event.target.value)} placeholder="0 2 * * *" />
              <Input value={config.scheduleTimezone} onChange={event => this.updateConfigField("scheduleTimezone", event.target.value)} placeholder="Asia/Shanghai" />
            </Space>
          </Col>
        </Row>

        <Alert
          style={{marginTop: 16}}
          type="info"
          showIcon
          message="通讯录读取权限要求"
          description="请使用与 endpoint 模式匹配的飞书/Lark 自建应用凭证，并确保应用已获得 Contact v3 部门和用户读取权限；扫码登录可用不代表通讯录同步权限足够。"
        />
        {this.renderTestResult()}
        {this.renderDryRunPreview()}

        <Space style={{marginTop: 16}}>
          <Button icon={<SaveOutlined />} type="primary" loading={this.state.saving} onClick={() => this.saveConfig()}>{i18next.t("general:Save")}</Button>
          <Button icon={<ToolOutlined />} loading={this.state.testing} onClick={() => this.testConfig()}>测试连接</Button>
          <Button icon={<CloudSyncOutlined />} loading={this.state.previewing} disabled={!config.isEnabled} onClick={() => this.previewSyncImpact()}>预览影响</Button>
          <Button icon={<ReloadOutlined />} loading={this.state.dryRunHistoryLoading} onClick={() => this.setState({dryRunHistoryOpen: true})}>查看预览历史</Button>
          <Button icon={<PlayCircleOutlined />} loading={this.state.syncing} disabled={!config.isEnabled || hasRunningRuns} onClick={() => this.startSync()}>{hasRunningRuns ? "同步进行中" : "开始全量同步"}</Button>
        </Space>

        <Divider />
        {this.renderBindingDiagnostics()}

        <Divider />
        {this.renderHandoffEvidence()}

        <Divider />
        {this.renderDryRunHistory()}

        <Divider />
        <Row align="middle" justify="space-between" style={{marginBottom: 12}}>
          <Col>
            <Space direction="vertical" size={2}>
              <Text strong>同步记录</Text>
              <Text type={this.state.runRefreshError ? "danger" : "secondary"}>
                {this.state.runRefreshError || (hasRunningRuns ? `检测到运行中任务，自动每 ${syncRunPollIntervalMs / 1000} 秒刷新。` : "当前无运行中任务，可手动刷新同步记录。")} {lastRefreshText}
              </Text>
            </Space>
          </Col>
          <Col><Button icon={<ReloadOutlined />} loading={this.state.loading} onClick={() => this.refreshRuns(this.state.organization).catch(() => {})}>刷新</Button></Col>
        </Row>
        {this.renderRuns()}
      </div>
    );
  }
}

export default FeishuOrganizationSyncPage;
