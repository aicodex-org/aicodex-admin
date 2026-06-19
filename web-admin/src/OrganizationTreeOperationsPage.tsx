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

type StatusLabelMap = Record<string, string>;
type ReasonAliasCopy = {
  labelKey: string;
  label: string;
  descriptionKey?: string;
  description?: string;
};
type Account = {
  owner?: string;
  isAdmin?: boolean;
  [key: string]: unknown;
};
type OrganizationTreeOperationsDiagnosticItem = OrganizationTreeOperationsBackend.OrganizationTreeOperationsDiagnosticItem;
type OrganizationTreeOperationsDiagnostics = OrganizationTreeOperationsBackend.OrganizationTreeOperationsDiagnostics;
type OrganizationTreeOperationsFilters = OrganizationTreeOperationsBackend.OrganizationTreeOperationsFilters;
type OrganizationTreeOperationsMember = OrganizationTreeOperationsBackend.OrganizationTreeOperationsMember;
type OrganizationTreeOperationsNode = OrganizationTreeOperationsBackend.OrganizationTreeOperationsNode;
type OrganizationTreeOperationsSourceConnection = OrganizationTreeOperationsBackend.OrganizationTreeOperationsSourceConnection;
type OrganizationTreeOperationsPageProps = {
  account?: Account;
};
type NodeViewMode = "tree" | "list" | "members";
type OrganizationTreeOperationsPageState = {
  organization: string;
  diagnostics: OrganizationTreeOperationsDiagnostics | null;
  loading: boolean;
  refreshingStatus: boolean;
  refreshingReadModel: boolean;
  lastError: string;
  filters: OrganizationTreeOperationsFilters;
  nodeViewMode: NodeViewMode;
  selectedNode: OrganizationTreeOperationsNode | null;
  selectedMemberDepartment: string | null;
  memberLoading: boolean;
  memberPage: number;
  memberPageSize: number;
  memberTotal: number;
  members: OrganizationTreeOperationsMember[];
  selectedMember: OrganizationTreeOperationsMember | null;
  showTechnicalDetails: boolean;
};
type RefreshDiagnosticsOptions = {
  filters?: OrganizationTreeOperationsFilters;
};
type CompactIdentifierOptions = {
  copyable?: boolean;
  head?: number;
  tail?: number;
};
type OrganizationTreeDataNode = {
  key: string;
  title: React.ReactNode;
  children: OrganizationTreeDataNode[];
};

const lifecycleStatusLabels: StatusLabelMap = {
  active: "正常",
  disabled: "已停用",
  deleted: "已删除",
  conflicted: "冲突",
  unknown: "未知",
};

const freshnessLabels: StatusLabelMap = {
  current: "当前",
  fresh: "新鲜",
  stale: "陈旧",
  expired: "过期",
  unknown: "未知",
  unavailable: "不可用",
};

const reasonAliasLabels: Record<string, ReasonAliasCopy> = {
  scope_has_no_manageable_departments: {
    labelKey: "Current organization has no manageable departments",
    label: "当前组织暂无可管理部门",
    descriptionKey: "Check organization management scope source connection or administrator permission read only",
    description: "请检查组织管理范围、来源连接或管理员权限；本页仅做只读诊断，不会自动扩大可见范围。",
  },
  lifecycle_not_active: {
    labelKey: "Lifecycle is not active",
    label: "生命周期非正常",
  },
  mapping_missing: {
    labelKey: "API subject mapping missing",
    label: "API 主体映射缺失",
  },
  source_connection_stale: {
    labelKey: "Source connection stale",
    label: "来源连接已过期",
  },
};

function translateGeneral(key: string, fallback: string): string {
  return i18next.t(`general:${key}`, {defaultValue: fallback});
}

function readableAlias(value?: string | null): string {
  const text = String(value || "");
  if (!text) {
    return "-";
  }
  if (!text.includes("_") || text.includes(":")) {
    return text;
  }
  return text.split("_").filter(Boolean).map(part => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`).join(" ");
}

function renderReasonLabel(value?: string | null): string {
  const copy = reasonAliasLabels[String(value || "").toLowerCase()];
  if (copy) {
    return translateGeneral(copy.labelKey, copy.label);
  }
  return readableAlias(value);
}

function renderReasonDescription(value: string | undefined, fallback: string): string {
  const copy = reasonAliasLabels[String(value || "").toLowerCase()];
  if (copy?.descriptionKey) {
    return translateGeneral(copy.descriptionKey, copy.description || "");
  }
  if (value) {
    return renderReasonLabel(value);
  }
  return fallback;
}

function renderEmptyTreeClassLabel(value?: string, reason?: string): string {
  if (reason) {
    const reasonCopy = reasonAliasLabels[String(reason || "").toLowerCase()];
    if (reasonCopy) {
      return translateGeneral(reasonCopy.labelKey, reasonCopy.label);
    }
  }
  const labels: StatusLabelMap = {
    business_empty: translateGeneral("Business empty organization tree", "业务空树"),
    test_data_gap: translateGeneral("Test data gap", "测试数据缺口"),
    untrusted_read_model: translateGeneral("Untrusted directory data", "不可信数据"),
  };
  return value ? labels[value] || readableAlias(value) : readableAlias(value);
}

function renderText(value?: React.ReactNode): React.ReactNode {
  return value === undefined || value === null || value === "" ? "-" : value;
}

function compactIdentifier(value?: string | null, head = 18, tail = 8): string {
  if (!value) {
    return "-";
  }
  const text = String(value);
  if (text.length <= head + tail + 3) {
    return text;
  }
  return `${text.slice(0, head)}...${text.slice(-tail)}`;
}

function renderCompactIdentifier(value?: string | null, options: CompactIdentifierOptions = {}): React.ReactNode {
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

function renderStatusTag(value?: string | null, labels: StatusLabelMap = {}): React.ReactNode {
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

function renderTime(value?: string): React.ReactNode {
  return value ? Setting.getFormattedDate(value) : "-";
}

class OrganizationTreeOperationsPage extends React.Component<OrganizationTreeOperationsPageProps, OrganizationTreeOperationsPageState> {
  constructor(props: OrganizationTreeOperationsPageProps) {
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
      showTechnicalDetails: false,
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

  getAccountOrganization(account?: Account): string {
    if (!account?.owner) {
      return "";
    }
    return Setting.getRequestOrganization(account) || account.owner;
  }

  changeOrganization(organization: string) {
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
      showTechnicalDetails: false,
    }, () => this.refreshDiagnostics());
  }

  updateFilter(key: keyof OrganizationTreeOperationsFilters, value?: string | null) {
    this.setState({
      filters: {
        ...this.state.filters,
        [key]: value || "",
      },
    });
  }

  refreshDiagnostics(options: RefreshDiagnosticsOptions = {}) {
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
        diagnostics: res.status === "ok" ? res.data ?? null : null,
        lastError: res.status === "ok" ? "" : (res.msg || "诊断接口返回错误"),
      });
    }).catch(error => {
      this.setState({loading: false, lastError: String(error)});
      Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
    });
  }

  applySearch(query: string) {
    const filters = {
      ...this.state.filters,
      query,
    };
    this.setState({filters}, () => this.refreshDiagnostics({filters}));
  }

  triggerRefresh(triggerType: string) {
    const organization = this.state.organization;
    if (!organization) {
      return Promise.resolve();
    }
    const isReadModelRefresh = triggerType === triggerRefreshReadModel;
    if (isReadModelRefresh) {
      this.setState({refreshingReadModel: true});
    } else {
      this.setState({refreshingStatus: true});
    }
    return OrganizationTreeOperationsBackend.refreshOrganizationTreeOperations(organization, triggerType).then(res => {
      if (res.status === "error") {
        Setting.showMessage("error", res.msg);
      }
      const payload = res.data || {};
      if (res.status === "ok" && payload.status) {
        Setting.showMessage(payload.status === "error" ? "error" : "success", `刷新状态：${payload.status}`);
      }
      const nextState = {
        diagnostics: payload.diagnostics || this.state.diagnostics,
        lastError: res.status === "ok" ? "" : (res.msg || "刷新动作返回错误"),
      };
      const afterRefresh = () => {
        if (!payload.diagnostics) {
          this.refreshDiagnostics();
        }
      };
      if (isReadModelRefresh) {
        this.setState({refreshingReadModel: false, ...nextState}, afterRefresh);
      } else {
        this.setState({refreshingStatus: false, ...nextState}, afterRefresh);
      }
    }).catch(error => {
      if (isReadModelRefresh) {
        this.setState({refreshingReadModel: false, lastError: String(error)});
      } else {
        this.setState({refreshingStatus: false, lastError: String(error)});
      }
      Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
    });
  }

  loadDepartmentMembers(departmentId: string | null, page = 1, pageSize = this.state.memberPageSize) {
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

  selectNode(node: OrganizationTreeOperationsNode) {
    if (this.state.nodeViewMode === "members") {
      return this.loadDepartmentMembers(node.departmentId, 1, this.state.memberPageSize);
    }
    this.setState({selectedNode: node, selectedMember: null});
    return Promise.resolve();
  }

  getSummaryCards() {
    const summary = this.state.diagnostics?.summary || {};
    const source = this.state.diagnostics?.sourceConnections || [];
    return [
      {title: "可见节点", value: summary.visibleNodeCount ?? 0, extra: `平台部门 ${summary.totalPlatformDepartmentCount ?? 0}`},
      {title: "诊断项", value: summary.diagnosticItemCount ?? 0, extra: renderText(this.state.diagnostics?.emptyTreeClass ? renderEmptyTreeClassLabel(this.state.diagnostics.emptyTreeClass, this.state.diagnostics.reason) : "")},
      {title: "目录健康", value: renderStatusTag(summary.freshness, freshnessLabels), extra: `生成 ${renderTime(summary.generatedAt)}`},
      {title: "同步来源", value: source.length, extra: source.length > 0 ? source.map(item => item.sourceType).filter(Boolean).join(" / ") : "无来源连接"},
      {title: "最近同步", value: renderStatusTag(this.state.diagnostics?.latestSyncBatch?.status), extra: this.state.diagnostics?.latestSyncBatch?.status ? "查看技术详情获取批次号" : "无最近批次"},
    ];
  }

  getNodeColumns() {
    return [
      {title: "部门", dataIndex: "departmentName", key: "departmentName", render: (text: React.ReactNode, record: OrganizationTreeOperationsNode) => (
        <Space direction="vertical" size={0}>
          <Button type="link" style={{padding: 0}} onClick={() => this.setState({selectedNode: record})}>{renderText(text)}</Button>
          <Text type="secondary">{record.departmentPath || record.departmentId}</Text>
        </Space>
      )},
      {title: "生命周期", dataIndex: "lifecycleStatus", key: "lifecycleStatus", width: 120, render: (value?: string) => renderStatusTag(value, lifecycleStatusLabels)},
      {title: "来源", dataIndex: "sourceType", key: "sourceType", width: 120, render: renderText},
      {title: "连接状态", dataIndex: "sourceConnectionStatus", key: "sourceConnectionStatus", width: 130, render: (value?: string) => renderStatusTag(value)},
      {title: "新鲜度", dataIndex: "sourceConnectionFreshness", key: "sourceConnectionFreshness", width: 120, render: (value?: string) => renderStatusTag(value, freshnessLabels)},
      {title: "可见来源", dataIndex: "visibilitySource", key: "visibilitySource", width: 150, render: renderText},
    ];
  }

  getDiagnosticColumns() {
    return [
      {title: "对象", dataIndex: "displayName", key: "displayName", render: (text: React.ReactNode, record: OrganizationTreeOperationsDiagnosticItem) => (
        <Space direction="vertical" size={0}>
          <Text>{renderText(text || record.subjectId)}</Text>
          <Text type="secondary">{record.subjectType}:{record.subjectId}</Text>
        </Space>
      )},
      {title: "原因", dataIndex: "reason", key: "reason", render: renderReasonLabel},
      {title: "生命周期", dataIndex: "lifecycleStatus", key: "lifecycleStatus", width: 120, render: (value?: string) => renderStatusTag(value, lifecycleStatusLabels)},
      {title: "映射状态", dataIndex: "mappingStatus", key: "mappingStatus", width: 130, render: renderText},
      {title: "来源", dataIndex: "sourceType", key: "sourceType", width: 120, render: renderText},
      {title: "新鲜度", dataIndex: "freshness", key: "freshness", width: 120, render: (value?: string) => renderStatusTag(value, freshnessLabels)},
    ];
  }

  getMemberColumns() {
    return [
      {title: "成员", dataIndex: "displayName", key: "displayName", render: (text: React.ReactNode, record: OrganizationTreeOperationsMember) => (
        <Space direction="vertical" size={0}>
          <Button type="link" style={{padding: 0}} onClick={() => this.setState({selectedMember: record, selectedNode: null})}>{renderText(text)}</Button>
          <Text type="secondary">{renderCompactIdentifier(record.departmentId, {head: 16, tail: 8})}</Text>
        </Space>
      )},
      {title: "生命周期", dataIndex: "lifecycleStatus", key: "lifecycleStatus", width: 120, render: (value?: string) => renderStatusTag(value, lifecycleStatusLabels)},
      {title: "映射状态", dataIndex: "mappingStatus", key: "mappingStatus", width: 120, render: renderText},
      {title: "来源", dataIndex: "sourceType", key: "sourceType", width: 110, render: renderText},
      {title: "新鲜度", dataIndex: "freshness", key: "freshness", width: 120, render: (value?: string) => renderStatusTag(value, freshnessLabels)},
      {title: "原因", dataIndex: "reason", key: "reason", render: renderText},
    ];
  }

  buildTreeData(nodes: OrganizationTreeOperationsNode[] = []): OrganizationTreeDataNode[] {
    const records = new Map<string, OrganizationTreeDataNode>();
    nodes.forEach(node => {
      records.set(node.departmentId, {
        key: node.departmentId,
        title: this.renderTreeNodeTitle(node),
        children: [],
      });
    });

    const roots: OrganizationTreeDataNode[] = [];
    nodes.forEach(node => {
      const treeNode = records.get(node.departmentId);
      const parent = node.parentDepartmentId ? records.get(node.parentDepartmentId) : undefined;
      if (!treeNode) {
        return;
      }
      if (parent && parent !== treeNode) {
        parent.children.push(treeNode);
      } else {
        roots.push(treeNode);
      }
    });
    return roots;
  }

  renderTreeNodeTitle(node: OrganizationTreeOperationsNode): React.ReactNode {
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
            <Table<OrganizationTreeOperationsMember>
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
            description={renderReasonDescription(diagnostics.reason, "请查看诊断项和来源连接状态。")}
          />
        ) : null}
        {diagnostics?.emptyTreeClass ? (
          <Alert
            style={{marginBottom: 16}}
            type={diagnostics.emptyTreeClass === "business_empty" ? "info" : "warning"}
            showIcon
            message={renderEmptyTreeClassLabel(diagnostics.emptyTreeClass, diagnostics.reason)}
            description={renderReasonDescription(diagnostics.reason, "空树仅表示当前可管理范围为空，不代表组织树能力通过。")}
          />
        ) : null}
        <Row gutter={[12, 12]} style={{marginBottom: 12}}>
          {this.getSummaryCards().map(item => (
            <Col xs={12} sm={12} lg={8} xl={4} key={item.title}>
              <Card
                data-testid="organization-tree-summary-card"
                size="small"
                style={{height: "100%", minHeight: 72}}
                styles={{body: {minHeight: 72, padding: 12}}}
              >
                <Text type="secondary">{item.title}</Text>
                <Title level={4} style={{margin: "4px 0 2px", maxWidth: "100%"}}>{item.value}</Title>
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
    const sourceConnectionColumns = [
      {title: "连接", dataIndex: "sourceConnectionId", key: "sourceConnectionId", render: (value?: string) => renderCompactIdentifier(value, {copyable: true, head: 28, tail: 12})},
      {title: "类型", dataIndex: "sourceType", key: "sourceType", width: 120, render: renderText},
      {title: "状态", dataIndex: "status", key: "status", width: 120, render: (value?: string) => renderStatusTag(value)},
      {title: "新鲜度", dataIndex: "freshness", key: "freshness", width: 120, render: (value?: string) => renderStatusTag(value, freshnessLabels)},
      {title: "已配置", dataIndex: "configured", key: "configured", width: 100, render: (value?: boolean) => value ? <Tag color="green">是</Tag> : <Tag>否</Tag>},
      {title: "最近批次", dataIndex: "lastSeenBatchId", key: "lastSeenBatchId", render: (value?: string) => renderCompactIdentifier(value, {copyable: true, head: 28, tail: 12})},
    ];
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
        <Table<OrganizationTreeOperationsSourceConnection>
          style={{marginTop: 12}}
          size="small"
          rowKey={record => record.sourceConnectionId || record.sourceType || "source-connection"}
          pagination={false}
          dataSource={diagnostics?.sourceConnections || []}
          columns={sourceConnectionColumns}
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
      <div className="organization-tree-operations-page">
        <Space direction="vertical" size={16} style={{width: "100%"}}>
          <Space wrap style={{width: "100%", justifyContent: "space-between"}}>
            <Space wrap>
              <OrganizationSelect initValue={this.state.organization} onChange={(organization: string) => this.changeOrganization(organization)} />
              <Button icon={<ReloadOutlined />} loading={this.state.refreshingStatus || this.state.loading} onClick={() => this.triggerRefresh(triggerRefreshStatus)}>刷新诊断</Button>
              <Button icon={<SyncOutlined />} loading={this.state.refreshingReadModel} onClick={() => this.triggerRefresh(triggerRefreshReadModel)}>重建目录视图</Button>
              <Button onClick={() => this.setState({showTechnicalDetails: !this.state.showTechnicalDetails})}>技术详情</Button>
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
          {this.state.showTechnicalDetails ? this.renderSourceConnections() : null}

          <Card title="组织树节点" size="small">
            <Space direction="vertical" size={12} style={{width: "100%"}}>
              <Space wrap style={{width: "100%", justifyContent: "space-between"}}>
                {this.renderFilters()}
                <Segmented
                  value={this.state.nodeViewMode}
                  onChange={nodeViewMode => this.setState({nodeViewMode: String(nodeViewMode) as NodeViewMode})}
                  options={[
                    {label: "树视图", value: "tree"},
                    {label: "列表视图", value: "list"},
                    {label: "成员视图", value: "members"},
                  ]}
                />
              </Space>
              {this.state.nodeViewMode === "members" ? this.renderMemberView() : this.state.nodeViewMode === "tree" ? this.renderNodeTree() : (
                <Table<OrganizationTreeOperationsNode>
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
            <Table<OrganizationTreeOperationsDiagnosticItem>
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
