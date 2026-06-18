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

import React, {useEffect, useMemo, useState} from "react";
import {Button, Descriptions, Drawer, Empty, Input, Select, Space, Table, Tag, Typography} from "antd";
import {DownloadOutlined, ReloadOutlined} from "@ant-design/icons";
import OrganizationSelect from "./common/select/OrganizationSelect";
import * as Setting from "./Setting";
import * as PlatformApiMappingBackend from "./backend/PlatformApiMappingBackend";
import i18next from "i18next";

const {Text, Title} = Typography;

const entityOptions = [
  {label: "用户", value: "user"},
  {label: "部门", value: "department"},
  {label: "成员关系", value: "membership"},
];

const qualityOptions = [
  {label: "全部状态", value: ""},
  {label: "Blocked", value: "blocked"},
  {label: "Warning", value: "warning"},
  {label: "Ready", value: "ready"},
];

function qualityTag(status) {
  const color = status === "blocked" ? "red" : status === "warning" ? "gold" : "green";
  return <Tag color={color}>{status || "ready"}</Tag>;
}

function priorityTag(priority) {
  const color = priority === "P0" ? "red" : priority === "P1" ? "orange" : priority === "P2" ? "gold" : "blue";
  return <Tag color={color}>{priority || "P3"}</Tag>;
}

function compactText(value) {
  if (!value) {
    return "-";
  }
  if (String(value).length <= 36) {
    return value;
  }
  return `${String(value).slice(0, 18)}...${String(value).slice(-10)}`;
}

const aliasCopy = {
  scope_has_no_manageable_departments: {
    labelKey: "Current organization has no manageable departments",
    label: "当前组织暂无可管理部门",
    shortKey: "Check organization management scope source connection or administrator permission",
    short: "检查组织管理范围、来源连接或管理员权限。",
  },
  mapping_missing: {
    labelKey: "API subject mapping missing",
    label: "API 主体映射缺失",
  },
  mapping_review: {
    labelKey: "API mapping review",
    label: "API 映射核对",
  },
  lifecycle_not_active: {
    labelKey: "Lifecycle is not active",
    label: "生命周期非正常",
  },
  manual_review_only: {
    labelKey: "Manual review only",
    label: "仅人工复核",
  },
  missing_preflight_samples: {
    labelKey: "Missing preflight samples",
    label: "缺少预检样例",
  },
};

function translateGeneral(key, fallback) {
  return i18next.t(`general:${key}`, {defaultValue: fallback});
}

function readableAlias(value) {
  const text = String(value || "");
  if (!text) {
    return "-";
  }
  if (!text.includes("_") || text.includes(":")) {
    return text;
  }
  return text.split("_").filter(Boolean).map(part => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`).join(" ");
}

function aliasLabel(value) {
  const copy = aliasCopy[String(value || "").toLowerCase()];
  if (copy) {
    return translateGeneral(copy.labelKey, copy.label);
  }
  return readableAlias(value);
}

function aliasSummary(value) {
  const copy = aliasCopy[String(value || "").toLowerCase()];
  if (copy?.shortKey) {
    return translateGeneral(copy.shortKey, copy.short);
  }
  if (copy) {
    return translateGeneral(copy.labelKey, copy.label);
  }
  return readableAlias(value);
}

function renderTags(values, color) {
  if (!values || values.length === 0) {
    return <Text type="secondary">-</Text>;
  }
  return values.map(value => <Tag color={color} key={value}>{value}</Tag>);
}

function renderAliasTags(values, color) {
  if (!values || values.length === 0) {
    return <Text type="secondary">-</Text>;
  }
  return values.map(value => <Tag color={color} key={value}>{aliasLabel(value)}</Tag>);
}

export default function OrganizationDirectoryQualityPage(props) {
  const [organization, setOrganization] = useState(props.account?.owner || "built-in");
  const [entityType, setEntityType] = useState("user");
  const [qualityStatus, setQualityStatus] = useState("");
  const [reasonCode, setReasonCode] = useState("");
  const [lifecycleStatus, setLifecycleStatus] = useState("");
  const [sourceType, setSourceType] = useState("");
  const [sourceConnectionIdHash, setSourceConnectionIdHash] = useState("");
  const [keyword, setKeyword] = useState("");
  const [pagination, setPagination] = useState({current: 1, pageSize: 10});
  const [loading, setLoading] = useState(false);
  const [planLoading, setPlanLoading] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);
  const [preflightLoading, setPreflightLoading] = useState(false);
  const [approvalPreviewLoading, setApprovalPreviewLoading] = useState(false);
  const [approvalPacketAuditLoading, setApprovalPacketAuditLoading] = useState(false);
  const [approvalPacketOperatorNotesLoading, setApprovalPacketOperatorNotesLoading] = useState(false);
  const [operatorNotePersistenceReadinessLoading, setOperatorNotePersistenceReadinessLoading] = useState(false);
  const [operatorNoteReadonlyAuditSearchLoading, setOperatorNoteReadonlyAuditSearchLoading] = useState(false);
  const [data, setData] = useState(null);
  const [planData, setPlanData] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [draftData, setDraftData] = useState(null);
  const [preflightData, setPreflightData] = useState(null);
  const [approvalPreviewData, setApprovalPreviewData] = useState(null);
  const [approvalPacketAuditData, setApprovalPacketAuditData] = useState(null);
  const [approvalPacketOperatorNotesData, setApprovalPacketOperatorNotesData] = useState(null);
  const [operatorNotePersistenceReadinessData, setOperatorNotePersistenceReadinessData] = useState(null);
  const [operatorNoteReadonlyAuditSearchData, setOperatorNoteReadonlyAuditSearchData] = useState(null);

  const currentPlanOptions = () => ({
    entityType,
    qualityStatus,
    reasonCode,
    lifecycleStatus,
    sourceType,
    sourceConnectionIdHash,
    keyword,
    limit: 100,
    topN: 20,
  });

  const loadDirectoryQuality = (nextPagination = pagination) => {
    setLoading(true);
    return PlatformApiMappingBackend.getOrganizationDirectoryQuality(organization, {
      entityType,
      qualityStatus,
      reasonCode,
      lifecycleStatus,
      sourceType,
      sourceConnectionIdHash,
      keyword,
      current: nextPagination.current,
      pageSize: nextPagination.pageSize,
    }).then((res) => {
      if (res.status !== "ok") {
        Setting.showMessage("error", res.msg || "加载组织目录质量失败");
        setData(null);
        return;
      }
      setData(res.data);
      setPagination({
        current: res.data?.page || nextPagination.current,
        pageSize: res.data?.pageSize || nextPagination.pageSize,
      });
    }).finally(() => setLoading(false));
  };

  const loadRemediationPlan = () => {
    setPlanLoading(true);
    return PlatformApiMappingBackend.getOrganizationDirectoryRemediationPlan(organization, currentPlanOptions()).then((res) => {
      if (res.status !== "ok") {
        Setting.showMessage("error", res.msg || "加载组织目录修复计划失败");
        setPlanData(null);
        return;
      }
      setPlanData(res.data);
    }).finally(() => setPlanLoading(false));
  };

  const loadActionDrafts = (plan) => {
    setSelectedPlan(plan);
    setDraftData(null);
    setPreflightData(null);
    setApprovalPreviewData(null);
    setApprovalPacketAuditData(null);
    setApprovalPacketOperatorNotesData(null);
    setOperatorNotePersistenceReadinessData(null);
    setOperatorNoteReadonlyAuditSearchData(null);
    setDraftLoading(true);
    return PlatformApiMappingBackend.getOrganizationDirectoryRemediationActionDrafts(organization, {
      ...currentPlanOptions(),
      actionAlias: plan.actionAlias,
      reasonCode: (plan.reasonCodes || [])[0] || reasonCode,
      limit: 100,
      topN: 20,
    }).then((res) => {
      if (res.status !== "ok") {
        Setting.showMessage("error", res.msg || "加载组织目录修复草案失败");
        setDraftData(null);
        return;
      }
      setDraftData(res.data);
    }).finally(() => setDraftLoading(false));
  };

  const loadPreflight = (draft) => {
    setPreflightData(null);
    setApprovalPreviewData(null);
    setApprovalPacketAuditData(null);
    setApprovalPacketOperatorNotesData(null);
    setOperatorNotePersistenceReadinessData(null);
    setOperatorNoteReadonlyAuditSearchData(null);
    setPreflightLoading(true);
    return PlatformApiMappingBackend.getOrganizationDirectoryRemediationPreflight(organization, {
      ...currentPlanOptions(),
      draftId: draft.draftId,
      actionAlias: draft.actionAlias || selectedPlan?.actionAlias,
      entityType: draft.entityType || entityType,
      reasonCode: (selectedPlan?.reasonCodes || [])[0] || reasonCode,
      limit: 100,
      topN: 20,
    }).then((res) => {
      if (res.status !== "ok") {
        Setting.showMessage("error", res.msg || "加载组织目录修复预检失败");
        setPreflightData(null);
        return;
      }
      setPreflightData(res.data);
    }).finally(() => setPreflightLoading(false));
  };

  const loadApprovalPreview = (preflight) => {
    setApprovalPreviewData(null);
    setApprovalPacketAuditData(null);
    setApprovalPacketOperatorNotesData(null);
    setOperatorNotePersistenceReadinessData(null);
    setOperatorNoteReadonlyAuditSearchData(null);
    setApprovalPreviewLoading(true);
    return PlatformApiMappingBackend.getOrganizationDirectoryRemediationApprovalPreview(organization, {
      ...currentPlanOptions(),
      draftId: preflight.draftId,
      actionAlias: preflight.actionAlias || selectedPlan?.actionAlias,
      entityType: preflight.entityType || entityType,
      reasonCode: (selectedPlan?.reasonCodes || [])[0] || reasonCode,
      limit: 100,
      topN: 20,
    }).then((res) => {
      if (res.status !== "ok") {
        Setting.showMessage("error", res.msg || "加载组织目录修复审批预览失败");
        setApprovalPreviewData(null);
        return;
      }
      setApprovalPreviewData(res.data);
    }).finally(() => setApprovalPreviewLoading(false));
  };

  const loadApprovalPacketAudit = (approvalPreview) => {
    setApprovalPacketAuditData(null);
    setApprovalPacketOperatorNotesData(null);
    setOperatorNotePersistenceReadinessData(null);
    setOperatorNoteReadonlyAuditSearchData(null);
    setApprovalPacketAuditLoading(true);
    return PlatformApiMappingBackend.getOrganizationDirectoryRemediationApprovalPacketAudit(organization, {
      ...currentPlanOptions(),
      approvalPreviewId: approvalPreview.approvalPreviewId,
      approvalPreviewHash: approvalPreview.approvalPreviewHash,
      draftId: approvalPreview.draftId,
      actionAlias: approvalPreview.actionAlias || selectedPlan?.actionAlias,
      entityType: approvalPreview.entityType || entityType,
      riskLevel: approvalPreview.riskLevel,
      packetStatus: approvalPreview.readyForApproval ? "ready_for_approval" : "blocked",
      reasonCode: (selectedPlan?.reasonCodes || [])[0] || reasonCode,
      limit: 100,
      topN: 20,
    }).then((res) => {
      if (res.status !== "ok") {
        Setting.showMessage("error", res.msg || "加载审批包审计失败");
        setApprovalPacketAuditData(null);
        return;
      }
      setApprovalPacketAuditData(res.data);
    }).finally(() => setApprovalPacketAuditLoading(false));
  };

  const loadApprovalPacketOperatorNotes = (packetAudit) => {
    setApprovalPacketOperatorNotesData(null);
    setOperatorNotePersistenceReadinessData(null);
    setOperatorNoteReadonlyAuditSearchData(null);
    setApprovalPacketOperatorNotesLoading(true);
    return PlatformApiMappingBackend.getOrganizationDirectoryRemediationApprovalPacketOperatorNotes(organization, {
      ...currentPlanOptions(),
      packetAuditId: packetAudit.packetAuditId,
      packetHash: packetAudit.packetHash,
      approvalPreviewId: packetAudit.approvalPreviewId,
      approvalPreviewHash: packetAudit.approvalPreviewHash,
      draftId: packetAudit.draftId,
      actionAlias: packetAudit.actionAlias || selectedPlan?.actionAlias,
      entityType: packetAudit.entityType || entityType,
      riskLevel: packetAudit.riskLevel,
      packetStatus: packetAudit.packetStatus,
      reasonCode: (selectedPlan?.reasonCodes || [])[0] || reasonCode,
      limit: 100,
      topN: 20,
    }).then((res) => {
      if (res.status !== "ok") {
        Setting.showMessage("error", res.msg || "加载交接备注失败");
        setApprovalPacketOperatorNotesData(null);
        return;
      }
      setApprovalPacketOperatorNotesData(res.data);
    }).finally(() => setApprovalPacketOperatorNotesLoading(false));
  };

  const loadOperatorNotePersistenceReadiness = (note) => {
    setOperatorNotePersistenceReadinessData(null);
    setOperatorNoteReadonlyAuditSearchData(null);
    setOperatorNotePersistenceReadinessLoading(true);
    return PlatformApiMappingBackend.getOrganizationDirectoryRemediationOperatorNotePersistenceReadiness(organization, {
      ...currentPlanOptions(),
      noteId: note.noteId,
      noteHash: note.noteHash,
      packetHash: note.packetHash,
      approvalPreviewHash: note.approvalPreviewHash,
      draftId: note.draftId,
      actionAlias: note.actionAlias || selectedPlan?.actionAlias,
      entityType: note.entityType || entityType,
      riskLevel: selectedApprovalPacketAudit?.riskLevel,
      packetStatus: selectedApprovalPacketAudit?.packetStatus,
      reasonCode: (selectedPlan?.reasonCodes || [])[0] || reasonCode,
      limit: 100,
      topN: 20,
    }).then((res) => {
      if (res.status !== "ok") {
        Setting.showMessage("error", res.msg || "加载持久化准入失败");
        setOperatorNotePersistenceReadinessData(null);
        return;
      }
      setOperatorNotePersistenceReadinessData(res.data);
    }).finally(() => setOperatorNotePersistenceReadinessLoading(false));
  };

  const loadOperatorNoteReadonlyAuditSearch = (readiness) => {
    setOperatorNoteReadonlyAuditSearchData(null);
    setOperatorNoteReadonlyAuditSearchLoading(true);
    return PlatformApiMappingBackend.getOrganizationDirectoryRemediationOperatorNoteReadonlyAuditSearch(organization, {
      ...currentPlanOptions(),
      readinessId: readiness.readinessId,
      readinessHash: readiness.readinessHash,
      noteId: selectedApprovalPacketOperatorNote?.noteId,
      noteHash: readiness.noteHash || selectedApprovalPacketOperatorNote?.noteHash,
      packetHash: readiness.packetHash || selectedApprovalPacketOperatorNote?.packetHash,
      approvalPreviewHash: readiness.approvalPreviewHash || selectedApprovalPacketOperatorNote?.approvalPreviewHash,
      draftId: readiness.draftId || selectedApprovalPacketOperatorNote?.draftId,
      actionAlias: readiness.actionAlias || selectedApprovalPacketOperatorNote?.actionAlias || selectedPlan?.actionAlias,
      entityType: readiness.entityType || selectedApprovalPacketOperatorNote?.entityType || entityType,
      riskLevel: selectedApprovalPacketAudit?.riskLevel,
      packetStatus: selectedApprovalPacketAudit?.packetStatus,
      readinessStatus: readiness.readinessStatus,
      reasonCode: (selectedPlan?.reasonCodes || [])[0] || reasonCode,
      includeHistorical: true,
      historyMode: "persistent",
      limit: 100,
      topN: 20,
    }).then((res) => {
      if (res.status !== "ok") {
        Setting.showMessage("error", res.msg || "加载备注审计检索失败");
        setOperatorNoteReadonlyAuditSearchData(null);
        return;
      }
      setOperatorNoteReadonlyAuditSearchData(res.data);
    }).finally(() => setOperatorNoteReadonlyAuditSearchLoading(false));
  };

  const loadAll = (nextPagination = pagination) => Promise.all([
    loadDirectoryQuality(nextPagination),
    loadRemediationPlan(),
  ]);

  useEffect(() => {
    loadAll({current: 1, pageSize: pagination.pageSize});
  }, []);

  const reasonOptions = useMemo(() => {
    const aliases = data?.reasonAliases || [];
    return [{label: "全部原因", value: ""}, ...aliases.map(alias => ({label: aliasLabel(alias), value: alias}))];
  }, [data]);

  const columns = [
    {
      title: "质量",
      dataIndex: "qualityStatus",
      width: 110,
      render: qualityTag,
    },
    {
      title: "对象",
      dataIndex: "displayName",
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.displayName || record.entityId}</Text>
          <Text type="secondary">{record.entityId}</Text>
        </Space>
      ),
    },
    {
      title: "来源",
      dataIndex: "sourceType",
      width: 130,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text>{record.sourceType || "-"}</Text>
          <Text type="secondary">{compactText(record.sourceConnectionIdHash)}</Text>
        </Space>
      ),
    },
    {
      title: "原因",
      dataIndex: "reasonCodes",
      render: values => renderAliasTags(values, "volcano"),
    },
    {
      title: "操作",
      width: 90,
      render: (_, record) => <Button type="link" onClick={() => setSelectedItem(record)}>详情</Button>,
    },
  ];

  const planColumns = [
    {
      title: "优先级",
      dataIndex: "priority",
      width: 90,
      render: priorityTag,
    },
    {
      title: "修复计划",
      dataIndex: "actionAlias",
      width: 180,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{aliasLabel(record.actionAlias)}</Text>
          <Text type="secondary">影响 {record.affectedCounts?.total || 0}</Text>
        </Space>
      ),
    },
    {
      title: "原因",
      dataIndex: "reasonCodes",
      render: values => renderAliasTags(values, "volcano"),
    },
    {
      title: "样例",
      dataIndex: "sampleEntityIds",
      width: 220,
      render: values => (
        <Space direction="vertical" size={0}>
          {(values || []).slice(0, 3).map(value => <Text key={value} type="secondary">{compactText(value)}</Text>)}
          {(!values || values.length === 0) && <Text type="secondary">-</Text>}
        </Space>
      ),
    },
    {
      title: "摘要",
      dataIndex: "safeSummary",
      render: (_, record) => (
        <Space direction="vertical" size={4}>
          <Text>{record.safeSummary ? aliasSummary(record.safeSummary) : "-"}</Text>
          <div>{renderAliasTags(record.operatorActions, "blue")}</div>
          {record.blockedReason && <Text type="danger">{aliasSummary(record.blockedReason)}</Text>}
        </Space>
      ),
    },
    {
      title: "操作",
      width: 90,
      render: (_, record) => <Button type="link" onClick={() => loadActionDrafts(record)}>草案</Button>,
    },
  ];

  const tableLocale = {
    emptyText: loading ? "加载中" : <Empty description="暂无匹配的目录质量记录" />,
  };

  const planTableLocale = {
    emptyText: planLoading ? "加载中" : <Empty description="暂无待处理修复计划" />,
  };

  const exportRemediationPlan = () => {
    if (!planData?.exportSummary) {
      Setting.showMessage("warning", "暂无可导出的修复计划");
      return;
    }
    const blob = new Blob([JSON.stringify(planData.exportSummary, null, 2)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `organization-directory-remediation-plan-${organization || "empty"}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const draftExportPayload = draftData?.exportSummary || {
    organizationId: draftData?.organizationId,
    boundary: draftData?.boundary,
    drafts: draftData?.drafts || [],
  };

  const copyActionDraft = () => {
    const content = JSON.stringify(draftExportPayload, null, 2);
    if (!navigator.clipboard?.writeText) {
      Setting.showMessage("error", "当前浏览器不支持复制草案");
      return;
    }
    navigator.clipboard.writeText(content).then(() => {
      Setting.showMessage("success", "已复制脱敏草案");
    }).catch(() => {
      Setting.showMessage("error", "复制脱敏草案失败");
    });
  };

  const exportActionDraft = () => {
    if (!draftData?.drafts || draftData.drafts.length === 0) {
      Setting.showMessage("warning", "暂无可导出的修复草案");
      return;
    }
    const blob = new Blob([JSON.stringify(draftExportPayload, null, 2)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `organization-directory-remediation-action-drafts-${organization || "empty"}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const preflightExportPayload = preflightData?.exportSummary || {
    organizationId: preflightData?.organizationId,
    boundary: preflightData?.boundary,
    preflights: preflightData?.preflights || [],
  };

  const exportPreflight = () => {
    if (!preflightData?.preflights || preflightData.preflights.length === 0) {
      Setting.showMessage("warning", "暂无可导出的预检");
      return;
    }
    const blob = new Blob([JSON.stringify(preflightExportPayload, null, 2)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `organization-directory-remediation-preflight-${organization || "empty"}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const selectedPreflight = preflightData?.preflights?.[0];
  const approvalPreviewExportPayload = approvalPreviewData?.exportSummary || {
    organizationId: approvalPreviewData?.organizationId,
    boundary: approvalPreviewData?.boundary,
    approvalPreviews: approvalPreviewData?.approvalPreviews || [],
  };

  const copyApprovalPreview = () => {
    const content = JSON.stringify(approvalPreviewExportPayload, null, 2);
    if (!navigator.clipboard?.writeText) {
      Setting.showMessage("error", "当前浏览器不支持复制审批预览");
      return;
    }
    navigator.clipboard.writeText(content).then(() => {
      Setting.showMessage("success", "已复制脱敏审批预览");
    }).catch(() => {
      Setting.showMessage("error", "复制脱敏审批预览失败");
    });
  };

  const exportApprovalPreview = () => {
    if (!approvalPreviewData?.approvalPreviews || approvalPreviewData.approvalPreviews.length === 0) {
      Setting.showMessage("warning", "暂无可导出的审批预览");
      return;
    }
    const blob = new Blob([JSON.stringify(approvalPreviewExportPayload, null, 2)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `organization-directory-remediation-approval-preview-${organization || "empty"}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const selectedApprovalPreview = approvalPreviewData?.approvalPreviews?.[0];
  const approvalPacketAuditExportPayload = approvalPacketAuditData?.exportSummary || {
    organizationId: approvalPacketAuditData?.organizationId,
    boundary: approvalPacketAuditData?.boundary,
    storageScope: approvalPacketAuditData?.exportSummary?.storageScope || "derived_non_persistent",
    retentionPolicy: approvalPacketAuditData?.exportSummary?.retentionPolicy || "not_persisted",
    packetAudits: approvalPacketAuditData?.packetAudits || [],
  };

  const copyApprovalPacketAudit = () => {
    const content = JSON.stringify(approvalPacketAuditExportPayload, null, 2);
    if (!navigator.clipboard?.writeText) {
      Setting.showMessage("error", "当前浏览器不支持复制审批包审计");
      return;
    }
    navigator.clipboard.writeText(content).then(() => {
      Setting.showMessage("success", "已复制脱敏审批包审计");
    }).catch(() => {
      Setting.showMessage("error", "复制脱敏审批包审计失败");
    });
  };

  const exportApprovalPacketAudit = () => {
    if (!approvalPacketAuditData?.packetAudits || approvalPacketAuditData.packetAudits.length === 0) {
      Setting.showMessage("warning", "暂无可导出的审批包审计");
      return;
    }
    const blob = new Blob([JSON.stringify(approvalPacketAuditExportPayload, null, 2)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `organization-directory-remediation-approval-packet-audit-${organization || "empty"}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const selectedApprovalPacketAudit = approvalPacketAuditData?.packetAudits?.[0];
  const selectedApprovalPacketOperatorNote = approvalPacketOperatorNotesData?.notes?.[0];
  const approvalPacketOperatorNotesExportPayload = approvalPacketOperatorNotesData?.exportSummary || {
    organizationId: approvalPacketOperatorNotesData?.organizationId,
    boundary: approvalPacketOperatorNotesData?.boundary,
    noteScope: approvalPacketOperatorNotesData?.exportSummary?.noteScope || "derived_note_draft",
    retentionPolicy: approvalPacketOperatorNotesData?.exportSummary?.retentionPolicy || "not_persisted",
    notes: approvalPacketOperatorNotesData?.notes || [],
  };

  const copyApprovalPacketOperatorNotesJson = () => {
    const content = JSON.stringify(approvalPacketOperatorNotesExportPayload, null, 2);
    if (!navigator.clipboard?.writeText) {
      Setting.showMessage("error", "当前浏览器不支持复制交接备注");
      return;
    }
    navigator.clipboard.writeText(content).then(() => {
      Setting.showMessage("success", "已复制脱敏交接备注JSON");
    }).catch(() => {
      Setting.showMessage("error", "复制脱敏交接备注JSON失败");
    });
  };

  const copyApprovalPacketOperatorNotesMarkdown = () => {
    const content = selectedApprovalPacketOperatorNote?.markdownSummary || "";
    if (!content) {
      Setting.showMessage("warning", "暂无可复制的交接备注Markdown");
      return;
    }
    if (!navigator.clipboard?.writeText) {
      Setting.showMessage("error", "当前浏览器不支持复制交接备注Markdown");
      return;
    }
    navigator.clipboard.writeText(content).then(() => {
      Setting.showMessage("success", "已复制脱敏交接备注Markdown");
    }).catch(() => {
      Setting.showMessage("error", "复制脱敏交接备注Markdown失败");
    });
  };

  const exportApprovalPacketOperatorNotesJson = () => {
    if (!approvalPacketOperatorNotesData?.notes || approvalPacketOperatorNotesData.notes.length === 0) {
      Setting.showMessage("warning", "暂无可导出的交接备注");
      return;
    }
    const blob = new Blob([JSON.stringify(approvalPacketOperatorNotesExportPayload, null, 2)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `organization-directory-remediation-operator-notes-${organization || "empty"}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportApprovalPacketOperatorNotesMarkdown = () => {
    if (!selectedApprovalPacketOperatorNote?.markdownSummary) {
      Setting.showMessage("warning", "暂无可导出的交接备注Markdown");
      return;
    }
    const blob = new Blob([selectedApprovalPacketOperatorNote.markdownSummary], {type: "text/markdown"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `organization-directory-remediation-operator-notes-${organization || "empty"}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const selectedOperatorNotePersistenceReadiness = operatorNotePersistenceReadinessData?.readiness?.[0];
  const operatorNotePersistenceReadinessExportPayload = operatorNotePersistenceReadinessData?.exportSummary || {
    organizationId: operatorNotePersistenceReadinessData?.organizationId,
    boundary: operatorNotePersistenceReadinessData?.boundary,
    storageScope: operatorNotePersistenceReadinessData?.exportSummary?.storageScope || "readiness_only",
    persistenceAllowed: false,
    storeDecisionRequired: true,
    readiness: operatorNotePersistenceReadinessData?.readiness || [],
  };

  const copyOperatorNotePersistenceReadinessJson = () => {
    const content = JSON.stringify(operatorNotePersistenceReadinessExportPayload, null, 2);
    if (!navigator.clipboard?.writeText) {
      Setting.showMessage("error", "当前浏览器不支持复制持久化准入");
      return;
    }
    navigator.clipboard.writeText(content).then(() => {
      Setting.showMessage("success", "已复制脱敏持久化准入JSON");
    }).catch(() => {
      Setting.showMessage("error", "复制脱敏持久化准入JSON失败");
    });
  };

  const exportOperatorNotePersistenceReadinessJson = () => {
    if (!operatorNotePersistenceReadinessData?.readiness || operatorNotePersistenceReadinessData.readiness.length === 0) {
      Setting.showMessage("warning", "暂无可导出的持久化准入");
      return;
    }
    const blob = new Blob([JSON.stringify(operatorNotePersistenceReadinessExportPayload, null, 2)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `organization-directory-remediation-operator-note-persistence-readiness-${organization || "empty"}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const selectedOperatorNoteReadonlyAuditSearchItem = operatorNoteReadonlyAuditSearchData?.items?.[0];
  const operatorNoteReadonlyAuditSearchExportPayload = operatorNoteReadonlyAuditSearchData?.exportSummary || {
    organizationId: operatorNoteReadonlyAuditSearchData?.organizationId,
    boundary: operatorNoteReadonlyAuditSearchData?.boundary,
    searchScope: operatorNoteReadonlyAuditSearchData?.searchScope || "current_derived_non_persistent",
    persistenceRequiredForHistoricalSearch: Boolean(operatorNoteReadonlyAuditSearchData?.persistenceRequiredForHistoricalSearch),
    cannotInfer: operatorNoteReadonlyAuditSearchData?.cannotInfer || [],
    items: operatorNoteReadonlyAuditSearchData?.items || [],
  };

  const copyOperatorNoteReadonlyAuditSearchJson = () => {
    const content = JSON.stringify(operatorNoteReadonlyAuditSearchExportPayload, null, 2);
    if (!navigator.clipboard?.writeText) {
      Setting.showMessage("error", "当前浏览器不支持复制备注审计检索");
      return;
    }
    navigator.clipboard.writeText(content).then(() => {
      Setting.showMessage("success", "已复制脱敏备注审计检索JSON");
    }).catch(() => {
      Setting.showMessage("error", "复制脱敏备注审计检索JSON失败");
    });
  };

  const copyOperatorNoteReadonlyAuditSearchMarkdown = () => {
    const content = selectedOperatorNoteReadonlyAuditSearchItem?.markdownSummary || "";
    if (!content) {
      Setting.showMessage("warning", "暂无可复制的备注审计检索Markdown");
      return;
    }
    if (!navigator.clipboard?.writeText) {
      Setting.showMessage("error", "当前浏览器不支持复制备注审计检索Markdown");
      return;
    }
    navigator.clipboard.writeText(content).then(() => {
      Setting.showMessage("success", "已复制脱敏备注审计检索Markdown");
    }).catch(() => {
      Setting.showMessage("error", "复制脱敏备注审计检索Markdown失败");
    });
  };

  const exportOperatorNoteReadonlyAuditSearchJson = () => {
    if (!operatorNoteReadonlyAuditSearchData?.items || operatorNoteReadonlyAuditSearchData.items.length === 0) {
      Setting.showMessage("warning", "暂无可导出的备注审计检索");
      return;
    }
    const blob = new Blob([JSON.stringify(operatorNoteReadonlyAuditSearchExportPayload, null, 2)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `organization-directory-remediation-operator-note-readonly-audit-search-${organization || "empty"}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="organization-directory-quality-page" style={{padding: 24}}>
      <Space direction="vertical" size={16} style={{width: "100%"}}>
        <Space align="center" wrap>
          <Title level={3} style={{margin: 0}}>组织目录质量</Title>
          <OrganizationSelect initValue={organization} onChange={(value) => setOrganization(value)} />
          <Button icon={<ReloadOutlined />} onClick={() => loadAll({current: 1, pageSize: pagination.pageSize})}>刷新</Button>
        </Space>

        <Space wrap>
          <Select style={{width: 130}} value={entityType} options={entityOptions} onChange={(value) => {
            setEntityType(value);
            setPagination({...pagination, current: 1});
          }} />
          <Select style={{width: 130}} value={qualityStatus} options={qualityOptions} onChange={value => setQualityStatus(value)} />
          <Select style={{width: 220}} value={reasonCode} options={reasonOptions} onChange={value => setReasonCode(value)} />
          <Input style={{width: 150}} placeholder="生命周期" value={lifecycleStatus} onChange={event => setLifecycleStatus(event.target.value)} />
          <Input style={{width: 140}} placeholder="来源类型" value={sourceType} onChange={event => setSourceType(event.target.value)} />
          <Input style={{width: 210}} placeholder="来源连接 Hash" value={sourceConnectionIdHash} onChange={event => setSourceConnectionIdHash(event.target.value)} />
          <Input.Search style={{width: 220}} placeholder="关键字" value={keyword} onChange={event => setKeyword(event.target.value)} onSearch={() => loadAll({current: 1, pageSize: pagination.pageSize})} />
        </Space>

        <Space wrap>
          <Tag color="red">blocked {data?.summary?.blocked || 0}</Tag>
          <Tag color="gold">warning {data?.summary?.warning || 0}</Tag>
          <Tag color="green">ready {data?.summary?.ready || 0}</Tag>
          <Text type="secondary">{data?.boundary || "Admin producer diagnostics only."}</Text>
        </Space>

        <div style={{border: "1px solid #f0f0f0", borderRadius: 6, padding: 16}}>
          <Space direction="vertical" size={12} style={{width: "100%"}}>
            <Space align="center" wrap style={{justifyContent: "space-between", width: "100%"}}>
              <Space align="center" wrap>
                <Title level={4} style={{margin: 0}}>修复计划</Title>
                <Tag color="purple">plans {planData?.totalPlanCount || 0}</Tag>
                <Text type="secondary">{planData?.boundary || "Read-only Admin diagnostics."}</Text>
              </Space>
              <Button icon={<DownloadOutlined />} onClick={exportRemediationPlan}>导出计划</Button>
            </Space>
            <Table
              rowKey={(record) => record.planId || record.planKey}
              size="small"
              loading={planLoading}
              columns={planColumns}
              dataSource={planData?.plans || []}
              locale={planTableLocale}
              pagination={false}
            />
          </Space>
        </div>

        <Table
          rowKey={(record) => `${record.entityType}:${record.entityId}`}
          loading={loading}
          columns={columns}
          dataSource={data?.items || []}
          locale={tableLocale}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: data?.total || 0,
            showSizeChanger: true,
          }}
          onChange={(next) => {
            const nextPagination = {current: next.current, pageSize: next.pageSize};
            setPagination(nextPagination);
            loadDirectoryQuality(nextPagination);
          }}
        />
      </Space>

      <Drawer
        title={selectedItem ? `${selectedItem.displayName || selectedItem.entityId} 详情` : "详情"}
        open={!!selectedItem}
        width={560}
        onClose={() => setSelectedItem(null)}
      >
        {selectedItem && (
          <Space direction="vertical" size={16} style={{width: "100%"}}>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="质量">{qualityTag(selectedItem.qualityStatus)}</Descriptions.Item>
              <Descriptions.Item label="对象 ID">{selectedItem.entityId}</Descriptions.Item>
              <Descriptions.Item label="生命周期">{selectedItem.lifecycleStatus || "-"}</Descriptions.Item>
              <Descriptions.Item label="来源类型">{selectedItem.sourceType || "-"}</Descriptions.Item>
              <Descriptions.Item label="来源连接 Hash">{selectedItem.sourceConnectionIdHash || "-"}</Descriptions.Item>
              <Descriptions.Item label="外部 ID Hash">{selectedItem.externalIdHash || "-"}</Descriptions.Item>
            </Descriptions>
            <Descriptions title="技术详情" column={1} size="small" bordered>
              <Descriptions.Item label="同步批次">{selectedItem.syncBatchId || "-"}</Descriptions.Item>
              <Descriptions.Item label="组织版本">{selectedItem.orgVersion || "-"}</Descriptions.Item>
              <Descriptions.Item label="来源版本">{selectedItem.sourceVersion || "-"}</Descriptions.Item>
            </Descriptions>
            <div>
              <Text strong>原因码</Text>
              <div style={{marginTop: 8}}>{renderTags(selectedItem.reasonCodes, "volcano")}</div>
            </div>
            <div>
              <Text strong>修复提示</Text>
              <div style={{marginTop: 8}}>{renderTags(selectedItem.remediationHints, "blue")}</div>
            </div>
          </Space>
        )}
      </Drawer>
      <Drawer
        title={selectedPlan ? `${selectedPlan.actionAlias} 草案` : "修复草案"}
        open={!!selectedPlan}
        width={720}
        onClose={() => {
          setSelectedPlan(null);
          setDraftData(null);
          setPreflightData(null);
          setApprovalPreviewData(null);
          setApprovalPacketAuditData(null);
          setApprovalPacketOperatorNotesData(null);
          setOperatorNotePersistenceReadinessData(null);
          setOperatorNoteReadonlyAuditSearchData(null);
        }}
      >
        <Space direction="vertical" size={16} style={{width: "100%"}}>
          <Space wrap>
            <Button icon={<DownloadOutlined />} onClick={exportActionDraft} disabled={!draftData?.drafts?.length}>导出草案</Button>
            <Button onClick={copyActionDraft} disabled={!draftData?.drafts?.length}>复制草案</Button>
          </Space>
          <Text type="secondary">{draftData?.boundary || "Admin producer manual review only."}</Text>
          <Table
            rowKey={(record) => record.draftId}
            size="small"
            loading={draftLoading}
            dataSource={draftData?.drafts || []}
            pagination={false}
            locale={{emptyText: draftLoading ? "加载中" : <Empty description="暂无可生成的修复草案" />}}
            columns={[
              {
                title: "草案",
                dataIndex: "actionAlias",
                width: 170,
                render: (_, record) => (
                  <Space direction="vertical" size={0}>
                    <Text strong>{record.actionAlias}</Text>
                    {priorityTag(record.priority)}
                    <Tag color="blue">{record.executionMode}</Tag>
                  </Space>
                ),
              },
              {
                title: "范围",
                width: 140,
                render: (_, record) => (
                  <Space direction="vertical" size={0}>
                    <Text>{record.entityType}</Text>
                    <Text type="secondary">影响 {record.affectedCount || 0}</Text>
                  </Space>
                ),
              },
              {
                title: "执行前置",
                dataIndex: "preconditions",
                render: values => (
                  <Space direction="vertical" size={0}>
                    {(values || []).map(value => <Text key={value}>{value}</Text>)}
                  </Space>
                ),
              },
              {
                title: "操作步骤",
                dataIndex: "operatorSteps",
                render: values => (
                  <Space direction="vertical" size={0}>
                    {(values || []).map(value => <Text key={value}>{value}</Text>)}
                  </Space>
                ),
              },
              {
                title: "脱敏样例",
                dataIndex: "samples",
                render: values => (
                  <Space direction="vertical" size={0}>
                    {preflightData && <Text type="secondary">查看下方预检样例</Text>}
                    {!preflightData && (
                      <>
                        {(values || []).slice(0, 5).map(sample => (
                          <Text key={sample.entityHash} type="secondary">
                            {sample.displaySafeLabel || sample.entityHash} / {sample.sourceType || "-"} / {sample.qualityStatus || "-"}
                          </Text>
                        ))}
                        {(!values || values.length === 0) && <Text type="secondary">-</Text>}
                      </>
                    )}
                  </Space>
                ),
              },
              {
                title: "阻塞",
                dataIndex: "blockedReason",
                render: value => value ? <Text type="danger">{value}</Text> : <Text type="secondary">-</Text>,
              },
              {
                title: "操作",
                width: 90,
                render: (_, record) => <Button type="link" onClick={() => loadPreflight(record)}>预检</Button>,
              },
            ]}
          />
          {(preflightLoading || preflightData) && (
            <div style={{border: "1px solid #f0f0f0", borderRadius: 6, padding: 12}}>
              <Space direction="vertical" size={12} style={{width: "100%"}}>
                <Space align="center" wrap style={{justifyContent: "space-between", width: "100%"}}>
                  <Space align="center" wrap>
                    <Title level={5} style={{margin: 0}}>预检</Title>
                    {selectedPreflight && <Tag color="blue">{selectedPreflight.executionMode}</Tag>}
                    <Text type="secondary">{preflightData?.boundary || "Admin producer preflight only."}</Text>
                  </Space>
                  <Space wrap>
                    <Button onClick={() => loadApprovalPreview(selectedPreflight)} disabled={!selectedPreflight}>审批预览</Button>
                    <Button icon={<DownloadOutlined />} onClick={exportPreflight} disabled={!preflightData?.preflights?.length}>导出预检</Button>
                  </Space>
                </Space>
                {preflightLoading && <Text type="secondary">加载预检中</Text>}
                {selectedPreflight && (
                  <Space direction="vertical" size={8} style={{width: "100%"}}>
                    <Space wrap>
                      <Text>readyForManualReview: {String(selectedPreflight.readyForManualReview)}</Text>
                      <Text>autoExecutionAllowed: {String(selectedPreflight.autoExecutionAllowed)}</Text>
                    </Space>
                    <Descriptions column={1} size="small" bordered>
                      <Descriptions.Item label="阻塞原因">{renderTags(selectedPreflight.blockedReasons, "red")}</Descriptions.Item>
                      <Descriptions.Item label="前置条件">{renderTags(selectedPreflight.preconditions, "blue")}</Descriptions.Item>
                      <Descriptions.Item label="安全清单">{renderTags(selectedPreflight.safetyChecklist, "purple")}</Descriptions.Item>
                      <Descriptions.Item label="影响范围">
                        <Space wrap>
                          {Object.entries(selectedPreflight.affectedCounts || {}).map(([key, value]) => <Tag key={key}>{key}: {value}</Tag>)}
                          {Object.keys(selectedPreflight.affectedCounts || {}).length === 0 && <Text type="secondary">-</Text>}
                        </Space>
                      </Descriptions.Item>
                      <Descriptions.Item label="下一步">{renderTags(selectedPreflight.operatorNextSteps, "geekblue")}</Descriptions.Item>
                    </Descriptions>
                    <Table
                      rowKey={(record) => record.entityHash || record.displaySafeLabel}
                      size="small"
                      pagination={false}
                      dataSource={selectedPreflight.sampleDigests || []}
                      locale={{emptyText: <Empty description="暂无脱敏样例" />}}
                      columns={[
                        {
                          title: "脱敏样例",
                          render: (_, sample) => (
                            <Space direction="vertical" size={0}>
                              <Text>{sample.displaySafeLabel || sample.entityHash}</Text>
                              <Text type="secondary">{sample.sourceType || "-"} / {sample.qualityStatus || "-"} / {sample.lifecycleStatus || "-"}</Text>
                            </Space>
                          ),
                        },
                        {
                          title: "原因",
                          dataIndex: "reasonCodes",
                          render: values => renderTags(values, "volcano"),
                        },
                        {
                          title: "版本",
                          render: (_, sample) => <Text type="secondary">{compactText(sample.orgVersion)} / {compactText(sample.sourceVersion)}</Text>,
                        },
                      ]}
                    />
                    {(approvalPreviewLoading || approvalPreviewData) && (
                      <div style={{border: "1px solid #f0f0f0", borderRadius: 6, padding: 12}}>
                        <Space direction="vertical" size={12} style={{width: "100%"}}>
                          <Space align="center" wrap style={{justifyContent: "space-between", width: "100%"}}>
                            <Space align="center" wrap>
                              <Title level={5} style={{margin: 0}}>审批包预览</Title>
                              {selectedApprovalPreview && <Tag color={selectedApprovalPreview.readyForApproval ? "green" : "red"}>{selectedApprovalPreview.riskLevel}</Tag>}
                              <Text type="secondary">{approvalPreviewData?.boundary || "Admin producer approval preview only."}</Text>
                            </Space>
                            <Space wrap>
                              <Button onClick={() => loadApprovalPacketAudit(selectedApprovalPreview)} disabled={!selectedApprovalPreview}>审批包审计</Button>
                              <Button onClick={copyApprovalPreview} disabled={!approvalPreviewData?.approvalPreviews?.length}>复制审批预览</Button>
                              <Button icon={<DownloadOutlined />} onClick={exportApprovalPreview} disabled={!approvalPreviewData?.approvalPreviews?.length}>导出审批预览</Button>
                            </Space>
                          </Space>
                          {approvalPreviewLoading && <Text type="secondary">加载审批预览中</Text>}
                          {!approvalPreviewLoading && approvalPreviewData && !selectedApprovalPreview && <Empty description="暂无审批预览" />}
                          {selectedApprovalPreview && (
                            <Space direction="vertical" size={8} style={{width: "100%"}}>
                              <Space wrap>
                                <Text>readyForApproval: {String(selectedApprovalPreview.readyForApproval)}</Text>
                                <Text>autoExecutionAllowed: {String(selectedApprovalPreview.autoExecutionAllowed)}</Text>
                                <Text>riskLevel: {selectedApprovalPreview.riskLevel}</Text>
                                <Text>affectedCount: {selectedApprovalPreview.affectedCount || 0}</Text>
                              </Space>
                              <Descriptions column={1} size="small" bordered>
                                <Descriptions.Item label="审批预览 Hash">{selectedApprovalPreview.approvalPreviewHash || "-"}</Descriptions.Item>
                                <Descriptions.Item label="前置条件">{renderTags(selectedApprovalPreview.preconditions, "blue")}</Descriptions.Item>
                                <Descriptions.Item label="阻塞原因">{renderTags(selectedApprovalPreview.blockedReasons, "red")}</Descriptions.Item>
                                <Descriptions.Item label="Required approvals">{renderTags(selectedApprovalPreview.requiredApprovals, "purple")}</Descriptions.Item>
                                <Descriptions.Item label="Operator checklist">{renderTags(selectedApprovalPreview.operatorChecklist, "geekblue")}</Descriptions.Item>
                                <Descriptions.Item label="安全摘要">{selectedApprovalPreview.safeSummary || "-"}</Descriptions.Item>
                                <Descriptions.Item label="Sample stable hashes">{renderTags(selectedApprovalPreview.sampleStableHashes, "cyan")}</Descriptions.Item>
                              </Descriptions>
                              {(approvalPacketAuditLoading || approvalPacketAuditData) && (
                                <div style={{border: "1px solid #f0f0f0", borderRadius: 6, padding: 12}}>
                                  <Space direction="vertical" size={12} style={{width: "100%"}}>
                                    <Space align="center" wrap style={{justifyContent: "space-between", width: "100%"}}>
                                      <Space align="center" wrap>
                                        <Title level={5} style={{margin: 0}}>审批包审计</Title>
                                        {selectedApprovalPacketAudit && <Tag color={selectedApprovalPacketAudit.packetStatus === "ready_for_approval" ? "green" : "red"}>{selectedApprovalPacketAudit.packetStatus}</Tag>}
                                        <Text type="secondary">{approvalPacketAuditData?.boundary || "Admin producer approval packet audit only."}</Text>
                                      </Space>
                                      <Space wrap>
                                        <Button onClick={() => loadApprovalPacketOperatorNotes(selectedApprovalPacketAudit)} disabled={!selectedApprovalPacketAudit}>交接备注</Button>
                                        <Button onClick={copyApprovalPacketAudit} disabled={!approvalPacketAuditData?.packetAudits?.length}>复制审批包审计</Button>
                                        <Button icon={<DownloadOutlined />} onClick={exportApprovalPacketAudit} disabled={!approvalPacketAuditData?.packetAudits?.length}>导出审批包审计</Button>
                                      </Space>
                                    </Space>
                                    {approvalPacketAuditLoading && <Text type="secondary">加载审批包审计中</Text>}
                                    {!approvalPacketAuditLoading && approvalPacketAuditData && !selectedApprovalPacketAudit && <Empty description="暂无审批包审计" />}
                                    {selectedApprovalPacketAudit && (
                                      <Descriptions column={1} size="small" bordered>
                                        <Descriptions.Item label="Packet Hash">{selectedApprovalPacketAudit.packetHash || "-"}</Descriptions.Item>
                                        <Descriptions.Item label="Approval Preview Hash">{selectedApprovalPacketAudit.approvalPreviewHash || "-"}</Descriptions.Item>
                                        <Descriptions.Item label="Storage">{selectedApprovalPacketAudit.storageScope || "-"} / {selectedApprovalPacketAudit.retentionPolicy || "-"}</Descriptions.Item>
                                        <Descriptions.Item label="Execution">{selectedApprovalPacketAudit.executionMode || "-"} / autoExecutionAllowed={String(selectedApprovalPacketAudit.autoExecutionAllowed)}</Descriptions.Item>
                                        <Descriptions.Item label="Events">{renderTags(selectedApprovalPacketAudit.eventTypes, "blue")}</Descriptions.Item>
                                        <Descriptions.Item label="Risk">{selectedApprovalPacketAudit.riskLevel || "-"} / affected {selectedApprovalPacketAudit.affectedCount || 0}</Descriptions.Item>
                                        <Descriptions.Item label="Blocked reasons">{renderTags(selectedApprovalPacketAudit.blockedReasons, "red")}</Descriptions.Item>
                                        <Descriptions.Item label="Required approvals">{renderTags(selectedApprovalPacketAudit.requiredApprovals, "purple")}</Descriptions.Item>
                                        <Descriptions.Item label="Checklist digest">{renderTags(selectedApprovalPacketAudit.operatorChecklistDigest, "geekblue")}</Descriptions.Item>
                                        <Descriptions.Item label="Sample stable hashes">{renderTags(selectedApprovalPacketAudit.sampleStableHashes, "cyan")}</Descriptions.Item>
                                        <Descriptions.Item label="安全摘要">{selectedApprovalPacketAudit.safeSummary || "-"}</Descriptions.Item>
                                      </Descriptions>
                                    )}
                                    {(approvalPacketOperatorNotesLoading || approvalPacketOperatorNotesData) && (
                                      <div style={{border: "1px solid #f0f0f0", borderRadius: 6, padding: 12}}>
                                        <Space direction="vertical" size={12} style={{width: "100%"}}>
                                          <Space align="center" wrap style={{justifyContent: "space-between", width: "100%"}}>
                                            <Space align="center" wrap>
                                              <Title level={5} style={{margin: 0}}>交接备注</Title>
                                              {selectedApprovalPacketOperatorNote && <Tag color="geekblue">{selectedApprovalPacketOperatorNote.noteScope}</Tag>}
                                              <Text type="secondary">{approvalPacketOperatorNotesData?.boundary || "Admin producer operator notes only."}</Text>
                                            </Space>
                                            <Space wrap>
                                              <Button onClick={() => loadOperatorNotePersistenceReadiness(selectedApprovalPacketOperatorNote)} disabled={!selectedApprovalPacketOperatorNote}>持久化准入</Button>
                                              <Button onClick={copyApprovalPacketOperatorNotesJson} disabled={!approvalPacketOperatorNotesData?.notes?.length}>复制交接备注JSON</Button>
                                              <Button onClick={copyApprovalPacketOperatorNotesMarkdown} disabled={!selectedApprovalPacketOperatorNote?.markdownSummary}>复制交接备注Markdown</Button>
                                              <Button icon={<DownloadOutlined />} onClick={exportApprovalPacketOperatorNotesJson} disabled={!approvalPacketOperatorNotesData?.notes?.length}>导出交接备注JSON</Button>
                                              <Button icon={<DownloadOutlined />} onClick={exportApprovalPacketOperatorNotesMarkdown} disabled={!selectedApprovalPacketOperatorNote?.markdownSummary}>导出交接备注Markdown</Button>
                                            </Space>
                                          </Space>
                                          {approvalPacketOperatorNotesLoading && <Text type="secondary">加载交接备注中</Text>}
                                          {!approvalPacketOperatorNotesLoading && approvalPacketOperatorNotesData && !selectedApprovalPacketOperatorNote && <Empty description="暂无交接备注" />}
                                          {selectedApprovalPacketOperatorNote && (
                                            <Descriptions column={1} size="small" bordered>
                                              <Descriptions.Item label="Note Hash">{selectedApprovalPacketOperatorNote.noteHash || "-"}</Descriptions.Item>
                                              <Descriptions.Item label="Packet Hash">{selectedApprovalPacketOperatorNote.packetHash || "-"}</Descriptions.Item>
                                              <Descriptions.Item label="Approval Preview Hash">{selectedApprovalPacketOperatorNote.approvalPreviewHash || "-"}</Descriptions.Item>
                                              <Descriptions.Item label="Scope">{selectedApprovalPacketOperatorNote.noteScope || "-"} / {selectedApprovalPacketOperatorNote.retentionPolicy || "-"}</Descriptions.Item>
                                              <Descriptions.Item label="Execution">{selectedApprovalPacketOperatorNote.executionMode || "-"} / autoExecutionAllowed={String(selectedApprovalPacketOperatorNote.autoExecutionAllowed)}</Descriptions.Item>
                                              <Descriptions.Item label="Handoff summary">{selectedApprovalPacketOperatorNote.handoffSummary || "-"}</Descriptions.Item>
                                              <Descriptions.Item label="Risk summary">{selectedApprovalPacketOperatorNote.riskSummary || "-"}</Descriptions.Item>
                                              <Descriptions.Item label="Status summary">{selectedApprovalPacketOperatorNote.statusSummary || "-"}</Descriptions.Item>
                                              <Descriptions.Item label="Checklist summary">{renderTags(selectedApprovalPacketOperatorNote.checklistSummary, "geekblue")}</Descriptions.Item>
                                              <Descriptions.Item label="cannotInfer">{renderTags(selectedApprovalPacketOperatorNote.cannotInfer, "volcano")}</Descriptions.Item>
                                              <Descriptions.Item label="Operator next steps">{renderTags(selectedApprovalPacketOperatorNote.operatorNextSteps, "blue")}</Descriptions.Item>
                                              <Descriptions.Item label="Sample stable hashes">{renderTags(selectedApprovalPacketOperatorNote.sampleStableHashes, "cyan")}</Descriptions.Item>
                                              <Descriptions.Item label="Markdown">
                                                <Text style={{whiteSpace: "pre-wrap", wordBreak: "break-word"}}>{selectedApprovalPacketOperatorNote.markdownSummary || "-"}</Text>
                                              </Descriptions.Item>
                                            </Descriptions>
                                          )}
                                          {(operatorNotePersistenceReadinessLoading || operatorNotePersistenceReadinessData) && (
                                            <div style={{border: "1px solid #f0f0f0", borderRadius: 6, padding: 12}}>
                                              <Space direction="vertical" size={12} style={{width: "100%"}}>
                                                <Space align="center" wrap style={{justifyContent: "space-between", width: "100%"}}>
                                                  <Space align="center" wrap>
                                                    <Title level={5} style={{margin: 0}}>持久化准入</Title>
                                                    {selectedOperatorNotePersistenceReadiness && <Tag color={selectedOperatorNotePersistenceReadiness.readinessStatus === "ready_for_design_review" ? "green" : "red"}>{selectedOperatorNotePersistenceReadiness.readinessStatus}</Tag>}
                                                    <Text type="secondary">{operatorNotePersistenceReadinessData?.boundary || "Admin producer persistence readiness only."}</Text>
                                                  </Space>
                                                  <Space wrap>
                                                    <Button onClick={() => loadOperatorNoteReadonlyAuditSearch(selectedOperatorNotePersistenceReadiness)} disabled={!selectedOperatorNotePersistenceReadiness}>备注审计检索</Button>
                                                    <Button onClick={copyOperatorNotePersistenceReadinessJson} disabled={!operatorNotePersistenceReadinessData?.readiness?.length}>复制持久化准入JSON</Button>
                                                    <Button icon={<DownloadOutlined />} onClick={exportOperatorNotePersistenceReadinessJson} disabled={!operatorNotePersistenceReadinessData?.readiness?.length}>导出持久化准入JSON</Button>
                                                  </Space>
                                                </Space>
                                                {operatorNotePersistenceReadinessLoading && <Text type="secondary">加载持久化准入中</Text>}
                                                {!operatorNotePersistenceReadinessLoading && operatorNotePersistenceReadinessData && !selectedOperatorNotePersistenceReadiness && <Empty description="暂无持久化准入" />}
                                                {selectedOperatorNotePersistenceReadiness && (
                                                  <Descriptions column={1} size="small" bordered>
                                                    <Descriptions.Item label="Readiness Hash">{selectedOperatorNotePersistenceReadiness.readinessHash || "-"}</Descriptions.Item>
                                                    <Descriptions.Item label="Storage">{selectedOperatorNotePersistenceReadiness.storageScope || "-"} / persistenceAllowed={String(selectedOperatorNotePersistenceReadiness.persistenceAllowed)} / storeDecisionRequired={String(selectedOperatorNotePersistenceReadiness.storeDecisionRequired)}</Descriptions.Item>
                                                    <Descriptions.Item label="Status">{selectedOperatorNotePersistenceReadiness.readinessStatus || "-"} / readyForPersistenceDesignReview={String(selectedOperatorNotePersistenceReadiness.readyForPersistenceDesignReview)}</Descriptions.Item>
                                                    <Descriptions.Item label="Idempotency Key">
                                                      <Text style={{wordBreak: "break-word"}}>{selectedOperatorNotePersistenceReadiness.idempotencyKey || "-"}</Text>
                                                    </Descriptions.Item>
                                                    <Descriptions.Item label="Idempotency Components">{renderTags(selectedOperatorNotePersistenceReadiness.idempotencyComponents, "cyan")}</Descriptions.Item>
                                                    <Descriptions.Item label="Permission Checklist">{renderTags(selectedOperatorNotePersistenceReadiness.permissionChecklist, "blue")}</Descriptions.Item>
                                                    <Descriptions.Item label="Retention Checklist">{renderTags(selectedOperatorNotePersistenceReadiness.retentionChecklist, "purple")}</Descriptions.Item>
                                                    <Descriptions.Item label="Audit Semantics">{renderTags(selectedOperatorNotePersistenceReadiness.auditSemanticsChecklist, "geekblue")}</Descriptions.Item>
                                                    <Descriptions.Item label="Redaction Checklist">{renderTags(selectedOperatorNotePersistenceReadiness.redactionChecklist, "green")}</Descriptions.Item>
                                                    <Descriptions.Item label="Manual Review Gate">{renderTags(selectedOperatorNotePersistenceReadiness.manualReviewGate, "volcano")}</Descriptions.Item>
                                                    <Descriptions.Item label="cannotInfer">{renderTags(selectedOperatorNotePersistenceReadiness.cannotInfer, "orange")}</Descriptions.Item>
                                                    <Descriptions.Item label="Blocked reasons">{renderTags(selectedOperatorNotePersistenceReadiness.blockedReasons, "red")}</Descriptions.Item>
                                                    <Descriptions.Item label="安全摘要">{selectedOperatorNotePersistenceReadiness.safeSummary || "-"}</Descriptions.Item>
                                                  </Descriptions>
                                                )}
                                                {(operatorNoteReadonlyAuditSearchLoading || operatorNoteReadonlyAuditSearchData) && (
                                                  <div style={{border: "1px solid #f0f0f0", borderRadius: 6, padding: 12}}>
                                                    <Space direction="vertical" size={12} style={{width: "100%"}}>
                                                      <Space align="center" wrap style={{justifyContent: "space-between", width: "100%"}}>
                                                        <Space align="center" wrap>
                                                          <Title level={5} style={{margin: 0}}>备注审计检索</Title>
                                                          {operatorNoteReadonlyAuditSearchData?.searchScope && <Tag color="blue">{operatorNoteReadonlyAuditSearchData.searchScope}</Tag>}
                                                          <Text type="secondary">{operatorNoteReadonlyAuditSearchData?.boundary || "Admin producer readonly audit search only."}</Text>
                                                        </Space>
                                                        <Space wrap>
                                                          <Button onClick={copyOperatorNoteReadonlyAuditSearchJson} disabled={!operatorNoteReadonlyAuditSearchData?.items?.length}>复制备注审计检索JSON</Button>
                                                          <Button onClick={copyOperatorNoteReadonlyAuditSearchMarkdown} disabled={!selectedOperatorNoteReadonlyAuditSearchItem?.markdownSummary}>复制备注审计检索Markdown</Button>
                                                          <Button icon={<DownloadOutlined />} onClick={exportOperatorNoteReadonlyAuditSearchJson} disabled={!operatorNoteReadonlyAuditSearchData?.items?.length}>导出备注审计检索JSON</Button>
                                                        </Space>
                                                      </Space>
                                                      {operatorNoteReadonlyAuditSearchLoading && <Text type="secondary">加载备注审计检索中</Text>}
                                                      {!operatorNoteReadonlyAuditSearchLoading && operatorNoteReadonlyAuditSearchData && !selectedOperatorNoteReadonlyAuditSearchItem && <Empty description="暂无备注审计检索" />}
                                                      {operatorNoteReadonlyAuditSearchData && (
                                                        <Space wrap>
                                                          <Text>persistenceRequiredForHistoricalSearch: {String(operatorNoteReadonlyAuditSearchData.persistenceRequiredForHistoricalSearch)}</Text>
                                                          {renderTags(operatorNoteReadonlyAuditSearchData.cannotInfer, "orange")}
                                                        </Space>
                                                      )}
                                                      {selectedOperatorNoteReadonlyAuditSearchItem && (
                                                        <Descriptions column={1} size="small" bordered>
                                                          <Descriptions.Item label="Item">{selectedOperatorNoteReadonlyAuditSearchItem.auditSearchItemId || "-"}</Descriptions.Item>
                                                          <Descriptions.Item label="Hashes">
                                                            <Space direction="vertical" size={0}>
                                                              <Text>noteHash: {selectedOperatorNoteReadonlyAuditSearchItem.noteHash || "-"}</Text>
                                                              <Text>readinessHash: {selectedOperatorNoteReadonlyAuditSearchItem.readinessHash || "-"}</Text>
                                                              <Text>packetHash: {selectedOperatorNoteReadonlyAuditSearchItem.packetHash || "-"}</Text>
                                                            </Space>
                                                          </Descriptions.Item>
                                                          <Descriptions.Item label="Storage">{selectedOperatorNoteReadonlyAuditSearchItem.storageScope || "-"} / {selectedOperatorNoteReadonlyAuditSearchItem.noteScope || "-"} / {selectedOperatorNoteReadonlyAuditSearchItem.retentionPolicy || "-"}</Descriptions.Item>
                                                          <Descriptions.Item label="Execution">{selectedOperatorNoteReadonlyAuditSearchItem.executionMode || "-"} / autoExecutionAllowed={String(selectedOperatorNoteReadonlyAuditSearchItem.autoExecutionAllowed)} / manualReviewOnly={String(selectedOperatorNoteReadonlyAuditSearchItem.manualReviewOnly)}</Descriptions.Item>
                                                          <Descriptions.Item label="Status">{selectedOperatorNoteReadonlyAuditSearchItem.packetStatus || "-"} / {selectedOperatorNoteReadonlyAuditSearchItem.readinessStatus || "-"}</Descriptions.Item>
                                                          <Descriptions.Item label="Display safe label">{selectedOperatorNoteReadonlyAuditSearchItem.displaySafeLabel || "-"}</Descriptions.Item>
                                                          <Descriptions.Item label="Checklist aliases">{renderTags(selectedOperatorNoteReadonlyAuditSearchItem.checklistAliases, "geekblue")}</Descriptions.Item>
                                                          <Descriptions.Item label="Reason aliases">{renderTags(selectedOperatorNoteReadonlyAuditSearchItem.reasonAliases, "volcano")}</Descriptions.Item>
                                                          <Descriptions.Item label="Redacted fields">{renderTags(selectedOperatorNoteReadonlyAuditSearchItem.redactedFields, "green")}</Descriptions.Item>
                                                          <Descriptions.Item label="cannotInfer">{renderTags(selectedOperatorNoteReadonlyAuditSearchItem.cannotInfer, "orange")}</Descriptions.Item>
                                                          <Descriptions.Item label="Blocked reasons">{renderTags(selectedOperatorNoteReadonlyAuditSearchItem.blockedReasons, "red")}</Descriptions.Item>
                                                          <Descriptions.Item label="Version">{selectedOperatorNoteReadonlyAuditSearchItem.sourceVersionSummary || "-"} / {selectedOperatorNoteReadonlyAuditSearchItem.orgVersionSummary || "-"}</Descriptions.Item>
                                                          <Descriptions.Item label="安全摘要">{selectedOperatorNoteReadonlyAuditSearchItem.safeSummary || "-"}</Descriptions.Item>
                                                          <Descriptions.Item label="Markdown">
                                                            <Text style={{whiteSpace: "pre-wrap", wordBreak: "break-word"}}>{selectedOperatorNoteReadonlyAuditSearchItem.markdownSummary || "-"}</Text>
                                                          </Descriptions.Item>
                                                        </Descriptions>
                                                      )}
                                                    </Space>
                                                  </div>
                                                )}
                                              </Space>
                                            </div>
                                          )}
                                        </Space>
                                      </div>
                                    )}
                                  </Space>
                                </div>
                              )}
                            </Space>
                          )}
                        </Space>
                      </div>
                    )}
                  </Space>
                )}
              </Space>
            </div>
          )}
        </Space>
      </Drawer>
    </div>
  );
}
