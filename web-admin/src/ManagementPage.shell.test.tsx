/* eslint-env jest */
import React from "react";
import {expect, jest} from "@jest/globals";
import {cleanup, render} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import i18next from "i18next";
import ManagementPage from "./ManagementPage";
import * as Conf from "./Conf";
import * as Setting from "./Setting";
import en from "./locales/en/data.json";
import zh from "./locales/zh/data.json";

const mockMenuProps: Array<Record<string, unknown>> = [];

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
jest.mock("./OrganizationEditPage", () => () => <main data-testid="organization-edit-page" />);
jest.mock("./ApplicationListPage", () => () => <main data-testid="application-list-page" />);
jest.mock("./ApplicationEditPage", () => () => <main data-testid="application-edit-page" />);
jest.mock("./ProviderEditPage", () => () => <main data-testid="provider-edit-page" />);
jest.mock("./UserEditPage", () => () => <main data-testid="user-edit-page" />);
jest.mock("./common/Editor", () => () => <pre data-testid="editor" />);
jest.mock("./common/WorkspaceTabs", () => () => <div className="admin-workspace-tabs-shell" data-testid="workspace-tabs" />);
jest.mock("./common/notifaction/EnableMfaNotification", () => () => null);
jest.mock("./common/select/LanguageSelect", () => () => <span data-testid="language-select" />);
jest.mock("./common/select/ThemeSelect", () => () => <span data-testid="theme-select" />);
jest.mock("./common/select/OrganizationSelect", () => () => <span data-testid="organization-select" />);
jest.mock("./common/OpenTour", () => () => <span data-testid="open-tour" />);
jest.mock("./account/AccountAvatar", () => () => <span data-testid="account-avatar" />);
jest.mock("./auth/Web3Auth", () => ({clearWeb3AuthToken: () => {}}));
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

function renderShell({path = "/", isMobile = false}: {path?: string; isMobile?: boolean} = {}) {
  window.history.pushState({}, "", path);
  jest.spyOn(Setting, "isMobile").mockReturnValue(isMobile);

  return render(
    <MemoryRouter initialEntries={[path]}>
      <ManagementPage
        account={account}
        application={undefined}
        uri={path}
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
    </MemoryRouter>
  );
}

describe("ManagementPage admin shell sidebar", () => {
  beforeEach(async() => {
    localStorage.clear();
    mockMenuProps.length = 0;
    jest.restoreAllMocks();
    await useTestLanguage("zh");
  });

  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
    localStorage.clear();
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
  });

  test("wraps legacy card routes in the same route scroll container", () => {
    const view = renderShell({path: "/applications"});
    const routeScroll = view.container.querySelector(".admin-shell-route-scroll") as HTMLElement;

    expect(routeScroll).not.toBeNull();
    expect(routeScroll.classList.contains("admin-shell-route-scroll-without-card")).toBe(false);
    expect(routeScroll.querySelector(".content-warp-card")).not.toBeNull();
    expect(routeScroll.contains(view.getByTestId("application-list-page"))).toBe(true);
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

  test("keeps mobile drawer behavior independent from persisted desktop collapsed state", () => {
    localStorage.setItem("adminShellSidebarCollapsed", "true");

    const view = renderShell({isMobile: true});

    expect(view.container.querySelector(".admin-shell-sider")).toBeNull();
    expect(view.queryByRole("button", {name: "展开侧边栏"})).toBeNull();
    expect(view.getByRole("button", {name: Conf.AdminCenterName})).not.toBeNull();
  });
});
