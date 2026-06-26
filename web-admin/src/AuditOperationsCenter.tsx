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
  AuditOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  KeyOutlined,
  SafetyCertificateOutlined,
  SearchOutlined
} from "@ant-design/icons";
import {Alert, Button, Space, Typography} from "antd";
import i18next from "i18next";
import React from "react";
import {Link} from "react-router-dom";
import {
  EnterpriseIdentityConsolePage,
  EnterpriseIdentityRiskList,
  EnterpriseIdentitySection
} from "./common/EnterpriseIdentityConsoleLayout";

const {Text} = Typography;

type AuditOperationsKey = "sessions" | "records" | "tokens" | "verifications";
type RiskTone = "success" | "warning" | "error" | "processing" | "default" | "info";

interface AuditOperationsActionItem {
  key: string;
  label: React.ReactNode;
  to: string;
  icon?: React.ReactNode;
  description?: React.ReactNode;
}

interface AuditOperationsSummaryStripItem {
  key: string;
  label: React.ReactNode;
  value: React.ReactNode;
  description?: React.ReactNode;
  tone?: RiskTone;
}

interface AuditOperationsRiskListItem {
  key: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: RiskTone;
  badge?: React.ReactNode;
  action?: AuditOperationsActionItem;
}

interface AuditOperationsEntry {
  key: AuditOperationsKey;
  labelKey: string;
  descriptionKey: string;
  path: string;
  total: number;
  active: boolean;
  tone: RiskTone;
}

interface AuditOperationsRiskSummary {
  key: string;
  titleKey: string;
  descriptionKey: string;
  count: number;
  tone: RiskTone;
  path: string;
  actionLabelKey: string;
}

export interface AuditOperationsSummaryInput {
  activeKey?: AuditOperationsKey;
  totals?: Partial<Record<AuditOperationsKey, number>>;
  sessions?: unknown[];
  records?: unknown[];
  tokens?: unknown[];
  verifications?: unknown[];
  loading?: boolean;
}

export interface AuditOperationsSummary {
  activeEntry: AuditOperationsEntry;
  entries: AuditOperationsEntry[];
  riskItems: AuditOperationsRiskSummary[];
  sourceDescriptionKey: string;
}

interface AuditOperationsCenterProps extends AuditOperationsSummaryInput {
  className?: string;
}

const AUDIT_OPERATION_DEFINITIONS: Array<Omit<AuditOperationsEntry, "total" | "active" | "tone">> = [
  {
    key: "sessions",
    labelKey: "Login Sessions",
    descriptionKey: "Active sign-in sessions and termination review",
    path: "/sessions",
  },
  {
    key: "records",
    labelKey: "Audit Records",
    descriptionKey: "Administrative changes failures and callback evidence",
    path: "/records",
  },
  {
    key: "tokens",
    labelKey: "Token Review",
    descriptionKey: "Access token issuance and expiry review",
    path: "/tokens",
  },
  {
    key: "verifications",
    labelKey: "Verification Review",
    descriptionKey: "Email phone and identity verification checks",
    path: "/verifications",
  },
];

function t(key: string): string {
  return i18next.t(`general:${key}`);
}

function getCurrentViewTotal(total: number | undefined, data: unknown[] | undefined): number {
  if (Number.isFinite(total)) {
    return Number(total);
  }

  return Array.isArray(data) ? data.length : 0;
}

function readRecordField(item: unknown, field: string): unknown {
  if (typeof item !== "object" || item === null) {
    return undefined;
  }

  return (item as Record<string, unknown>)[field];
}

function countRecordErrors(records: unknown[] | undefined): number {
  if (!Array.isArray(records)) {
    return 0;
  }

  return records.filter((record) => {
    const statusCode = Number(readRecordField(record, "statusCode"));
    return Number.isFinite(statusCode) && statusCode >= 400;
  }).length;
}

function countUnusedVerifications(verifications: unknown[] | undefined): number {
  if (!Array.isArray(verifications)) {
    return 0;
  }

  return verifications.filter(verification => readRecordField(verification, "isUsed") === false).length;
}

function getEntryTone(key: AuditOperationsKey, activeKey: AuditOperationsKey): RiskTone {
  return key === activeKey ? "processing" : "default";
}

// 只返回数量、入口和风险类别，避免把 token、验证码、Cookie 或请求对象原文带入工作台摘要。
export function buildAuditOperationsSummary({
  activeKey = "records",
  totals = {},
  sessions = [],
  records = [],
  tokens = [],
  verifications = [],
}: AuditOperationsSummaryInput): AuditOperationsSummary {
  const dataByKey: Record<AuditOperationsKey, unknown[]> = {
    sessions,
    records,
    tokens,
    verifications,
  };
  const normalizedActiveKey = AUDIT_OPERATION_DEFINITIONS.some(item => item.key === activeKey) ? activeKey : "records";
  const entries = AUDIT_OPERATION_DEFINITIONS.map((definition) => ({
    ...definition,
    total: getCurrentViewTotal(totals[definition.key], dataByKey[definition.key]),
    active: definition.key === normalizedActiveKey,
    tone: getEntryTone(definition.key, normalizedActiveKey),
  }));
  const activeEntry = entries.find(entry => entry.key === normalizedActiveKey) ?? entries[1];
  const recordErrorCount = countRecordErrors(records);
  const tokenCount = getCurrentViewTotal(totals.tokens, tokens);
  const unusedVerificationCount = countUnusedVerifications(verifications);
  const sessionCount = getCurrentViewTotal(totals.sessions, sessions);
  const riskItems: AuditOperationsRiskSummary[] = [
    recordErrorCount > 0 ? {
      key: "record-errors",
      titleKey: "Failed Status Review",
      descriptionKey: "HTTP 4xx or 5xx records are visible in the current audit view",
      count: recordErrorCount,
      tone: "warning",
      path: "/records",
      actionLabelKey: "Review audit records",
    } : null,
    tokenCount > 0 ? {
      key: "visible-tokens",
      titleKey: "Token Visibility Review",
      descriptionKey: "Token rows are visible in table data; inspect expiry and ownership without exposing token values",
      count: tokenCount,
      tone: "processing",
      path: "/tokens",
      actionLabelKey: "Review tokens",
    } : null,
    unusedVerificationCount > 0 ? {
      key: "unused-verifications",
      titleKey: "Unused Verification Records",
      descriptionKey: "Unused verification rows are visible in table data; verify recipient and abuse signals in the table",
      count: unusedVerificationCount,
      tone: "warning",
      path: "/verifications",
      actionLabelKey: "Review verifications",
    } : null,
    sessionCount > 0 ? {
      key: "active-sessions",
      titleKey: "Session Continuity Review",
      descriptionKey: "Session rows are visible in table data; review active sign-in continuity and termination scope",
      count: sessionCount,
      tone: "processing",
      path: "/sessions",
      actionLabelKey: "Review sessions",
    } : null,
  ].filter((item): item is AuditOperationsRiskSummary => item !== null);

  return {
    activeEntry,
    entries,
    riskItems: riskItems.length > 0 ? riskItems : [{
      key: "current-view-clean",
      titleKey: "No runtime exception in visible data",
      descriptionKey: "Use filters or switch to another runtime entry for deeper audit review",
      count: 0,
      tone: "success",
      path: activeEntry.path,
      actionLabelKey: activeEntry.labelKey,
    }],
    sourceDescriptionKey: "Summary comes from visible table data",
  };
}

function getEntryIcon(key: AuditOperationsKey): React.ReactNode {
  switch (key) {
  case "sessions":
    return <ClockCircleOutlined />;
  case "tokens":
    return <KeyOutlined />;
  case "verifications":
    return <SafetyCertificateOutlined />;
  default:
    return <AuditOutlined />;
  }
}

function getRiskIcon(key: string): React.ReactNode {
  if (key === "record-errors") {
    return <ExclamationCircleOutlined />;
  }

  if (key === "visible-tokens") {
    return <KeyOutlined />;
  }

  if (key === "unused-verifications") {
    return <SafetyCertificateOutlined />;
  }

  return <SearchOutlined />;
}

function buildSummaryStripItems(summary: AuditOperationsSummary, loading: boolean | undefined): AuditOperationsSummaryStripItem[] {
  return [
    {
      key: "active-domain",
      label: t("Current Review Domain"),
      value: t(summary.activeEntry.labelKey),
      description: t(summary.sourceDescriptionKey),
      tone: loading ? "processing" : summary.activeEntry.tone,
    },
    {
      key: "current-total",
      label: t("Visible Table Total"),
      value: summary.activeEntry.total,
      description: t("Table total after filters and pagination"),
      tone: summary.activeEntry.total > 0 ? "processing" : "warning",
    },
    {
      key: "runtime-entries",
      label: t("Runtime Entries"),
      value: summary.entries.length,
      description: t("Sessions records tokens verifications"),
      tone: "success",
    },
    {
      key: "risk-review",
      label: t("Risk Review"),
      value: summary.riskItems.filter(item => item.count > 0).length,
      description: t("Visible data risk categories"),
      tone: summary.riskItems.some(item => item.count > 0 && item.tone === "warning") ? "warning" : "success",
    },
  ];
}

function buildRiskItems(summary: AuditOperationsSummary): AuditOperationsRiskListItem[] {
  return summary.riskItems.map(item => ({
    key: item.key,
    title: t(item.titleKey),
    description: t(item.descriptionKey),
    icon: getRiskIcon(item.key),
    tone: item.tone,
    badge: item.count > 0 ? t("Count with value").replace("{{count}}", `${item.count}`) : t("Low risk"),
    action: {
      key: item.key,
      to: item.path,
      label: t(item.actionLabelKey),
    },
  }));
}

function AuditOperationsCenter({
  activeKey = "records",
  totals,
  sessions,
  records,
  tokens,
  verifications,
  loading = false,
  className = "",
}: AuditOperationsCenterProps): JSX.Element {
  const summary = buildAuditOperationsSummary({
    activeKey,
    totals,
    sessions,
    records,
    tokens,
    verifications,
  });

  return (
    <EnterpriseIdentityConsolePage
      className={`audit-operations-center ${className}`.trim()}
      eyebrow={t("Enterprise Identity Audit Operations")}
      title={t("Audit Operations Center")}
      description={t("Audit operations center description")}
      actions={(
        <Space wrap>
          <Link to="/records"><Button icon={<AuditOutlined />}>{t("Audit Records")}</Button></Link>
          <Link to="/sessions"><Button icon={<ClockCircleOutlined />}>{t("Login Sessions")}</Button></Link>
          <Link to="/tokens"><Button icon={<KeyOutlined />}>{t("Token Review")}</Button></Link>
        </Space>
      )}
    >
      {loading && (
        <Alert
          className="enterprise-identity-console-alert"
          type="info"
          showIcon
          message={t("Loading audit operations state")}
        />
      )}
      <div className="audit-operations-rail enterprise-identity-compact-rail enterprise-identity-compact-rail-wide">
        <div className="enterprise-identity-rail-summary" aria-label={t("Audit operations summary")}>
          {buildSummaryStripItems(summary, loading).map(item => (
            <div className={`enterprise-identity-rail-summary-item enterprise-identity-tone-${item.tone}`} key={item.key}>
              <Text type="secondary">{item.label}</Text>
              <strong>{item.value}</strong>
              <Text type="secondary">{item.description}</Text>
            </div>
          ))}
        </div>
        <EnterpriseIdentitySection
          className="enterprise-identity-rail-section"
          title={t("Runtime Review Entries")}
          description={t("Runtime review entries description")}
        >
          <div className="enterprise-identity-segmented-rail">
            {summary.entries.map(entry => (
              <Link
                className={`enterprise-identity-segmented-item ${entry.active ? "enterprise-identity-segmented-item-active" : ""}`}
                to={entry.path}
                key={entry.key}
              >
                <span className="enterprise-identity-segmented-icon">{getEntryIcon(entry.key)}</span>
                <span className="enterprise-identity-segmented-copy">
                  <Text strong>{t(entry.labelKey)}</Text>
                  <Text type="secondary">{entry.total} {t("Visible rows")}</Text>
                </span>
              </Link>
            ))}
          </div>
        </EnterpriseIdentitySection>
        <EnterpriseIdentitySection
          className="enterprise-identity-rail-section"
          title={t("Risk Check Queue")}
          description={t("Risk check queue description")}
          extra={<Text type="secondary">{t(summary.sourceDescriptionKey)}</Text>}
        >
          <EnterpriseIdentityRiskList items={buildRiskItems(summary)} />
        </EnterpriseIdentitySection>
      </div>
    </EnterpriseIdentityConsolePage>
  );
}

export default AuditOperationsCenter;
