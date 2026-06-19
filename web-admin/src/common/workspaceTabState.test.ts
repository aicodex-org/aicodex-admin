/* eslint-env jest */
import {expect} from "@jest/globals";
import {
  closeWorkspaceTab,
  areWorkspaceTabsEqual,
  buildWorkspaceRouteItems,
  getVisibleWorkspaceTabs,
  hydrateWorkspaceTabs,
  openWorkspaceTab,
  normalizeWorkspacePath,
  readWorkspaceTabs,
  saveWorkspaceTabs,
  WORKSPACE_TABS_STORAGE_KEY,
  WORKSPACE_TABS_MAX_VISIBLE,
} from "./workspaceTabState";
import type {WorkspaceRouteItem, WorkspaceTabItem} from "./workspaceTabState";

const routes: WorkspaceRouteItem[] = [
  {key: "/", path: "/", label: "企业认证总览", fixed: true, matchPrefixes: ["/"]},
  {key: "/applications", path: "/applications", label: "应用接入中心", matchPrefixes: ["/applications"]},
  {key: "/providers", path: "/providers", label: "身份源中心", matchPrefixes: ["/providers"]},
  {key: "/records", path: "/records", label: "审计记录", matchPrefixes: ["/records"]},
  {key: "/organizations", path: "/organizations", label: "组织", matchPrefixes: ["/organizations"]},
  {key: "/users", path: "/users", label: "用户", matchPrefixes: ["/users"]},
  {key: "/agents", path: "/agents", label: "AI Agent 入口", matchPrefixes: ["/agents"]},
  {key: "/servers", path: "/servers", label: "MCP Server", matchPrefixes: ["/servers"]},
  {key: "/entries", path: "/entries", label: "入口配置", matchPrefixes: ["/entries"]},
  {key: "/rules", path: "/rules", label: "治理规则", matchPrefixes: ["/rules"]},
];

describe("workspaceTabState", () => {
  test("normalizes paths without query hash or trailing slash noise", () => {
    expect(normalizeWorkspacePath("applications/?q=1#top")).toBe("/applications");
    expect(normalizeWorkspacePath("/")).toBe("/");
    expect(normalizeWorkspacePath("")).toBe("/");
  });

  test("keeps overview fixed and opens the current route-driven tab", () => {
    const tabs = openWorkspaceTab([], "/applications/built-in/app-a?tab=basic", routes);

    expect(tabs.map(tab => tab.path)).toEqual(["/", "/applications/built-in/app-a"]);
    expect(tabs[0]).toMatchObject({label: "企业认证总览", fixed: true, closable: false});
    expect(tabs[1]).toMatchObject({label: "应用接入中心", fixed: false, closable: true});
  });

  test("hydrates invalid storage safely with overview and current route", () => {
    const tabs = hydrateWorkspaceTabs("{bad json", "/providers", routes);

    expect(tabs.map(tab => tab.path)).toEqual(["/", "/providers"]);
    expect(tabs[1].label).toBe("身份源中心");
  });

  test("hydrates valid storage and refreshes labels from current route metadata", () => {
    const tabs = hydrateWorkspaceTabs(
      JSON.stringify({version: 1, paths: ["/applications", "/records"]}),
      "/providers",
      routes
    );

    expect(tabs.map(tab => tab.path)).toEqual(["/", "/applications", "/records", "/providers"]);
    expect(tabs.map(tab => tab.label)).toEqual(["企业认证总览", "应用接入中心", "审计记录", "身份源中心"]);
  });

  test("builds route metadata with matcher routes and overview fallback", () => {
    const routeItems = buildWorkspaceRouteItems([{
      label: "自定义",
      children: [
        {key: "/custom", label: "unused", to: "/custom", matcher: (uri: string) => uri.startsWith("/custom-view")},
        {key: "/external", label: "外链", to: "/external", external: true},
      ],
    }]);
    const tabs = openWorkspaceTab([], "/custom-view/123", routeItems);

    expect(routeItems.map(route => route.path)).toEqual(["/", "/custom"]);
    expect(tabs.map(tab => tab.label)).toEqual(["/", "unused"]);
  });

  test("reads and saves session storage with restricted-storage fallback", () => {
    const stored: Record<string, string> = {};
    const storage = {
      getItem: (key: string) => stored[key] ?? null,
      setItem: (key: string, value: string) => {
        stored[key] = value;
      },
    } as Storage;
    const tabs = openWorkspaceTab([], "/records", routes);

    saveWorkspaceTabs(storage, tabs);
    expect(JSON.parse(stored[WORKSPACE_TABS_STORAGE_KEY]).paths).toEqual(["/", "/records"]);
    expect(readWorkspaceTabs(storage, "/providers", routes).map(tab => tab.path)).toEqual(["/", "/records", "/providers"]);

    const restrictedStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    } as unknown as Storage;
    expect(readWorkspaceTabs(restrictedStorage, "/users", routes).map(tab => tab.path)).toEqual(["/", "/users"]);
    expect(() => saveWorkspaceTabs(restrictedStorage, tabs)).not.toThrow();
  });

  test("closes current tab by navigating to the nearest remaining tab", () => {
    const applications = openWorkspaceTab([], "/applications", routes);
    const providers = openWorkspaceTab(applications, "/providers", routes);
    const records = openWorkspaceTab(providers, "/records", routes);

    const result = closeWorkspaceTab(records, "/records", "/records");

    expect(result.tabs.map(tab => tab.path)).toEqual(["/", "/applications", "/providers"]);
    expect(result.nextPath).toBe("/providers");
  });

  test("closes a non-active tab without changing the active route", () => {
    const tabs = openWorkspaceTab(openWorkspaceTab([], "/applications", routes), "/providers", routes);
    const result = closeWorkspaceTab(tabs, "/applications", "/providers");

    expect(result.tabs.map(tab => tab.path)).toEqual(["/", "/providers"]);
    expect(result.nextPath).toBe("/providers");
  });

  test("ignores attempts to close the fixed overview tab", () => {
    const tabs = openWorkspaceTab([], "/applications", routes);
    const result = closeWorkspaceTab(tabs, "/", "/applications");

    expect(result.tabs.map(tab => tab.path)).toEqual(["/", "/applications"]);
    expect(result.nextPath).toBe("/applications");
  });

  test("keeps active tab visible and moves extra pages into overflow", () => {
    const tabs = routes
      .filter(route => route.path !== "/")
      .reduce<WorkspaceTabItem[]>((currentTabs, route) => openWorkspaceTab(currentTabs, route.path, routes), []);

    const visible = getVisibleWorkspaceTabs(tabs, "/rules", WORKSPACE_TABS_MAX_VISIBLE);

    expect(visible.visibleTabs).toHaveLength(WORKSPACE_TABS_MAX_VISIBLE);
    expect(visible.visibleTabs.map(tab => tab.path)).toContain("/");
    expect(visible.visibleTabs.map(tab => tab.path)).toContain("/rules");
    expect(visible.overflowTabs.length).toBeGreaterThan(0);
  });

  test("compares tab state by rendered shell fields", () => {
    const tabs = openWorkspaceTab([], "/applications", routes);
    const sameTabs = openWorkspaceTab([], "/applications", routes);
    const differentTabs = openWorkspaceTab(tabs, "/providers", routes);

    expect(areWorkspaceTabsEqual(tabs, sameTabs)).toBe(true);
    expect(areWorkspaceTabsEqual(tabs, differentTabs)).toBe(false);
    expect(areWorkspaceTabsEqual(tabs, [{...tabs[0], label: "总览"}])).toBe(false);
  });
});
