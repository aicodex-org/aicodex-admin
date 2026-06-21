import type {ReactNode} from "react";

export const WORKSPACE_TABS_MAX_VISIBLE = 8;
export const WORKSPACE_TABS_STORAGE_KEY = "aicodex.admin.workspaceTabs.v1";
export const WORKSPACE_TAB_MIN_WIDTH = 92;
export const WORKSPACE_TAB_GAP = 6;
export const WORKSPACE_TABS_MORE_WIDTH = 88;

type WorkspaceMatcher = (uri: string) => boolean;

/** 企业认证中心导航叶子项的最小元数据，避免 workspace tabs 维护第二套菜单。 */
export interface WorkspaceNavigationItem {
  key: string;
  label: ReactNode;
  to?: string;
  external?: boolean;
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
  groupLabel?: string;
  fixed: boolean;
  closable: boolean;
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
        groupLabel: toLabelText(group.label, ""),
        fixed: path === "/",
        matchPrefixes: item.matchPrefixes,
        matcher: item.matcher,
      };
    }));

  if (!routes.some(route => route.path === "/")) {
    routes.unshift({
      key: "/",
      path: "/",
      label: "/",
      groupLabel: undefined,
      fixed: true,
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

  const isOverview = normalizedPath === "/";
  const fixed = isOverview || route?.fixed === true;

  return {
    key: normalizedPath,
    path: normalizedPath,
    label: route?.label ?? normalizedPath,
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

  return paths
    .map(path => resolveWorkspaceTab(path, routes))
    .filter((tab): tab is WorkspaceTabItem => tab !== undefined);
}

/** 打开当前 route 对应标签，同时保证总览标签始终排在第一位且不可关闭。 */
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
  const nextTabs = tabs.filter(tab => tab.path !== normalizedTargetPath);

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
      leftTab.fixed === rightTab.fixed &&
      leftTab.closable === rightTab.closable;
  });
}
