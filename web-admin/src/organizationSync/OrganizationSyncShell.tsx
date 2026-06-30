import React from "react";
import {Button, Space, Typography} from "antd";
import type {ButtonProps} from "antd";
import {
  type OrganizationSyncProvider,
  getOrganizationSyncProviderLogoAlt,
  getOrganizationSyncProviderLogoUrl
} from "./OrganizationSyncTypes";

const {Text} = Typography;

export interface OrganizationSyncPageHeaderProps {
  className?: string;
  provider: OrganizationSyncProvider;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  statusText?: React.ReactNode;
}

export function OrganizationSyncPageHeader({className, provider, title, subtitle, statusText}: OrganizationSyncPageHeaderProps) {
  return (
    <div className={className}>
      <div className="organization-sync-page-title-main">
        <Space align="center" size={10}>
          <img
            className="organization-sync-provider-logo"
            src={getOrganizationSyncProviderLogoUrl(provider)}
            alt={getOrganizationSyncProviderLogoAlt(provider)}
            width={28}
            height={28}
          />
          <Space direction="vertical" size={0}>
            <Text strong>{title}</Text>
            {subtitle && <Text type="secondary">{subtitle}</Text>}
          </Space>
        </Space>
      </div>
      {statusText && (
        <div className="organization-sync-page-title-status">
          <Text type="secondary">{statusText}</Text>
        </div>
      )}
    </div>
  );
}

export interface OrganizationSyncAction {
  key: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  type?: ButtonProps["type"];
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export interface OrganizationSyncActionBarProps {
  className?: string;
  actions: OrganizationSyncAction[];
}

export function OrganizationSyncActionBar({className, actions}: OrganizationSyncActionBarProps) {
  return (
    <div className={className}>
      {actions.map(action => (
        <Button
          key={action.key}
          icon={action.icon}
          type={action.type}
          loading={action.loading}
          disabled={action.disabled}
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}

export interface OrganizationSyncSectionCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "config" | "record";
}

function joinClassNames(...classNames: Array<string | undefined>): string {
  return classNames.filter(Boolean).join(" ");
}

export function OrganizationSyncSectionCard({children, className, variant = "config"}: OrganizationSyncSectionCardProps) {
  return (
    <section className={joinClassNames("organization-sync-section-card", `organization-sync-${variant}-card`, className)}>
      {children}
    </section>
  );
}

export interface OrganizationSyncRunRecordHeaderProps {
  className?: string;
  title: React.ReactNode;
  hint: React.ReactNode;
  hintType?: "secondary" | "success" | "warning" | "danger";
  refreshAction: {
    label: React.ReactNode;
    icon?: React.ReactNode;
    loading?: boolean;
    onClick?: () => void;
  };
}

export function OrganizationSyncRunRecordHeader({className, title, hint, hintType = "secondary", refreshAction}: OrganizationSyncRunRecordHeaderProps) {
  return (
    <div className={className}>
      <div className="organization-sync-record-header-main">
        <Space direction="vertical" size={2}>
          <Text strong>{title}</Text>
          <Text type={hintType}>{hint}</Text>
        </Space>
      </div>
      <div className="organization-sync-record-header-action">
        <Button icon={refreshAction.icon} loading={refreshAction.loading} onClick={refreshAction.onClick}>
          {refreshAction.label}
        </Button>
      </div>
    </div>
  );
}
