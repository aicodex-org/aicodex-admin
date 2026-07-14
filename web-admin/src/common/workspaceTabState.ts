import type {ReactNode} from "react";

export const WORKSPACE_TABS_MAX_VISIBLE = 8;
export const WORKSPACE_TABS_STORAGE_KEY = "aicodex.admin.workspaceTabs.v1";
export const WORKSPACE_TAB_LABEL_UPDATE_EVENT = "aicodex.admin.workspaceTabLabelUpdate";
export const WORKSPACE_TAB_MIN_WIDTH = 92;
export const WORKSPACE_TAB_GAP = 6;
export const WORKSPACE_TABS_MORE_WIDTH = 88;

type WorkspaceMatcher = (uri: string) => boolean;

/** 企业认证中心导航叶子项的最小元数据，避免 workspace tabs 维护第二套菜单。 */
export interface WorkspaceNavigationItem {
  key: string;
  label: ReactNode;
  detailLabel?: ReactNode;
  detailPathDepth?: number;
  to?: string;
  external?: boolean;
  fixed?: boolean;
  matchPrefixes?: string[];
  matcher?: WorkspaceMatcher;
}

export interface WorkspaceNavigationGroup {
  label: ReactNode;
  children: WorkspaceNavigationItem[];
}

/** 从导航项派生出的 route-driven 标签匹配规则。 */
export interface WorkspaceRouteItem {
  key: string;
  path: string;
  label: string;
  detailLabel?: string;
  detailPathDepth?: number;
  groupLabel?: string;
  fixed?: boolean;
  matchPrefixes?: string[];
  matcher?: WorkspaceMatcher;
}

/** Shell 实际渲染和持久化的工作页面标签状态。 */
export interface WorkspaceTabItem {
  key: string;
  path: string;
  label: string;
  labelSource?: "route" | "detail";
  groupLabel?: string;
  fixed: boolean;
  closable: boolean;
}

/** 业务详情页在数据加载后更新已打开 workspace tab 标题的轻量事件载荷。 */
export interface WorkspaceTabLabelUpdateDetail {
  path: string;
  label: string;
  groupLabel?: string;
}

/** 可见标签与溢出标签的拆分结果。 */
export interface VisibleWorkspaceTabs {
  visibleTabs: WorkspaceTabItem[];
  overflowTabs: WorkspaceTabItem[];
}

/** 关闭标签后的新标签集合和应跳转路径。 */
export interface CloseWorkspaceTabResult {
  tabs: WorkspaceTabItem[];
  nextPath: string;
}

interface StoredWorkspaceTabs {
  version: 1;
  paths: string[];
}

function toLabelText(label: ReactNode, fallback: string) {
  return typeof label === "string" && label.trim() !== "" ? label : fallback;
}

function decodeWorkspacePathSegment(segment: string | undefined) {
  if (segment === undefined || segment.trim() === "") {
    return "";
  }

  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function getWorkspaceLabelSeparator(label: string) {
  return /[\u3400-\u9fff]/.test(label) ? "：" : ": ";
}

/** 群组详情和群组树共用群组路由实例标题，避免多开标签都显示同一个菜单名。 */
function getRouteInstanceLabel(route: WorkspaceRouteItem, normalizedPath: string) {
  const segments = normalizedPath.split("/").filter(Boolean);
  if (route.path === "/groups") {
    const isGroupDetailPath = (segments[0] === "groups" || segments[0] === "trees") && segments.length >= 3;
    if (!isGroupDetailPath) {
      return route.label;
    }

    const groupName = decodeWorkspacePathSegment(segments[2]);
    return groupName === "" ? route.label : `${route.label}${getWorkspaceLabelSeparator(route.label)}${groupName}`;
  }

  if (route.detailLabel === undefined || route.detailPathDepth !== segments.length) {
    return route.label;
  }

  const instanceName = decodeWorkspacePathSegment(segments.at(-1));
  return instanceName === "" ? route.label : `${route.detailLabel}${getWorkspaceLabelSeparator(route.detailLabel)}${instanceName}`;
}

/** 统一去除 query/hash/trailing slash，让标签状态只跟 route path 绑定。 */
export function normalizeWorkspacePath(path: string | undefined | null) {
  const rawPath = (path ?? "").trim();
  const withoutHash = rawPath.split("#")[0] ?? "";
  const withoutQuery = withoutHash.split("?")[0] ?? "";
  const withSlash = withoutQuery.startsWith("/") ? withoutQuery : `/${withoutQuery}`;
  const normalized = withSlash.replace(/\/{2,}/g, "/").replace(/\/+$/, "");

  return normalized === "" ? "/" : normalized;
}

function routeMatchesPath(route: WorkspaceRouteItem, path: string) {
  if (typeof route.matcher === "function" && route.matcher(path)) {
    return true;
  }

  const prefixes = route.matchPrefixes?.length ? route.matchPrefixes : [route.path];

  return prefixes.some((prefix) => {
    const normalizedPrefix = normalizeWorkspacePath(prefix);

    if (normalizedPrefix === "/") {
      return path === "/";
    }

    return path === normalizedPrefix || path.startsWith(`${normalizedPrefix}/`);
  });
}

/** 将现有企业认证中心导航分组转换为 workspace tabs 可消费的 route metadata。 */
export function buildWorkspaceRouteItems(groups: WorkspaceNavigationGroup[]) {
  const routes: WorkspaceRouteItem[] = groups.flatMap((group) => group.children
    .filter((item) => !item.external && item.to)
    .map((item) => {
      const path = normalizeWorkspacePath(item.to);

      return {
        key: item.key,
        path,
        label: toLabelText(item.label, item.key),
        detailLabel: item.detailLabel === undefined ? undefined : toLabelText(item.detailLabel, ""),
        detailPathDepth: item.detailPathDepth,
        groupLabel: toLabelText(group.label, ""),
        fixed: item.fixed === true,
        matchPrefixes: item.matchPrefixes,
        matcher: item.matcher,
      };
    }));

  if (!routes.some(route => route.path === "/")) {
    routes.unshift({
      key: "/",
      path: "/",
      label: "/",
      detailLabel: undefined,
      detailPathDepth: undefined,
      groupLabel: undefined,
      fixed: false,
      matchPrefixes: ["/"],
      matcher: undefined,
    });
  }

  return routes;
}

/** 按 matcher 和路径前缀查找当前 route 对应的导航标签。 */
export function findWorkspaceRoute(path: string, routes: WorkspaceRouteItem[]) {
  const normalizedPath = normalizeWorkspacePath(path);

  return routes.find(route => routeMatchesPath(route, normalizedPath));
}

function resolveWorkspaceTab(path: string, routes: WorkspaceRouteItem[]): WorkspaceTabItem | undefined {
  const normalizedPath = normalizeWorkspacePath(path);
  const route = findWorkspaceRoute(normalizedPath, routes);

  if (route === undefined) {
    return undefined;
  }

  const fixed = route?.fixed === true;

  return {
    key: normalizedPath,
    path: normalizedPath,
    label: route === undefined ? normalizedPath : getRouteInstanceLabel(route, normalizedPath),
    labelSource: "route",
    groupLabel: route?.groupLabel,
    fixed,
    closable: !fixed,
  };
}

function uniquePaths(paths: string[]) {
  const seen = new Set<string>();
  const normalizedPaths: string[] = [];

  paths.forEach((path) => {
    const normalizedPath = normalizeWorkspacePath(path);
    if (!seen.has(normalizedPath)) {
      seen.add(normalizedPath);
      normalizedPaths.push(normalizedPath);
    }
  });

  return normalizedPaths;
}

function ensureOverviewFirst(tabs: WorkspaceTabItem[], routes: WorkspaceRouteItem[]) {
  const paths = uniquePaths(["/", ...tabs.map(tab => tab.path)]);
  const tabsByPath = new Map(tabs.map(tab => [tab.path, tab]));

  return paths
    .map((path) => {
      const routeTab = resolveWorkspaceTab(path, routes);
      const existingTab = tabsByPath.get(path);

      if (routeTab === undefined || existingTab?.labelSource !== "detail") {
        return routeTab;
      }

      return {
        ...routeTab,
        label: existingTab.label,
        labelSource: "detail" as const,
        groupLabel: existingTab.groupLabel ?? routeTab.groupLabel,
      };
    })
    .filter((tab): tab is WorkspaceTabItem => tab !== undefined);
}

function getOverviewFallbackTab(tabs: WorkspaceTabItem[]) {
  const overviewTab = tabs.find(tab => tab.path === "/");

  return {
    key: "/",
    path: "/",
    label: overviewTab?.label ?? "/",
    labelSource: overviewTab?.labelSource,
    groupLabel: overviewTab?.groupLabel,
    fixed: false,
    closable: true,
  };
}

function ensureNonEmptyTabs(tabs: WorkspaceTabItem[], sourceTabs: WorkspaceTabItem[]) {
  return tabs.length > 0 ? tabs : [getOverviewFallbackTab(sourceTabs)];
}

function resolveNextPathAfterBatchClose(nextTabs: WorkspaceTabItem[], activePath: string, preferredPath: string, sourceTabs: WorkspaceTabItem[]) {
  const normalizedActivePath = normalizeWorkspacePath(activePath);
  const normalizedPreferredPath = normalizeWorkspacePath(preferredPath);
  const safeTabs = ensureNonEmptyTabs(nextTabs, sourceTabs);

  if (safeTabs.some(tab => tab.path === normalizedActivePath)) {
    return {
      tabs: safeTabs,
      nextPath: normalizedActivePath,
    };
  }

  if (safeTabs.some(tab => tab.path === normalizedPreferredPath)) {
    return {
      tabs: safeTabs,
      nextPath: normalizedPreferredPath,
    };
  }

  return {
    tabs: safeTabs,
    nextPath: safeTabs[0]?.path ?? "/",
  };
}

/** 打开当前 route 对应标签，同时保证总览 fallback 标签始终可用于空工作区恢复。 */
export function openWorkspaceTab(currentTabs: WorkspaceTabItem[], path: string, routes: WorkspaceRouteItem[]) {
  const normalizedPath = normalizeWorkspacePath(path);
  const normalizedTabs = ensureOverviewFirst(currentTabs, routes);
  const targetTab = resolveWorkspaceTab(normalizedPath, routes);

  if (targetTab === undefined || normalizedPath === "/" || normalizedTabs.some(tab => tab.path === normalizedPath)) {
    return normalizedTabs;
  }

  return ensureOverviewFirst([...normalizedTabs, targetTab], routes);
}

/** 从 sessionStorage payload 恢复标签顺序，异常或版本不匹配时安全降级。 */
export function hydrateWorkspaceTabs(serializedTabs: string | null | undefined, currentPath: string, routes: WorkspaceRouteItem[]) {
  try {
    const parsed = JSON.parse(serializedTabs ?? "") as Partial<StoredWorkspaceTabs>;
    if (parsed.version !== 1 || !Array.isArray(parsed.paths)) {
      throw new Error("Unsupported workspace tabs storage");
    }

    const restoredTabs = parsed.paths
      .map(path => resolveWorkspaceTab(path, routes))
      .filter((tab): tab is WorkspaceTabItem => tab !== undefined);
    return openWorkspaceTab(restoredTabs, currentPath, routes);
  } catch {
    return openWorkspaceTab([], currentPath, routes);
  }
}

/** 读取会话级标签状态；受限浏览器环境下回退到总览加当前页。 */
export function readWorkspaceTabs(storage: Storage | undefined, currentPath: string, routes: WorkspaceRouteItem[]) {
  try {
    return hydrateWorkspaceTabs(storage?.getItem(WORKSPACE_TABS_STORAGE_KEY), currentPath, routes);
  } catch {
    return openWorkspaceTab([], currentPath, routes);
  }
}

/** 保存会话级标签顺序，不保存业务页面内部状态。 */
export function saveWorkspaceTabs(storage: Storage | undefined, tabs: WorkspaceTabItem[]) {
  try {
    const payload: StoredWorkspaceTabs = {
      version: 1,
      paths: tabs.map(tab => tab.path),
    };

    storage?.setItem(WORKSPACE_TABS_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // 隐私模式或受限浏览器环境可能禁用 sessionStorage。
  }
}

/** 只更新当前已打开标签的显示标题，不改变标签路径、顺序或路由解析规则。 */
export function updateWorkspaceTabLabel(tabs: WorkspaceTabItem[], detail: WorkspaceTabLabelUpdateDetail) {
  const normalizedPath = normalizeWorkspacePath(detail.path);
  const label = detail.label.trim();

  if (label === "") {
    return tabs;
  }

  let changed = false;
  const nextTabs = tabs.map((tab) => {
    if (tab.path !== normalizedPath) {
      return tab;
    }

    const nextTab = {
      ...tab,
      label,
      labelSource: "detail" as const,
      groupLabel: detail.groupLabel ?? tab.groupLabel,
    };
    changed = tab.label !== nextTab.label || tab.labelSource !== nextTab.labelSource || tab.groupLabel !== nextTab.groupLabel;
    return nextTab;
  });

  return changed ? nextTabs : tabs;
}

/** 关闭标签并计算下一跳，关闭当前页时回到最近仍打开的页面。 */
export function closeWorkspaceTab(tabs: WorkspaceTabItem[], targetPath: string, activePath: string): CloseWorkspaceTabResult {
  const normalizedTargetPath = normalizeWorkspacePath(targetPath);
  const normalizedActivePath = normalizeWorkspacePath(activePath);
  const targetTab = tabs.find(tab => tab.path === normalizedTargetPath);

  if (!targetTab || !targetTab.closable) {
    return {
      tabs,
      nextPath: normalizedActivePath,
    };
  }

  const targetIndex = tabs.findIndex(tab => tab.path === normalizedTargetPath);
  const nextTabs = ensureNonEmptyTabs(tabs.filter(tab => tab.path !== normalizedTargetPath), tabs);

  if (normalizedTargetPath !== normalizedActivePath) {
    return {
      tabs: nextTabs,
      nextPath: normalizedActivePath,
    };
  }

  const rightTab = nextTabs[targetIndex];
  const leftTab = nextTabs[targetIndex - 1];

  return {
    tabs: nextTabs,
    nextPath: rightTab?.path ?? leftTab?.path ?? "/",
  };
}

/** 关闭除当前页和固定标签以外的其它标签，当前为总览时只保留固定标签。 */
export function closeOtherWorkspaceTabs(tabs: WorkspaceTabItem[], activePath: string): CloseWorkspaceTabResult {
  const normalizedActivePath = normalizeWorkspacePath(activePath);
  const nextTabs = ensureNonEmptyTabs(tabs.filter(tab => tab.path === normalizedActivePath), tabs);
  const activeStillOpen = nextTabs.some(tab => tab.path === normalizedActivePath);

  return {
    tabs: nextTabs,
    nextPath: activeStillOpen ? normalizedActivePath : "/",
  };
}

/** 关闭全部标签并恢复普通总览 fallback。 */
export function closeAllWorkspaceTabs(tabs: WorkspaceTabItem[]): CloseWorkspaceTabResult {
  return {
    tabs: [getOverviewFallbackTab(tabs)],
    nextPath: "/",
  };
}

/** 关闭目标标签左侧的可关闭标签；如果当前页被关闭，则跳到右键目标标签。 */
export function closeWorkspaceTabsToLeft(tabs: WorkspaceTabItem[], targetPath: string, activePath: string): CloseWorkspaceTabResult {
  const normalizedTargetPath = normalizeWorkspacePath(targetPath);
  const targetIndex = tabs.findIndex(tab => tab.path === normalizedTargetPath);

  if (targetIndex < 0) {
    return resolveNextPathAfterBatchClose(tabs, activePath, activePath, tabs);
  }

  const nextTabs = tabs.filter((tab, index) => index >= targetIndex || !tab.closable);

  return resolveNextPathAfterBatchClose(nextTabs, activePath, normalizedTargetPath, tabs);
}

/** 关闭目标标签右侧的可关闭标签；如果当前页被关闭，则跳到右键目标标签。 */
export function closeWorkspaceTabsToRight(tabs: WorkspaceTabItem[], targetPath: string, activePath: string): CloseWorkspaceTabResult {
  const normalizedTargetPath = normalizeWorkspacePath(targetPath);
  const targetIndex = tabs.findIndex(tab => tab.path === normalizedTargetPath);

  if (targetIndex < 0) {
    return resolveNextPathAfterBatchClose(tabs, activePath, activePath, tabs);
  }

  const nextTabs = tabs.filter((tab, index) => index <= targetIndex || !tab.closable);

  return resolveNextPathAfterBatchClose(nextTabs, activePath, normalizedTargetPath, tabs);
}

/** 限制桌面直接可见标签数，同时保持用户打开顺序稳定。 */
export function getVisibleWorkspaceTabs(
  tabs: WorkspaceTabItem[],
  _activePath: string,
  maxVisible = WORKSPACE_TABS_MAX_VISIBLE
): VisibleWorkspaceTabs {
  const capacity = Math.max(1, maxVisible);
  const visibleTabs = tabs.slice(0, capacity);

  return {
    visibleTabs,
    overflowTabs: tabs.slice(capacity),
  };
}

/** 根据标签栏实际宽度估算可见标签容量，宽屏尽量不提前出现“更多”。 */
export function calculateWorkspaceTabsCapacity(stripWidth: number, tabCount: number) {
  const normalizedTabCount = Math.max(1, tabCount);
  const usableWidth = Math.max(0, stripWidth);
  const fitWithoutOverflow = Math.floor((usableWidth + WORKSPACE_TAB_GAP) / (WORKSPACE_TAB_MIN_WIDTH + WORKSPACE_TAB_GAP));

  if (fitWithoutOverflow >= normalizedTabCount) {
    return normalizedTabCount;
  }

  const widthWithMoreReserved = Math.max(0, usableWidth - WORKSPACE_TABS_MORE_WIDTH - WORKSPACE_TAB_GAP);

  return Math.max(1, Math.floor((widthWithMoreReserved + WORKSPACE_TAB_GAP) / (WORKSPACE_TAB_MIN_WIDTH + WORKSPACE_TAB_GAP)));
}

/** 比较影响 shell 渲染的字段，避免 route effect 在标签未变化时重复 setState。 */
export function areWorkspaceTabsEqual(left: WorkspaceTabItem[], right: WorkspaceTabItem[]) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((leftTab, index) => {
    const rightTab = right[index];

    return rightTab !== undefined &&
      leftTab.path === rightTab.path &&
      leftTab.label === rightTab.label &&
      leftTab.labelSource === rightTab.labelSource &&
      leftTab.fixed === rightTab.fixed &&
      leftTab.closable === rightTab.closable;
  });
}
