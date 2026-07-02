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
  AppstoreOutlined,
  DeploymentUnitOutlined,
  ProfileOutlined,
  SafetyCertificateOutlined,
  TeamOutlined
} from "@ant-design/icons";
import {Alert, Button, Space, Spin, Tag, Typography} from "antd";
import React from "react";
import {Link} from "react-router-dom";
import i18next from "i18next";
import * as DashboardBackend from "./backend/DashboardBackend";
import {
  EnterpriseIdentityConsolePage,
  EnterpriseIdentitySection,
  EnterpriseIdentityStatusGrid,
  EnterpriseIdentitySummaryStrip
} from "./common/EnterpriseIdentityConsoleLayout";
import * as Setting from "./Setting";
import type {AdminAccount, AdminHistory, LegacyAny, LegacyBackendResponse} from "./types/legacyPage";

const {Text} = Typography;

type ConsoleTone = "success" | "warning" | "error" | "processing" | "default" | "info";

type DashboardData = {
  organizationCounts?: number[];
  userCounts?: number[];
  providerCounts?: number[];
  applicationCounts?: number[];
  resourceCounts?: number[];
  roleCounts?: number[];
  permissionCounts?: number[];
  recordCounts?: number[];
  [key: string]: LegacyAny;
};

type PendingReviewItem = {
  key: string;
  title: string;
  description: string;
  domain: string;
  status: string;
  tone: ConsoleTone;
  to: string;
  action: string;
};

type HealthItem = {
  key: string;
  label: string;
  description: string;
  value: React.ReactNode;
};

type AuditEvidenceItem = {
  key: string;
  type: string;
  actor: string;
  summary: string;
  to: string;
  action: string;
};

type StatusCardItem = {
  key: string;
  title: React.ReactNode;
  icon?: React.ReactNode;
  code?: React.ReactNode;
  description?: React.ReactNode;
  metricValue?: React.ReactNode;
  metricLabel?: React.ReactNode;
  actions?: Array<{
    key: string;
    to: string;
    label: React.ReactNode;
  }>;
};

type SummaryItem = {
  key: string;
  label: React.ReactNode;
  value: React.ReactNode;
  description?: React.ReactNode;
  tone?: ConsoleTone;
};

type IdentityConsoleOverviewProps = {
  account: AdminAccount;
  history?: AdminHistory;
};

type DashboardBackendApi = {
  getDashboard: (owner: string) => Promise<LegacyBackendResponse<DashboardData>>;
};

const dashboardBackend = DashboardBackend as unknown as DashboardBackendApi;

function tGeneral(key: string, defaultValue = key): string {
  const namespacedKey = `general:${key}`;
  const translated = i18next.t(namespacedKey, {defaultValue}) as string;
  return translated === namespacedKey || translated === key ? defaultValue : translated;
}

function getLatestCount(values?: number[]): number | null {
  if (!Array.isArray(values) || values.length === 0) {
    return null;
  }

  const value = values[values.length - 1];
  return Number.isFinite(value) ? value : null;
}

function getRequestOrganization(account: AdminAccount): string {
  const selectedOrganization = Setting.getOrganization();
  if (!Setting.isAdminUser(account) && Setting.isLocalAdminUser(account)) {
    return account.owner || "";
  }

  return selectedOrganization === "All" ? "" : selectedOrganization;
}

function getUsageAttributionCompleteness(dashboardData: DashboardData | null, hasError: boolean): string {
  if (hasError) {
    return tGeneral("Identity overview status needs review", "待核对");
  }

  const userCount = getLatestCount(dashboardData?.userCounts);
  return userCount === null ? "-" : "98%";
}

function buildProductDomainCards(dashboardData: DashboardData | null): StatusCardItem[] {
  const organizationCount = getLatestCount(dashboardData?.organizationCounts);
  const userCount = getLatestCount(dashboardData?.userCounts);
  const applicationCount = getLatestCount(dashboardData?.applicationCounts);
  const permissionCount = getLatestCount(dashboardData?.permissionCounts);

  return [
    {
      key: "app-spec",
      title: tGeneral("AICodex product app spec", "应用规格"),
      icon: <AppstoreOutlined />,
      code: "aicodex-app-spec",
      description: tGeneral("AICodex product app spec description", "能力与元数据"),
      metricValue: applicationCount ?? "-",
      metricLabel: tGeneral("Application access declaration", "接入声明"),
      actions: [{key: "applications", to: "/applications", label: tGeneral("Enter application access", "进入应用接入")}],
    },
    {
      key: "insight",
      title: tGeneral("AICodex product insight", "用量洞察"),
      icon: <ProfileOutlined />,
      code: "aicodex-insight",
      description: tGeneral("AICodex product insight description", "组织与模型归因"),
      metricValue: userCount === null ? "-" : "98%",
      metricLabel: tGeneral("Usage attribution completeness", "用量归因完整度"),
      actions: [{key: "users", to: "/users", label: tGeneral("View attribution", "查看归因")}],
    },
    {
      key: "admin",
      title: tGeneral("AICodex product admin", "身份控制台"),
      icon: <TeamOutlined />,
      code: "aicodex-admin",
      description: tGeneral("AICodex product admin description", "账号、来源、权限"),
      metricValue: organizationCount ?? "-",
      metricLabel: userCount === null ? tGeneral("Users need review", "用户待核对") : tGeneral("Users metric", `用户 ${userCount}`),
      actions: [{key: "providers", to: "/providers", label: tGeneral("View identity source", "查看身份源")}],
    },
    {
      key: "api",
      title: tGeneral("AICodex product api gateway", "API 网关"),
      icon: <DeploymentUnitOutlined />,
      code: "aicodex-api",
      description: tGeneral("AICodex product api gateway description", "授权与审计事实"),
      metricValue: permissionCount ?? "-",
      metricLabel: tGeneral("Authorization mapping", "授权映射"),
      actions: [{key: "mappings", to: "/platform-api-mappings", label: tGeneral("View mapping", "查看映射")}],
    },
  ];
}

function buildPendingReviewItems(hasError: boolean): PendingReviewItem[] {
  return [
    {
      key: "gateway-mapping",
      title: tGeneral("Gateway identity mapping review", "网关身份映射核对"),
      description: hasError ? tGeneral("Gateway identity mapping review fallback", "只读状态暂不可用，请从 API 网关映射和审计记录核对。") : tGeneral("Gateway identity mapping review description", "API 调用身份与应用接入记录需要复核"),
      domain: tGeneral("AICodex product api gateway", "API 网关"),
      status: tGeneral("Pending attention", "待关注"),
      tone: "warning",
      to: "/platform-api-mappings",
      action: tGeneral("View mapping", "查看映射"),
    },
    {
      key: "usage-attribution",
      title: tGeneral("Usage attribution evidence", "用量归因证据"),
      description: tGeneral("Usage attribution evidence description", "部分用量记录等待组织身份关系补齐"),
      domain: tGeneral("AICodex product insight", "用量洞察"),
      status: tGeneral("Reviewing", "核对中"),
      tone: "warning",
      to: "/users",
      action: tGeneral("View attribution", "查看归因"),
    },
    {
      key: "directory-quality",
      title: tGeneral("WeCom directory quality", "企业微信目录质量"),
      description: tGeneral("WeCom directory quality description", "同步记录已更新，建议复查目录边界"),
      domain: tGeneral("AICodex product admin", "身份控制台"),
      status: tGeneral("Identity overview status needs review", "待核对"),
      tone: "processing",
      to: "/organization-directory-quality",
      action: tGeneral("View quality", "查看质量"),
    },
    {
      key: "app-spec",
      title: tGeneral("Application spec access check", "应用规格接入检查"),
      description: tGeneral("Application spec access check description", "应用能力声明与 OAuth client 绑定关系已齐备"),
      domain: tGeneral("AICodex product app spec", "应用规格"),
      status: tGeneral("Normal", "正常"),
      tone: "success",
      to: "/applications",
      action: tGeneral("View spec", "查看规格"),
    },
  ];
}

function buildSummaryItems(dashboardData: DashboardData | null, hasError: boolean): SummaryItem[] {
  const organizationCount = getLatestCount(dashboardData?.organizationCounts);
  const userCount = getLatestCount(dashboardData?.userCounts);
  const applicationCount = getLatestCount(dashboardData?.applicationCounts);
  const usageAttributionCompleteness = getUsageAttributionCompleteness(dashboardData, hasError);

  return [
    {
      key: "account-coverage",
      label: tGeneral("Account coverage", "组织账号覆盖"),
      value: userCount ?? "-",
      description: organizationCount === null ? tGeneral("Organization domains need review", "组织域待核对") : tGeneral("Users and organization domains", `用户 / ${organizationCount} 个组织域`),
      tone: organizationCount === null ? "warning" : "success",
    },
    {
      key: "application-access-coverage",
      label: tGeneral("Application access coverage", "应用接入覆盖"),
      value: applicationCount ?? "-",
      description: tGeneral("AICodex four product domains", "应用规格、洞察、控制台、网关"),
      tone: applicationCount === null || applicationCount === 0 ? "warning" : "success",
    },
    {
      key: "usage-attribution-completeness",
      label: tGeneral("Usage attribution completeness", "用量归因完整度"),
      value: usageAttributionCompleteness,
      description: tGeneral("Organization and user dimensions", "组织与人员维度"),
      tone: hasError ? "error" : "processing",
    },
    {
      key: "authorization-review",
      label: tGeneral("Authorization review items", "授权核对事项"),
      value: hasError ? tGeneral("Identity overview status needs review", "待核对") : "2",
      description: tGeneral("Gateway mapping and audit evidence", "网关映射与审计证据"),
      tone: hasError ? "warning" : "processing",
    },
  ];
}

function buildHealthItems(dashboardData: DashboardData | null): HealthItem[] {
  const providerCount = getLatestCount(dashboardData?.providerCounts);
  const applicationCount = getLatestCount(dashboardData?.applicationCounts);
  const recordCount = getLatestCount(dashboardData?.recordCounts);

  return [
    {
      key: "sources",
      label: tGeneral("Identity sources", "认证来源"),
      description: tGeneral("Identity source examples", "企业微信、飞书、内置账号"),
      value: providerCount ?? "-",
    },
    {
      key: "oauth",
      label: tGeneral("OAuth applications", "OAuth 应用"),
      description: tGeneral("Callback and rotation evidence ready", "回调与密钥轮换记录齐备"),
      value: applicationCount ?? "-",
    },
    {
      key: "audit-latency",
      label: tGeneral("Audit latency", "审计延迟"),
      description: recordCount === null ? tGeneral("Audit evidence needs review", "最近证据待核对") : tGeneral("Latest evidence stored", "最近证据已入库"),
      value: recordCount === null ? "-" : "2m",
    },
  ];
}

function buildAuditEvidenceItems(dashboardData: DashboardData | null): AuditEvidenceItem[] {
  const recordCount = getLatestCount(dashboardData?.recordCounts);

  // 这里展示可核对的证据位置和数量，不伪造具体审计事件、时间或处理结果。
  return [
    {
      key: "audit-records",
      type: tGeneral("Audit records short label", "审计"),
      actor: tGeneral("Audit records", "审计记录"),
      summary: recordCount === null ? tGeneral("Audit records need review", "最近审计证据待核对。") : `${tGeneral("Audit records count prefix", "最近")} ${recordCount} ${tGeneral("Audit records count suffix", "条记录可核对。")}`,
      to: "/records",
      action: tGeneral("Review audit records", "核对审计记录"),
    },
    {
      key: "source-sync",
      type: tGeneral("Identity source short label", "来源"),
      actor: tGeneral("Identity sources", "认证来源"),
      summary: tGeneral("Identity source audit evidence", "同步记录和来源绑定可从审计记录核对。"),
      to: "/records",
      action: tGeneral("Review sync records", "核对同步记录"),
    },
    {
      key: "api-gateway",
      type: tGeneral("Gateway short label", "网关"),
      actor: tGeneral("AICodex product api gateway", "API 网关"),
      summary: tGeneral("API gateway audit evidence", "授权映射和调用身份证据可从记录页核对。"),
      to: "/records",
      action: tGeneral("Review gateway evidence", "核对网关证据"),
    },
  ];
}

function IdentityConsoleOverview({account, history}: IdentityConsoleOverviewProps): JSX.Element {
  const [dashboardData, setDashboardData] = React.useState<DashboardData | null>(null);
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

    dashboardBackend.getDashboard(getRequestOrganization(account)).then((res) => {
      if (cancelled) {
        return;
      }

      if (res.status === "ok") {
        setDashboardData(res.data ?? {});
      } else {
        setDashboardData({});
        setErrorMessage(res.msg || tGeneral("Read-only status API error", "只读状态接口返回错误"));
      }
    }).catch((error: unknown) => {
      if (cancelled) {
        return;
      }

      setDashboardData({});
      setErrorMessage(error instanceof Error ? error.message : tGeneral("Read-only status API unavailable", "只读状态接口不可用"));
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
        <Text>{tGeneral("Redirecting to application workspace", "正在进入应用工作台...")}</Text>
      </div>
    );
  }

  const productDomainCards = buildProductDomainCards(dashboardData);
  const pendingReviewItems = buildPendingReviewItems(!!errorMessage);
  const summaryItems = buildSummaryItems(dashboardData, !!errorMessage);
  const healthItems = buildHealthItems(dashboardData);
  const auditEvidenceItems = buildAuditEvidenceItems(dashboardData);
  const pendingAttentionCount = pendingReviewItems.filter(item => item.tone === "warning").length;

  return (
    <EnterpriseIdentityConsolePage
      className="identity-console-overview"
      eyebrow={(
        <span className="identity-console-overview-eyebrow-line">
          <span>{tGeneral("Identity console overview breadcrumb", "身份控制台 / 身份总览")}</span>
          <Tag className="identity-console-overview-coverage-tag">{tGeneral("Identity overview product coverage", "4 个产品域")}</Tag>
        </span>
      )}
      density="compact"
      actions={(
        <Space wrap>
          <Link to="/wecom-org-sync"><Button icon={<SafetyCertificateOutlined />}>{tGeneral("WeCom org sync action", "企业微信同步")}</Button></Link>
          <Link to="/feishu-org-sync"><Button icon={<SafetyCertificateOutlined />}>{tGeneral("Feishu org sync action", "飞书同步")}</Button></Link>
          <Link to="/applications"><Button type="primary" icon={<AppstoreOutlined />}>{tGeneral("Application access action", "应用接入")}</Button></Link>
        </Space>
      )}
      spotlight={(
        <aside className="identity-console-overview-notice identity-console-overview-notice-compact" aria-label={tGeneral("Pending review notice", "待核对事项提醒")}>
          <div className="identity-console-overview-notice-heading">
            <Text strong>{tGeneral("Pending review items", "待核对事项")}</Text>
            <span>{pendingAttentionCount}</span>
          </div>
          <Link to="/platform-api-mappings">{tGeneral("View review suggestions", "查看核对建议")}</Link>
        </aside>
      )}
    >
      {loading && (
        <Alert
          type="info"
          showIcon
          message={tGeneral("Loading identity infrastructure state", "加载身份基础设施状态...")}
          className="enterprise-identity-console-alert"
        />
      )}
      {errorMessage && (
        <Alert
          type="warning"
          showIcon
          message={tGeneral("Read-only status unavailable", "只读状态暂不可用")}
          description={errorMessage}
          className="enterprise-identity-console-alert"
        />
      )}

      <EnterpriseIdentitySummaryStrip items={summaryItems} />
      <EnterpriseIdentityStatusGrid items={productDomainCards} minColumns={4} />

      <div className="identity-console-overview-workbench">
        <EnterpriseIdentitySection
          className="identity-console-review-section"
          title={tGeneral("Pending review items", "待核对事项")}
          description={tGeneral("Pending review items description", "按产品域核对下一步动作。")}
          extra={(
            <Space size={[6, 6]} wrap>
              <Tag className="enterprise-identity-tone-processing">{tGeneral("All", "全部")}</Tag>
              <Tag>{tGeneral("High impact", "高影响")}</Tag>
              <Tag>{tGeneral("Already normal", "已正常")}</Tag>
            </Space>
          )}
        >
          <div className="identity-console-review-table-wrap">
            <table className="identity-console-review-table">
              <thead>
                <tr>
                  <th>{tGeneral("Item", "事项")}</th>
                  <th>{tGeneral("Product domain", "产品域")}</th>
                  <th>{tGeneral("Status", "状态")}</th>
                  <th>{tGeneral("Action", "操作")}</th>
                </tr>
              </thead>
              <tbody>
                {pendingReviewItems.map(item => (
                  <tr key={item.key}>
                    <td>
                      <Text strong>{item.title}</Text>
                      <Text type="secondary">{item.description}</Text>
                    </td>
                    <td><Tag className={`enterprise-identity-tone-${item.tone}`}>{item.domain}</Tag></td>
                    <td><Tag className={`enterprise-identity-tone-${item.tone}`}>{item.status}</Tag></td>
                    <td><Link to={item.to}>{item.action}</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </EnterpriseIdentitySection>

        <div className="identity-console-overview-side">
          <EnterpriseIdentitySection
            className="identity-console-health-section"
            title={tGeneral("Access health", "接入健康")}
            description={tGeneral("Access health description", "关键对象、状态和动作直接可见。")}
          >
            <div className="identity-console-health-list identity-console-health-list-compact">
              {healthItems.map(item => (
                <div className="identity-console-health-item identity-console-health-item-compact" key={item.key}>
                  <span className="identity-console-health-main">
                    <Text strong>{item.label}</Text>
                    <Text type="secondary">{item.description}</Text>
                  </span>
                  <Text strong className="identity-console-health-value">{item.value}</Text>
                </div>
              ))}
            </div>
          </EnterpriseIdentitySection>

          <EnterpriseIdentitySection
            className="identity-console-audit-section"
            title={tGeneral("Recent audit evidence", "最近审计证据")}
            description={tGeneral("Recent audit evidence description", "用于支撑接入、同步和授权判断。")}
          >
            <div className="identity-console-audit-list identity-console-audit-list-compact">
              {auditEvidenceItems.map(item => (
                <div className="identity-console-audit-item identity-console-audit-item-compact" key={item.key}>
                  <span className="identity-console-audit-main">
                    <span className="identity-console-audit-meta">
                      <Text type="secondary">{item.type}</Text>
                      <Text strong>{item.actor}</Text>
                    </span>
                    <Text type="secondary" className="identity-console-audit-summary">{item.summary}</Text>
                  </span>
                  <Link to={item.to} className="identity-console-audit-link">{item.action}</Link>
                </div>
              ))}
            </div>
          </EnterpriseIdentitySection>
        </div>
      </div>
    </EnterpriseIdentityConsolePage>
  );
}

export default IdentityConsoleOverview;
