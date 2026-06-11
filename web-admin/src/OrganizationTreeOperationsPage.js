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
import {Alert, Button, Card, Col, Descriptions, Drawer, Empty, Input, Row, Segmented, Select, Space, Table, Tag, Tooltip, Tree, Typography} from "antd";
import {ReloadOutlined, SyncOutlined, TeamOutlined, ToolOutlined} from "@ant-design/icons";
import * as Setting from "./Setting";
import * as OrganizationTreeOperationsBackend from "./backend/OrganizationTreeOperationsBackend";
import OrganizationSelect from "./common/select/OrganizationSelect";
import i18next from "i18next";

const {Text, Title} = Typography;
const {Search} = Input;
const triggerRefreshStatus = "refresh_status";
const triggerRefreshReadModel = "refresh_read_model";

const lifecycleStatusLabels = {
  active: "正常",
  disabled: "已停用",
  deleted: "已删除",
  conflicted: "冲突",
  unknown: "未知",
};

const freshnessLabels = {
  current: "当前",
  fresh: "新鲜",
  stale: "陈旧",
  expired: "过期",
  unknown: "未知",
  unavailable: "不可用",
};

const emptyTreeClassLabels = {
  business_empty: "业务空树",
  test_data_gap: "测试数据缺口",
  untrusted_read_model: "不可信数据",
};

function renderText(value) {
  return value || "-";
}

function compactIdentifier(value, head = 18, tail = 8) {
  if (!value) {
    return "-";
  }
  const text = String(value);
  if (text.length <= head + tail + 3) {
    return text;
  }
  return `${text.slice(0, head)}...${text.slice(-tail)}`;
}

function renderCompactIdentifier(value, options = {}) {
  if (!value) {
    return "-";
  }
  const text = String(value);
  return (
    <Tooltip title={text}>
      <Text
        copyable={options.copyable ? {text} : false}
        style={{display: "inline-block", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", verticalAlign: "bottom"}}
      >
        {compactIdentifier(text, options.head, options.tail)}
      </Text>
    </Tooltip>
  );
}

function renderStatusTag(value, labels = {}) {
  if (!value) {
    return <Tag>-</Tag>;
  }
  const normalized = String(value).toLowerCase();
  const color = normalized === "ok" || normalized === "active" || normalized === "current" || normalized === "fresh" || normalized === "accepted"
    ? "green"
    : normalized === "stale" || normalized === "running" || normalized === "test_data_gap"
      ? "orange"
      : normalized === "business_empty"
        ? "blue"
        : "red";
  return <Tag color={color}>{labels[value] || labels[normalized] || value}</Tag>;
}

function renderTime(value) {
  return value ? Setting.getFormattedDate(value) : "-";
}

class OrganizationTreeOperationsPage extends React.Component {
  constructor(props) {
    super(props);
    const organization = this.getAccountOrganization(props.account);
    this.state = {
      organization,
      diagnostics: null,
      loading: false,
      refreshingStatus: false,
      refreshingReadModel: false,
      lastError: "",
      filters: {
        query: "",
        lifecycleStatus: "",
        sourceConnectionStatus: "",
        freshness: "",
        readModelSource: "",
      },
      nodeViewMode: "tree",
      selectedNode: null,
      selectedMemberDepartment: null,
      memberLoading: false,
      memberPage: 1,
      memberPageSize: 10,
      memberTotal: 0,
      members: [],
      selectedMember: null,
    };
  }

  componentDidMount() {
    this.refreshDiagnostics();
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

  changeOrganization(organization) {
    this.setState({
      organization,
      diagnostics: null,
      selectedNode: null,
      lastError: "",
      filters: {
        query: "",
        lifecycleStatus: "",
        sourceConnectionStatus: "",
        freshness: "",
        readModelSource: "",
      },
      nodeViewMode: "tree",
      selectedMemberDepartment: null,
      memberLoading: false,
      memberPage: 1,
      memberPageSize: 10,
      memberTotal: 0,
      members: [],
      selectedMember: null,
    }, () => this.refreshDiagnostics());
  }

  updateFilter(key, value) {
    this.setState({
      filters: {
        ...this.state.filters,
        [key]: value || "",
      },
    });
  }

  refreshDiagnostics(options = {}) {
    const organization = this.state.organization;
    if (!organization) {
      return Promise.resolve();
    }
    const filters = options.filters || this.state.filters;
    this.setState({loading: true});
    return OrganizationTreeOperationsBackend.getOrganizationTreeOperationsDiagnostics(organization, filters).then(res => {
      if (res.status === "error") {
        Setting.showMessage("error", res.msg);
      }
      this.setState({
        loading: false,
        diagnostics: res.status === "ok" ? res.data : null,
        lastError: res.status === "ok" ? "" : (res.msg || "诊断接口返回错误"),
      });
    }).catch(error => {
      this.setState({loading: false, lastError: String(error)});
      Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
    });
  }

  applySearch(query) {
    const filters = {
      ...this.state.filters,
      query,
    };
    this.setState({filters}, () => this.refreshDiagnostics({filters}));
  }

  triggerRefresh(triggerType) {
    const organization = this.state.organization;
    if (!organization) {
      return Promise.resolve();
    }
    const loadingKey = triggerType === triggerRefreshReadModel ? "refreshingReadModel" : "refreshingStatus";
    this.setState({[loadingKey]: true});
    return OrganizationTreeOperationsBackend.refreshOrganizationTreeOperations(organization, triggerType).then(res => {
      if (res.status === "error") {
        Setting.showMessage("error", res.msg);
      }
      const payload = res.data || {};
      if (res.status === "ok" && payload.status) {
        Setting.showMessage(payload.status === "error" ? "error" : "success", `刷新状态：${payload.status}`);
      }
      this.setState({
        [loadingKey]: false,
        diagnostics: payload.diagnostics || this.state.diagnostics,
        lastError: res.status === "ok" ? "" : (res.msg || "刷新动作返回错误"),
      }, () => {
        if (!payload.diagnostics) {
          this.refreshDiagnostics();
        }
      });
    }).catch(error => {
      this.setState({[loadingKey]: false, lastError: String(error)});
      Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
    });
  }

  loadDepartmentMembers(departmentId, page = 1, pageSize = this.state.memberPageSize) {
    const organization = this.state.organization;
    if (!organization || !departmentId) {
      return Promise.resolve();
    }
    this.setState({
      memberLoading: true,
      selectedMemberDepartment: departmentId,
      selectedMember: null,
    });
    return OrganizationTreeOperationsBackend.getOrganizationTreeOperationsMembers(organization, departmentId, page, pageSize).then(res => {
      if (res.status === "error") {
        Setting.showMessage("error", res.msg);
      }
      const payload = res.data || {};
      this.setState({
        memberLoading: false,
        members: res.status === "ok" ? (payload.members || []) : [],
        memberPage: res.status === "ok" ? (payload.page || page) : page,
        memberPageSize: res.status === "ok" ? (payload.pageSize || pageSize) : pageSize,
        memberTotal: res.status === "ok" ? (payload.total || 0) : 0,
      });
    }).catch(error => {
      this.setState({memberLoading: false, members: [], memberTotal: 0});
      Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
    });
  }

  selectNode(node) {
    if (this.state.nodeViewMode === "members") {
      return this.loadDepartmentMembers(node.departmentId, 1, this.state.memberPageSize);
    }
    this.setState({selectedNode: node, selectedMember: null});
    return Promise.resolve();
  }

  getSummaryCards() {
    const summary = this.state.diagnostics?.summary || {};
    const source = this.state.diagnostics?.sourceConnections || [];
    const latestSyncBatch = this.state.diagnostics?.latestSyncBatch;
    const version = summary.orgVersion || summary.scopeVersion;
    return [
      {title: "可见节点", value: summary.visibleNodeCount ?? 0, extra: `平台部门 ${summary.totalPlatformDepartmentCount ?? 0}`},
      {title: "诊断项", value: summary.diagnosticItemCount ?? 0, extra: renderText(this.state.diagnostics?.emptyTreeClass ? emptyTreeClassLabels[this.state.diagnostics.emptyTreeClass] || this.state.diagnostics.emptyTreeClass : "")},
      {
        title: "版本",
        value: renderCompactIdentifier(version, {copyable: true, head: 14, tail: 8}),
        extra: summary.scopeVersion ? (
          <Space direction="vertical" size={0} style={{maxWidth: "100%"}}>
            <Text type="secondary">scope</Text>
            {renderCompactIdentifier(summary.scopeVersion, {copyable: true, head: 12, tail: 8})}
          </Space>
        ) : "-",
      },
      {title: "新鲜度", value: renderText(summary.freshness), extra: `生成 ${renderTime(summary.generatedAt)}`},
      {title: "来源连接", value: source.length, extra: latestSyncBatch ? `最近批次 ${latestSyncBatch.status || "-"}` : "无最近批次"},
    ];
  }

  getNodeColumns() {
    return [
      {title: "部门", dataIndex: "departmentName", key: "departmentName", render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Button type="link" style={{padding: 0}} onClick={() => this.setState({selectedNode: record})}>{renderText(text)}</Button>
          <Text type="secondary">{record.departmentPath || record.departmentId}</Text>
        </Space>
      )},
      {title: "生命周期", dataIndex: "lifecycleStatus", key: "lifecycleStatus", width: 120, render: value => renderStatusTag(value, lifecycleStatusLabels)},
      {title: "来源", dataIndex: "sourceType", key: "sourceType", width: 120, render: renderText},
      {title: "连接状态", dataIndex: "sourceConnectionStatus", key: "sourceConnectionStatus", width: 130, render: renderStatusTag},
      {title: "新鲜度", dataIndex: "sourceConnectionFreshness", key: "sourceConnectionFreshness", width: 120, render: value => renderStatusTag(value, freshnessLabels)},
      {title: "可见来源", dataIndex: "visibilitySource", key: "visibilitySource", width: 150, render: renderText},
      {title: "readModelSource", dataIndex: "readModelSource", key: "readModelSource", width: 180, render: renderText},
    ];
  }

  getDiagnosticColumns() {
    return [
      {title: "对象", dataIndex: "displayName", key: "displayName", render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Text>{renderText(text || record.subjectId)}</Text>
          <Text type="secondary">{record.subjectType}:{record.subjectId}</Text>
        </Space>
      )},
      {title: "原因", dataIndex: "reason", key: "reason", render: renderText},
      {title: "生命周期", dataIndex: "lifecycleStatus", key: "lifecycleStatus", width: 120, render: value => renderStatusTag(value, lifecycleStatusLabels)},
      {title: "映射状态", dataIndex: "mappingStatus", key: "mappingStatus", width: 130, render: renderText},
      {title: "来源", dataIndex: "sourceType", key: "sourceType", width: 120, render: renderText},
      {title: "新鲜度", dataIndex: "freshness", key: "freshness", width: 120, render: value => renderStatusTag(value, freshnessLabels)},
    ];
  }

  getMemberColumns() {
    return [
      {title: "成员", dataIndex: "displayName", key: "displayName", render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Button type="link" style={{padding: 0}} onClick={() => this.setState({selectedMember: record, selectedNode: null})}>{renderText(text)}</Button>
          <Text type="secondary">{renderCompactIdentifier(record.departmentId, {head: 16, tail: 8})}</Text>
        </Space>
      )},
      {title: "生命周期", dataIndex: "lifecycleStatus", key: "lifecycleStatus", width: 120, render: value => renderStatusTag(value, lifecycleStatusLabels)},
      {title: "映射状态", dataIndex: "mappingStatus", key: "mappingStatus", width: 120, render: renderText},
      {title: "来源", dataIndex: "sourceType", key: "sourceType", width: 110, render: renderText},
      {title: "新鲜度", dataIndex: "freshness", key: "freshness", width: 120, render: value => renderStatusTag(value, freshnessLabels)},
      {title: "原因", dataIndex: "reason", key: "reason", render: renderText},
    ];
  }

  buildTreeData(nodes = []) {
    const records = new Map();
    nodes.forEach(node => {
      records.set(node.departmentId, {
        key: node.departmentId,
        title: this.renderTreeNodeTitle(node),
        children: [],
      });
    });

    const roots = [];
    nodes.forEach(node => {
      const treeNode = records.get(node.departmentId);
      const parent = records.get(node.parentDepartmentId);
      if (parent && parent !== treeNode) {
        parent.children.push(treeNode);
      } else {
        roots.push(treeNode);
      }
    });
    return roots;
  }

  renderTreeNodeTitle(node) {
    const memberSummary = node.memberSummary || {};
    const issueCount = (memberSummary.conflictedMemberCount || 0) + (memberSummary.mappingIssueCount || 0) + (memberSummary.staleMemberCount || 0);
    return (
      <Space wrap size={8}>
        <Button type="link" style={{padding: 0, height: "auto"}} onClick={() => this.selectNode(node)}>
          {renderText(node.departmentName)}
        </Button>
        {renderStatusTag(node.lifecycleStatus, lifecycleStatusLabels)}
        {renderStatusTag(node.sourceConnectionFreshness, freshnessLabels)}
        {this.state.nodeViewMode === "members" ? (
          <>
            <Tag icon={<TeamOutlined />}>成员 {memberSummary.memberCount || 0}</Tag>
            <Tag color={issueCount > 0 ? "orange" : "default"}>异常 {issueCount}</Tag>
          </>
        ) : null}
        <Text type="secondary">{renderText(node.readModelSource)}</Text>
      </Space>
    );
  }

  renderFilters() {
    const filters = this.state.filters;
    return (
      <Space wrap style={{marginBottom: 16}}>
        <Search
          allowClear
          placeholder="搜索稳定部门 ID、名称或路径"
          style={{width: 260}}
          value={filters.query}
          onChange={event => this.updateFilter("query", event.target.value)}
          onSearch={value => this.applySearch(value)}
        />
        <Select
          allowClear
          placeholder="生命周期"
          style={{width: 140}}
          value={filters.lifecycleStatus || undefined}
          onChange={value => this.updateFilter("lifecycleStatus", value)}
          options={["active", "disabled", "deleted", "conflicted", "unknown"].map(value => Setting.getOption(lifecycleStatusLabels[value], value))}
        />
        <Select
          allowClear
          placeholder="连接状态"
          style={{width: 140}}
          value={filters.sourceConnectionStatus || undefined}
          onChange={value => this.updateFilter("sourceConnectionStatus", value)}
          options={["ACTIVE", "STALE", "DISABLED", "ERROR"].map(value => Setting.getOption(value, value))}
        />
        <Select
          allowClear
          placeholder="新鲜度"
          style={{width: 120}}
          value={filters.freshness || undefined}
          onChange={value => this.updateFilter("freshness", value)}
          options={["current", "stale", "expired", "unknown"].map(value => Setting.getOption(freshnessLabels[value], value))}
        />
        <Button icon={<ReloadOutlined />} onClick={() => this.refreshDiagnostics()} loading={this.state.loading}>查询</Button>
      </Space>
    );
  }

  renderNodeTree() {
    const nodes = this.state.diagnostics?.nodes || [];
    if (nodes.length === 0) {
      return <Empty description="当前筛选下无可见组织树节点" />;
    }
    return (
      <Tree
        blockNode
        showLine
        treeData={this.buildTreeData(nodes)}
        defaultExpandedKeys={nodes.slice(0, 3).map(node => node.departmentId)}
      />
    );
  }

  renderMemberView() {
    const nodes = this.state.diagnostics?.nodes || [];
    if (nodes.length === 0) {
      return <Empty description="当前筛选下无可见组织树节点" />;
    }
    return (
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10} xl={8}>
          <Tree
            blockNode
            showLine
            treeData={this.buildTreeData(nodes)}
            defaultExpandedKeys={nodes.slice(0, 3).map(node => node.departmentId)}
          />
        </Col>
        <Col xs={24} lg={14} xl={16}>
          {this.state.selectedMemberDepartment ? (
            <Table
              size="small"
              rowKey={record => record.stableSubjectId}
              loading={this.state.memberLoading}
              dataSource={this.state.members}
              columns={this.getMemberColumns()}
              locale={{emptyText: <Empty description="该部门暂无成员诊断数据" />}}
              pagination={{
                current: this.state.memberPage,
                pageSize: this.state.memberPageSize,
                total: this.state.memberTotal,
                showSizeChanger: true,
                onChange: (page, pageSize) => this.loadDepartmentMembers(this.state.selectedMemberDepartment, page, pageSize),
              }}
            />
          ) : <Empty description="选择部门查看成员诊断" />}
        </Col>
      </Row>
    );
  }

  renderSummary() {
    const diagnostics = this.state.diagnostics;
    return (
      <>
        {diagnostics?.status && diagnostics.status !== "ok" ? (
          <Alert
            style={{marginBottom: 16}}
            type="warning"
            showIcon
            message="组织树当前未通过可信校验"
            description={diagnostics.reason || "请查看诊断项和来源连接状态。"}
          />
        ) : null}
        {diagnostics?.emptyTreeClass ? (
          <Alert
            style={{marginBottom: 16}}
            type={diagnostics.emptyTreeClass === "business_empty" ? "info" : "warning"}
            showIcon
            message={emptyTreeClassLabels[diagnostics.emptyTreeClass] || diagnostics.emptyTreeClass}
            description={diagnostics.reason || "空树仅表示当前可管理范围为空，不代表组织树能力通过。"}
          />
        ) : null}
        <Row gutter={[16, 16]} style={{marginBottom: 16}}>
          {this.getSummaryCards().map(item => (
            <Col xs={24} sm={12} lg={8} xl={4} key={item.title}>
              <Card size="small" bodyStyle={{minHeight: 108}}>
                <Text type="secondary">{item.title}</Text>
                <Title level={4} style={{margin: "8px 0 4px", maxWidth: "100%"}}>{item.value}</Title>
                {typeof item.extra === "string" ? <Text type="secondary">{item.extra}</Text> : item.extra}
              </Card>
            </Col>
          ))}
        </Row>
      </>
    );
  }

  renderSourceConnections() {
    const diagnostics = this.state.diagnostics;
    return (
      <Card title="来源与批次" size="small" style={{marginBottom: 16}}>
        <Descriptions size="small" column={2}>
          <Descriptions.Item label="readModelSource">{renderText(diagnostics?.summary?.readModelSource)}</Descriptions.Item>
          <Descriptions.Item label="generatedAt">{renderTime(diagnostics?.summary?.generatedAt)}</Descriptions.Item>
          <Descriptions.Item label="orgVersion">{renderCompactIdentifier(diagnostics?.summary?.orgVersion, {copyable: true, head: 28, tail: 12})}</Descriptions.Item>
          <Descriptions.Item label="scopeVersion">{renderCompactIdentifier(diagnostics?.summary?.scopeVersion, {copyable: true, head: 28, tail: 12})}</Descriptions.Item>
          <Descriptions.Item label="latestBatch">{renderCompactIdentifier(diagnostics?.latestSyncBatch?.batchId, {copyable: true, head: 28, tail: 12})}</Descriptions.Item>
          <Descriptions.Item label="batchStatus">{renderText(diagnostics?.latestSyncBatch?.status)}</Descriptions.Item>
        </Descriptions>
        <Table
          style={{marginTop: 12}}
          size="small"
          rowKey={record => record.sourceConnectionId || record.sourceType}
          pagination={false}
          dataSource={diagnostics?.sourceConnections || []}
          columns={[
            {title: "连接", dataIndex: "sourceConnectionId", key: "sourceConnectionId", render: value => renderCompactIdentifier(value, {copyable: true, head: 28, tail: 12})},
            {title: "类型", dataIndex: "sourceType", key: "sourceType", width: 120, render: renderText},
            {title: "状态", dataIndex: "status", key: "status", width: 120, render: renderStatusTag},
            {title: "新鲜度", dataIndex: "freshness", key: "freshness", width: 120, render: value => renderStatusTag(value, freshnessLabels)},
            {title: "已配置", dataIndex: "configured", key: "configured", width: 100, render: value => value ? <Tag color="green">是</Tag> : <Tag>否</Tag>},
            {title: "最近批次", dataIndex: "lastSeenBatchId", key: "lastSeenBatchId", render: value => renderCompactIdentifier(value, {copyable: true, head: 28, tail: 12})},
          ]}
        />
      </Card>
    );
  }

  renderDetailDrawer() {
    const member = this.state.selectedMember;
    if (member) {
      return (
        <Drawer
          title="成员详情"
          width={560}
          open={!!member}
          onClose={() => this.setState({selectedMember: null})}
        >
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="stableSubjectId">{renderText(member.stableSubjectId)}</Descriptions.Item>
            <Descriptions.Item label="displayName">{renderText(member.displayName)}</Descriptions.Item>
            <Descriptions.Item label="departmentId">{renderText(member.departmentId)}</Descriptions.Item>
            <Descriptions.Item label="lifecycleStatus">{renderStatusTag(member.lifecycleStatus, lifecycleStatusLabels)}</Descriptions.Item>
            <Descriptions.Item label="mappingStatus">{renderText(member.mappingStatus)}</Descriptions.Item>
            <Descriptions.Item label="sourceType">{renderText(member.sourceType)}</Descriptions.Item>
            <Descriptions.Item label="sourceConnectionId">{renderText(member.sourceConnectionId)}</Descriptions.Item>
            <Descriptions.Item label="readModelSource">{renderText(member.readModelSource)}</Descriptions.Item>
            <Descriptions.Item label="freshness">{renderStatusTag(member.freshness, freshnessLabels)}</Descriptions.Item>
            <Descriptions.Item label="reason">{renderText(member.reason)}</Descriptions.Item>
            <Descriptions.Item label="lastSeenBatchId">{renderText(member.lineage?.lastSeenBatchId)}</Descriptions.Item>
            <Descriptions.Item label="lineageDigest">{renderText(member.lineage?.digest)}</Descriptions.Item>
          </Descriptions>
        </Drawer>
      );
    }
    const node = this.state.selectedNode;
    return (
      <Drawer
        title="节点详情"
        width={520}
        open={!!node}
        onClose={() => this.setState({selectedNode: null})}
      >
        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label="departmentId">{renderText(node?.departmentId)}</Descriptions.Item>
          <Descriptions.Item label="departmentName">{renderText(node?.departmentName)}</Descriptions.Item>
          <Descriptions.Item label="parentDepartmentId">{renderText(node?.parentDepartmentId)}</Descriptions.Item>
          <Descriptions.Item label="departmentPath">{renderText(node?.departmentPath)}</Descriptions.Item>
          <Descriptions.Item label="lifecycleStatus">{renderStatusTag(node?.lifecycleStatus, lifecycleStatusLabels)}</Descriptions.Item>
          <Descriptions.Item label="sourceType">{renderText(node?.sourceType)}</Descriptions.Item>
          <Descriptions.Item label="sourceConnectionId">{renderText(node?.sourceConnectionId)}</Descriptions.Item>
          <Descriptions.Item label="sourceConnectionStatus">{renderStatusTag(node?.sourceConnectionStatus)}</Descriptions.Item>
          <Descriptions.Item label="sourceConnectionFreshness">{renderStatusTag(node?.sourceConnectionFreshness, freshnessLabels)}</Descriptions.Item>
          <Descriptions.Item label="visibilitySource">{renderText(node?.visibilitySource)}</Descriptions.Item>
          <Descriptions.Item label="readModelSource">{renderText(node?.readModelSource)}</Descriptions.Item>
          <Descriptions.Item label="batchId">{renderText(node?.lineage?.batchId)}</Descriptions.Item>
          <Descriptions.Item label="sourceOrgVersion">{renderText(node?.lineage?.sourceOrgVersion)}</Descriptions.Item>
        </Descriptions>
      </Drawer>
    );
  }

  render() {
    const diagnostics = this.state.diagnostics;
    return (
      <div>
        <Space direction="vertical" size={16} style={{width: "100%"}}>
          <Space wrap style={{width: "100%", justifyContent: "space-between"}}>
            <Space wrap>
              <OrganizationSelect initValue={this.state.organization} onChange={organization => this.changeOrganization(organization)} />
              <Button icon={<ReloadOutlined />} loading={this.state.refreshingStatus || this.state.loading} onClick={() => this.triggerRefresh(triggerRefreshStatus)}>刷新诊断</Button>
              <Button icon={<SyncOutlined />} loading={this.state.refreshingReadModel} onClick={() => this.triggerRefresh(triggerRefreshReadModel)}>重建 read model</Button>
            </Space>
            <Text type="secondary"><ToolOutlined /> 仅诊断和受控刷新，不编辑源事实</Text>
          </Space>
          {this.state.lastError ? (
            <Alert
              type="error"
              showIcon
              message="组织树运营数据加载失败"
              description={this.state.lastError}
            />
          ) : null}

          {this.renderSummary()}
          {this.renderSourceConnections()}

          <Card title="组织树节点" size="small">
            <Space direction="vertical" size={12} style={{width: "100%"}}>
              <Space wrap style={{width: "100%", justifyContent: "space-between"}}>
                {this.renderFilters()}
                <Segmented
                  value={this.state.nodeViewMode}
                  onChange={nodeViewMode => this.setState({nodeViewMode})}
                  options={[
                    {label: "树视图", value: "tree"},
                    {label: "列表视图", value: "list"},
                    {label: "成员视图", value: "members"},
                  ]}
                />
              </Space>
              {this.state.nodeViewMode === "members" ? this.renderMemberView() : this.state.nodeViewMode === "tree" ? this.renderNodeTree() : (
                <Table
                  size="small"
                  rowKey={record => record.departmentId}
                  loading={this.state.loading}
                  dataSource={diagnostics?.nodes || []}
                  columns={this.getNodeColumns()}
                  locale={{emptyText: <Empty description="当前筛选下无可见组织树节点" />}}
                  pagination={{pageSize: 10, showSizeChanger: true}}
                />
              )}
            </Space>
          </Card>

          <Card title="诊断项" size="small">
            <Table
              size="small"
              rowKey={record => `${record.subjectType}-${record.subjectId}-${record.reason}`}
              loading={this.state.loading}
              dataSource={diagnostics?.diagnostics || []}
              columns={this.getDiagnosticColumns()}
              locale={{emptyText: <Empty description="暂无诊断项" />}}
              pagination={{pageSize: 10, showSizeChanger: true}}
            />
          </Card>
        </Space>
        {this.renderDetailDrawer()}
      </div>
    );
  }
}

export default OrganizationTreeOperationsPage;
