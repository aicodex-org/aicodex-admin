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
  ProfileOutlined,
  SafetyCertificateOutlined,
  TeamOutlined
} from "@ant-design/icons";
import {Alert, Button, Space, Spin, Typography} from "antd";
import React from "react";
import {Link} from "react-router-dom";
import i18next from "i18next";
import * as DashboardBackend from "./backend/DashboardBackend";
import {
  EnterpriseIdentityConsolePage,
  EnterpriseIdentityRiskList,
  EnterpriseIdentitySection,
  EnterpriseIdentityStatusGrid,
  EnterpriseIdentitySummaryStrip
} from "./common/EnterpriseIdentityConsoleLayout";
import * as Setting from "./Setting";

const {Text} = Typography;

function tGeneral(key, defaultValue = key) {
  const namespacedKey = `general:${key}`;
  const translated = i18next.t(namespacedKey, {defaultValue});
  return translated === namespacedKey || translated === key ? defaultValue : translated;
}

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
      key: "organization",
      title: "组织主数据",
      icon: <TeamOutlined />,
      description: "组织域、目录质量和身份主数据治理入口",
      metricValue: organizationCount ?? "-",
      metricLabel: userCount === null ? "用户待巡检" : `用户 ${userCount}`,
      tags: [{key: "status", label: organizationCount === null ? "待巡检" : "已接入", tone: organizationCount === null ? "warning" : "success"}],
      actions: [{key: "organizations", to: "/organizations", label: "查看组织"}],
    },
    {
      key: "providers",
      title: "企业微信 / 飞书 / OIDC",
      icon: <SafetyCertificateOutlined />,
      description: "统一登录、组织同步和企业 IdP 接入状态",
      metricValue: providerCount ?? "-",
      metricLabel: "认证源",
      tags: [{key: "status", label: providerCount === null || providerCount === 0 ? "需配置" : "已接入", tone: providerCount === null || providerCount === 0 ? "warning" : "success"}],
      actions: [{key: "providers", to: "/providers", label: "管理认证源"}],
    },
    {
      key: "applications",
      title: "应用接入 / API 映射",
      icon: <ApiOutlined />,
      description: "应用、OAuth/OIDC client、回调地址与 API 网关映射",
      metricValue: applicationCount ?? "-",
      metricLabel: resourceCount === null ? "资源待巡检" : `资源 ${resourceCount}`,
      tags: [{key: "status", label: applicationCount === null || applicationCount === 0 ? "待接入" : "运行中", tone: applicationCount === null || applicationCount === 0 ? "warning" : "success"}],
      actions: [{key: "applications", to: "/applications", label: "进入应用接入"}],
    },
    {
      key: "gateway",
      title: "LLM AI 网关中心",
      icon: <DeploymentUnitOutlined />,
      description: "AI 入口、MCP 资源和网关身份映射只读巡检",
      metricValue: permissionCount ?? "-",
      metricLabel: "授权映射",
      tags: [{key: "status", label: permissionCount === null ? "待巡检" : "只读巡检", tone: permissionCount === null ? "warning" : "processing"}],
      actions: [{key: "gateway", to: "/agents", label: "进入 LLM AI 网关"}],
    },
  ];
}

function buildRiskItems(hasError) {
  return [
    {
      key: "audit-risk",
      title: tGeneral("Risk pending summary overview title", "风险待办摘要"),
      description: hasError ? tGeneral("Risk pending summary overview error risk", "只读统计暂不可用，请从风险队列和审计运维核对失败记录。") : tGeneral("Risk pending summary overview risk", "按当前只读状态关注配置缺口、审计证据和跨域身份风险。"),
      icon: <ExclamationCircleOutlined />,
      tone: hasError ? "error" : "warning",
      badge: hasError ? tGeneral("Needs review", "需核对") : tGeneral("Pending attention", "待关注"),
      action: {key: "tasks", to: "/governance-tasks", label: tGeneral("View risk pending items", "查看风险待办")},
    },
    {
      key: "directory-quality",
      title: "组织目录质量",
      description: "检查组织主数据完整性、目录质量和后续治理入口。",
      icon: <ClusterOutlined />,
      tone: "processing",
      badge: "治理入口",
      action: {key: "directory", to: "/organization-directory-quality", label: "处理组织质量"},
    },
    {
      key: "application-audit",
      title: "应用变更审计",
      description: "核对应用、API 映射、Webhook 和令牌相关变更。",
      icon: <AuditOutlined />,
      tone: "default",
      badge: "只读核对",
      action: {key: "applications", to: "/applications", label: "进入应用接入"},
    },
    {
      key: "identity-assets",
      title: tGeneral("Identity evidence context overview title", "关联证据状态"),
      description: tGeneral("Identity evidence context overview risk", "对象详情已保留应用、身份源、组织身份、角色权限、Gateway/LLM AI 与审计证据深链。"),
      icon: <ClusterOutlined />,
      tone: "processing",
      badge: tGeneral("Object context", "对象上下文"),
      action: {key: "identity-assets", to: "/identity-assets", label: tGeneral("View relationship evidence", "查看关联证据")},
    },
    {
      key: "access-preflight",
      title: tGeneral("Access condition check overview title", "接入条件核对"),
      description: tGeneral("Access condition check overview risk", "新增或变更接入前，可按身份源、应用接入和 LLM AI/Gateway 核对配置条件。"),
      icon: <ProfileOutlined />,
      tone: "processing",
      badge: tGeneral("Flow check", "流程核对"),
      action: {key: "access-wizard", to: "/access-wizard", label: tGeneral("Check access conditions", "核对接入条件")},
    },
  ];
}

function buildSummaryItems(dashboardData, hasError) {
  const organizationCount = getLatestCount(dashboardData?.organizationCounts);
  const providerCount = getLatestCount(dashboardData?.providerCounts);
  const applicationCount = getLatestCount(dashboardData?.applicationCounts);
  const recordCount = getLatestCount(dashboardData?.recordCounts);

  return [
    {
      key: "identity-domain",
      label: "身份域覆盖",
      value: organizationCount ?? "-",
      description: "组织主数据入口",
      tone: organizationCount === null ? "warning" : "success",
    },
    {
      key: "auth-sources",
      label: "认证源接入",
      value: providerCount ?? "-",
      description: "企业微信 / 飞书 / OIDC",
      tone: providerCount === null || providerCount === 0 ? "warning" : "success",
    },
    {
      key: "application-access",
      label: "应用接入",
      value: applicationCount ?? "-",
      description: "OAuth client 与 API 映射",
      tone: applicationCount === null || applicationCount === 0 ? "warning" : "success",
    },
    {
      key: "audit-readiness",
      label: "审计核对",
      value: hasError ? "需核对" : recordCount ?? "-",
      description: "失败、变更和巡检记录",
      tone: hasError ? "error" : "processing",
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
  const summaryItems = buildSummaryItems(dashboardData, !!errorMessage);

  return (
    <EnterpriseIdentityConsolePage
      className="identity-console-overview"
      eyebrow="企业认证中心 / 身份治理总览"
      title="身份治理总览"
      description="从组织、认证源、应用接入、LLM AI 网关与审计风险判断当前身份治理态势和下一步动作"
      actions={(
        <Space wrap>
          <Link to="/wecom-org-sync"><Button icon={<SafetyCertificateOutlined />}>企业微信同步</Button></Link>
          <Link to="/feishu-org-sync"><Button icon={<SafetyCertificateOutlined />}>飞书同步</Button></Link>
          <Link to="/applications"><Button type="primary" icon={<AppstoreOutlined />}>应用接入</Button></Link>
        </Space>
      )}
    >
      {loading && (
        <Alert
          type="info"
          showIcon
          message="加载身份治理状态..."
          className="enterprise-identity-console-alert"
        />
      )}
      {errorMessage && (
        <Alert
          type="warning"
          showIcon
          message="只读状态暂不可用"
          description={errorMessage}
          className="enterprise-identity-console-alert"
        />
      )}

      <EnterpriseIdentitySummaryStrip items={summaryItems} />
      <EnterpriseIdentityStatusGrid items={statusCards} minColumns={4} />

      <EnterpriseIdentitySection
        className="identity-console-next-actions"
        title={tGeneral("Overview pending status section title", "运行状态与待关注事项")}
        description={tGeneral("Overview pending status section description", "优先呈现审计风险、目录质量和应用变更；关系证据与接入核对保留为上下文 deep link。")}
      >
        <EnterpriseIdentityRiskList items={riskItems} />
      </EnterpriseIdentitySection>
    </EnterpriseIdentityConsolePage>
  );
}

export default IdentityConsoleOverview;
