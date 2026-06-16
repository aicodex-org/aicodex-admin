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
import {
  ApartmentOutlined,
  AuditOutlined,
  CloudSyncOutlined,
  ClusterOutlined,
  KeyOutlined,
  PartitionOutlined,
  SafetyCertificateOutlined,
  UserOutlined
} from "@ant-design/icons";
import i18next from "i18next";
import {
  EnterpriseIdentityActionGrid,
  EnterpriseIdentityConsolePage,
  EnterpriseIdentityRiskList,
  EnterpriseIdentitySection,
  EnterpriseIdentityStatusGrid,
  EnterpriseIdentitySummaryStrip
} from "./common/EnterpriseIdentityConsoleLayout";

type OrganizationIdentityPage = "organizations" | "users" | "roles" | "permissions";

interface OrganizationIdentityCenterProps {
  page: OrganizationIdentityPage;
  total?: number;
  loadedCount?: number;
  currentOrganization?: string;
  children: React.ReactNode;
}

interface PageProfile {
  labelKey: string;
  statusTitleKey: string;
  statusDescriptionKey: string;
  icon: React.ReactNode;
}

const pageProfiles: Record<OrganizationIdentityPage, PageProfile> = {
  organizations: {
    labelKey: "Organizations",
    statusTitleKey: "Organization master data",
    statusDescriptionKey: "Organization master data description",
    icon: <ApartmentOutlined />,
  },
  users: {
    labelKey: "Users",
    statusTitleKey: "User lifecycle governance",
    statusDescriptionKey: "User lifecycle governance description",
    icon: <UserOutlined />,
  },
  roles: {
    labelKey: "Roles",
    statusTitleKey: "Role permission coverage",
    statusDescriptionKey: "Role permission coverage description",
    icon: <SafetyCertificateOutlined />,
  },
  permissions: {
    labelKey: "Permissions",
    statusTitleKey: "Role permission coverage",
    statusDescriptionKey: "Role permission coverage description",
    icon: <KeyOutlined />,
  },
};

function t(key: string): string {
  return i18next.t(`general:${key}`);
}

function formatCount(value?: number): string {
  return typeof value === "number" ? value.toLocaleString() : "-";
}

function buildSummaryItems(
  profile: PageProfile,
  total?: number,
  loadedCount?: number,
  currentOrganization?: string
) {
  return [
    {
      key: "scope",
      label: t("Current governance scope"),
      value: currentOrganization || t("All"),
      description: t("Current organization"),
      tone: "processing" as const,
    },
    {
      key: "total",
      label: t(profile.labelKey),
      value: formatCount(total),
      description: t("Current list view"),
      tone: "info" as const,
    },
    {
      key: "loaded",
      label: t("Loaded rows"),
      value: formatCount(loadedCount),
      description: t("Existing list remains source of action"),
      tone: "default" as const,
    },
  ];
}

function buildStatusCards(profile: PageProfile, total?: number, loadedCount?: number) {
  return [
    {
      key: "page",
      title: t(profile.statusTitleKey),
      description: t(profile.statusDescriptionKey),
      icon: profile.icon,
      metricValue: formatCount(total),
      metricLabel: t("Current view total"),
      tags: [{key: "current-view", label: t("Current list view"), tone: "info" as const}],
    },
    {
      key: "list",
      title: t("Existing list remains source of action"),
      description: t("Existing list remains source of action description"),
      icon: <AuditOutlined />,
      metricValue: formatCount(loadedCount),
      metricLabel: t("Loaded rows"),
      tags: [{key: "readonly", label: t("No backend-wide totals"), tone: "warning" as const}],
    },
    {
      key: "directory",
      title: t("Directory quality review"),
      description: t("Directory quality review description"),
      icon: <PartitionOutlined />,
      actions: [
        {key: "directory-quality", label: t("Directory Quality"), to: "/organization-directory-quality"},
        {key: "tree-operations", label: t("Organization Tree Operations"), to: "/organization-tree-operations"},
      ],
    },
  ];
}

function buildActionItems() {
  return [
    {key: "organizations", label: t("Organizations"), to: "/organizations", icon: <ApartmentOutlined />, description: t("Organization master data")},
    {key: "groups", label: t("Groups"), to: "/groups", icon: <ClusterOutlined />, description: t("Department tree")},
    {key: "users", label: t("Users"), to: "/users", icon: <UserOutlined />, description: t("User lifecycle governance")},
    {key: "roles", label: t("Roles"), to: "/roles", icon: <SafetyCertificateOutlined />, description: t("Permission governance")},
    {key: "permissions", label: t("Permissions"), to: "/permissions", icon: <KeyOutlined />, description: t("Permission governance")},
    {key: "providers", label: t("Authentication Source Center"), to: "/providers", icon: <CloudSyncOutlined />, description: t("Sync Diagnostics")},
    {key: "wecom-sync", label: t("WeCom Sync"), to: "/wecom-org-sync", icon: <CloudSyncOutlined />, description: t("Sync diagnostics review")},
    {key: "feishu-sync", label: t("Feishu Sync"), to: "/feishu-org-sync", icon: <CloudSyncOutlined />, description: t("Sync diagnostics review")},
    {key: "directory-quality", label: t("Directory Quality"), to: "/organization-directory-quality", icon: <PartitionOutlined />, description: t("Directory quality review")},
    {key: "tree-operations", label: t("Organization Tree Operations"), to: "/organization-tree-operations", icon: <ClusterOutlined />, description: t("Organization tree")},
  ];
}

function buildRiskItems() {
  return [
    {
      key: "current-view",
      title: t("No backend-wide totals"),
      description: t("No backend-wide totals description"),
      tone: "info" as const,
      icon: <AuditOutlined />,
      badge: t("Current list view"),
    },
    {
      key: "directory-quality",
      title: t("Directory quality review"),
      description: t("Directory quality review description"),
      tone: "warning" as const,
      icon: <PartitionOutlined />,
      action: {key: "directory-quality", label: t("Directory Quality"), to: "/organization-directory-quality"},
    },
    {
      key: "sync-diagnostics",
      title: t("Sync diagnostics review"),
      description: t("Sync diagnostics review description"),
      tone: "processing" as const,
      icon: <CloudSyncOutlined />,
      action: {key: "wecom-sync", label: t("WeCom Sync"), to: "/wecom-org-sync"},
    },
    {
      key: "permission-governance",
      title: t("Permission governance review"),
      description: t("Permission governance review description"),
      tone: "default" as const,
      icon: <SafetyCertificateOutlined />,
      action: {key: "permissions", label: t("Permissions"), to: "/permissions"},
    },
  ];
}

function OrganizationIdentityCenter({
  page,
  total,
  loadedCount,
  currentOrganization,
  children,
}: OrganizationIdentityCenterProps): JSX.Element {
  const profile = pageProfiles[page];

  return (
    <EnterpriseIdentityConsolePage
      eyebrow={t("Enterprise Identity Domain")}
      title={t("Organization Identity Center")}
      description={t("Organization Identity Center description")}
    >
      <EnterpriseIdentitySummaryStrip items={buildSummaryItems(profile, total, loadedCount, currentOrganization)} />
      <EnterpriseIdentityStatusGrid items={buildStatusCards(profile, total, loadedCount)} minColumns={3} />
      <div className="enterprise-identity-two-column enterprise-identity-two-column-wide-right">
        <EnterpriseIdentitySection
          title={t("Governance entry points")}
          description={t("Governance entry points description")}
        >
          <EnterpriseIdentityActionGrid items={buildActionItems()} />
        </EnterpriseIdentitySection>
        <EnterpriseIdentitySection
          title={t("Identity quality checks")}
          description={t("Identity quality checks description")}
        >
          <EnterpriseIdentityRiskList items={buildRiskItems()} />
        </EnterpriseIdentitySection>
      </div>
      <EnterpriseIdentitySection
        title={t("Current governance list")}
        description={t("Current governance list description")}
      >
        {children}
      </EnterpriseIdentitySection>
    </EnterpriseIdentityConsolePage>
  );
}

export default OrganizationIdentityCenter;
