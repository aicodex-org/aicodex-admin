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
import {Alert, Button, Modal, Select, Space, Tag, Typography} from "antd";
import copy from "copy-to-clipboard";
import i18next from "i18next";
import React from "react";
import {
  buildServiceCredentialGovernanceHandoffPackage,
  createInsightAdminAccessPackage,
  getServiceCredentialGovernanceConfig,
  getServiceCredentialGovernanceStatus
} from "./backend/ApplicationAccessServiceCredentialGovernanceBackend";
import type {
  AdminInsightAccessPackage,
  ServiceCredentialGovernanceConfigGroup,
  ServiceCredentialGovernanceConfigResponse,
  ServiceCredentialGovernanceDiagnosticResponse,
  ServiceCredentialGovernanceHandoffPackage,
  ServiceCredentialGovernanceStatusResponse
} from "./backend/ApplicationAccessServiceCredentialGovernanceBackend";
import * as OrganizationBackend from "./backend/OrganizationBackend";
import type {OrganizationRecord} from "./backend/OrganizationBackend";
import {EnterpriseIdentitySection} from "./common/EnterpriseIdentityConsoleLayout";
import * as Setting from "./Setting";

const {Text} = Typography;

type ServiceCredentialGovernanceLoadState = "loading" | "ready" | "error" | "empty";
type ServiceCredentialGovernanceConfigLoadState = "loading" | "ready" | "error" | "empty";
type ServiceCredentialGovernanceHandoffState = "idle" | "loading" | "ready" | "error";
type TargetOrganizationLoadState = "loading" | "ready" | "empty" | "error";
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
const INSIGHT_ADMIN_PROVIDER_RUNTIME_CAPABILITIES = [
  {key: "usage_identity_resolver", labelKey: "Insight Admin Provider usage identity resolver capability", defaultLabel: "用量身份映射"},
  {key: "gateway_organization_projection", labelKey: "Insight Admin Provider gateway projection capability", defaultLabel: "Gateway 组织投影"},
];
const INSIGHT_ADMIN_PROVIDER_DIAGNOSTICS_QUERY_PARAM = "diagnostics";
const INSIGHT_ADMIN_PROVIDER_HANDOFF_PACKAGE_SECTION_ID = "admin-provider-handoff-package";

interface ApplicationAccessServiceCredentialGovernancePanelProps {
  className?: string;
}

function t(key: string, defaultValue = key): string {
  const namespacedKey = `general:${key}`;
  const translated = i18next.t(namespacedKey, {defaultValue});
  return translated === namespacedKey || translated === key ? defaultValue : String(translated);
}

function isInsightAdminProviderDiagnosticsOpenFromUrl() {
  if (typeof window === "undefined") {
    return false;
  }
  return new URLSearchParams(window.location.search).get(INSIGHT_ADMIN_PROVIDER_DIAGNOSTICS_QUERY_PARAM) === "1";
}

function replaceInsightAdminProviderDiagnosticsUrlState(open: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  const nextUrl = new URL(window.location.href);
  if (open) {
    nextUrl.searchParams.set(INSIGHT_ADMIN_PROVIDER_DIAGNOSTICS_QUERY_PARAM, "1");
  } else {
    nextUrl.searchParams.delete(INSIGHT_ADMIN_PROVIDER_DIAGNOSTICS_QUERY_PARAM);
  }
  window.history.replaceState(window.history.state, "", `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
}

function renderInsightAdminProviderCodeText(value: string, ariaLabel?: string) {
  return (
    <Typography.Text
      className="enterprise-identity-code-text"
      copyable={{text: value}}
      ellipsis={{tooltip: value}}
      aria-label={ariaLabel}
    >
      <span translate="no">{value}</span>
    </Typography.Text>
  );
}

function getServiceCredentialGovernanceInsightBindingNextAction(): string {
  return t(
    "Handoff bind credential in Insight next action",
    "导入 Insight Profile 后，由 Insight 后端兑换安全交接授权并完成凭据绑定"
  );
}

function getInsightAdminAccessPackageErrorMessage(message?: string): string {
  const normalizedMessage = `${message ?? ""}`.toLowerCase();
  if (normalizedMessage.includes("unauthorized")
    || normalizedMessage.includes("forbidden")
    || normalizedMessage.includes("admin_secure_handoff_unauthorized")) {
    return t(
      "Insight Admin access package unauthorized",
      "当前登录态无权生成 Insight Admin 接入包，请使用 Admin owner 权限重试。"
    );
  }
  if (normalizedMessage.includes("not found")
    || normalizedMessage.includes("404")
    || normalizedMessage.includes("admin_secure_handoff_endpoint_not_deployed")) {
    return t(
      "Insight Admin access package endpoint unavailable",
      "当前后台尚未部署 Admin secure handoff 接入包接口，请更新 Admin 后端后重试。"
    );
  }
  if (normalizedMessage.includes("owner_registry")
    || normalizedMessage.includes("target_registration")
    || normalizedMessage.includes("registration")
    || normalizedMessage.includes("not_ready")) {
    return t(
      "Insight Admin access package target registration not ready",
      "目标 Insight 注册或 Admin owner registry 未就绪，暂不能生成安全交接授权。"
    );
  }
  if (normalizedMessage.includes("issuer")
    || normalizedMessage.includes("credential")
    || normalizedMessage.includes("secure_handoff_grant_unavailable")) {
    return t(
      "Insight Admin access package issuer unavailable",
      "Admin owner secure handoff 凭据源未就绪，无法生成安全交接授权。"
    );
  }
  if (normalizedMessage.includes("admin_secure_handoff_response_invalid")) {
    return t(
      "Insight Admin access package invalid response",
      "Admin secure handoff 接入包接口返回异常，请刷新后重试。"
    );
  }

  return message || t("Service credential governance handoff package unavailable", "Admin 交接包暂不可用");
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
    return "导入 Insight Profile 后，由 Insight 后端兑换安全交接授权并完成凭据绑定。";
  case "gateway_organization_projection":
    return "导入 Insight Profile 后，由 Insight 后端兑换安全交接授权并完成凭据绑定。";
  default:
    return "导入 Insight Profile 后，由 Insight 后端兑换安全交接授权并完成凭据绑定。";
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
      const nonCredentialMissingKeys = deploymentMissingKeys.filter(key => !isServiceCredentialGovernanceCredentialReferenceKey(key));
      if (nonCredentialMissingKeys.length > 0) {
        return {
          ...group,
          missingKeys: nonCredentialMissingKeys,
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

// 默认层只表达接入包是否可复制与运行能力是否完整；排障证据只在按需打开的技术诊断 Modal 中显示。
function getServiceCredentialGovernanceCapabilityStatus(
  statusGroup?: ServiceCredentialGovernanceGroup,
  configGroup?: ServiceCredentialGovernanceConfigGroup
): ServiceCredentialGovernanceCapabilityStatus {
  if (serviceCredentialGovernanceNeedsDeploymentConfig(statusGroup)) {
    const missingText = (statusGroup?.missingKeys ?? []).join(" ").toLowerCase();
    if (statusGroup?.credentialReferenceStatus === "missing" || isServiceCredentialGovernanceCredentialReferenceKey(missingText)) {
      return {label: t("Capability missing credential reference", "缺凭据引用"), tone: "warning"};
    }
    return {label: t("Capability missing deployment config", "缺交接材料"), tone: "warning"};
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
  const [serviceCredentialGovernanceHandoffPackage, setServiceCredentialGovernanceHandoffPackage] = React.useState<AdminInsightAccessPackage | null>(null);
  const [serviceCredentialGovernanceHandoffState, setServiceCredentialGovernanceHandoffState] = React.useState<ServiceCredentialGovernanceHandoffState>("idle");
  const [serviceCredentialGovernanceHandoffErrorMessage, setServiceCredentialGovernanceHandoffErrorMessage] = React.useState<string | null>(null);
  const [targetOrganizations, setTargetOrganizations] = React.useState<OrganizationRecord[]>([]);
  const [targetOrganizationLoadState, setTargetOrganizationLoadState] = React.useState<TargetOrganizationLoadState>("loading");
  const [targetOrganization, setTargetOrganization] = React.useState("");
  const [serviceCredentialGovernanceCapabilityDetailsOpen, setServiceCredentialGovernanceCapabilityDetailsOpen] = React.useState(false);
  const [serviceCredentialGovernanceTechnicalDiagnosticsOpen, setServiceCredentialGovernanceTechnicalDiagnosticsOpen] = React.useState(isInsightAdminProviderDiagnosticsOpenFromUrl);
  const serviceCredentialGovernanceTechnicalDiagnosticsTriggerRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    const syncDiagnosticsOpenFromUrl = () => {
      setServiceCredentialGovernanceTechnicalDiagnosticsOpen(isInsightAdminProviderDiagnosticsOpenFromUrl());
    };

    window.addEventListener("popstate", syncDiagnosticsOpenFromUrl);
    return () => window.removeEventListener("popstate", syncDiagnosticsOpenFromUrl);
  }, []);

  const openServiceCredentialGovernanceTechnicalDiagnostics = React.useCallback(() => {
    setServiceCredentialGovernanceTechnicalDiagnosticsOpen(true);
    replaceInsightAdminProviderDiagnosticsUrlState(true);
  }, []);

  const closeServiceCredentialGovernanceTechnicalDiagnostics = React.useCallback(() => {
    setServiceCredentialGovernanceTechnicalDiagnosticsOpen(false);
    replaceInsightAdminProviderDiagnosticsUrlState(false);
    serviceCredentialGovernanceTechnicalDiagnosticsTriggerRef.current?.focus();
  }, []);

  const handleCopyServiceCredentialGovernanceHandoffPackage = React.useCallback(() => {
    if (!serviceCredentialGovernanceHandoffPackage) {
      Setting.showMessage("error", t("Handoff package copy requires generation", "请先生成 Insight Admin 接入包"));
      return;
    }

    const copied = copy(JSON.stringify(serviceCredentialGovernanceHandoffPackage, null, 2));
    Setting.showMessage(copied ? "success" : "error", copied ? "已复制 Insight Admin 接入包 JSON" : "复制 Insight Admin 接入包失败");
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

  React.useEffect(() => {
    let isMounted = true;
    setTargetOrganizationLoadState("loading");
    OrganizationBackend.getOrganizations("admin")
      .then(response => {
        if (!isMounted) {
          return;
        }
        if (response.status !== "ok" || !Array.isArray(response.data)) {
          setTargetOrganizations([]);
          setTargetOrganization("");
          setTargetOrganizationLoadState("error");
          return;
        }
        // 候选只来自 Admin 已加载组织；排除 built-in 且清空选择，避免 UI 静默决定授权目标。
        const eligibleOrganizations = response.data
          .filter(organization => organization.owner === "admin" && organization.name.trim() !== "" && organization.name.trim() !== "built-in")
          .sort((left, right) => (left.displayName || left.name).localeCompare(right.displayName || right.name));
        setTargetOrganizations(eligibleOrganizations);
        setTargetOrganization("");
        setTargetOrganizationLoadState(eligibleOrganizations.length > 0 ? "ready" : "empty");
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }
        setTargetOrganizations([]);
        setTargetOrganization("");
        setTargetOrganizationLoadState("error");
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleServiceCredentialGovernanceHandoffPackage = React.useCallback(() => {
    const configByKey = new Map(serviceCredentialGovernanceConfigDraft.map(group => [group.key, group]));
    const hasBlockingAdminMaterials = (serviceCredentialGovernance?.groups ?? []).some(group => {
      return serviceCredentialGovernanceNeedsDeploymentConfig(group)
        && !serviceCredentialGovernanceRowHasCredentialReferenceGap({
          statusGroup: group,
          configGroup: configByKey.get(group.key),
        });
    });
    if (serviceCredentialGovernanceConfigLoadState !== "ready" || serviceCredentialGovernanceConfigDraft.length === 0) {
      setServiceCredentialGovernanceHandoffPackage(null);
      setServiceCredentialGovernanceHandoffState("error");
      setServiceCredentialGovernanceHandoffErrorMessage(t("Service credential governance handoff package unavailable", "Admin 交接包暂不可用"));
      return;
    }
    if (hasBlockingAdminMaterials) {
      setServiceCredentialGovernanceHandoffPackage(null);
      setServiceCredentialGovernanceHandoffState("error");
      setServiceCredentialGovernanceHandoffErrorMessage(t(
        "Handoff package blocked by admin material",
        "Admin owner 交接材料不完整，暂不能生成安全交接授权。"
      ));
      return;
    }
    if (targetOrganizationLoadState !== "ready" || targetOrganization === "") {
      setServiceCredentialGovernanceHandoffPackage(null);
      setServiceCredentialGovernanceHandoffState("error");
      setServiceCredentialGovernanceHandoffErrorMessage(t("Insight Admin target organization required", "请选择目标业务组织后再生成接入包"));
      return;
    }

    const copySafeMetadata = buildServiceCredentialGovernanceHandoffPackage({
      config: serviceCredentialGovernanceConfig ?? {
        source: "admin_service_credential_governance_config",
        isConfigured: serviceCredentialGovernanceConfigDraft.length > 0,
        groups: serviceCredentialGovernanceConfigDraft,
      },
      status: normalizeServiceCredentialGovernanceStatusForHandoff(serviceCredentialGovernance),
    });
    setServiceCredentialGovernanceHandoffState("loading");
    setServiceCredentialGovernanceHandoffErrorMessage(null);
    createInsightAdminAccessPackage(copySafeMetadata, targetOrganization)
      .then(response => {
        if (response.status !== "ok" || !response.data) {
          const errorMessage = getInsightAdminAccessPackageErrorMessage(response.msg);
          setServiceCredentialGovernanceHandoffPackage(null);
          setServiceCredentialGovernanceHandoffState("error");
          setServiceCredentialGovernanceHandoffErrorMessage(errorMessage);
          Setting.showMessage("error", errorMessage);
          return;
        }
        setServiceCredentialGovernanceHandoffPackage(response.data);
        setServiceCredentialGovernanceHandoffState("ready");
        setServiceCredentialGovernanceHandoffErrorMessage(null);
        const copied = copy(JSON.stringify(response.data, null, 2));
        Setting.showMessage(copied ? "success" : "error", copied ? "已复制 Insight Admin 接入包 JSON" : "复制 Insight Admin 接入包失败");
      })
      .catch(() => {
        const errorMessage = t("Service credential governance handoff package unavailable", "Admin 交接包暂不可用");
        setServiceCredentialGovernanceHandoffPackage(null);
        setServiceCredentialGovernanceHandoffState("error");
        setServiceCredentialGovernanceHandoffErrorMessage(errorMessage);
        Setting.showMessage("error", errorMessage);
      });
  }, [serviceCredentialGovernance, serviceCredentialGovernanceConfig, serviceCredentialGovernanceConfigDraft, serviceCredentialGovernanceConfigLoadState, targetOrganization, targetOrganizationLoadState]);

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
    return serviceCredentialGovernanceNeedsDeploymentConfig(row.statusGroup)
      && !serviceCredentialGovernanceRowHasCredentialReferenceGap(row);
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
    && !serviceCredentialGovernanceHasPendingMaterials
    && targetOrganizationLoadState === "ready"
    && targetOrganization !== "";
  const serviceCredentialGovernanceRuntimeCapabilityRows = INSIGHT_ADMIN_PROVIDER_RUNTIME_CAPABILITIES.map(capability => {
    const row = serviceCredentialGovernanceAlignedRows.find(candidate => candidate.key === capability.key);
    const status = getServiceCredentialGovernanceCapabilityStatus(row?.statusGroup, row?.configGroup);
    return {
      key: capability.key,
      label: t(capability.labelKey, capability.defaultLabel),
      status,
      impact: status.tone === "success"
        ? t("Runtime capability ready impact", "该运行能力可用")
        : t("Runtime capability incomplete impact", "不影响接入包导入与 Profile 启用；可能影响后续运行数据完整度"),
      nextAction: status.tone === "success"
        ? t("Handoff capability ready next action", "可进入交接包")
        : (row?.configGroup?.nextAction || row?.statusGroup?.nextAction || getServiceCredentialGovernancePrimaryGap(row?.statusGroup)),
    };
  });
  const serviceCredentialGovernanceRuntimePendingCapabilityRows = serviceCredentialGovernanceRuntimeCapabilityRows.filter(row => row.status.tone !== "success");
  const serviceCredentialGovernanceRuntimeReadyCapabilityRows = serviceCredentialGovernanceRuntimeCapabilityRows.filter(row => row.status.tone === "success");
  const serviceCredentialGovernancePackageReadiness = serviceCredentialGovernanceCanGenerate
    ? {label: t("Handoff package copy ready", "接入包可复制"), tone: "success" as ServiceCredentialGovernanceTone}
    : (serviceCredentialGovernanceConfigLoadState === "loading" || targetOrganizationLoadState === "loading"
      ? {label: t("Handoff package copy loading", "正在确认接入包"), tone: "default" as ServiceCredentialGovernanceTone}
      : {label: t("Handoff package copy blocked", "接入包暂不可复制"), tone: serviceCredentialGovernanceSummary.tone === "default" ? "default" as ServiceCredentialGovernanceTone : "error" as ServiceCredentialGovernanceTone});
  const serviceCredentialGovernanceRuntimeReadiness = serviceCredentialGovernanceRuntimePendingCapabilityRows.length > 0
    ? {
      label: t("Runtime capability pending count", "{count} 项扩展能力待配置").replace("{count}", `${serviceCredentialGovernanceRuntimePendingCapabilityRows.length}`),
      tone: "warning" as ServiceCredentialGovernanceTone,
    }
    : {label: t("Runtime capability all ready", "Provider 运行能力全部可用"), tone: "success" as ServiceCredentialGovernanceTone};
  let serviceCredentialGovernanceNextAction = t(
    "Handoff waiting for status next action",
    "等待状态加载后生成交接包"
  );
  if (serviceCredentialGovernanceHasPendingMaterials) {
    serviceCredentialGovernanceNextAction = t(
      "Handoff package blocked next action",
      "请补齐交接包生成前置条件后重试"
    );
  } else if (targetOrganizationLoadState === "error") {
    serviceCredentialGovernanceNextAction = t("Insight Admin target organization load retry", "刷新页面后重新加载业务组织");
  } else if (targetOrganizationLoadState === "empty") {
    serviceCredentialGovernanceNextAction = t("Insight Admin target organization empty next action", "请先创建可用业务组织");
  } else if (targetOrganizationLoadState === "ready" && targetOrganization === "") {
    serviceCredentialGovernanceNextAction = t("Insight Admin target organization select next action", "请选择目标业务组织");
  } else if (serviceCredentialGovernanceCanGenerate && serviceCredentialGovernanceRuntimePendingCapabilityRows.length > 0) {
    serviceCredentialGovernanceNextAction = t(
      "Handoff copy ready runtime pending next action",
      "可继续导入；扩展能力配置不影响接入包导入与 Profile 启用"
    );
  } else if (serviceCredentialGovernanceCanGenerate) {
    serviceCredentialGovernanceNextAction = t(
      "Handoff generate and bind next action",
      "复制 Insight Admin 接入包并导入 Insight Profile"
    );
  } else if (serviceCredentialGovernanceLoadState === "error" || serviceCredentialGovernanceConfigLoadState === "error") {
    serviceCredentialGovernanceNextAction = t(
      "Handoff refresh or contact admin owner next action",
      "刷新状态或请 Admin owner 核对交接材料"
    );
  }
  const serviceCredentialGovernanceActionHint = serviceCredentialGovernanceHasPendingMaterials
    ? t("Handoff package blocked hint", "请补齐交接包生成前置条件后重试")
    : (serviceCredentialGovernanceCanGenerate
      ? (serviceCredentialGovernanceRuntimePendingCapabilityRows.length > 0
        ? t("Handoff generation partial hint", "可继续导入；扩展能力配置不影响接入包导入与 Profile 启用")
        : t("Handoff generation complete hint", "可复制 Insight Admin 接入包"))
      : t("Handoff generation unavailable hint", "暂不可生成"));
  const serviceCredentialGovernancePackageBlockingRow = serviceCredentialGovernanceActionRows[0];
  const serviceCredentialGovernancePackageBlockerSummary = serviceCredentialGovernancePackageBlockingRow ? (
    <Alert
      className="enterprise-identity-console-alert application-access-service-credential-blocker"
      type="error"
      showIcon
      message={t("Handoff package copy blocked", "接入包暂不可复制")}
      description={t("Handoff package blocked hint", "请补齐交接包生成前置条件后重试")}
    />
  ) : null;
  let serviceCredentialGovernanceHandoffAlertMessage = serviceCredentialGovernanceHandoffErrorMessage
    ?? t("Service credential governance handoff package unavailable", "Admin 交接包暂不可用");
  if (serviceCredentialGovernanceHasPendingMaterials) {
    serviceCredentialGovernanceHandoffAlertMessage = t(
      "Handoff package blocked hint",
      "请补齐交接包生成前置条件后重试"
    );
  }
  const serviceCredentialGovernanceConfigActions = (
    <Space className="application-access-service-credential-workspace-actions" wrap onClick={event => event.stopPropagation()}>
      <Button
        type={serviceCredentialGovernanceHandoffState === "ready" ? "default" : "primary"}
        icon={<FileTextOutlined />}
        disabled={!serviceCredentialGovernanceCanGenerate || serviceCredentialGovernanceHandoffState === "loading"}
        loading={serviceCredentialGovernanceHandoffState === "loading"}
        onClick={handleServiceCredentialGovernanceHandoffPackage}
      >
        {serviceCredentialGovernanceHandoffState === "ready"
          ? t("Service credential handoff evidence regenerate action", "重新复制 Insight Admin 接入包")
          : t("Service credential handoff evidence action", "复制 Insight Admin 接入包")}
      </Button>
    </Space>
  );
  const serviceCredentialGovernanceCapabilityRows = [
    ...INSIGHT_ADMIN_PROVIDER_FIXED_CAPABILITIES.map(capability => ({
      key: capability.key,
      label: t(capability.labelKey, capability.defaultLabel),
      status: {label: t("Capability ready", "已就绪"), tone: "success" as ServiceCredentialGovernanceTone},
      nextAction: t("Wrapper capability ready description", "可用于 Insight 元数据交接"),
    })),
    ...serviceCredentialGovernanceRuntimeCapabilityRows,
  ];
  const serviceCredentialGovernanceReadyCapabilityRows = serviceCredentialGovernanceCapabilityRows.filter(row => row.status.tone === "success");
  const serviceCredentialGovernanceDiagnosticsSummary = t(
    "Runtime capability diagnostics summary",
    "{pending} 项扩展能力待配置 · {ready} 项运行能力可用"
  )
    .replace("{pending}", `${serviceCredentialGovernanceRuntimePendingCapabilityRows.length}`)
    .replace("{ready}", `${serviceCredentialGovernanceRuntimeReadyCapabilityRows.length}`)
    .replace("{{pending}}", `${serviceCredentialGovernanceRuntimePendingCapabilityRows.length}`)
    .replace("{{ready}}", `${serviceCredentialGovernanceRuntimeReadyCapabilityRows.length}`);
  const serviceCredentialGovernanceDeliverySummary = (
    <div className="application-access-service-credential-operator-overview" aria-label="Admin 交接摘要">
      <div className="application-access-service-credential-operator-card">
        <Text type="secondary">{t("Handoff package readiness label", "接入包状态")}</Text>
        <Tag className={`enterprise-identity-tone-${serviceCredentialGovernancePackageReadiness.tone}`}>
          {serviceCredentialGovernancePackageReadiness.label}
        </Tag>
      </div>
      <div className="application-access-service-credential-operator-card">
        <Text type="secondary">{t("Runtime capability readiness label", "Provider 运行能力")}</Text>
        <Tag className={`enterprise-identity-tone-${serviceCredentialGovernanceRuntimeReadiness.tone}`}>
          {serviceCredentialGovernanceRuntimeReadiness.label}
        </Tag>
      </div>
      <div className="application-access-service-credential-operator-card">
        <Text type="secondary">{t("Handoff delivery next action label", "下一步")}</Text>
        <Text strong>{serviceCredentialGovernanceNextAction}</Text>
      </div>
    </div>
  );
  const serviceCredentialGovernancePendingCapabilitySummary = (
    <div className="application-access-service-credential-evidence" aria-label={t("Runtime capability pending details title", "待配置的扩展能力")}>
      <Text strong>{t("Runtime capability pending details title", "待配置的扩展能力")}</Text>
      {serviceCredentialGovernanceRuntimePendingCapabilityRows.length > 0 ? (
        <div className="application-access-service-credential-compact-list">
          {serviceCredentialGovernanceRuntimePendingCapabilityRows.map(row => (
            <div className="application-access-service-credential-compact-row" aria-label={`${row.key} runtime capability`} key={row.key}>
              <Space className="application-access-service-credential-summary-title" wrap>
                <Text strong>{row.label}</Text>
                <Tag className={`enterprise-identity-tone-${row.status.tone}`}>{row.status.label}</Tag>
              </Space>
              <div className="application-access-service-credential-config-detail">
                <Text type="secondary">{row.impact}</Text>
                <Text type="secondary">{row.nextAction}</Text>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Alert className="enterprise-identity-console-alert" type="success" showIcon message={t("Runtime capability all ready", "Provider 运行能力全部可用")} />
      )}
    </div>
  );
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
  const serviceCredentialGovernanceTechnicalDiagnostics = serviceCredentialGovernanceTechnicalDiagnosticsOpen ? (
    <Modal
      centered
      footer={<Button onClick={closeServiceCredentialGovernanceTechnicalDiagnostics}>{t("Close technical diagnostics action", "关闭技术诊断")}</Button>}
      open={serviceCredentialGovernanceTechnicalDiagnosticsOpen}
      title={t("Technical diagnostics title", "技术诊断（仅供排障）")}
      width={800}
      wrapClassName="application-access-service-credential-technical-modal"
      onCancel={closeServiceCredentialGovernanceTechnicalDiagnostics}
    >
      <Space className="application-access-service-credential-technical-body" direction="vertical" size={10}>
        <Text type="secondary">{t("Technical diagnostics description", "用于排查接入包和运行能力问题；不包含真实凭据。")}</Text>
        <div className="application-access-service-credential-technical-subsection" aria-label="Insight Admin Provider wrapper routes">
          <Text type="secondary">{t("Insight Admin Provider wrapper route details title", "包装路由")}</Text>
          <Space className="application-access-service-credential-wrapper-routes" size={[6, 6]} wrap>
            {INSIGHT_ADMIN_PROVIDER_WRAPPER_ROUTES.map(route => (
              <Tag className="enterprise-identity-code-tag" key={route}>
                <span translate="no">{route}</span>
              </Tag>
            ))}
          </Space>
        </div>
        <div className="application-access-service-credential-technical-subsection" aria-label="Owner evidence technical details">
          <Text type="secondary">{t("Insight Admin Provider owner evidence details title", "所有者证据")}</Text>
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
                    <Text type="secondary">
                      {t("Handoff owner alias label", "所有者证据 alias")}：{renderInsightAdminProviderCodeText(row.owner)}
                    </Text>
                  </div>
                  <div className="application-access-service-credential-config-detail">
                    <Text type="secondary">{row.nextAction}</Text>
                    {missingKeys.length > 0 && (
                      <Space size={[6, 6]} wrap>
                        {missingKeys.map(key => (
                          <Tag className="enterprise-identity-code-tag" key={`${row.key}-${key}`}>
                            <span translate="no">{key}</span>
                          </Tag>
                        ))}
                      </Space>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Space>
    </Modal>
  ) : null;
  const serviceCredentialGovernanceTechnicalDetails = (
    <div className="application-access-service-credential-technical-details" aria-label="能力详情">
      <div className="application-access-service-credential-workspace-header">
        <div className="application-access-service-credential-summary-main">
          <Text strong>{t("Runtime capability details title", "能力详情")}</Text>
          <Text type="secondary">{serviceCredentialGovernanceDiagnosticsSummary}</Text>
        </div>
        <Button
          type="link"
          icon={serviceCredentialGovernanceCapabilityDetailsOpen ? <UpOutlined /> : <DownOutlined />}
          aria-expanded={serviceCredentialGovernanceCapabilityDetailsOpen}
          aria-label={serviceCredentialGovernanceCapabilityDetailsOpen
            ? t("Runtime capability details collapse action", "收起能力详情")
            : t("Runtime capability details expand action", "查看能力详情")}
          onClick={() => {
            setServiceCredentialGovernanceCapabilityDetailsOpen(current => !current);
          }}
        >
          {serviceCredentialGovernanceCapabilityDetailsOpen
            ? t("Runtime capability details collapse action", "收起能力详情")
            : t("Runtime capability details expand action", "查看能力详情")}
        </Button>
      </div>
      {serviceCredentialGovernanceCapabilityDetailsOpen && (
        <div className="application-access-service-credential-advanced-section">
          {serviceCredentialGovernancePendingCapabilitySummary}
          {serviceCredentialGovernanceAvailableCapabilitySummary}
        </div>
      )}
    </div>
  );
  const serviceCredentialGovernanceWorkspaceTitle = t("Insight Admin Provider copy safe handoff actions title", "交接包操作");
  const serviceCredentialGovernanceWorkspace = (
    <div className="application-access-service-credential-workspace" id={INSIGHT_ADMIN_PROVIDER_HANDOFF_PACKAGE_SECTION_ID}>
      <div className="application-access-service-credential-workspace-header">
        <div className="application-access-service-credential-summary-main">
          <Text strong>{serviceCredentialGovernanceWorkspaceTitle}</Text>
          <Text type="secondary">{serviceCredentialGovernanceActionHint}</Text>
          <Text type="secondary">{t("Handoff package credential safety note", "交接包不含真实凭据")}</Text>
        </div>
        <Space className="application-access-service-credential-workspace-actions" size={4} wrap>
          {serviceCredentialGovernanceConfigActions}
          <Button
            ref={serviceCredentialGovernanceTechnicalDiagnosticsTriggerRef}
            type="link"
            onClick={openServiceCredentialGovernanceTechnicalDiagnostics}
          >
            {t("View technical diagnostics action", "查看技术诊断")}
          </Button>
        </Space>
      </div>
      <Space className="application-access-service-credential-target-organization" direction="vertical" size={6}>
        <Text strong>{t("Insight Admin target organization label", "目标业务组织")}</Text>
        <Select
          aria-label={t("Insight Admin target organization label", "目标业务组织")}
          disabled={targetOrganizationLoadState !== "ready" || serviceCredentialGovernanceHandoffState === "loading"}
          loading={targetOrganizationLoadState === "loading"}
          options={targetOrganizations.map(organization => ({
            label: `${organization.displayName || organization.name} (${organization.name})`,
            value: organization.name,
          }))}
          placeholder={t("Insight Admin target organization placeholder", "选择接入包可访问的业务组织")}
          style={{width: "100%", maxWidth: 360}}
          value={targetOrganization || undefined}
          onChange={value => {
            setTargetOrganization(value);
            setServiceCredentialGovernanceHandoffPackage(null);
            setServiceCredentialGovernanceHandoffState("idle");
            setServiceCredentialGovernanceHandoffErrorMessage(null);
          }}
        />
        {targetOrganizationLoadState === "loading" && <Text type="secondary">{t("Insight Admin target organization loading", "加载可用业务组织...")}</Text>}
        {targetOrganizationLoadState === "empty" && <Alert type="warning" showIcon message={t("Insight Admin target organization empty", "暂无可用于接入包的业务组织")} />}
        {targetOrganizationLoadState === "error" && <Alert type="warning" showIcon message={t("Insight Admin target organization error", "业务组织加载失败，请刷新后重试")} />}
      </Space>
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
            message={serviceCredentialGovernanceHandoffAlertMessage}
          />
        )}
        {serviceCredentialGovernanceHandoffState === "ready" && serviceCredentialGovernanceHandoffPackage && (
          <Alert
            className="enterprise-identity-console-alert"
            type={serviceCredentialGovernanceRuntimePendingCapabilityRows.length > 0 ? "warning" : "success"}
            showIcon
            message={serviceCredentialGovernanceRuntimePendingCapabilityRows.length > 0
              ? t("Insight Admin Provider partial handoff ready message", "Insight Admin 接入包已复制")
              : t("Insight Admin Provider handoff ready message", "Insight Admin 接入包已复制")}
            description={serviceCredentialGovernanceRuntimePendingCapabilityRows.length > 0
              ? t(
                "Insight Admin Provider partial handoff ready description",
                "接入包包含脱敏元数据和安全交接授权摘要；真实凭据只由 Insight 后端兑换。"
              )
              : t(
                "Insight Admin Provider handoff ready description",
                "接入包不直接包含真实凭据；导入 Insight 后由后端完成兑换和绑定。"
              )}
            action={(
              <Button icon={<CopyOutlined />} size="small" onClick={handleCopyServiceCredentialGovernanceHandoffPackage}>
                复制接入包 JSON
              </Button>
            )}
          />
        )}
        {serviceCredentialGovernanceConfigLoadState === "ready" && serviceCredentialGovernanceHandoffState !== "ready" && serviceCredentialGovernanceActionRows.length === 0 && serviceCredentialGovernanceRuntimePendingCapabilityRows.length === 0 && (
          <div className="application-access-service-credential-alignment" aria-label={serviceCredentialGovernanceWorkspaceTitle}>
            <Alert
              className="enterprise-identity-console-alert"
              type="success"
              showIcon
              message={t("Handoff metadata package ready message", "材料已齐，点击复制 Insight Admin 接入包。")}
            />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <EnterpriseIdentitySection
      className={className}
      title={t("Insight Admin Provider status title", "接入状态")}
      extra={<Tag className={`enterprise-identity-tone-${serviceCredentialGovernancePackageReadiness.tone}`}>{serviceCredentialGovernancePackageReadiness.label}</Tag>}
    >
      {serviceCredentialGovernanceDeliverySummary}
      {serviceCredentialGovernancePackageBlockerSummary}
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
            "应用列表操作不受影响；请稍后刷新或请 Admin owner 核对交接材料。"
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
      {serviceCredentialGovernanceTechnicalDiagnostics}
    </EnterpriseIdentitySection>
  );
}

export default ApplicationAccessServiceCredentialGovernancePanel;
