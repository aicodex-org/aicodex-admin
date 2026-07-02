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

import {CopyOutlined, FileTextOutlined} from "@ant-design/icons";
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

interface ApplicationAccessServiceCredentialGovernancePanelProps {
  className?: string;
}

function t(key: string, defaultValue = key): string {
  const namespacedKey = `general:${key}`;
  const translated = i18next.t(namespacedKey, {defaultValue});
  return translated === namespacedKey || translated === key ? defaultValue : String(translated);
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
    return "在 Admin 部署配置补 insightUsageIdentityResolverToken；Docker/K8s 通常用 AICODEX_INSIGHT_USAGE_IDENTITY_RESOLVER_TOKEN。";
  case "gateway_organization_projection":
    return "在 Admin 部署配置补 gatewayOrganizationProjectionToken；如果部署模板没有环境变量映射，就补到 Admin config。";
  default:
    return "在 Admin 部署配置补下面缺失的 key，补完重启 Admin 后刷新本页。";
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
  if (/(credential|reference|secret|token)/.test(missingText)) {
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
    ? deploymentMissingKeys.length > 0
    : false;
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
  const [, setServiceCredentialGovernanceConfig] = React.useState<ServiceCredentialGovernanceConfigResponse | null>(null);
  const [serviceCredentialGovernanceConfigDraft, setServiceCredentialGovernanceConfigDraft] = React.useState<ServiceCredentialGovernanceConfigGroup[]>([]);
  const [serviceCredentialGovernanceConfigLoadState, setServiceCredentialGovernanceConfigLoadState] = React.useState<ServiceCredentialGovernanceConfigLoadState>("loading");
  const [serviceCredentialGovernanceHandoffPackage, setServiceCredentialGovernanceHandoffPackage] = React.useState<ServiceCredentialGovernanceHandoffPackage | null>(null);
  const [serviceCredentialGovernanceHandoffState, setServiceCredentialGovernanceHandoffState] = React.useState<ServiceCredentialGovernanceHandoffState>("idle");

  const handleCopyServiceCredentialGovernanceHandoffPackage = React.useCallback(() => {
    if (!serviceCredentialGovernanceHandoffPackage) {
      Setting.showMessage("error", "请先生成 Admin 交接包");
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
      status: normalizeServiceCredentialGovernanceStatusForHandoff(serviceCredentialGovernance),
    }));
    setServiceCredentialGovernanceHandoffState("ready");
  }, [serviceCredentialGovernance, serviceCredentialGovernanceConfigDraft, serviceCredentialGovernanceConfigLoadState]);

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
      nextAction: row.configGroup?.nextAction || row.statusGroup?.nextAction || getServiceCredentialGovernancePrimaryGap(row.statusGroup),
      tone: getServiceCredentialGovernanceTone(row.statusGroup?.status ?? "not_applicable"),
    };
  });
  const serviceCredentialGovernanceHasPendingMaterials = serviceCredentialGovernanceActionRows.length > 0;
  const serviceCredentialGovernanceEffectiveSummary = serviceCredentialGovernanceActionRows.length > 0
    ? {label: "需补配置", tone: "warning" as ServiceCredentialGovernanceTone}
    : (serviceCredentialGovernanceLoadState === "ready" && serviceCredentialGovernanceStatusGroups.length > 0
      ? {label: "可生成", tone: "success" as ServiceCredentialGovernanceTone}
      : serviceCredentialGovernanceSummary);
  let serviceCredentialGovernanceNextAction = "材料已齐，可以生成 Admin 交接包";
  if (serviceCredentialGovernanceHasPendingMaterials) {
    serviceCredentialGovernanceNextAction = `在 Admin 部署配置补齐 ${serviceCredentialGovernanceActionRows.length} 项，重启后刷新本页`;
  }
  let serviceCredentialGovernanceHandoffErrorMessage = t("Service credential governance handoff package unavailable", "Admin 交接包暂不可用");
  if (serviceCredentialGovernanceHasPendingMaterials) {
    serviceCredentialGovernanceHandoffErrorMessage = "先补齐 Admin 部署配置，重启后刷新本页，再生成交接包";
  }
  const serviceCredentialGovernanceConfigActions = (
    <Space className="application-access-service-credential-workspace-actions" wrap onClick={event => event.stopPropagation()}>
      <Button
        type={serviceCredentialGovernanceHandoffState === "ready" ? "default" : "primary"}
        icon={<FileTextOutlined />}
        disabled={serviceCredentialGovernanceConfigLoadState !== "ready" || serviceCredentialGovernanceHasPendingMaterials}
        onClick={handleServiceCredentialGovernanceHandoffPackage}
      >
        {serviceCredentialGovernanceHandoffState === "ready" ? "重新生成 Admin 交接包" : t("Service credential handoff evidence action", "生成 Admin 交接包")}
      </Button>
    </Space>
  );
  const serviceCredentialGovernanceBoundarySummary = (
    <Alert
      className="enterprise-identity-console-alert"
      type="info"
      showIcon
      message={t("Insight Admin Provider status boundary title", "状态与 P0 边界")}
      description={t(
        "Insight Admin Provider status description",
        "Admin 只交付 current-user、scope、organization-tree、resolver、projection/trust 和服务凭据治理摘要；Insight P0 通过 copy-safe 交接包加 manual/secretRef binding 完成绑定。"
      )}
    />
  );
  const serviceCredentialGovernanceWrapperCapabilities = (
    <div className="application-access-service-credential-evidence" aria-label="Insight Admin Provider wrapper capabilities">
      <Text strong>{t("Insight Admin Provider wrapper capabilities title", "Wrapper 能力")}</Text>
      <Space className="application-access-service-credential-wrapper-routes" size={[6, 6]} wrap>
        {INSIGHT_ADMIN_PROVIDER_WRAPPER_ROUTES.map(route => (
          <Tag className="enterprise-identity-code-tag" key={route}>{route}</Tag>
        ))}
      </Space>
    </div>
  );
  const serviceCredentialGovernanceEvidenceSummary = (
    <div className="application-access-service-credential-evidence" aria-label="Owner evidence summary">
      <Text strong>{t("Insight Admin Provider owner evidence summary title", "Owner evidence 摘要")}</Text>
      <div className="application-access-service-credential-alignment" aria-label="Owner evidence rows">
        {serviceCredentialGovernanceEvidenceRows.map(row => (
          <div className="application-access-service-credential-summary-row" aria-label={`${row.key} owner evidence`} key={row.key}>
            <div className="application-access-service-credential-summary-main">
              <Space className="application-access-service-credential-summary-title" wrap>
                <Text strong>{row.display.title}</Text>
                <Tag className={`enterprise-identity-tone-${row.tone}`}>{row.operatorStatus.label}</Tag>
                <Tag>{row.sourceLabel}</Tag>
              </Space>
              <Text type="secondary">{row.owner}</Text>
            </div>
            <div className="application-access-service-credential-config-detail">
              <Text type="secondary">{row.nextAction}</Text>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
  const serviceCredentialGovernanceWorkspaceTitle = t("Insight Admin Provider copy safe handoff actions title", "copy-safe 交接操作");
  const serviceCredentialGovernanceWorkspace = (
    <div className="application-access-service-credential-workspace">
      <div className="application-access-service-credential-workspace-header">
        <Text strong>{serviceCredentialGovernanceWorkspaceTitle}</Text>
        {serviceCredentialGovernanceConfigActions}
      </div>
      <div className="application-access-service-credential-config" aria-label="Admin 交接包待补材料">
        {serviceCredentialGovernanceConfigLoadState === "loading" && (
          <Alert className="enterprise-identity-console-alert" type="info" showIcon message="加载服务凭据治理配置..." />
        )}
        {serviceCredentialGovernanceConfigLoadState === "error" && (
          <Alert className="enterprise-identity-console-alert" type="warning" showIcon message="服务凭据治理配置暂不可用" />
        )}
        {serviceCredentialGovernanceConfigLoadState === "empty" && (
          <Alert className="enterprise-identity-console-alert" type="warning" showIcon message="暂无服务凭据治理配置" />
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
            type="success"
            showIcon
            message="Insight Admin 接入交接包已生成"
            description={t(
              "Insight Admin Provider handoff ready description",
              "本页只交付 Admin 身份、组织、resolver、projection/trust 和服务凭据引用材料；Insight P0 需使用 manual/secretRef binding，Admin secure handoff 不在 P0。"
            )}
            action={(
              <Button icon={<CopyOutlined />} size="small" onClick={handleCopyServiceCredentialGovernanceHandoffPackage}>
                复制交接包 JSON
              </Button>
            )}
          />
        )}
        {serviceCredentialGovernanceConfigLoadState === "ready" && serviceCredentialGovernanceHandoffState !== "ready" && (
          <div className="application-access-service-credential-alignment" aria-label={serviceCredentialGovernanceWorkspaceTitle}>
            <Alert
              className="enterprise-identity-console-alert"
              type={serviceCredentialGovernanceActionRows.length > 0 ? "warning" : "success"}
              showIcon
              message={serviceCredentialGovernanceActionRows.length > 0
                ? t(
                  "Insight Admin Provider pending config message",
                  "这里不保存密钥，也不配置 API/Gateway 用量 provider。请在 Admin 的 env/config 里补配置，补完重启后刷新。"
                )
                : "材料已齐，点击生成 Admin 交接包。"}
            />
            {serviceCredentialGovernanceActionRows.length > 0 && (
              <Space size={[6, 6]} wrap>
                {serviceCredentialGovernanceActionRows.flatMap(row => {
                  const missingKeys = getServiceCredentialGovernanceDeploymentMissingKeys(row.statusGroup);
                  return (missingKeys.length > 0 ? missingKeys : [getServiceCredentialGovernanceReferencePlaceholder(row.key)]).map(key => (
                    <Tag key={`${row.key}-${key}`}>{key}</Tag>
                  ));
                })}
              </Space>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <EnterpriseIdentitySection
      className={className}
      title={t("Insight Admin Provider status title", "Insight Admin Provider 状态")}
      description={t("Insight Admin Provider page description", "面向 Insight 的 Admin Provider copy-safe 元数据交接页。")}
      extra={<Tag className={`enterprise-identity-tone-${serviceCredentialGovernanceEffectiveSummary.tone}`}>{serviceCredentialGovernanceEffectiveSummary.label}</Tag>}
    >
      {serviceCredentialGovernanceBoundarySummary}
      {serviceCredentialGovernanceWrapperCapabilities}
      {serviceCredentialGovernanceEvidenceSummary}
      {serviceCredentialGovernanceLoadState === "loading" && (
        <Alert
          className="enterprise-identity-console-alert"
          type="info"
          showIcon
          message="加载服务凭据治理状态..."
        />
      )}
      {serviceCredentialGovernanceLoadState === "error" && (
        <Alert
          className="enterprise-identity-console-alert"
          type="warning"
          showIcon
          message="服务凭据治理状态暂不可用"
          description="应用列表操作不受影响；请稍后刷新或进入配置页核对。"
        />
      )}
      {serviceCredentialGovernanceLoadState === "empty" && (
        <Alert
          className="enterprise-identity-console-alert"
          type="warning"
          showIcon
          message="暂无服务凭据治理状态"
        />
      )}
      {serviceCredentialGovernanceHasPendingMaterials && (
        <Alert className="enterprise-identity-console-alert" type="info" showIcon message={`下一步：${serviceCredentialGovernanceNextAction}`} />
      )}
      {serviceCredentialGovernanceWorkspace}
    </EnterpriseIdentitySection>
  );
}

export default ApplicationAccessServiceCredentialGovernancePanel;
