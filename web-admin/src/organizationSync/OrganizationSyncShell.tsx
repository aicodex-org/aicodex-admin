import React from "react";
import {Button, Col, Row, Space, Typography} from "antd";
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
    <Row className={className} align="middle" justify="space-between" gutter={[16, 8]} style={{marginBottom: 12}}>
      <Col flex="auto">
        <Space align="center" size={10}>
          <img
            src={getOrganizationSyncProviderLogoUrl(provider)}
            alt={getOrganizationSyncProviderLogoAlt(provider)}
            width={28}
            height={28}
            style={{display: "block", borderRadius: 4}}
          />
          <Space direction="vertical" size={0}>
            <Text strong>{title}</Text>
            {subtitle && <Text type="secondary">{subtitle}</Text>}
          </Space>
        </Space>
      </Col>
      {statusText && (
        <Col>
          <Text type="secondary">{statusText}</Text>
        </Col>
      )}
    </Row>
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
    <Space className={className} style={{marginTop: 16}} wrap>
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
    </Space>
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
    <Row className={className} align="middle" justify="space-between" gutter={[12, 8]} style={{marginBottom: 12}}>
      <Col>
        <Space direction="vertical" size={2}>
          <Text strong>{title}</Text>
          <Text type={hintType}>{hint}</Text>
        </Space>
      </Col>
      <Col>
        <Button icon={refreshAction.icon} loading={refreshAction.loading} onClick={refreshAction.onClick}>
          {refreshAction.label}
        </Button>
      </Col>
    </Row>
  );
}
