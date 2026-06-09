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
import {Alert, Button, Col, Divider, Input, Row, Space, Switch, Table, Tag, Typography} from "antd";
import {CloudSyncOutlined, PlayCircleOutlined, PlusOutlined, ReloadOutlined, SaveOutlined, ToolOutlined} from "@ant-design/icons";
import * as Setting from "./Setting";
import * as WecomOrganizationSyncBackend from "./backend/WecomOrganizationSyncBackend";
import OrganizationSelect from "./common/select/OrganizationSelect";
import {getDefaultTablePagination, getTablePaginationProps} from "./common/table/TablePagination";
import i18next from "i18next";

const {Text} = Typography;
const syncRunPollIntervalMs = 3000;

class WecomOrganizationSyncPage extends React.Component {
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

    const organization = this.getAccountOrganization(this.props.account);
    if (organization) {
      this.changeOrganization(organization);
    }
  }

  getAccountOrganization(account) {
    // 管理页账号信息异步加载时可能先传入 owner 为空的占位对象，避免页面永久停留在空白态。
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

  refreshRuns(organization, options = {}) {
    if (!organization) {
      return Promise.resolve();
    }

    const {
      refreshConfig = false,
      pagination = this.state.pagination,
    } = options;
    const nextPagination = getDefaultTablePagination(pagination);

    this.clearRunRefreshTimer();
    this.setState({loading: true});

    const runsRequest = WecomOrganizationSyncBackend.getWecomOrganizationSyncRuns(organization, nextPagination.current, nextPagination.pageSize);
    const configRequest = refreshConfig
      ? WecomOrganizationSyncBackend.getWecomOrganizationSyncConfig(organization)
      : Promise.resolve(null);

    // 手动刷新和自动轮询默认只关心同步记录；只有整页初始化时才顺带刷新配置表单。
    return Promise.all([configRequest, runsRequest]).then(([configRes, runsRes]) => {
      if (configRes?.status === "error") {
        Setting.showMessage("error", configRes.msg);
      }
      if (runsRes.status === "error") {
        Setting.showMessage("error", runsRes.msg);
      }
      if (this.isUnmounted || this.state.organization !== organization) {
        return;
      }

      const nextState = {
        loading: false,
      };
      if (configRes !== null) {
        nextState.config = this.normalizeConfig(organization, configRes?.data?.config);
        nextState.testResult = null;
      }
      if (runsRes.status === "ok") {
        nextState.runs = runsRes.data || [];
        nextState.runCount = runsRes.data2 || 0;
        nextState.pagination = {
          ...nextPagination,
          total: runsRes.data2 || 0,
        };
        nextState.lastRunsRefreshAt = Setting.getFormattedDate(new Date().toISOString());
        nextState.runRefreshError = "";
      } else {
        nextState.runRefreshError = "同步记录刷新失败，请手动刷新重试。";
      }
      this.setState(nextState, () => this.syncRunRefreshLoop(organization, nextState.runs || this.state.runs));
    }).catch(error => {
      this.clearRunRefreshTimer();
      if (this.isUnmounted || this.state.organization !== organization) {
        return;
      }
      this.setState({
        loading: false,
        runRefreshError: "自动刷新已暂停，请手动刷新重试。",
      });
      Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
    });
  }

  refresh(organization) {
    if (!organization) {
      return;
    }
    this.refreshRuns(organization, {refreshConfig: true, pagination: getDefaultTablePagination()}).catch(() => {});
  }

  normalizeConfig(organization, config) {
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

  isDuplicateRunningStartError(message) {
    return typeof message === "string" && message.toLowerCase().includes("already running");
  }

  updateConfigField(key, value) {
    this.setState({
      config: {
        ...this.state.config,
        [key]: value,
      },
    });
  }

  changeOrganization(organization) {
    this.clearRunRefreshTimer();
    this.setState({
      organization,
      config: null,
      runs: [],
      runCount: 0,
      pagination: getDefaultTablePagination(),
    }, () => this.refresh(organization));
  }

  goToOrganizationList() {
    if (this.props.history?.push) {
      this.props.history.push("/organizations");
      return;
    }
    window.location.href = "/organizations";
  }

  saveConfig() {
    this.setState({saving: true});
    WecomOrganizationSyncBackend.saveWecomOrganizationSyncConfig(this.state.config)
      .then(res => {
        if (res.status === "ok") {
          const previousOrganization = this.state.organization;
          const resolvedOrganization = res.data?.config?.organization || res.data?.organization || previousOrganization;
          const nextConfig = this.normalizeConfig(resolvedOrganization, res.data?.config);
          this.setState({
            saving: false,
            organization: resolvedOrganization,
            config: nextConfig,
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
          this.setState({testResult: res.data});
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

  getStatusTag(status) {
    const colorMap = {
      running: "processing",
      succeeded: "success",
      failed: "error",
      partial: "warning",
    };
    const labelMap = {
      running: "运行中",
      succeeded: "成功",
      failed: "失败",
      partial: "部分成功",
    };
    return <Tag color={colorMap[status] || "default"}>{labelMap[status] || status || "-"}</Tag>;
  }

  getTriggerTag(triggerType) {
    const colorMap = {
      manual: "blue",
      scheduled: "cyan",
      callback: "purple",
    };
    const labelMap = {
      manual: "手动",
      scheduled: "定时",
      callback: "回调",
    };
    return <Tag color={colorMap[triggerType] || "default"}>{labelMap[triggerType] || triggerType || "-"}</Tag>;
  }

  getStageText(stage, status) {
    if (status === "succeeded") {
      return "已完成";
    }

    const labelMap = {
      fetching: "拉取数据",
      fetch: "拉取数据",
      planning: "计算差异",
      applying: "应用变更",
      finalizing: "收尾处理",
    };
    return labelMap[stage] || stage || "-";
  }

  formatRunTime(text) {
    // 运行中的记录还没有结束时间，后端零值时间不应被当成真实时间展示。
    if (!text || String(text).startsWith("0001-01-01")) {
      return "-";
    }
    return Setting.getFormattedDate(text);
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
        title: "运行 ID",
        dataIndex: "name",
        key: "name",
        width: 210,
        ellipsis: true,
      },
      {
        title: "状态",
        dataIndex: "status",
        key: "status",
        width: 120,
        render: status => this.getStatusTag(status),
      },
      {
        title: "触发方式",
        dataIndex: "triggerType",
        key: "triggerType",
        width: 110,
        render: triggerType => this.getTriggerTag(triggerType),
      },
      {
        title: "阶段",
        dataIndex: "stage",
        key: "stage",
        width: 120,
        // 成功记录显示“已完成”；失败或部分成功保留最后阶段，便于定位卡在哪一步。
        render: (stage, record) => this.getStageText(stage, record.status),
      },
      {
        title: "执行人",
        dataIndex: "actor",
        key: "actor",
        width: 120,
      },
      {
        title: "开始时间",
        dataIndex: "startedAt",
        key: "startedAt",
        width: 180,
        render: text => this.formatRunTime(text),
      },
      {
        title: "结束时间",
        dataIndex: "finishedAt",
        key: "finishedAt",
        width: 180,
        render: text => this.formatRunTime(text),
      },
      {
        title: "部门（新增 / 更新 / 禁用）",
        key: "departments",
        width: 180,
        render: (_, record) => `新 ${record.departmentCreatedCount || 0} / 更 ${record.departmentUpdatedCount || 0} / 禁 ${record.departmentDisabledCount || 0}`,
      },
      {
        title: "用户（新增 / 更新 / 禁用）",
        key: "users",
        width: 180,
        render: (_, record) => `新 ${record.userCreatedCount || 0} / 更 ${record.userUpdatedCount || 0} / 禁 ${record.userDisabledCount || 0}`,
      },
      {
        title: "错误摘要",
        dataIndex: "errorText",
        key: "errorText",
        ellipsis: true,
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
        scroll={{x: 1420}}
        pagination={getTablePaginationProps({...this.state.pagination, total: this.state.runCount || this.state.runs.length})}
        onChange={this.handleRunsTableChange}
      />
    );
  }

  getRunRefreshHint() {
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
      <div>
        <Space style={{marginBottom: 16}}>
          <CloudSyncOutlined />
          <Text strong>企业微信组织架构同步</Text>
        </Space>
        <Text type="secondary">正在加载企业微信同步页面...</Text>
      </div>
    );
  }

  renderOrganizationSelector() {
    // 这里选择的是本页要配置的 aicodex-admin 组织，不是一个普通列表筛选条件。
    const isBuiltIn = this.state.organization === "built-in";
    return (
      <div>
        <Space style={{marginBottom: 8}}>
          <Text strong>同步目标组织</Text>
        </Space>
        <Space.Compact style={{width: "100%"}}>
          <OrganizationSelect
            initValue={this.state.organization}
            onChange={organization => this.changeOrganization(organization)}
            excludedOrganizations={["built-in"]}
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

  renderSyncOptions(config) {
    return (
      <div>
        <div style={{marginBottom: 8}}>同步选项</div>
        <Space direction="vertical" size={8}>
          <Space>
            <Switch checked={config.isEnabled} onChange={checked => this.updateConfigField("isEnabled", checked)} />
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

  renderScheduleOptions(config) {
    return (
      <div>
        <div style={{marginBottom: 8}}>定时同步</div>
        <Space direction="vertical" size={8} style={{width: "100%"}}>
          <Space>
            <Switch checked={config.scheduleEnabled} onChange={checked => this.updateConfigField("scheduleEnabled", checked)} />
            <span>启用定时同步</span>
          </Space>
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
        </Space>
      </div>
    );
  }

  handleRunsTableChange = (pagination) => {
    this.refreshRuns(this.state.organization, {
      pagination: {
        ...this.state.pagination,
        current: pagination.current,
        pageSize: pagination.pageSize,
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
    const syncButtonLabel = hasRunningRuns ? "同步进行中" : "开始全量同步";

    return (
      <div>
        <Space style={{marginBottom: 16}}>
          <CloudSyncOutlined />
          <Text strong>企业微信组织架构同步</Text>
        </Space>

        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            {this.renderOrganizationSelector()}
          </Col>
          <Col xs={24} md={12}>
            <div style={{marginBottom: 8}}>企业 ID（Corp ID）</div>
            <Input value={config.corpId} onChange={event => this.updateConfigField("corpId", event.target.value)} />
          </Col>
          <Col xs={24} md={12}>
            <div style={{marginBottom: 8}}>自建应用 Secret</div>
            <Input.Password value={config.addressBookSecret} onChange={event => this.updateConfigField("addressBookSecret", event.target.value)} />
          </Col>
          <Col xs={24} md={12}>
            {this.renderSyncOptions(config)}
          </Col>
          <Col xs={24} md={12}>
            {this.renderScheduleOptions(config)}
          </Col>
        </Row>

        <Alert
          style={{marginTop: 16}}
          type="info"
          showIcon
          message="通讯录读取权限要求"
          description="请填写自建应用 Secret，并把应用可见范围设置为需要同步的部门和成员；通讯录同步 Secret 只适合写入或 ID 比对，读取详情时可能返回 48009。"
        />
        {this.renderTestResult()}

        <Space style={{marginTop: 16}}>
          <Button icon={<SaveOutlined />} type="primary" loading={this.state.saving} onClick={() => this.saveConfig()}>
            {i18next.t("general:Save")}
          </Button>
          <Button icon={<ToolOutlined />} loading={this.state.testing} onClick={() => this.testConfig()}>
            测试连接
          </Button>
          <Button
            icon={<PlayCircleOutlined />}
            loading={this.state.syncing}
            onClick={() => this.startSync()}
            disabled={!config.isEnabled || hasRunningRuns}
          >
            {syncButtonLabel}
          </Button>
        </Space>

        <Divider />
        <Row align="middle" justify="space-between" style={{marginBottom: 12}}>
          <Col>
            <Space direction="vertical" size={2}>
              <Text strong>同步记录</Text>
              <Text type={runRefreshHint.type}>{runRefreshHint.text}</Text>
            </Space>
          </Col>
          <Col>
            <Button
              icon={<ReloadOutlined />}
              loading={this.state.loading}
              onClick={() => this.refreshRuns(this.state.organization).catch(() => {})}
            >
              刷新
            </Button>
          </Col>
        </Row>
        {this.renderRuns()}
      </div>
    );
  }
}

export default WecomOrganizationSyncPage;
