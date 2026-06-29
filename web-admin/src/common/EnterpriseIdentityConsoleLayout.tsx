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
import {Progress, Space, Tag, Typography} from "antd";
import PageScrollShell from "./PageScrollShell";

const {Text, Title} = Typography;

type ConsoleTone = "success" | "warning" | "error" | "processing" | "default" | "info";
type ProgressStatus = "success" | "exception" | "normal" | "active";

export interface EnterpriseIdentityAction {
  key: string;
  label: React.ReactNode;
  to: string;
  icon?: React.ReactNode;
  description?: React.ReactNode;
}

export interface EnterpriseIdentitySummaryItem {
  key: string;
  label: React.ReactNode;
  value: React.ReactNode;
  description?: React.ReactNode;
  tone?: ConsoleTone;
}

export interface EnterpriseIdentityStatusCard {
  key: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  metricValue?: React.ReactNode;
  metricLabel?: React.ReactNode;
  tags?: Array<{
    key: string;
    label: React.ReactNode;
    tone?: ConsoleTone;
  }>;
  progress?: {
    percent: number;
    label: React.ReactNode;
    status?: ProgressStatus;
  };
  details?: React.ReactNode;
  actions?: EnterpriseIdentityAction[];
}

export interface EnterpriseIdentityRiskItem {
  key: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: ConsoleTone;
  badge?: React.ReactNode;
  action?: EnterpriseIdentityAction;
}

interface EnterpriseIdentityConsolePageProps {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  density?: "default" | "compact";
}

interface EnterpriseIdentitySectionProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  extra?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

function getToneClass(tone: ConsoleTone = "default"): string {
  return `enterprise-identity-tone-${tone}`;
}

export function EnterpriseIdentityConsolePage({
  eyebrow,
  title,
  description,
  actions,
  children,
  className = "",
  density = "default",
}: EnterpriseIdentityConsolePageProps): JSX.Element {
  return (
    <PageScrollShell
      className={`enterprise-identity-console enterprise-identity-console-density-${density} ${className}`.trim()}
      headerClassName="enterprise-identity-console-header"
      bodyClassName="enterprise-identity-console-body"
      header={(
        <>
          <Space direction="vertical" size={density === "compact" ? 2 : 4} className="enterprise-identity-console-title-block">
            {eyebrow && <Text className="enterprise-identity-console-eyebrow">{eyebrow}</Text>}
            <Title level={3} className="enterprise-identity-console-title">{title}</Title>
            {description && <Text type="secondary" className="enterprise-identity-console-description">{description}</Text>}
          </Space>
          {actions && (
            <Space wrap className="enterprise-identity-console-header-actions">
              {actions}
            </Space>
          )}
        </>
      )}
    >
      {children}
    </PageScrollShell>
  );
}

export function EnterpriseIdentitySummaryStrip({
  items,
}: {
  items: EnterpriseIdentitySummaryItem[];
}): JSX.Element {
  return (
    <div className="enterprise-identity-summary-strip">
      {items.map(item => (
        <div className={`enterprise-identity-summary-item ${getToneClass(item.tone)}`} key={item.key}>
          <Text className="enterprise-identity-summary-label">{item.label}</Text>
          <div className="enterprise-identity-summary-value">{item.value}</div>
          {item.description && (
            <Text type="secondary" className="enterprise-identity-summary-description">
              {item.description}
            </Text>
          )}
        </div>
      ))}
    </div>
  );
}

export function EnterpriseIdentitySection({
  title,
  description,
  extra,
  children,
  className = "",
}: EnterpriseIdentitySectionProps): JSX.Element {
  return (
    <section className={`enterprise-identity-section ${className}`.trim()}>
      <div className="enterprise-identity-section-header">
        <Space direction="vertical" size={2}>
          <Text strong>{title}</Text>
          {description && <Text type="secondary">{description}</Text>}
        </Space>
        {extra && <div className="enterprise-identity-section-extra">{extra}</div>}
      </div>
      {children}
    </section>
  );
}

export function EnterpriseIdentityStatusGrid({
  items,
  minColumns = 3,
}: {
  items: EnterpriseIdentityStatusCard[];
  minColumns?: 2 | 3 | 4;
}): JSX.Element {
  return (
    <div className={`enterprise-identity-status-grid enterprise-identity-status-grid-${minColumns}`}>
      {items.map(item => (
        <article className="enterprise-identity-status-card" key={item.key}>
          <div className="enterprise-identity-status-card-heading">
            {item.icon && <span className="enterprise-identity-status-icon">{item.icon}</span>}
            <Space direction="vertical" size={2} className="enterprise-identity-status-copy">
              <Text strong>{item.title}</Text>
              {item.description && <Text type="secondary">{item.description}</Text>}
            </Space>
          </div>

          {(item.metricValue !== undefined || item.metricLabel) && (
            <div className="enterprise-identity-status-metric">
              {item.metricValue !== undefined && <span>{item.metricValue}</span>}
              {item.metricLabel && <Text type="secondary">{item.metricLabel}</Text>}
            </div>
          )}

          {item.tags && item.tags.length > 0 && (
            <Space wrap size={[6, 6]} className="enterprise-identity-status-tags">
              {item.tags.map(tag => (
                <Tag className={getToneClass(tag.tone)} key={tag.key}>
                  {tag.label}
                </Tag>
              ))}
            </Space>
          )}

          {item.progress && (
            <div className="enterprise-identity-status-progress">
              <Text type="secondary">{item.progress.label}</Text>
              <Progress percent={item.progress.percent} size="small" status={item.progress.status} />
            </div>
          )}

          {item.details && <div className="enterprise-identity-status-details">{item.details}</div>}

          {item.actions && item.actions.length > 0 && (
            <div className="enterprise-identity-inline-actions">
              {item.actions.map(action => (
                <Link to={action.to} key={action.key}>
                  {action.icon}
                  <span>{action.label}</span>
                </Link>
              ))}
            </div>
          )}
        </article>
      ))}
    </div>
  );
}

export function EnterpriseIdentityActionGrid({
  items,
}: {
  items: EnterpriseIdentityAction[];
}): JSX.Element {
  return (
    <div className="enterprise-identity-action-grid">
      {items.map(item => (
        <Link to={item.to} key={item.key}>
          {item.icon && <span className="enterprise-identity-action-icon">{item.icon}</span>}
          <span className="enterprise-identity-action-copy">
            <span>{item.label}</span>
            {item.description && <Text type="secondary">{item.description}</Text>}
          </span>
        </Link>
      ))}
    </div>
  );
}

export function EnterpriseIdentityRiskList({
  items,
}: {
  items: EnterpriseIdentityRiskItem[];
}): JSX.Element {
  return (
    <div className="enterprise-identity-risk-list">
      {items.map(item => (
        <article className={`enterprise-identity-risk-item ${getToneClass(item.tone)}`} key={item.key}>
          {item.icon && <span className="enterprise-identity-risk-icon">{item.icon}</span>}
          <Space direction="vertical" size={3} className="enterprise-identity-risk-copy">
            <Space wrap size={[6, 4]}>
              <Text strong>{item.title}</Text>
              {item.badge && <Tag className={getToneClass(item.tone)}>{item.badge}</Tag>}
            </Space>
            {item.description && <Text type="secondary">{item.description}</Text>}
            {item.action && (
              <Link to={item.action.to}>
                {item.action.icon}
                <span>{item.action.label}</span>
              </Link>
            )}
          </Space>
        </article>
      ))}
    </div>
  );
}
