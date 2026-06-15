// Copyright 2026 The AICodex Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");

import React from "react";
import {Alert, Button, Col, Divider, Drawer, Input, Row, Select, Space, Switch, Table, Tag, Typography} from "antd";
import {CloudSyncOutlined, PlayCircleOutlined, ReloadOutlined, SaveOutlined, ToolOutlined} from "@ant-design/icons";
import * as Setting from "./Setting";
import * as FeishuOrganizationSyncBackend from "./backend/FeishuOrganizationSyncBackend";
import OrganizationSelect from "./common/select/OrganizationSelect";
import {getDefaultTablePagination, getTablePaginationProps} from "./common/table/TablePagination";
import i18next from "i18next";

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
      dryRunHistoryDetail: null,
      dryRunHistoryDetailOpen: false,
      dryRunHistoryDetailLoading: false,
      dryRunHistoryDetailError: "",
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
    const configRequest = refreshConfig
      ? FeishuOrganizationSyncBackend.getFeishuOrganizationSyncConfig(organization)
      : Promise.resolve(null);

    return Promise.all([configRequest, runsRequest, dryRunHistoryRequest]).then(([configRes, runsRes, dryRunHistoryRes]) => {
      if (configRes?.status === "error") {
        Setting.showMessage("error", configRes.msg);
      }
      if (runsRes.status === "error") {
        Setting.showMessage("error", runsRes.msg);
      }
      if (dryRunHistoryRes.status === "error") {
        Setting.showMessage("error", dryRunHistoryRes.msg);
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
      dryRunHistoryDetail: null,
      dryRunHistoryDetailOpen: false,
      dryRunHistoryDetailError: "",
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
          this.setState({testResult: res.data});
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
    return `新增 ${counts.toCreate || 0} / 更新 ${counts.toUpdate || 0} / 软禁 ${counts.toSoftDisable || 0} / 冲突 ${counts.conflict || 0} / 无效 ${counts.invalid || 0}`;
  }

  renderPreviewReasonCounts(reasonCounts) {
    const entries = Object.entries(reasonCounts || {}).filter(([, value]) => Number(value || 0) > 0);
    if (entries.length === 0) {
      return <Text type="secondary">无风险原因计数</Text>;
    }
    return (
      <Space size={4} wrap>
        {entries.map(([reason, count]) => <Tag key={reason}>{reason}: {count}</Tag>)}
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

  renderDryRunHistory() {
    const columns = [
      {title: "记录 ID", dataIndex: "name", key: "name", width: 190, ellipsis: true},
      {title: "状态", dataIndex: "status", key: "status", width: 100, render: status => this.getStatusTag(status)},
      {title: "预览时间", dataIndex: "createdAt", key: "createdAt", width: 180, render: text => this.formatRunTime(text)},
      {title: "来源别名", key: "source", width: 230, ellipsis: true, render: (_, record) => this.getDryRunSourceAlias(record)},
      {title: "快照", key: "snapshot", width: 150, render: (_, record) => `部 ${record.snapshotDepartmentCount || 0} / 人 ${record.snapshotUserCount || 0} / 关系 ${record.snapshotMembershipCount || 0}`},
      {title: "Diff（新增/更新/软禁）", key: "diff", width: 280, render: (_, record) => this.formatDryRunDiff(record)},
      {title: "诊断", dataIndex: "diagnosticAlias", key: "diagnosticAlias", width: 190, ellipsis: true},
      {title: "摘要", dataIndex: "safeSummary", key: "safeSummary", width: 260, ellipsis: true},
      {title: "保留/脱敏", key: "retention", width: 160, render: (_, record) => (
        <Space size={4} wrap>
          <Tag>{`${record.retentionDays || 0} 天`}</Tag>
          <Tag color={record.redactionApplied ? "green" : "default"}>{record.redactionApplied ? "已脱敏" : "未标记"}</Tag>
        </Space>
      )},
      {title: "操作", key: "action", width: 90, render: (_, record) => <Button size="small" aria-label={`dry-run-history-detail-${record.name}`} onClick={() => this.openDryRunHistoryDetail(record)}>详情</Button>},
    ];
    return (
      <>
        <Row align="middle" justify="space-between" style={{marginBottom: 12}}>
          <Col>
            <Space direction="vertical" size={2}>
              <Text strong>Dry-run 历史</Text>
              <Text type={this.state.dryRunHistoryError ? "danger" : "secondary"}>
                {this.state.dryRunHistoryError || "最近 10 次预览摘要，仅展示脱敏聚合信息。"}
              </Text>
            </Space>
          </Col>
          <Col><Button icon={<ReloadOutlined />} loading={this.state.dryRunHistoryLoading} onClick={() => this.refreshDryRunHistory().catch(() => {})}>刷新</Button></Col>
        </Row>
        <Table
          rowKey="name"
          size="middle"
          bordered
          loading={this.state.loading || this.state.dryRunHistoryLoading}
          columns={columns}
          dataSource={this.state.dryRunHistories}
          locale={{emptyText: this.state.dryRunHistoryError || "暂无 Dry-run 历史"}}
          scroll={{x: 1830}}
          pagination={false}
        />
        {this.renderDryRunHistoryDetailDrawer()}
      </>
    );
  }

  renderDryRunHistoryDetailDrawer() {
    const detail = this.state.dryRunHistoryDetail || {};
    const diagnostics = detail.diagnostics || {};
    return (
      <Drawer
        title="Dry-run 详情"
        width={520}
        open={this.state.dryRunHistoryDetailOpen}
        onClose={() => this.setState({dryRunHistoryDetailOpen: false})}
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
      </Drawer>
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

  renderTestResult() {
    const result = this.state.testResult;
    if (!result) {
      return null;
    }
    return (
      <Alert
        style={{marginTop: 16}}
        type="success"
        showIcon
        message="通讯录权限已满足"
        description={`部门：${result.departmentCount || 0}，成员：${result.userCount || 0}`}
      />
    );
  }

  renderRuns() {
    const columns = [
      {title: "运行 ID", dataIndex: "name", key: "name", width: 210, ellipsis: true},
      {title: "状态", dataIndex: "status", key: "status", width: 120, render: status => this.getStatusTag(status)},
      {title: "触发方式", dataIndex: "triggerType", key: "triggerType", width: 110, render: triggerType => this.getTriggerTag(triggerType)},
      {title: "阶段", dataIndex: "stage", key: "stage", width: 120, render: (stage, record) => this.getStageText(stage, record.status)},
      {title: "执行人", dataIndex: "actor", key: "actor", width: 120},
      {title: "开始时间", dataIndex: "startedAt", key: "startedAt", width: 180, render: text => this.formatRunTime(text)},
      {title: "结束时间", dataIndex: "finishedAt", key: "finishedAt", width: 180, render: text => this.formatRunTime(text)},
      {title: "部门（新增 / 更新 / 禁用）", key: "departments", width: 180, render: (_, record) => `新 ${record.departmentCreatedCount || 0} / 更 ${record.departmentUpdatedCount || 0} / 禁 ${record.departmentDisabledCount || 0}`},
      {title: "用户（新增 / 更新 / 禁用）", key: "users", width: 180, render: (_, record) => `新 ${record.userCreatedCount || 0} / 更 ${record.userUpdatedCount || 0} / 禁 ${record.userDisabledCount || 0}`},
      {title: "诊断", key: "diagnostics", width: 260, render: (_, record) => this.renderDiagnostics(record)},
      {title: "统计 / 耗时", key: "diagnosticStats", width: 190, render: (_, record) => this.renderDiagnosticStats(record)},
      {title: "错误摘要", key: "errorText", ellipsis: true, render: (_, record) => this.getRunSafeSummary(record)},
    ];
    return (
      <Table
        rowKey="name"
        size="middle"
        bordered
        loading={this.state.loading}
        columns={columns}
        dataSource={this.state.runs}
        scroll={{x: 1870}}
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
          <Button icon={<PlayCircleOutlined />} loading={this.state.syncing} disabled={!config.isEnabled || hasRunningRuns} onClick={() => this.startSync()}>{hasRunningRuns ? "同步进行中" : "开始全量同步"}</Button>
        </Space>

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
