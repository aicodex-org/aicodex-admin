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
const publishAttemptCleanupReasonLabels = {
  within_retention_window: "保留期内",
  retention_expired_with_diagnostic_summary: "保留期已过且有脱敏摘要",
  retention_expired_missing_diagnostic_summary: "保留期已过但缺少排障摘要",
  created_at_missing: "缺少创建时间",
};
const cleanupApprovalPolicyEvidenceAliases = "dry_run_export_reviewed,candidate_count_reviewed,receipt_hint_coverage_reviewed,no_blocked_attempts_confirmed";
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

function getPublishAttemptCleanupReasonLabel(reason) {
  return publishAttemptCleanupReasonLabels[reason] || reason || "-";
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
      retentionReadinessLoading: false,
      cleanupDryRunLoading: false,
      cleanupExecuteReadinessLoading: false,
      cleanupApprovalPolicyLoading: false,
      cleanupApprovalAuditLoading: false,
      cleanupApprovalAuditRecording: false,
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
      retentionReadiness: null,
      cleanupDryRun: null,
      cleanupExecuteReadiness: null,
      cleanupApprovalPolicyReadiness: null,
      cleanupApprovalAuditTrail: null,
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
      this.refreshGatewayProjectionPublishAttemptRetentionReadiness(organization, {source, status, timeWindow});
      this.refreshGatewayProjectionPublishAttemptCleanupDryRun(organization, {source, status});
      this.refreshGatewayProjectionPublishAttemptCleanupExecuteReadiness(organization, {source, status});
      this.refreshGatewayProjectionPublishAttemptCleanupApprovalPolicyReadiness(organization);
      this.refreshGatewayProjectionPublishAttemptCleanupApprovalAuditTrail(organization);
    }).catch(error => {
      this.setState({attemptsLoading: false});
      Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
    });
  }

  refreshGatewayProjectionPublishAttemptRetentionReadiness(organization = this.state.organization, options = {}) {
    if (!organization) {
      return Promise.resolve();
    }
    const source = options.source !== undefined ? options.source : this.state.attemptSource;
    const status = options.status !== undefined ? options.status : this.state.attemptStatus;
    const timeWindow = options.timeWindow !== undefined ? options.timeWindow : this.state.attemptTimeWindow;

    this.setState({retentionReadinessLoading: true});
    return PlatformApiMappingBackend.getGatewayProjectionPublishAttemptRetentionReadiness(organization, {
      source,
      status,
      from: this.getAttemptFromTime(timeWindow),
      limit: 100,
    }).then((res) => {
      if (res.status === "error") {
        Setting.showMessage("error", res.msg);
      }
      this.setState({
        retentionReadinessLoading: false,
        retentionReadiness: res.status === "ok" ? res.data : null,
      });
    }).catch(error => {
      this.setState({retentionReadinessLoading: false});
      Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
    });
  }

  refreshGatewayProjectionPublishAttemptCleanupDryRun(organization = this.state.organization, options = {}) {
    if (!organization) {
      return Promise.resolve();
    }
    const source = options.source !== undefined ? options.source : this.state.attemptSource;
    const status = options.status !== undefined ? options.status : this.state.attemptStatus;

    this.setState({cleanupDryRunLoading: true});
    return PlatformApiMappingBackend.getGatewayProjectionPublishAttemptCleanupDryRun(organization, {
      source,
      status,
      limit: 100,
    }).then((res) => {
      if (res.status === "error") {
        Setting.showMessage("error", res.msg);
      }
      this.setState({
        cleanupDryRunLoading: false,
        cleanupDryRun: res.status === "ok" ? res.data : null,
      });
    }).catch(error => {
      this.setState({cleanupDryRunLoading: false});
      Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
    });
  }

  refreshGatewayProjectionPublishAttemptCleanupExecuteReadiness(organization = this.state.organization, options = {}) {
    if (!organization) {
      return Promise.resolve();
    }
    const source = options.source !== undefined ? options.source : this.state.attemptSource;
    const status = options.status !== undefined ? options.status : this.state.attemptStatus;

    this.setState({cleanupExecuteReadinessLoading: true});
    return PlatformApiMappingBackend.getGatewayProjectionPublishAttemptCleanupExecuteReadiness(organization, {
      source,
      status,
      limit: 100,
    }).then((res) => {
      if (res.status === "error") {
        Setting.showMessage("error", res.msg);
      }
      this.setState({
        cleanupExecuteReadinessLoading: false,
        cleanupExecuteReadiness: res.status === "ok" ? res.data : null,
      });
      if (res.status === "ok") {
        this.refreshGatewayProjectionPublishAttemptCleanupApprovalAuditTrail(organization, {
          readinessHash: res.data?.dryRunHash,
        });
        this.refreshGatewayProjectionPublishAttemptCleanupApprovalPolicyReadiness(organization, {
          readinessHash: res.data?.dryRunHash,
        });
      }
    }).catch(error => {
      this.setState({cleanupExecuteReadinessLoading: false});
      Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
    });
  }

  refreshGatewayProjectionPublishAttemptCleanupApprovalAuditTrail(organization = this.state.organization, options = {}) {
    if (!organization) {
      return Promise.resolve();
    }
    const readinessHash = options.readinessHash !== undefined ? options.readinessHash : this.state.cleanupExecuteReadiness?.dryRunHash;

    this.setState({cleanupApprovalAuditLoading: true});
    return PlatformApiMappingBackend.getGatewayProjectionPublishAttemptCleanupApprovalAuditTrail(organization, {
      readinessHash,
      limit: 20,
    }).then((res) => {
      if (res.status === "error") {
        Setting.showMessage("error", res.msg);
      }
      this.setState({
        cleanupApprovalAuditLoading: false,
        cleanupApprovalAuditTrail: res.status === "ok" ? res.data : null,
      });
    }).catch(error => {
      this.setState({cleanupApprovalAuditLoading: false});
      Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
    });
  }

  refreshGatewayProjectionPublishAttemptCleanupApprovalPolicyReadiness(organization = this.state.organization, options = {}) {
    if (!organization) {
      return Promise.resolve();
    }
    const source = options.source !== undefined ? options.source : this.state.attemptSource;
    const status = options.status !== undefined ? options.status : this.state.attemptStatus;
    const readinessHash = options.readinessHash !== undefined ? options.readinessHash : this.state.cleanupExecuteReadiness?.dryRunHash;

    this.setState({cleanupApprovalPolicyLoading: true});
    return PlatformApiMappingBackend.getGatewayProjectionPublishAttemptCleanupApprovalPolicyReadiness(organization, {
      source,
      status,
      readinessHash,
      approvalEvidence: cleanupApprovalPolicyEvidenceAliases,
      limit: 100,
    }).then((res) => {
      if (res.status === "error") {
        Setting.showMessage("error", res.msg);
      }
      this.setState({
        cleanupApprovalPolicyLoading: false,
        cleanupApprovalPolicyReadiness: res.status === "ok" ? res.data : null,
      });
    }).catch(error => {
      this.setState({cleanupApprovalPolicyLoading: false});
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
      retentionReadiness: null,
      cleanupDryRun: null,
      cleanupExecuteReadiness: null,
      cleanupApprovalPolicyReadiness: null,
      cleanupApprovalAuditTrail: null,
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

  queryGatewayReceiptFromAttempt(detail = this.state.attemptDetail || {}) {
    const hint = detail.receiptQueryHint || {};
    if (!hint.available) {
      return;
    }

    this.refreshGatewayProjectionIngestionStatus(hint.organizationId || this.state.organization, {
      latest: hint.latest,
      projectionBatchId: hint.projectionBatchId,
      orgVersion: hint.orgVersion,
      sourceVersion: hint.sourceVersion,
    });
    this.setState({attemptDetailVisible: false});
  }

  copyCleanupExecuteReadinessExport(action = "copy") {
    const readiness = this.state.cleanupExecuteReadiness;
    if (!readiness) {
      Setting.showMessage("warning", "cleanup execute readiness 尚未加载");
      return;
    }
    const exportPayload = readiness.export || {
      generatedAt: readiness.generatedAt,
      readiness: readiness.readiness,
      safeNextAction: readiness.safeNextAction,
      disabledReasons: readiness.disabledReasons || [],
      dryRunId: readiness.dryRunId,
      dryRunHash: readiness.dryRunHash,
      retentionPolicyVersion: readiness.retentionPolicyVersion,
      filters: readiness.filters || {},
      candidateCount: readiness.candidateCount || 0,
      blockedCount: readiness.blockedCount || 0,
      lastDryRunFreshness: readiness.lastDryRunFreshness || {},
      operatorApproval: readiness.operatorApproval || {},
      executeGuardrail: readiness.executeGuardrail || {},
    };
    const text = JSON.stringify(exportPayload, null, 2);
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      Promise.resolve(navigator.clipboard.writeText(text)).then(() => {
        Setting.showMessage("success", "已复制脱敏 readiness JSON");
        this.recordCleanupApprovalAuditAction(action);
      }).catch(error => {
        Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
      });
      return;
    }
    Setting.showMessage("warning", "当前浏览器不支持自动复制，请从只读响应中导出");
  }

  copyCleanupApprovalAuditTrailExport() {
    const trail = this.state.cleanupApprovalAuditTrail;
    if (!trail) {
      Setting.showMessage("warning", "cleanup approval audit trail 尚未加载");
      return;
    }
    const text = JSON.stringify(trail.export || {
      generatedAt: trail.generatedAt,
      storageScope: trail.storageScope,
      filters: trail.filters || {},
      summary: trail.summary || {},
      records: trail.records || [],
    }, null, 2);
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      Promise.resolve(navigator.clipboard.writeText(text)).then(() => {
        Setting.showMessage("success", "已复制脱敏 approval audit JSON");
        this.recordCleanupApprovalAuditAction("export");
      }).catch(error => {
        Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
      });
      return;
    }
    Setting.showMessage("warning", "当前浏览器不支持自动复制，请从只读响应中导出");
  }

  copyCleanupApprovalPolicyReadinessExport() {
    const policy = this.state.cleanupApprovalPolicyReadiness;
    if (!policy) {
      Setting.showMessage("warning", "cleanup approval policy readiness 尚未加载");
      return;
    }
    const text = JSON.stringify(policy.export || {
      generatedAt: policy.generatedAt,
      policyVersion: policy.policyVersion,
      policyStatus: policy.policyStatus,
      storageScope: policy.storageScope,
      retentionPolicyVersion: policy.retentionPolicyVersion,
      approvalAuditStorageScope: policy.approvalAuditStorageScope,
      readinessHash: policy.readinessHash,
      dryRunId: policy.dryRunId,
      safeNextAction: policy.safeNextAction,
      candidateCount: policy.candidateCount || 0,
      blockedCount: policy.blockedCount || 0,
      manualReview: policy.manualReview || {},
      cannotInfer: policy.cannotInfer || {},
      policyGates: policy.policyGates || [],
      auditSummary: policy.auditSummary || {},
      executeGuardrail: policy.executeGuardrail || {},
    }, null, 2);
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      Promise.resolve(navigator.clipboard.writeText(text)).then(() => {
        Setting.showMessage("success", "已复制脱敏 approval policy JSON");
        this.recordCleanupApprovalAuditAction("export");
      }).catch(error => {
        Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
      });
      return;
    }
    Setting.showMessage("warning", "当前浏览器不支持自动复制，请从只读响应中导出");
  }

  recordCleanupApprovalAuditAction(action) {
    const readiness = this.state.cleanupExecuteReadiness;
    if (!this.state.organization || !readiness) {
      Setting.showMessage("warning", "cleanup execute readiness 尚未加载");
      return Promise.resolve();
    }
    this.setState({cleanupApprovalAuditRecording: true});
    return PlatformApiMappingBackend.recordGatewayProjectionPublishAttemptCleanupApprovalAuditTrail({
      organizationId: this.state.organization,
      action,
      readinessHash: readiness.dryRunHash,
      dryRunId: readiness.dryRunId,
      retentionPolicyVersion: readiness.retentionPolicyVersion,
      candidateCount: readiness.candidateCount || 0,
      blockedCount: readiness.blockedCount || 0,
      disabledReasons: readiness.disabledReasons || [],
      safeNextAction: readiness.safeNextAction || "",
    }).then((res) => {
      this.setState({cleanupApprovalAuditRecording: false});
      if (res.status === "error") {
        Setting.showMessage("error", res.msg);
        return;
      }
      Setting.showMessage("success", `已记录 ${action} 审计动作`);
      this.refreshGatewayProjectionPublishAttemptCleanupApprovalAuditTrail(this.state.organization, {
        readinessHash: readiness.dryRunHash,
      });
      this.refreshGatewayProjectionPublishAttemptCleanupApprovalPolicyReadiness(this.state.organization, {
        readinessHash: readiness.dryRunHash,
      });
    }).catch(error => {
      this.setState({cleanupApprovalAuditRecording: false});
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
      this.refreshGatewayProjectionPublishAttemptRetentionReadiness();
      this.refreshGatewayProjectionPublishAttemptCleanupDryRun();
      this.refreshGatewayProjectionPublishAttemptCleanupExecuteReadiness();
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
    const retentionReadiness = this.state.retentionReadiness;
    const cleanupDryRun = this.state.cleanupDryRun;
    const cleanupExecuteReadiness = this.state.cleanupExecuteReadiness;
    const cleanupApprovalPolicyReadiness = this.state.cleanupApprovalPolicyReadiness;
    const cleanupApprovalAuditTrail = this.state.cleanupApprovalAuditTrail || {};
    const reasonCounts = retentionReadiness?.reasonCounts || {};
    const cleanupReasonCounts = cleanupDryRun?.reasonCounts || {};
    const cleanupGuardrail = cleanupDryRun?.executeGuardrail || {};
    const diagnosticCompleteness = cleanupDryRun?.diagnosticCompleteness || {};
    const receiptHintCoverage = cleanupDryRun?.receiptHintCoverage || {};
    const executeFreshness = cleanupExecuteReadiness?.lastDryRunFreshness || {};
    const executeApproval = cleanupExecuteReadiness?.operatorApproval || {};
    const executeGuardrail = cleanupExecuteReadiness?.executeGuardrail || {};
    const policyManualReview = cleanupApprovalPolicyReadiness?.manualReview || {};
    const policyCannotInfer = cleanupApprovalPolicyReadiness?.cannotInfer || {};
    const policyGates = cleanupApprovalPolicyReadiness?.policyGates || [];
    const policyAuditSummary = cleanupApprovalPolicyReadiness?.auditSummary || {};
    const auditSummary = cleanupApprovalAuditTrail.summary || {};
    const auditActionCounts = auditSummary.actionCounts || {};
    const auditStateCounts = auditSummary.approvalStateCounts || {};
    const auditRecords = cleanupApprovalAuditTrail.records || [];
    const detail = this.state.attemptDetail || {};
    const detailRetention = detail.retention || {};
    const receiptHint = detail.receiptQueryHint || {};
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
        title: "Retention",
        width: 240,
        render: (_, record) => {
          const retention = record.retention || {};
          return (
            <Space direction="vertical" size={0}>
              <Text type={retention.cleanupEligible ? "warning" : "secondary"}>
                cleanupEligible: {String(!!retention.cleanupEligible)}
              </Text>
              <Text type="secondary">{getPublishAttemptCleanupReasonLabel(retention.cleanupReason)}</Text>
              {retention.expiresAt && <Text type="secondary">expiresAt: {retention.expiresAt}</Text>}
            </Space>
          );
        },
      },
      {
        title: i18next.t("general:Action"),
        width: 100,
        render: (_, record) => <Button onClick={() => this.openPublishAttemptDetail(record)}>详情</Button>,
      },
    ];
    const auditColumns = [
      {
        title: "动作",
        dataIndex: "action",
        width: 110,
        render: value => <Tag>{value || "-"}</Tag>,
      },
      {
        title: "审批状态",
        dataIndex: "approvalState",
        width: 150,
        render: value => <Tag color="blue">{value || "-"}</Tag>,
      },
      {
        title: "候选/阻断",
        width: 120,
        render: (_, record) => `${record.candidateCount || 0}/${record.blockedCount || 0}`,
      },
      {
        title: "safeNextAction",
        dataIndex: "safeNextAction",
        width: 180,
        render: value => value || "-",
      },
      {
        title: "时间",
        dataIndex: "createdAt",
        width: 180,
        render: value => value ? new Date(value).toLocaleString() : "-",
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
        <Alert
          type={retentionReadiness?.cleanupEligibleCount > 0 ? "warning" : "info"}
          showIcon
          message="Publish attempt retention readiness"
          description={
            <Space wrap>
              <Tag>total: {retentionReadiness?.total || 0}</Tag>
              <Tag color="orange">cleanupEligible: {retentionReadiness?.cleanupEligibleCount || 0}</Tag>
              <Tag>blocked: {retentionReadiness?.blockedCount || 0}</Tag>
              <Tag>windowSeconds: {retentionReadiness?.retentionWindowSeconds || 0}</Tag>
              {Object.entries(reasonCounts).map(([key, value]) => (
                <Tag key={key}>{getPublishAttemptCleanupReasonLabel(key)}: {value}</Tag>
              ))}
              <Text type="secondary">只读展示 cleanup readiness，不执行删除。</Text>
            </Space>
          }
          style={{marginBottom: 12}}
        />
        <Card
          type="inner"
          size="small"
          title="Cleanup dry-run guardrails"
          style={{marginBottom: 12}}
          extra={
            <Button
              icon={<ReloadOutlined />}
              loading={this.state.cleanupDryRunLoading}
              onClick={() => this.refreshGatewayProjectionPublishAttemptCleanupDryRun()}
            >
              刷新 dry-run
            </Button>
          }
        >
          <Alert
            type={cleanupDryRun?.candidateCount > 0 ? "warning" : "info"}
            showIcon
            message={`Dry-run: ${cleanupDryRun?.operatorActionSummary || "未加载"}`}
            description="P0 只生成只读计划和安全确认项，不执行 DB delete/update，也不声明 Gateway runtime authorization success。"
            style={{marginBottom: 12}}
          />
          <Space wrap style={{marginBottom: 8}}>
            <Tag>total: {cleanupDryRun?.total || 0}</Tag>
            <Tag color="orange">candidate: {cleanupDryRun?.candidateCount || 0}</Tag>
            <Tag>blocked: {cleanupDryRun?.blockedCount || 0}</Tag>
            <Tag>windowSeconds: {cleanupDryRun?.retentionWindowSeconds || 0}</Tag>
            <Tag>diagnosticComplete: {diagnosticCompleteness.completeCount || 0}</Tag>
            <Tag>diagnosticMissing: {diagnosticCompleteness.missingCount || 0}</Tag>
            <Tag>receiptHint: {receiptHintCoverage.availableCount || 0}/{(receiptHintCoverage.availableCount || 0) + (receiptHintCoverage.unavailableCount || 0)}</Tag>
            <Tag color={cleanupGuardrail.enabled ? "red" : "green"}>executeEnabled: {String(!!cleanupGuardrail.enabled)}</Tag>
            <Tag>dryRunOnly: {String(!!cleanupGuardrail.dryRunOnly)}</Tag>
            {cleanupGuardrail.disabledReason && <Tag>{cleanupGuardrail.disabledReason}</Tag>}
          </Space>
          <div style={{marginBottom: 8}}>
            {Object.entries(cleanupReasonCounts).map(([key, value]) => (
              <Tag key={key}>{getPublishAttemptCleanupReasonLabel(key)}: {value}</Tag>
            ))}
          </div>
          <Space wrap>
            {(cleanupDryRun?.safetyChecklist || []).map(item => <Tag key={item}>{item}</Tag>)}
          </Space>
        </Card>
        <Card
          type="inner"
          size="small"
          title="Cleanup execute readiness"
          style={{marginBottom: 12}}
          extra={
            <Space wrap>
              <Button
                icon={<ReloadOutlined />}
                loading={this.state.cleanupExecuteReadinessLoading}
                onClick={() => this.refreshGatewayProjectionPublishAttemptCleanupExecuteReadiness()}
              >
                刷新 readiness
              </Button>
              <Button onClick={() => this.copyCleanupExecuteReadinessExport()}>
                复制脱敏 JSON
              </Button>
            </Space>
          }
        >
          <Alert
            type={cleanupExecuteReadiness?.readiness === "blocked" ? "error" : cleanupExecuteReadiness?.readiness === "ready_for_approval" ? "success" : "warning"}
            showIcon
            message={`Execute readiness: ${cleanupExecuteReadiness?.readiness || "未加载"}`}
            description={`safeNextAction: ${cleanupExecuteReadiness?.safeNextAction || "等待 readiness"}。该门禁只用于 Admin producer 执行前审批判断，不执行 cleanup，也不是下游授权成功证据。`}
            style={{marginBottom: 12}}
          />
          <Space wrap style={{marginBottom: 8}}>
            <Tag>candidate: {cleanupExecuteReadiness?.candidateCount || 0}</Tag>
            <Tag>blocked: {cleanupExecuteReadiness?.blockedCount || 0}</Tag>
            <Tag>missingDiagnostic: {cleanupExecuteReadiness?.missingDiagnosticSummaryCount || 0}</Tag>
            <Tag>receiptHintAvailable: {cleanupExecuteReadiness?.receiptHintAvailableCount || 0}</Tag>
            <Tag>receiptHintMissing: {cleanupExecuteReadiness?.receiptHintMissingCount || 0}</Tag>
            <Tag>freshness: {executeFreshness.status || "unknown"}</Tag>
            <Tag>ageSeconds: {executeFreshness.ageSeconds || 0}</Tag>
            <Tag color={executeGuardrail.enabled ? "red" : "green"}>executeEnabled: {String(!!executeGuardrail.enabled)}</Tag>
            <Tag>dryRunOnly: {String(!!executeGuardrail.dryRunOnly)}</Tag>
          </Space>
          <Space wrap style={{marginBottom: 8}}>
            {cleanupExecuteReadiness?.dryRunId && <Tag>dryRunId: {cleanupExecuteReadiness.dryRunId}</Tag>}
            {cleanupExecuteReadiness?.dryRunHash && <Tag>dryRunHash: {cleanupExecuteReadiness.dryRunHash}</Tag>}
            {cleanupExecuteReadiness?.retentionPolicyVersion && <Tag>policy: {cleanupExecuteReadiness.retentionPolicyVersion}</Tag>}
          </Space>
          <div style={{marginBottom: 8}}>
            {(cleanupExecuteReadiness?.disabledReasons || []).map(reason => <Tag key={reason} color="orange">{reason}</Tag>)}
          </div>
          <Space wrap>
            <Tag>approvalRequired: {String(!!executeApproval.required)}</Tag>
            <Tag>approvalStatus: {executeApproval.status || "unknown"}</Tag>
            {(executeApproval.missingEvidenceAliases || []).map(item => <Tag key={item}>{item}</Tag>)}
          </Space>
        </Card>
        <Card
          type="inner"
          size="small"
          title="Cleanup approval policy readiness"
          style={{marginBottom: 12}}
          extra={
            <Space wrap>
              <Button
                icon={<ReloadOutlined />}
                loading={this.state.cleanupApprovalPolicyLoading}
                onClick={() => this.refreshGatewayProjectionPublishAttemptCleanupApprovalPolicyReadiness()}
              >
                刷新策略
              </Button>
              <Button disabled={!cleanupApprovalPolicyReadiness} onClick={() => this.copyCleanupApprovalPolicyReadinessExport()}>
                复制策略 JSON
              </Button>
            </Space>
          }
        >
          <Alert
            type={cleanupApprovalPolicyReadiness?.policyStatus === "blocked" ? "error" : cleanupApprovalPolicyReadiness?.policyStatus === "manual_review_ready" ? "success" : "warning"}
            showIcon
            message={`Approval policy: ${cleanupApprovalPolicyReadiness?.policyStatus || "未加载"}`}
            description={`safeNextAction: ${cleanupApprovalPolicyReadiness?.safeNextAction || "等待 policy readiness"}。该策略只读派生 manual review 和 cannotInfer，不创建真实 approval decision，也不打开 cleanup gate。`}
            style={{marginBottom: 12}}
          />
          <Space wrap style={{marginBottom: 8}}>
            <Tag>policyVersion: {cleanupApprovalPolicyReadiness?.policyVersion || "gateway_projection_cleanup_approval_policy.v1"}</Tag>
            <Tag>storage: {cleanupApprovalPolicyReadiness?.storageScope || "derived_policy_readiness_not_persisted"}</Tag>
            <Tag>auditStorage: {cleanupApprovalPolicyReadiness?.approvalAuditStorageScope || "admin_cleanup_approval_audit_trail.v1"}</Tag>
            <Tag>candidate: {cleanupApprovalPolicyReadiness?.candidateCount || 0}</Tag>
            <Tag>blocked: {cleanupApprovalPolicyReadiness?.blockedCount || 0}</Tag>
            <Tag>manualReview: {policyManualReview.status || "unknown"}</Tag>
            <Tag color={policyCannotInfer.value ? "orange" : "green"}>cannotInfer: {String(!!policyCannotInfer.value)}</Tag>
          </Space>
          <Space wrap style={{marginBottom: 8}}>
            {cleanupApprovalPolicyReadiness?.dryRunId && <Tag>dryRunId: {cleanupApprovalPolicyReadiness.dryRunId}</Tag>}
            {cleanupApprovalPolicyReadiness?.readinessHash && <Tag>readinessHash: {cleanupApprovalPolicyReadiness.readinessHash}</Tag>}
            <Tag>auditActions: {Object.values(policyAuditSummary.actionCounts || {}).reduce((sum, count) => sum + count, 0)}</Tag>
          </Space>
          <div style={{marginBottom: 8}}>
            {(policyManualReview.missingActionAliases || []).map(item => <Tag key={item} color="orange">{item}</Tag>)}
            {(policyCannotInfer.reasonAliases || []).map(item => <Tag key={item} color="red">{item}</Tag>)}
          </div>
          <Space wrap>
            {policyGates.map(gate => (
              <Tag key={gate.name} color={gate.status === "pass" ? "green" : gate.status === "blocked" ? "red" : "orange"}>
                {gate.name}: {gate.status}{gate.reasonAlias ? ` / ${gate.reasonAlias}` : ""}
              </Tag>
            ))}
          </Space>
        </Card>
        <Card
          type="inner"
          size="small"
          title="Cleanup approval audit trail"
          style={{marginBottom: 12}}
          extra={
            <Space wrap>
              <Button
                icon={<ReloadOutlined />}
                loading={this.state.cleanupApprovalAuditLoading}
                onClick={() => this.refreshGatewayProjectionPublishAttemptCleanupApprovalAuditTrail()}
              >
                刷新审计
              </Button>
              <Button
                loading={this.state.cleanupApprovalAuditRecording}
                disabled={!cleanupExecuteReadiness}
                onClick={() => this.recordCleanupApprovalAuditAction("approve")}
              >
                记录 approve 预览
              </Button>
              <Button
                loading={this.state.cleanupApprovalAuditRecording}
                disabled={!cleanupExecuteReadiness}
                onClick={() => this.recordCleanupApprovalAuditAction("reject")}
              >
                记录 reject 预览
              </Button>
              <Button
                loading={this.state.cleanupApprovalAuditRecording}
                disabled={!cleanupExecuteReadiness}
                onClick={() => this.recordCleanupApprovalAuditAction("refresh")}
              >
                记录 refresh
              </Button>
              <Button disabled={!cleanupExecuteReadiness} onClick={() => this.copyCleanupExecuteReadinessExport("copy")}>
                复制 readiness JSON
              </Button>
              <Button disabled={!cleanupApprovalAuditTrail.records} onClick={() => this.copyCleanupApprovalAuditTrailExport()}>
                导出审计 JSON
              </Button>
            </Space>
          }
        >
          <Alert
            type="info"
            showIcon
            message={`Approval audit storage: ${cleanupApprovalAuditTrail.storageScope || "admin_cleanup_approval_audit_trail.v1"}`}
            description="审批审计只记录 Admin producer 安全动作，不执行 cleanup，不写 Gateway facts，也不是 runtime authorization success。"
            style={{marginBottom: 12}}
          />
          <Space wrap style={{marginBottom: 8}}>
            <Tag>total: {cleanupApprovalAuditTrail.total || 0}</Tag>
            <Tag>candidateTotal: {auditSummary.candidateCount || 0}</Tag>
            <Tag>blockedTotal: {auditSummary.blockedCount || 0}</Tag>
            <Tag>disabledReasonAliases: {auditSummary.disabledReasonCount || 0}</Tag>
            {auditSummary.latestActionAt && <Tag>latest: {auditSummary.latestActionAt}</Tag>}
          </Space>
          <div style={{marginBottom: 8}}>
            {Object.entries(auditActionCounts).map(([key, value]) => <Tag key={key}>{key}: {value}</Tag>)}
            {Object.entries(auditStateCounts).map(([key, value]) => <Tag key={key} color="blue">{key}: {value}</Tag>)}
          </div>
          <Table
            rowKey={(record) => record.auditId}
            columns={auditColumns}
            dataSource={auditRecords}
            pagination={false}
            loading={this.state.cleanupApprovalAuditLoading}
            size="small"
            locale={{emptyText: "暂无 cleanup approval audit trail"}}
          />
        </Card>
        <Table
          rowKey={(record) => record.attemptId}
          columns={columns}
          dataSource={attempts}
          pagination={false}
          loading={this.state.attemptsLoading}
          size="small"
          scroll={{x: 1750}}
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
              <Text strong>Retention</Text>
              <div style={{marginTop: 8}}>
                <Space wrap>
                  <Tag>cleanupEligible: {String(!!detailRetention.cleanupEligible)}</Tag>
                  <Tag>{getPublishAttemptCleanupReasonLabel(detailRetention.cleanupReason)}</Tag>
                  <Tag>windowSeconds: {detailRetention.windowSeconds || 0}</Tag>
                  {detailRetention.expiresAt && <Tag>expiresAt: {detailRetention.expiresAt}</Tag>}
                </Space>
              </div>
            </div>
            <div>
              <Text strong>Gateway receipt query hint</Text>
              <div style={{marginTop: 8}}>
                <Space wrap>
                  <Tag color={receiptHint.available ? "green" : "orange"}>available: {String(!!receiptHint.available)}</Tag>
                  <Tag>latest: {String(!!receiptHint.latest)}</Tag>
                  {receiptHint.projectionBatchId && <Tag>batch: {receiptHint.projectionBatchId}</Tag>}
                  {receiptHint.orgVersion && <Tag>orgVersion: {receiptHint.orgVersion}</Tag>}
                  {receiptHint.sourceVersion && <Tag>sourceVersion: {receiptHint.sourceVersion}</Tag>}
                  {receiptHint.unavailableReason && <Tag>{receiptHint.unavailableReason}</Tag>}
                  <Button
                    size="small"
                    disabled={!receiptHint.available}
                    onClick={() => this.queryGatewayReceiptFromAttempt(detail)}
                  >
                    查询 Gateway receipt
                  </Button>
                </Space>
              </div>
              <Text type="secondary">Receipt query hint 仅用于查询 Gateway owner 诊断，不代表 Admin 已确认运行时授权成功。</Text>
            </div>
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
