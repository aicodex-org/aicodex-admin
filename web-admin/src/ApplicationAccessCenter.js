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
  KeyOutlined,
  LinkOutlined,
  SafetyCertificateOutlined,
  SettingOutlined
} from "@ant-design/icons";
import {Alert, Button, Card, Col, Progress, Row, Space, Spin, Statistic, Tag, Typography} from "antd";
import React from "react";
import {Link} from "react-router-dom";

const {Text, Title} = Typography;

const ENTRY_LINKS = [
  {key: "applications", label: "应用列表", to: "/applications", icon: <AppstoreAddOutlined />},
  {key: "api-mapping", label: "API 网关映射", to: "/platform-api-mappings", icon: <ApiOutlined />},
  {key: "providers", label: "OAuth/OIDC Provider", to: "/providers", icon: <SafetyCertificateOutlined />},
  {key: "resources", label: "资源", to: "/resources", icon: <SettingOutlined />},
  {key: "certs", label: "证书", to: "/certs", icon: <KeyOutlined />},
  {key: "keys", label: "密钥", to: "/keys", icon: <KeyOutlined />},
  {key: "webhooks", label: "Webhook", to: "/webhooks", icon: <LinkOutlined />},
  {key: "records", label: "查看审计记录", to: "/records", icon: <AuditOutlined />},
];

function toArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (value === null || value === undefined || value === "") {
    return [];
  }

  return [value];
}

function hasNonEmptyValue(values) {
  return toArray(values).some(value => `${typeof value === "object" ? value?.name ?? value?.scope ?? "" : value ?? ""}`.trim() !== "");
}

function getApplicationName(application) {
  return application?.displayName || application?.name || "未命名应用";
}

function getApplicationEditPath(application) {
  if (!application?.name) {
    return "/applications";
  }

  return `/applications/${application.organization || application.owner || "admin"}/${application.name}`;
}

function isApplicationDisabled(application) {
  return application?.isDeleted || application?.disableSignin === true || application?.enabled === false;
}

function getAccessChecks(application) {
  return {
    hasClientId: `${application?.clientId ?? ""}`.trim() !== "",
    hasRedirectUris: hasNonEmptyValue(application?.redirectUris),
    hasScopes: hasNonEmptyValue(application?.scopes),
    hasProviders: hasNonEmptyValue(application?.providers),
    hasGrantTypes: hasNonEmptyValue(application?.grantTypes),
  };
}

function getCompleteness(checks) {
  const values = [checks.hasClientId, checks.hasRedirectUris, checks.hasScopes, checks.hasProviders];
  const completed = values.filter(Boolean).length;
  return Math.round((completed / values.length) * 100);
}

function getApplicationStatus(application, checks) {
  if (isApplicationDisabled(application)) {
    return "已停用";
  }

  return getCompleteness(checks) === 100 ? "接入完整" : "待补全";
}

function getStatusColor(status) {
  if (status === "接入完整") {
    return "success";
  }

  if (status === "待补全") {
    return "warning";
  }

  return "default";
}

function getProgressStatus(status) {
  if (status === "接入完整") {
    return "success";
  }

  if (status === "待补全") {
    return "normal";
  }

  return "exception";
}

function buildRiskItems(applications, cards) {
  const countBy = (predicate) => applications.filter(predicate).length;
  const riskItems = [
    {
      key: "missing-redirect-uris",
      title: "缺少回调地址",
      count: countBy((application) => !getAccessChecks(application).hasRedirectUris),
      actionPath: "/applications",
    },
    {
      key: "missing-scopes",
      title: "缺少授权范围",
      count: countBy((application) => !getAccessChecks(application).hasScopes),
      actionPath: "/applications",
    },
    {
      key: "missing-providers",
      title: "缺少 Provider 绑定",
      count: countBy((application) => !getAccessChecks(application).hasProviders),
      actionPath: "/providers",
    },
    {
      key: "missing-client-id",
      title: "client_id 待配置",
      count: countBy((application) => !getAccessChecks(application).hasClientId),
      actionPath: "/applications",
    },
    {
      key: "disabled-applications",
      title: "应用已停用",
      count: cards.filter(card => card.status === "已停用").length,
      actionPath: "/applications",
    },
  ].filter(item => item.count > 0);

  if (riskItems.length === 0 && applications.length > 0) {
    return [{
      key: "all-ready",
      title: "当前列表视图未发现接入缺口",
      count: 0,
      actionPath: "/records",
    }];
  }

  return riskItems;
}

// 只返回可展示摘要，不携带 clientSecret、token 或其它敏感配置原值。
export function buildApplicationAccessCenterSummary(applications = []) {
  const normalizedApplications = Array.isArray(applications) ? applications : [];
  const cards = normalizedApplications.map((application) => {
    const checks = getAccessChecks(application);
    const completeness = getCompleteness(checks);
    const status = getApplicationStatus(application, checks);

    return {
      key: `${application?.owner || application?.organization || "admin"}/${application?.name || getApplicationName(application)}`,
      name: application?.name || "",
      displayName: getApplicationName(application),
      status,
      completeness,
      editPath: getApplicationEditPath(application),
      clientStatus: checks.hasClientId ? "client_id 已配置" : "client_id 待配置",
      grantStatus: checks.hasGrantTypes ? "授权类型已配置" : "授权类型待核对",
      callbackStatus: checks.hasRedirectUris ? "回调地址已配置" : "回调地址待补全",
      scopeStatus: checks.hasScopes ? "授权范围已配置" : "授权范围待补全",
      providerStatus: checks.hasProviders ? "Provider 已绑定" : "Provider 待绑定",
    };
  });

  const metrics = {
    totalApplications: normalizedApplications.length,
    enabledApplications: normalizedApplications.filter(application => !isApplicationDisabled(application)).length,
    completeApplications: cards.filter(card => card.status === "接入完整").length,
    callbackReadyApplications: normalizedApplications.filter(application => getAccessChecks(application).hasRedirectUris).length,
    scopedApplications: normalizedApplications.filter(application => getAccessChecks(application).hasScopes).length,
    providerBoundApplications: normalizedApplications.filter(application => getAccessChecks(application).hasProviders).length,
  };

  return {
    metrics,
    cards,
    riskItems: buildRiskItems(normalizedApplications, cards),
    entryLinks: ENTRY_LINKS,
  };
}

function ApplicationAccessCenter({applications = [], loading = false}) {
  const summary = buildApplicationAccessCenterSummary(applications);
  const hasApplications = Array.isArray(applications) && applications.length > 0;

  return (
    <div className="application-access-center">
      <div className="application-access-center-header">
        <Space direction="vertical" size={4}>
          <Space wrap>
            <Title level={3}>应用接入中心</Title>
            <Tag color="blue">当前列表视图</Tag>
          </Space>
          <Text type="secondary">应用接入、OAuth/OIDC client、回调地址、授权范围、API 映射与审计入口</Text>
        </Space>
        <Space wrap>
          <Link to="/applications"><Button icon={<AppstoreAddOutlined />}>新增应用</Button></Link>
          <Link to="/platform-api-mappings"><Button type="primary" icon={<ApiOutlined />}>API 网关映射</Button></Link>
          <Link to="/records"><Button icon={<AuditOutlined />}>查看审计记录</Button></Link>
        </Space>
      </div>

      {loading && (
        <Alert
          className="application-access-center-alert"
          type="info"
          showIcon
          message="加载应用接入状态..."
        />
      )}
      {!loading && !hasApplications && (
        <Alert
          className="application-access-center-alert"
          type="warning"
          showIcon
          message="暂无应用接入，先新增应用或进入 API 映射核对接入契约。"
        />
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} xl={6}>
          <Card className="application-access-center-metric" variant="borderless">
            <Statistic title="应用总数" value={summary.metrics.totalApplications} suffix={`启用 ${summary.metrics.enabledApplications}`} />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card className="application-access-center-metric" variant="borderless">
            <Statistic title="接入完整" value={summary.metrics.completeApplications} suffix="应用" />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card className="application-access-center-metric" variant="borderless">
            <Statistic title="回调地址" value={summary.metrics.callbackReadyApplications} suffix="已配置" />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card className="application-access-center-metric" variant="borderless">
            <Statistic title="授权范围" value={summary.metrics.scopedApplications} suffix="已配置" />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="application-access-center-section">
        {summary.cards.map(card => (
          <Col xs={24} md={12} xl={8} key={card.key}>
            <Card className="application-access-center-card" variant="borderless">
              <Space direction="vertical" size={12} className="application-access-center-card-body">
                <Space className="application-access-center-card-title" align="start">
                  <ApiOutlined />
                  <Space direction="vertical" size={0}>
                    <Text strong>{card.displayName}</Text>
                    <Text type="secondary">{card.name || "未配置技术名称"}</Text>
                  </Space>
                </Space>
                <Space wrap>
                  <Tag color={getStatusColor(card.status)}>{card.status}</Tag>
                  <Tag>{card.clientStatus}</Tag>
                  <Tag>{card.grantStatus}</Tag>
                </Space>
                <div>
                  <Text type="secondary">接入完整度 {card.completeness}%</Text>
                  <Progress percent={card.completeness} size="small" status={getProgressStatus(card.status)} />
                </div>
                <Space direction="vertical" size={2}>
                  <Text type="secondary">{card.callbackStatus}</Text>
                  <Text type="secondary">{card.scopeStatus}</Text>
                  <Text type="secondary">{card.providerStatus}</Text>
                </Space>
                <Space wrap className="application-access-center-card-actions">
                  <Link to={card.editPath}>编辑应用</Link>
                  <Link to="/platform-api-mappings">API 映射</Link>
                  <Link to="/records">审计记录</Link>
                </Space>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} className="application-access-center-section">
        <Col xs={24} lg={10}>
          <Card title="风险摘要" variant="borderless" className="application-access-center-panel">
            <Space direction="vertical" size={10} className="application-access-center-risk-list">
              {summary.riskItems.map(item => (
                <div className="application-access-center-risk-item" key={item.key}>
                  <Space align="start">
                    <ExclamationCircleOutlined />
                    <Space direction="vertical" size={2}>
                      <Space wrap>
                        <Text strong>{item.title}</Text>
                        <Tag color={item.count > 0 ? "warning" : "success"}>{item.count > 0 ? `${item.count} 项` : "低风险"}</Tag>
                      </Space>
                      <Text type="secondary">只读推导，不触发授权、回调、密钥写入或真实探测。</Text>
                      <Link to={item.actionPath}>进入处理入口</Link>
                    </Space>
                  </Space>
                </div>
              ))}
            </Space>
          </Card>
        </Col>
        <Col xs={24} lg={14}>
          <Card title="配置入口" variant="borderless" className="application-access-center-panel">
            <div className="application-access-center-link-grid">
              {summary.entryLinks.map(item => (
                <Link to={item.to} key={item.key}>
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      {loading && (
        <div className="application-access-center-loading">
          <Spin />
        </div>
      )}
    </div>
  );
}

export default ApplicationAccessCenter;
