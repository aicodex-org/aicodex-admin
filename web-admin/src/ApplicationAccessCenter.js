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
  SafetyCertificateOutlined
} from "@ant-design/icons";
import {Alert, Button, Space, Spin, Typography} from "antd";
import i18next from "i18next";
import React from "react";
import {Link} from "react-router-dom";
import {
  EnterpriseIdentityConsolePage,
  EnterpriseIdentityRiskList,
  EnterpriseIdentitySection
} from "./common/EnterpriseIdentityConsoleLayout";

const {Text} = Typography;

function t(key, defaultValue = key) {
  const namespacedKey = `general:${key}`;
  const translated = i18next.t(namespacedKey, {defaultValue});
  return translated === namespacedKey || translated === key ? defaultValue : translated;
}

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
  const identitySourceStatus = getIdentitySourceStatus(application);
  return {
    hasClientId: `${application?.clientId ?? ""}`.trim() !== "",
    hasRedirectUris: hasNonEmptyValue(application?.redirectUris),
    hasScopes: hasNonEmptyValue(application?.scopes),
    hasProviders: hasNonEmptyValue(application?.providers),
    hasGrantTypes: hasNonEmptyValue(application?.grantTypes),
    hasIdentitySourceOrganization: identitySourceStatus !== "missing",
    identitySourceStatus,
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

  return getCompleteness(checks) === 100 && checks.hasIdentitySourceOrganization ? "接入完整" : "待补全";
}

function getLoginProviderBindings(application) {
  return toArray(application?.providers).filter(providerItem => {
    const category = providerItem?.provider?.category || providerItem?.category || "";
    return ["OAuth", "Web3", "SAML"].includes(category);
  });
}

function getIdentitySourceStatus(application) {
  const loginProviders = getLoginProviderBindings(application);
  if (loginProviders.length === 0) {
    return "not-applicable";
  }
  if (loginProviders.some(providerItem => `${providerItem?.targetOrganization ?? ""}`.trim() !== "")) {
    return "explicit";
  }
  if (`${application?.organization ?? ""}`.trim() !== "") {
    return "fallback";
  }
  return "missing";
}

function buildRiskItems(applications, cards) {
  const countBy = (predicate) => applications.filter(predicate).length;
  const riskItems = [
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

function buildSummaryItems(summary) {
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

function ApplicationAccessCenter({applications = [], loading = false}) {
  const summary = buildApplicationAccessCenterSummary(applications);
  const hasApplications = Array.isArray(applications) && applications.length > 0;
  const riskItems = summary.riskItems.map(item => ({
    key: item.key,
    title: item.title,
    description: "用于定位接入缺口，不触发授权、回调、密钥写入或真实探测。",
    icon: <ExclamationCircleOutlined />,
    tone: item.count > 0 ? "warning" : "success",
    badge: item.count > 0 ? `${item.count} 项` : "低风险",
    action: {key: "action", to: item.actionPath, label: item.actionLabel || "进入处理入口"},
  }));
  const summaryItems = buildSummaryItems(summary);

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
      </div>

      {loading && (
        <div className="application-access-center-loading">
          <Spin />
        </div>
      )}
    </EnterpriseIdentityConsolePage>
  );
}

function getIdentitySourceStatusText(status) {
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
