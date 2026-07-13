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
  ExclamationCircleOutlined,
  SafetyCertificateOutlined,
  SettingOutlined
} from "@ant-design/icons";
import {Alert, Button, Progress, Space, Spin, Tag, Typography} from "antd";
import i18next from "i18next";
import React from "react";
import {Link} from "react-router-dom";
import {
  EnterpriseIdentityConsolePage
} from "./common/EnterpriseIdentityConsoleLayout";

const {Text} = Typography;

type AuthSourceKey = "wecom" | "feishu" | "dingtalk" | "oidc";
type AuthSourceStatus = "已启用" | "待补全" | "未启用";
type AuthSourceTone = "success" | "warning" | "default" | "processing";
type AuthProviderRequiredField = "clientId" | "clientSecret" | "providerUrl";

interface AuthProvider {
  owner?: string;
  name?: string;
  displayName?: string;
  type?: string;
  category?: string;
  providerUrl?: string;
  clientId?: string | null;
  clientSecret?: string | null;
}

interface AuthSourceDefinition {
  key: AuthSourceKey;
  title: string;
  description: string;
  matchers: string[];
  requiredFields: AuthProviderRequiredField[];
  configPath: string;
  diagnosticPath: string;
  diagnosticLabel: string;
  authStatus: string;
}

export interface AuthSourceCenterCard {
  key: AuthSourceKey;
  title: string;
  description: string;
  status: AuthSourceStatus;
  completeness: number;
  providerName: string;
  providerDisplayName: string;
  configPath: string;
  diagnosticPath: string;
  diagnosticLabel: string;
  authStatus: string;
}

interface AuthSourceSummaryItem {
  key: string;
  label: string;
  value: number;
  description: string;
  tone: AuthSourceTone;
}

interface AuthSourceCenterProps {
  providers?: AuthProvider[];
  loading?: boolean;
}

function t(key: string, defaultValue = key): string {
  const namespacedKey = `general:${key}`;
  const translated = i18next.t(namespacedKey, {defaultValue}) as string;
  return translated === namespacedKey || translated === key ? defaultValue : translated;
}

// 认证源中心只归类展示安全摘要，避免把 provider 密钥或真实运行探测结果带入页面状态。
const AUTH_SOURCE_DEFINITIONS: AuthSourceDefinition[] = [
  {
    key: "wecom",
    title: "企业微信",
    description: "企业微信扫码、账号映射与组织同步入口",
    matchers: ["wecom", "wechat", "企业微信"],
    requiredFields: ["clientId", "clientSecret", "providerUrl"],
    configPath: "/providers",
    diagnosticPath: "/wecom-org-sync",
    diagnosticLabel: "企业微信诊断",
    authStatus: "同步状态待巡检",
  },
  {
    key: "feishu",
    title: "飞书",
    description: "飞书/Lark 登录与组织同步入口",
    matchers: ["feishu", "lark", "飞书"],
    requiredFields: ["clientId", "clientSecret", "providerUrl"],
    configPath: "/providers",
    diagnosticPath: "/feishu-org-sync",
    diagnosticLabel: "飞书诊断",
    authStatus: "同步状态待巡检",
  },
  {
    key: "dingtalk",
    title: "钉钉",
    description: "钉钉扫码登录与组织同步入口",
    matchers: ["dingtalk", "dingding", "钉钉"],
    requiredFields: ["clientId", "clientSecret", "providerUrl"],
    configPath: "/providers",
    diagnosticPath: "/dingtalk-org-sync",
    diagnosticLabel: "钉钉诊断",
    authStatus: "同步状态待巡检",
  },
  {
    key: "oidc",
    title: "OIDC",
    description: "企业 IdP、OIDC Discovery 与回调配置入口",
    matchers: ["oidc", "openid", "openidconnect"],
    requiredFields: ["clientId", "clientSecret", "providerUrl"],
    configPath: "/providers",
    diagnosticPath: "/providers",
    diagnosticLabel: "OIDC 配置",
    authStatus: "授权状态待核对",
  },
];

function normalize(value: unknown): string {
  return `${value ?? ""}`.toLowerCase();
}

function matchesProvider(provider: AuthProvider | undefined, definition: AuthSourceDefinition): boolean {
  const searchable = [
    provider?.type,
    provider?.category,
    provider?.name,
    provider?.displayName,
    provider?.providerUrl,
  ].map(normalize).join(" ");

  return definition.matchers.some(matcher => searchable.includes(matcher.toLowerCase()));
}

function getConfigurationCompleteness(provider: AuthProvider | undefined, requiredFields: AuthProviderRequiredField[]): number {
  if (!provider) {
    return 0;
  }

  const completed = requiredFields.filter(field => `${provider[field] ?? ""}`.trim() !== "").length;
  return Math.round((completed / requiredFields.length) * 100);
}

function getProviderDisplayName(provider: AuthProvider | undefined): string {
  if (!provider) {
    return "未找到匹配 Provider";
  }

  return provider.displayName || provider.name || "";
}

// 导出给测试覆盖状态推导规则：只返回可展示摘要，不携带 clientSecret/token 等敏感原值。
export function buildAuthSourceCenterCards(providers: AuthProvider[] = []): AuthSourceCenterCard[] {
  return AUTH_SOURCE_DEFINITIONS.map((definition) => {
    const provider = providers.find(item => matchesProvider(item, definition));
    const completeness = getConfigurationCompleteness(provider, definition.requiredFields);
    const status: AuthSourceStatus = !provider ? "未启用" : completeness === 100 ? "已启用" : "待补全";

    return {
      key: definition.key,
      title: definition.title,
      description: definition.description,
      status,
      completeness,
      providerName: provider?.name ?? "",
      providerDisplayName: getProviderDisplayName(provider),
      configPath: provider ? `/providers/${provider.owner}/${provider.name}` : definition.configPath,
      diagnosticPath: definition.diagnosticPath,
      diagnosticLabel: definition.diagnosticLabel,
      authStatus: definition.authStatus,
    };
  });
}

function getStatusColor(status: AuthSourceStatus): AuthSourceTone {
  if (status === "已启用") {
    return "success";
  }

  if (status === "待补全") {
    return "warning";
  }

  return "default";
}

function buildSummaryItems(cards: AuthSourceCenterCard[], providers: AuthProvider[]): AuthSourceSummaryItem[] {
  const enabledCount = cards.filter(card => card.status === "已启用").length;
  const incompleteCount = cards.filter(card => card.status === "待补全").length;
  const missingCount = cards.filter(card => card.status === "未启用").length;

  return [
    {
      key: "provider-total",
      label: "Provider 总数",
      value: providers.length,
      description: "来自既有 Provider 列表",
      tone: providers.length > 0 ? "processing" : "warning",
    },
    {
      key: "enabled",
      label: "已启用认证源",
      value: enabledCount,
      description: t("Enabled auth source examples", "企业微信 / 飞书 / 钉钉 / OIDC"),
      tone: enabledCount > 0 ? "success" : "warning",
    },
    {
      key: "incomplete",
      label: "待补全配置",
      value: incompleteCount,
      description: "缺少 client 或 providerUrl",
      tone: incompleteCount > 0 ? "warning" : "success",
    },
    {
      key: "missing",
      label: "未启用类型",
      value: missingCount,
      description: "仍可进入配置入口",
      tone: missingCount > 0 ? "warning" : "success",
    },
  ];
}

function getStatusLabel(status: AuthSourceStatus): string {
  switch (status) {
  case "已启用":
    return t("Auth source status enabled", status);
  case "待补全":
    return t("Auth source status incomplete", status);
  default:
    return t("Auth source status disabled", status);
  }
}

function getAuthSourceTitle(card: AuthSourceCenterCard): string {
  return t(`Auth source ${card.key} title`, card.title);
}

function getAuthSourceDescription(card: AuthSourceCenterCard): string {
  return t(`Auth source ${card.key} description`, card.description);
}

function getDiagnosticLabel(card: AuthSourceCenterCard): string {
  return t(`Auth source ${card.key} diagnostic`, card.diagnosticLabel);
}

function AuthSourceCenter({providers = [], loading = false}: AuthSourceCenterProps): JSX.Element {
  const cards = buildAuthSourceCenterCards(providers);
  const hasProviders = Array.isArray(providers) && providers.length > 0;
  const summaryItems = buildSummaryItems(cards, providers);
  return (
    <EnterpriseIdentityConsolePage
      className="auth-source-center"
      eyebrow="企业认证中心 / 身份认证"
      title="认证源中心"
      description={t("Auth source center description", "把企业微信、飞书、钉钉和 OIDC 组织成可扫描的身份源接入、同步诊断和失败核对工作台")}
      actions={(
        <Space wrap>
          <Link to="/providers"><Button icon={<SettingOutlined />}>配置认证源</Button></Link>
          <Link to="/records"><Button icon={<ExclamationCircleOutlined />}>查看审计记录</Button></Link>
        </Space>
      )}
    >

      {loading && (
        <Alert
          className="enterprise-identity-console-alert"
          type="info"
          showIcon
          message="加载认证源状态..."
        />
      )}
      {!loading && !hasProviders && (
        <Alert
          className="enterprise-identity-console-alert"
          type="warning"
          showIcon
          message="暂无认证源配置，先从 Provider 列表新增或进入同步诊断页面核对。"
        />
      )}

      <div className="auth-source-compact-overview">
        <div className="auth-source-compact-metrics" aria-label={t("Auth source summary", "认证源摘要")}>
          {summaryItems.map(item => (
            <div className={`auth-source-compact-metric enterprise-identity-tone-${item.tone}`} key={item.key}>
              <Text type="secondary">{item.label}</Text>
              <strong>{item.value}</strong>
              <Text type="secondary">{item.description}</Text>
            </div>
          ))}
        </div>

        <div className="auth-source-compact-cards">
          {cards.map(card => (
            <article className="auth-source-compact-card" key={card.key}>
              <div className="auth-source-compact-card-heading">
                <span className="enterprise-identity-status-icon"><SafetyCertificateOutlined /></span>
                <Space direction="vertical" size={1}>
                  <Space wrap size={[6, 4]}>
                    <Text strong>{getAuthSourceTitle(card)}</Text>
                    <Tag className={`enterprise-identity-tone-${getStatusColor(card.status)}`}>
                      {getStatusLabel(card.status)}
                    </Tag>
                  </Space>
                  <Text type="secondary">{getAuthSourceDescription(card)}</Text>
                </Space>
              </div>
              <div className="auth-source-compact-progress">
                <Text>{t("Configuration completeness", "配置完整度")}</Text>
                <strong>{card.completeness}%</strong>
                <Progress percent={card.completeness} showInfo={false} size="small" />
              </div>
              <div className="auth-source-compact-card-meta">
                <Text type="secondary">{t("Matched source", "匹配来源")}：{card.providerDisplayName}</Text>
                <Text type="secondary">{card.authStatus}</Text>
              </div>
              <div className="enterprise-identity-inline-actions">
                <Link to={card.configPath}>{card.status === "未启用" ? t("Enter configuration", "进入配置") : t("Edit configuration", "编辑配置")}</Link>
                <Link to={card.diagnosticPath}>{getDiagnosticLabel(card)}</Link>
              </div>
            </article>
          ))}
        </div>
        <div className="auth-source-compact-audit">
          <Text type="secondary">{t("Recent failure based on sync pages and audit records", "最近失败：以同步页面和审计记录为准")}</Text>
          <div className="enterprise-identity-inline-actions">
            <Link to="/records">查看审计记录</Link>
            <Link to="/wecom-org-sync">{t("Auth source wecom diagnostic", "企业微信诊断")}</Link>
            <Link to="/feishu-org-sync">{t("Auth source feishu diagnostic", "飞书诊断")}</Link>
            <Link to="/dingtalk-org-sync">{t("Auth source dingtalk diagnostic", "钉钉诊断")}</Link>
          </div>
        </div>
      </div>

      {loading && (
        <div className="auth-source-center-loading">
          <Spin />
        </div>
      )}
    </EnterpriseIdentityConsolePage>
  );
}

export default AuthSourceCenter;
