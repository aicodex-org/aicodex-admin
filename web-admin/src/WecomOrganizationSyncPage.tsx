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
import {Alert, Button, Col, Divider, Empty, Input, Modal, Row, Space, Spin, Switch, Table, Tag, Tooltip, Typography} from "antd";
import {FileSearchOutlined, HistoryOutlined, PlayCircleOutlined, PlusOutlined, ReloadOutlined, SaveOutlined, ToolOutlined} from "@ant-design/icons";
import * as Setting from "./Setting";
import * as FeishuOrganizationSyncBackend from "./backend/FeishuOrganizationSyncBackend";
import * as WecomOrganizationSyncBackendRaw from "./backend/WecomOrganizationSyncBackend";
import OrganizationSelect from "./common/select/OrganizationSelect";
import {getDefaultTablePagination, getTablePaginationProps} from "./common/table/TablePagination";
import i18next from "i18next";
import {
  OrganizationSyncActionBar,
  OrganizationSyncPageHeader,
  OrganizationSyncRunRecordHeader
} from "./organizationSync/OrganizationSyncShell";

const {Text} = Typography;
const syncRunPollIntervalMs = 3000;
const runStatisticTextStyle: React.CSSProperties = {fontVariantNumeric: "tabular-nums"};
const nowrapHeaderCell: React.ThHTMLAttributes<HTMLElement> = {style: {whiteSpace: "nowrap"}};
const lastWecomOrganizationSyncOrganizationKey = "wecom-org-sync:lastOrganization";
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

interface WecomOrganizationSyncPageProps {
  account?: AdminAccount;
  history?: {
    push?: (path: string) => void;
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

interface WecomOrganizationSyncConfig {
  owner?: string;
  name?: string;
  organization: string;
  corpId: string;
  addressBookSecret: string;
  isEnabled: boolean;
  softDisableMissingData: boolean;
  scheduleEnabled: boolean;
  scheduleCron: string;
  scheduleTimezone: string;
  scheduleLastFireAt?: string;
  scheduleLastStatus?: string;
  scheduleLastErrorText?: string;
}

interface WecomOrganizationSyncRun {
  name?: string;
  status?: string;
  stage?: string;
  triggerType?: string;
  actor?: string;
  startedAt?: string;
  finishedAt?: string;
  departmentCreatedCount?: number;
  departmentUpdatedCount?: number;
  departmentDisabledCount?: number;
  userCreatedCount?: number;
  userUpdatedCount?: number;
  userDisabledCount?: number;
  errorText?: string;
}

interface WecomOrganizationSyncDryRunDiffCounts {
  toCreate?: number;
  toUpdate?: number;
  toSoftDisable?: number;
  unchanged?: number;
  conflict?: number;
  invalid?: number;
}

interface WecomOrganizationSyncDryRunPreview {
  status?: string;
  source?: {
    organization?: string;
    corpAlias?: string;
    previewedAt?: string;
  };
  snapshotStats?: {
    departmentCount?: number;
    userCount?: number;
    relationshipCount?: number;
  };
  diff?: {
    departments?: WecomOrganizationSyncDryRunDiffCounts;
    users?: WecomOrganizationSyncDryRunDiffCounts;
    relationships?: WecomOrganizationSyncDryRunDiffCounts;
  };
  reasonCounts?: Record<string, number>;
  diagnostics?: {
    failedStage?: string;
    failureCategory?: string;
    reasonCode?: string;
    operatorAction?: string;
    safeSummary?: string;
  };
  historyWarning?: string;
}

interface WecomOrganizationSyncDryRunHistory {
  name?: string;
  status?: string;
  createdAt?: string;
  diagnosticAlias?: string;
  corpAlias?: string;
  snapshotDepartmentCount?: number;
  snapshotUserCount?: number;
  snapshotRelationshipCount?: number;
  departmentToCreate?: number;
  departmentToUpdate?: number;
  departmentToSoftDisable?: number;
  userToCreate?: number;
  userToUpdate?: number;
  userToSoftDisable?: number;
  relationshipToCreate?: number;
  relationshipToUpdate?: number;
  relationshipToSoftDisable?: number;
  safeSummary?: string;
  redactionApplied?: boolean;
  retentionDays?: number;
}

interface WecomOrganizationSyncTestResult {
  missingFields?: string[];
  departmentCount?: number;
  userCount?: number;
}

interface WecomOrganizationSyncPageState {
  organization: string;
  config: WecomOrganizationSyncConfig | null;
  sourceStatus: OrganizationSyncSourceStatus;
  runs: WecomOrganizationSyncRun[];
  runCount: number;
  pagination: PaginationState;
  loading: boolean;
  lastRunsRefreshAt: string;
  runRefreshError: string;
  saving: boolean;
  testing: boolean;
  syncing: boolean;
  testResult: WecomOrganizationSyncTestResult | null;
  dryRunPreviewLoading: boolean;
  dryRunPreviewModalOpen: boolean;
  dryRunPreview: WecomOrganizationSyncDryRunPreview | null;
  dryRunPreviewError: string;
  dryRunHistoryModalOpen: boolean;
  dryRunHistoryLoading: boolean;
  dryRunHistoryError: string;
  dryRunHistories: WecomOrganizationSyncDryRunHistory[];
  dryRunHistoryDetailModalOpen: boolean;
  dryRunHistoryDetailLoading: boolean;
  dryRunHistoryDetail: WecomOrganizationSyncDryRunHistory | null;
  dryRunHistoryDetailError: string;
}

interface RefreshRunsOptions {
  refreshConfig?: boolean;
  pagination?: PaginationState;
}

interface ApiResponse<T = unknown> {
  status?: string;
  data?: T;
  data2?: number;
  msg?: string | null;
}

interface OrganizationSyncSourceStatus {
  defaultOrganization?: string;
  defaultOrganizationSource?: string;
  conflictingProvider?: string;
  conflictingOrganization?: string;
  conflictingConfigured?: boolean;
  conflictingEnabled?: boolean;
  conflictingOrganizations?: string[];
}

interface WecomConfigResponseData {
  organization?: string;
  isConfigured?: boolean;
  config?: Partial<WecomOrganizationSyncConfig>;
  defaultOrganization?: string;
  defaultOrganizationSource?: string;
  conflictingProvider?: string;
  conflictingOrganization?: string;
  conflictingConfigured?: boolean;
  conflictingEnabled?: boolean;
  conflictingOrganizations?: string[];
}

interface WecomSaveResponseData {
  organization?: string;
  config?: Partial<WecomOrganizationSyncConfig>;
  defaultOrganization?: string;
  defaultOrganizationSource?: string;
  conflictingProvider?: string;
  conflictingOrganization?: string;
  conflictingConfigured?: boolean;
  conflictingEnabled?: boolean;
  conflictingOrganizations?: string[];
}

interface WecomBackend {
  getWecomOrganizationSyncConfig: (organization: string) => Promise<ApiResponse<WecomConfigResponseData>>;
  saveWecomOrganizationSyncConfig: (config: WecomOrganizationSyncConfig | null) => Promise<ApiResponse<WecomSaveResponseData>>;
  testWecomOrganizationSyncConfig: (config: WecomOrganizationSyncConfig | null) => Promise<ApiResponse<WecomOrganizationSyncTestResult>>;
  dryRunWecomOrganizationSyncPreview: (organization: string) => Promise<ApiResponse<WecomOrganizationSyncDryRunPreview>>;
  getWecomOrganizationSyncDryRunHistories: (organization: string, filters?: Record<string, unknown>) => Promise<ApiResponse<WecomOrganizationSyncDryRunHistory[]>>;
  getWecomOrganizationSyncDryRunHistory: (organization: string, historyId: string) => Promise<ApiResponse<WecomOrganizationSyncDryRunHistory>>;
  startWecomOrganizationSyncRun: (organization: string) => Promise<ApiResponse>;
  getWecomOrganizationSyncRuns: (organization: string, page?: number | string, pageSize?: number | string) => Promise<ApiResponse<WecomOrganizationSyncRun[]>>;
}

const WecomOrganizationSyncBackend = WecomOrganizationSyncBackendRaw as unknown as WecomBackend;

class WecomOrganizationSyncPage extends React.Component<WecomOrganizationSyncPageProps, WecomOrganizationSyncPageState> {
  private runRefreshTimer: ReturnType<typeof setTimeout> | null;
  private isUnmounted: boolean;

  constructor(props: WecomOrganizationSyncPageProps) {
    super(props);
    this.runRefreshTimer = null;
    this.isUnmounted = false;
    const organization = this.getInitialOrganization(props.account);
    this.state = {
      organization,
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
      syncing: false,
      testResult: null,
      dryRunPreviewLoading: false,
      dryRunPreviewModalOpen: false,
      dryRunPreview: null,
      dryRunPreviewError: "",
      dryRunHistoryModalOpen: false,
      dryRunHistoryLoading: false,
      dryRunHistoryError: "",
      dryRunHistories: [],
      dryRunHistoryDetailModalOpen: false,
      dryRunHistoryDetailLoading: false,
      dryRunHistoryDetail: null,
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

    const organization = this.getInitialOrganization(this.props.account);
    if (organization) {
      this.changeOrganization(organization, false);
    }
  }

  getAccountOrganization(account?: AdminAccount): string {
    // 管理页账号信息异步加载时可能先传入 owner 为空的占位对象，避免页面永久停留在空白态。
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
      return localStorage.getItem(lastWecomOrganizationSyncOrganizationKey) || "";
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
      localStorage.setItem(lastWecomOrganizationSyncOrganizationKey, normalized);
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

  hasRunningRuns(runs: WecomOrganizationSyncRun[]): boolean {
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

  syncRunRefreshLoop(organization: string, runs: WecomOrganizationSyncRun[]): void {
    // 自动刷新只服务当前组织上下文，切组织或组件卸载后必须立即失效。
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
    const requestedOrganization = `${organization || ""}`.trim();
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

    const runsRequest = requestedOrganization
      ? WecomOrganizationSyncBackend.getWecomOrganizationSyncRuns(requestedOrganization, nextPagination.current, nextPagination.pageSize)
      : Promise.resolve({status: "ok", data: [], data2: 0} as ApiResponse<WecomOrganizationSyncRun[]>);
    const configRequest = refreshConfig
      ? WecomOrganizationSyncBackend.getWecomOrganizationSyncConfig(requestedOrganization)
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
      return this.resolveLegacyFeishuSourceConflict(this.resolveConfigResponseOrganization(requestedOrganization, configRes?.data));
    }).catch(() => ({}));

    // 手动刷新和自动轮询默认只关心同步记录；只有整页初始化时才顺带刷新配置表单。
    return Promise.all([configRequest, runsRequest, legacySourceConflictRequest]).then(([configRes, runsRes, legacySourceConflict]) => {
      if (configRes?.status === "error") {
        Setting.showMessage("error", configRes.msg || "配置刷新失败");
      }
      if (runsRes.status === "error") {
        Setting.showMessage("error", runsRes.msg || "同步记录刷新失败");
      }
      if (this.isUnmounted || (requestedOrganization && this.state.organization !== requestedOrganization)) {
        return;
      }

      const nextState: Partial<WecomOrganizationSyncPageState> = {
        loading: false,
      };
      let resolvedOrganization = requestedOrganization;
      let shouldRefreshResolvedRuns = false;
      if (configRes !== null) {
        resolvedOrganization = this.resolveConfigResponseOrganization(requestedOrganization, configRes?.data);
        nextState.organization = resolvedOrganization;
        nextState.sourceStatus = this.mergeSourceStatus(configRes?.data, legacySourceConflict);
        nextState.config = this.normalizeConfig(resolvedOrganization, configRes?.data?.config);
        nextState.testResult = null;
        shouldRefreshResolvedRuns = !requestedOrganization && !!resolvedOrganization;
      }
      if (runsRes.status === "ok") {
        nextState.runs = runsRes.data || [];
        nextState.runCount = runsRes.data2 || 0;
        nextState.pagination = {
          ...nextPagination,
          total: runsRes.data2 || 0,
        };
        nextState.lastRunsRefreshAt = Setting.getFormattedDate(new Date().toISOString()) || "";
        nextState.runRefreshError = "";
      } else {
        nextState.runRefreshError = "同步记录刷新失败，请手动刷新重试。";
      }
      this.setState(nextState as Pick<WecomOrganizationSyncPageState, keyof WecomOrganizationSyncPageState>, () => {
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

  resolveConfigResponseOrganization(requestedOrganization: string, data?: WecomConfigResponseData): string {
    return this.getBusinessOrganization(data?.config?.organization)
      || this.getBusinessOrganization(data?.organization)
      || this.getBusinessOrganization(data?.defaultOrganization)
      || this.getBusinessOrganization(requestedOrganization);
  }

  normalizeSourceStatus(data?: WecomConfigResponseData | WecomSaveResponseData | null): OrganizationSyncSourceStatus {
    const conflictingOrganization = this.getBusinessOrganization(data?.conflictingOrganization);
    return {
      defaultOrganization: data?.defaultOrganization || "",
      defaultOrganizationSource: data?.defaultOrganizationSource || "",
      conflictingProvider: data?.conflictingProvider || "",
      conflictingOrganization,
      conflictingConfigured: Boolean(data?.conflictingConfigured),
      conflictingEnabled: Boolean(data?.conflictingEnabled),
      conflictingOrganizations: this.normalizeOrganizations(data?.conflictingOrganizations, conflictingOrganization),
    };
  }

  hasNativeSourceStatus(data?: WecomConfigResponseData | WecomSaveResponseData | null): boolean {
    if (!data) {
      return false;
    }
    return ["conflictingProvider", "conflictingOrganization", "conflictingConfigured", "conflictingEnabled", "conflictingOrganizations"]
      .some(key => Object.prototype.hasOwnProperty.call(data, key));
  }

  mergeSourceStatus(data: WecomConfigResponseData | WecomSaveResponseData | null | undefined, fallbackStatus: OrganizationSyncSourceStatus): OrganizationSyncSourceStatus {
    const sourceStatus = this.normalizeSourceStatus(data);
    const fallbackConflict = Boolean(fallbackStatus.conflictingConfigured || fallbackStatus.conflictingEnabled);
    const sourceConflict = Boolean(sourceStatus.conflictingConfigured || sourceStatus.conflictingEnabled);
    const conflictStatus = sourceConflict ? sourceStatus : fallbackConflict ? fallbackStatus : sourceStatus;
    return {
      ...conflictStatus,
      defaultOrganization: sourceStatus.defaultOrganization || fallbackStatus.defaultOrganization || "",
      defaultOrganizationSource: sourceStatus.defaultOrganizationSource || fallbackStatus.defaultOrganizationSource || "",
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
    return this.normalizeOrganizations(
      this.state.sourceStatus.conflictingOrganizations,
      this.state.sourceStatus.conflictingOrganization
    ).filter(organization => organization !== currentOrganization);
  }

  hasStatusConflict(status: OrganizationSyncSourceStatus): boolean {
    return Boolean(status.conflictingConfigured || status.conflictingEnabled);
  }

  hasSourceConflict(): boolean {
    return this.hasStatusConflict(this.state.sourceStatus);
  }

  updateSyncEnabled(checked: boolean): void {
    if (this.hasSourceConflict()) {
      Setting.showMessage("warning", "当前组织已被其他通讯录同步来源占用，请新建组织后配置企业微信同步。");
      return;
    }
    this.updateConfigField("isEnabled", checked);
  }

  resolveLegacyFeishuSourceConflict(organization: string): Promise<OrganizationSyncSourceStatus> {
    const targetOrganization = this.getBusinessOrganization(organization);
    if (!targetOrganization) {
      return Promise.resolve({});
    }
    return FeishuOrganizationSyncBackend.getFeishuOrganizationSyncConfig(targetOrganization)
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
          conflictingProvider: "Feishu/Lark",
          conflictingOrganization,
          conflictingConfigured: true,
          conflictingEnabled: Boolean(config.isEnabled),
          conflictingOrganizations: [conflictingOrganization],
        };
      })
      .catch(() => ({}));
  }

  normalizeConfig(organization: string, config?: Partial<WecomOrganizationSyncConfig> | null): WecomOrganizationSyncConfig {
    // 后端在未配置时可能只返回空配置，前端统一补齐表单默认值，避免保存时漏传目标组织。
    return {
      owner: organization,
      name: "wecom-organization-sync",
      organization,
      corpId: "",
      addressBookSecret: "",
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

  updateConfigField<K extends keyof WecomOrganizationSyncConfig>(key: K, value: WecomOrganizationSyncConfig[K]): void {
    if (!this.state.config) {
      return;
    }
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
      config: null,
      sourceStatus: {},
      runs: [],
      runCount: 0,
      pagination: getDefaultTablePagination(),
      dryRunPreview: null,
      dryRunPreviewError: "",
      dryRunHistoryError: "",
      dryRunHistories: [],
      dryRunHistoryDetail: null,
      dryRunHistoryDetailError: "",
    }, () => this.refresh(targetOrganization));
  }

  goToOrganizationList() {
    if (this.props.history?.push) {
      this.props.history.push("/organizations");
      return;
    }
    window.location.href = "/organizations";
  }

  saveConfig() {
    if (this.hasSourceConflict()) {
      Setting.showMessage("warning", "当前组织已被其他通讯录同步来源占用，暂不能保存企业微信配置。");
      return;
    }
    this.setState({saving: true});
    WecomOrganizationSyncBackend.saveWecomOrganizationSyncConfig(this.state.config)
      .then(res => {
        if (res.status === "ok") {
          const previousOrganization = this.state.organization;
          const resolvedOrganization = res.data?.config?.organization || res.data?.organization || previousOrganization;
          this.rememberOrganization(resolvedOrganization);
          const nextConfig = this.normalizeConfig(resolvedOrganization, res.data?.config);
          this.setState({
            saving: false,
            organization: resolvedOrganization,
            config: nextConfig,
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
    WecomOrganizationSyncBackend.testWecomOrganizationSyncConfig(this.state.config)
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
      Setting.showMessage("warning", "当前组织已被其他通讯录同步来源占用，暂不能开始企业微信正式同步。");
      return;
    }
    this.setState({syncing: true});
    WecomOrganizationSyncBackend.startWecomOrganizationSyncRun(this.state.organization)
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

  previewDryRun() {
    if (!this.state.organization) {
      Setting.showMessage("error", "请先选择同步目标组织");
      return;
    }
    this.setState({
      dryRunPreviewLoading: true,
      dryRunPreviewModalOpen: true,
      dryRunPreviewError: "",
      dryRunPreview: null,
    });
    WecomOrganizationSyncBackend.dryRunWecomOrganizationSyncPreview(this.state.organization)
      .then(res => {
        if (this.isUnmounted) {
          return;
        }
        if (res.status === "ok") {
          this.setState({
            dryRunPreviewLoading: false,
            dryRunPreview: res.data || null,
            dryRunPreviewError: "",
          });
          return;
        }
        const message = res.msg || "预览失败";
        this.setState({
          dryRunPreviewLoading: false,
          dryRunPreviewError: `预览失败：${message}`,
        });
        Setting.showMessage("error", `预览失败：${message}`);
      }).catch(error => {
        if (this.isUnmounted) {
          return;
        }
        this.setState({
          dryRunPreviewLoading: false,
          dryRunPreviewError: "预览影响失败，请稍后重试。",
        });
        Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
      });
  }

  openDryRunHistory() {
    this.setState({dryRunHistoryModalOpen: true}, () => this.refreshDryRunHistory());
  }

  refreshDryRunHistory() {
    if (!this.state.organization) {
      return;
    }
    this.setState({dryRunHistoryLoading: true, dryRunHistoryError: ""});
    WecomOrganizationSyncBackend.getWecomOrganizationSyncDryRunHistories(this.state.organization, {topN: 10})
      .then(res => {
        if (this.isUnmounted) {
          return;
        }
        if (res.status === "ok") {
          this.setState({
            dryRunHistoryLoading: false,
            dryRunHistories: res.data || [],
            dryRunHistoryError: "",
          });
          return;
        }
        const message = res.msg || "unknown";
        this.setState({
          dryRunHistoryLoading: false,
          dryRunHistoryError: "预览历史加载失败，请稍后重试。",
        });
        Setting.showMessage("error", `预览历史加载失败：${message}`);
      }).catch(error => {
        if (this.isUnmounted) {
          return;
        }
        this.setState({
          dryRunHistoryLoading: false,
          dryRunHistoryError: "预览历史加载失败，请稍后重试。",
        });
        Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
      });
  }

  openDryRunHistoryDetail(historyId?: string) {
    if (!historyId || !this.state.organization) {
      return;
    }
    this.setState({
      dryRunHistoryDetailModalOpen: true,
      dryRunHistoryDetailLoading: true,
      dryRunHistoryDetailError: "",
      dryRunHistoryDetail: null,
    });
    WecomOrganizationSyncBackend.getWecomOrganizationSyncDryRunHistory(this.state.organization, historyId)
      .then(res => {
        if (this.isUnmounted) {
          return;
        }
        if (res.status === "ok") {
          this.setState({
            dryRunHistoryDetailLoading: false,
            dryRunHistoryDetail: res.data || null,
            dryRunHistoryDetailError: "",
          });
          return;
        }
        const message = res.msg || "unknown";
        this.setState({
          dryRunHistoryDetailLoading: false,
          dryRunHistoryDetailError: `预览历史详情加载失败：${message}`,
        });
        Setting.showMessage("error", `预览历史详情加载失败：${message}`);
      }).catch(error => {
        if (this.isUnmounted) {
          return;
        }
        this.setState({
          dryRunHistoryDetailLoading: false,
          dryRunHistoryDetailError: "预览历史详情加载失败，请稍后重试。",
        });
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

  getDryRunStatusTag(status?: string) {
    const statusKey = status || "";
    if (statusKey === "succeeded") {
      return <Tag color="success">预览通过</Tag>;
    }
    if (statusKey === "failed") {
      return <Tag color="error">预览失败</Tag>;
    }
    return <Tag>{statusKey || "无结果"}</Tag>;
  }

  getTriggerTag(triggerType?: string) {
    const colorMap: Record<string, string> = {
      manual: "blue",
      scheduled: "cyan",
      callback: "purple",
    };
    const labelMap: Record<string, string> = {
      manual: "手动",
      scheduled: "定时",
      callback: "回调",
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
      fetch: "拉取数据",
      planning: "计算差异",
      applying: "应用变更",
      finalizing: "收尾处理",
    };
    const stageKey = stage || "";
    return labelMap[stageKey] || stageKey || "-";
  }

  formatRunTime(text?: string | null): string {
    // 运行中的记录还没有结束时间，后端零值时间不应被当成真实时间展示。
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
        render: (_: unknown, record: WecomOrganizationSyncRun, index: number) => this.renderRunIndex(record, index),
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
        // 成功记录显示“已完成”；失败或部分成功保留最后阶段，便于定位卡在哪一步。
        render: (stage: string, record: WecomOrganizationSyncRun) => this.getStageText(stage, record.status),
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
        render: (_: unknown, record: WecomOrganizationSyncRun) => this.renderImpactCounts(record.departmentCreatedCount, record.departmentUpdatedCount, record.departmentDisabledCount),
      },
      {
        title: "用户",
        key: "users",
        width: 150,
        render: (_: unknown, record: WecomOrganizationSyncRun) => this.renderImpactCounts(record.userCreatedCount, record.userUpdatedCount, record.userDisabledCount),
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
        rowKey="name"
        size="middle"
        bordered
        loading={this.state.loading}
        columns={columns}
        dataSource={this.state.runs}
        scroll={{x: 1280}}
        pagination={getTablePaginationProps({...this.state.pagination, total: this.state.runCount || this.state.runs.length})}
        onChange={this.handleRunsTableChange}
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

  renderRunIndex(record: WecomOrganizationSyncRun, index: number) {
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

  renderDryRunDiffCounts(counts?: WecomOrganizationSyncDryRunDiffCounts) {
    return this.renderImpactCounts(counts?.toCreate, counts?.toUpdate, counts?.toSoftDisable);
  }

  renderDryRunPreviewModal() {
    const preview = this.state.dryRunPreview;
    const snapshot = preview?.snapshotStats || {};
    const sourceAlias = preview?.source?.corpAlias || "-";
    const diagnosticSummary = preview?.diagnostics?.safeSummary || preview?.diagnostics?.operatorAction || "";

    return (
      <Modal
        title="预览影响结果"
        open={this.state.dryRunPreviewModalOpen}
        onCancel={() => this.setState({dryRunPreviewModalOpen: false})}
        footer={<Button onClick={() => this.setState({dryRunPreviewModalOpen: false})}>关闭</Button>}
        width={720}
        destroyOnClose
      >
        <Spin spinning={this.state.dryRunPreviewLoading}>
          {this.state.dryRunPreviewError && (
            <Alert type="error" showIcon message={this.state.dryRunPreviewError} style={{marginBottom: 12}} />
          )}
          {!this.state.dryRunPreviewLoading && !this.state.dryRunPreviewError && !preview && (
            <Empty description="暂无预览结果" />
          )}
          {preview && (
            <Space direction="vertical" size={12} style={{width: "100%"}}>
              <Space wrap>
                {this.getDryRunStatusTag(preview.status)}
                <Text>{`来源：${sourceAlias}`}</Text>
                <Text type="secondary">
                  {`快照：部门 ${snapshot.departmentCount || 0} / 用户 ${snapshot.userCount || 0} / 关系 ${snapshot.relationshipCount || 0}`}
                </Text>
              </Space>
              {preview.historyWarning && (
                <Alert type="warning" showIcon message="历史记录未写入，但预览结果仍可用于本次判断。" />
              )}
              {diagnosticSummary && (
                <Alert type={preview.status === "failed" ? "error" : "info"} showIcon message={diagnosticSummary} />
              )}
              <Row gutter={[12, 12]}>
                <Col xs={24} md={8}>
                  <Space direction="vertical" size={2}>
                    <Text type="secondary">部门</Text>
                    {this.renderDryRunDiffCounts(preview.diff?.departments)}
                  </Space>
                </Col>
                <Col xs={24} md={8}>
                  <Space direction="vertical" size={2}>
                    <Text type="secondary">用户</Text>
                    {this.renderDryRunDiffCounts(preview.diff?.users)}
                  </Space>
                </Col>
                <Col xs={24} md={8}>
                  <Space direction="vertical" size={2}>
                    <Text type="secondary">关系</Text>
                    {this.renderDryRunDiffCounts(preview.diff?.relationships)}
                  </Space>
                </Col>
              </Row>
            </Space>
          )}
        </Spin>
      </Modal>
    );
  }

  renderDryRunHistoryModal() {
    const columns = [
      {
        title: "时间",
        dataIndex: "createdAt",
        key: "createdAt",
        width: 160,
        render: (text: string) => this.formatRunTime(text),
      },
      {
        title: "状态",
        dataIndex: "status",
        key: "status",
        width: 110,
        render: (status: string) => this.getDryRunStatusTag(status),
      },
      {
        title: "来源",
        dataIndex: "corpAlias",
        key: "corpAlias",
        width: 120,
        ellipsis: true,
      },
      {
        title: "影响",
        key: "impact",
        width: 180,
        render: (_: unknown, record: WecomOrganizationSyncDryRunHistory) => this.renderDryRunHistoryImpact(record),
      },
      {
        title: "摘要",
        dataIndex: "safeSummary",
        key: "safeSummary",
        ellipsis: true,
      },
      {
        title: "操作",
        key: "action",
        width: 100,
        render: (_: unknown, record: WecomOrganizationSyncDryRunHistory) => (
          <Button type="link" size="small" onClick={() => this.openDryRunHistoryDetail(record.name)}>
            查看详情
          </Button>
        ),
      },
    ];

    return (
      <Modal
        title="预览历史记录"
        open={this.state.dryRunHistoryModalOpen}
        onCancel={() => this.setState({dryRunHistoryModalOpen: false})}
        footer={<Button onClick={() => this.setState({dryRunHistoryModalOpen: false})}>关闭</Button>}
        width={860}
        destroyOnClose
      >
        <Space direction="vertical" size={12} style={{width: "100%"}}>
          <Button icon={<ReloadOutlined />} loading={this.state.dryRunHistoryLoading} onClick={() => this.refreshDryRunHistory()}>
            刷新历史
          </Button>
          {this.state.dryRunHistoryError && (
            <Alert type="error" showIcon message={this.state.dryRunHistoryError} />
          )}
          <Table
            rowKey={record => record.name || `${record.createdAt}-${record.corpAlias}`}
            size="middle"
            loading={this.state.dryRunHistoryLoading}
            columns={columns}
            dataSource={this.state.dryRunHistories}
            pagination={false}
            locale={{emptyText: <Empty description="暂无预览历史" />}}
          />
        </Space>
        {this.renderDryRunHistoryDetailModal()}
      </Modal>
    );
  }

  renderDryRunHistoryImpact(record: WecomOrganizationSyncDryRunHistory) {
    const created = (record.departmentToCreate || 0) + (record.userToCreate || 0) + (record.relationshipToCreate || 0);
    const updated = (record.departmentToUpdate || 0) + (record.userToUpdate || 0) + (record.relationshipToUpdate || 0);
    const disabled = (record.departmentToSoftDisable || 0) + (record.userToSoftDisable || 0) + (record.relationshipToSoftDisable || 0);
    return this.renderImpactCounts(created, updated, disabled);
  }

  renderDryRunHistoryDetailModal() {
    const detail = this.state.dryRunHistoryDetail;
    const safeSummary = detail?.safeSummary || "无摘要";
    return (
      <Modal
        title={this.state.dryRunHistoryDetailLoading ? "正在加载预览历史详情" : "预览历史详情"}
        open={this.state.dryRunHistoryDetailModalOpen}
        onCancel={() => this.setState({dryRunHistoryDetailModalOpen: false})}
        footer={<Button onClick={() => this.setState({dryRunHistoryDetailModalOpen: false})}>关闭</Button>}
        width={680}
        destroyOnClose
      >
        <Spin spinning={this.state.dryRunHistoryDetailLoading}>
          {this.state.dryRunHistoryDetailError && (
            <Alert type="error" showIcon message={this.state.dryRunHistoryDetailError} style={{marginBottom: 12}} />
          )}
          {!this.state.dryRunHistoryDetailLoading && !this.state.dryRunHistoryDetailError && !detail && (
            <Empty description="暂无预览历史详情" />
          )}
          {detail && (
            <Space direction="vertical" size={10} style={{width: "100%"}}>
              <Space wrap>
                {this.getDryRunStatusTag(detail.status)}
                <Text>{detail.diagnosticAlias || "none"}</Text>
                <Text type="secondary">{`来源：${detail.corpAlias || "-"}`}</Text>
              </Space>
              <Row gutter={[12, 12]}>
                <Col xs={24} md={8}>
                  <Text type="secondary">{`快照部门：${detail.snapshotDepartmentCount || 0}`}</Text>
                </Col>
                <Col xs={24} md={8}>
                  <Text type="secondary">{`快照用户：${detail.snapshotUserCount || 0}`}</Text>
                </Col>
                <Col xs={24} md={8}>
                  <Text type="secondary">{`快照关系：${detail.snapshotRelationshipCount || 0}`}</Text>
                </Col>
              </Row>
              <Text style={{display: "block", whiteSpace: "pre-wrap", wordBreak: "break-word"}}>
                {safeSummary}
              </Text>
              <Space wrap>
                <Text type="secondary">{`脱敏：${detail.redactionApplied ? "已应用" : "未标记"}`}</Text>
                <Text type="secondary">{`保留：${detail.retentionDays || 0} 天`}</Text>
              </Space>
            </Space>
          )}
        </Spin>
      </Modal>
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

  renderLoadingState() {
    return (
      <div className="organization-sync-page wecom-organization-sync-page">
        <OrganizationSyncPageHeader
          className="organization-sync-page-title"
          provider="wecom"
          title="企业微信组织架构同步"
          subtitle="配置通讯录同步并查看正式同步记录。"
        />
        <Text type="secondary">正在加载企业微信同步页面...</Text>
      </div>
    );
  }

  renderOrganizationSelector() {
    // 这里选择的是本页要配置的 aicodex-admin 组织，不是一个普通列表筛选条件。
    const isBuiltIn = this.state.organization === "built-in";
    return (
      <div className="organization-sync-target-selector">
        <Space style={{marginBottom: 8}}>
          <Text strong>同步目标组织</Text>
        </Space>
        <Space.Compact style={{width: "100%"}}>
          <OrganizationSelect
            initValue={this.state.organization}
            onChange={(organization: string) => this.changeOrganization(organization)}
            excludedOrganizations={["built-in", ...this.getExcludedSourceOrganizations()]}
            style={{minWidth: 280, width: "100%"}}
          />
          <Button icon={<PlusOutlined />} onClick={() => this.goToOrganizationList()}>
            新建组织
          </Button>
        </Space.Compact>
        <div style={{marginTop: 6}}>
          <Text type="secondary">
            选择要绑定企业微信通讯录的 aicodex-admin 组织。不同组织的 Corp ID、Secret 和同步记录互不混用。
          </Text>
        </div>
        {isBuiltIn && (
          <Alert
            style={{marginTop: 8}}
            type="warning"
            showIcon
            message="built-in 是系统管理组织，不承载企业微信通讯录数据。保存配置时会根据 Corp ID 自动切换到对应业务组织。"
          />
        )}
      </div>
    );
  }

  renderSourceConflictAlert() {
    if (!this.hasSourceConflict()) {
      return null;
    }
    const provider = this.state.sourceStatus.conflictingProvider || "另一通讯录来源";
    const organization = this.state.sourceStatus.conflictingOrganization || this.state.organization || "-";
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

  renderSyncOptions(config: WecomOrganizationSyncConfig) {
    const enableDisabled = this.hasSourceConflict();
    return (
      <div>
        <div style={{marginBottom: 8}}>同步选项</div>
        <Space direction="vertical" size={8}>
          <Space>
            <Switch checked={config.isEnabled} disabled={enableDisabled} onChange={checked => this.updateSyncEnabled(checked)} />
            <span>启用同步</span>
          </Space>
          <Space>
            <Switch checked={config.softDisableMissingData} onChange={checked => this.updateConfigField("softDisableMissingData", checked)} />
            <span>全量同步成功后软禁用缺失数据</span>
          </Space>
        </Space>
      </div>
    );
  }

  renderScheduleOptions(config: WecomOrganizationSyncConfig) {
    return (
      <div>
        <div style={{marginBottom: 8}}>定时同步</div>
        <Space direction="vertical" size={8} style={{width: "100%"}}>
          <Space>
            <Switch checked={config.scheduleEnabled} onChange={checked => this.updateConfigField("scheduleEnabled", checked)} />
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
    if (config === null) {
      return this.renderLoadingState();
    }

    const runRefreshHint = this.getRunRefreshHint();
    const hasRunningRuns = this.hasRunningRuns(this.state.runs);
    const hasSourceConflict = this.hasSourceConflict();
    const syncButtonLabel = hasRunningRuns ? "同步进行中" : "开始全量同步";

    return (
      <div className="organization-sync-page wecom-organization-sync-page">
        <OrganizationSyncPageHeader
          className="organization-sync-page-title"
          provider="wecom"
          title="企业微信组织架构同步"
          subtitle="配置通讯录同步并查看正式同步记录。"
        />

        <Row className="organization-sync-config-grid" gutter={[16, 16]}>
          <Col xs={24} md={12}>
            {this.renderOrganizationSelector()}
          </Col>
          <Col xs={0} md={12} />
          <Col xs={24} md={12}>
            <div style={{marginBottom: 8}}>App ID（Corp ID）</div>
            <Input
              {...credentialTextInputProps}
              name="wecom-organization-sync-corp-id"
              value={config.corpId}
              onChange={event => this.updateConfigField("corpId", event.target.value)}
            />
          </Col>
          <Col xs={24} md={12}>
            <div style={{marginBottom: 8}}>App Secret</div>
            <Input.Password
              {...credentialSecretInputProps}
              name="wecom-organization-sync-address-book-secret"
              value={config.addressBookSecret}
              onChange={event => this.updateConfigField("addressBookSecret", event.target.value)}
            />
          </Col>
          <Col xs={24} md={12}>
            {this.renderSyncOptions(config)}
          </Col>
          <Col xs={24} md={12}>
            {this.renderScheduleOptions(config)}
          </Col>
        </Row>

        {this.renderSourceConflictAlert()}

        <Alert
          style={{marginTop: 16}}
          type="info"
          showIcon
          message="通讯录读取权限要求"
          description="请填写 App Secret，并把应用可见范围设置为需要同步的部门和成员；通讯录同步 Secret 只适合写入或 ID 比对，读取详情时可能返回 48009。"
        />
        {this.renderTestResult()}

        <OrganizationSyncActionBar
          className="organization-sync-action-bar"
          actions={[
            {key: "save", label: String(i18next.t("general:Save")), icon: <SaveOutlined />, type: "primary", loading: this.state.saving, disabled: hasSourceConflict, onClick: () => this.saveConfig()},
            {key: "test", label: "测试连接", icon: <ToolOutlined />, loading: this.state.testing, onClick: () => this.testConfig()},
            {key: "dryRunPreview", label: "预览影响", icon: <FileSearchOutlined />, loading: this.state.dryRunPreviewLoading, disabled: !this.state.organization || !config.isEnabled, onClick: () => this.previewDryRun()},
            {key: "dryRunHistory", label: "预览历史", icon: <HistoryOutlined />, loading: this.state.dryRunHistoryLoading, disabled: !this.state.organization, onClick: () => this.openDryRunHistory()},
            {key: "sync", label: syncButtonLabel, icon: <PlayCircleOutlined />, loading: this.state.syncing, disabled: hasSourceConflict || !config.isEnabled || hasRunningRuns, onClick: () => this.startSync()},
          ]}
        />

        <Divider />
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
        {this.renderDryRunPreviewModal()}
        {this.renderDryRunHistoryModal()}
      </div>
    );
  }
}

export default WecomOrganizationSyncPage;
