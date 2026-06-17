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
  AuditOutlined,
  CloudServerOutlined,
  DeploymentUnitOutlined,
  ExclamationCircleOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
  ShopOutlined
} from "@ant-design/icons";
import {Alert, Button, Space, Typography} from "antd";
import i18next from "i18next";
import React from "react";
import {Link} from "react-router-dom";
import {
  EnterpriseIdentityActionGrid,
  EnterpriseIdentityConsolePage,
  EnterpriseIdentityRiskList,
  EnterpriseIdentitySection,
  EnterpriseIdentityStatusGrid,
  EnterpriseIdentitySummaryStrip
} from "./common/EnterpriseIdentityConsoleLayout";

const {Text} = Typography;

type GatewayCenterTone = "success" | "warning" | "error" | "processing" | "default" | "info";

interface AgentListRow {
  owner?: unknown;
  name?: unknown;
  displayName?: unknown;
  url?: unknown;
  application?: unknown;
}

interface GatewayEntryLink {
  key: string;
  labelKey: string;
  descriptionKey: string;
  to: string;
  icon: React.ReactNode;
}

interface GatewayRiskItem {
  key: string;
  titleKey: string;
  descriptionKey: string;
  count: number;
  path: string;
  actionLabelKey: string;
  tone: GatewayCenterTone;
}

export interface LlmAiGatewayCenterSummaryInput {
  agents?: unknown[];
  totalAgents?: number;
}

export interface LlmAiGatewayCenterSummary {
  metrics: {
    totalAgents: number;
    currentViewAgents: number;
    agentsWithApplications: number;
    agentsWithListeningEndpoints: number;
  };
  entryLinks: GatewayEntryLink[];
  riskItems: GatewayRiskItem[];
}

interface LlmAiGatewayCenterProps extends LlmAiGatewayCenterSummaryInput {
  loading?: boolean;
}

const ENTRY_LINKS: GatewayEntryLink[] = [
  {
    key: "agents",
    labelKey: "AI Agent",
    descriptionKey: "Agent entrypoints and application bindings",
    to: "/agents",
    icon: <RobotOutlined />,
  },
  {
    key: "servers",
    labelKey: "MCP Server",
    descriptionKey: "MCP server connectivity and tool surface",
    to: "/servers",
    icon: <CloudServerOutlined />,
  },
  {
    key: "server-store",
    labelKey: "MCP Store",
    descriptionKey: "Reusable MCP server catalog",
    to: "/server-store",
    icon: <ShopOutlined />,
  },
  {
    key: "entries",
    labelKey: "Entries",
    descriptionKey: "Agent entry configuration",
    to: "/entries",
    icon: <DeploymentUnitOutlined />,
  },
  {
    key: "sites",
    labelKey: "Sites",
    descriptionKey: "Site access and AI entry scope",
    to: "/sites",
    icon: <SafetyCertificateOutlined />,
  },
  {
    key: "rules",
    labelKey: "Rules",
    descriptionKey: "Rule governance for AI entrypoints",
    to: "/rules",
    icon: <SafetyCertificateOutlined />,
  },
  {
    key: "api-mapping",
    labelKey: "API Gateway Identity Mappings",
    descriptionKey: "Gateway identity mapping contract",
    to: "/platform-api-mappings",
    icon: <ApiOutlined />,
  },
  {
    key: "records",
    labelKey: "Audit Records",
    descriptionKey: "Audit evidence for AI and gateway changes",
    to: "/records",
    icon: <AuditOutlined />,
  },
];

function t(key: string): string {
  return i18next.t(`general:${key}`);
}

function hasTextValue(value: unknown): boolean {
  return typeof value === "string" ? value.trim() !== "" : value !== null && value !== undefined;
}

function normalizeAgents(agents: unknown[] | undefined): AgentListRow[] {
  if (!Array.isArray(agents)) {
    return [];
  }

  return agents.filter((agent): agent is AgentListRow => typeof agent === "object" && agent !== null);
}

export function buildLlmAiGatewayCenterSummary({
  agents = [],
  totalAgents,
}: LlmAiGatewayCenterSummaryInput = {}): LlmAiGatewayCenterSummary {
  const normalizedAgents = normalizeAgents(agents);
  const currentViewAgents = normalizedAgents.length;
  const agentTotal = Number.isFinite(totalAgents) ? Number(totalAgents) : currentViewAgents;
  const agentsWithApplications = normalizedAgents.filter(agent => hasTextValue(agent.application)).length;
  const agentsWithListeningEndpoints = normalizedAgents.filter(agent => hasTextValue(agent.url)).length;
  const missingApplicationCount = normalizedAgents.filter(agent => !hasTextValue(agent.application)).length;
  const missingEndpointCount = normalizedAgents.filter(agent => !hasTextValue(agent.url)).length;
  const riskItems: GatewayRiskItem[] = [
    missingApplicationCount > 0 ? {
      key: "agent-application-missing",
      titleKey: "Agent application binding missing",
      descriptionKey: "Agents without application binding need review before they are treated as governed AI entrypoints",
      count: missingApplicationCount,
      path: "/agents",
      actionLabelKey: "Review agents",
      tone: "warning",
    } : null,
    missingEndpointCount > 0 ? {
      key: "agent-endpoint-missing",
      titleKey: "Agent listening endpoint missing",
      descriptionKey: "Agents without listening endpoint cannot be inspected as reachable AI entrypoints",
      count: missingEndpointCount,
      path: "/agents",
      actionLabelKey: "Review agents",
      tone: "warning",
    } : null,
  ].filter((item): item is GatewayRiskItem => item !== null);

  return {
    metrics: {
      totalAgents: agentTotal,
      currentViewAgents,
      agentsWithApplications,
      agentsWithListeningEndpoints,
    },
    entryLinks: ENTRY_LINKS,
    riskItems: riskItems.length > 0 ? riskItems : [{
      key: "current-view-ready",
      titleKey: "No LLM AI gateway risk in current view",
      descriptionKey: "Use MCP server API mapping and audit entries for deeper read-only review",
      count: 0,
      path: "/agents",
      actionLabelKey: "Review agents",
      tone: "success",
    }],
  };
}

function buildSummaryItems(summary: LlmAiGatewayCenterSummary) {
  return [
    {
      key: "current-agents",
      label: t("Current Agent View"),
      value: summary.metrics.currentViewAgents,
      description: t("Current page agents"),
      tone: summary.metrics.currentViewAgents > 0 ? "processing" : "warning" as GatewayCenterTone,
    },
    {
      key: "total-agents",
      label: t("Agent Total"),
      value: summary.metrics.totalAgents,
      description: t("Filtered or paginated total"),
      tone: summary.metrics.totalAgents > 0 ? "processing" : "warning" as GatewayCenterTone,
    },
    {
      key: "application-bindings",
      label: t("Agent application binding"),
      value: summary.metrics.agentsWithApplications,
      description: t("Agents bound to applications"),
      tone: summary.metrics.agentsWithApplications > 0 ? "success" : "warning" as GatewayCenterTone,
    },
    {
      key: "listening-endpoints",
      label: t("Listening endpoints"),
      value: summary.metrics.agentsWithListeningEndpoints,
      description: t("Configured listening endpoints"),
      tone: summary.metrics.agentsWithListeningEndpoints > 0 ? "success" : "warning" as GatewayCenterTone,
    },
  ];
}

function buildStatusCards(summary: LlmAiGatewayCenterSummary) {
  return [
    {
      key: "agent-view",
      title: t("Current Agent View"),
      description: t("Current list view summary"),
      icon: <RobotOutlined />,
      metricValue: summary.metrics.currentViewAgents,
      metricLabel: t("Current page agents"),
      tags: [
        {key: "readonly", label: t("Read-only review"), tone: "processing" as GatewayCenterTone},
        {key: "route", label: "/agents", tone: "default" as GatewayCenterTone},
      ],
      details: <Text type="secondary">{t("Keeps existing route permissions pagination filters and table actions")}</Text>,
      actions: [{key: "agents", to: "/agents", label: t("Review agents")}],
    },
    {
      key: "mcp-resources",
      title: t("MCP resources"),
      description: t("MCP resources description"),
      icon: <CloudServerOutlined />,
      metricValue: 3,
      metricLabel: t("Linked entry"),
      tags: [
        {key: "server", label: t("MCP Server"), tone: "processing" as GatewayCenterTone},
        {key: "store", label: t("MCP Store"), tone: "default" as GatewayCenterTone},
      ],
      actions: [
        {key: "servers", to: "/servers", label: t("MCP Server")},
        {key: "store", to: "/server-store", label: t("MCP Store")},
      ],
    },
    {
      key: "gateway-identity",
      title: t("Gateway identity mapping"),
      description: t("Gateway identity mapping description"),
      icon: <ApiOutlined />,
      metricValue: 1,
      metricLabel: t("Linked entry"),
      tags: [
        {key: "mapping", label: t("API Gateway Identity Mappings"), tone: "processing" as GatewayCenterTone},
      ],
      actions: [{key: "api-mapping", to: "/platform-api-mappings", label: t("API Gateway Identity Mappings")}],
    },
    {
      key: "audit",
      title: t("AI gateway audit evidence"),
      description: t("AI gateway audit evidence description"),
      icon: <AuditOutlined />,
      metricValue: 1,
      metricLabel: t("Linked entry"),
      tags: [
        {key: "audit", label: t("Audit Records"), tone: "default" as GatewayCenterTone},
      ],
      actions: [{key: "records", to: "/records", label: t("Audit Records")}],
    },
  ];
}

function buildRiskItems(summary: LlmAiGatewayCenterSummary) {
  return summary.riskItems.map(item => ({
    key: item.key,
    title: t(item.titleKey),
    description: t(item.descriptionKey),
    icon: <ExclamationCircleOutlined />,
    tone: item.tone,
    badge: item.count > 0 ? t("Count with value").replace("{{count}}", `${item.count}`) : t("Low risk"),
    action: {
      key: item.key,
      to: item.path,
      label: t(item.actionLabelKey),
    },
  }));
}

function buildActionItems(summary: LlmAiGatewayCenterSummary) {
  return summary.entryLinks.map(item => ({
    key: item.key,
    to: item.to,
    label: t(item.labelKey),
    description: t(item.descriptionKey),
    icon: item.icon,
  }));
}

function LlmAiGatewayCenter({
  agents = [],
  totalAgents,
  loading = false,
}: LlmAiGatewayCenterProps): JSX.Element {
  const summary = buildLlmAiGatewayCenterSummary({agents, totalAgents});
  const hasAgents = summary.metrics.currentViewAgents > 0;

  return (
    <EnterpriseIdentityConsolePage
      className="llm-ai-gateway-center"
      eyebrow={t("Enterprise Identity LLM AI Gateway")}
      title={t("LLM AI Gateway Center")}
      description={t("LLM AI gateway center description")}
      actions={(
        <Space wrap>
          <Link to="/agents"><Button type="primary" icon={<RobotOutlined />}>{t("Review agents")}</Button></Link>
          <Link to="/servers"><Button icon={<CloudServerOutlined />}>{t("MCP Server")}</Button></Link>
          <Link to="/platform-api-mappings"><Button icon={<ApiOutlined />}>{t("API Gateway Identity Mappings")}</Button></Link>
        </Space>
      )}
    >
      {loading && (
        <Alert
          className="enterprise-identity-console-alert"
          type="info"
          showIcon
          message={t("Loading LLM AI gateway state")}
        />
      )}
      {!loading && !hasAgents && (
        <Alert
          className="enterprise-identity-console-alert"
          type="warning"
          showIcon
          message={t("LLM AI gateway empty state")}
        />
      )}
      <EnterpriseIdentitySummaryStrip items={buildSummaryItems(summary)} />
      <EnterpriseIdentityStatusGrid items={buildStatusCards(summary)} minColumns={4} />
      <div className="enterprise-identity-two-column enterprise-identity-two-column-wide-right">
        <EnterpriseIdentitySection
          title={t("Gateway Risk Queue")}
          description={t("Gateway risk queue description")}
          extra={<Text type="secondary">{t("Summary comes from current filtered or paginated view")}</Text>}
        >
          <EnterpriseIdentityRiskList items={buildRiskItems(summary)} />
        </EnterpriseIdentitySection>
        <EnterpriseIdentitySection
          title={t("LLM AI Gateway Configuration Entries")}
          description={t("AI gateway configuration entries description")}
        >
          <EnterpriseIdentityActionGrid items={buildActionItems(summary)} />
        </EnterpriseIdentitySection>
      </div>
    </EnterpriseIdentityConsolePage>
  );
}

export default LlmAiGatewayCenter;
