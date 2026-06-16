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
  CheckCircleOutlined,
  CloudSyncOutlined,
  ExclamationCircleOutlined,
  SafetyCertificateOutlined,
  SettingOutlined
} from "@ant-design/icons";
import {Alert, Button, Space, Spin, Typography} from "antd";
import React from "react";
import {Link} from "react-router-dom";
import {
  EnterpriseIdentityConsolePage,
  EnterpriseIdentityRiskList,
  EnterpriseIdentitySection,
  EnterpriseIdentityStatusGrid,
  EnterpriseIdentitySummaryStrip
} from "./common/EnterpriseIdentityConsoleLayout";

const {Text} = Typography;

// 认证源中心只做前端只读归类，避免把 provider 密钥或真实运行探测结果带入页面状态。
const AUTH_SOURCE_DEFINITIONS = [
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

function normalize(value) {
  return `${value ?? ""}`.toLowerCase();
}

function matchesProvider(provider, definition) {
  const searchable = [
    provider?.type,
    provider?.category,
    provider?.name,
    provider?.displayName,
    provider?.providerUrl,
  ].map(normalize).join(" ");

  return definition.matchers.some(matcher => searchable.includes(matcher.toLowerCase()));
}

function getConfigurationCompleteness(provider, requiredFields) {
  if (!provider) {
    return 0;
  }

  const completed = requiredFields.filter(field => `${provider[field] ?? ""}`.trim() !== "").length;
  return Math.round((completed / requiredFields.length) * 100);
}

function getProviderDisplayName(provider) {
  if (!provider) {
    return "未找到匹配 Provider";
  }

  return provider.displayName || provider.name;
}

// 导出给测试覆盖状态推导规则：只返回可展示摘要，不携带 clientSecret/token 等敏感原值。
export function buildAuthSourceCenterCards(providers = []) {
  return AUTH_SOURCE_DEFINITIONS.map((definition) => {
    const provider = providers.find(item => matchesProvider(item, definition));
    const completeness = getConfigurationCompleteness(provider, definition.requiredFields);
    const status = !provider ? "未启用" : completeness === 100 ? "已启用" : "待补全";

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

function getStatusColor(status) {
  if (status === "已启用") {
    return "success";
  }

  if (status === "待补全") {
    return "warning";
  }

  return "default";
}

function getProgressStatus(status) {
  if (status === "已启用") {
    return "success";
  }

  if (status === "待补全") {
    return "normal";
  }

  return "exception";
}

function buildSummaryItems(cards, providers) {
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
      description: "企业微信 / 飞书 / OIDC",
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

function AuthSourceCenter({providers = [], loading = false}) {
  const cards = buildAuthSourceCenterCards(providers);
  const hasProviders = Array.isArray(providers) && providers.length > 0;
  const summaryItems = buildSummaryItems(cards, providers);
  const statusCards = cards.map(card => ({
    key: card.key,
    title: card.title,
    description: card.description,
    icon: <SafetyCertificateOutlined />,
    metricValue: `${card.completeness}%`,
    metricLabel: "配置完整度",
    tags: [
      {key: "status", label: card.status, tone: getStatusColor(card.status)},
      {key: "auth", label: card.authStatus, tone: "processing"},
    ],
    progress: {
      percent: card.completeness,
      label: `配置完整度 ${card.completeness}%`,
      status: getProgressStatus(card.status),
    },
    details: (
      <Space direction="vertical" size={2}>
        <Text>匹配来源：{card.providerDisplayName}</Text>
        <Text type="secondary">最近失败：以同步页面和审计记录为准</Text>
      </Space>
    ),
    actions: [
      {key: "config", to: card.configPath, label: card.status === "未启用" ? "进入配置" : "编辑配置"},
      {key: "diagnostic", to: card.diagnosticPath, label: card.diagnosticLabel},
    ],
  }));
  const diagnosticItems = cards.map(card => ({
    key: card.key,
    title: `${card.title} ${card.status}`,
    description: `${card.authStatus}，当前不触发同步、授权刷新或真实探测。`,
    icon: <CloudSyncOutlined />,
    tone: card.status === "已启用" ? "success" : "warning",
    badge: card.status,
    action: {key: "diagnostic", to: card.diagnosticPath, label: card.diagnosticLabel},
  }));

  return (
    <EnterpriseIdentityConsolePage
      className="auth-source-center"
      eyebrow="企业认证中心 / 身份认证"
      title="认证源中心"
      description="把企业微信、飞书和 OIDC 组织成可扫描的身份源接入、同步诊断和失败核对工作台"
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

      <EnterpriseIdentitySummaryStrip items={summaryItems} />
      <EnterpriseIdentityStatusGrid items={statusCards} minColumns={3} />

      <div className="enterprise-identity-two-column">
        <EnterpriseIdentitySection
          title="最近同步 / 授权状态"
          description="每个入口只做只读诊断分流，不触发同步、授权刷新或真实探测"
        >
          <EnterpriseIdentityRiskList items={diagnosticItems} />
        </EnterpriseIdentitySection>
        <EnterpriseIdentitySection
          title="最近失败摘要"
          description="当前页面只做前端只读聚合，失败详情以同步页面和审计记录为准"
        >
          <EnterpriseIdentityRiskList items={[
            {
              key: "failure-summary",
              title: "以同步页面和审计记录为准",
              description: "当前页面不读取失败详情、不触发重试，管理员可进入审计和同步诊断核对。",
              icon: <CheckCircleOutlined />,
              tone: "processing",
              badge: "只读核对",
              action: {key: "records", to: "/records", label: "查看审计记录"},
            },
          ]} />
          <div className="enterprise-identity-inline-actions enterprise-identity-inline-actions-block">
            <Link to="/wecom-org-sync">企业微信诊断</Link>
            <Link to="/feishu-org-sync">飞书诊断</Link>
          </div>
        </EnterpriseIdentitySection>
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
