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

import {CopyOutlined, DownOutlined, FileTextOutlined, UpOutlined} from "@ant-design/icons";
import {Alert, Button, Space, Tag, Typography} from "antd";
import copy from "copy-to-clipboard";
import i18next from "i18next";
import React from "react";
import {
  buildServiceCredentialGovernanceHandoffPackage,
  getServiceCredentialGovernanceConfig,
  getServiceCredentialGovernanceStatus
} from "./backend/ApplicationAccessServiceCredentialGovernanceBackend";
import type {
  ServiceCredentialGovernanceConfigGroup,
  ServiceCredentialGovernanceConfigResponse,
  ServiceCredentialGovernanceDiagnosticResponse,
  ServiceCredentialGovernanceHandoffPackage,
  ServiceCredentialGovernanceStatusResponse
} from "./backend/ApplicationAccessServiceCredentialGovernanceBackend";
import {EnterpriseIdentitySection} from "./common/EnterpriseIdentityConsoleLayout";
import * as Setting from "./Setting";

const {Text} = Typography;

type ServiceCredentialGovernanceLoadState = "loading" | "ready" | "error" | "empty";
type ServiceCredentialGovernanceConfigLoadState = "loading" | "ready" | "error" | "empty";
type ServiceCredentialGovernanceHandoffState = "idle" | "ready" | "error";
type ServiceCredentialGovernanceGroup = ServiceCredentialGovernanceStatusResponse["groups"][number];
type ServiceCredentialGovernanceStatus = ServiceCredentialGovernanceGroup["status"];
type ServiceCredentialGovernanceDiagnosticGroup = ServiceCredentialGovernanceDiagnosticResponse["groups"][number];
type ServiceCredentialGovernanceHandoffGroup = ServiceCredentialGovernanceHandoffPackage["groups"][number];
type ServiceCredentialGovernanceTone = "success" | "warning" | "error" | "default";
type ServiceCredentialGovernanceOperatorStatus = {
  label: string;
  description: string;
};
type ServiceCredentialGovernanceDisplay = {
  title: string;
  description: string;
};
type ServiceCredentialGovernanceCapabilityStatus = {
  label: string;
  tone: ServiceCredentialGovernanceTone;
};

const INTERNAL_SERVICE_CREDENTIAL_GOVERNANCE_KEYS = new Set([
  "boundedRuntimePolicy",
  "callerPolicy",
  "credentialReferenceKey",
]);
const INSIGHT_ADMIN_PROVIDER_WRAPPER_ROUTES = [
  "/api/admin-provider/insight/v1/current-user",
  "/current-user/scope",
  "/current-user/organization-tree",
];
const INSIGHT_ADMIN_PROVIDER_FIXED_CAPABILITIES = [
  {key: "current-user", labelKey: "Insight Admin Provider identity capability", defaultLabel: "身份接口"},
  {key: "current-user-scope", labelKey: "Insight Admin Provider scope capability", defaultLabel: "Scope 接口"},
  {key: "organization-tree", labelKey: "Insight Admin Provider organization tree capability", defaultLabel: "组织树接口"},
];

interface ApplicationAccessServiceCredentialGovernancePanelProps {
  className?: string;
}

function t(key: string, defaultValue = key): string {
  const namespacedKey = `general:${key}`;
  const translated = i18next.t(namespacedKey, {defaultValue});
  return translated === namespacedKey || translated === key ? defaultValue : String(translated);
}

function getServiceCredentialGovernanceInsightBindingNextAction(): string {
  return t(
    "Handoff bind credential in Insight next action",
    "导入 Insight Profile 后，绑定 manual/secretRef 凭据解析器"
  );
}

function getServiceCredentialGovernanceInsightBindingGuidance(): string {
  return t(
    "Handoff blocker credential reference suggestion",
    "可生成元数据交接包；真实凭据需在 Insight Profile 中绑定 manual/secretRef 凭据解析器后补齐。"
  );
}

function isServiceCredentialGovernanceCredentialReferenceKey(value?: string): boolean {
  return /(credential|reference|secret|token)/.test(`${value ?? ""}`.toLowerCase());
}

export function getServiceCredentialGovernanceTone(status: ServiceCredentialGovernanceStatus): ServiceCredentialGovernanceTone {
  switch (status) {
  case "configured":
    return "success";
  case "blocked":
    return "error";
  case "missing":
  case "partial":
    return "warning";
  default:
    return "default";
  }
}

export function getServiceCredentialGovernanceSummary(status?: ServiceCredentialGovernanceStatusResponse | null): {label: string; tone: ServiceCredentialGovernanceTone} {
  const groups = status?.groups ?? [];
  if (groups.some(group => group.status === "blocked")) {
    return {label: "不可用", tone: "error"};
  }
  if (groups.some(group => group.status === "missing" || group.status === "partial")) {
    return {label: "需补材料", tone: "warning"};
  }
  if (groups.length > 0 && groups.every(group => group.status === "configured" || group.status === "not_applicable")) {
    return {label: "可用", tone: "success"};
  }
  return {label: "待加载", tone: "default"};
}

export function getServiceCredentialGovernanceSourceClassLabel(sourceClass?: ServiceCredentialGovernanceConfigGroup["sourceClass"]): string {
  switch (sourceClass) {
  case "external_secret_system":
    return "外部凭据";
  case "env_config":
    return "环境配置";
  default:
    return "Admin 管理";
  }
}

export function getServiceCredentialReferenceStatusLabel(status?: ServiceCredentialGovernanceConfigGroup["credentialReferenceStatus"]): string {
  switch (status) {
  case "configured":
    return "凭据已配置";
  case "external_secret":
    return "外部凭据";
  case "missing":
    return "缺少凭据";
  default:
    return "无需引用";
  }
}

export function getServiceCredentialGovernanceDisplay(key?: string, label?: string): ServiceCredentialGovernanceDisplay {
  switch (key) {
  case "insight_provider_trust":
    return {
      title: "Insight 调用信任",
      description: "确认 Insight 调 Admin 接入接口时，调用来源在 Admin 信任范围内。",
    };
  case "usage_identity_resolver":
    return {
      title: "用量身份解析",
      description: "把用量里的用户、scope 或组织线索映射回 Admin 身份与组织范围。",
    };
  case "gateway_organization_projection":
    return {
      title: "Gateway 组织投影",
      description: "把 Admin 组织范围投影给 Gateway/API，用于权限判断和用量归属。",
    };
  case "keep_in_env":
    return {
      title: "环境维护项",
      description: "说明哪些材料只在部署环境或外部 Secret 系统维护，Admin 不复制明文。",
    };
  default:
    return {
      title: label || key || "未知交接项",
      description: "Admin 侧交接材料状态。",
    };
  }
}

export function getServiceCredentialGovernanceReferenceSourceHint(key?: string): string {
  switch (key) {
  case "usage_identity_resolver":
    return "导入 Insight Profile 后，绑定 manual/secretRef 凭据解析器。";
  case "gateway_organization_projection":
    return "导入 Insight Profile 后，绑定 manual/secretRef 凭据解析器。";
  default:
    return "导入 Insight Profile 后，绑定 manual/secretRef 凭据解析器。";
  }
}

export function getServiceCredentialGovernanceReferencePlaceholder(key?: string): string {
  switch (key) {
  case "usage_identity_resolver":
    return "insightUsageIdentityResolverToken";
  case "gateway_organization_projection":
    return "gatewayOrganizationProjectionToken";
  default:
    return "例如 adminServiceCredentialToken";
  }
}

export function getServiceCredentialGovernanceDiagnosticTone(status: ServiceCredentialGovernanceDiagnosticGroup["status"]): ServiceCredentialGovernanceTone {
  switch (status) {
  case "ready":
    return "success";
  case "disabled":
  case "keep_in_env":
  case "cannot_infer":
    return "warning";
  case "blocked":
  case "missing_reference":
    return "error";
  default:
    return "default";
  }
}

export function getServiceCredentialGovernanceDiagnosticStatusLabel(status: ServiceCredentialGovernanceDiagnosticGroup["status"]): string {
  switch (status) {
  case "ready":
    return "预检通过";
  case "disabled":
    return "未启用";
  case "missing_reference":
    return "缺少凭据";
  case "keep_in_env":
    return "由环境维护";
  case "cannot_infer":
    return "需下游确认";
  default:
    return "策略未放行";
  }
}

export function getServiceCredentialGovernanceHandoffTone(readiness: ServiceCredentialGovernanceHandoffGroup["readiness"]): ServiceCredentialGovernanceTone {
  switch (readiness) {
  case "ready":
    return "success";
  case "keep_in_env":
  case "cannot_infer":
    return "warning";
  case "blocked":
    return "error";
  default:
    return "default";
  }
}

export function getServiceCredentialGovernanceOperatorStatus(status?: ServiceCredentialGovernanceStatus): ServiceCredentialGovernanceOperatorStatus {
  switch (status) {
  case "configured":
    return {label: "可用", description: "配置项已齐备"};
  case "blocked":
    return {label: "不可用", description: "存在阻断项"};
  case "missing":
    return {label: "材料不全", description: "缺少交接材料"};
  case "partial":
    return {label: "需补材料", description: "部分交接材料待补齐"};
  case "not_applicable":
    return {label: "未启用", description: "当前不参与运行"};
  default:
    return {label: "状态未返回", description: "请刷新状态"};
  }
}

export function getServiceCredentialGovernancePrimaryGap(group?: ServiceCredentialGovernanceGroup): string {
  if (!group) {
    return "状态未返回";
  }
  if (group.credentialReferenceStatus === "missing") {
    return "缺少凭据";
  }
  if ((group.missingKeys ?? []).includes("callerPolicy")) {
    return "缺少调用策略";
  }
  if ((group.missingKeys ?? []).includes("boundedRuntimePolicy")) {
    return "缺少运行策略";
  }
  if ((group.missingKeys ?? []).length > 0) {
    return `${group.missingKeys?.length ?? 0} 项待补齐`;
  }
  if (group.status === "blocked") {
    return "策略未放行";
  }
  return "无阻断";
}

export function serviceCredentialGovernanceNeedsCredentialReference(
  group?: ServiceCredentialGovernanceConfigGroup,
  statusGroup?: ServiceCredentialGovernanceGroup
): boolean {
  if (!group || group.keepInEnv) {
    return false;
  }
  if (group.credentialReferenceKey) {
    return false;
  }
  if (group.credentialReferenceStatus === "missing" || statusGroup?.credentialReferenceStatus === "missing") {
    return true;
  }

  const missingText = (statusGroup?.missingKeys ?? []).join(" ").toLowerCase();
  if (isServiceCredentialGovernanceCredentialReferenceKey(missingText)) {
    return true;
  }

  const nextAction = `${group.nextAction ?? ""} ${statusGroup?.nextAction ?? ""}`.toLowerCase();
  return !group.credentialReferenceKey && (nextAction.includes("凭据引用")
    || nextAction.includes("credential reference")
    || nextAction.includes("secret reference"));
}

function serviceCredentialGovernanceNeedsDeploymentConfig(statusGroup?: ServiceCredentialGovernanceGroup): boolean {
  if (!statusGroup || statusGroup.key === "keep_in_env") {
    return false;
  }
  const deploymentMissingKeys = getServiceCredentialGovernanceDeploymentMissingKeys(statusGroup);
  return statusGroup.status === "blocked"
    || statusGroup.status === "missing"
    || statusGroup.status === "partial"
    ? deploymentMissingKeys.some(key => !isServiceCredentialGovernanceCredentialReferenceKey(key))
    : false;
}

function serviceCredentialGovernanceRowHasCredentialReferenceGap(row: {
  statusGroup?: ServiceCredentialGovernanceGroup;
  configGroup?: ServiceCredentialGovernanceConfigGroup;
}): boolean {
  const missingText = row.statusGroup?.missingKeys?.join(" ") ?? "";
  return row.statusGroup?.credentialReferenceStatus === "missing"
    || row.configGroup?.credentialReferenceStatus === "missing"
    || isServiceCredentialGovernanceCredentialReferenceKey(missingText);
}

function getServiceCredentialGovernanceDeploymentMissingKeys(statusGroup?: ServiceCredentialGovernanceGroup): string[] {
  return (statusGroup?.missingKeys ?? []).filter(key => !INTERNAL_SERVICE_CREDENTIAL_GOVERNANCE_KEYS.has(key));
}

function normalizeServiceCredentialGovernanceStatusForHandoff(
  status?: ServiceCredentialGovernanceStatusResponse | null
): ServiceCredentialGovernanceStatusResponse | null {
  if (!status) {
    return null;
  }

  return {
    ...status,
    groups: (status.groups ?? []).map(group => {
      const deploymentMissingKeys = getServiceCredentialGovernanceDeploymentMissingKeys(group);
      if (deploymentMissingKeys.length > 0) {
        return {
          ...group,
          missingKeys: deploymentMissingKeys,
        };
      }

      const normalizedStatus = group.status === "blocked" || group.status === "missing" || group.status === "partial"
        ? (group.credentialReferenceStatus === "not_applicable" ? "not_applicable" : "configured")
        : group.status;
      const normalizedCredentialReferenceStatus = group.credentialReferenceStatus === "missing"
        ? "configured"
        : group.credentialReferenceStatus;

      return {
        ...group,
        status: normalizedStatus,
        missingKeys: [],
        blockedReasons: [],
        credentialReferenceStatus: normalizedCredentialReferenceStatus,
      };
    }),
  };
}

export function getServiceCredentialGovernanceNextAction(
  rows: Array<{
    statusGroup?: ServiceCredentialGovernanceGroup;
    configGroup?: ServiceCredentialGovernanceConfigGroup;
  }>
): string {
  const blockedOrMissing = rows.find(row => {
    const status = row.statusGroup?.status;
    return status === "blocked" || status === "missing" || status === "partial" || row.configGroup?.credentialReferenceStatus === "missing";
  });
  if (blockedOrMissing) {
    if (serviceCredentialGovernanceRowHasCredentialReferenceGap(blockedOrMissing)) {
      return getServiceCredentialGovernanceInsightBindingNextAction();
    }
    return blockedOrMissing.configGroup?.nextAction || blockedOrMissing.statusGroup?.nextAction || "补齐交接材料后生成交接包";
  }
  if (rows.length === 0) {
    return "等待配置加载";
  }
  return "保存后生成交接包";
}

export function getServiceCredentialGovernanceRequiredConfigSummary(groups: ServiceCredentialGovernanceConfigGroup[]): string {
  const actionableGroups = groups.filter(group => !group.keepInEnv && group.enabled !== false);
  const missingReferences = actionableGroups.filter(group => group.credentialReferenceStatus === "missing").length;
  if (missingReferences > 0) {
    return `${missingReferences} 项缺少凭据引用`;
  }
  if (actionableGroups.length > 0) {
    return `${actionableGroups.length} 项可维护配置`;
  }
  return "暂无可维护配置";
}

export function getServiceCredentialGovernanceCredentialPresenceLabel(group?: ServiceCredentialGovernanceConfigGroup): string {
  if (!group || group.keepInEnv || group.credentialReferenceStatus === "not_applicable") {
    return "无需填写";
  }
  if (group.credentialReferenceKey) {
    return "已填写引用";
  }
  return "待填写引用";
}

export function getServiceCredentialGovernanceHandoffReadinessLabel(readiness: ServiceCredentialGovernanceHandoffGroup["readiness"]): string {
  switch (readiness) {
  case "ready":
    return t("Ready for handoff", "可交付");
  case "keep_in_env":
    return t("Keep in env config", "由环境维护");
  case "cannot_infer":
    return t("Cannot infer", "需下游确认");
  default:
    return t("Blocked", "材料不全");
  }
}

// 诊断详情保留排障证据；默认层只表达交接动作和阻断摘要。
function getServiceCredentialGovernanceCapabilityStatus(
  statusGroup?: ServiceCredentialGovernanceGroup,
  configGroup?: ServiceCredentialGovernanceConfigGroup
): ServiceCredentialGovernanceCapabilityStatus {
  if (serviceCredentialGovernanceNeedsDeploymentConfig(statusGroup)) {
    const missingText = (statusGroup?.missingKeys ?? []).join(" ").toLowerCase();
    if (statusGroup?.credentialReferenceStatus === "missing" || isServiceCredentialGovernanceCredentialReferenceKey(missingText)) {
      return {label: t("Capability missing credential reference", "缺凭据引用"), tone: "warning"};
    }
    return {label: t("Capability missing deployment config", "缺部署配置"), tone: "warning"};
  }
  if (configGroup?.credentialReferenceStatus === "missing" || statusGroup?.credentialReferenceStatus === "missing") {
    return {label: t("Capability missing credential reference", "缺凭据引用"), tone: "warning"};
  }
  if (statusGroup?.status === "blocked") {
    return {label: t("Capability unavailable", "不可用"), tone: "error"};
  }
  if (statusGroup?.status === "missing" || statusGroup?.status === "partial") {
    return {label: t("Capability needs material", "需补材料"), tone: "warning"};
  }
  if (statusGroup?.status === "configured") {
    return {label: t("Capability ready", "已就绪"), tone: "success"};
  }
  if (statusGroup?.status === "not_applicable" || configGroup?.enabled === false) {
    return {label: t("Capability disabled", "未启用"), tone: "default"};
  }
  if (!statusGroup && !configGroup) {
    return {label: t("Capability not returned", "未返回"), tone: "default"};
  }
  return {label: t("Capability ready", "已就绪"), tone: "success"};
}

function containsUnsafeServiceCredentialConfigText(value: unknown): boolean {
  const text = `${value ?? ""}`.trim().toLowerCase();
  if (!text) {
    return false;
  }

  return /[a-z][a-z0-9+.-]*:\/\//i.test(text)
    || text.includes("authorization")
    || text.includes("cookie")
    || text.includes("bearer ")
    || /\bdsn\b/.test(text)
    || text.includes("password")
    || text.includes("-----begin")
    || /client[_-]?secret|clientsecret/.test(text)
    || /access[_-]?token|accesstoken/.test(text)
    || /refresh[_-]?token|refreshtoken/.test(text)
    || /token(?:[_-]?value|[:=])/.test(text)
    || /secret(?:[_-]?value|[:=])/.test(text)
    || /private[_-]?key|privatekey/.test(text)
    || /raw[_-]?payload|rawpayload/.test(text)
    || /raw[_-]?id\b/.test(text);
}

function getCopySafeRuntimePolicy(policy?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!policy) {
    return undefined;
  }

  const nextPolicy: Record<string, unknown> = {};
  Object.entries(policy).forEach(([key, value]) => {
    if (containsUnsafeServiceCredentialConfigText(key) || containsUnsafeServiceCredentialConfigText(value)) {
      return;
    }
    if (["string", "number", "boolean"].includes(typeof value)) {
      nextPolicy[key] = value;
    }
  });
  return Object.keys(nextPolicy).length > 0 ? nextPolicy : undefined;
}

function sanitizeServiceCredentialGovernanceConfigGroups(groups: ServiceCredentialGovernanceConfigGroup[] = []): ServiceCredentialGovernanceConfigGroup[] {
  return groups.map(group => ({
    ...group,
    credentialReferenceKey: containsUnsafeServiceCredentialConfigText(group.credentialReferenceKey) ? "" : group.credentialReferenceKey,
    callerPolicy: containsUnsafeServiceCredentialConfigText(group.callerPolicy) ? "" : group.callerPolicy,
    boundedRuntimePolicy: getCopySafeRuntimePolicy(group.boundedRuntimePolicy),
  }));
}

function ApplicationAccessServiceCredentialGovernancePanel({className}: ApplicationAccessServiceCredentialGovernancePanelProps): React.ReactElement {
  const [serviceCredentialGovernance, setServiceCredentialGovernance] = React.useState<ServiceCredentialGovernanceStatusResponse | null>(null);
  const [serviceCredentialGovernanceLoadState, setServiceCredentialGovernanceLoadState] = React.useState<ServiceCredentialGovernanceLoadState>("loading");
  const [serviceCredentialGovernanceConfig, setServiceCredentialGovernanceConfig] = React.useState<ServiceCredentialGovernanceConfigResponse | null>(null);
  const [serviceCredentialGovernanceConfigDraft, setServiceCredentialGovernanceConfigDraft] = React.useState<ServiceCredentialGovernanceConfigGroup[]>([]);
  const [serviceCredentialGovernanceConfigLoadState, setServiceCredentialGovernanceConfigLoadState] = React.useState<ServiceCredentialGovernanceConfigLoadState>("loading");
  const [serviceCredentialGovernanceHandoffPackage, setServiceCredentialGovernanceHandoffPackage] = React.useState<ServiceCredentialGovernanceHandoffPackage | null>(null);
  const [serviceCredentialGovernanceHandoffState, setServiceCredentialGovernanceHandoffState] = React.useState<ServiceCredentialGovernanceHandoffState>("idle");
  const [serviceCredentialGovernanceDiagnosticsOpen, setServiceCredentialGovernanceDiagnosticsOpen] = React.useState(false);

  const handleCopyServiceCredentialGovernanceHandoffPackage = React.useCallback(() => {
    if (!serviceCredentialGovernanceHandoffPackage) {
      Setting.showMessage("error", t("Handoff package copy requires generation", "请先生成元数据交接包"));
      return;
    }

    const copied = copy(JSON.stringify(serviceCredentialGovernanceHandoffPackage, null, 2));
    Setting.showMessage(copied ? "success" : "error", copied ? "已复制 Admin 交接包 JSON" : "复制 Admin 交接包失败");
  }, [serviceCredentialGovernanceHandoffPackage]);

  const loadServiceCredentialGovernanceStatus = React.useCallback((isMounted: () => boolean = () => true) => {
    setServiceCredentialGovernanceLoadState("loading");
    return getServiceCredentialGovernanceStatus()
      .then(response => {
        if (!isMounted()) {
          return;
        }
        if (response.status !== "ok" || !response.data) {
          setServiceCredentialGovernance(null);
          setServiceCredentialGovernanceLoadState("error");
          return;
        }
        setServiceCredentialGovernance(response.data);
        setServiceCredentialGovernanceLoadState(response.data.groups?.length > 0 ? "ready" : "empty");
      })
      .catch(() => {
        if (!isMounted()) {
          return;
        }
        setServiceCredentialGovernance(null);
        setServiceCredentialGovernanceLoadState("error");
      });
  }, []);

  const loadServiceCredentialGovernanceConfig = React.useCallback((isMounted: () => boolean = () => true) => {
    setServiceCredentialGovernanceConfigLoadState("loading");
    return getServiceCredentialGovernanceConfig()
      .then(response => {
        if (!isMounted()) {
          return;
        }
        if (response.status !== "ok" || !response.data) {
          setServiceCredentialGovernanceConfig(null);
          setServiceCredentialGovernanceConfigDraft([]);
          setServiceCredentialGovernanceConfigLoadState("error");
          return;
        }
        const sanitizedData = {
          ...response.data,
          groups: sanitizeServiceCredentialGovernanceConfigGroups(response.data.groups ?? []),
        };
        setServiceCredentialGovernanceConfig(sanitizedData);
        setServiceCredentialGovernanceConfigDraft(sanitizedData.groups);
        setServiceCredentialGovernanceConfigLoadState(sanitizedData.groups.length > 0 ? "ready" : "empty");
      })
      .catch(() => {
        if (!isMounted()) {
          return;
        }
        setServiceCredentialGovernanceConfig(null);
        setServiceCredentialGovernanceConfigDraft([]);
        setServiceCredentialGovernanceConfigLoadState("error");
      });
  }, []);

  React.useEffect(() => {
    let isMounted = true;
    const isStillMounted = () => isMounted;
    loadServiceCredentialGovernanceStatus(isStillMounted);
    loadServiceCredentialGovernanceConfig(isStillMounted);

    return () => {
      isMounted = false;
    };
  }, [loadServiceCredentialGovernanceConfig, loadServiceCredentialGovernanceStatus]);

  const handleServiceCredentialGovernanceHandoffPackage = React.useCallback(() => {
    const hasPendingMaterials = (serviceCredentialGovernance?.groups ?? []).some(serviceCredentialGovernanceNeedsDeploymentConfig);
    if (serviceCredentialGovernanceConfigLoadState !== "ready" || serviceCredentialGovernanceConfigDraft.length === 0) {
      setServiceCredentialGovernanceHandoffPackage(null);
      setServiceCredentialGovernanceHandoffState("error");
      return;
    }
    if (hasPendingMaterials) {
      setServiceCredentialGovernanceHandoffPackage(null);
      setServiceCredentialGovernanceHandoffState("error");
      return;
    }

    setServiceCredentialGovernanceHandoffPackage(buildServiceCredentialGovernanceHandoffPackage({
      config: serviceCredentialGovernanceConfig ?? {
        source: "admin_service_credential_governance_config",
        isConfigured: serviceCredentialGovernanceConfigDraft.length > 0,
        groups: serviceCredentialGovernanceConfigDraft,
      },
      status: normalizeServiceCredentialGovernanceStatusForHandoff(serviceCredentialGovernance),
    }));
    setServiceCredentialGovernanceHandoffState("ready");
  }, [serviceCredentialGovernance, serviceCredentialGovernanceConfig, serviceCredentialGovernanceConfigDraft, serviceCredentialGovernanceConfigLoadState]);

  const serviceCredentialGovernanceSummary = getServiceCredentialGovernanceSummary(serviceCredentialGovernance);
  const serviceCredentialGovernanceStatusGroups = serviceCredentialGovernance?.groups ?? [];
  const serviceCredentialGovernanceStatusByKey = new Map(serviceCredentialGovernanceStatusGroups.map(group => [group.key, group]));
  const serviceCredentialGovernanceConfigByKey = new Map(serviceCredentialGovernanceConfigDraft.map(group => [group.key, group]));
  const serviceCredentialGovernanceAlignedRows = Array.from(new Set([
    ...serviceCredentialGovernanceStatusGroups.map(group => group.key),
    ...serviceCredentialGovernanceConfigDraft.map(group => group.key),
  ])).map(key => {
    const statusGroup = serviceCredentialGovernanceStatusByKey.get(key);
    const configGroup = serviceCredentialGovernanceConfigByKey.get(key);
    return {
      key,
      label: statusGroup?.label || configGroup?.label || key,
      statusGroup,
      configGroup,
    };
  });
  const serviceCredentialGovernanceActionRows = serviceCredentialGovernanceAlignedRows.filter(row => {
    return serviceCredentialGovernanceNeedsDeploymentConfig(row.statusGroup);
  });
  const serviceCredentialGovernanceEvidenceRows = serviceCredentialGovernanceAlignedRows.map(row => {
    const rowDisplay = getServiceCredentialGovernanceDisplay(row.key, row.label);
    const status = getServiceCredentialGovernanceOperatorStatus(row.statusGroup?.status);
    const sourceLabel = row.configGroup?.sourceClass
      ? getServiceCredentialGovernanceSourceClassLabel(row.configGroup.sourceClass)
      : getServiceCredentialReferenceStatusLabel(row.statusGroup?.credentialReferenceStatus);
    return {
      ...row,
      display: rowDisplay,
      operatorStatus: status,
      sourceLabel,
      owner: row.configGroup?.owner || row.statusGroup?.owner || "admin_owner",
      nextAction: serviceCredentialGovernanceRowHasCredentialReferenceGap(row)
        ? getServiceCredentialGovernanceInsightBindingNextAction()
        : row.configGroup?.nextAction || row.statusGroup?.nextAction || getServiceCredentialGovernancePrimaryGap(row.statusGroup),
      tone: getServiceCredentialGovernanceTone(row.statusGroup?.status ?? "not_applicable"),
    };
  });
  // keep_in_env 是底层维护事实，不作为 Admin 交接页的诊断行动项展示。
  const serviceCredentialGovernanceDiagnosticEvidenceRows = serviceCredentialGovernanceEvidenceRows.filter(row => {
    return row.key !== "keep_in_env" && !row.configGroup?.keepInEnv;
  });
  const serviceCredentialGovernanceHasPendingMaterials = serviceCredentialGovernanceActionRows.length > 0;
  const serviceCredentialGovernanceCanGenerate = serviceCredentialGovernanceConfigLoadState === "ready"
    && serviceCredentialGovernanceConfigDraft.length > 0
    && !serviceCredentialGovernanceHasPendingMaterials;
  const serviceCredentialGovernanceHasPartialPackage = serviceCredentialGovernanceCanGenerate
    && serviceCredentialGovernanceStatusGroups.some(group => {
      return group.status === "blocked"
        || group.status === "missing"
        || group.status === "partial"
        || group.credentialReferenceStatus === "missing";
    });
  const serviceCredentialGovernanceEffectiveSummary = serviceCredentialGovernanceCanGenerate
    ? (serviceCredentialGovernanceHasPartialPackage
      ? {label: t("Handoff status partially missing", "部分缺失"), tone: "warning" as ServiceCredentialGovernanceTone}
      : {label: t("Handoff status generatable", "可生成"), tone: "success" as ServiceCredentialGovernanceTone})
    : (serviceCredentialGovernanceHasPendingMaterials
      ? {label: t("Handoff status partially missing", "部分缺失"), tone: "warning" as ServiceCredentialGovernanceTone}
      : {label: t("Handoff status unavailable", "不可生成"), tone: serviceCredentialGovernanceSummary.tone === "default" ? "default" as ServiceCredentialGovernanceTone : "error" as ServiceCredentialGovernanceTone});
  const serviceCredentialGovernanceHasCredentialReferenceGap = serviceCredentialGovernanceAlignedRows.some(serviceCredentialGovernanceRowHasCredentialReferenceGap);
  let serviceCredentialGovernanceNextAction = t(
    "Handoff waiting for status next action",
    "等待状态加载后生成交接包"
  );
  if (serviceCredentialGovernanceHasCredentialReferenceGap) {
    serviceCredentialGovernanceNextAction = getServiceCredentialGovernanceInsightBindingNextAction();
  } else if (serviceCredentialGovernanceHasPendingMaterials) {
    serviceCredentialGovernanceNextAction = t(
      "Handoff complete admin config next action",
      "补齐 Admin owner 材料后生成"
    );
  } else if (serviceCredentialGovernanceCanGenerate && serviceCredentialGovernanceHasPartialPackage) {
    serviceCredentialGovernanceNextAction = getServiceCredentialGovernanceNextAction(serviceCredentialGovernanceAlignedRows);
  } else if (serviceCredentialGovernanceCanGenerate) {
    serviceCredentialGovernanceNextAction = t(
      "Handoff generate and bind next action",
      "生成元数据交接包并交给 Insight 绑定"
    );
  } else if (serviceCredentialGovernanceLoadState === "error" || serviceCredentialGovernanceConfigLoadState === "error") {
    serviceCredentialGovernanceNextAction = t(
      "Handoff refresh or contact admin owner next action",
      "刷新状态或请 Admin owner 核对部署配置"
    );
  }
  const serviceCredentialGovernanceActionHint = serviceCredentialGovernanceHasPendingMaterials
    ? t("Handoff generation blocked hint", "补齐 Admin owner 材料后生成")
    : (serviceCredentialGovernanceCanGenerate
      ? (serviceCredentialGovernanceHasPartialPackage
        ? t("Handoff generation partial hint", "可生成元数据包，Insight 绑定凭据")
        : t("Handoff generation complete hint", "可生成完整包"))
      : t("Handoff generation unavailable hint", "暂不可生成"));
  const serviceCredentialGovernanceCredentialGapRows = serviceCredentialGovernanceAlignedRows.filter(serviceCredentialGovernanceRowHasCredentialReferenceGap);
  const serviceCredentialGovernancePartialBlockingRows = serviceCredentialGovernanceHasPartialPackage
    ? serviceCredentialGovernanceAlignedRows.filter(row => {
      const status = row.statusGroup?.status;
      return status === "blocked"
        || status === "missing"
        || status === "partial"
        || row.configGroup?.credentialReferenceStatus === "missing"
        || row.statusGroup?.credentialReferenceStatus === "missing";
    })
    : [];
  const serviceCredentialGovernanceBlockingRows = [
    ...serviceCredentialGovernanceCredentialGapRows,
    ...serviceCredentialGovernanceActionRows,
    ...serviceCredentialGovernancePartialBlockingRows,
  ].filter((row, index, rows) => rows.findIndex(candidate => candidate.key === row.key) === index);
  const serviceCredentialGovernanceCredentialBlockingRow = serviceCredentialGovernanceBlockingRows.find(row => {
    return serviceCredentialGovernanceRowHasCredentialReferenceGap(row);
  });
  const serviceCredentialGovernancePrimaryBlockingRow = serviceCredentialGovernanceCredentialBlockingRow
    ?? serviceCredentialGovernanceBlockingRows[0];
  const serviceCredentialGovernancePrimaryBlockingEvidenceRow = serviceCredentialGovernancePrimaryBlockingRow
    ? serviceCredentialGovernanceEvidenceRows.find(row => row.key === serviceCredentialGovernancePrimaryBlockingRow.key)
    : undefined;
  const serviceCredentialGovernancePrimaryBlockingText = `${serviceCredentialGovernancePrimaryBlockingRow?.statusGroup?.missingKeys?.join(" ") ?? ""} ${serviceCredentialGovernancePrimaryBlockingRow?.statusGroup?.credentialReferenceStatus ?? ""} ${serviceCredentialGovernancePrimaryBlockingRow?.configGroup?.credentialReferenceStatus ?? ""}`.toLowerCase();
  const serviceCredentialGovernancePrimaryBlockerIsCredentialReference = Boolean(serviceCredentialGovernancePrimaryBlockingRow)
    && (
      serviceCredentialGovernancePrimaryBlockingRow?.statusGroup?.credentialReferenceStatus === "missing"
      || serviceCredentialGovernancePrimaryBlockingRow?.configGroup?.credentialReferenceStatus === "missing"
      || isServiceCredentialGovernanceCredentialReferenceKey(serviceCredentialGovernancePrimaryBlockingText)
    );
  const serviceCredentialGovernanceBlockerSummary = serviceCredentialGovernancePrimaryBlockingRow ? (
    <Alert
      className="enterprise-identity-console-alert application-access-service-credential-blocker"
      type="warning"
      showIcon
      message={serviceCredentialGovernancePrimaryBlockerIsCredentialReference
        ? t("Handoff blocker missing credential reference", "缺少凭据引用")
        : t("Handoff blocker missing admin material", "交接材料不完整")}
      description={serviceCredentialGovernancePrimaryBlockerIsCredentialReference
        ? getServiceCredentialGovernanceInsightBindingGuidance()
        : t(
          "Handoff blocker admin material suggestion",
          "请由 Admin owner 补齐部署配置或 owner 决策，完成后刷新本页再生成。"
        )}
    />
  ) : null;
  let serviceCredentialGovernanceHandoffErrorMessage = t("Service credential governance handoff package unavailable", "Admin 交接包暂不可用");
  if (serviceCredentialGovernanceHasPendingMaterials) {
    serviceCredentialGovernanceHandoffErrorMessage = t(
      "Handoff package blocked by credential reference",
      "补齐 Admin owner 材料后再生成交接包；凭据绑定在 Insight manual/secretRef binding 中完成"
    );
  }
  const serviceCredentialGovernanceConfigActions = (
    <Space className="application-access-service-credential-workspace-actions" wrap onClick={event => event.stopPropagation()}>
      <Button
        type={serviceCredentialGovernanceHandoffState === "ready" ? "default" : "primary"}
        icon={<FileTextOutlined />}
        disabled={!serviceCredentialGovernanceCanGenerate}
        onClick={handleServiceCredentialGovernanceHandoffPackage}
      >
        {serviceCredentialGovernanceHandoffState === "ready"
          ? t("Service credential handoff evidence regenerate action", "重新生成元数据交接包")
          : t("Service credential handoff evidence action", "生成元数据交接包")}
      </Button>
    </Space>
  );
  const serviceCredentialGovernanceRowByKey = new Map(serviceCredentialGovernanceAlignedRows.map(row => [row.key, row]));
  const serviceCredentialGovernanceCapabilityRows = [
    ...INSIGHT_ADMIN_PROVIDER_FIXED_CAPABILITIES.map(capability => ({
      key: capability.key,
      label: t(capability.labelKey, capability.defaultLabel),
      status: {label: t("Capability ready", "已就绪"), tone: "success" as ServiceCredentialGovernanceTone},
      nextAction: t("Wrapper capability ready description", "可用于 Insight 元数据交接"),
    })),
    ...[
      {key: "usage_identity_resolver", labelKey: "Insight Admin Provider usage identity resolver capability", defaultLabel: "用量身份解析"},
      {key: "gateway_organization_projection", labelKey: "Insight Admin Provider gateway projection capability", defaultLabel: "Gateway 组织投影"},
    ].map(capability => {
      const row = serviceCredentialGovernanceRowByKey.get(capability.key);
      const status = getServiceCredentialGovernanceCapabilityStatus(row?.statusGroup, row?.configGroup);
      return {
        key: capability.key,
        label: t(capability.labelKey, capability.defaultLabel),
        status,
        nextAction: status.tone === "success"
          ? t("Handoff capability ready next action", "可进入交接包")
          : (row?.configGroup?.nextAction || row?.statusGroup?.nextAction || getServiceCredentialGovernancePrimaryGap(row?.statusGroup)),
      };
    }),
  ];
  const serviceCredentialGovernanceReadyCapabilityRows = serviceCredentialGovernanceCapabilityRows.filter(row => row.status.tone === "success");
  const serviceCredentialGovernanceBlockingEvidenceRows = serviceCredentialGovernanceEvidenceRows.filter(row => {
    const status = row.statusGroup?.status;
    return status === "blocked"
      || status === "missing"
      || status === "partial"
      || row.statusGroup?.credentialReferenceStatus === "missing"
      || row.configGroup?.credentialReferenceStatus === "missing";
  });
  const serviceCredentialGovernanceDiagnosticsSummary = t(
    "Insight Admin Provider diagnostics summary",
    "{blocked} 项阻断 · {ready} 项可用 · 交接包不含真实凭据"
  )
    .replace("{blocked}", `${serviceCredentialGovernanceBlockingEvidenceRows.length}`)
    .replace("{ready}", `${serviceCredentialGovernanceReadyCapabilityRows.length}`)
    .replace("{{blocked}}", `${serviceCredentialGovernanceBlockingEvidenceRows.length}`)
    .replace("{{ready}}", `${serviceCredentialGovernanceReadyCapabilityRows.length}`);
  const serviceCredentialGovernanceDeliverySummary = (
    <div className="application-access-service-credential-operator-overview" aria-label="Admin 交接摘要">
      <div className="application-access-service-credential-operator-card">
        <Text type="secondary">{t("Handoff delivery status label", "交接状态")}</Text>
        <Tag className={`enterprise-identity-tone-${serviceCredentialGovernanceEffectiveSummary.tone}`}>
          {serviceCredentialGovernanceEffectiveSummary.label}
        </Tag>
      </div>
      <div className="application-access-service-credential-operator-card">
        <Text type="secondary">{t("Handoff delivery next action label", "下一步")}</Text>
        <Text strong>{serviceCredentialGovernanceNextAction}</Text>
      </div>
      <div className="application-access-service-credential-operator-card">
        <Text type="secondary">{t("Handoff target consumer label", "目标消费方")}</Text>
        <Text strong>Insight</Text>
      </div>
      <div className="application-access-service-credential-operator-card">
        <Text type="secondary">{t("Handoff package type label", "包类型")}</Text>
        <Text strong>{t("Handoff package type metadata value", "元数据交接包")}</Text>
      </div>
    </div>
  );
  const serviceCredentialGovernanceBlockingSummary = (
    <div className="application-access-service-credential-evidence" aria-label="阻断项">
      <Text strong>{t("Insight Admin Provider blocker details title", "阻断项")}</Text>
      <div className="application-access-service-credential-compact-list">
        {serviceCredentialGovernanceBlockingEvidenceRows.length > 0 ? serviceCredentialGovernanceBlockingEvidenceRows.map(row => {
          const isCredentialReferenceMissing = row.statusGroup?.credentialReferenceStatus === "missing"
            || row.configGroup?.credentialReferenceStatus === "missing";
          const reason = isCredentialReferenceMissing
            ? t("Handoff blocker missing credential reference", "缺少凭据引用")
            : getServiceCredentialGovernancePrimaryGap(row.statusGroup);
          return (
            <div className="application-access-service-credential-compact-row" aria-label={`${row.key} blocker evidence`} key={`${row.key}-blocker`}>
              <div className="application-access-service-credential-summary-main">
                <Space className="application-access-service-credential-summary-title" wrap>
                  <Text strong>{row.display.title}</Text>
                  <Tag className={`enterprise-identity-tone-${row.tone}`}>{row.operatorStatus.label}</Tag>
                </Space>
                <Text type="secondary">{t("Insight Admin Provider blocker owner label", "责任方")}：{row.owner}</Text>
              </div>
              <div className="application-access-service-credential-config-detail">
                <Text type="secondary">{t("Insight Admin Provider blocker reason label", "原因")}：{reason}</Text>
                <Text type="secondary">{t("Insight Admin Provider blocker next action label", "建议动作")}：{row.nextAction}</Text>
              </div>
            </div>
          );
        }) : (
          <Alert
            className="enterprise-identity-console-alert"
            type="success"
            showIcon
            message={t("Insight Admin Provider blockers empty", "暂无阻断项")}
          />
        )}
      </div>
    </div>
  );
  const serviceCredentialGovernancePrimaryBlockingReason = serviceCredentialGovernancePrimaryBlockerIsCredentialReference
    ? t("Handoff blocker missing credential reference", "缺少凭据引用")
    : getServiceCredentialGovernancePrimaryGap(serviceCredentialGovernancePrimaryBlockingRow?.statusGroup);
  const serviceCredentialGovernanceDefaultBlockingSummary = serviceCredentialGovernancePrimaryBlockingEvidenceRow ? (
    <div className="application-access-service-credential-compact-row application-access-service-credential-default-blocker" aria-label="默认阻断摘要">
      <div className="application-access-service-credential-summary-main">
        <Space className="application-access-service-credential-summary-title" wrap>
          <Text strong>{serviceCredentialGovernancePrimaryBlockingEvidenceRow.display.title}</Text>
          <Tag className={`enterprise-identity-tone-${serviceCredentialGovernancePrimaryBlockingEvidenceRow.tone}`}>
            {serviceCredentialGovernancePrimaryBlockingEvidenceRow.operatorStatus.label}
          </Tag>
        </Space>
      </div>
      <div className="application-access-service-credential-config-detail">
        <Text type="secondary">{t("Insight Admin Provider blocker reason label", "原因")}：{serviceCredentialGovernancePrimaryBlockingReason}</Text>
        <Text type="secondary">{t("Insight Admin Provider blocker next action label", "建议动作")}：{serviceCredentialGovernancePrimaryBlockingEvidenceRow.nextAction}</Text>
      </div>
    </div>
  ) : null;
  const serviceCredentialGovernanceAvailableCapabilitySummary = (
    <div className="application-access-service-credential-evidence" aria-label="可用能力">
      <Text strong>{t("Insight Admin Provider available capability details title", "可用能力")}</Text>
      <Space className="application-access-service-credential-capability-chips" aria-label="Available capability rows" size={[8, 8]} wrap>
        {serviceCredentialGovernanceReadyCapabilityRows.map(row => (
          <Tag className={`application-access-service-credential-capability-chip enterprise-identity-tone-${row.status.tone}`} aria-label={`${row.key} available capability`} key={`${row.key}-available`}>
            {row.label} · {row.status.label}
          </Tag>
        ))}
      </Space>
    </div>
  );
  const serviceCredentialGovernanceTechnicalEvidence = (
    <div className="application-access-service-credential-evidence" aria-label="技术证据">
      <Text strong>{t("Insight Admin Provider technical evidence title", "技术证据")}</Text>
      <div className="application-access-service-credential-technical-subsection" aria-label="Insight Admin Provider wrapper routes">
        <Text type="secondary">{t("Insight Admin Provider wrapper route details title", "Wrapper route")}</Text>
        <Space className="application-access-service-credential-wrapper-routes" size={[6, 6]} wrap>
          {INSIGHT_ADMIN_PROVIDER_WRAPPER_ROUTES.map(route => (
            <Tag className="enterprise-identity-code-tag" key={route}>{route}</Tag>
          ))}
        </Space>
      </div>
      <div className="application-access-service-credential-technical-subsection" aria-label="Owner evidence technical details">
        <Text type="secondary">{t("Insight Admin Provider owner evidence details title", "Owner evidence")}</Text>
        <div className="application-access-service-credential-compact-list">
          {serviceCredentialGovernanceDiagnosticEvidenceRows.map(row => {
            const missingKeys = getServiceCredentialGovernanceDeploymentMissingKeys(row.statusGroup);
            return (
              <div className="application-access-service-credential-technical-row" aria-label={`${row.key} owner evidence`} key={row.key}>
                <div className="application-access-service-credential-summary-main">
                  <Space className="application-access-service-credential-summary-title" wrap>
                    <Text strong>{row.display.title}</Text>
                    <Tag className={`enterprise-identity-tone-${row.tone}`}>{row.operatorStatus.label}</Tag>
                    <Tag>{row.sourceLabel}</Tag>
                  </Space>
                  <Text type="secondary">{t("Handoff owner alias label", "Owner alias")}：{row.owner}</Text>
                </div>
                <div className="application-access-service-credential-config-detail">
                  <Text type="secondary">{row.nextAction}</Text>
                  {missingKeys.length > 0 && (
                    <Space size={[6, 6]} wrap>
                      {missingKeys.map(key => (
                        <Tag key={`${row.key}-${key}`}>{key}</Tag>
                      ))}
                    </Space>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
  const serviceCredentialGovernanceTechnicalDetails = (
    <div className="application-access-service-credential-technical-details" aria-label="诊断摘要">
      <div className="application-access-service-credential-workspace-header">
        <div className="application-access-service-credential-summary-main">
          <Text strong>{t("Insight Admin Provider diagnostics summary title", "诊断摘要")}</Text>
          <Text type="secondary">{serviceCredentialGovernanceDiagnosticsSummary}</Text>
        </div>
        <Button
          type="link"
          icon={serviceCredentialGovernanceDiagnosticsOpen ? <UpOutlined /> : <DownOutlined />}
          aria-expanded={serviceCredentialGovernanceDiagnosticsOpen}
          aria-label={serviceCredentialGovernanceDiagnosticsOpen
            ? t("Insight Admin Provider diagnostics collapse action", "收起诊断详情")
            : t("Insight Admin Provider diagnostics expand action", "查看诊断详情")}
          onClick={() => setServiceCredentialGovernanceDiagnosticsOpen(open => !open)}
        >
          {serviceCredentialGovernanceDiagnosticsOpen
            ? t("Insight Admin Provider diagnostics collapse action", "收起诊断详情")
            : t("Insight Admin Provider diagnostics expand action", "查看诊断详情")}
        </Button>
      </div>
      {serviceCredentialGovernanceDiagnosticsOpen && (
        <div className="application-access-service-credential-advanced-section">
          {serviceCredentialGovernanceBlockingSummary}
          {serviceCredentialGovernanceAvailableCapabilitySummary}
          {serviceCredentialGovernanceTechnicalEvidence}
        </div>
      )}
    </div>
  );
  const serviceCredentialGovernanceWorkspaceTitle = t("Insight Admin Provider copy safe handoff actions title", "交接包操作");
  const serviceCredentialGovernanceWorkspace = (
    <div className="application-access-service-credential-workspace">
      <div className="application-access-service-credential-workspace-header">
        <div className="application-access-service-credential-summary-main">
          <Text strong>{serviceCredentialGovernanceWorkspaceTitle}</Text>
          <Text type="secondary">{serviceCredentialGovernanceActionHint}</Text>
        </div>
        {serviceCredentialGovernanceConfigActions}
      </div>
      <div className="application-access-service-credential-config" aria-label="Admin 交接包待补材料">
        {serviceCredentialGovernanceConfigLoadState === "loading" && (
          <Alert
            className="enterprise-identity-console-alert"
            type="info"
            showIcon
            message={t("Insight Admin Provider handoff config loading", "加载 Insight Admin Provider 交接配置...")}
          />
        )}
        {serviceCredentialGovernanceConfigLoadState === "error" && (
          <Alert
            className="enterprise-identity-console-alert"
            type="warning"
            showIcon
            message={t("Insight Admin Provider handoff config unavailable", "Insight Admin Provider 交接配置暂不可用")}
          />
        )}
        {serviceCredentialGovernanceConfigLoadState === "empty" && (
          <Alert
            className="enterprise-identity-console-alert"
            type="warning"
            showIcon
            message={t("Insight Admin Provider handoff config empty", "暂无 Insight Admin Provider 交接配置")}
          />
        )}
        {serviceCredentialGovernanceHandoffState === "error" && (
          <Alert
            className="enterprise-identity-console-alert"
            type="warning"
            showIcon
            message={serviceCredentialGovernanceHandoffErrorMessage}
          />
        )}
        {serviceCredentialGovernanceHandoffState === "ready" && serviceCredentialGovernanceHandoffPackage && (
          <Alert
            className="enterprise-identity-console-alert"
            type={serviceCredentialGovernanceHasPartialPackage ? "warning" : "success"}
            showIcon
            message={serviceCredentialGovernanceHasPartialPackage
              ? t("Insight Admin Provider partial handoff ready message", "Admin 元数据交接包已生成")
              : t("Insight Admin Provider handoff ready message", "Insight Admin 接入交接包已生成")}
            description={serviceCredentialGovernanceHasPartialPackage
              ? t(
                "Insight Admin Provider partial handoff ready description",
                "已生成元数据交接包；仍需在 Insight Profile 绑定真实凭据。"
              )
              : t(
                "Insight Admin Provider handoff ready description",
                "Admin 交接包只包含元数据和引用，不传递真实凭据。"
              )}
            action={(
              <Button icon={<CopyOutlined />} size="small" onClick={handleCopyServiceCredentialGovernanceHandoffPackage}>
                复制交接包 JSON
              </Button>
            )}
          />
        )}
        {serviceCredentialGovernanceConfigLoadState === "ready" && serviceCredentialGovernanceHandoffState !== "ready" && serviceCredentialGovernanceActionRows.length === 0 && !serviceCredentialGovernanceHasPartialPackage && (
          <div className="application-access-service-credential-alignment" aria-label={serviceCredentialGovernanceWorkspaceTitle}>
            <Alert
              className="enterprise-identity-console-alert"
              type="success"
              showIcon
              message={t("Handoff metadata package ready message", "材料已齐，点击生成元数据交接包。")}
            />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <EnterpriseIdentitySection
      className={className}
      title={t("Insight Admin Provider status title", "Insight Admin Provider 状态")}
      description={t("Insight Admin Provider page description", "面向 Insight 的 Admin Provider 元数据交接页。")}
      extra={<Tag className={`enterprise-identity-tone-${serviceCredentialGovernanceEffectiveSummary.tone}`}>{serviceCredentialGovernanceEffectiveSummary.label}</Tag>}
    >
      {serviceCredentialGovernanceDeliverySummary}
      {serviceCredentialGovernanceBlockerSummary}
      {serviceCredentialGovernanceDefaultBlockingSummary}
      {serviceCredentialGovernanceLoadState === "loading" && (
        <Alert
          className="enterprise-identity-console-alert"
          type="info"
          showIcon
          message={t("Insight Admin Provider handoff status loading", "加载 Insight Admin Provider 交接状态...")}
        />
      )}
      {serviceCredentialGovernanceLoadState === "error" && (
        <Alert
          className="enterprise-identity-console-alert"
          type="warning"
          showIcon
          message={t("Insight Admin Provider handoff status unavailable", "Insight Admin Provider 交接状态暂不可用")}
          description={t(
            "Insight Admin Provider handoff status unavailable description",
            "应用列表操作不受影响；请稍后刷新或请 Admin owner 核对部署配置。"
          )}
        />
      )}
      {serviceCredentialGovernanceLoadState === "empty" && (
        <Alert
          className="enterprise-identity-console-alert"
          type="warning"
          showIcon
          message={t("Insight Admin Provider handoff status empty", "暂无 Insight Admin Provider 交接状态")}
        />
      )}
      {serviceCredentialGovernanceWorkspace}
      {serviceCredentialGovernanceTechnicalDetails}
    </EnterpriseIdentitySection>
  );
}

export default ApplicationAccessServiceCredentialGovernancePanel;
