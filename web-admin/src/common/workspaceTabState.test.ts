/* eslint-env jest */
import React from "react";
import {expect} from "@jest/globals";
import {
  WORKSPACE_TABS_MAX_VISIBLE,
  WORKSPACE_TABS_STORAGE_KEY,
  areWorkspaceTabsEqual,
  buildWorkspaceRouteItems,
  calculateWorkspaceTabsCapacity,
  closeAllWorkspaceTabs,
  closeOtherWorkspaceTabs,
  closeWorkspaceTab,
  closeWorkspaceTabsToLeft,
  closeWorkspaceTabsToRight,
  getVisibleWorkspaceTabs,
  hydrateWorkspaceTabs,
  normalizeWorkspacePath,
  openWorkspaceTab,
  readWorkspaceTabs,
  saveWorkspaceTabs,
  updateWorkspaceTabLabel
} from "./workspaceTabState";

const routes = [
  {key: "/", path: "/", label: "企业认证总览", matchPrefixes: ["/"]},
  {key: "/applications", path: "/applications", label: "接入中心", matchPrefixes: ["/applications"]},
  {key: "/providers", path: "/providers", label: "身份源中心", matchPrefixes: ["/providers"]},
  {key: "/records", path: "/records", label: "操作日志", matchPrefixes: ["/records"]},
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
    expect(normalizeWorkspacePath(null)).toBe("/");
    expect(normalizeWorkspacePath("/")).toBe("/");
    expect(normalizeWorkspacePath("")).toBe("/");
  });

  test("keeps overview as a normal fallback tab and opens the current route-driven tab", () => {
    const tabs = openWorkspaceTab([], "/applications/built-in/app-a?tab=basic", routes);

    expect(tabs.map(tab => tab.path)).toEqual(["/", "/applications/built-in/app-a"]);
    expect(tabs[0]).toMatchObject({label: "企业认证总览", fixed: false, closable: true});
    expect(tabs[1]).toMatchObject({label: "接入中心", fixed: false, closable: true});
  });

  test("hydrates invalid storage safely with overview and current route", () => {
    const tabs = hydrateWorkspaceTabs("{bad json", "/providers", routes);

    expect(tabs.map(tab => tab.path)).toEqual(["/", "/providers"]);
    expect(tabs[1].label).toBe("身份源中心");
  });

  test("hydrates unsupported storage versions safely with overview and current route", () => {
    const tabs = hydrateWorkspaceTabs(JSON.stringify({version: 2, paths: ["/applications"]}), "/users", routes);

    expect(tabs.map(tab => tab.path)).toEqual(["/", "/users"]);
  });

  test("hydrates valid storage and refreshes labels from current route metadata", () => {
    const tabs = hydrateWorkspaceTabs(
      JSON.stringify({version: 1, paths: ["/applications", "/records"]}),
      "/providers",
      routes
    );

    expect(tabs.map(tab => tab.path)).toEqual(["/", "/applications", "/records", "/providers"]);
    expect(tabs.map(tab => tab.label)).toEqual(["企业认证总览", "接入中心", "操作日志", "身份源中心"]);
  });

  test("filters invalid restored routes before rendering workspace tabs", () => {
    const tabs = hydrateWorkspaceTabs(
      JSON.stringify({version: 1, paths: ["/404", "/shortcuts", "/applications", "/legacy-route", "/providers"]}),
      "/records",
      routes
    );

    expect(tabs.map(tab => tab.path)).toEqual(["/", "/applications", "/providers", "/records"]);
    expect(tabs.map(tab => tab.path)).not.toContain("/404");
    expect(tabs.map(tab => tab.path)).not.toContain("/shortcuts");
    expect(tabs.map(tab => tab.path)).not.toContain("/legacy-route");
  });

  test("falls back to overview when restored and current routes are invalid", () => {
    const tabs = hydrateWorkspaceTabs(
      JSON.stringify({version: 1, paths: ["/404", "/shortcuts", "/legacy-route"]}),
      "/unknown-route",
      routes
    );

    expect(tabs.map(tab => tab.path)).toEqual(["/"]);
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

  test("builds route metadata without duplicating overview and with label fallbacks", () => {
    const routeItems = buildWorkspaceRouteItems([{
      label: React.createElement("span", null, "分组"),
      children: [
        {key: "/", label: "总览", to: "/", matchPrefixes: ["/"]},
        {key: "/custom", label: "", to: "/custom"},
      ],
    }]);

    expect(routeItems.map(route => route.path)).toEqual(["/", "/custom"]);
    expect(routeItems[1]).toMatchObject({label: "/custom", groupLabel: ""});
    expect(openWorkspaceTab([], "/custom/child", routeItems).map(tab => tab.path)).toEqual(["/", "/custom/child"]);
  });

  test("distinguishes group detail workspace tabs and accepts display-name updates", () => {
    const groupRoutes = [
      {key: "/", path: "/", label: "身份总览", matchPrefixes: ["/"]},
      {key: "/groups", path: "/groups", label: "群组", matchPrefixes: ["/groups", "/trees"]},
    ];

    const tabs = openWorkspaceTab([], "/groups/engineering/group-main", groupRoutes);
    expect(tabs.map(tab => tab.label)).toEqual(["身份总览", "群组：group-main"]);

    const updatedTabs = updateWorkspaceTabLabel(tabs, {
      path: "/groups/engineering/group-main",
      label: "群组：湖北销售",
    });

    expect(updatedTabs[1]).toMatchObject({
      path: "/groups/engineering/group-main",
      label: "群组：湖北销售",
    });
  });

  test("uses an edit-specific label for application detail workspace tabs", () => {
    const applicationRoutes = buildWorkspaceRouteItems([{
      label: "应用接入",
      children: [
        {key: "/applications", label: "接入中心", detailLabel: "编辑应用", detailPathDepth: 3, to: "/applications", matchPrefixes: ["/applications"]},
      ],
    }]);
    const tabs = openWorkspaceTab([], "/applications/engineering/portal", applicationRoutes);
    const actionTabs = openWorkspaceTab([], "/applications/engineering/portal/buy", applicationRoutes);

    expect(tabs.map(tab => tab.label)).toEqual(["/", "编辑应用：portal"]);
    expect(actionTabs.map(tab => tab.label)).toEqual(["/", "接入中心"]);
  });

  test("reuses a list tab while keeping multiple object edit paths independent", () => {
    const applicationRoutes = buildWorkspaceRouteItems([{
      label: "应用接入",
      children: [
        {key: "/applications", label: "接入中心", detailLabel: "编辑应用", detailPathDepth: 3, to: "/applications", matchPrefixes: ["/applications"]},
      ],
    }]);
    const listTabs = openWorkspaceTab([], "/applications", applicationRoutes);
    const firstDraftTabs = openWorkspaceTab(listTabs, "/applications/engineering/application_draft_one", applicationRoutes);
    const secondDraftTabs = openWorkspaceTab(firstDraftTabs, "/applications/engineering/application_draft_two", applicationRoutes);
    const reopenedTabs = openWorkspaceTab(secondDraftTabs, "/applications/engineering/application_draft_one", applicationRoutes);

    expect(reopenedTabs.map(tab => tab.path)).toEqual([
      "/",
      "/applications",
      "/applications/engineering/application_draft_one",
      "/applications/engineering/application_draft_two",
    ]);
    expect(reopenedTabs.map(tab => tab.label)).toEqual([
      "/",
      "接入中心",
      "编辑应用：application_draft_one",
      "编辑应用：application_draft_two",
    ]);
  });

  test("keeps add-draft route state in memory while saving only route paths", () => {
    const storage: Record<string, string> = {};
    const draftUser = {
      mode: "add",
      user: {
        owner: "built-in",
        name: "user_draft",
        displayName: "New User - draft",
      },
    };
    const tabs = openWorkspaceTab([], "/users/built-in/user_draft", routes, draftUser);

    expect(tabs.find(tab => tab.path === "/users/built-in/user_draft")?.locationState).toEqual(draftUser);

    saveWorkspaceTabs({
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, value: string) => {
        storage[key] = value;
      },
    } as Storage, tabs);

    const storedPayload = JSON.parse(storage[WORKSPACE_TABS_STORAGE_KEY]);
    expect(storedPayload.paths).toEqual(["/", "/users/built-in/user_draft"]);
    expect(JSON.stringify(storedPayload)).not.toContain("New User - draft");
    expect(hydrateWorkspaceTabs(storage[WORKSPACE_TABS_STORAGE_KEY], "/users", routes)
      .find(tab => tab.path === "/users/built-in/user_draft")?.locationState).toBeUndefined();
  });

  test("preserves detail labels when opening another workspace route", () => {
    const applicationRoutes = buildWorkspaceRouteItems([{
      label: "应用接入",
      children: [
        {key: "/applications", label: "接入中心", detailLabel: "编辑应用", detailPathDepth: 3, to: "/applications", matchPrefixes: ["/applications"]},
        {key: "/providers", label: "身份源中心", to: "/providers", matchPrefixes: ["/providers"]},
      ],
    }]);
    const openedTabs = openWorkspaceTab([], "/applications/engineering/portal", applicationRoutes);
    const detailTabs = updateWorkspaceTabLabel(openedTabs, {
      path: "/applications/engineering/portal",
      label: "编辑应用：AICodex Portal",
    });
    const navigatedTabs = openWorkspaceTab(detailTabs, "/providers", applicationRoutes);

    expect(navigatedTabs.find(tab => tab.path === "/applications/engineering/portal")?.label).toBe("编辑应用：AICodex Portal");
  });

  test("persists detail labels without storing draft route state", () => {
    const storage: Record<string, string> = {};
    const applicationRoutes = buildWorkspaceRouteItems([{
      label: "应用接入",
      children: [
        {key: "/applications", label: "接入中心", detailLabel: "编辑应用", detailPathDepth: 3, to: "/applications", matchPrefixes: ["/applications"]},
        {key: "/providers", label: "身份源中心", to: "/providers", matchPrefixes: ["/providers"]},
      ],
    }]);
    const openedTabs = openWorkspaceTab([], "/applications/engineering/application_draft_one", applicationRoutes, {
      mode: "add",
      application: {displayName: "Unsaved Draft"},
    });
    const detailTabs = updateWorkspaceTabLabel(openedTabs, {
      path: "/applications/engineering/application_draft_one",
      label: "编辑应用：AICodex Portal",
    });

    saveWorkspaceTabs({
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, value: string) => {
        storage[key] = value;
      },
    } as Storage, detailTabs);

    const storedPayload = JSON.parse(storage[WORKSPACE_TABS_STORAGE_KEY]);
    expect(storedPayload.paths).toEqual(["/", "/applications/engineering/application_draft_one"]);
    expect(storedPayload.details["/applications/engineering/application_draft_one"].label).toBe("编辑应用：AICodex Portal");
    expect(JSON.stringify(storedPayload)).not.toContain("Unsaved Draft");

    const restoredTabs = hydrateWorkspaceTabs(storage[WORKSPACE_TABS_STORAGE_KEY], "/providers", applicationRoutes);
    expect(restoredTabs.find(tab => tab.path === "/applications/engineering/application_draft_one")).toMatchObject({
      label: "编辑应用：AICodex Portal",
      labelSource: "detail",
      locationState: undefined,
    });
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

  test("reopening an existing route activates it without changing tab order", () => {
    const applications = openWorkspaceTab([], "/applications", routes);
    const providers = openWorkspaceTab(applications, "/providers", routes);
    const records = openWorkspaceTab(providers, "/records", routes);

    const reopenedApplications = openWorkspaceTab(records, "/applications", routes);
    const reopenedProviders = openWorkspaceTab(reopenedApplications, "/providers", routes);

    expect(reopenedApplications.map(tab => tab.path)).toEqual(["/", "/applications", "/providers", "/records"]);
    expect(reopenedProviders.map(tab => tab.path)).toEqual(["/", "/applications", "/providers", "/records"]);
  });

  test("does not open a tab for unknown or 404 routes", () => {
    const tabs = openWorkspaceTab(openWorkspaceTab([], "/applications", routes), "/404", routes);
    const unknownTabs = openWorkspaceTab(tabs, "/missing-route", routes);

    expect(tabs.map(tab => tab.path)).toEqual(["/", "/applications"]);
    expect(unknownTabs.map(tab => tab.path)).toEqual(["/", "/applications"]);
  });

  test("closes current tab by navigating to the nearest remaining tab", () => {
    const applications = openWorkspaceTab([], "/applications", routes);
    const providers = openWorkspaceTab(applications, "/providers", routes);
    const records = openWorkspaceTab(providers, "/records", routes);

    const result = closeWorkspaceTab(records, "/records", "/records");

    expect(result.tabs.map(tab => tab.path)).toEqual(["/", "/applications", "/providers"]);
    expect(result.nextPath).toBe("/providers");
  });

  test("closes current tab by preferring the right-side neighbor", () => {
    const applications = openWorkspaceTab([], "/applications", routes);
    const providers = openWorkspaceTab(applications, "/providers", routes);
    const records = openWorkspaceTab(providers, "/records", routes);

    const result = closeWorkspaceTab(records, "/applications", "/applications");

    expect(result.tabs.map(tab => tab.path)).toEqual(["/", "/providers", "/records"]);
    expect(result.nextPath).toBe("/providers");
  });

  test("closes a non-active tab without changing the active route", () => {
    const tabs = openWorkspaceTab(openWorkspaceTab([], "/applications", routes), "/providers", routes);
    const result = closeWorkspaceTab(tabs, "/applications", "/providers");

    expect(result.tabs.map(tab => tab.path)).toEqual(["/", "/providers"]);
    expect(result.nextPath).toBe("/providers");
  });

  test("closes overview as a normal non-active tab", () => {
    const tabs = openWorkspaceTab([], "/applications", routes);
    const result = closeWorkspaceTab(tabs, "/", "/applications");

    expect(result.tabs.map(tab => tab.path)).toEqual(["/applications"]);
    expect(result.nextPath).toBe("/applications");
  });

  test("closing the only overview tab reopens overview fallback", () => {
    const tabs = openWorkspaceTab([], "/", routes);
    const result = closeWorkspaceTab(tabs, "/", "/");

    expect(result.tabs.map(tab => tab.path)).toEqual(["/"]);
    expect(result.tabs[0]).toMatchObject({fixed: false, closable: true});
    expect(result.nextPath).toBe("/");
  });

  test("closes the only non-fixed tab back to overview", () => {
    const tabs = openWorkspaceTab([], "/applications", routes);
    const result = closeWorkspaceTab(tabs, "/applications", "/applications");

    expect(result.tabs.map(tab => tab.path)).toEqual(["/"]);
    expect(result.nextPath).toBe("/");
  });

  test("closes other tabs while preserving the target tab and falling back only when needed", () => {
    const applications = openWorkspaceTab([], "/applications", routes);
    const providers = openWorkspaceTab(applications, "/providers", routes);
    const records = openWorkspaceTab(providers, "/records", routes);

    const result = closeOtherWorkspaceTabs(records, "/providers");

    expect(result.tabs.map(tab => tab.path)).toEqual(["/providers"]);
    expect(result.nextPath).toBe("/providers");
  });

  test("closing other tabs from overview preserves only the normal overview tab", () => {
    const applications = openWorkspaceTab([], "/applications", routes);
    const providers = openWorkspaceTab(applications, "/providers", routes);

    const result = closeOtherWorkspaceTabs(providers, "/");

    expect(result.tabs.map(tab => tab.path)).toEqual(["/"]);
    expect(result.tabs[0]).toMatchObject({fixed: false, closable: true});
    expect(result.nextPath).toBe("/");
  });

  test("closes all tabs and reopens a normal overview fallback", () => {
    const applications = openWorkspaceTab([], "/applications", routes);
    const providers = openWorkspaceTab(applications, "/providers", routes);
    const records = openWorkspaceTab(providers, "/records", routes);

    const result = closeAllWorkspaceTabs(records);

    expect(result.tabs.map(tab => tab.path)).toEqual(["/"]);
    expect(result.nextPath).toBe("/");
    expect(result.tabs[0]).toMatchObject({fixed: false, closable: true});
  });

  test("closes tabs to the left of the context tab without treating overview as fixed", () => {
    const applications = openWorkspaceTab([], "/applications", routes);
    const providers = openWorkspaceTab(applications, "/providers", routes);
    const records = openWorkspaceTab(providers, "/records", routes);

    const result = closeWorkspaceTabsToLeft(records, "/providers", "/applications");

    expect(result.tabs.map(tab => tab.path)).toEqual(["/providers", "/records"]);
    expect(result.nextPath).toBe("/providers");
  });

  test("closes tabs to the right of the context tab and preserves active route when still open", () => {
    const applications = openWorkspaceTab([], "/applications", routes);
    const providers = openWorkspaceTab(applications, "/providers", routes);
    const records = openWorkspaceTab(providers, "/records", routes);

    const result = closeWorkspaceTabsToRight(records, "/providers", "/");

    expect(result.tabs.map(tab => tab.path)).toEqual(["/", "/applications", "/providers"]);
    expect(result.nextPath).toBe("/");
  });

  test("keeps visible tabs in opening order and moves extra pages into overflow", () => {
    const tabs = routes
      .filter(route => route.path !== "/")
      .reduce<ReturnType<typeof openWorkspaceTab>>((currentTabs, route) => openWorkspaceTab(currentTabs, route.path, routes), []);

    const allFit = getVisibleWorkspaceTabs(tabs, "/records", 10);
    expect(allFit.visibleTabs.map(tab => tab.path)).toEqual([
      "/",
      "/applications",
      "/providers",
      "/records",
      "/organizations",
      "/users",
      "/agents",
      "/servers",
      "/entries",
      "/rules",
    ]);

    const visible = getVisibleWorkspaceTabs(tabs, "/rules", WORKSPACE_TABS_MAX_VISIBLE);

    expect(visible.visibleTabs).toHaveLength(WORKSPACE_TABS_MAX_VISIBLE);
    expect(visible.visibleTabs.map(tab => tab.path)).toEqual([
      "/",
      "/applications",
      "/providers",
      "/records",
      "/organizations",
      "/users",
      "/agents",
      "/servers",
    ]);
    expect(visible.overflowTabs.map(tab => tab.path)).toEqual(["/entries", "/rules"]);

    const singleVisible = getVisibleWorkspaceTabs(tabs, "/rules", 1);
    expect(singleVisible.visibleTabs.map(tab => tab.path)).toEqual(["/"]);
    expect(singleVisible.overflowTabs.map(tab => tab.path)).toContain("/rules");
  });

  test("calculates visible tab capacity from available strip width", () => {
    expect(calculateWorkspaceTabsCapacity(1200, 10)).toBe(10);
    expect(calculateWorkspaceTabsCapacity(720, 10)).toBe(6);
    expect(calculateWorkspaceTabsCapacity(80, 10)).toBe(1);
    expect(calculateWorkspaceTabsCapacity(1200, 0)).toBe(1);
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
