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

import {
  ApiOutlined,
  AppstoreAddOutlined,
  AuditOutlined,
  ExclamationCircleOutlined,
  SafetyCertificateOutlined,
  SafetyOutlined
} from "@ant-design/icons";
import {Alert, Button, Space, Spin, Tag, Typography} from "antd";
import i18next from "i18next";
import React from "react";
import {Link} from "react-router-dom";
import {getServiceCredentialGovernanceStatus} from "./backend/ApplicationAccessServiceCredentialGovernanceBackend";
import type {ServiceCredentialGovernanceStatusResponse} from "./backend/ApplicationAccessServiceCredentialGovernanceBackend";
import {
  EnterpriseIdentityConsolePage,
  EnterpriseIdentityRiskList,
  EnterpriseIdentitySection
} from "./common/EnterpriseIdentityConsoleLayout";

const {Text} = Typography;

type IdentitySourceStatus = "explicit" | "fallback" | "missing" | "not-applicable";
type ApplicationStatus = "已停用" | "接入完整" | "待补全";
type SummaryTone = "processing" | "warning" | "success";

interface ApplicationProviderBinding {
  name?: unknown;
  category?: unknown;
  targetOrganization?: unknown;
  provider?: {
    category?: unknown;
  } | null;
  [key: string]: unknown;
}

interface ApplicationAccessRecord {
  owner?: unknown;
  organization?: unknown;
  name?: unknown;
  displayName?: unknown;
  clientId?: unknown;
  redirectUris?: unknown;
  scopes?: unknown;
  providers?: unknown;
  grantTypes?: unknown;
  isDeleted?: unknown;
  disableSignin?: unknown;
  enabled?: unknown;
  [key: string]: unknown;
}

interface AccessChecks {
  hasClientId: boolean;
  hasRedirectUris: boolean;
  hasScopes: boolean;
  hasProviders: boolean;
  hasGrantTypes: boolean;
  hasIdentitySourceOrganization: boolean;
  identitySourceStatus: IdentitySourceStatus;
}

interface ApplicationAccessCard {
  key: string;
  name: string;
  displayName: string;
  status: ApplicationStatus;
  completeness: number;
  editPath: string;
  clientStatus: string;
  grantStatus: string;
  callbackStatus: string;
  scopeStatus: string;
  providerStatus: string;
  identitySourceStatus: string;
}

interface ApplicationAccessMetrics {
  totalApplications: number;
  enabledApplications: number;
  completeApplications: number;
  callbackReadyApplications: number;
  scopedApplications: number;
  providerBoundApplications: number;
  identitySourceReadyApplications: number;
}

interface ApplicationAccessRiskItem {
  key: string;
  title: string;
  count: number;
  actionPath: string;
  actionLabel: string;
}

interface ApplicationAccessCenterSummary {
  metrics: ApplicationAccessMetrics;
  cards: ApplicationAccessCard[];
  riskItems: ApplicationAccessRiskItem[];
}

interface SummaryItem {
  key: string;
  label: string;
  value: number;
  description: string;
  tone: SummaryTone;
}

interface ApplicationAccessCenterProps {
  applications?: unknown[];
  loading?: boolean;
}

type ServiceCredentialGovernanceLoadState = "loading" | "ready" | "error" | "empty";
type ServiceCredentialGovernanceGroup = ServiceCredentialGovernanceStatusResponse["groups"][number];
type ServiceCredentialGovernanceStatus = ServiceCredentialGovernanceGroup["status"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readDisplayValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  return `${value}`;
}

function readTruthyDisplayValue(value: unknown): string {
  return value ? `${value}` : "";
}

function asApplicationRecord(value: unknown): ApplicationAccessRecord {
  return isRecord(value) ? value as ApplicationAccessRecord : {};
}

function asProviderBinding(value: unknown): ApplicationProviderBinding {
  return isRecord(value) ? value as ApplicationProviderBinding : {};
}

function t(key: string, defaultValue = key): string {
  const namespacedKey = `general:${key}`;
  const translated = i18next.t(namespacedKey, {defaultValue});
  return translated === namespacedKey || translated === key ? defaultValue : String(translated);
}

function toArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (value === null || value === undefined || value === "") {
    return [];
  }

  return [value];
}

function hasNonEmptyValue(values: unknown): boolean {
  return toArray(values).some(value => {
    const displayValue = isRecord(value) ? value.name ?? value.scope ?? "" : value ?? "";
    return `${displayValue}`.trim() !== "";
  });
}

function getApplicationName(application?: ApplicationAccessRecord | null): string {
  return readTruthyDisplayValue(application?.displayName) || readTruthyDisplayValue(application?.name) || "未命名应用";
}

function getApplicationEditPath(application?: ApplicationAccessRecord | null): string {
  const name = readTruthyDisplayValue(application?.name);
  if (!name) {
    return "/applications";
  }

  return `/applications/${readTruthyDisplayValue(application?.organization) || readTruthyDisplayValue(application?.owner) || "admin"}/${name}`;
}

function isApplicationDisabled(application?: ApplicationAccessRecord | null): boolean {
  return Boolean(application?.isDeleted) || application?.disableSignin === true || application?.enabled === false;
}

function getAccessChecks(application?: ApplicationAccessRecord | null): AccessChecks {
  const identitySourceStatus = getIdentitySourceStatus(application);
  return {
    hasClientId: readDisplayValue(application?.clientId).trim() !== "",
    hasRedirectUris: hasNonEmptyValue(application?.redirectUris),
    hasScopes: hasNonEmptyValue(application?.scopes),
    hasProviders: hasNonEmptyValue(application?.providers),
    hasGrantTypes: hasNonEmptyValue(application?.grantTypes),
    hasIdentitySourceOrganization: identitySourceStatus !== "missing",
    identitySourceStatus,
  };
}

function getCompleteness(checks: AccessChecks): number {
  const values = [checks.hasClientId, checks.hasRedirectUris, checks.hasScopes, checks.hasProviders];
  const completed = values.filter(Boolean).length;
  return Math.round((completed / values.length) * 100);
}

function getApplicationStatus(application: ApplicationAccessRecord, checks: AccessChecks): ApplicationStatus {
  if (isApplicationDisabled(application)) {
    return "已停用";
  }

  return getCompleteness(checks) === 100 && checks.hasIdentitySourceOrganization ? "接入完整" : "待补全";
}

function getLoginProviderBindings(application?: ApplicationAccessRecord | null): ApplicationProviderBinding[] {
  return toArray(application?.providers).map(asProviderBinding).filter(providerItem => {
    const nestedProvider = isRecord(providerItem.provider) ? providerItem.provider : {};
    const category = readDisplayValue(nestedProvider.category) || readDisplayValue(providerItem.category);
    return ["OAuth", "Web3", "SAML"].includes(category);
  });
}

function getIdentitySourceStatus(application?: ApplicationAccessRecord | null): IdentitySourceStatus {
  const loginProviders = getLoginProviderBindings(application);
  if (loginProviders.length === 0) {
    return "not-applicable";
  }
  if (loginProviders.some(providerItem => readDisplayValue(providerItem.targetOrganization).trim() !== "")) {
    return "explicit";
  }
  if (readDisplayValue(application?.organization).trim() !== "") {
    return "fallback";
  }
  return "missing";
}

function buildRiskItems(applications: ApplicationAccessRecord[], cards: ApplicationAccessCard[]): ApplicationAccessRiskItem[] {
  const countBy = (predicate: (application: ApplicationAccessRecord) => boolean) => applications.filter(predicate).length;
  const riskItems: ApplicationAccessRiskItem[] = [
    {
      key: "missing-redirect-uris",
      title: "缺少回调地址",
      count: countBy((application) => !getAccessChecks(application).hasRedirectUris),
      actionPath: "/applications",
      actionLabel: "编辑应用",
    },
    {
      key: "missing-scopes",
      title: "缺少授权范围",
      count: countBy((application) => !getAccessChecks(application).hasScopes),
      actionPath: "/applications",
      actionLabel: "补全授权范围",
    },
    {
      key: "missing-providers",
      title: "缺少认证源绑定",
      count: countBy((application) => !getAccessChecks(application).hasProviders),
      actionPath: "/providers",
      actionLabel: "配置认证源",
    },
    {
      key: "missing-client-id",
      title: "客户端标识待配置",
      count: countBy((application) => !getAccessChecks(application).hasClientId),
      actionPath: "/applications",
      actionLabel: "核对应用",
    },
    {
      key: "missing-identity-source-organization",
      title: "认证源目标组织待补全",
      count: countBy((application) => !getAccessChecks(application).hasIdentitySourceOrganization),
      actionPath: "/applications",
      actionLabel: "补全目标组织",
    },
    {
      key: "disabled-applications",
      title: "应用已停用",
      count: cards.filter(card => card.status === "已停用").length,
      actionPath: "/applications",
      actionLabel: "查看应用",
    },
  ].filter(item => item.count > 0);

  if (riskItems.length === 0 && applications.length > 0) {
    return [{
      key: "all-ready",
      title: "本页未发现接入缺口",
      count: 0,
      actionPath: "/records",
      actionLabel: "查看审计",
    }];
  }

  return riskItems;
}

// 只返回可展示摘要，不携带 clientSecret、token 或其它敏感配置原值。
export function buildApplicationAccessCenterSummary(applications: unknown = []): ApplicationAccessCenterSummary {
  const normalizedApplications = Array.isArray(applications) ? applications.map(asApplicationRecord) : [];
  const cards = normalizedApplications.map((application) => {
    const checks = getAccessChecks(application);
    const completeness = getCompleteness(checks);
    const status = getApplicationStatus(application, checks);
    const name = readTruthyDisplayValue(application.name);
    const owner = readTruthyDisplayValue(application.owner);
    const organization = readTruthyDisplayValue(application.organization);
    const displayName = getApplicationName(application);

    return {
      key: `${owner || organization || "admin"}/${name || displayName}`,
      name,
      displayName,
      status,
      completeness,
      editPath: getApplicationEditPath(application),
      clientStatus: checks.hasClientId ? "客户端标识已配置" : "客户端标识待配置",
      grantStatus: checks.hasGrantTypes ? "授权类型已配置" : "授权类型待核对",
      callbackStatus: checks.hasRedirectUris ? "回调地址已配置" : "回调地址待补全",
      scopeStatus: checks.hasScopes ? "授权范围已配置" : "授权范围待补全",
      providerStatus: checks.hasProviders ? "认证源已绑定" : "认证源待绑定",
      identitySourceStatus: getIdentitySourceStatusText(checks.identitySourceStatus),
    };
  });

  const metrics = {
    totalApplications: normalizedApplications.length,
    enabledApplications: normalizedApplications.filter(application => !isApplicationDisabled(application)).length,
    completeApplications: cards.filter(card => card.status === "接入完整").length,
    callbackReadyApplications: normalizedApplications.filter(application => getAccessChecks(application).hasRedirectUris).length,
    scopedApplications: normalizedApplications.filter(application => getAccessChecks(application).hasScopes).length,
    providerBoundApplications: normalizedApplications.filter(application => getAccessChecks(application).hasProviders).length,
    identitySourceReadyApplications: normalizedApplications.filter(application => getAccessChecks(application).hasIdentitySourceOrganization).length,
  };

  return {
    metrics,
    cards,
    riskItems: buildRiskItems(normalizedApplications, cards),
  };
}

function buildSummaryItems(summary: ApplicationAccessCenterSummary): SummaryItem[] {
  return [
    {
      key: "total",
      label: "应用",
      value: summary.metrics.totalApplications,
      description: `启用 ${summary.metrics.enabledApplications}`,
      tone: summary.metrics.totalApplications > 0 ? "processing" : "warning",
    },
    {
      key: "complete",
      label: "接入完整",
      value: summary.metrics.completeApplications,
      description: "客户端、回调、范围、认证源",
      tone: summary.metrics.completeApplications > 0 ? "success" : "warning",
    },
    {
      key: "callbacks",
      label: "回调地址",
      value: summary.metrics.callbackReadyApplications,
      description: "已配置应用",
      tone: summary.metrics.callbackReadyApplications > 0 ? "success" : "warning",
    },
    {
      key: "identity-source",
      label: "身份源已绑定",
      value: summary.metrics.identitySourceReadyApplications,
      description: "OAuth / OIDC 目标组织",
      tone: summary.metrics.identitySourceReadyApplications > 0 ? "success" : "warning",
    },
  ];
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

function buildServiceCredentialGovernanceItems(groups: ServiceCredentialGovernanceGroup[]) {
  return groups.map(group => {
    const tone = getServiceCredentialGovernanceTone(group.status);
    const missingCount = group.missingKeys?.length ?? 0;
    const configuredCount = group.configuredKeys?.length ?? 0;
    const reasonCount = group.blockedReasons?.length ?? 0;
    const keySummary = missingCount > 0
      ? `缺少 ${missingCount} 个配置 key，已识别 ${configuredCount} 个配置 key。`
      : `已识别 ${configuredCount} 个配置 key。`;
    const description = reasonCount > 0
      ? `${keySummary} 阻断原因 ${reasonCount} 项；仅展示 key 名和状态。`
      : `${keySummary} 仅展示 key 名和状态。`;
    const action = group.remediationRoute && group.remediationRoute.startsWith("/")
      ? {key: `${group.key}-remediation`, to: group.remediationRoute, label: "进入配置"}
      : undefined;

    return {
      key: group.key,
      title: group.label || group.key,
      description,
      icon: <SafetyOutlined />,
      tone,
      badge: getServiceCredentialGovernanceStatusLabel(group.status),
      action,
    };
  });
}

function ApplicationAccessCenter({applications = [], loading = false}: ApplicationAccessCenterProps): React.ReactElement {
  const [serviceCredentialGovernance, setServiceCredentialGovernance] = React.useState<ServiceCredentialGovernanceStatusResponse | null>(null);
  const [serviceCredentialGovernanceLoadState, setServiceCredentialGovernanceLoadState] = React.useState<ServiceCredentialGovernanceLoadState>("loading");
  const summary = buildApplicationAccessCenterSummary(applications);
  const hasApplications = Array.isArray(applications) && applications.length > 0;
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

    return () => {
      isMounted = false;
    };
  }, []);

  const riskItems = summary.riskItems.map(item => {
    const tone: "warning" | "success" = item.count > 0 ? "warning" : "success";
    return {
      key: item.key,
      title: item.title,
      description: "用于定位接入缺口，不触发授权、回调、密钥写入或真实探测。",
      icon: <ExclamationCircleOutlined />,
      tone,
      badge: item.count > 0 ? `${item.count} 项` : "低风险",
      action: {key: "action", to: item.actionPath, label: item.actionLabel || "进入处理入口"},
    };
  });
  const summaryItems = buildSummaryItems(summary);
  const serviceCredentialGovernanceSummary = getServiceCredentialGovernanceSummary(serviceCredentialGovernance);
  const serviceCredentialGovernanceItems = buildServiceCredentialGovernanceItems(serviceCredentialGovernance?.groups ?? []);

  return (
    <EnterpriseIdentityConsolePage
      className="application-access-center"
      eyebrow="企业认证中心 / 应用接入"
      title="应用接入中心"
      description="围绕应用、OAuth/OIDC client、回调地址、授权范围、API 映射和审计入口组织当前接入状态"
      actions={(
        <Space wrap>
          <Link to="/applications"><Button icon={<AppstoreAddOutlined />}>新增应用</Button></Link>
          <Link to="/providers"><Button icon={<SafetyCertificateOutlined />}>认证源</Button></Link>
          <Link to="/platform-api-mappings"><Button type="primary" icon={<ApiOutlined />}>API 网关映射</Button></Link>
          <Link to="/records"><Button icon={<AuditOutlined />}>查看审计记录</Button></Link>
        </Space>
      )}
    >

      {loading && (
        <Alert
          className="enterprise-identity-console-alert"
          type="info"
          showIcon
          message="加载应用接入状态..."
        />
      )}
      {!loading && !hasApplications && (
        <Alert
          className="enterprise-identity-console-alert"
          type="warning"
          showIcon
          message="暂无应用接入，先新增应用或进入 API 映射核对接入契约。"
        />
      )}

      <div className="application-access-readiness-rail application-access-readiness-rail-compact enterprise-identity-compact-rail">
        <div className="enterprise-identity-rail-summary" aria-label={t("Application access summary", "应用接入摘要")}>
          {summaryItems.map(item => (
            <div className={`enterprise-identity-rail-summary-item enterprise-identity-tone-${item.tone}`} key={item.key}>
              <Text type="secondary">{item.label}</Text>
              <strong>{item.value}</strong>
              <Text type="secondary">{item.description}</Text>
            </div>
          ))}
        </div>
        <EnterpriseIdentitySection
          className="enterprise-identity-rail-section"
          title="优先处理"
          description="摘要来自本页数据，不代表后端全量聚合事实"
          extra={<Text type="secondary">治理摘要</Text>}
        >
          <EnterpriseIdentityRiskList items={riskItems} />
        </EnterpriseIdentitySection>
        <EnterpriseIdentitySection
          className="enterprise-identity-rail-section"
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
          {serviceCredentialGovernanceLoadState === "ready" && (
            <EnterpriseIdentityRiskList items={serviceCredentialGovernanceItems} />
          )}
        </EnterpriseIdentitySection>
      </div>

      {loading && (
        <div className="application-access-center-loading">
          <Spin />
        </div>
      )}
    </EnterpriseIdentityConsolePage>
  );
}

function getIdentitySourceStatusText(status: IdentitySourceStatus): string {
  switch (status) {
  case "explicit":
    return "身份源组织已显式绑定";
  case "fallback":
    return "身份源使用应用默认组织";
  case "missing":
    return "身份源目标组织待补全";
  default:
    return "无登录身份源组织要求";
  }
}

export default ApplicationAccessCenter;
