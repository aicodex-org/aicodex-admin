import React from "react";
import {ArrowLeftOutlined} from "@ant-design/icons";
import {Button} from "antd";

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
