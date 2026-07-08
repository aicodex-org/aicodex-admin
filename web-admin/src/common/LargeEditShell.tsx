import React from "react";
import {ArrowLeftOutlined} from "@ant-design/icons";
import {Button, Tabs} from "antd";
import type {TabsProps} from "antd";

interface LargeEditShellProps {
  classPrefix: string;
  backLabel: React.ReactNode;
  breadcrumb: React.ReactNode;
  title: React.ReactNode;
  children: React.ReactNode;
  actions: React.ReactNode;
  dirty?: boolean;
  dirtyLabel?: React.ReactNode;
  extra?: React.ReactNode;
  tabs?: React.ReactNode;
  onBack: () => void;
}

function joinClassNames(...classNames: Array<string | undefined | false>): string {
  return classNames.filter(Boolean).join(" ");
}

interface LargeEditTabsProps {
  classPrefix: string;
  activeKey: string;
  items: TabsProps["items"];
  onChange: (key: string) => void;
}

interface LargeEditSectionProps {
  classPrefix: string;
  title: React.ReactNode;
  children: React.ReactNode;
}

interface LargeEditFieldRowProps {
  classPrefix: string;
  label: React.ReactNode;
  children: React.ReactNode;
  required?: boolean;
  error?: React.ReactNode;
  wide?: boolean;
}

// 统一大型编辑页正文 tabs 的 class 边界，页面仍负责提供 tab key 与内容。
export function LargeEditTabs({classPrefix, activeKey, items, onChange}: LargeEditTabsProps): JSX.Element {
  return (
    <Tabs
      className={joinClassNames("admin-large-edit-tabs", `${classPrefix}-tabs`)}
      activeKey={activeKey}
      onChange={onChange}
      items={items}
    />
  );
}

// 统一大型编辑页区块标题和双列表单网格，避免每个编辑页复制相同 DOM 结构。
export function LargeEditSection({classPrefix, title, children}: LargeEditSectionProps): JSX.Element {
  return (
    <section className={joinClassNames("admin-large-edit-section", `${classPrefix}-section`)}>
      <h2 className={joinClassNames("admin-large-edit-section-title", `${classPrefix}-section-title`)}>{title}</h2>
      <div className={joinClassNames("admin-large-edit-field-grid", `${classPrefix}-field-grid`)}>
        {children}
      </div>
    </section>
  );
}

// 统一字段行、必填标识和本地校验错误展示，具体控件和业务校验仍由页面提供。
export function LargeEditFieldRow({classPrefix, label, children, required = false, error, wide = false}: LargeEditFieldRowProps): JSX.Element {
  const labelText = (
    <span className={joinClassNames("admin-large-edit-field-label-text", `${classPrefix}-field-label-text`)}>
      {required ? <span className={joinClassNames("admin-large-edit-required-mark", `${classPrefix}-required-mark`)} aria-hidden="true">*</span> : null}
      <span>{label}</span>
      <span className={joinClassNames("admin-large-edit-label-colon", `${classPrefix}-label-colon`)}>:</span>
    </span>
  );

  return (
    <div className={joinClassNames(
      "admin-large-edit-field-row",
      `${classPrefix}-field-row`,
      wide && "admin-large-edit-field-row-wide",
      wide && `${classPrefix}-field-row-wide`
    )}>
      <div className={joinClassNames("admin-large-edit-field-label", `${classPrefix}-field-label`)}>
        {labelText}
      </div>
      <div className={joinClassNames("admin-large-edit-field-control", `${classPrefix}-field-control`)}>
        {children}
        {error !== undefined ? <div className={joinClassNames("admin-large-edit-field-error", `${classPrefix}-field-error`)}>{error}</div> : null}
      </div>
    </div>
  );
}

// 统一大型编辑页壳：头部、可选页内 Tabs、滚动正文和底部动作栏。
export default function LargeEditShell({
  classPrefix,
  backLabel,
  breadcrumb,
  title,
  children,
  actions,
  dirty = false,
  dirtyLabel,
  extra,
  tabs,
  onBack,
}: LargeEditShellProps): JSX.Element {
  return (
    <div className={joinClassNames("admin-large-edit-shell", `${classPrefix}-shell`)}>
      <div className={joinClassNames("admin-large-edit-header", `${classPrefix}-header`)}>
        <Button className={joinClassNames("admin-large-edit-back-button", `${classPrefix}-back-button`)} type="text" icon={<ArrowLeftOutlined />} onClick={onBack}>
          {backLabel}
        </Button>
        <span className={joinClassNames("admin-large-edit-breadcrumb", `${classPrefix}-breadcrumb`)}>{breadcrumb}</span>
        <span className={joinClassNames("admin-large-edit-title", `${classPrefix}-title`)}>{title}</span>
        {extra}
        {dirty ? <span className={joinClassNames("admin-large-edit-dirty-state", `${classPrefix}-dirty-state`)}>{dirtyLabel}</span> : null}
      </div>
      {tabs}
      <div className={joinClassNames("admin-large-edit-scroll-content", `${classPrefix}-scroll-content`)}>
        {children}
      </div>
      <div className={joinClassNames("admin-large-edit-action-bar", `${classPrefix}-action-bar`)}>
        {actions}
      </div>
    </div>
  );
}
