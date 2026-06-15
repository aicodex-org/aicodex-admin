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
import {Alert, Button, Card, Drawer, Input, Select, Space, Table, Tabs, Tag, Typography} from "antd";
import {PlusOutlined, ReloadOutlined, SaveOutlined} from "@ant-design/icons";
import * as Setting from "./Setting";
import * as PlatformApiMappingBackend from "./backend/PlatformApiMappingBackend";
import OrganizationSelect from "./common/select/OrganizationSelect";
import {getDefaultTablePagination, getTablePaginationProps} from "./common/table/TablePagination";
import i18next from "i18next";

const {Text} = Typography;
const {Search} = Input;
const mappingStatuses = ["CONFIRMED", "PENDING_REVIEW", "CONFLICTED", "DUPLICATE", "DISABLED"];
const mappingSources = ["MANUAL", "MIGRATION", "RESOLVER"];
const readinessCategories = [
  "active_publishable",
  "tombstone_publishable",
  "mapping_missing",
  "mapping_untrusted",
  "lifecycle_not_publishable",
  "source_metadata_unavailable",
  "lineage_freshness_unavailable",
];
const mappingStatusLabels = {
  CONFIRMED: "已确认",
  PENDING_REVIEW: "待复核",
  CONFLICTED: "冲突",
  DUPLICATE: "重复",
  DISABLED: "已停用",
};
const mappingSourceLabels = {
  MANUAL: "手工维护",
  MIGRATION: "迁移导入",
  RESOLVER: "解析器生成",
};
const readinessCategoryLabels = {
  active_publishable: "Active 可发布",
  tombstone_publishable: "Tombstone 可发布",
  mapping_missing: "缺少映射",
  mapping_untrusted: "映射不可信",
  lifecycle_not_publishable: "生命周期不可发布",
  source_metadata_unavailable: "来源元数据不可用",
  lineage_freshness_unavailable: "血缘/新鲜度不可用",
};
const retryReadinessLabels = {
  safe_retry: "可安全重试",
  wait_source_refresh: "等待来源刷新",
  fix_mapping_or_subject: "修复映射/主体",
  fix_publisher_config: "修复发布配置",
  inspect_gateway_contract: "检查网关契约",
  unknown: "需要复查",
};
const ingestionStatusLabels = {
  accepted: "已接收",
  applied: "已应用",
  stale: "已过期",
  conflict: "版本冲突",
  lineage_invalid: "血缘无效",
  unmapped_subjects: "主体未映射",
  not_found: "未找到",
  provider_unavailable: "Gateway 不可用",
  invalid_config: "配置缺失",
  invalid_response: "响应无效",
  unknown: "未知",
};
const publishAttemptSourceLabels = {
  manual: "手动",
  scheduled: "定时/同步",
};
const publishAttemptStatusLabels = {
  ok: "成功",
  error: "失败",
};
const titleTips = {
  platformApiMappings: "维护认证中心组织/账号到 aicodex-api 业务组织、网关账号和用量身份的权威映射。",
  organizationMapping: "维护平台组织到 aicodex-api 业务组织 UUID 的一等映射。只有“已确认”才会作为运行时权威来源。",
  userMapping: "维护同一组织内平台主体到 aicodex-api 用户 ID 的一等映射。只有“已确认”才会作为运行时权威来源。",
  readiness: "只读诊断当前组织是否存在可发布 active/tombstone subject；该结果只用于 Admin operator 排障，不是 gateway authorization facts。",
  masterDataQuality: "只读诊断当前 Admin 组织主数据是否满足 projection 生产前置条件；只显示脱敏 counts 和 reason aliases，不触发 publish。",
  organizationId: "技术字段：organizationId。aicodex-admin 平台组织 ID，表示本次登录和映射归属的租户上下文。",
  apiOrganizationId: "技术字段：apiOrganizationId。aicodex-api 业务组织 UUID。只有“已确认”状态才会进入授权、投影和报表链路。",
  adminSubject: "技术字段：adminSubject。稳定 admin 主体，一般由组织和用户稳定键组成，用于跨组织唯一识别平台用户。",
  apiUserId: "技术字段：apiUserId。aicodex-api 业务用户 ID，必须在同一 organizationId 内与 adminSubject 一一映射。",
  mappingStatus: "技术字段：mappingStatus。只有“已确认”生效；“待复核”“冲突”“重复”“已停用”都会在授权入口拒绝继续登录。",
  mappingSource: "技术字段：mappingSource。用于审计和排查，保存值为 MANUAL、MIGRATION 或 RESOLVER。",
};

function normalizeMappingStatus(status) {
  return status || "PENDING_REVIEW";
}

function getReadinessCategoryLabel(category) {
  return readinessCategoryLabels[category] || category || "-";
}

function getReadinessCategoryOptions() {
  return [
    Setting.getOption("全部 readiness", ""),
    ...readinessCategories.map(category => Setting.getOption(getReadinessCategoryLabel(category), category)),
  ];
}

function normalizeMappingSource(source) {
  return source || "MANUAL";
}

function getMappingStatusLabel(status) {
  const normalizedStatus = normalizeMappingStatus(status);
  return mappingStatusLabels[normalizedStatus] || normalizedStatus;
}

function getMappingSourceLabel(source) {
  const normalizedSource = normalizeMappingSource(source);
  return mappingSourceLabels[normalizedSource] || normalizedSource;
}

function getMappingStatusOptions() {
  return mappingStatuses.map(status => Setting.getOption(getMappingStatusLabel(status), status));
}

function getMappingSourceOptions(source) {
  const normalizedSource = normalizeMappingSource(source);
  const options = mappingSources.map(item => Setting.getOption(getMappingSourceLabel(item), item));
  if (!mappingSources.includes(normalizedSource)) {
    options.push(Setting.getOption(normalizedSource, normalizedSource));
  }
  return options;
}

class PlatformApiMappingPage extends React.Component {
  constructor(props) {
    super(props);
    const organization = this.getAccountOrganization(props.account);
    this.state = {
      organization,
      activeTabKey: "organization",
      organizationMappings: [],
      userMappings: [],
      organizationLoading: false,
      userLoading: false,
      readinessLoading: false,
      runReadinessLoading: false,
      masterDataQualityLoading: false,
      ingestionStatusLoading: false,
      manualPublishing: false,
      attemptsLoading: false,
      attemptDetailLoading: false,
      savingKey: "",
      userKeyword: "",
      readinessCategory: "",
      readinessMappingStatus: "",
      readiness: null,
      runReadiness: null,
      masterDataQuality: null,
      ingestionStatus: null,
      manualPublishResult: null,
      publishAttempts: [],
      attemptSource: "",
      attemptStatus: "",
      attemptTimeWindow: "",
      attemptDetail: null,
      attemptDetailVisible: false,
      userPagination: getDefaultTablePagination(),
      userMappingsLoaded: false,
    };
  }

  componentDidMount() {
    this.refreshOrganizationMappings(this.state.organization);
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

  refresh(organization = this.state.organization) {
    if (this.state.activeTabKey === "user") {
      return this.refreshUserMappings(organization);
    }
    return this.refreshOrganizationMappings(organization);
  }

  refreshOrganizationMappings(organization = this.state.organization) {
    if (!organization) {
      return Promise.resolve();
    }

    this.setState({organizationLoading: true});
    return PlatformApiMappingBackend.getPlatformApiOrganizationMappings(organization).then((organizationRes) => {
      if (organizationRes.status === "error") {
        Setting.showMessage("error", organizationRes.msg);
      }
      this.setState({
        organizationLoading: false,
        organizationMappings: organizationRes.status === "ok" ? (organizationRes.data || []) : [],
      });
    }).catch(error => {
      this.setState({organizationLoading: false});
      Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
    });
  }

  refreshUserMappings(organization = this.state.organization, options = {}) {
    if (!organization) {
      return Promise.resolve();
    }

    const pagination = {
      ...this.state.userPagination,
      ...(options.pagination || {}),
    };
    const keyword = options.keyword !== undefined ? options.keyword : this.state.userKeyword;

    this.setState({userLoading: true});
    const readinessPromise = this.refreshUserMappingReadiness(organization, {
      keyword,
      readinessCategory: this.state.readinessCategory,
      mappingStatus: this.state.readinessMappingStatus,
    });
    const masterDataQualityPromise = this.refreshOrganizationMasterDataQuality(organization);
    return PlatformApiMappingBackend.getPlatformApiUserMappings(organization, {
      current: pagination.current,
      pageSize: pagination.pageSize,
      keyword,
    }).then((userRes) => {
      if (userRes.status === "error") {
        Setting.showMessage("error", userRes.msg);
      }
      this.setState({
        userLoading: false,
        userMappings: userRes.status === "ok" ? (userRes.data || []) : [],
        userKeyword: keyword,
        userPagination: {
          ...pagination,
          total: userRes.status === "ok" ? (userRes.data2 || 0) : pagination.total,
        },
        userMappingsLoaded: true,
      });
      return Promise.all([readinessPromise, masterDataQualityPromise]);
    }).catch(error => {
      this.setState({userLoading: false});
      Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
    });
  }

  refreshUserMappingReadiness(organization = this.state.organization, options = {}) {
    if (!organization) {
      return Promise.resolve();
    }
    const keyword = options.keyword !== undefined ? options.keyword : this.state.userKeyword;
    const readinessCategory = options.readinessCategory !== undefined ? options.readinessCategory : this.state.readinessCategory;
    const mappingStatus = options.mappingStatus !== undefined ? options.mappingStatus : this.state.readinessMappingStatus;

    this.setState({readinessLoading: true});
    return PlatformApiMappingBackend.getPlatformApiUserMappingReadiness(organization, {
      keyword,
      readinessCategory,
      mappingStatus,
      limit: 20,
    }).then((res) => {
      if (res.status === "error") {
        Setting.showMessage("error", res.msg);
      }
      this.setState({
        readinessLoading: false,
        readiness: res.status === "ok" ? res.data : null,
        readinessCategory,
        readinessMappingStatus: mappingStatus,
      });
    }).catch(error => {
      this.setState({readinessLoading: false});
      Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
    });
  }

  refreshGatewayProjectionRunReadiness(organization = this.state.organization, options = {}) {
    if (!organization) {
      return Promise.resolve();
    }

    this.setState({runReadinessLoading: true});
    return PlatformApiMappingBackend.getGatewayProjectionRunReadiness(organization, options).then((res) => {
      if (res.status === "error") {
        Setting.showMessage("error", res.msg);
      }
      this.setState({
        runReadinessLoading: false,
        runReadiness: res.status === "ok" ? res.data : null,
      });
    }).catch(error => {
      this.setState({runReadinessLoading: false});
      Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
    });
  }

  refreshGatewayProjectionPublishAttempts(organization = this.state.organization, options = {}) {
    if (!organization) {
      return Promise.resolve();
    }
    const source = options.source !== undefined ? options.source : this.state.attemptSource;
    const status = options.status !== undefined ? options.status : this.state.attemptStatus;
    const timeWindow = options.timeWindow !== undefined ? options.timeWindow : this.state.attemptTimeWindow;

    this.setState({attemptsLoading: true});
    return PlatformApiMappingBackend.getGatewayProjectionPublishAttempts(organization, {
      source,
      status,
      from: this.getAttemptFromTime(timeWindow),
      limit: 20,
    }).then((res) => {
      if (res.status === "error") {
        Setting.showMessage("error", res.msg);
      }
      this.setState({
        attemptsLoading: false,
        publishAttempts: res.status === "ok" ? (res.data?.attempts || []) : [],
        attemptSource: source,
        attemptStatus: status,
        attemptTimeWindow: timeWindow,
      });
    }).catch(error => {
      this.setState({attemptsLoading: false});
      Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
    });
  }

  refreshOrganizationMasterDataQuality(organization = this.state.organization) {
    if (!organization) {
      return Promise.resolve();
    }
    this.setState({masterDataQualityLoading: true});
    return PlatformApiMappingBackend.getOrganizationMasterDataQualityReadiness(organization).then((res) => {
      if (res.status === "error") {
        Setting.showMessage("error", res.msg);
      }
      this.setState({
        masterDataQualityLoading: false,
        masterDataQuality: res.status === "ok" ? res.data : null,
      });
    }).catch(error => {
      this.setState({masterDataQualityLoading: false});
      Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
    });
  }

  refreshGatewayProjectionIngestionStatus(organization = this.state.organization, options = {}) {
    if (!organization) {
      return Promise.resolve();
    }

    this.setState({ingestionStatusLoading: true});
    return PlatformApiMappingBackend.getGatewayProjectionIngestionStatus(organization, {
      latest: true,
      ...options,
    }).then((res) => {
      if (res.status === "error") {
        Setting.showMessage("error", res.msg);
      }
      this.setState({
        ingestionStatusLoading: false,
        ingestionStatus: res.status === "ok" ? res.data : (res.data || null),
      });
    }).catch(error => {
      this.setState({ingestionStatusLoading: false});
      Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
    });
  }

  changeOrganization(organization) {
    this.setState({
      organization,
      organizationMappings: [],
      userMappings: [],
      userKeyword: "",
      readiness: null,
      runReadiness: null,
      masterDataQuality: null,
      ingestionStatus: null,
      manualPublishResult: null,
      publishAttempts: [],
      attemptSource: "",
      attemptStatus: "",
      attemptTimeWindow: "",
      attemptDetail: null,
      attemptDetailVisible: false,
      readinessCategory: "",
      readinessMappingStatus: "",
      userPagination: getDefaultTablePagination(),
      userMappingsLoaded: false,
    }, () => {
      this.refreshOrganizationMappings(organization);
      if (this.state.activeTabKey === "user") {
        this.refreshUserMappings(organization, {
          pagination: getDefaultTablePagination(),
          keyword: "",
        });
        this.refreshGatewayProjectionRunReadiness(organization);
        this.refreshGatewayProjectionIngestionStatus(organization);
        this.refreshGatewayProjectionPublishAttempts(organization);
      }
    });
  }

  changeTab(activeTabKey) {
    this.setState({activeTabKey}, () => {
      if (activeTabKey === "user" && !this.state.userMappingsLoaded) {
        this.refreshUserMappings();
        this.refreshGatewayProjectionRunReadiness();
        this.refreshGatewayProjectionIngestionStatus();
        this.refreshGatewayProjectionPublishAttempts();
      }
    });
  }

  getActiveLoading() {
    return this.state.activeTabKey === "user" ? this.state.userLoading : this.state.organizationLoading;
  }

  updateOrganizationMapping(index, field, value) {
    const organizationMappings = [...this.state.organizationMappings];
    organizationMappings[index] = {
      ...organizationMappings[index],
      [field]: value,
    };
    this.setState({organizationMappings});
  }

  updateUserMapping(index, field, value) {
    const userMappings = [...this.state.userMappings];
    userMappings[index] = {
      ...userMappings[index],
      [field]: value,
    };
    this.setState({userMappings});
  }

  addOrganizationMapping() {
    const organization = this.state.organization;
    if (!organization) {
      return;
    }
    this.setState({
      organizationMappings: [
        {
          owner: organization,
          organizationId: organization,
          apiOrganizationId: "",
          mappingStatus: "PENDING_REVIEW",
          mappingSource: "MANUAL",
        },
        ...this.state.organizationMappings,
      ],
    });
  }

  addUserMapping() {
    const organization = this.state.organization;
    if (!organization) {
      return;
    }
    this.setState({
      userMappings: [
        {
          owner: organization,
          organizationId: organization,
          adminSubject: "",
          apiUserId: "",
          mappingStatus: "PENDING_REVIEW",
          mappingSource: "MANUAL",
        },
        ...this.state.userMappings,
      ],
    });
  }

  saveOrganizationMapping(mapping, index) {
    if (!mapping.organizationId) {
      Setting.showMessage("error", "平台组织 ID（organizationId）不能为空");
      return;
    }
    const savingKey = `org-${index}`;
    this.setState({savingKey});
    PlatformApiMappingBackend.updatePlatformApiOrganizationMapping(mapping).then((res) => {
      this.setState({savingKey: ""});
      if (res.status === "ok") {
        Setting.showMessage("success", i18next.t("general:Successfully saved"));
        this.refresh();
      } else {
        Setting.showMessage("error", `${i18next.t("general:Failed to save")}: ${res.msg}`);
      }
    }).catch(error => {
      this.setState({savingKey: ""});
      Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
    });
  }

  saveUserMapping(mapping, index) {
    if (!mapping.organizationId || !mapping.adminSubject) {
      Setting.showMessage("error", "平台组织 ID（organizationId）和平台主体（adminSubject）不能为空");
      return;
    }
    const savingKey = `user-${index}`;
    this.setState({savingKey});
    PlatformApiMappingBackend.updatePlatformApiUserMapping(mapping).then((res) => {
      this.setState({savingKey: ""});
      if (res.status === "ok") {
        Setting.showMessage("success", i18next.t("general:Successfully saved"));
        this.refreshUserMappings();
      } else {
        Setting.showMessage("error", `${i18next.t("general:Failed to save")}: ${res.msg}`);
      }
    }).catch(error => {
      this.setState({savingKey: ""});
      Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
    });
  }

  renderStatus(value) {
    const status = normalizeMappingStatus(value);
    const color = status === "CONFIRMED" ? "green" : status === "DISABLED" ? "default" : "orange";
    return <Tag color={color}>{getMappingStatusLabel(status)}</Tag>;
  }

  renderTitleWithTip(title, tooltip) {
    return (
      <span style={{display: "inline-flex", alignItems: "center", whiteSpace: "nowrap"}}>
        {Setting.getLabel(title, tooltip)}
      </span>
    );
  }

  renderOrganizationMappingTable() {
    const columns = [
      {
        title: this.renderTitleWithTip("平台组织 ID", titleTips.organizationId),
        dataIndex: "organizationId",
        width: 220,
        render: (text, record, index) => (
          <Input value={text} onChange={e => this.updateOrganizationMapping(index, "organizationId", e.target.value)} />
        ),
      },
      {
        title: this.renderTitleWithTip("AICodex API 组织 UUID", titleTips.apiOrganizationId),
        dataIndex: "apiOrganizationId",
        width: 260,
        render: (text, record, index) => (
          <Input value={text} placeholder="AICodex API 组织 UUID" onChange={e => this.updateOrganizationMapping(index, "apiOrganizationId", e.target.value)} />
        ),
      },
      {
        title: this.renderTitleWithTip("映射状态", titleTips.mappingStatus),
        dataIndex: "mappingStatus",
        width: 220,
        render: (text, record, index) => (
          <Select
            value={normalizeMappingStatus(text)}
            options={getMappingStatusOptions()}
            onChange={value => this.updateOrganizationMapping(index, "mappingStatus", value)}
            style={{width: "100%"}}
          />
        ),
      },
      {
        title: this.renderTitleWithTip("映射来源", titleTips.mappingSource),
        dataIndex: "mappingSource",
        width: 210,
        render: (text, record, index) => (
          <Select
            value={normalizeMappingSource(text)}
            options={getMappingSourceOptions(text)}
            onChange={value => this.updateOrganizationMapping(index, "mappingSource", value)}
            style={{width: "100%"}}
          />
        ),
      },
      {
        title: i18next.t("general:Action"),
        width: 110,
        render: (text, record, index) => (
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={this.state.savingKey === `org-${index}`}
            onClick={() => this.saveOrganizationMapping(record, index)}
          >
            {i18next.t("general:Save")}
          </Button>
        ),
      },
    ];
    return (
      <Table
        rowKey={(record) => record.name || `${record.organizationId || "new"}-${record.apiOrganizationId || ""}`}
        columns={columns}
        dataSource={this.state.organizationMappings}
        pagination={false}
        loading={this.state.organizationLoading}
        scroll={{x: 1000}}
      />
    );
  }

  handleUserTableChange = (pagination) => {
    this.refreshUserMappings(this.state.organization, {
      pagination: {
        ...this.state.userPagination,
        current: pagination.current,
        pageSize: pagination.pageSize,
      },
    });
  };

  searchUserMappings(keyword) {
    this.refreshUserMappings(this.state.organization, {
      keyword: (keyword || "").trim(),
      pagination: {
        ...this.state.userPagination,
        current: 1,
      },
    });
  }

  changeReadinessFilter(field, value) {
    this.setState({[field]: value}, () => {
      this.refreshUserMappingReadiness(this.state.organization, {
        keyword: this.state.userKeyword,
        readinessCategory: this.state.readinessCategory,
        mappingStatus: this.state.readinessMappingStatus,
      });
    });
  }

  getDisplayedReadinessGuidance() {
    const guidance = this.state.readiness?.remediationGuidance || [];
    if (!this.state.readinessCategory) {
      return guidance;
    }
    return guidance.filter(item => item.category === this.state.readinessCategory);
  }

  getAttemptFromTime(timeWindow) {
    if (!timeWindow) {
      return "";
    }
    const now = new Date();
    if (timeWindow === "1h") {
      return new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    }
    if (timeWindow === "24h") {
      return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    }
    return "";
  }

  changeAttemptFilter(field, value) {
    this.setState({[field]: value}, () => this.refreshGatewayProjectionPublishAttempts(this.state.organization, {
      source: this.state.attemptSource,
      status: this.state.attemptStatus,
      timeWindow: this.state.attemptTimeWindow,
    }));
  }

  openPublishAttemptDetail(attempt) {
    if (!attempt?.attemptId) {
      return;
    }
    this.setState({attemptDetailLoading: true, attemptDetailVisible: true, attemptDetail: attempt});
    PlatformApiMappingBackend.getGatewayProjectionPublishAttempt(this.state.organization, attempt.attemptId).then((res) => {
      if (res.status === "error") {
        Setting.showMessage("error", res.msg);
      }
      this.setState({
        attemptDetailLoading: false,
        attemptDetail: res.status === "ok" ? res.data : attempt,
      });
    }).catch(error => {
      this.setState({attemptDetailLoading: false});
      Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
    });
  }

  getManualPublishDisabledReasons() {
    const readiness = this.state.readiness;
    const counts = readiness?.counts || {};
    const publishableCount = (counts.active_publishable || 0) + (counts.tombstone_publishable || 0);
    const reasons = [];
    if (!this.state.organization) {
      reasons.push("未选择组织");
    }
    if (!readiness) {
      reasons.push("readiness 尚未加载");
    } else if (publishableCount === 0) {
      reasons.push("没有 active/tombstone 可发布主体");
    }
    return reasons;
  }

  publishGatewayProjectionManually() {
    const disabledReasons = this.getManualPublishDisabledReasons();
    if (disabledReasons.length > 0) {
      Setting.showMessage("warning", `暂不能手动发布：${disabledReasons.join("；")}`);
      return Promise.resolve();
    }

    this.setState({manualPublishing: true});
    return PlatformApiMappingBackend.publishGatewayProjectionManually(this.state.organization, {
      reason: "operator-manual-publish",
    }).then((res) => {
      this.setState({
        manualPublishing: false,
        manualPublishResult: res.status === "ok" ? res.data : (res.data || null),
      });
      if (res.status === "ok" && res.data?.status === "ok") {
        Setting.showMessage("success", "gateway projection 手动发布已接受或幂等完成");
      } else {
        Setting.showMessage("warning", `gateway projection 手动发布未完成：${res.msg || res.data?.failureCategory || "unknown"}`);
      }
      this.refreshUserMappingReadiness();
      this.refreshGatewayProjectionRunReadiness();
      this.refreshGatewayProjectionIngestionStatus();
      this.refreshGatewayProjectionPublishAttempts();
    }).catch(error => {
      this.setState({manualPublishing: false});
      Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
    });
  }

  renderGatewayProjectionIngestionStatus() {
    const status = this.state.ingestionStatus;
    const query = status?.query || {};
    const counts = status?.subjectCounts || {};
    const lineage = status?.lineage || {};
    const statusAlias = status?.statusAlias || status?.status || "unknown";
    const statusLabel = ingestionStatusLabels[statusAlias] || statusAlias;
    const success = status?.success === true;

    return (
      <Card
        type="inner"
        title="Gateway ingestion status"
        style={{marginBottom: 12}}
        extra={
          <Button icon={<ReloadOutlined />} loading={this.state.ingestionStatusLoading} onClick={() => this.refreshGatewayProjectionIngestionStatus()}>
            {i18next.t("general:Refresh")}
          </Button>
        }
      >
        <Alert
          type={success ? "success" : "warning"}
          showIcon
          message={`Gateway status: ${statusLabel}`}
          description="该状态来自 Gateway owner ingestion-status contract，只表示 receipt/apply 状态，不证明 Insight/API 授权查询成功。"
          style={{marginBottom: 12}}
        />
        <Space wrap style={{marginBottom: 8}}>
          <Tag color={success ? "green" : "orange"}>{statusAlias}</Tag>
          {status?.reasonCode && <Tag>reason: {status.reasonCode}</Tag>}
          {status?.failureCategory && <Tag color="red">failure: {status.failureCategory}</Tag>}
          <Tag>latest: {String(!!query.latest)}</Tag>
          {query.projectionBatchId && <Tag>batch: {query.projectionBatchId}</Tag>}
          {lineage.sourceVersion && <Tag>sourceVersion: {lineage.sourceVersion}</Tag>}
          {lineage.orgVersion && <Tag>orgVersion: {lineage.orgVersion}</Tag>}
        </Space>
        <Space wrap>
          <Tag>subjects: {counts.total || 0}</Tag>
          <Tag>active: {counts.active || 0}</Tag>
          <Tag>tombstone: {counts.tombstone || 0}</Tag>
          <Tag>unmapped: {counts.unmapped || 0}</Tag>
          <Tag>invalid: {counts.invalid || 0}</Tag>
          {status?.receivedAt && <Tag>received: {status.receivedAt}</Tag>}
          {status?.appliedAt && <Tag>applied: {status.appliedAt}</Tag>}
          {status?.durationMs > 0 && <Tag>durationMs: {status.durationMs}</Tag>}
        </Space>
      </Card>
    );
  }

  renderGatewayProjectionRunReadiness() {
    const summary = this.state.runReadiness;
    const retry = summary?.retry || {};
    const current = summary?.current || {};
    const diff = summary?.diff || {};
    const source = summary?.source || {};
    const target = summary?.target || {};
    const actionLabel = retryReadinessLabels[retry.readiness] || retry.readiness || "未加载";
    const changed = [
      diff.sourceVersionChanged && "sourceVersion",
      diff.orgVersionChanged && "orgVersion",
      diff.projectionBatchChanged && "projectionBatchId",
      diff.subjectCountChanged && "subjectCount",
      diff.activeCountChanged && "active",
      diff.tombstoneCountChanged && "tombstone",
    ].filter(Boolean);

    return (
      <Card
        type="inner"
        title="Gateway projection run readiness"
        style={{marginBottom: 12}}
        extra={
          <Button icon={<ReloadOutlined />} loading={this.state.runReadinessLoading} onClick={() => this.refreshGatewayProjectionRunReadiness()}>
            {i18next.t("general:Refresh")}
          </Button>
        }
      >
        <Alert
          type={retry.safeToRetry ? "success" : "warning"}
          showIcon
          message={`Retry action: ${actionLabel}`}
          description={retry.operatorAction || "该摘要只基于 Admin producer 视角，不代表 Gateway/API/Insight 授权成功。"}
          style={{marginBottom: 12}}
        />
        <Space wrap style={{marginBottom: 8}}>
          <Tag color={retry.safeToRetry ? "green" : "orange"}>{retry.readiness || "unknown"}</Tag>
          {summary?.lastFailureAlias && <Tag color="red">lastFailure: {summary.lastFailureAlias}</Tag>}
          <Tag>sourceVersion: {source.sourceVersion || "-"}</Tag>
          <Tag>orgVersion: {source.orgVersion || 0}</Tag>
          <Tag>contract: {target.contractVersionStatus || "-"}</Tag>
          <Tag>projectionVersions: {target.projectionVersionCount || 0}</Tag>
        </Space>
        <Space wrap style={{marginBottom: 8}}>
          <Tag>subjects: {current.subjectCount || 0}</Tag>
          <Tag>active: {current.activeSubjectCount || 0}</Tag>
          <Tag>tombstone: {current.tombstoneSubjectCount || 0}</Tag>
          <Tag>unmapped: {current.unmappedSubjectCount || 0}</Tag>
          <Tag>invalid: {current.invalidSubjectCount || 0}</Tag>
          <Tag>runRef: {summary?.runReference?.storageScope || "latest_in_process_observability"}</Tag>
        </Space>
        <div>
          {(changed.length > 0 ? changed : ["no-count-diff"]).map(item => (
            <Tag key={item} color={changed.length > 0 ? "blue" : "default"}>{item}</Tag>
          ))}
        </div>
      </Card>
    );
  }

  renderManualPublishConsole() {
    const disabledReasons = this.getManualPublishDisabledReasons();
    const result = this.state.manualPublishResult;
    return (
      <Card
        type="inner"
        title="Gateway projection 手动发布"
        style={{marginBottom: 12}}
        extra={
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            loading={this.state.manualPublishing}
            disabled={disabledReasons.length > 0}
            onClick={() => this.publishGatewayProjectionManually()}
          >
            手动发布
          </Button>
        }
      >
        <Alert
          type={disabledReasons.length > 0 ? "warning" : "info"}
          showIcon
          message={disabledReasons.length > 0 ? `暂不能触发：${disabledReasons.join("；")}` : "将基于 Admin 当前组织主模型触发一次受控 publish attempt。"}
          description="该操作只发布 gateway organization projection 输入，不写 gateway 授权事实，也不证明 API/Gateway/Insight 授权成功。"
          style={{marginBottom: 12}}
        />
        {result && (
          <Space wrap>
            <Tag color={result.status === "ok" ? "green" : "orange"}>{result.status || "unknown"}</Tag>
            <Tag>accepted: {String(!!result.accepted)}</Tag>
            <Tag>idempotent: {String(!!result.idempotent)}</Tag>
            <Tag>retryable: {String(!!result.retryable)}</Tag>
            <Tag>subjects: {result.subjectCount || 0}</Tag>
            <Tag>skipped: {result.skippedSubjectCount || 0}</Tag>
            {result.failureCategory && <Tag color="red">{result.failureCategory}</Tag>}
            {result.projectionBatchId && <Text type="secondary">{result.projectionBatchId}</Text>}
          </Space>
        )}
      </Card>
    );
  }

  renderPublishAttemptHistory() {
    const attempts = this.state.publishAttempts || [];
    const detail = this.state.attemptDetail || {};
    const skippedByReason = detail.skippedByReason || {};
    const metadata = detail.metadata || {};
    const columns = [
      {
        title: "时间",
        dataIndex: "createdAt",
        width: 180,
        render: value => value ? new Date(value).toLocaleString() : "-",
      },
      {
        title: "来源",
        dataIndex: "source",
        width: 110,
        render: value => <Tag>{publishAttemptSourceLabels[value] || value || "-"}</Tag>,
      },
      {
        title: "状态",
        dataIndex: "status",
        width: 100,
        render: value => <Tag color={value === "ok" ? "green" : "orange"}>{publishAttemptStatusLabels[value] || value || "unknown"}</Tag>,
      },
      {
        title: "失败分类",
        dataIndex: "failureCategory",
        width: 190,
        render: value => value ? <Tag color="red">{value}</Tag> : <Text type="secondary">-</Text>,
      },
      {
        title: "结果",
        width: 260,
        render: (_, record) => (
          <Space wrap>
            <Tag>accepted: {String(!!record.accepted)}</Tag>
            <Tag>idempotent: {String(!!record.idempotent)}</Tag>
            <Tag>retryable: {String(!!record.retryable)}</Tag>
          </Space>
        ),
      },
      {
        title: "主体",
        width: 190,
        render: (_, record) => (
          <Space wrap>
            <Tag>{record.subjectCount || 0}</Tag>
            <Tag color="green">A {record.activeSubjectCount || 0}</Tag>
            <Tag color="blue">T {record.tombstoneSubjectCount || 0}</Tag>
            <Tag color="orange">S {record.skippedSubjectCount || 0}</Tag>
          </Space>
        ),
      },
      {
        title: "版本",
        width: 220,
        render: (_, record) => (
          <Space direction="vertical" size={0}>
            <Text type="secondary">orgVersion: {record.orgVersion || "-"}</Text>
            <Text type="secondary">source: {record.sourceVersion || "-"}</Text>
          </Space>
        ),
      },
      {
        title: "耗时",
        dataIndex: "durationMs",
        width: 100,
        render: value => `${value || 0} ms`,
      },
      {
        title: i18next.t("general:Action"),
        width: 100,
        render: (_, record) => <Button onClick={() => this.openPublishAttemptDetail(record)}>详情</Button>,
      },
    ];

    return (
      <Card
        type="inner"
        title="Gateway projection publish attempt history"
        style={{marginBottom: 12}}
        extra={
          <Space wrap>
            <Select
              value={this.state.attemptSource}
              style={{width: 130}}
              options={[
                Setting.getOption("全部来源", ""),
                Setting.getOption("手动", "manual"),
                Setting.getOption("定时/同步", "scheduled"),
              ]}
              onChange={value => this.changeAttemptFilter("attemptSource", value)}
            />
            <Select
              value={this.state.attemptStatus}
              style={{width: 120}}
              options={[
                Setting.getOption("全部状态", ""),
                Setting.getOption("成功", "ok"),
                Setting.getOption("失败", "error"),
              ]}
              onChange={value => this.changeAttemptFilter("attemptStatus", value)}
            />
            <Select
              value={this.state.attemptTimeWindow}
              style={{width: 130}}
              options={[
                Setting.getOption("全部时间", ""),
                Setting.getOption("近 1 小时", "1h"),
                Setting.getOption("近 24 小时", "24h"),
              ]}
              onChange={value => this.changeAttemptFilter("attemptTimeWindow", value)}
            />
            <Button icon={<ReloadOutlined />} loading={this.state.attemptsLoading} onClick={() => this.refreshGatewayProjectionPublishAttempts()}>
              {i18next.t("general:Refresh")}
            </Button>
          </Space>
        }
      >
        <Alert
          type="info"
          showIcon
          message="Attempt history 只记录 Admin producer 脱敏诊断，不是 gateway authorization facts。"
          style={{marginBottom: 12}}
        />
        <Table
          rowKey={(record) => record.attemptId}
          columns={columns}
          dataSource={attempts}
          pagination={false}
          loading={this.state.attemptsLoading}
          size="small"
          scroll={{x: 1500}}
        />
        <Drawer
          width={560}
          title="Publish attempt 详情"
          open={this.state.attemptDetailVisible}
          onClose={() => this.setState({attemptDetailVisible: false})}
        >
          <Space direction="vertical" style={{width: "100%"}} size="middle">
            <Alert
              type={detail.status === "ok" ? "success" : "warning"}
              showIcon
              message={`${publishAttemptSourceLabels[detail.source] || detail.source || "unknown"} / ${publishAttemptStatusLabels[detail.status] || detail.status || "unknown"}`}
              description="详情只展示脱敏 producer 摘要，不包含 raw payload、凭据或完整主体明细。"
            />
            <Space wrap>
              <Tag>attemptId: {detail.attemptId || "-"}</Tag>
              {detail.traceId && <Tag>traceId: {detail.traceId}</Tag>}
              {detail.projectionBatchId && <Tag>batch: {detail.projectionBatchId}</Tag>}
              {detail.failureCategory && <Tag color="red">{detail.failureCategory}</Tag>}
            </Space>
            <Space wrap>
              <Tag>accepted: {String(!!detail.accepted)}</Tag>
              <Tag>idempotent: {String(!!detail.idempotent)}</Tag>
              <Tag>retryable: {String(!!detail.retryable)}</Tag>
              <Tag>attempts: {detail.attempts || 0}</Tag>
              <Tag>duration: {detail.durationMs || 0} ms</Tag>
            </Space>
            <Space wrap>
              <Tag>subjects: {detail.subjectCount || 0}</Tag>
              <Tag>active: {detail.activeSubjectCount || 0}</Tag>
              <Tag>tombstone: {detail.tombstoneSubjectCount || 0}</Tag>
              <Tag>skipped: {detail.skippedSubjectCount || 0}</Tag>
            </Space>
            <div>
              <Text strong>Skipped reasons</Text>
              <div style={{marginTop: 8}}>
                {Object.keys(skippedByReason).length === 0 && <Text type="secondary">无</Text>}
                {Object.entries(skippedByReason).map(([key, value]) => <Tag key={key}>{key}: {value}</Tag>)}
              </div>
            </div>
            <div>
              <Text strong>Metadata</Text>
              <div style={{marginTop: 8}}>
                {Object.keys(metadata).length === 0 && <Text type="secondary">无</Text>}
                {Object.entries(metadata).map(([key, value]) => <Tag key={key}>{key}: {value}</Tag>)}
              </div>
            </div>
          </Space>
        </Drawer>
      </Card>
    );
  }

  renderOrganizationMasterDataQuality() {
    const quality = this.state.masterDataQuality;
    const counts = quality?.counts || {};
    const status = quality?.status || "unknown";
    const statusColor = status === "ready" ? "green" : status === "blocked" ? "red" : "orange";
    const alertType = status === "ready" ? "success" : status === "blocked" ? "error" : "warning";
    const checks = quality?.qualityChecks || [];
    const columns = [
      {
        title: "Alias",
        dataIndex: "alias",
        width: 260,
      },
      {
        title: "状态",
        dataIndex: "status",
        width: 120,
        render: value => <Tag color={value === "ready" ? "green" : value === "blocked" ? "red" : "orange"}>{value}</Tag>,
      },
      {
        title: "数量",
        dataIndex: "count",
        width: 100,
      },
      {
        title: "摘要",
        dataIndex: "summary",
      },
    ];

    return (
      <Card
        type="inner"
        title={this.renderTitleWithTip("组织主数据质量 readiness", titleTips.masterDataQuality)}
        style={{marginBottom: 12}}
        extra={
          <Button icon={<ReloadOutlined />} loading={this.state.masterDataQualityLoading} onClick={() => this.refreshOrganizationMasterDataQuality()}>
            {i18next.t("general:Refresh")}
          </Button>
        }
      >
        <Alert
          type={alertType}
          showIcon
          message={<span>质量状态：<Tag color={statusColor}>{status}</Tag></span>}
          description="该摘要只服务 Admin producer 前置排障，不写 gateway 授权事实，也不证明 API/Gateway/Insight 授权成功。"
          style={{marginBottom: 12}}
        />
        <Space wrap style={{marginBottom: 12}}>
          <Tag>source: {counts.sourceConnectionCount || 0}</Tag>
          <Tag>departments: {counts.departmentCount || 0}</Tag>
          <Tag>subjects: {counts.userCount || 0}</Tag>
          <Tag>memberships: {counts.membershipCount || 0}</Tag>
          <Tag color={(counts.publishableSubjectCount || 0) > 0 ? "green" : "orange"}>publishable: {counts.publishableSubjectCount || 0}</Tag>
          <Tag>unmapped: {counts.unmappedSubjectCount || 0}</Tag>
          <Tag>untrusted: {counts.untrustedMappingCount || 0}</Tag>
        </Space>
        {(quality?.reasonAliases || []).length > 0 && (
          <Space wrap style={{marginBottom: 12}}>
            {(quality.reasonAliases || []).map(alias => <Tag key={alias} color={status === "blocked" ? "red" : "orange"}>{alias}</Tag>)}
          </Space>
        )}
        <Space wrap style={{marginBottom: 12}}>
          <Tag>syncLineage: {String(!!quality?.syncBatch?.hasUsableLineage)}</Tag>
          <Tag>sourceFreshnessStale: {String(!!quality?.sourceConnectionSummary?.hasStaleFreshness)}</Tag>
          <Tag>sourceFreshnessUnavailable: {String(!!quality?.sourceConnectionSummary?.hasUnavailableFreshness)}</Tag>
        </Space>
        <Table
          rowKey={(record) => record.alias}
          columns={columns}
          dataSource={checks}
          pagination={false}
          loading={this.state.masterDataQualityLoading}
          size="small"
          scroll={{x: 900}}
        />
      </Card>
    );
  }

  renderReadinessGuidance() {
    const guidance = this.getDisplayedReadinessGuidance();
    if (guidance.length === 0) {
      return null;
    }

    return (
      <div style={{marginBottom: 12}}>
        {guidance.map(item => (
          <div
            key={item.category}
            style={{
              border: "1px solid #d9d9d9",
              borderRadius: 6,
              padding: 12,
              marginBottom: 8,
              background: "#fff",
            }}
          >
            <Space wrap style={{marginBottom: 8}}>
              <Tag color="blue">{getReadinessCategoryLabel(item.category)}</Tag>
              <Text strong>{item.summary}</Text>
              <Text type="secondary">{item.code}</Text>
            </Space>
            <ul style={{margin: 0, paddingLeft: 20}}>
              {(item.operatorActions || []).map(action => (
                <li key={action}>{action}</li>
              ))}
              <li>最小解除条件：{item.minimumUnblockCondition}</li>
              <li>边界：{item.boundary}</li>
            </ul>
          </div>
        ))}
      </div>
    );
  }

  renderUserMappingTable() {
    const columns = [
      {
        title: this.renderTitleWithTip("平台主体", titleTips.adminSubject),
        dataIndex: "adminSubject",
        width: 260,
        render: (text, record, index) => (
          <Input value={text} placeholder={`${this.state.organization}/user-name`} onChange={e => this.updateUserMapping(index, "adminSubject", e.target.value)} />
        ),
      },
      {
        title: this.renderTitleWithTip("AICodex API 用户 ID", titleTips.apiUserId),
        dataIndex: "apiUserId",
        width: 220,
        render: (text, record, index) => (
          <Input value={text} placeholder="AICodex API 用户 ID" onChange={e => this.updateUserMapping(index, "apiUserId", e.target.value)} />
        ),
      },
      {
        title: this.renderTitleWithTip("映射状态", titleTips.mappingStatus),
        dataIndex: "mappingStatus",
        width: 220,
        render: (text, record, index) => (
          <Select
            value={normalizeMappingStatus(text)}
            options={getMappingStatusOptions()}
            onChange={value => this.updateUserMapping(index, "mappingStatus", value)}
            style={{width: "100%"}}
          />
        ),
      },
      {
        title: this.renderTitleWithTip("映射来源", titleTips.mappingSource),
        dataIndex: "mappingSource",
        width: 210,
        render: (text, record, index) => (
          <Select
            value={normalizeMappingSource(text)}
            options={getMappingSourceOptions(text)}
            onChange={value => this.updateUserMapping(index, "mappingSource", value)}
            style={{width: "100%"}}
          />
        ),
      },
      {
        title: i18next.t("general:Action"),
        width: 110,
        render: (text, record, index) => (
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={this.state.savingKey === `user-${index}`}
            onClick={() => this.saveUserMapping(record, index)}
          >
            {i18next.t("general:Save")}
          </Button>
        ),
      },
    ];
    return (
      <Table
        rowKey={(record) => record.name || `${record.organizationId || "new"}-${record.adminSubject || record.apiUserId || ""}`}
        columns={columns}
        dataSource={this.state.userMappings}
        pagination={getTablePaginationProps(this.state.userPagination)}
        loading={this.state.userLoading}
        scroll={{x: 1000}}
        onChange={this.handleUserTableChange}
      />
    );
  }

  renderReadinessSummary() {
    const readiness = this.state.readiness;
    const counts = readiness?.counts || {};
    const candidates = readiness?.candidates || [];
    const columns = [
      {
        title: "平台主体",
        dataIndex: "adminSubject",
        width: 260,
      },
      {
        title: "Readiness",
        dataIndex: "readinessCategory",
        width: 210,
        render: value => <Tag color={value === "active_publishable" || value === "tombstone_publishable" ? "green" : "orange"}>{getReadinessCategoryLabel(value)}</Tag>,
      },
      {
        title: "映射状态",
        dataIndex: "platformMappingStatus",
        width: 160,
        render: value => this.renderStatus(value),
      },
      {
        title: "API 用户 ID",
        dataIndex: "apiUserId",
        width: 180,
        render: value => value || <Text type="secondary">未确认</Text>,
      },
    ];

    return (
      <Card
        type="inner"
        title={this.renderTitleWithTip("可发布主体 readiness", titleTips.readiness)}
        style={{marginBottom: 12}}
        extra={
          <Space wrap>
            <Select
              value={this.state.readinessCategory}
              options={getReadinessCategoryOptions()}
              style={{width: 210}}
              onChange={value => this.changeReadinessFilter("readinessCategory", value)}
            />
            <Select
              value={this.state.readinessMappingStatus}
              options={[Setting.getOption("全部映射状态", ""), ...getMappingStatusOptions()]}
              style={{width: 160}}
              onChange={value => this.changeReadinessFilter("readinessMappingStatus", value)}
            />
            <Button icon={<ReloadOutlined />} loading={this.state.readinessLoading} onClick={() => this.refreshUserMappingReadiness()}>
              {i18next.t("general:Refresh")}
            </Button>
          </Space>
        }
      >
        <Alert
          type="info"
          showIcon
          message="subjectCount=0 且 mapping_missing 只表示没有可发布主体 fixture，不代表完整 projection 业务成功。"
          style={{marginBottom: 12}}
        />
        <Space wrap style={{marginBottom: 12}}>
          {readinessCategories.map(category => (
            <Tag key={category} color={counts[category] > 0 ? "blue" : "default"}>
              {getReadinessCategoryLabel(category)}: {counts[category] || 0}
            </Tag>
          ))}
          <Tag>总主体: {readiness?.totalSubjectCount || 0}</Tag>
        </Space>
        {this.renderReadinessGuidance()}
        <Table
          rowKey={(record) => record.adminSubject}
          columns={columns}
          dataSource={candidates}
          pagination={false}
          loading={this.state.readinessLoading}
          size="small"
          scroll={{x: 800}}
        />
      </Card>
    );
  }

  renderOrganizationMappingTab() {
    return (
      <Card
        type="inner"
        title={this.renderTitleWithTip("平台组织映射", titleTips.organizationMapping)}
        extra={<Button icon={<PlusOutlined />} onClick={() => this.addOrganizationMapping()}>{i18next.t("general:Add")}</Button>}
      >
        {this.state.organizationMappings.length > 0 && this.renderStatus(this.state.organizationMappings[0]?.mappingStatus)}
        <div style={{marginTop: 12}}>
          {this.renderOrganizationMappingTable()}
        </div>
      </Card>
    );
  }

  renderUserMappingTab() {
    return (
      <Card
        type="inner"
        title={this.renderTitleWithTip("用户映射", titleTips.userMapping)}
        extra={
          <Space wrap>
            <Search
              allowClear
              placeholder="搜索平台主体或 API 用户 ID"
              style={{width: 320}}
              onSearch={value => this.searchUserMappings(value)}
            />
            <Button icon={<PlusOutlined />} onClick={() => this.addUserMapping()}>{i18next.t("general:Add")}</Button>
          </Space>
        }
      >
        {this.renderOrganizationMasterDataQuality()}
        {this.renderReadinessSummary()}
        {this.renderGatewayProjectionRunReadiness()}
        {this.renderGatewayProjectionIngestionStatus()}
        {this.renderManualPublishConsole()}
        {this.renderPublishAttemptHistory()}
        {this.renderUserMappingTable()}
      </Card>
    );
  }

  render() {
    return (
      <Card
        title={
          <Space wrap>
            {this.renderTitleWithTip("AICodex API 组织与账号映射", titleTips.platformApiMappings)}
            {this.state.organization && <Text type="secondary">{this.state.organization}</Text>}
          </Space>
        }
        extra={
          <Space wrap>
            <OrganizationSelect
              initValue={this.state.organization}
              style={{width: 240}}
              excludedOrganizations={["built-in"]}
              onChange={value => this.changeOrganization(value)}
            />
            <Button icon={<ReloadOutlined />} onClick={() => this.refresh()} loading={this.getActiveLoading()}>
              刷新
            </Button>
          </Space>
        }
      >
        <Alert
          type="info"
          showIcon
          style={{marginBottom: 16}}
          message="认证中心到 AICodex API 的网关身份映射"
          description="维护认证中心组织/账号到 aicodex-api 业务组织、网关账号和用量身份的权威映射。只有“已确认”状态的映射会被授权入口、用户信息接口、Insight 数据接口和网关投影作为权威来源。"
        />

        <Tabs
          activeKey={this.state.activeTabKey}
          onChange={key => this.changeTab(key)}
          items={[
            {
              key: "organization",
              label: "平台组织映射",
              children: this.renderOrganizationMappingTab(),
            },
            {
              key: "user",
              label: "用户映射",
              children: this.renderUserMappingTab(),
            },
          ]}
        />
      </Card>
    );
  }
}

export default PlatformApiMappingPage;
