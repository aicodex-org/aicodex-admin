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
import {CloudSyncOutlined, PlayCircleOutlined, PlusOutlined, SaveOutlined, ToolOutlined} from "@ant-design/icons";
import * as Setting from "./Setting";
import * as WecomOrganizationSyncBackend from "./backend/WecomOrganizationSyncBackend";
import OrganizationSelect from "./common/select/OrganizationSelect";
import i18next from "i18next";

const {Text} = Typography;

class WecomOrganizationSyncPage extends React.Component {
  constructor(props) {
    super(props);
    const organization = this.getAccountOrganization(props.account);
    this.state = {
      organization,
      config: null,
      runs: [],
      runCount: 0,
      loading: false,
      saving: false,
      testing: false,
      syncing: false,
      testResult: null,
    };
  }

  componentDidMount() {
    this.refresh(this.state.organization);
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

  refresh(organization) {
    if (!organization) {
      return;
    }
    this.setState({loading: true});
    Promise.all([
      WecomOrganizationSyncBackend.getWecomOrganizationSyncConfig(organization),
      WecomOrganizationSyncBackend.getWecomOrganizationSyncRuns(organization, 1, 10),
    ]).then(([configRes, runsRes]) => {
      if (configRes.status === "error") {
        Setting.showMessage("error", configRes.msg);
      }
      if (runsRes.status === "error") {
        Setting.showMessage("error", runsRes.msg);
      }
      this.setState({
        config: this.normalizeConfig(organization, configRes.data?.config),
        runs: runsRes.data || [],
        runCount: runsRes.data2 || 0,
        testResult: null,
        loading: false,
      });
    }).catch(error => {
      this.setState({config: this.normalizeConfig(organization, null), loading: false});
      Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
    });
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
      ...(config || {}),
    };
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
    this.setState({organization, config: null, runs: [], runCount: 0}, () => this.refresh(organization));
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

  getStageText(stage) {
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
        title: i18next.t("general:Status"),
        dataIndex: "status",
        key: "status",
        width: 120,
        render: status => this.getStatusTag(status),
      },
      {
        title: "阶段",
        dataIndex: "stage",
        key: "stage",
        width: 120,
        render: stage => this.getStageText(stage),
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
        title: "部门",
        key: "departments",
        width: 130,
        render: (_, record) => `${record.departmentCreatedCount || 0}/${record.departmentUpdatedCount || 0}/${record.departmentDisabledCount || 0}`,
      },
      {
        title: "用户",
        key: "users",
        width: 130,
        render: (_, record) => `${record.userCreatedCount || 0}/${record.userUpdatedCount || 0}/${record.userDisabledCount || 0}`,
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
        scroll={{x: 1300}}
        pagination={{pageSize: 10, total: this.state.runCount || this.state.runs.length}}
      />
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
          {isBuiltIn ? (
            // built-in 不在业务组织下拉中；这里用只读输入避免下拉组件自动切到空组织后触发刷新循环。
            <Input value="保存后按 Corp ID 自动创建或切换业务组织" disabled style={{minWidth: 280, width: "100%"}} />
          ) : (
            <OrganizationSelect
              initValue={this.state.organization}
              onChange={organization => this.changeOrganization(organization)}
              excludedOrganizations={["built-in"]}
              style={{minWidth: 280, width: "100%"}}
            />
          )}
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

  render() {
    const config = this.state.config;
    if (config === null) {
      return null;
    }

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
          <Button icon={<PlayCircleOutlined />} loading={this.state.syncing} onClick={() => this.startSync()} disabled={!config.isEnabled}>
            开始全量同步
          </Button>
        </Space>

        <Divider />
        <Row align="middle" justify="space-between" style={{marginBottom: 12}}>
          <Col><Text strong>同步记录</Text></Col>
          <Col><Text type="secondary">新增 / 更新 / 禁用</Text></Col>
        </Row>
        {this.renderRuns()}
      </div>
    );
  }
}

export default WecomOrganizationSyncPage;
