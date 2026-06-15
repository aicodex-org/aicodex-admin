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
  AppstoreOutlined,
  AuditOutlined,
  ClusterOutlined,
  DeploymentUnitOutlined,
  ExclamationCircleOutlined,
  SafetyCertificateOutlined,
  TeamOutlined
} from "@ant-design/icons";
import {Alert, Button, Card, Col, Row, Space, Spin, Statistic, Tag, Typography} from "antd";
import React from "react";
import {Link} from "react-router-dom";
import * as DashboardBackend from "./backend/DashboardBackend";
import * as Setting from "./Setting";

const {Text, Title} = Typography;

function getLatestCount(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return null;
  }

  const value = values[values.length - 1];
  return Number.isFinite(value) ? value : null;
}

function getRequestOrganization(account) {
  const selectedOrganization = Setting.getOrganization();
  if (!Setting.isAdminUser(account) && Setting.isLocalAdminUser(account)) {
    return account.owner;
  }

  return selectedOrganization === "All" ? "" : selectedOrganization;
}

function buildStatusCards(dashboardData) {
  const organizationCount = getLatestCount(dashboardData?.organizationCounts);
  const userCount = getLatestCount(dashboardData?.userCounts);
  const providerCount = getLatestCount(dashboardData?.providerCounts);
  const applicationCount = getLatestCount(dashboardData?.applicationCounts);
  const resourceCount = getLatestCount(dashboardData?.resourceCounts);
  const permissionCount = getLatestCount(dashboardData?.permissionCounts);

  return [
    {
      title: "组织主数据",
      icon: <TeamOutlined />,
      value: organizationCount,
      suffix: userCount === null ? "用户待巡检" : `用户 ${userCount}`,
      status: organizationCount === null ? "待巡检" : "已接入",
      to: "/organizations",
      action: "查看组织",
    },
    {
      title: "企业微信 / 飞书 / OIDC",
      icon: <SafetyCertificateOutlined />,
      value: providerCount,
      suffix: "认证源",
      status: providerCount === null || providerCount === 0 ? "需配置" : "已接入",
      to: "/providers",
      action: "管理认证源",
    },
    {
      title: "应用接入 / API 映射",
      icon: <ApiOutlined />,
      value: applicationCount,
      suffix: resourceCount === null ? "资源待巡检" : `资源 ${resourceCount}`,
      status: applicationCount === null || applicationCount === 0 ? "待接入" : "运行中",
      to: "/applications",
      action: "进入应用接入",
    },
    {
      title: "Gateway 投影",
      icon: <DeploymentUnitOutlined />,
      value: permissionCount,
      suffix: "授权映射",
      status: permissionCount === null ? "待巡检" : "只读巡检",
      to: "/agents",
      action: "查看 Gateway",
    },
  ];
}

function buildRiskItems(hasError) {
  return [
    {
      title: "最近失败 / 待处理风险",
      description: hasError ? "只读统计暂不可用，请进入审计与运维页面核对失败记录。" : "当前总览仅展示只读巡检入口，失败明细以审计记录和同步页面为准。",
      icon: <ExclamationCircleOutlined />,
      to: "/records",
      action: "查看审计记录",
      tone: hasError ? "error" : "warning",
    },
    {
      title: "组织目录质量",
      description: "检查组织主数据完整性、目录质量和后续治理入口。",
      icon: <ClusterOutlined />,
      to: "/organization-directory-quality",
      action: "处理组织质量",
      tone: "processing",
    },
    {
      title: "应用变更审计",
      description: "核对应用、API 映射、Webhook 和令牌相关变更。",
      icon: <AuditOutlined />,
      to: "/applications",
      action: "进入应用接入",
      tone: "default",
    },
  ];
}

function IdentityConsoleOverview({account, history}) {
  const [dashboardData, setDashboardData] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");

  React.useEffect(() => {
    if (!Setting.isLocalAdminUser(account)) {
      history?.push?.("/apps");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setErrorMessage("");

    DashboardBackend.getDashboard(getRequestOrganization(account)).then((res) => {
      if (cancelled) {
        return;
      }

      if (res.status === "ok") {
        setDashboardData(res.data ?? {});
      } else {
        setDashboardData({});
        setErrorMessage(res.msg || "只读状态接口返回错误");
      }
    }).catch((error) => {
      if (cancelled) {
        return;
      }

      setDashboardData({});
      setErrorMessage(error?.message || "只读状态接口不可用");
    }).finally(() => {
      if (!cancelled) {
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [account, history]);

  if (!Setting.isLocalAdminUser(account)) {
    return (
      <div className="identity-console-overview identity-console-overview-state">
        <Spin />
        <Text>正在进入应用工作台...</Text>
      </div>
    );
  }

  const statusCards = buildStatusCards(dashboardData);
  const riskItems = buildRiskItems(!!errorMessage);

  return (
    <div className="identity-console-overview">
      <div className="identity-console-header">
        <Space direction="vertical" size={4}>
          <Title level={3}>身份治理总览</Title>
          <Text type="secondary">组织、认证源、应用接入、Gateway 投影与审计风险</Text>
        </Space>
        <Space wrap>
          <Link to="/wecom-org-sync"><Button icon={<SafetyCertificateOutlined />}>企业微信同步</Button></Link>
          <Link to="/feishu-org-sync"><Button icon={<SafetyCertificateOutlined />}>飞书同步</Button></Link>
          <Link to="/applications"><Button type="primary" icon={<AppstoreOutlined />}>应用接入</Button></Link>
        </Space>
      </div>

      {loading && (
        <Alert
          type="info"
          showIcon
          message="加载身份治理状态..."
          className="identity-console-alert"
        />
      )}
      {errorMessage && (
        <Alert
          type="warning"
          showIcon
          message="只读状态暂不可用"
          description={errorMessage}
          className="identity-console-alert"
        />
      )}

      <Row gutter={[16, 16]}>
        {statusCards.map((item) => (
          <Col xs={24} sm={12} xl={6} key={item.title}>
            <Card className="identity-console-status-card" variant="borderless">
              <Space direction="vertical" size={12}>
                <Space className="identity-console-card-title">
                  {item.icon}
                  <Text strong>{item.title}</Text>
                </Space>
                <Statistic value={item.value ?? "-"} suffix={item.suffix} />
                <Space className="identity-console-card-actions" wrap>
                  <Tag>{item.status}</Tag>
                  <Link to={item.to}>{item.action}</Link>
                </Space>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} className="identity-console-section">
        <Col xs={24} lg={14}>
          <Card title="能力入口" variant="borderless" className="identity-console-panel">
            <div className="identity-console-link-grid">
              <Link to="/organizations">组织主数据</Link>
              <Link to="/providers">认证源</Link>
              <Link to="/applications">应用接入</Link>
              <Link to="/platform-api-mappings">API 网关映射</Link>
              <Link to="/agents">Gateway 投影</Link>
              <Link to="/records">审计记录</Link>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="待处理风险" variant="borderless" className="identity-console-panel">
            <Space direction="vertical" size={12} className="identity-console-risk-list">
              {riskItems.map((item) => (
                <div className="identity-console-risk-item" key={item.title}>
                  <Space align="start">
                    {item.icon}
                    <Space direction="vertical" size={2}>
                      <Space wrap>
                        <Text strong>{item.title}</Text>
                        <Tag color={item.tone}>{item.tone === "error" ? "需核对" : "待巡检"}</Tag>
                      </Space>
                      <Text type="secondary">{item.description}</Text>
                      <Link to={item.to}>{item.action}</Link>
                    </Space>
                  </Space>
                </div>
              ))}
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default IdentityConsoleOverview;
