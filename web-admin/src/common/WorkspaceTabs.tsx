import React from "react";
import {Button, Dropdown, Tooltip} from "antd";
import {CloseOutlined, MoreOutlined, PushpinFilled} from "@ant-design/icons";
import i18next from "i18next";
import {
  WORKSPACE_TABS_MAX_VISIBLE,
  type WorkspaceTabItem,
  getVisibleWorkspaceTabs,
  normalizeWorkspacePath
} from "./workspaceTabState";

interface WorkspaceTabsProps {
  tabs: WorkspaceTabItem[];
  activePath: string;
  isMobile: boolean;
  maxVisible?: number;
  onNavigate: (path: string) => void;
  onClose: (path: string) => void;
}

function getActiveTab(tabs: WorkspaceTabItem[], activePath: string) {
  const normalizedActivePath = normalizeWorkspacePath(activePath);

  return tabs.find(tab => tab.path === normalizedActivePath);
}

function buildOverflowItems(tabs: WorkspaceTabItem[], onNavigate: (path: string) => void) {
  return tabs.map((tab) => ({
    key: tab.path,
    label: tab.label,
    onClick: () => onNavigate(tab.path),
  }));
}

function tText(key: string) {
  return String(i18next.t(key));
}

function WorkspaceTabs(props: WorkspaceTabsProps) {
  const activePath = normalizeWorkspacePath(props.activePath);
  const activeTab = getActiveTab(props.tabs, activePath);
  const closePrefix = tText("general:Close workspace tab");
  const moreLabel = tText("general:More workspace pages");
  const workspaceLabel = tText("general:Workspace pages");
  const {visibleTabs, overflowTabs} = getVisibleWorkspaceTabs(
    props.tabs,
    activePath,
    props.maxVisible ?? WORKSPACE_TABS_MAX_VISIBLE
  );
  const overflowMenu = {
    items: buildOverflowItems(props.isMobile ? props.tabs : overflowTabs, props.onNavigate),
  };

  if (props.isMobile) {
    return (
      <div className="admin-workspace-tabs-shell admin-workspace-tabs-shell-mobile">
        <div className="admin-workspace-tabs admin-workspace-tabs-mobile" aria-label={workspaceLabel}>
          <div className="admin-workspace-tabs-mobile-current">
            <span className="admin-workspace-tabs-mobile-label">{tText("general:Current workspace page")}</span>
            <strong>{activeTab?.label ?? activePath}</strong>
          </div>
          <Dropdown menu={overflowMenu} trigger={["click"]}>
            <Button type="text" size="small" icon={<MoreOutlined />} aria-label={moreLabel}>
              {tText("general:More")}
            </Button>
          </Dropdown>
        </div>
        <div className="admin-workspace-tabs-divider" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="admin-workspace-tabs-shell">
      <nav className="admin-workspace-tabs admin-workspace-tabs-desktop" aria-label={workspaceLabel}>
        <div className="admin-workspace-tabs-strip">
          {visibleTabs.map((tab) => {
            const active = tab.path === activePath;

            return (
              <div
                key={tab.path}
                className={`admin-workspace-tab${active ? " admin-workspace-tab-active" : ""}${tab.fixed ? " admin-workspace-tab-fixed" : ""}`}
              >
                <button
                  type="button"
                  className="admin-workspace-tab-label"
                  aria-current={active ? "page" : undefined}
                  onClick={() => props.onNavigate(tab.path)}
                >
                  {tab.fixed ? (
                    <Tooltip title={tText("general:Fixed workspace tab")}>
                      <PushpinFilled className="admin-workspace-tab-pin" aria-hidden="true" />
                    </Tooltip>
                  ) : (
                    <span className="admin-workspace-tab-dot" aria-hidden="true" />
                  )}
                  <span className="admin-workspace-tab-text">{tab.label}</span>
                </button>
                {tab.closable && (
                  <Tooltip title={`${closePrefix} ${tab.label}`}>
                    <button
                      type="button"
                      className="admin-workspace-tab-close"
                      aria-label={`${closePrefix} ${tab.label}`}
                      onClick={() => props.onClose(tab.path)}
                    >
                      <CloseOutlined />
                    </button>
                  </Tooltip>
                )}
              </div>
            );
          })}
          {overflowTabs.length > 0 && (
            <Dropdown menu={overflowMenu} trigger={["click"]}>
              <Button className="admin-workspace-tabs-more" type="text" size="small" icon={<MoreOutlined />} aria-label={moreLabel}>
                {tText("general:More")}
              </Button>
            </Dropdown>
          )}
        </div>
      </nav>
      <div className="admin-workspace-tabs-divider" aria-hidden="true" />
    </div>
  );
}

export default WorkspaceTabs;
