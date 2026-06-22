import React, {useEffect, useRef, useState} from "react";
import {Button, Dropdown, Tooltip} from "antd";
import {CloseOutlined, LeftOutlined, MoreOutlined, PushpinFilled, RightOutlined} from "@ant-design/icons";
import i18next from "i18next";
import {
  type WorkspaceTabItem,
  normalizeWorkspacePath
} from "./workspaceTabState";

interface WorkspaceTabsProps {
  tabs: WorkspaceTabItem[];
  activePath: string;
  isMobile: boolean;
  maxVisible?: number;
  onNavigate: (path: string) => void;
  onClose: (path: string) => void;
  onCloseCurrent?: () => void;
  onCloseOther?: () => void;
  onCloseAll?: () => void;
}

function getActiveTab(tabs: WorkspaceTabItem[], activePath: string) {
  const normalizedActivePath = normalizeWorkspacePath(activePath);

  return tabs.find(tab => tab.path === normalizedActivePath);
}

function buildOverflowItems(
  tabs: WorkspaceTabItem[],
  activePath: string,
  onNavigate: (path: string) => void,
  onClose: (path: string) => void,
  closePrefix: string
) {
  return tabs.map((tab) => ({
    key: tab.path,
    label: (
      <span className="admin-workspace-tabs-overflow-label">
        <span className="admin-workspace-tabs-overflow-text" title={tab.label}>{tab.label}</span>
        {tab.closable && (
          <button
            type="button"
            className="admin-workspace-tabs-overflow-close"
            aria-label={`${closePrefix} ${tab.label}`}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onClose(tab.path);
            }}
          >
            <CloseOutlined aria-hidden="true" />
          </button>
        )}
      </span>
    ),
    className: tab.path === activePath ? "admin-workspace-tabs-overflow-item-active" : undefined,
    onClick: () => onNavigate(tab.path),
  }));
}

function tText(key: string) {
  return String(i18next.t(key));
}

interface ScrollState {
  canScrollLeft: boolean;
  canScrollRight: boolean;
}

function WorkspaceTabs(props: WorkspaceTabsProps) {
  const scrollViewportRef = useRef<HTMLDivElement | null>(null);
  const tabElementRefs = useRef(new Map<string, HTMLDivElement>());
  const [scrollState, setScrollState] = useState<ScrollState>({canScrollLeft: false, canScrollRight: false});
  const activePath = normalizeWorkspacePath(props.activePath);
  const activeTab = getActiveTab(props.tabs, activePath);
  const closePrefix = tText("general:Close workspace tab");
  const moreLabel = tText("general:More workspace pages");
  const workspaceLabel = tText("general:Workspace pages");
  const workspaceActionsLabel = tText("general:Workspace tab actions");
  const fixedTabs = props.tabs.filter(tab => tab.fixed);
  const scrollTabs = props.tabs.filter(tab => !tab.fixed);
  const activeIsFixed = activeTab?.fixed === true;
  const overflowMenu = {
    items: buildOverflowItems(props.tabs, activePath, props.onNavigate, props.onClose, closePrefix),
    selectedKeys: [activePath],
  };
  const closeActionsMenu = {
    items: [
      {
        key: "close-current",
        label: tText("general:Close current workspace tab"),
        disabled: activeIsFixed,
        onClick: () => props.onCloseCurrent?.(),
      },
      {
        key: "close-other",
        label: tText("general:Close other workspace tabs"),
        onClick: () => props.onCloseOther?.(),
      },
      {
        key: "close-all",
        label: tText("general:Close all workspace tabs"),
        onClick: () => props.onCloseAll?.(),
      },
    ],
  };

  // 箭头只反映当前滚动容器的真实可视范围，避免用标签数量推断溢出状态。
  const updateScrollState = () => {
    const viewport = scrollViewportRef.current;
    if (viewport === null) {
      return;
    }

    const canScrollLeft = viewport.scrollLeft > 1;
    const canScrollRight = viewport.scrollLeft + viewport.clientWidth < viewport.scrollWidth - 1;

    setScrollState((currentState) => (
      currentState.canScrollLeft === canScrollLeft && currentState.canScrollRight === canScrollRight ?
        currentState :
        {canScrollLeft, canScrollRight}
    ));
  };

  useEffect(() => {
    if (props.isMobile || scrollViewportRef.current === null) {
      return undefined;
    }

    const viewport = scrollViewportRef.current;
    updateScrollState();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateScrollState);
      return () => window.removeEventListener("resize", updateScrollState);
    }

    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(viewport);

    return () => resizeObserver.disconnect();
  }, [props.isMobile, props.tabs.length]);

  useEffect(() => {
    if (props.isMobile) {
      return;
    }

    const activeElement = tabElementRefs.current.get(activePath);
    if (activeElement && typeof activeElement.scrollIntoView === "function") {
      activeElement.scrollIntoView({block: "nearest", inline: "nearest"});
      updateScrollState();
    }
  }, [activePath, props.isMobile, props.tabs.length]);

  const renderTab = (tab: WorkspaceTabItem) => {
    const active = tab.path === activePath;

    return (
      <div
        key={tab.path}
        ref={(element) => {
          if (element === null) {
            tabElementRefs.current.delete(tab.path);
          } else {
            tabElementRefs.current.set(tab.path, element);
          }
        }}
        className={`admin-workspace-tab${active ? " admin-workspace-tab-active" : ""}${tab.fixed ? " admin-workspace-tab-fixed" : ""}`}
        data-workspace-tab-path={tab.path}
      >
        <button
          type="button"
          className="admin-workspace-tab-label"
          aria-current={active ? "page" : undefined}
          title={tab.label}
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
              <CloseOutlined aria-hidden="true" />
            </button>
          </Tooltip>
        )}
      </div>
    );
  };

  const scrollTabsBy = (direction: -1 | 1) => {
    const viewport = scrollViewportRef.current;
    if (viewport === null) {
      return;
    }

    const distance = Math.max(160, Math.floor(viewport.clientWidth * 0.75));
    if (typeof viewport.scrollBy === "function") {
      viewport.scrollBy({left: direction * distance, behavior: "smooth"});
    } else {
      viewport.scrollLeft += direction * distance;
    }

    updateScrollState();
  };

  // 保留隐藏按钮槽位，避免滚动边界变化时右侧工具区宽度跳动。
  const renderScrollButton = (direction: -1 | 1, enabled: boolean) => (
    <Button
      className={`admin-workspace-tabs-scroll-button${enabled ? "" : " admin-workspace-tabs-scroll-button-hidden"}`}
      type="text"
      size="small"
      icon={direction < 0 ? <LeftOutlined /> : <RightOutlined />}
      aria-hidden={enabled ? undefined : "true"}
      aria-label={enabled ? tText(direction < 0 ? "general:Scroll workspace tabs left" : "general:Scroll workspace tabs right") : undefined}
      disabled={!enabled}
      tabIndex={enabled ? undefined : -1}
      onClick={() => {
        if (enabled) {
          scrollTabsBy(direction);
        }
      }}
    />
  );

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
        <div className="admin-workspace-tabs-fixed-area">
          {fixedTabs.map(renderTab)}
        </div>
        <div className="admin-workspace-tabs-scroll-area">
          <div className="admin-workspace-tabs-scroll-viewport" ref={scrollViewportRef} onScroll={updateScrollState}>
            <div className="admin-workspace-tabs-scroll-strip">
              {scrollTabs.map(renderTab)}
            </div>
          </div>
        </div>
        <div className="admin-workspace-tabs-actions" role="group" aria-label={workspaceActionsLabel}>
          {renderScrollButton(-1, scrollState.canScrollLeft)}
          {renderScrollButton(1, scrollState.canScrollRight)}
          <Dropdown menu={closeActionsMenu} trigger={["click"]}>
            <Button className="admin-workspace-tabs-close-menu" type="text" size="small" icon={<CloseOutlined />} aria-label={tText("general:Close workspace pages")}>
              {tText("general:Close workspace tabs")}
            </Button>
          </Dropdown>
        </div>
      </nav>
      <div className="admin-workspace-tabs-divider" aria-hidden="true" />
    </div>
  );
}

export default WorkspaceTabs;
