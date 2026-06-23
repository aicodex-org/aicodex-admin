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

import {ExperimentOutlined, FileTextOutlined, ReloadOutlined, SafetyOutlined, SaveOutlined, SyncOutlined, ToolOutlined, UndoOutlined} from "@ant-design/icons";
import {Alert, Button, Collapse, Input, Select, Space, Switch, Tag, Typography} from "antd";
import i18next from "i18next";
import React from "react";
import {
  buildServiceCredentialGovernanceHandoffPackage,
  diagnoseServiceCredentialGovernanceConfig,
  getServiceCredentialGovernanceConfig,
  getServiceCredentialGovernanceStatus,
  saveServiceCredentialGovernanceConfig
} from "./backend/ApplicationAccessServiceCredentialGovernanceBackend";
import type {
  ServiceCredentialGovernanceConfigGroup,
  ServiceCredentialGovernanceConfigResponse,
  ServiceCredentialGovernanceDiagnosticResponse,
  ServiceCredentialGovernanceHandoffPackage,
  ServiceCredentialGovernanceStatusResponse
} from "./backend/ApplicationAccessServiceCredentialGovernanceBackend";
import {EnterpriseIdentitySection} from "./common/EnterpriseIdentityConsoleLayout";

const {Text} = Typography;

type ServiceCredentialGovernanceLoadState = "loading" | "ready" | "error" | "empty";
type ServiceCredentialGovernanceConfigLoadState = "loading" | "ready" | "error" | "empty";
type ServiceCredentialGovernanceConfigSaveState = "idle" | "saving" | "saved" | "error";
type ServiceCredentialGovernanceDiagnosticState = "idle" | "checking" | "ready" | "error" | "empty";
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
    return {label: "需补配置", tone: "warning"};
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
    return {label: "未完成配置", description: "缺少必填配置"};
  case "partial":
    return {label: "需补配置", description: "部分配置待补齐"};
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
    return blockedOrMissing.configGroup?.nextAction || blockedOrMissing.statusGroup?.nextAction || "补齐必填配置后保存";
  }
  if (rows.length === 0) {
    return "等待配置加载";
  }
  return "保存后执行 Dry-run/Readiness";
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
    return t("Ready for handoff", "可交接");
  case "keep_in_env":
    return t("Keep in env config", "保留在 env/config");
  case "cannot_infer":
    return t("Cannot infer", "不能推断");
  default:
    return t("Blocked", "已阻断");
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

function buildServiceCredentialGovernanceConfigRequest(groups: ServiceCredentialGovernanceConfigGroup[]): ServiceCredentialGovernanceConfigResponse {
  return {
    source: "admin_service_credential_governance_config",
    isConfigured: true,
    groups: sanitizeServiceCredentialGovernanceConfigGroups(groups),
  };
}

function sanitizeServiceCredentialGovernanceDiagnosticGroups(groups: ServiceCredentialGovernanceDiagnosticGroup[] = []): ServiceCredentialGovernanceDiagnosticGroup[] {
  return groups.map(group => ({
    ...group,
    key: containsUnsafeServiceCredentialConfigText(group.key) ? "redacted_group" : group.key,
    label: containsUnsafeServiceCredentialConfigText(group.label) ? undefined : group.label,
    owner: containsUnsafeServiceCredentialConfigText(group.owner) ? "redacted_owner" : group.owner,
    stableAlias: containsUnsafeServiceCredentialConfigText(group.stableAlias) ? "admin_service_credential_copy_safe_violation" : group.stableAlias,
    nextAction: containsUnsafeServiceCredentialConfigText(group.nextAction) ? "移除敏感材料后重新诊断" : group.nextAction,
    blockedReasons: (group.blockedReasons ?? []).filter(reason => !containsUnsafeServiceCredentialConfigText(reason)),
  }));
}

function ApplicationAccessServiceCredentialGovernancePanel({className}: ApplicationAccessServiceCredentialGovernancePanelProps): React.ReactElement {
  const [serviceCredentialGovernance, setServiceCredentialGovernance] = React.useState<ServiceCredentialGovernanceStatusResponse | null>(null);
  const [serviceCredentialGovernanceLoadState, setServiceCredentialGovernanceLoadState] = React.useState<ServiceCredentialGovernanceLoadState>("loading");
  const [serviceCredentialGovernanceConfig, setServiceCredentialGovernanceConfig] = React.useState<ServiceCredentialGovernanceConfigResponse | null>(null);
  const [serviceCredentialGovernanceConfigDraft, setServiceCredentialGovernanceConfigDraft] = React.useState<ServiceCredentialGovernanceConfigGroup[]>([]);
  const [serviceCredentialGovernanceConfigLoadState, setServiceCredentialGovernanceConfigLoadState] = React.useState<ServiceCredentialGovernanceConfigLoadState>("loading");
  const [serviceCredentialGovernanceConfigSaveState, setServiceCredentialGovernanceConfigSaveState] = React.useState<ServiceCredentialGovernanceConfigSaveState>("idle");
  const [serviceCredentialGovernanceDiagnostic, setServiceCredentialGovernanceDiagnostic] = React.useState<ServiceCredentialGovernanceDiagnosticResponse | null>(null);
  const [serviceCredentialGovernanceDiagnosticState, setServiceCredentialGovernanceDiagnosticState] = React.useState<ServiceCredentialGovernanceDiagnosticState>("idle");
  const [serviceCredentialGovernanceHandoffPackage, setServiceCredentialGovernanceHandoffPackage] = React.useState<ServiceCredentialGovernanceHandoffPackage | null>(null);
  const [serviceCredentialGovernanceHandoffState, setServiceCredentialGovernanceHandoffState] = React.useState<ServiceCredentialGovernanceHandoffState>("idle");
  const [serviceCredentialGovernanceWorkspaceActiveKeys, setServiceCredentialGovernanceWorkspaceActiveKeys] = React.useState<string[]>(["config"]);

  const openServiceCredentialGovernanceWorkspacePanel = React.useCallback((key: string) => {
    setServiceCredentialGovernanceWorkspaceActiveKeys(keys => keys.includes(key) ? keys : [...keys, key]);
  }, []);

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

  const updateServiceCredentialGovernanceConfigGroup = React.useCallback((key: string, patch: Partial<ServiceCredentialGovernanceConfigGroup>) => {
    setServiceCredentialGovernanceConfigSaveState("idle");
    setServiceCredentialGovernanceDiagnosticState("idle");
    setServiceCredentialGovernanceHandoffState("idle");
    setServiceCredentialGovernanceHandoffPackage(null);
    setServiceCredentialGovernanceWorkspaceActiveKeys(["config"]);
    setServiceCredentialGovernanceConfigDraft(groups => groups.map(group => group.key === key ? {...group, ...patch} : group));
  }, []);

  const handleServiceCredentialGovernanceConfigSave = React.useCallback(() => {
    const request = buildServiceCredentialGovernanceConfigRequest(serviceCredentialGovernanceConfigDraft);
    setServiceCredentialGovernanceConfigSaveState("saving");
    saveServiceCredentialGovernanceConfig(request)
      .then(response => {
        if (response.status !== "ok" || !response.data) {
          setServiceCredentialGovernanceConfigSaveState("error");
          return;
        }
        const sanitizedData = {
          ...response.data,
          groups: sanitizeServiceCredentialGovernanceConfigGroups(response.data.groups ?? []),
        };
        setServiceCredentialGovernanceConfig(sanitizedData);
        setServiceCredentialGovernanceConfigDraft(sanitizedData.groups);
        setServiceCredentialGovernanceConfigLoadState(sanitizedData.groups.length > 0 ? "ready" : "empty");
        setServiceCredentialGovernanceConfigSaveState("saved");
        setServiceCredentialGovernanceHandoffState("idle");
        setServiceCredentialGovernanceHandoffPackage(null);
        setServiceCredentialGovernanceWorkspaceActiveKeys(["config"]);
      })
      .catch(() => {
        setServiceCredentialGovernanceConfigSaveState("error");
      });
  }, [serviceCredentialGovernanceConfigDraft]);

  const handleServiceCredentialGovernanceStatusRefresh = React.useCallback(() => {
    loadServiceCredentialGovernanceStatus();
  }, [loadServiceCredentialGovernanceStatus]);

  const handleServiceCredentialGovernanceConfigReadback = React.useCallback(() => {
    setServiceCredentialGovernanceConfigSaveState("idle");
    setServiceCredentialGovernanceDiagnosticState("idle");
    setServiceCredentialGovernanceHandoffState("idle");
    setServiceCredentialGovernanceHandoffPackage(null);
    loadServiceCredentialGovernanceConfig();
  }, [loadServiceCredentialGovernanceConfig]);

  const handleServiceCredentialGovernanceConfigDiagnostic = React.useCallback(() => {
    const request = buildServiceCredentialGovernanceConfigRequest(serviceCredentialGovernanceConfigDraft);
    setServiceCredentialGovernanceDiagnosticState("checking");
    diagnoseServiceCredentialGovernanceConfig(request)
      .then(response => {
        if (response.status !== "ok" || !response.data) {
          setServiceCredentialGovernanceDiagnostic(null);
          setServiceCredentialGovernanceDiagnosticState("error");
          openServiceCredentialGovernanceWorkspacePanel("advanced");
          return;
        }
        const sanitizedData = {
          ...response.data,
          groups: sanitizeServiceCredentialGovernanceDiagnosticGroups(response.data.groups ?? []),
        };
        setServiceCredentialGovernanceDiagnostic(sanitizedData);
        setServiceCredentialGovernanceDiagnosticState(sanitizedData.groups.length > 0 ? "ready" : "empty");
        openServiceCredentialGovernanceWorkspacePanel("advanced");
      })
      .catch(() => {
        setServiceCredentialGovernanceDiagnostic(null);
        setServiceCredentialGovernanceDiagnosticState("error");
        openServiceCredentialGovernanceWorkspacePanel("advanced");
      });
  }, [openServiceCredentialGovernanceWorkspacePanel, serviceCredentialGovernanceConfigDraft]);

  const handleServiceCredentialGovernanceHandoffPackage = React.useCallback(() => {
    if (serviceCredentialGovernanceConfigLoadState !== "ready" || serviceCredentialGovernanceConfigDraft.length === 0) {
      setServiceCredentialGovernanceHandoffPackage(null);
      setServiceCredentialGovernanceHandoffState("error");
      openServiceCredentialGovernanceWorkspacePanel("advanced");
      return;
    }

    setServiceCredentialGovernanceHandoffPackage(buildServiceCredentialGovernanceHandoffPackage({
      config: buildServiceCredentialGovernanceConfigRequest(serviceCredentialGovernanceConfigDraft),
      status: serviceCredentialGovernance,
      diagnostic: serviceCredentialGovernanceDiagnostic,
    }));
    setServiceCredentialGovernanceHandoffState("ready");
    openServiceCredentialGovernanceWorkspacePanel("advanced");
  }, [openServiceCredentialGovernanceWorkspacePanel, serviceCredentialGovernance, serviceCredentialGovernanceConfigDraft, serviceCredentialGovernanceConfigLoadState, serviceCredentialGovernanceDiagnostic]);

  const serviceCredentialGovernanceSummary = getServiceCredentialGovernanceSummary(serviceCredentialGovernance);
  const serviceCredentialGovernanceStatusGroups = serviceCredentialGovernance?.groups ?? [];
  const serviceCredentialGovernanceDiagnosticGroups = serviceCredentialGovernanceDiagnostic?.groups ?? [];
  const serviceCredentialGovernanceStatusByKey = new Map(serviceCredentialGovernanceStatusGroups.map(group => [group.key, group]));
  const serviceCredentialGovernanceConfigByKey = new Map(serviceCredentialGovernanceConfigDraft.map(group => [group.key, group]));
  const serviceCredentialGovernanceDiagnosticByKey = new Map(serviceCredentialGovernanceDiagnosticGroups.map(group => [group.key, group]));
  const serviceCredentialGovernanceAlignedRows = Array.from(new Set([
    ...serviceCredentialGovernanceStatusGroups.map(group => group.key),
    ...serviceCredentialGovernanceConfigDraft.map(group => group.key),
    ...serviceCredentialGovernanceDiagnosticGroups.map(group => group.key),
  ])).map(key => {
    const statusGroup = serviceCredentialGovernanceStatusByKey.get(key);
    const configGroup = serviceCredentialGovernanceConfigByKey.get(key);
    const diagnosticGroup = serviceCredentialGovernanceDiagnosticByKey.get(key);
    return {
      key,
      label: statusGroup?.label || configGroup?.label || diagnosticGroup?.label || key,
      statusGroup,
      configGroup,
      diagnosticGroup,
    };
  });
  const serviceCredentialGovernanceNextAction = getServiceCredentialGovernanceNextAction(serviceCredentialGovernanceAlignedRows);
  const serviceCredentialGovernanceRequiredConfigSummary = getServiceCredentialGovernanceRequiredConfigSummary(serviceCredentialGovernanceConfigDraft);
  const serviceCredentialGovernanceConfigActions = (
    <Space className="application-access-service-credential-workspace-actions" wrap onClick={event => event.stopPropagation()}>
      <Button
        type="primary"
        icon={<SaveOutlined />}
        loading={serviceCredentialGovernanceConfigSaveState === "saving"}
        disabled={serviceCredentialGovernanceConfigLoadState !== "ready"}
        onClick={handleServiceCredentialGovernanceConfigSave}
      >
        保存配置
      </Button>
      <Button
        icon={<ReloadOutlined />}
        loading={serviceCredentialGovernanceLoadState === "loading"}
        onClick={handleServiceCredentialGovernanceStatusRefresh}
      >
        刷新状态
      </Button>
      <Button
        icon={<SyncOutlined />}
        loading={serviceCredentialGovernanceConfigLoadState === "loading"}
        onClick={handleServiceCredentialGovernanceConfigReadback}
      >
        读取配置
      </Button>
      <Button
        icon={<UndoOutlined />}
        disabled={serviceCredentialGovernanceConfigLoadState !== "ready"}
        onClick={handleServiceCredentialGovernanceConfigReadback}
      >
        恢复回读
      </Button>
      <Button
        icon={<ExperimentOutlined />}
        loading={serviceCredentialGovernanceDiagnosticState === "checking"}
        disabled={serviceCredentialGovernanceConfigLoadState !== "ready"}
        onClick={handleServiceCredentialGovernanceConfigDiagnostic}
      >
        Dry-run/Readiness
      </Button>
      <Button
        icon={<SafetyOutlined />}
        loading={serviceCredentialGovernanceDiagnosticState === "checking"}
        disabled={serviceCredentialGovernanceConfigLoadState !== "ready"}
        onClick={handleServiceCredentialGovernanceConfigDiagnostic}
      >
        Doctor
      </Button>
      <Button
        icon={<FileTextOutlined />}
        disabled={serviceCredentialGovernanceConfigLoadState !== "ready"}
        onClick={handleServiceCredentialGovernanceHandoffPackage}
      >
        {t("Service credential handoff evidence action", "Handoff/Evidence")}
      </Button>
    </Space>
  );
  const serviceCredentialGovernanceWorkspaceItems = [
    {
      key: "config",
      label: (
        <Space wrap>
          <Text strong>{t("Usage access governance alignment", "治理项对齐")}</Text>
          {serviceCredentialGovernanceConfig?.isConfigured && <Tag>已回读</Tag>}
        </Space>
      ),
      extra: serviceCredentialGovernanceConfigActions,
      children: (
        <div className="application-access-service-credential-config" aria-label="服务凭据治理配置入口">
          {serviceCredentialGovernanceConfigSaveState === "saved" && (
            <Alert className="enterprise-identity-console-alert" type="success" showIcon message="配置已保存" />
          )}
          {serviceCredentialGovernanceConfigSaveState === "error" && (
            <Alert className="enterprise-identity-console-alert" type="warning" showIcon message="服务凭据治理配置保存失败" />
          )}
          {serviceCredentialGovernanceConfigLoadState === "loading" && (
            <Alert className="enterprise-identity-console-alert" type="info" showIcon message="加载服务凭据治理配置..." />
          )}
          {serviceCredentialGovernanceConfigLoadState === "error" && (
            <Alert className="enterprise-identity-console-alert" type="warning" showIcon message="服务凭据治理配置暂不可用" />
          )}
          {serviceCredentialGovernanceConfigLoadState === "empty" && (
            <Alert className="enterprise-identity-console-alert" type="warning" showIcon message="暂无服务凭据治理配置" />
          )}
          {serviceCredentialGovernanceConfigLoadState === "ready" && (
            <div className="application-access-service-credential-alignment" aria-label={t("Usage access governance alignment", "治理项对齐")}>
              {serviceCredentialGovernanceAlignedRows.map(row => {
                const group = row.configGroup;
                const statusGroup = row.statusGroup;
                const diagnosticGroup = row.diagnosticGroup;
                const referenceDisabled = !group || group.keepInEnv || group.credentialReferenceStatus === "not_applicable";
                const rowStatusTone = statusGroup ? getServiceCredentialGovernanceTone(statusGroup.status) : "default";
                const operatorStatus = getServiceCredentialGovernanceOperatorStatus(statusGroup?.status);
                const gapCount = statusGroup?.missingKeys?.length ?? 0;
                const configuredKeyCount = statusGroup?.configuredKeys?.length ?? 0;
                const rowNextAction = group?.nextAction || statusGroup?.nextAction || "核对配置后保存";
                const rowPrimaryGap = getServiceCredentialGovernancePrimaryGap(statusGroup);
                return (
                  <div className="application-access-service-credential-summary-row" aria-label={`${row.key} 治理项对齐`} key={row.key}>
                    <div className="application-access-service-credential-summary-main">
                      <Space className="application-access-service-credential-summary-title" wrap>
                        <Text strong>{row.label}</Text>
                        <Tag className={`enterprise-identity-tone-${rowStatusTone}`}>{operatorStatus.label}</Tag>
                      </Space>
                      <Text type="secondary">
                        {statusGroup
                          ? gapCount > 0 ? `${rowPrimaryGap}，${configuredKeyCount} 项已识别` : operatorStatus.description
                          : "服务凭据治理状态未返回"}
                      </Text>
                      <Text>{rowNextAction}</Text>
                    </div>

                    <div className="application-access-service-credential-summary-status">
                      <div className="application-access-service-credential-summary-block">
                        <Text type="secondary">必填配置</Text>
                        {group ? (
                          <>
                            <Space wrap>
                              <Tag>{group.enabled ? "已启用" : "未启用"}</Tag>
                              <Tag className={group.credentialReferenceStatus === "missing" ? "enterprise-identity-tone-warning" : undefined}>
                                {getServiceCredentialGovernanceCredentialPresenceLabel(group)}
                              </Tag>
                            </Space>
                            <Text type="secondary">{getServiceCredentialGovernanceSourceClassLabel(group.sourceClass)}</Text>
                          </>
                        ) : (
                          <Tag className="enterprise-identity-tone-warning">配置未返回</Tag>
                        )}
                      </div>
                      <div className="application-access-service-credential-summary-block">
                        <Text type="secondary">预检</Text>
                        {serviceCredentialGovernanceDiagnosticState === "idle" && <Tag>尚未诊断</Tag>}
                        {serviceCredentialGovernanceDiagnosticState === "checking" && <Tag>诊断中</Tag>}
                        {serviceCredentialGovernanceDiagnosticState === "error" && <Tag className="enterprise-identity-tone-warning">诊断暂不可用</Tag>}
                        {serviceCredentialGovernanceDiagnosticState === "empty" && <Tag>无诊断结果</Tag>}
                        {serviceCredentialGovernanceDiagnosticState === "ready" && diagnosticGroup && (
                          <>
                            <Space wrap>
                              <Tag className={`enterprise-identity-tone-${getServiceCredentialGovernanceDiagnosticTone(diagnosticGroup.status)}`}>{getServiceCredentialGovernanceDiagnosticStatusLabel(diagnosticGroup.status)}</Tag>
                            </Space>
                            <Text type="secondary">
                              {diagnosticGroup.nextAction || "查看高级信息确认详情"}
                            </Text>
                          </>
                        )}
                        {serviceCredentialGovernanceDiagnosticState === "ready" && !diagnosticGroup && <Tag>未返回</Tag>}
                      </div>
                    </div>
                    {group ? (
                      <Collapse
                        className="application-access-service-credential-row-details"
                        defaultActiveKey={gapCount > 0 || statusGroup?.status === "blocked" ? [`${row.key}-config`] : []}
                        ghost
                        size="small"
                        items={[{
                          key: `${row.key}-config`,
                          label: "必填配置",
                          children: (
                            <div className="application-access-service-credential-config-detail">
                              <div className="application-access-service-credential-config-row-title">
                                <Text type="secondary">启用治理项</Text>
                                <Switch
                                  size="small"
                                  checked={group.enabled}
                                  disabled={group.keepInEnv}
                                  onChange={checked => updateServiceCredentialGovernanceConfigGroup(group.key, {enabled: checked})}
                                />
                              </div>
                              <div className="application-access-service-credential-config-fields">
                                <Input.Password
                                  aria-label={`${group.key} 凭据引用`}
                                  value={group.credentialReferenceKey || ""}
                                  disabled={referenceDisabled}
                                  placeholder={referenceDisabled ? "无需凭据引用" : "vault:service-credential-reference"}
                                  visibilityToggle={false}
                                  onChange={event => updateServiceCredentialGovernanceConfigGroup(group.key, {credentialReferenceKey: event.target.value})}
                                />
                                <Input
                                  aria-label={`${group.key} 调用策略`}
                                  value={group.callerPolicy || ""}
                                  disabled={group.keepInEnv}
                                  placeholder="aicodex-admin"
                                  onChange={event => updateServiceCredentialGovernanceConfigGroup(group.key, {callerPolicy: event.target.value})}
                                />
                                <Select
                                  aria-label={`${group.key} 来源分类`}
                                  value={group.sourceClass || "admin_config"}
                                  disabled={group.keepInEnv}
                                  onChange={sourceClass => updateServiceCredentialGovernanceConfigGroup(group.key, {sourceClass: sourceClass as ServiceCredentialGovernanceConfigGroup["sourceClass"]})}
                                  options={[
                                    {value: "admin_config", label: "Admin 管理"},
                                    {value: "env_config", label: "环境配置"},
                                    {value: "external_secret_system", label: "外部凭据"},
                                  ]}
                                />
                              </div>
                            </div>
                          ),
                        }]}
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "advanced",
      label: (
        <Space wrap>
          <ToolOutlined />
          <Text strong>{t("Advanced information", "高级信息")}</Text>
          {serviceCredentialGovernanceDiagnosticState === "ready" && <Tag>诊断已生成</Tag>}
          {serviceCredentialGovernanceHandoffPackage && <Tag>Evidence 已生成</Tag>}
        </Space>
      ),
      children: (
        <div className="application-access-service-credential-config" aria-label="服务凭据治理高级信息">
          <div className="application-access-service-credential-advanced-section">
            <div className="application-access-service-credential-config-heading">
              <Text strong>诊断详情</Text>
              {serviceCredentialGovernanceDiagnosticState === "idle" && <Tag>尚未诊断</Tag>}
              {serviceCredentialGovernanceDiagnosticState === "checking" && <Tag>诊断中</Tag>}
              {serviceCredentialGovernanceDiagnosticState === "error" && <Tag className="enterprise-identity-tone-warning">诊断暂不可用</Tag>}
              {serviceCredentialGovernanceDiagnosticState === "empty" && <Tag>无诊断结果</Tag>}
            </div>
            {serviceCredentialGovernanceDiagnosticState === "ready" && serviceCredentialGovernanceDiagnosticGroups.map(group => (
              <div className="application-access-service-credential-config-row" key={`${group.key}-${group.status}`}>
                <div className="application-access-service-credential-config-row-title">
                  <Space wrap>
                    <Text strong>{group.label || group.key}</Text>
                    <Tag className={`enterprise-identity-tone-${getServiceCredentialGovernanceDiagnosticTone(group.status)}`}>{getServiceCredentialGovernanceDiagnosticStatusLabel(group.status)}</Tag>
                  </Space>
                </div>
                <Text type="secondary">{group.nextAction || "按诊断结果处理下一步"}</Text>
                <Collapse
                  ghost
                  size="small"
                  items={[{
                    key: `${group.key}-diagnostic-metadata`,
                    label: "诊断元数据",
                    children: (
                      <Space wrap>
                        <Tag>{group.stableAlias}</Tag>
                        {group.owner && <Tag>{group.owner}</Tag>}
                        {group.sourceClass && <Tag>{getServiceCredentialGovernanceSourceClassLabel(group.sourceClass)}</Tag>}
                        {group.credentialReferenceStatus && <Tag>{getServiceCredentialReferenceStatusLabel(group.credentialReferenceStatus)}</Tag>}
                        {group.keepInEnv && <Tag>keepInEnv</Tag>}
                        {group.cannotInfer && <Tag>cannotInfer</Tag>}
                        {(group.blockedReasons ?? []).map(reason => <Tag key={`${group.key}-advanced-${reason}`}>{reason}</Tag>)}
                      </Space>
                    ),
                  }]}
                />
              </div>
            ))}
          </div>

          <div className="application-access-service-credential-advanced-section">
            <div className="application-access-service-credential-config-heading">
              <Text strong>{t("Service credential handoff evidence title", "Handoff/Evidence")}</Text>
              {serviceCredentialGovernanceHandoffPackage && <Tag>{serviceCredentialGovernanceHandoffPackage.version}</Tag>}
            </div>
            {serviceCredentialGovernanceHandoffState === "error" && (
              <Alert className="enterprise-identity-console-alert" type="warning" showIcon message={t("Service credential governance handoff package unavailable", "服务凭据治理交接包暂不可用")} />
            )}
            {serviceCredentialGovernanceHandoffState === "idle" && (
              <Alert className="enterprise-identity-console-alert" type="info" showIcon message="尚未生成 Handoff/Evidence" />
            )}
            {serviceCredentialGovernanceHandoffState === "ready" && serviceCredentialGovernanceHandoffPackage && (
              <>
                {serviceCredentialGovernanceHandoffPackage.groups.map(group => (
                  <div className="application-access-service-credential-config-row" key={`${group.key}-${group.readiness}`}>
                    <div className="application-access-service-credential-config-row-title">
                      <Space wrap>
                        <Text strong>{group.label || group.key}</Text>
                        <Tag className={`enterprise-identity-tone-${getServiceCredentialGovernanceHandoffTone(group.readiness)}`}>{getServiceCredentialGovernanceHandoffReadinessLabel(group.readiness)}</Tag>
                      </Space>
                    </div>
                    <Text type="secondary">
                      {(group.nextAction || t("Handle next step by handoff stable alias", "按 Evidence 结果处理下一步"))}
                    </Text>
                    <Text type="secondary">
                      {group.callerPolicyPresent ? t("Caller policy provided", "调用策略已提供") : t("Caller policy missing", "调用策略缺失")}
                    </Text>
                    <Collapse
                      ghost
                      size="small"
                      items={[{
                        key: `${group.key}-handoff-metadata`,
                        label: "Evidence 元数据",
                        children: (
                          <Space wrap>
                            <Tag>{serviceCredentialGovernanceHandoffPackage.schema}</Tag>
                            <Tag>{serviceCredentialGovernanceHandoffPackage.targetConsumerAlias}</Tag>
                            <Tag>{serviceCredentialGovernanceHandoffPackage.adminOwnerAlias}</Tag>
                            {group.ownerHint && <Tag>{group.ownerHint}</Tag>}
                            {group.sourceClass && <Tag>{getServiceCredentialGovernanceSourceClassLabel(group.sourceClass)}</Tag>}
                            {group.credentialReferenceStatus && <Tag>{getServiceCredentialReferenceStatusLabel(group.credentialReferenceStatus)}</Tag>}
                            {group.credentialReferenceKeySummary && <Tag>凭据引用已提供</Tag>}
                            {group.callerPolicyAlias && <Tag>{group.callerPolicyAlias}</Tag>}
                            {group.keepInEnv && <Tag>keepInEnv</Tag>}
                            {group.cannotInferRuntimeTruth && <Tag>cannotInferRuntimeTruth</Tag>}
                            {group.blockedAliases.map(alias => <Tag key={`${group.key}-blocked-${alias}`}>{alias}</Tag>)}
                            {group.stableAliases.filter(alias => !group.blockedAliases.includes(alias)).map(alias => <Tag key={`${group.key}-stable-${alias}`}>{alias}</Tag>)}
                          </Space>
                        ),
                      }]}
                    />
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      ),
    },
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  return (
    <EnterpriseIdentitySection
      className={className}
      title="服务凭据治理"
      description="只维护用量链路的配置引用和策略摘要，不保存 raw secret，不触发下游运行态动作"
      extra={<Tag className={`enterprise-identity-tone-${serviceCredentialGovernanceSummary.tone}`}>{serviceCredentialGovernanceSummary.label}</Tag>}
    >
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
      <div className="application-access-service-credential-operator-overview" aria-label="服务接入配置总览">
        <div className={`application-access-service-credential-operator-card enterprise-identity-tone-${serviceCredentialGovernanceSummary.tone}`}>
          <Text type="secondary">当前状态</Text>
          <strong>{serviceCredentialGovernanceSummary.label}</strong>
          <Text type="secondary">
            {serviceCredentialGovernanceLoadState === "ready" ? `${serviceCredentialGovernanceStatusGroups.length} 项治理项` : "等待状态加载"}
          </Text>
        </div>
        <div className="application-access-service-credential-operator-card">
          <Text type="secondary">下一步</Text>
          <strong>{serviceCredentialGovernanceNextAction}</strong>
          <Button
            size="small"
            onClick={() => openServiceCredentialGovernanceWorkspacePanel("config")}
          >
            打开必填配置
          </Button>
        </div>
        <div className="application-access-service-credential-operator-card">
          <Text type="secondary">必填配置</Text>
          <strong>{serviceCredentialGovernanceRequiredConfigSummary}</strong>
          <Text type="secondary">保存后再执行 Dry-run/Readiness</Text>
        </div>
      </div>
      <Collapse
        className="application-access-service-credential-workspace"
        activeKey={serviceCredentialGovernanceWorkspaceActiveKeys}
        onChange={keys => setServiceCredentialGovernanceWorkspaceActiveKeys(Array.isArray(keys) ? keys : [keys])}
        items={serviceCredentialGovernanceWorkspaceItems}
      />
    </EnterpriseIdentitySection>
  );
}

export default ApplicationAccessServiceCredentialGovernancePanel;
