// Copyright 2026 The AICodex Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import React from "react";
import {Alert, Button, Col, Empty, Input, Row, Space, Switch, Table, Tag, Tooltip, Typography} from "antd";
import {PlayCircleOutlined, PlusOutlined, ReloadOutlined, SaveOutlined, ToolOutlined} from "@ant-design/icons";
import i18next from "i18next";
import * as Setting from "./Setting";
import * as DingTalkOrganizationSyncBackend from "./backend/DingTalkOrganizationSyncBackend";
import type {
  DingTalkApiResponse,
  DingTalkOrganizationSyncConfig,
  DingTalkOrganizationSyncConnectionTestResult,
  DingTalkOrganizationSyncRunRecord
} from "./backend/DingTalkOrganizationSyncBackend";
import OrganizationSelect from "./common/select/OrganizationSelect";
import {getDefaultTablePagination, getTablePaginationProps} from "./common/table/TablePagination";
import {LegacyOrganizationSyncSourceStatus, getDirectorySourceUiStatus} from "./organizationDirectorySourceStatus";
import {
  OrganizationSyncActionBar,
  OrganizationSyncPageHeader,
  OrganizationSyncRunRecordHeader,
  OrganizationSyncSectionCard
} from "./organizationSync/OrganizationSyncShell";
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
const lastDingTalkOrganizationSyncOrganizationKey = "dingtalk-org-sync:lastOrganization";
const credentialTextInputProps = {
  autoComplete: "off",
  spellCheck: false,
} as const;
const credentialSecretInputProps = {
  autoComplete: "new-password",
  spellCheck: false,
} as const;

interface AdminAccount {
  owner?: string;
  isAdmin?: boolean;
}

interface DingTalkOrganizationSyncPageProps {
  account?: AdminAccount;
  history?: {
    push?: (location: string | {pathname: string; mode?: string}) => void;
  };
}

interface PaginationState {
  current: number;
  pageSize: number;
  total?: number;
  [key: string]: unknown;
}

interface TablePaginationChange {
  current?: number;
  pageSize?: number;
}

interface DingTalkOrganizationSyncPageState {
  organization: string;
  organizationDisplayNames: OrganizationDisplayNameMap;
  config: DingTalkOrganizationSyncConfig;
  sourceStatus: OrganizationSyncSourceStatus;
  runs: DingTalkOrganizationSyncRunRecord[];
  runCount: number;
  pagination: PaginationState;
  loading: boolean;
  lastRunsRefreshAt: string;
  runRefreshError: string;
  saving: boolean;
  testing: boolean;
  syncing: boolean;
  testResult: DingTalkOrganizationSyncConnectionTestResult | null;
}

interface RefreshRunsOptions {
  refreshConfig?: boolean;
  pagination?: PaginationState;
}

type OrganizationSyncSourceStatus = LegacyOrganizationSyncSourceStatus;
type OrganizationDisplayNameMap = ReturnType<typeof buildOrganizationDisplayNameMap>;
type OrganizationDisplayNameRecords = NonNullable<Parameters<typeof buildOrganizationDisplayNameMap>[0]>;

class DingTalkOrganizationSyncPage extends React.Component<DingTalkOrganizationSyncPageProps, DingTalkOrganizationSyncPageState> {
  private runRefreshTimer: ReturnType<typeof setTimeout> | null;
  private isUnmounted: boolean;

  constructor(props: DingTalkOrganizationSyncPageProps) {
    super(props);
    this.runRefreshTimer = null;
    this.isUnmounted = false;
    const organization = this.getInitialOrganization(props.account);
    this.state = {
      organization,
      organizationDisplayNames: {},
      config: this.normalizeConfig(organization),
      sourceStatus: {},
      runs: [],
      runCount: 0,
      pagination: getDefaultTablePagination(),
      loading: false,
      lastRunsRefreshAt: "",
      runRefreshError: "",
      saving: false,
      testing: false,
      syncing: false,
      testResult: null,
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

  getAccountOrganization(account?: AdminAccount): string {
    if (!account?.owner) {
      return "";
    }
    return Setting.getRequestOrganization(account) || account.owner;
  }

  getInitialOrganization(account?: AdminAccount): string {
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
      return localStorage.getItem(lastDingTalkOrganizationSyncOrganizationKey) || "";
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
      localStorage.setItem(lastDingTalkOrganizationSyncOrganizationKey, normalized);
    } catch {
      // 本地存储不可用不影响同步页主流程。
    }
  }

  clearRunRefreshTimer() {
    if (this.runRefreshTimer !== null) {
      clearTimeout(this.runRefreshTimer);
      this.runRefreshTimer = null;
    }
  }

  hasRunningRuns(runs: DingTalkOrganizationSyncRunRecord[]): boolean {
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

  syncRunRefreshLoop(organization: string, runs: DingTalkOrganizationSyncRunRecord[]): void {
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

  refreshRuns(organization: string, options: RefreshRunsOptions = {}): Promise<void> {
    const requestedOrganization = this.getBusinessOrganization(organization);
    if (!requestedOrganization && !options.refreshConfig) {
      return Promise.resolve();
    }

    const {
      refreshConfig = false,
      pagination = this.state.pagination,
    } = options;
    const nextPagination = getDefaultTablePagination(pagination);

    this.clearRunRefreshTimer();
    this.setState({loading: true});

    const configRequest = refreshConfig
      ? DingTalkOrganizationSyncBackend.getDingTalkOrganizationSyncConfig(requestedOrganization)
      : Promise.resolve(null);
    const runsRequest = requestedOrganization
      ? DingTalkOrganizationSyncBackend.getDingTalkOrganizationSyncRuns(requestedOrganization, nextPagination.current, nextPagination.pageSize)
      : Promise.resolve({status: "ok", data: [], data2: 0} as DingTalkApiResponse<DingTalkOrganizationSyncRunRecord[]>);

    return Promise.all([configRequest, runsRequest]).then(([configRes, runsRes]) => {
      if (configRes?.status === "error") {
        Setting.showMessage("error", configRes.msg || "配置刷新失败");
      }
      if (runsRes.status === "error") {
        Setting.showMessage("error", runsRes.msg || "同步记录刷新失败");
      }
      if (this.isUnmounted || (requestedOrganization && this.state.organization !== requestedOrganization)) {
        return;
      }

      let resolvedOrganization = requestedOrganization;
      let nextConfig = this.state.config;
      let nextSourceStatus = this.state.sourceStatus;
      let shouldRefreshResolvedRuns = false;
      if (configRes !== null) {
        resolvedOrganization = this.resolveConfigResponseOrganization(requestedOrganization, configRes?.data);
        nextConfig = this.normalizeConfig(resolvedOrganization, configRes?.data?.config);
        nextSourceStatus = this.normalizeSourceStatus(configRes?.data);
        shouldRefreshResolvedRuns = !requestedOrganization && !!resolvedOrganization;
      }

      const nextRuns = runsRes.status === "ok" ? (runsRes.data || []) : this.state.runs;
      this.setState({
        loading: false,
        organization: resolvedOrganization,
        config: nextConfig,
        sourceStatus: nextSourceStatus,
        testResult: configRes !== null ? null : this.state.testResult,
        runs: nextRuns,
        runCount: runsRes.status === "ok" ? (runsRes.data2 || 0) : this.state.runCount,
        pagination: runsRes.status === "ok" ? {
          ...nextPagination,
          total: runsRes.data2 || 0,
        } : this.state.pagination,
        lastRunsRefreshAt: runsRes.status === "ok" ? (Setting.getFormattedDate(new Date().toISOString()) || "") : this.state.lastRunsRefreshAt,
        runRefreshError: runsRes.status === "ok" ? "" : "同步记录刷新失败，请手动刷新重试。",
      }, () => {
        if (shouldRefreshResolvedRuns) {
          this.refreshRuns(resolvedOrganization, {pagination: getDefaultTablePagination()}).catch(() => {});
          return;
        }
        this.syncRunRefreshLoop(resolvedOrganization, nextRuns);
      });
    }).catch(error => {
      this.clearRunRefreshTimer();
      if (this.isUnmounted || (requestedOrganization && this.state.organization !== requestedOrganization)) {
        return;
      }
      this.setState({
        loading: false,
        runRefreshError: "自动刷新已暂停，请手动刷新重试。",
      });
      Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
    });
  }

  refresh(organization: string): void {
    this.refreshRuns(organization, {refreshConfig: true, pagination: getDefaultTablePagination()}).catch(() => {});
  }

  resolveConfigResponseOrganization(requestedOrganization: string, data?: DingTalkOrganizationSyncBackend.DingTalkOrganizationSyncConfigResponse): string {
    return this.getBusinessOrganization(data?.config?.organization)
      || this.getBusinessOrganization(data?.organization)
      || this.getBusinessOrganization(data?.defaultOrganization)
      || this.getBusinessOrganization(requestedOrganization);
  }

  normalizeSourceStatus(data?: DingTalkOrganizationSyncBackend.DingTalkOrganizationSyncSourceStatus | null): OrganizationSyncSourceStatus {
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
      Setting.showMessage("warning", this.getSourceConflictActionMessage("请新建组织后配置钉钉同步。"));
      return;
    }
    this.updateConfigField("isEnabled", checked);
  }

  normalizeConfig(organization: string, config?: Partial<DingTalkOrganizationSyncConfig> | null): DingTalkOrganizationSyncConfig {
    return {
      owner: organization,
      name: "dingtalk-organization-sync",
      organization,
      appKey: "",
      appSecret: "",
      isEnabled: false,
      softDisableMissingData: true,
      scheduleEnabled: false,
      scheduleCron: "0 2 * * *",
      scheduleTimezone: "Asia/Shanghai",
      ...(config || {}),
    };
  }

  isDuplicateRunningStartError(message?: string | null): boolean {
    return typeof message === "string" && message.toLowerCase().includes("already running");
  }

  updateConfigField<K extends keyof DingTalkOrganizationSyncConfig>(key: K, value: DingTalkOrganizationSyncConfig[K]): void {
    this.setState({
      config: {
        ...this.state.config,
        [key]: value,
      },
    });
  }

  changeOrganization(organization: string, remember = true): void {
    const targetOrganization = this.getBusinessOrganization(organization);
    if (remember) {
      this.rememberOrganization(targetOrganization);
    }
    this.clearRunRefreshTimer();
    this.setState({
      organization: targetOrganization,
      config: this.normalizeConfig(targetOrganization),
      sourceStatus: {},
      runs: [],
      runCount: 0,
      pagination: getDefaultTablePagination(),
      testResult: null,
    }, () => this.refresh(targetOrganization));
  }

  createSyncTargetOrganization() {
    void openNewSyncTargetOrganization(this.props.history);
  }

  saveConfig() {
    if (this.hasSourceConflict()) {
      Setting.showMessage("warning", this.getSourceConflictActionMessage("暂不能保存钉钉配置。"));
      return;
    }
    this.setState({saving: true});
    DingTalkOrganizationSyncBackend.saveDingTalkOrganizationSyncConfig(this.state.config)
      .then(res => {
        if (res.status === "ok") {
          const previousOrganization = this.state.organization;
          const resolvedOrganization = this.resolveConfigResponseOrganization(previousOrganization, res.data);
          this.rememberOrganization(resolvedOrganization);
          this.setState({
            saving: false,
            organization: resolvedOrganization,
            config: this.normalizeConfig(resolvedOrganization, res.data?.config),
            sourceStatus: this.normalizeSourceStatus(res.data),
          }, () => {
            if (resolvedOrganization !== previousOrganization) {
              this.refresh(resolvedOrganization);
              Setting.showMessage("success", `已保存，当前同步组织：${resolvedOrganization}`);
              return;
            }
            Setting.showMessage("success", i18next.t("general:Successfully saved"));
          });
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
    DingTalkOrganizationSyncBackend.testDingTalkOrganizationSyncConfig(this.state.config)
      .then(res => {
        this.setState({testing: false});
        if (res.status === "ok") {
          this.setState({testResult: res.data || null});
          const missingFields = res.data?.missingFields || [];
          if (missingFields.length === 0) {
            Setting.showMessage("success", "通讯录连接测试通过");
          } else {
            Setting.showMessage("info", `缺失字段：${missingFields.join(", ")}`);
          }
        } else {
          Setting.showMessage("error", `连接测试失败：${res.msg}`);
        }
      }).catch(error => {
        this.setState({testing: false});
        Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
      });
  }

  startSync() {
    if (this.hasSourceConflict()) {
      Setting.showMessage("warning", this.getSourceConflictActionMessage("暂不能开始钉钉正式同步。"));
      return;
    }
    this.setState({syncing: true});
    DingTalkOrganizationSyncBackend.startDingTalkOrganizationSyncRun(this.state.organization)
      .then(res => {
        this.setState({syncing: false});
        if (res.status === "ok") {
          Setting.showMessage("success", "同步任务已启动");
          this.refresh(this.state.organization);
        } else if (this.isDuplicateRunningStartError(res.msg)) {
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

  getStatusTag(status?: string) {
    const colorMap: Record<string, string> = {
      running: "processing",
      succeeded: "success",
      failed: "error",
      partial: "warning",
    };
    const labelMap: Record<string, string> = {
      running: "运行中",
      succeeded: "成功",
      failed: "失败",
      partial: "部分成功",
    };
    const statusKey = status || "";
    return <Tag color={colorMap[statusKey] || "default"}>{labelMap[statusKey] || statusKey || "-"}</Tag>;
  }

  getTriggerTag(triggerType?: string) {
    const colorMap: Record<string, string> = {
      manual: "blue",
      scheduled: "cyan",
    };
    const labelMap: Record<string, string> = {
      manual: "手动",
      scheduled: "定时",
    };
    const triggerTypeKey = triggerType || "";
    return <Tag color={colorMap[triggerTypeKey] || "default"}>{labelMap[triggerTypeKey] || triggerTypeKey || "-"}</Tag>;
  }

  getStageText(stage?: string, status?: string): string {
    if (status === "succeeded") {
      return "已完成";
    }

    const labelMap: Record<string, string> = {
      fetching: "拉取数据",
      planning: "计算差异",
      applying: "应用变更",
      finalizing: "收尾处理",
    };
    const stageKey = stage || "";
    return labelMap[stageKey] || stageKey || "-";
  }

  formatRunTime(text?: string | null): string {
    if (!text || String(text).startsWith("0001-01-01")) {
      return "-";
    }
    return Setting.getFormattedDate(text) || "-";
  }

  renderTestResult() {
    const result = this.state.testResult;
    if (!result) {
      return null;
    }

    const missingFields = result.missingFields || [];
    const type = missingFields.length === 0 ? "success" : "warning";
    const message = missingFields.length === 0 ? "通讯录权限已满足" : `缺失字段：${missingFields.join(", ")}`;
    return (
      <Alert
        style={{marginTop: 16}}
        type={type}
        showIcon
        message={message}
        description={`部门：${result.departmentCount || 0}，成员：${result.userCount || 0}`}
      />
    );
  }

  renderRuns() {
    const columns = [
      {
        title: "序号",
        key: "index",
        width: 72,
        align: "center" as const,
        onHeaderCell: () => nowrapHeaderCell,
        render: (_: unknown, record: DingTalkOrganizationSyncRunRecord, index: number) => this.renderRunIndex(record, index),
      },
      {
        title: "状态",
        dataIndex: "status",
        key: "status",
        width: 120,
        render: (status: string) => this.getStatusTag(status),
      },
      {
        title: "触发方式",
        dataIndex: "triggerType",
        key: "triggerType",
        width: 110,
        render: (triggerType: string) => this.getTriggerTag(triggerType),
      },
      {
        title: "阶段",
        dataIndex: "stage",
        key: "stage",
        width: 120,
        render: (stage: string, record: DingTalkOrganizationSyncRunRecord) => this.getStageText(stage, record.status),
      },
      {
        title: "执行人",
        dataIndex: "actor",
        key: "actor",
        width: 120,
        ellipsis: true,
        render: (actor: string) => this.renderActor(actor),
      },
      {
        title: "开始时间",
        dataIndex: "startedAt",
        key: "startedAt",
        width: 180,
        render: (text: string) => this.formatRunTime(text),
      },
      {
        title: "结束时间",
        dataIndex: "finishedAt",
        key: "finishedAt",
        width: 180,
        render: (text: string) => this.formatRunTime(text),
      },
      {
        title: "部门",
        key: "departments",
        width: 150,
        render: (_: unknown, record: DingTalkOrganizationSyncRunRecord) => this.renderImpactCounts(record.departmentCreatedCount, record.departmentUpdatedCount, record.departmentDisabledCount),
      },
      {
        title: "用户",
        key: "users",
        width: 150,
        render: (_: unknown, record: DingTalkOrganizationSyncRunRecord) => this.renderImpactCounts(record.userCreatedCount, record.userUpdatedCount, record.userDisabledCount),
      },
      {
        title: "关系",
        key: "relationships",
        width: 140,
        render: (_: unknown, record: DingTalkOrganizationSyncRunRecord) => this.renderRelationshipImpactCounts(record),
      },
      {
        title: "错误摘要",
        dataIndex: "errorText",
        key: "errorText",
        ellipsis: true,
        onHeaderCell: () => nowrapHeaderCell,
      },
    ];

    return (
      <Table
        rowKey={record => record.name || `${record.startedAt || ""}-${record.actor || ""}`}
        size="middle"
        bordered
        loading={this.state.loading}
        columns={columns}
        dataSource={this.state.runs}
        scroll={{x: 1420}}
        pagination={getTablePaginationProps({...this.state.pagination, total: this.state.runCount || this.state.runs.length})}
        onChange={pagination => this.handleRunsTableChange(pagination)}
        locale={{emptyText: <Empty description="暂无同步记录" />}}
      />
    );
  }

  getRunRowNumber(index: number): number {
    const current = this.state.pagination.current || 1;
    const pageSize = this.state.pagination.pageSize || 10;
    return (current - 1) * pageSize + index + 1;
  }

  copyRunId(runId: string) {
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

  handleRunIndexKeyDown(event: React.KeyboardEvent<HTMLElement>, runId: string) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      this.copyRunId(runId);
    }
  }

  renderRunIndex(record: DingTalkOrganizationSyncRunRecord, index: number) {
    const runId = record.name || "";
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

  renderActor(actor: string) {
    const text = actor || "-";
    return (
      <Tooltip title={text}>
        <Text ellipsis style={{display: "inline-block", maxWidth: 112}}>
          {text}
        </Text>
      </Tooltip>
    );
  }

  renderImpactCounts(created?: number, updated?: number, disabled?: number) {
    return (
      <Text style={runStatisticTextStyle}>
        {`新 ${created || 0} / 更 ${updated || 0} / 禁 ${disabled || 0}`}
      </Text>
    );
  }

  renderRelationshipImpactCounts(record: DingTalkOrganizationSyncRunRecord) {
    const updated = (record.membershipUpdatedCount || 0) + (record.departmentLeaderUpdatedCount || 0) + (record.directLeaderUpdatedCount || 0);
    const disabled = (record.membershipDisabledCount || 0) + (record.departmentLeaderDisabledCount || 0) + (record.directLeaderDisabledCount || 0);
    return (
      <Text style={runStatisticTextStyle}>
        {`更 ${updated} / 禁 ${disabled}`}
      </Text>
    );
  }

  getRunRefreshHint(): {type: "secondary" | "danger"; text: string} {
    const lastRefreshText = this.state.lastRunsRefreshAt ? `上次刷新：${this.state.lastRunsRefreshAt}` : "";
    if (this.state.runRefreshError) {
      return {type: "danger", text: `${this.state.runRefreshError}${lastRefreshText ? ` ${lastRefreshText}` : ""}`};
    }

    const statusText = this.state.pagination.current > 1
      ? "当前正在查看历史分页，可手动刷新同步记录。返回第 1 页可观察最新运行状态。"
      : this.hasRunningRuns(this.state.runs)
        ? `检测到运行中任务，自动每 ${syncRunPollIntervalMs / 1000} 秒刷新。`
        : "当前无运行中任务，可手动刷新同步记录。";

    return {
      type: "secondary",
      text: `${statusText}${lastRefreshText ? ` ${lastRefreshText}` : ""}`,
    };
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
            选择要绑定钉钉通讯录的 aicodex-admin 组织。不同组织的 AppKey、AppSecret 和同步记录互不混用。
          </Text>
        </div>
      </div>
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

  renderSyncOptions(config: DingTalkOrganizationSyncConfig) {
    const enableDisabled = this.hasSourceConflict();
    return (
      <div>
        <div style={{marginBottom: 8}}>同步选项</div>
        <Space className="dingtalk-organization-sync-options" direction="vertical" size={12}>
          <Space>
            <Switch checked={Boolean(config.isEnabled)} disabled={enableDisabled} onChange={checked => this.updateSyncEnabled(checked)} />
            <span>启用同步</span>
          </Space>
          <Space>
            <Switch checked={Boolean(config.softDisableMissingData)} onChange={checked => this.updateConfigField("softDisableMissingData", checked)} />
            <span>全量同步成功后软禁用缺失数据</span>
          </Space>
        </Space>
      </div>
    );
  }

  renderScheduleOptions(config: DingTalkOrganizationSyncConfig) {
    return (
      <div>
        <div style={{marginBottom: 8}}>定时同步</div>
        <Space direction="vertical" size={8} style={{width: "100%"}}>
          <Space>
            <Switch checked={Boolean(config.scheduleEnabled)} onChange={checked => this.updateConfigField("scheduleEnabled", checked)} />
            <span>启用定时同步</span>
          </Space>
          {!config.scheduleEnabled ? (
            <Text type="secondary">未启用定时同步</Text>
          ) : (
            <>
              <div>
                <div style={{marginBottom: 4}}>Cron 表达式</div>
                <Input
                  value={config.scheduleCron}
                  onChange={event => this.updateConfigField("scheduleCron", event.target.value)}
                  placeholder="0 2 * * *"
                />
              </div>
              <div>
                <div style={{marginBottom: 4}}>时区</div>
                <Input
                  value={config.scheduleTimezone}
                  onChange={event => this.updateConfigField("scheduleTimezone", event.target.value)}
                  placeholder="Asia/Shanghai"
                />
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
      </div>
    );
  }

  handleRunsTableChange = (pagination: TablePaginationChange) => {
    this.refreshRuns(this.state.organization, {
      pagination: {
        ...this.state.pagination,
        current: pagination.current || this.state.pagination.current,
        pageSize: pagination.pageSize || this.state.pagination.pageSize,
      },
    }).catch(() => {});
  };

  render() {
    const config = this.state.config;
    const runRefreshHint = this.getRunRefreshHint();
    const hasRunningRuns = this.hasRunningRuns(this.state.runs);
    const hasSourceConflict = this.hasSourceConflict();
    const syncButtonLabel = hasRunningRuns ? "同步进行中" : "开始全量同步";

    return (
      <div className="organization-sync-page dingtalk-organization-sync-page">
        <OrganizationSyncPageHeader
          className="organization-sync-page-title"
          provider="dingtalk"
          title="钉钉组织架构同步"
          subtitle="配置通讯录同步并查看正式同步记录。"
        />

        <OrganizationSyncSectionCard variant="config">
          <Row className="organization-sync-config-grid" gutter={[16, 16]}>
            <Col xs={24} md={12}>
              {this.renderOrganizationSelector()}
            </Col>
            <Col xs={0} md={12} />
            <Col xs={24} md={12}>
              <div style={{marginBottom: 8}}>AppKey</div>
              <Input
                {...credentialTextInputProps}
                name="dingtalk-organization-sync-app-key"
                value={config.appKey}
                onChange={event => this.updateConfigField("appKey", event.target.value)}
              />
            </Col>
            <Col xs={24} md={12}>
              <div style={{marginBottom: 8}}>AppSecret</div>
              <Input.Password
                {...credentialSecretInputProps}
                name="dingtalk-organization-sync-app-secret"
                value={config.appSecret}
                onChange={event => this.updateConfigField("appSecret", event.target.value)}
              />
            </Col>
            <Col xs={24} md={12}>
              {this.renderSyncOptions(config)}
            </Col>
            <Col xs={24} md={12}>
              {this.renderScheduleOptions(config)}
            </Col>
            <Col span={24} className="organization-sync-permission-alert-row">
              <Alert
                className="organization-sync-permission-alert dingtalk-organization-sync-permission-alert"
                type="info"
                showIcon
                message="通讯录读取权限要求"
                description="请填写钉钉企业内部应用的 AppKey 和 AppSecret，并确认应用已获得通讯录部门与成员读取权限。"
              />
            </Col>
          </Row>

          {this.renderSourceConflictAlert()}

          {this.renderTestResult()}

          <OrganizationSyncActionBar
            className="organization-sync-action-bar"
            actions={[
              {key: "save", label: String(i18next.t("general:Save")), icon: <SaveOutlined />, type: "primary", loading: this.state.saving, disabled: hasSourceConflict, onClick: () => this.saveConfig()},
              {key: "test", label: "测试连接", icon: <ToolOutlined />, loading: this.state.testing, onClick: () => this.testConfig()},
              {key: "sync", label: syncButtonLabel, icon: <PlayCircleOutlined />, loading: this.state.syncing, disabled: hasSourceConflict || !config.isEnabled || hasRunningRuns, onClick: () => this.startSync()},
            ]}
          />
        </OrganizationSyncSectionCard>

        <OrganizationSyncSectionCard variant="record">
          <OrganizationSyncRunRecordHeader
            className="organization-sync-record-header"
            title="同步记录"
            hint={runRefreshHint.text}
            hintType={runRefreshHint.type}
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

export default DingTalkOrganizationSyncPage;
