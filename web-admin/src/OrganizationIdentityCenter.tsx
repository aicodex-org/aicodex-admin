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

import React from "react";
import {Link} from "react-router-dom";
import {
  ApartmentOutlined,
  AuditOutlined,
  BranchesOutlined,
  CheckCircleOutlined,
  CloudSyncOutlined,
  ClusterOutlined,
  ExclamationCircleOutlined,
  FileSearchOutlined,
  KeyOutlined,
  LockOutlined,
  PartitionOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  UserOutlined,
  WarningOutlined
} from "@ant-design/icons";
import {Space, Tag, Typography} from "antd";
import i18next from "i18next";
import {
  EnterpriseIdentityConsolePage,
  EnterpriseIdentitySection
} from "./common/EnterpriseIdentityConsoleLayout";

const {Text, Title} = Typography;

type OrganizationIdentityPage = "organizations" | "users" | "roles" | "permissions";
type WorkbenchLayoutKind = "directory-health" | "account-lifecycle" | "role-risk-matrix" | "permission-catalog-matrix";
type WorkbenchTone = "success" | "warning" | "error" | "processing" | "default" | "info";
type MetricSource = "scope" | "total" | "loaded" | "static";

interface OrganizationIdentityCenterProps {
  page: OrganizationIdentityPage;
  total?: number;
  loadedCount?: number;
  currentOrganization?: string;
  listAction?: React.ReactNode;
  children: React.ReactNode;
}

interface WorkbenchMetric {
  key: string;
  labelKey: string;
  descriptionKey: string;
  source: MetricSource;
  staticValueKey?: string;
  tone: WorkbenchTone;
  icon: React.ReactNode;
}

interface WorkbenchAction {
  key: string;
  labelKey: string;
  descriptionKey: string;
  to: string;
  icon: React.ReactNode;
}

interface WorkbenchRisk {
  key: string;
  labelKey: string;
  descriptionKey: string;
  tone: WorkbenchTone;
  icon: React.ReactNode;
}

// 该 profile 是四类组织身份实体的产品化差异边界；测试会依赖这些 key 防止退回同一模板。
export interface OrganizationIdentityWorkbenchProfile {
  layoutKind: WorkbenchLayoutKind;
  titleKey: string;
  descriptionKey: string;
  listTitleKey: string;
  metrics: WorkbenchMetric[];
  actions: WorkbenchAction[];
  risks: WorkbenchRisk[];
}

export const organizationIdentityWorkbenchProfiles: Record<OrganizationIdentityPage, OrganizationIdentityWorkbenchProfile> = {
  organizations: {
    layoutKind: "directory-health",
    titleKey: "Organizations",
    descriptionKey: "Organization directory boundary description",
    listTitleKey: "Organizations",
    metrics: [
      {
        key: "directory-boundary",
        labelKey: "Directory boundary",
        descriptionKey: "Boundary",
        source: "scope",
        tone: "processing",
        icon: <PartitionOutlined />,
      },
      {
        key: "organization-tree-quality",
        labelKey: "Organization tree quality",
        descriptionKey: "Loaded",
        source: "loaded",
        tone: "success",
        icon: <BranchesOutlined />,
      },
      {
        key: "sync-sources",
        labelKey: "Sync sources",
        descriptionKey: "Source",
        source: "static",
        staticValueKey: "WeCom / Feishu",
        tone: "info",
        icon: <CloudSyncOutlined />,
      },
    ],
    actions: [
      {key: "review-directory-quality", labelKey: "Review directory quality", descriptionKey: "Organization tree quality", to: "/organization-directory-quality", icon: <FileSearchOutlined />},
      {key: "inspect-organization-tree", labelKey: "Inspect organization tree", descriptionKey: "Directory boundary", to: "/organization-tree-operations", icon: <ClusterOutlined />},
      {key: "review-sync-sources", labelKey: "Review sync sources", descriptionKey: "Sync sources", to: "/providers", icon: <CloudSyncOutlined />},
    ],
    risks: [
      {key: "orphan-organization-nodes", labelKey: "Orphan organization nodes", descriptionKey: "Directory boundary", tone: "warning", icon: <WarningOutlined />},
      {key: "empty-organization-nodes", labelKey: "Empty organization nodes", descriptionKey: "Organization tree quality", tone: "default", icon: <ApartmentOutlined />},
      {key: "mapping-risk", labelKey: "Mapping risk", descriptionKey: "Sync sources", tone: "processing", icon: <AuditOutlined />},
    ],
  },
  users: {
    layoutKind: "account-lifecycle",
    titleKey: "Users",
    descriptionKey: "Account lifecycle description",
    listTitleKey: "User account list",
    metrics: [
      {
        key: "lifecycle-scope",
        labelKey: "Lifecycle scope",
        descriptionKey: "Lifecycle",
        source: "total",
        tone: "processing",
        icon: <UserOutlined />,
      },
      {
        key: "verification-state",
        labelKey: "Verification state",
        descriptionKey: "Identity state",
        source: "static",
        staticValueKey: "Review",
        tone: "warning",
        icon: <CheckCircleOutlined />,
      },
      {
        key: "account-completeness",
        labelKey: "Account completeness",
        descriptionKey: "Loaded",
        source: "loaded",
        tone: "success",
        icon: <TeamOutlined />,
      },
    ],
    actions: [
      {key: "import-users", labelKey: "Import users", descriptionKey: "Account completeness", to: "/users", icon: <UserOutlined />},
      {key: "review-verification-state", labelKey: "Review verification state", descriptionKey: "Verification state", to: "/providers", icon: <CheckCircleOutlined />},
      {key: "review-sync-quality", labelKey: "Review sync quality", descriptionKey: "Sync sources", to: "/wecom-org-sync", icon: <CloudSyncOutlined />},
    ],
    risks: [
      {key: "anomalous-accounts", labelKey: "Anomalous accounts", descriptionKey: "Lifecycle", tone: "error", icon: <ExclamationCircleOutlined />},
      {key: "unverified-accounts", labelKey: "Unverified accounts", descriptionKey: "Verification state", tone: "warning", icon: <CheckCircleOutlined />},
      {key: "import-sync-drift", labelKey: "Import sync drift", descriptionKey: "Sync sources", tone: "processing", icon: <CloudSyncOutlined />},
    ],
  },
  roles: {
    layoutKind: "role-risk-matrix",
    titleKey: "Role authorization workbench",
    descriptionKey: "Role authorization description",
    listTitleKey: "Role list",
    metrics: [
      {
        key: "privileged-role-watch",
        labelKey: "Privileged role watch",
        descriptionKey: "Authorization matrix",
        source: "total",
        tone: "error",
        icon: <SafetyCertificateOutlined />,
      },
      {
        key: "member-bindings",
        labelKey: "Member bindings",
        descriptionKey: "Loaded",
        source: "loaded",
        tone: "processing",
        icon: <TeamOutlined />,
      },
      {
        key: "separation-of-duties",
        labelKey: "Separation of duties",
        descriptionKey: "Review",
        source: "static",
        staticValueKey: "Review",
        tone: "warning",
        icon: <LockOutlined />,
      },
    ],
    actions: [
      {key: "review-privileged-roles", labelKey: "Review privileged roles", descriptionKey: "Privileged role watch", to: "/roles", icon: <SafetyCertificateOutlined />},
      {key: "review-permission-coverage", labelKey: "Review permission coverage", descriptionKey: "Permission governance", to: "/permissions", icon: <KeyOutlined />},
      {key: "review-member-bindings", labelKey: "Review member bindings", descriptionKey: "Member bindings", to: "/users", icon: <TeamOutlined />},
    ],
    risks: [
      {key: "empty-roles", labelKey: "Empty roles", descriptionKey: "Member bindings", tone: "warning", icon: <TeamOutlined />},
      {key: "orphan-roles", labelKey: "Orphan roles", descriptionKey: "Authorization matrix", tone: "default", icon: <SafetyCertificateOutlined />},
      {key: "separation-of-duties-risk", labelKey: "Separation of duties risk", descriptionKey: "Separation of duties", tone: "error", icon: <LockOutlined />},
    ],
  },
  permissions: {
    layoutKind: "permission-catalog-matrix",
    titleKey: "Permission catalog workbench",
    descriptionKey: "Permission catalog description",
    listTitleKey: "Permission list",
    metrics: [
      {
        key: "sensitive-permissions",
        labelKey: "Sensitive permissions",
        descriptionKey: "Permission sensitivity",
        source: "total",
        tone: "error",
        icon: <KeyOutlined />,
      },
      {
        key: "role-references",
        labelKey: "Role references",
        descriptionKey: "Role references",
        source: "static",
        staticValueKey: "Review",
        tone: "processing",
        icon: <SafetyCertificateOutlined />,
      },
      {
        key: "unused-permissions",
        labelKey: "Unused permissions",
        descriptionKey: "Loaded",
        source: "loaded",
        tone: "warning",
        icon: <FileSearchOutlined />,
      },
    ],
    actions: [
      {key: "review-permission-catalog", labelKey: "Review permission catalog", descriptionKey: "Permission sensitivity", to: "/permissions", icon: <KeyOutlined />},
      {key: "review-role-references", labelKey: "Review role references", descriptionKey: "Role references", to: "/roles", icon: <SafetyCertificateOutlined />},
      {key: "review-permission-granularity", labelKey: "Review permission granularity", descriptionKey: "Permission granularity drift", to: "/permissions", icon: <FileSearchOutlined />},
    ],
    risks: [
      {key: "sensitive-permission-drift", labelKey: "Sensitive permissions", descriptionKey: "Permission sensitivity", tone: "error", icon: <LockOutlined />},
      {key: "unused-permissions", labelKey: "Unused permissions", descriptionKey: "Unused permissions", tone: "warning", icon: <FileSearchOutlined />},
      {key: "permission-granularity-drift", labelKey: "Permission granularity drift", descriptionKey: "Permission sensitivity", tone: "processing", icon: <AuditOutlined />},
    ],
  },
};

function t(key: string): string {
  return i18next.t(`general:${key}`);
}

function toneClass(tone: WorkbenchTone): string {
  return `enterprise-identity-tone-${tone}`;
}

function formatCount(value?: number): string {
  return typeof value === "number" ? value.toLocaleString() : "-";
}

function getMetricValue(metric: WorkbenchMetric, total?: number, loadedCount?: number, currentOrganization?: string): string {
  /* istanbul ignore next -- scope metrics are only used by the legacy directory renderer; organizations now use compact list top. */
  if (metric.source === "scope") {
    return currentOrganization || t("All");
  }
  if (metric.source === "total") {
    return formatCount(total);
  }
  if (metric.source === "loaded") {
    return formatCount(loadedCount);
  }
  return t(metric.staticValueKey as string);
}

function renderActionLinks(actions: WorkbenchAction[]) {
  return (
    <div className="organization-identity-action-row">
      {actions.map(action => (
        <Link to={action.to} key={action.key} data-action-key={action.key}>
          {action.icon}
          <span>{t(action.labelKey)}</span>
        </Link>
      ))}
    </div>
  );
}

function renderMetricTile(metric: WorkbenchMetric, total?: number, loadedCount?: number, currentOrganization?: string) {
  return (
    <article className={`organization-identity-metric ${toneClass(metric.tone)}`} key={metric.key} data-metric-key={metric.key}>
      <span className="organization-identity-metric-icon">{metric.icon}</span>
      <span className="organization-identity-metric-copy">
        <Text className="organization-identity-metric-label">{t(metric.labelKey)}</Text>
        <strong>{getMetricValue(metric, total, loadedCount, currentOrganization)}</strong>
        <Text type="secondary">{t(metric.descriptionKey)}</Text>
      </span>
    </article>
  );
}

/* istanbul ignore next -- 仅旧 directory/lifecycle renderer 使用；organizations/users 已切到 compact list top。 */
function renderRiskPill(risk: WorkbenchRisk) {
  return (
    <span className={`organization-identity-risk-pill ${toneClass(risk.tone)}`} key={risk.key} data-risk-key={risk.key}>
      {risk.icon}
      <span>{t(risk.labelKey)}</span>
    </span>
  );
}

/* istanbul ignore next -- 组织页已切到 compact list top；保留旧 directory renderer 仅兼容 profile 结构。 */
function renderDirectoryHealthPanel(profile: OrganizationIdentityWorkbenchProfile, total?: number, loadedCount?: number, currentOrganization?: string) {
  return (
    <div className="organization-identity-directory-shell">
      <div className="organization-identity-directory-map">
        {profile.metrics.map(metric => renderMetricTile(metric, total, loadedCount, currentOrganization))}
      </div>
      <div className="organization-identity-directory-boundary">
        <Text strong>{t("Directory health")}</Text>
        <div className="organization-identity-risk-stack">
          {profile.risks.map(renderRiskPill)}
        </div>
        {renderActionLinks(profile.actions)}
      </div>
    </div>
  );
}

/* istanbul ignore next -- 用户页已切到 compact list top；保留旧 lifecycle renderer 仅兼容 profile 结构。 */
function renderAccountLifecycle(profile: OrganizationIdentityWorkbenchProfile, total?: number, loadedCount?: number, currentOrganization?: string) {
  return (
    <div className="organization-identity-lifecycle-shell">
      <div className="organization-identity-lifecycle-rail">
        {profile.metrics.map((metric, index) => (
          <div className={`organization-identity-lifecycle-step ${toneClass(metric.tone)}`} key={metric.key} data-metric-key={metric.key}>
            <span>{index + 1}</span>
            <Text strong>{t(metric.labelKey)}</Text>
            <Text type="secondary">{getMetricValue(metric, total, loadedCount, currentOrganization)}</Text>
          </div>
        ))}
      </div>
      <div className="organization-identity-lifecycle-side">
        <div className="organization-identity-risk-stack organization-identity-risk-stack-inline">
          {profile.risks.map(renderRiskPill)}
        </div>
        {renderActionLinks(profile.actions)}
      </div>
    </div>
  );
}

function renderRoleRiskMatrix(profile: OrganizationIdentityWorkbenchProfile, total?: number, loadedCount?: number, currentOrganization?: string) {
  return (
    <div className="organization-identity-role-matrix-shell">
      <div className="organization-identity-role-matrix">
        {profile.metrics.map(metric => renderMetricTile(metric, total, loadedCount, currentOrganization))}
        {profile.risks.map(risk => (
          <article className={`organization-identity-matrix-risk ${toneClass(risk.tone)}`} key={risk.key} data-risk-key={risk.key}>
            {risk.icon}
            <Text strong>{t(risk.labelKey)}</Text>
            <Text type="secondary">{t(risk.descriptionKey)}</Text>
          </article>
        ))}
      </div>
      {renderActionLinks(profile.actions)}
    </div>
  );
}

function renderPermissionCatalogMatrix(profile: OrganizationIdentityWorkbenchProfile, total?: number, loadedCount?: number, currentOrganization?: string) {
  return (
    <div className="organization-identity-permission-shell">
      <div className="organization-identity-permission-sensitivity">
        {profile.metrics.map(metric => renderMetricTile(metric, total, loadedCount, currentOrganization))}
      </div>
      <div className="organization-identity-permission-reference">
        {profile.risks.map(risk => (
          <div className={`organization-identity-reference-row ${toneClass(risk.tone)}`} key={risk.key} data-risk-key={risk.key}>
            <span>{risk.icon}</span>
            <Text strong>{t(risk.labelKey)}</Text>
            <Tag className={toneClass(risk.tone)}>{t(risk.descriptionKey)}</Tag>
          </div>
        ))}
        {renderActionLinks(profile.actions)}
      </div>
    </div>
  );
}

function renderWorkbenchBody(profile: OrganizationIdentityWorkbenchProfile, total?: number, loadedCount?: number, currentOrganization?: string) {
  /* istanbul ignore next -- 当前 organizations 页面不再走旧 directory workbench 渲染。 */
  if (profile.layoutKind === "directory-health") {
    return renderDirectoryHealthPanel(profile, total, loadedCount, currentOrganization);
  }
  /* istanbul ignore next -- 当前 users 页面不再走旧 lifecycle workbench 渲染。 */
  if (profile.layoutKind === "account-lifecycle") {
    return renderAccountLifecycle(profile, total, loadedCount, currentOrganization);
  }
  if (profile.layoutKind === "role-risk-matrix") {
    return renderRoleRiskMatrix(profile, total, loadedCount, currentOrganization);
  }
  return renderPermissionCatalogMatrix(profile, total, loadedCount, currentOrganization);
}

function OrganizationIdentityCenter({
  page,
  total,
  loadedCount,
  currentOrganization,
  listAction,
  children,
}: OrganizationIdentityCenterProps): JSX.Element {
  const profile = organizationIdentityWorkbenchProfiles[page];

  if (page === "organizations" || page === "users") {
    return (
      <div className={`organization-identity-console organization-identity-compact-list-page organization-identity-compact-list-page-${page}`}>
        <div className="organization-identity-compact-list-top">
          <Space size={8} wrap className="organization-identity-compact-list-title">
            <Title level={3} className="organization-identity-compact-list-heading">{t(profile.titleKey)}</Title>
          </Space>
          {listAction ? <Space wrap className="organization-identity-compact-list-actions">{listAction}</Space> : null}
        </div>
        {children}
      </div>
    );
  }

  return (
    <EnterpriseIdentityConsolePage
      className={`organization-identity-console organization-identity-console-${profile.layoutKind}`}
      eyebrow={t("Enterprise Identity Domain")}
      title={t(profile.titleKey)}
      description={t(profile.descriptionKey)}
    >
      <div
        className={`organization-identity-workbench organization-identity-workbench-${profile.layoutKind}`}
        data-testid="organization-identity-workbench"
        data-layout-kind={profile.layoutKind}
      >
        {renderWorkbenchBody(profile, total, loadedCount, currentOrganization)}
      </div>
      <EnterpriseIdentitySection
        className="organization-identity-list-section"
        title={t(profile.listTitleKey)}
        extra={(
          <Space wrap size={[6, 6]}>
            <Tag>{t("Current list view")}</Tag>
            <Tag>{`${t("Loaded rows")}: ${formatCount(loadedCount)}`}</Tag>
          </Space>
        )}
      >
        {children}
      </EnterpriseIdentitySection>
    </EnterpriseIdentityConsolePage>
  );
}

export default OrganizationIdentityCenter;
