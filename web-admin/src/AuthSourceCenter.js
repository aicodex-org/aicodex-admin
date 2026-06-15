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
import {Alert, Button, Card, Col, Progress, Row, Space, Spin, Tag, Typography} from "antd";
import React from "react";
import {Link} from "react-router-dom";

const {Text, Title} = Typography;

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

function AuthSourceCenter({providers = [], loading = false}) {
  const cards = buildAuthSourceCenterCards(providers);
  const hasProviders = Array.isArray(providers) && providers.length > 0;

  return (
    <div className="auth-source-center">
      <div className="auth-source-center-header">
        <Space direction="vertical" size={4}>
          <Title level={3}>认证源中心</Title>
          <Text type="secondary">企业微信、飞书、OIDC 的只读接入状态、配置完整度与诊断入口</Text>
        </Space>
        <Space wrap>
          <Link to="/providers"><Button icon={<SettingOutlined />}>配置认证源</Button></Link>
          <Link to="/records"><Button icon={<ExclamationCircleOutlined />}>查看审计记录</Button></Link>
        </Space>
      </div>

      {loading && (
        <Alert
          className="auth-source-center-alert"
          type="info"
          showIcon
          message="加载认证源状态..."
        />
      )}
      {!loading && !hasProviders && (
        <Alert
          className="auth-source-center-alert"
          type="warning"
          showIcon
          message="暂无认证源配置，先从 Provider 列表新增或进入同步诊断页面核对。"
        />
      )}

      <Row gutter={[16, 16]}>
        {cards.map(card => (
          <Col xs={24} md={8} key={card.key}>
            <Card className="auth-source-center-card" variant="borderless">
              <Space direction="vertical" size={12} className="auth-source-center-card-body">
                <Space className="auth-source-center-card-title" align="start">
                  <SafetyCertificateOutlined />
                  <Space direction="vertical" size={0}>
                    <Text strong>{card.title}</Text>
                    <Text type="secondary">{card.description}</Text>
                  </Space>
                </Space>

                <Space wrap>
                  <Tag color={getStatusColor(card.status)}>{card.status}</Tag>
                  <Tag>{card.authStatus}</Tag>
                </Space>

                <div>
                  <Text type="secondary">配置完整度 {card.completeness}%</Text>
                  <Progress percent={card.completeness} size="small" status={getProgressStatus(card.status)} />
                </div>

                <Space direction="vertical" size={2}>
                  <Text>匹配来源：{card.providerDisplayName}</Text>
                  <Text type="secondary">最近失败：以同步页面和审计记录为准</Text>
                </Space>

                <Space wrap className="auth-source-center-card-actions">
                  <Link to={card.configPath}>{card.status === "未启用" ? "进入配置" : "编辑配置"}</Link>
                  <Link to={card.diagnosticPath}>{card.diagnosticLabel}</Link>
                </Space>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} className="auth-source-center-section">
        <Col xs={24} lg={14}>
          <Card title="最近同步 / 授权状态" variant="borderless" className="auth-source-center-panel">
            <Space direction="vertical" size={10} className="auth-source-center-diagnostic-list">
              {cards.map(card => (
                <div className="auth-source-center-diagnostic-item" key={card.key}>
                  <Space align="start">
                    <CloudSyncOutlined />
                    <Space direction="vertical" size={2}>
                      <Space wrap>
                        <Text strong>{card.title}</Text>
                        <Tag color={getStatusColor(card.status)}>{card.status}</Tag>
                      </Space>
                      <Text type="secondary">{card.authStatus}，当前不触发同步、授权刷新或真实探测。</Text>
                      <Link to={card.diagnosticPath}>{card.diagnosticLabel}</Link>
                    </Space>
                  </Space>
                </div>
              ))}
            </Space>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="最近失败摘要" variant="borderless" className="auth-source-center-panel">
            <Space direction="vertical" size={12}>
              <Space align="start">
                <CheckCircleOutlined />
                <Space direction="vertical" size={2}>
                  <Text strong>以同步页面和审计记录为准</Text>
                  <Text type="secondary">当前页面仅做前端只读聚合，不读取失败详情、不触发重试。</Text>
                </Space>
              </Space>
              <Space wrap>
                <Link to="/records">查看审计记录</Link>
                <Link to="/wecom-org-sync">企业微信诊断</Link>
                <Link to="/feishu-org-sync">飞书诊断</Link>
              </Space>
            </Space>
          </Card>
        </Col>
      </Row>

      {loading && (
        <div className="auth-source-center-loading">
          <Spin />
        </div>
      )}
    </div>
  );
}

export default AuthSourceCenter;
