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

import {FileTextOutlined, SafetyOutlined, SaveOutlined} from "@ant-design/icons";
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

interface ApplicationAccessServiceCredentialGovernancePanelProps {
  className?: string;
}

function t(key: string, defaultValue = key): string {
  const namespacedKey = `general:${key}`;
  const translated = i18next.t(namespacedKey, {defaultValue});
  return translated === namespacedKey || translated === key ? defaultValue : String(translated);
}

function getServiceCredentialGovernanceTone(status: ServiceCredentialGovernanceStatus): "success" | "warning" | "error" | "default" {
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

function getServiceCredentialGovernanceStatusLabel(status: ServiceCredentialGovernanceStatus): string {
  switch (status) {
  case "configured":
    return "已配置";
  case "blocked":
    return "已阻断";
  case "missing":
    return "缺少配置";
  case "partial":
    return "部分配置";
  default:
    return "未启用";
  }
}

function getServiceCredentialGovernanceSummary(status?: ServiceCredentialGovernanceStatusResponse | null): {label: string; tone: "success" | "warning" | "error" | "default"} {
  const groups = status?.groups ?? [];
  if (groups.some(group => group.status === "blocked")) {
    return {label: "存在阻断", tone: "error"};
  }
  if (groups.some(group => group.status === "missing" || group.status === "partial")) {
    return {label: "需核对", tone: "warning"};
  }
  if (groups.length > 0 && groups.every(group => group.status === "configured" || group.status === "not_applicable")) {
    return {label: "已脱敏", tone: "success"};
  }
  return {label: "待加载", tone: "default"};
}

function getServiceCredentialGovernanceSourceClassLabel(sourceClass?: ServiceCredentialGovernanceConfigGroup["sourceClass"]): string {
  switch (sourceClass) {
  case "external_secret_system":
    return "外部 Secret";
  case "env_config":
    return "env/config";
  default:
    return "Admin 配置";
  }
}

function getServiceCredentialReferenceStatusLabel(status?: ServiceCredentialGovernanceConfigGroup["credentialReferenceStatus"]): string {
  switch (status) {
  case "configured":
    return "引用已配置";
  case "external_secret":
    return "外部引用";
  case "missing":
    return "引用缺失";
  default:
    return "无需引用";
  }
}

function getServiceCredentialGovernanceDiagnosticTone(status: ServiceCredentialGovernanceDiagnosticGroup["status"]): "success" | "warning" | "error" | "default" {
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

function getServiceCredentialGovernanceDiagnosticStatusLabel(status: ServiceCredentialGovernanceDiagnosticGroup["status"]): string {
  switch (status) {
  case "ready":
    return "可保存核对";
  case "disabled":
    return "未启用";
  case "missing_reference":
    return "缺少引用";
  case "keep_in_env":
    return "保留在 env/config";
  case "cannot_infer":
    return "不能推断";
  default:
    return "已阻断";
  }
}

function getServiceCredentialGovernanceHandoffTone(readiness: ServiceCredentialGovernanceHandoffGroup["readiness"]): "success" | "warning" | "error" | "default" {
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

function getServiceCredentialGovernanceHandoffReadinessLabel(readiness: ServiceCredentialGovernanceHandoffGroup["readiness"]): string {
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

  React.useEffect(() => {
    let isMounted = true;
    setServiceCredentialGovernanceLoadState("loading");
    getServiceCredentialGovernanceStatus()
      .then(response => {
        if (!isMounted) {
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
        if (!isMounted) {
          return;
        }
        setServiceCredentialGovernance(null);
        setServiceCredentialGovernanceLoadState("error");
      });
    setServiceCredentialGovernanceConfigLoadState("loading");
    getServiceCredentialGovernanceConfig()
      .then(response => {
        if (!isMounted) {
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
        if (!isMounted) {
          return;
        }
        setServiceCredentialGovernanceConfig(null);
        setServiceCredentialGovernanceConfigDraft([]);
        setServiceCredentialGovernanceConfigLoadState("error");
      });

    return () => {
      isMounted = false;
    };
  }, []);

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

  const handleServiceCredentialGovernanceConfigDiagnostic = React.useCallback(() => {
    const request = buildServiceCredentialGovernanceConfigRequest(serviceCredentialGovernanceConfigDraft);
    setServiceCredentialGovernanceDiagnosticState("checking");
    diagnoseServiceCredentialGovernanceConfig(request)
      .then(response => {
        if (response.status !== "ok" || !response.data) {
          setServiceCredentialGovernanceDiagnostic(null);
          setServiceCredentialGovernanceDiagnosticState("error");
          openServiceCredentialGovernanceWorkspacePanel("diagnostic");
          return;
        }
        const sanitizedData = {
          ...response.data,
          groups: sanitizeServiceCredentialGovernanceDiagnosticGroups(response.data.groups ?? []),
        };
        setServiceCredentialGovernanceDiagnostic(sanitizedData);
        setServiceCredentialGovernanceDiagnosticState(sanitizedData.groups.length > 0 ? "ready" : "empty");
        openServiceCredentialGovernanceWorkspacePanel("diagnostic");
      })
      .catch(() => {
        setServiceCredentialGovernanceDiagnostic(null);
        setServiceCredentialGovernanceDiagnosticState("error");
        openServiceCredentialGovernanceWorkspacePanel("diagnostic");
      });
  }, [openServiceCredentialGovernanceWorkspacePanel, serviceCredentialGovernanceConfigDraft]);

  const handleServiceCredentialGovernanceHandoffPackage = React.useCallback(() => {
    if (serviceCredentialGovernanceConfigLoadState !== "ready" || serviceCredentialGovernanceConfigDraft.length === 0) {
      setServiceCredentialGovernanceHandoffPackage(null);
      setServiceCredentialGovernanceHandoffState("error");
      openServiceCredentialGovernanceWorkspacePanel("handoff");
      return;
    }

    setServiceCredentialGovernanceHandoffPackage(buildServiceCredentialGovernanceHandoffPackage({
      config: buildServiceCredentialGovernanceConfigRequest(serviceCredentialGovernanceConfigDraft),
      status: serviceCredentialGovernance,
      diagnostic: serviceCredentialGovernanceDiagnostic,
    }));
    setServiceCredentialGovernanceHandoffState("ready");
    openServiceCredentialGovernanceWorkspacePanel("handoff");
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
  const serviceCredentialGovernanceConfigActions = (
    <Space className="application-access-service-credential-workspace-actions" wrap onClick={event => event.stopPropagation()}>
      <Button
        size="small"
        type="primary"
        icon={<SaveOutlined />}
        loading={serviceCredentialGovernanceConfigSaveState === "saving"}
        disabled={serviceCredentialGovernanceConfigLoadState !== "ready"}
        onClick={handleServiceCredentialGovernanceConfigSave}
      >
        保存配置
      </Button>
      <Button
        size="small"
        icon={<SafetyOutlined />}
        loading={serviceCredentialGovernanceDiagnosticState === "checking"}
        disabled={serviceCredentialGovernanceConfigLoadState !== "ready"}
        onClick={handleServiceCredentialGovernanceConfigDiagnostic}
      >
        诊断/预检
      </Button>
      <Button
        size="small"
        icon={<FileTextOutlined />}
        disabled={serviceCredentialGovernanceConfigLoadState !== "ready"}
        onClick={handleServiceCredentialGovernanceHandoffPackage}
      >
        {t("Generate or view handoff package", "生成/查看交接包")}
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
              <div className="application-access-service-credential-alignment-header" aria-hidden="true">
                <Text type="secondary">{t("Service credential governance", "服务凭据治理")}</Text>
                <Text type="secondary">{t("Usage access governance configuration", "配置")}</Text>
                <Text type="secondary">{t("Usage access governance diagnostics", "诊断")}</Text>
              </div>
              {serviceCredentialGovernanceAlignedRows.map(row => {
                const group = row.configGroup;
                const statusGroup = row.statusGroup;
                const diagnosticGroup = row.diagnosticGroup;
                const referenceDisabled = !group || group.keepInEnv || group.credentialReferenceStatus === "not_applicable";
                const rowStatusTone = statusGroup ? getServiceCredentialGovernanceTone(statusGroup.status) : "default";
                const rowStatusLabel = statusGroup ? getServiceCredentialGovernanceStatusLabel(statusGroup.status) : "状态未返回";
                return (
                  <div className="application-access-service-credential-alignment-row" aria-label={`${row.key} 治理项对齐`} key={row.key}>
                    <div className="application-access-service-credential-alignment-cell">
                      <Text className="application-access-service-credential-alignment-mobile-label" type="secondary">{t("Service credential governance", "服务凭据治理")}</Text>
                      <Space wrap>
                        <Text strong>{row.label}</Text>
                        <Tag className={`enterprise-identity-tone-${rowStatusTone}`}>{rowStatusLabel}</Tag>
                      </Space>
                      <Text type="secondary">
                        {statusGroup
                          ? `${statusGroup.missingKeys?.length ?? 0} 个缺口，${statusGroup.configuredKeys?.length ?? 0} 个已识别配置 key`
                          : "服务凭据治理状态未返回"}
                      </Text>
                      {statusGroup?.blockedReasons && statusGroup.blockedReasons.length > 0 && (
                        <Space wrap>
                          {statusGroup.blockedReasons.map(reason => <Tag key={`${row.key}-${reason}`}>{reason}</Tag>)}
                        </Space>
                      )}
                    </div>
                    <div className="application-access-service-credential-alignment-cell">
                      <Text className="application-access-service-credential-alignment-mobile-label" type="secondary">{t("Usage access governance configuration", "配置")}</Text>
                      {group ? (
                        <>
                          <div className="application-access-service-credential-config-row-title">
                            <Space wrap>
                              <Tag>{group.enabled ? "已启用" : "未启用"}</Tag>
                              <Tag>{getServiceCredentialGovernanceSourceClassLabel(group.sourceClass)}</Tag>
                              <Tag>{getServiceCredentialReferenceStatusLabel(group.credentialReferenceStatus)}</Tag>
                              {group.keepInEnv && <Tag>保留在 env/config</Tag>}
                            </Space>
                            <Switch
                              size="small"
                              checked={group.enabled}
                              disabled={group.keepInEnv}
                              onChange={checked => updateServiceCredentialGovernanceConfigGroup(group.key, {enabled: checked})}
                            />
                          </div>
                          <Text type="secondary">{group.owner || "admin-owned"} · {group.nextAction || "核对配置引用和调用策略"}</Text>
                          <div className="application-access-service-credential-config-fields">
                            <Input
                              aria-label={`${group.key} 凭据引用`}
                              value={group.credentialReferenceKey || ""}
                              disabled={referenceDisabled}
                              placeholder={referenceDisabled ? "无需凭据引用" : "vault:service-credential-reference"}
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
                                {value: "admin_config", label: "Admin 配置"},
                                {value: "env_config", label: "env/config"},
                                {value: "external_secret_system", label: "外部 Secret"},
                              ]}
                            />
                          </div>
                        </>
                      ) : (
                        <Tag className="enterprise-identity-tone-warning">配置未返回</Tag>
                      )}
                    </div>
                    <div className="application-access-service-credential-alignment-cell">
                      <Text className="application-access-service-credential-alignment-mobile-label" type="secondary">{t("Usage access governance diagnostics", "诊断")}</Text>
                      {serviceCredentialGovernanceDiagnosticState === "idle" && <Tag>未诊断</Tag>}
                      {serviceCredentialGovernanceDiagnosticState === "checking" && <Tag>诊断中</Tag>}
                      {serviceCredentialGovernanceDiagnosticState === "error" && <Tag className="enterprise-identity-tone-warning">诊断暂不可用</Tag>}
                      {serviceCredentialGovernanceDiagnosticState === "empty" && <Tag>无诊断结果</Tag>}
                      {serviceCredentialGovernanceDiagnosticState === "ready" && diagnosticGroup && (
                        <>
                          <Space wrap>
                            <Tag className={`enterprise-identity-tone-${getServiceCredentialGovernanceDiagnosticTone(diagnosticGroup.status)}`}>{getServiceCredentialGovernanceDiagnosticStatusLabel(diagnosticGroup.status)}</Tag>
                            <Tag>{diagnosticGroup.stableAlias}</Tag>
                            <Tag>{getServiceCredentialGovernanceSourceClassLabel(diagnosticGroup.sourceClass)}</Tag>
                            <Tag>{getServiceCredentialReferenceStatusLabel(diagnosticGroup.credentialReferenceStatus)}</Tag>
                            {diagnosticGroup.keepInEnv && <Tag>keepInEnv</Tag>}
                            {diagnosticGroup.cannotInfer && <Tag>cannotInfer</Tag>}
                          </Space>
                          <Text type="secondary">
                            {(diagnosticGroup.owner || "admin-owned")} · 调用策略{diagnosticGroup.callerPolicyPresent ? "已提供" : "缺失"} · {diagnosticGroup.nextAction || "按 stable alias 处理下一步"}
                          </Text>
                        </>
                      )}
                      {serviceCredentialGovernanceDiagnosticState === "ready" && !diagnosticGroup && <Tag>未返回</Tag>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ),
    },
    serviceCredentialGovernanceHandoffState !== "idle" ? {
      key: "handoff",
      label: (
        <Space wrap>
          <Text strong>{t("Handoff package preview", "交接包预览")}</Text>
          {serviceCredentialGovernanceHandoffPackage && <Tag>{serviceCredentialGovernanceHandoffPackage.version}</Tag>}
        </Space>
      ),
      children: (
        <div className="application-access-service-credential-config" aria-label="服务凭据治理交接包预览">
          {serviceCredentialGovernanceHandoffState === "error" && (
            <Alert className="enterprise-identity-console-alert" type="warning" showIcon message={t("Service credential governance handoff package unavailable", "服务凭据治理交接包暂不可用")} />
          )}
          {serviceCredentialGovernanceHandoffState === "ready" && serviceCredentialGovernanceHandoffPackage && (
            <>
              <Space wrap>
                <Tag>{serviceCredentialGovernanceHandoffPackage.schema}</Tag>
                <Tag>{serviceCredentialGovernanceHandoffPackage.version}</Tag>
                <Tag>{serviceCredentialGovernanceHandoffPackage.targetConsumerAlias}</Tag>
                <Tag>{serviceCredentialGovernanceHandoffPackage.adminOwnerAlias}</Tag>
              </Space>
              <Text type="secondary">
                {serviceCredentialGovernanceHandoffPackage.generatedAt}
              </Text>
              {serviceCredentialGovernanceHandoffPackage.groups.map(group => (
                <div className="application-access-service-credential-config-row" key={`${group.key}-${group.readiness}`}>
                  <div className="application-access-service-credential-config-row-title">
                    <Space wrap>
                      <Text strong>{group.label || group.key}</Text>
                      <Tag className={`enterprise-identity-tone-${getServiceCredentialGovernanceHandoffTone(group.readiness)}`}>{getServiceCredentialGovernanceHandoffReadinessLabel(group.readiness)}</Tag>
                      {group.sourceClass && <Tag>{getServiceCredentialGovernanceSourceClassLabel(group.sourceClass)}</Tag>}
                      {group.credentialReferenceStatus && <Tag>{getServiceCredentialReferenceStatusLabel(group.credentialReferenceStatus)}</Tag>}
                      {group.credentialReferenceKeySummary && <Tag>{group.credentialReferenceKeySummary}</Tag>}
                      {group.callerPolicyAlias && <Tag>{group.callerPolicyAlias}</Tag>}
                      {group.keepInEnv && <Tag>keepInEnv</Tag>}
                      {group.cannotInferRuntimeTruth && <Tag>cannotInferRuntimeTruth</Tag>}
                    </Space>
                  </div>
                  <Text type="secondary">
                    {(group.ownerHint || "admin-owned")} · {group.callerPolicyPresent ? t("Caller policy provided", "调用策略已提供") : t("Caller policy missing", "调用策略缺失")} · {group.nextAction || t("Handle next step by handoff stable alias", "按交接包 stable alias 处理下一步")}
                  </Text>
                  {(group.blockedAliases.length > 0 || group.stableAliases.length > 0) && (
                    <Space wrap>
                      {group.blockedAliases.map(alias => <Tag key={`${group.key}-blocked-${alias}`}>{alias}</Tag>)}
                      {group.stableAliases.filter(alias => !group.blockedAliases.includes(alias)).map(alias => <Tag key={`${group.key}-stable-${alias}`}>{alias}</Tag>)}
                    </Space>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      ),
    } : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  return (
    <EnterpriseIdentitySection
      className={className}
      title="服务凭据治理"
      description="来自 Admin 运行态配置的脱敏状态，不触发凭据测试、登录或 Gateway 投影发布"
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
