/* eslint-env jest */
import React from "react";
import {expect, jest} from "@jest/globals";
import fs from "fs";
import path from "path";
import {act, cleanup, render} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import i18next from "i18next";
import ManagementPage from "./ManagementPage";
import {WORKSPACE_TAB_LABEL_UPDATE_EVENT} from "./common/workspaceTabState";
import * as Conf from "./Conf";
import * as Setting from "./Setting";
import en from "./locales/en/data.json";
import zh from "./locales/zh/data.json";
import {readLessWithImports} from "./testUtils/less";
import {type ConsoleCallSpy, getReactActWarnings} from "./testUtils/reactAsyncWarnings";
import type {LegacyAny} from "./types/legacyPage";

const mockMenuProps: Array<Record<string, unknown>> = [];
const mockWorkspaceTabsProps: Array<{
  tabs?: Array<{path: string; label: string}>;
}> = [];
const mockOrganizationEditLifecycle = {
  mounts: 0,
  unmounts: 0,
};

jest.mock("antd", () => {
  const React = require("react");
  const actual = require("@jest/globals").jest.requireActual("antd");

  return {
    ...actual,
    Menu: (props: Record<string, unknown>) => {
      mockMenuProps.push(props);

      return <nav data-testid="admin-shell-menu" data-inline-collapsed={String(props.inlineCollapsed)} />;
    },
  };
});

jest.mock("./IdentityConsoleOverview", () => () => <main data-testid="identity-overview" />);
jest.mock("./WecomOrganizationSyncPage", () => () => <main data-testid="wecom-org-sync-page" />);
jest.mock("./DingTalkOrganizationSyncPage", () => () => <main data-testid="dingtalk-org-sync-page" />);
jest.mock("./SystemInfo", () => () => <main data-testid="system-info-page" />);
jest.mock("./ServerStorePage", () => () => <main data-testid="server-store-page" />);
jest.mock("./OrganizationTreeOperationsPage", () => () => <main data-testid="organization-tree-operations-page" />);
jest.mock("./OrganizationEditPage", () => {
  const React = require("react");

  return function OrganizationEditPageMock() {
    React.useEffect(() => {
      mockOrganizationEditLifecycle.mounts += 1;
      return () => {
        mockOrganizationEditLifecycle.unmounts += 1;
      };
    }, []);

    return <main data-testid="organization-edit-page" />;
  };
});
jest.mock("./GroupEditPage", () => () => <main data-testid="group-edit-page" />);
jest.mock("./RoleEditPage", () => () => <main data-testid="role-edit-page" />);
jest.mock("./PermissionEditPage", () => () => <main data-testid="permission-edit-page" />);
jest.mock("./ApplicationListPage", () => () => <main data-testid="application-list-page" />);
jest.mock("./ApplicationEditPage", () => () => <main data-testid="application-edit-page" />);
jest.mock("./ProviderEditPage", () => () => <main data-testid="provider-edit-page" />);
jest.mock("./CertEditPage", () => () => <main data-testid="cert-edit-page" />);
jest.mock("./KeyEditPage", () => () => <main data-testid="key-edit-page" />);
jest.mock("./UserEditPage", () => () => <main data-testid="user-edit-page" />);
jest.mock("./InvitationEditPage", () => () => <main data-testid="invitation-edit-page" />);
jest.mock("./UserEditVisualReviewPage", () => () => <main data-testid="user-edit-visual-review-page" />);
jest.mock("./SyncerEditPage", () => () => <main data-testid="syncer-edit-page" />);
jest.mock("./common/Editor", () => () => <pre data-testid="editor" />);
jest.mock("./common/WorkspaceTabs", () => (props: {tabs?: Array<{path: string; label: string}>}) => {
  mockWorkspaceTabsProps.push(props);

  return <div className="admin-workspace-tabs-shell" data-testid="workspace-tabs" />;
});
jest.mock("./common/notifaction/EnableMfaNotification", () => () => null);
jest.mock("./common/select/LanguageSelect", () => () => <span data-testid="language-select" />);
jest.mock("./common/select/ThemeSelect", () => () => <span data-testid="theme-select" />);
jest.mock("./common/select/OrganizationSelect", () => () => <span data-testid="organization-select" />);
jest.mock("./common/OpenTour", () => () => <span data-testid="open-tour" />);
jest.mock("./account/AccountAvatar", () => () => <span data-testid="account-avatar" />);
jest.mock("antd/es/layout/layout", () => ({
  Content: ({children, ...props}: {children?: React.ReactNode}) => <main {...props}>{children}</main>,
  Header: ({children, ...props}: {children?: React.ReactNode}) => <header {...props}>{children}</header>,
}));
jest.mock("antd/es/layout/Sider", () => function SiderMock({children, width, style, ...props}: {children?: React.ReactNode; width?: number; style?: React.CSSProperties}) {
  return <aside {...props} data-width={width} style={style}>{children}</aside>;
});
jest.mock("antd/es/upload/Dragger", () => function DraggerMock({children}: {children?: React.ReactNode}) {
  return <div data-testid="upload-dragger">{children}</div>;
});
jest.mock("antd-token-previewer/es/ColorPanel", () => function ColorPanelMock() {
  return <div data-testid="color-panel" />;
});

const {fireEvent} = require("@testing-library/react") as {
  fireEvent: {
    click: (element: Element) => void;
  };
};
const {createMemoryHistory} = require("history") as {
  createMemoryHistory: (options: LegacyAny) => LegacyAny;
};
const {Router} = require("react-router-dom") as {
  Router: React.ComponentType<LegacyAny>;
};

const account = {
  owner: "built-in",
  name: "admin",
  displayName: "Admin",
  avatar: "",
  isAdmin: true,
  organization: {
    name: "built-in",
    displayName: "AICodex",
    languages: ["zh", "en"],
    navItems: ["all"],
    userNavItems: [],
    widgetItems: [],
    enableTour: false,
    logo: "",
    logoDark: "",
  },
};

async function useTestLanguage(language: string) {
  if (!i18next.isInitialized) {
    await i18next.init({
      lng: language,
      fallbackLng: "en",
      resources: {en, zh},
      ns: Object.keys(en),
      keySeparator: false,
    });
    return;
  }

  i18next.addResourceBundle("en", "general", en.general, true, true);
  i18next.addResourceBundle("zh", "general", zh.general, true, true);
  await i18next.changeLanguage(language);
}

function renderShell({
  path = "/",
  isMobile = false,
  themeAlgorithm = ["default"],
  accountOverride = account,
  accountLoading = false,
}: {
  path?: string;
  isMobile?: boolean;
  themeAlgorithm?: string[];
  accountOverride?: typeof account | null;
  accountLoading?: boolean;
} = {}) {
  window.history.pushState({}, "", path);
  jest.spyOn(Setting, "isMobile").mockReturnValue(isMobile);
  const shellAccount = accountLoading ? undefined : accountOverride;

  return render(
    <MemoryRouter initialEntries={[path]}>
      <ManagementPage
        account={shellAccount}
        application={undefined}
        uri={path}
        themeData={{colorPrimary: "#1677ff"}}
        themeAlgorithm={themeAlgorithm}
        selectedMenuKey="/"
        requiredEnableMfa={false}
        menuVisible={false}
        logo="/logo.png"
        onChangeTheme={jest.fn()}
        onClick={jest.fn()}
        onUpdateAccount={jest.fn()}
        onfinish={jest.fn()}
        openAiAssistant={jest.fn()}
        setLogoAndThemeAlgorithm={jest.fn()}
        setLogoutState={jest.fn()}
      />
    </MemoryRouter>
  );
}

function readCssRuleBlock(source: string, selector: string) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return source.match(new RegExp(`${escapedSelector}\\s*\\{([\\s\\S]*?)\\}`))?.[1] ?? "";
}

const readAppLess = (): string => readLessWithImports(path.join(__dirname, "App.less"));

describe("ManagementPage admin shell sidebar", () => {
  let consoleErrorSpy: ConsoleCallSpy;

  beforeEach(async() => {
    localStorage.clear();
    mockMenuProps.length = 0;
    mockWorkspaceTabsProps.length = 0;
    mockOrganizationEditLifecycle.mounts = 0;
    mockOrganizationEditLifecycle.unmounts = 0;
    jest.restoreAllMocks();
    await useTestLanguage("zh");
    consoleErrorSpy = jest.spyOn(console, "error") as unknown as ConsoleCallSpy;
  });

  afterEach(() => {
    cleanup();
    const actWarnings = getReactActWarnings(consoleErrorSpy.mock.calls);
    consoleErrorSpy.mockRestore();
    jest.restoreAllMocks();
    localStorage.clear();
    expect(actWarnings).toEqual([]);
  });

  test("renders desktop sidebar at the narrower expanded width by default", () => {
    const view = renderShell();
    const sider = view.container.querySelector(".admin-shell-sider") as HTMLElement;

    expect(sider).not.toBeNull();
    expect(sider.getAttribute("data-sidebar-state")).toBe("expanded");
    expect(sider.style.width).toBe("224px");
    expect(view.getByRole("button", {name: "收起侧边栏"})).not.toBeNull();
    expect(view.container.querySelector(".admin-shell-header .admin-shell-sidebar-toggle")).toBeNull();
    expect(view.container.querySelector(".admin-shell-sider .admin-shell-sidebar-toggle")).not.toBeNull();
    expect(view.getByText("AICodex Admin")).not.toBeNull();
    expect(view.getByText("认证中心")).not.toBeNull();
    expect(view.container.querySelector(".admin-shell-entry")).toBeNull();
    expect((view.container.querySelector(".admin-shell-content") as HTMLElement).style.minWidth).toBe("0");
    expect(view.container.querySelector(".admin-workspace-tabs-shell")).not.toBeNull();
  });

  test("uses compact menu rows and a clear selected location in the sidebar", () => {
    const appLess = readAppLess();

    expect(appLess).toMatch(/\.admin-shell-sider \.ant-menu-item,[\s\S]*height:\s*36px;/);
    expect(appLess).toMatch(/\.admin-shell-sider \.ant-menu-item-selected \{[\s\S]*box-shadow:\s*inset 3px 0 0 var\(--admin-shell-icon-color/);
    expect(appLess).toMatch(/\.admin-shell-sider \.ant-menu-submenu-arrow \{[\s\S]*opacity:\s*0\.65;/);
    expect(appLess).toMatch(/\.admin-shell-sidebar-toggle-row \{[\s\S]*justify-content:\s*center;/);
  });

  test("keeps workspace tabs outside the route scroll container", () => {
    const view = renderShell();
    const shellContent = view.container.querySelector(".admin-shell-content") as HTMLElement;
    const routeScroll = view.container.querySelector(".admin-shell-route-scroll") as HTMLElement;

    expect(routeScroll).not.toBeNull();
    expect(routeScroll.classList.contains("admin-shell-route-scroll-without-card")).toBe(true);
    expect(routeScroll.contains(view.getByTestId("identity-overview"))).toBe(true);
    expect(routeScroll.contains(view.getByTestId("workspace-tabs"))).toBe(false);
    expect(Array.from(shellContent.children).map(element => element.className)).toEqual([
      "admin-workspace-tabs-shell",
      "admin-shell-route-scroll admin-shell-route-scroll-without-card",
    ]);
    expect(shellContent.classList.contains("admin-shell-content-without-card-route")).toBe(false);
  });

  test("shows route loading state instead of a blank content area while account is loading", () => {
    const view = renderShell({path: "/application-usage-access", accountLoading: true});
    const routeScroll = view.container.querySelector(".admin-shell-route-scroll") as HTMLElement;

    expect(routeScroll).not.toBeNull();
    expect(routeScroll.textContent).toMatch(/加载中|Loading/);
    expect(routeScroll.textContent?.trim()).not.toBe("");
  });

  test("updates workspace tab labels from page detail events", async() => {
    renderShell({path: "/groups/engineering/group-main"});
    await act(async() => {
      await Promise.resolve();
    });

    act(() => {
      window.dispatchEvent(new CustomEvent(WORKSPACE_TAB_LABEL_UPDATE_EVENT, {
        detail: {
          path: "/groups/engineering/group-main",
          label: "群组：湖北销售",
        },
      }));
    });

    const latestTabs = mockWorkspaceTabsProps.at(-1)?.tabs ?? [];
    expect(latestTabs.find(tab => tab.path === "/groups/engineering/group-main")?.label).toBe("群组：湖北销售");
  });

  test("wraps legacy card routes in the same route scroll container", () => {
    const view = renderShell({path: "/applications"});
    const routeScroll = view.container.querySelector(".admin-shell-route-scroll") as HTMLElement;

    expect(routeScroll).not.toBeNull();
    expect(routeScroll.classList.contains("admin-shell-route-scroll-without-card")).toBe(false);
    expect((view.container.querySelector(".admin-shell-content") as HTMLElement).classList.contains("admin-shell-content-without-card-route")).toBe(false);
    expect(routeScroll.querySelector(".content-warp-card")).not.toBeNull();
    expect(routeScroll.contains(view.getByTestId("application-list-page"))).toBe(true);
    expect(routeScroll.contains(view.getByTestId("workspace-tabs"))).toBe(false);
  });

  test("legacy card route list roots fill the card body like cardless routes", () => {
    const appLess = readAppLess();

    expect(appLess).toMatch(/\.admin-shell-route-scroll > \.content-warp-card > \.ant-card-body > \.base-list-page-route-root \{[\s\S]*display:\s*flex/);
    expect(appLess).toMatch(/\.admin-shell-route-scroll > \.content-warp-card > \.ant-card-body > \.base-list-page-route-root \{[\s\S]*flex:\s*1 1 auto/);
    expect(appLess).toMatch(/\.admin-shell-route-scroll > \.content-warp-card > \.ant-card-body > \.base-list-page-route-root \{[\s\S]*min-height:\s*0/);
  });

  test("keeps large edit pages in the cardless internal scroll container", () => {
    const editRoutes = [
      {path: "/organizations/built-in", testId: "organization-edit-page"},
      {path: "/groups/built-in/group-main", testId: "group-edit-page"},
      {path: "/users/built-in/admin", testId: "user-edit-page"},
      {path: "/roles/built-in/admin-role", testId: "role-edit-page"},
      {path: "/permissions/built-in/permission-main", testId: "permission-edit-page"},
      {path: "/applications/built-in/app-built-in", testId: "application-edit-page"},
      {path: "/providers/built-in/provider-built-in", testId: "provider-edit-page"},
      {path: "/certs/built-in/cert-built-in", testId: "cert-edit-page"},
      {path: "/keys/built-in/key-built-in", testId: "key-edit-page"},
      {path: "/syncers/syncer-built-in", testId: "syncer-edit-page"},
      {path: "/invitations/built-in/invite-main", testId: "invitation-edit-page"},
    ];

    for (const editRoute of editRoutes) {
      const view = renderShell({path: editRoute.path});
      const routeScroll = view.container.querySelector(".admin-shell-route-scroll") as HTMLElement;

      expect(routeScroll).not.toBeNull();
      expect(routeScroll.classList.contains("admin-shell-route-scroll-without-card")).toBe(true);
      expect(routeScroll.querySelector(".content-warp-card")).toBeNull();
      expect(routeScroll.contains(view.getByTestId(editRoute.testId))).toBe(true);
      expect(routeScroll.contains(view.getByTestId("workspace-tabs"))).toBe(false);
      view.unmount();
    }
  });

  test("remounts route content when switching between two records of the same edit route", () => {
    const history = createMemoryHistory({initialEntries: ["/organizations/feishu6091"]});
    window.history.pushState({}, "", "/organizations/feishu6091");
    jest.spyOn(Setting, "isMobile").mockReturnValue(false);
    const view = render(
      <Router history={history}>
        <ManagementPage
          account={account}
          application={undefined}
          uri="/organizations/feishu6091"
          themeData={{colorPrimary: "#1677ff"}}
          themeAlgorithm={["default"]}
          selectedMenuKey="/"
          requiredEnableMfa={false}
          menuVisible={false}
          logo="/logo.png"
          onChangeTheme={jest.fn()}
          onClick={jest.fn()}
          onUpdateAccount={jest.fn()}
          onfinish={jest.fn()}
          openAiAssistant={jest.fn()}
          setLogoAndThemeAlgorithm={jest.fn()}
          setLogoutState={jest.fn()}
        />
      </Router>
    );

    expect(view.getByTestId("organization-edit-page")).not.toBeNull();
    expect(mockOrganizationEditLifecycle.mounts).toBe(1);
    expect(mockOrganizationEditLifecycle.unmounts).toBe(0);

    act(() => {
      history.push("/organizations/dingding6091");
    });
    window.history.pushState({}, "", "/organizations/dingding6091");
    view.rerender(
      <Router history={history}>
        <ManagementPage
          account={account}
          application={undefined}
          uri="/organizations/dingding6091"
          themeData={{colorPrimary: "#1677ff"}}
          themeAlgorithm={["default"]}
          selectedMenuKey="/"
          requiredEnableMfa={false}
          menuVisible={false}
          logo="/logo.png"
          onChangeTheme={jest.fn()}
          onClick={jest.fn()}
          onUpdateAccount={jest.fn()}
          onfinish={jest.fn()}
          openAiAssistant={jest.fn()}
          setLogoAndThemeAlgorithm={jest.fn()}
          setLogoutState={jest.fn()}
        />
      </Router>
    );

    expect(view.getByTestId("organization-edit-page")).not.toBeNull();
    expect(mockOrganizationEditLifecycle.mounts).toBe(2);
    expect(mockOrganizationEditLifecycle.unmounts).toBe(1);
  });

  test("keeps organization sync configuration pages in the cardless internal scroll container", () => {
    const syncRoutes = [
      {path: "/wecom-org-sync", testId: "wecom-org-sync-page"},
      {path: "/dingtalk-org-sync", testId: "dingtalk-org-sync-page"},
    ];

    for (const syncRoute of syncRoutes) {
      const view = renderShell({path: syncRoute.path});
      const routeScroll = view.container.querySelector(".admin-shell-route-scroll") as HTMLElement;

      expect(routeScroll).not.toBeNull();
      expect(routeScroll.classList.contains("admin-shell-route-scroll-without-card")).toBe(true);
      expect((view.container.querySelector(".admin-shell-content") as HTMLElement).classList.contains("admin-shell-content-without-card-route")).toBe(false);
      expect(routeScroll.querySelector(".content-warp-card")).toBeNull();
      expect(routeScroll.contains(view.getByTestId(syncRoute.testId))).toBe(true);
      expect(routeScroll.contains(view.getByTestId("workspace-tabs"))).toBe(false);
      view.unmount();
    }
  });

  test("keeps system information in the cardless internal scroll container", () => {
    const view = renderShell({path: "/sysinfo"});
    const routeScroll = view.container.querySelector(".admin-shell-route-scroll") as HTMLElement;

    expect(routeScroll).not.toBeNull();
    expect(routeScroll.classList.contains("admin-shell-route-scroll-without-card")).toBe(true);
    expect(routeScroll.querySelector(".content-warp-card")).toBeNull();
    expect(routeScroll.contains(view.getByTestId("system-info-page"))).toBe(true);
    expect(routeScroll.contains(view.getByTestId("workspace-tabs"))).toBe(false);
  });

  test("keeps MCP Store in the cardless internal scroll container", () => {
    const view = renderShell({path: "/server-store"});
    const routeScroll = view.container.querySelector(".admin-shell-route-scroll") as HTMLElement;

    expect(routeScroll).not.toBeNull();
    expect(routeScroll.classList.contains("admin-shell-route-scroll-without-card")).toBe(true);
    expect(routeScroll.querySelector(".content-warp-card")).toBeNull();
    expect(routeScroll.contains(view.getByTestId("server-store-page"))).toBe(true);
    expect(routeScroll.contains(view.getByTestId("workspace-tabs"))).toBe(false);
  });

  test("keeps organization tree operations in the cardless diagnostic route container", () => {
    const view = renderShell({path: "/organization-tree-operations"});
    const routeScroll = view.container.querySelector(".admin-shell-route-scroll") as HTMLElement;

    expect(routeScroll).not.toBeNull();
    expect(routeScroll.classList.contains("admin-shell-route-scroll-without-card")).toBe(true);
    expect(routeScroll.querySelector(".content-warp-card")).toBeNull();
    expect(routeScroll.contains(view.getByTestId("organization-tree-operations-page"))).toBe(true);
    expect(routeScroll.contains(view.getByTestId("workspace-tabs"))).toBe(false);
  });

  test("collapses desktop sidebar, hides menu text through collapsed state, and persists preference", () => {
    const view = renderShell();

    fireEvent.click(view.getByRole("button", {name: "收起侧边栏"}));

    const sider = view.container.querySelector(".admin-shell-sider") as HTMLElement;
    expect(sider.getAttribute("data-sidebar-state")).toBe("collapsed");
    expect(sider.classList.contains("admin-shell-sider-collapsed")).toBe(true);
    expect(sider.style.width).toBe("72px");
    expect(localStorage.getItem("adminShellSidebarCollapsed")).toBe("true");
    expect(view.getByRole("button", {name: "展开侧边栏"})).not.toBeNull();
    expect(view.container.querySelector(".admin-shell-header .admin-shell-sidebar-toggle")).toBeNull();
    expect(view.container.querySelector(".admin-shell-sider .admin-shell-sidebar-toggle")).not.toBeNull();
    expect(view.getByText("AICodex Admin")).not.toBeNull();
    expect(view.getByText("认证中心")).not.toBeNull();
  });

  test("restores desktop collapsed state from localStorage on refresh", () => {
    localStorage.setItem("adminShellSidebarCollapsed", "true");

    const view = renderShell();
    const sider = view.container.querySelector(".admin-shell-sider") as HTMLElement;

    expect(sider.getAttribute("data-sidebar-state")).toBe("collapsed");
    expect(sider.style.width).toBe("72px");
    expect(view.getByRole("button", {name: "展开侧边栏"})).not.toBeNull();
    expect(view.getByText("AICodex Admin")).not.toBeNull();
    expect(view.getByText("认证中心")).not.toBeNull();
  });

  test("lets AntD manage collapsed submenu popup state instead of forcing empty openKeys", () => {
    const view = renderShell();

    fireEvent.click(view.getByRole("button", {name: "收起侧边栏"}));

    const collapsedDesktopMenuProps = mockMenuProps
      .filter(props => props.mode === "inline" && props.inlineCollapsed === true)
      .at(-1);

    expect(collapsedDesktopMenuProps).toBeDefined();
    expect(collapsedDesktopMenuProps?.openKeys).toBeUndefined();
    expect(collapsedDesktopMenuProps?.onOpenChange).toBeUndefined();
  });

  test("does not attach tooltips to entries shown in collapsed submenu popups", () => {
    renderShell();

    const desktopMenuProps = mockMenuProps
      .filter(props => props.mode === "inline" && props.inlineCollapsed === false)
      .at(-1);
    const menuItems = desktopMenuProps?.items as Array<{key: string; title?: string; children?: Array<{key: string; title?: string}>}>;
    const gatewayGroup = menuItems.find(item => item.key === "/llm-ai-gateway");

    expect(gatewayGroup?.children?.find(item => item.key === "/agents")?.title).toBeUndefined();
  });

  test("keeps mobile drawer behavior independent from persisted desktop collapsed state", () => {
    localStorage.setItem("adminShellSidebarCollapsed", "true");

    const view = renderShell({isMobile: true});

    expect(view.container.querySelector(".admin-shell-sider")).toBeNull();
    expect(view.queryByRole("button", {name: "展开侧边栏"})).toBeNull();
    expect(view.getByRole("button", {name: Conf.AdminCenterName})).not.toBeNull();
  });

  test("uses compact navigation on narrow viewport even when user agent is desktop", () => {
    const originalInnerWidth = window.innerWidth;
    Object.defineProperty(window, "innerWidth", {configurable: true, writable: true, value: 390});

    try {
      const view = renderShell({isMobile: false});

      expect(view.container.querySelector(".admin-shell-sider")).toBeNull();
      expect(view.queryByRole("button", {name: "展开侧边栏"})).toBeNull();
      expect(view.getByRole("button", {name: Conf.AdminCenterName})).not.toBeNull();
      expect((view.container.querySelector(".admin-shell-content") as HTMLElement).style.minWidth).toBe("0");
    } finally {
      Object.defineProperty(window, "innerWidth", {configurable: true, writable: true, value: originalInnerWidth});
    }
  });

  test("adds explicit dark theme classes to the shell header and body", () => {
    const view = renderShell({themeAlgorithm: ["dark"]});
    const header = view.container.querySelector(".admin-shell-header") as HTMLElement;
    const body = view.container.querySelector(".admin-shell-body") as HTMLElement;

    expect(header.classList.contains("admin-shell-theme-dark")).toBe(true);
    expect(body.classList.contains("admin-shell-theme-dark")).toBe(true);
    expect(header.classList.contains("admin-shell-theme-light")).toBe(false);
    expect(body.classList.contains("admin-shell-theme-light")).toBe(false);
  });

  test("App mirrors the active admin shell theme class onto document.body for portal surfaces", () => {
    const appJs = fs.readFileSync(path.join(__dirname, "App.tsx"), "utf8") as string;

    expect(appJs).toMatch(/document\.body\.classList\.remove\("admin-shell-theme-light",\s*"admin-shell-theme-dark"\)/);
    expect(appJs).toMatch(/document\.body\.classList\.add\(this\.state\.themeAlgorithm\.includes\("dark"\) \? "admin-shell-theme-dark" : "admin-shell-theme-light"\)/);
  });

  test("shell header background overrides the default Ant Design layout header color", () => {
    const appLess = readAppLess();

    expect(appLess).toMatch(/\.admin-shell-header \{[\s\S]*background:\s*var\(--admin-shell-header-bg,\s*#fff\)\s*!important/);
  });

  test("header organization select uses shell theme tokens instead of Ant Design default input colors", () => {
    const appLess = readAppLess();

    expect(appLess).toMatch(/\.admin-shell-header-right \.org-select \.ant-select-selector \{[\s\S]*background:\s*var\(--admin-shell-surface-soft-bg/);
    expect(appLess).toMatch(/\.admin-shell-header-right \.org-select \.ant-select-selector \{[\s\S]*border-color:\s*var\(--admin-shell-border-strong/);
    expect(appLess).toMatch(/\.admin-shell-header-right \.org-select \.ant-select-selection-item,[\s\S]*\.admin-shell-header-right \.org-select \.ant-select-arrow \{[\s\S]*color:\s*var\(--admin-shell-text-primary/);
  });

  test("organization sync pages only clip horizontal overflow without creating a nested vertical scroller", () => {
    const appLess = readAppLess();
    const organizationSyncPageBlock = readCssRuleBlock(appLess, ".organization-sync-page");

    expect(organizationSyncPageBlock).toMatch(/overflow-x:\s*clip/);
    expect(organizationSyncPageBlock).not.toMatch(/overflow-x:\s*hidden/);
  });

  test("organization sync form controls and run tables use shell theme tokens", () => {
    const appLess = readAppLess();

    expect(appLess).toMatch(/\.organization-sync-page \.ant-input,[\s\S]*\.organization-sync-page \.ant-input-affix-wrapper,[\s\S]*\.organization-sync-page \.ant-select \.ant-select-selector \{[\s\S]*background:\s*var\(--admin-shell-surface-soft-bg/);
    expect(appLess).toMatch(/\.organization-sync-page \.ant-input,[\s\S]*\.organization-sync-page \.ant-input-affix-wrapper,[\s\S]*\.organization-sync-page \.ant-select \.ant-select-selector \{[\s\S]*border-color:\s*var\(--admin-shell-border-strong/);
    expect(appLess).toMatch(/\.organization-sync-page \.ant-table,[\s\S]*\.organization-sync-page \.ant-table-body \{[\s\S]*background:\s*var\(--admin-shell-surface-bg/);
    expect(appLess).toMatch(/\.organization-sync-page \.ant-table\.ant-table-middle \.ant-table-tbody > tr > td \{[\s\S]*background:\s*var\(--admin-shell-surface-bg/);
  });

  test("workspace tabs shell clips horizontally without becoming a vertical scroll container", () => {
    const appLess = readAppLess();
    const workspaceTabsShellBlock = readCssRuleBlock(appLess, ".admin-workspace-tabs-shell");

    expect(workspaceTabsShellBlock).toMatch(/overflow-x:\s*clip/);
    expect(appLess).toMatch(/\.admin-workspace-tabs-scroll-viewport \{[\s\S]*overflow-x:\s*auto/);
    expect(workspaceTabsShellBlock).not.toMatch(/overflow-x:\s*hidden/);
  });

  test("workspace tabs use compact browser-like density", () => {
    const appLess = readAppLess();
    const desktopBlock = appLess.match(/\.admin-workspace-tabs-desktop \{([\s\S]*?)\}/)?.[1] ?? "";
    const tabBlock = appLess.match(/\.admin-workspace-tab \{([\s\S]*?)\}/)?.[1] ?? "";
    const tabLabelBlock = appLess.match(/\.admin-workspace-tab-label \{([\s\S]*?)\}/)?.[1] ?? "";
    const closeBlock = appLess.match(/\.admin-workspace-tab-close \{([\s\S]*?)\}/)?.[1] ?? "";
    const menuBlock = appLess.match(/\.admin-workspace-tabs-shell \.admin-workspace-tabs-close-menu \{([\s\S]*?)\}/)?.[1] ?? "";

    expect(desktopBlock).toContain("min-height: 32px");
    expect(tabBlock).toContain("height: 26px");
    expect(tabLabelBlock).toContain("font-size: 12px");
    expect(closeBlock).toContain("width: 18px");
    expect(closeBlock).toContain("height: 18px");
    expect(menuBlock).toContain("top: 4px");
    expect(menuBlock).toContain("height: 26px");
  });

  test("shell scroll containers use theme scrollbar tokens instead of browser default colors", () => {
    const appLess = readAppLess();

    expect(appLess).toMatch(/\.admin-shell-sider \.ant-menu,[\s\S]*\.admin-shell-route-scroll,[\s\S]*\.admin-page-scroll-shell-body,[\s\S]*\.session-id-drawer \.ant-drawer-body \{[\s\S]*scrollbar-color:\s*var\(--admin-shell-scrollbar-thumb/);
    expect(appLess).toMatch(/\.admin-shell-route-scroll::-webkit-scrollbar-thumb,[\s\S]*\.admin-page-scroll-shell-body::-webkit-scrollbar-thumb,[\s\S]*\.session-id-drawer \.ant-drawer-body::-webkit-scrollbar-thumb \{[\s\S]*background:\s*var\(--admin-shell-scrollbar-thumb/);
    expect(appLess).toMatch(/\.admin-shell-route-scroll::-webkit-scrollbar-track,[\s\S]*background:\s*transparent/);
  });

  test("route and page shells consume one shared spacing token set", () => {
    const appLess = readAppLess();
    const routeScrollBlock = appLess.match(/\.admin-shell-route-scroll \{([\s\S]*?)\}/)?.[1] ?? "";
    const withoutCardBlock = appLess.match(/\.admin-shell-route-scroll-without-card \{([\s\S]*?)\}/)?.[1] ?? "";
    const baseListRootBlock = appLess.match(/\.admin-shell-route-scroll-without-card > \.base-list-page-route-root,[\s\S]*?\.admin-shell-route-scroll > \.content-warp-card > \.ant-card-body > \.base-list-page-route-root \{([\s\S]*?)\}/)?.[1] ?? "";
    const cardBlock = appLess.match(/\.admin-shell-route-scroll > \.content-warp-card \{([\s\S]*?)\}/)?.[1] ?? "";
    const cardBodyBlock = appLess.match(/\.admin-shell-route-scroll > \.content-warp-card > \.ant-card-body \{([\s\S]*?)\}/)?.[1] ?? "";
    const enterpriseConsoleBlock = appLess.match(/\.enterprise-identity-console \{([\s\S]*?)\}/)?.[1] ?? "";
    const organizationConsoleBlock = appLess.match(/\.organization-identity-console \{([\s\S]*?)\}/)?.[1] ?? "";

    expect(appLess).toMatch(/--admin-route-gap-x:\s*12px;/);
    expect(appLess).toMatch(/--admin-route-gap-top:\s*8px;/);
    expect(appLess).toMatch(/--admin-route-gap-bottom:\s*12px;/);
    expect(routeScrollBlock).toContain("box-sizing: border-box;");
    expect(withoutCardBlock).toContain("padding: var(--admin-route-gap-top) var(--admin-route-gap-x) var(--admin-route-gap-bottom);");
    expect(appLess).toContain(".admin-shell-route-scroll > .content-warp-card > .ant-card-body > .base-list-page-route-root");
    expect(baseListRootBlock).toContain("display: flex;");
    expect(baseListRootBlock).toContain("flex: 1 1 auto;");
    expect(baseListRootBlock).toContain("min-height: 0;");
    expect(cardBodyBlock).toContain("padding: var(--list-page-card-padding, 24px 24px 2px);");
    expect(cardBlock).toContain("margin: var(--admin-route-gap-top) var(--admin-route-gap-x) var(--admin-route-gap-bottom);");
    expect(enterpriseConsoleBlock).toContain("padding: 0;");
    expect(organizationConsoleBlock).toContain("padding: 0;");
    expect(appLess).toMatch(/\.organization-identity-compact-list-page \{[\s\S]*flex:\s*1 1 auto;[\s\S]*min-height:\s*0;/);
    expect(appLess).toMatch(/--list-page-card-margin:\s*0;/);
    expect(appLess).toMatch(/@media[\s\S]*--admin-route-gap-x:\s*8px;[\s\S]*--admin-route-gap-top:\s*8px;[\s\S]*--admin-route-gap-bottom:\s*8px;/);
    expect(enterpriseConsoleBlock).not.toContain("padding: 12px 16px");
    expect(organizationConsoleBlock).not.toContain("padding: 12px 16px");
    expect(appLess).not.toContain("admin-shell-content-without-card-route");
    expect(withoutCardBlock).not.toContain("border-left:");
    expect(withoutCardBlock).not.toContain("box-shadow:");
  });

  test("diagnostic card pages use shell tokens for Ant Design local surfaces", () => {
    const appLess = readAppLess();
    const organizationTreePageBlock = appLess.match(/\.organization-tree-operations-page \{([\s\S]*?)\}/)?.[1] ?? "";

    expect(appLess).toMatch(/\.platform-api-mapping-page\.ant-card,[\s\S]*\.organization-tree-operations-page \.ant-card,[\s\S]*\.organization-directory-quality-remediation-panel \{[\s\S]*background:\s*var\(--admin-shell-surface-bg/);
    expect(appLess).toMatch(/\.platform-api-mapping-page \.ant-input,[\s\S]*\.organization-tree-operations-page \.ant-select \.ant-select-selector,[\s\S]*\.organization-directory-quality-page \.ant-select \.ant-select-selector \{[\s\S]*background:\s*var\(--admin-shell-surface-soft-bg/);
    expect(appLess).toMatch(/\.platform-api-mapping-page \.ant-btn-default,[\s\S]*\.organization-tree-operations-page \.ant-btn-default,[\s\S]*\.organization-directory-quality-page \.ant-btn-default \{[\s\S]*border-color:\s*var\(--admin-shell-border-strong/);
    expect(appLess).toMatch(/\.platform-api-mapping-page \.ant-table,[\s\S]*\.organization-tree-operations-page \.ant-table,[\s\S]*\.organization-directory-quality-page \.ant-table-body \{[\s\S]*background:\s*var\(--admin-shell-surface-bg/);
    expect(appLess).toMatch(/\.platform-api-mapping-page \.ant-table-thead > tr > th,[\s\S]*\.organization-directory-quality-page \.ant-table-thead > tr > th,/);
    expect(appLess).toMatch(/\.platform-api-mapping-page \.ant-table-tbody > tr > td,[\s\S]*\.organization-directory-quality-page \.ant-table-tbody > tr > td,/);
    expect(appLess).toMatch(/\.organization-tree-operations-page \.ant-segmented \{[\s\S]*background:\s*var\(--admin-shell-surface-soft-bg/);
    expect(appLess).toMatch(/\.organization-tree-operations-page \.ant-tree \{[\s\S]*background:\s*var\(--admin-shell-surface-bg/);
    expect(organizationTreePageBlock).toContain("display: flex;");
    expect(organizationTreePageBlock).toContain("flex: 1 1 auto;");
    expect(organizationTreePageBlock).toContain("min-height: 0;");
    expect(organizationTreePageBlock).toContain("gap: 12px;");
  });

  test("system information page keeps dense metrics and bounded API tables", () => {
    const appLess = readAppLess();
    const metricsGridBlock = appLess.match(/\.system-info-metrics-grid \{([\s\S]*?)\}/)?.[1] ?? "";
    const dataGridBlock = appLess.match(/\.system-info-data-grid \{([\s\S]*?)\}/)?.[1] ?? "";
    const cpuCardBodyBlock = appLess.match(/\.system-info-card-cpu > \.ant-card-body \{([\s\S]*?)\}/)?.[1] ?? "";
    const prometheusTableShellBlock = appLess.match(/\.prometheus-info-table-shell \{([\s\S]*?)\}/)?.[1] ?? "";

    expect(metricsGridBlock).toContain("\"cpu cpu cpu\"");
    expect(metricsGridBlock).toContain("\"memory disk network\"");
    expect(metricsGridBlock).toContain("grid-template-columns: repeat(3, minmax(0, 1fr));");
    expect(dataGridBlock).toContain("grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);");
    expect(cpuCardBodyBlock).toContain("grid-template-columns: repeat(4, minmax(0, 1fr));");
    expect(prometheusTableShellBlock).toContain("max-height: 320px;");
    expect(prometheusTableShellBlock).toContain("overflow: auto;");
  });
});
