/* eslint-env jest */
import React from "react";
import {expect, jest} from "@jest/globals";
import {act, cleanup, render} from "@testing-library/react";
import i18next from "i18next";
import en from "../locales/en/data.json";
import zh from "../locales/zh/data.json";

jest.mock("antd", () => {
  const React = require("react");
  return {
    Button: ({children, icon, ...props}: {children?: React.ReactNode; icon?: React.ReactNode}) => (
      <button type="button" {...props}>
        {icon}
        {children}
      </button>
    ),
    Dropdown: ({children, menu, trigger}: {children: React.ReactNode; menu?: {items?: Array<{key: string; label: React.ReactNode; className?: string; disabled?: boolean; onClick?: () => void}>}; trigger?: string[]}) => (
      <>
        {children}
        <div data-testid="workspace-tabs-dropdown-menu" data-trigger={trigger?.join(",")}>
          {menu?.items?.map(item => (
            <div
              role="menuitem"
              tabIndex={item.disabled ? -1 : 0}
              key={item.key}
              className={item.className}
              aria-disabled={item.disabled ? "true" : undefined}
              onClick={item.disabled ? undefined : item.onClick}
            >
              {item.label}
            </div>
          ))}
        </div>
      </>
    ),
    Tooltip: ({children}: {children: React.ReactNode}) => <>{children}</>,
  };
});

const {fireEvent} = require("@testing-library/react") as {
  fireEvent: {
    click: (element: Element) => void;
    scroll: (element: Element) => void;
  };
};
const WorkspaceTabs = require("./WorkspaceTabs.tsx").default as typeof import("./WorkspaceTabs").default;

const tabs = [
  {key: "/", path: "/", label: "企业认证总览", fixed: false, closable: true},
  {key: "/applications", path: "/applications", label: "接入中心", fixed: false, closable: true},
  {key: "/providers", path: "/providers", label: "身份源中心", fixed: false, closable: true},
];

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

describe("WorkspaceTabs", () => {
  let consoleErrorSpy: {mockRestore: () => void};

  beforeEach(async() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      throw new Error(args.map(item => String(item)).join(" "));
    });
    await useTestLanguage("zh");
  });

  afterEach(() => {
    cleanup();
    consoleErrorSpy.mockRestore();
  });

  test("renders desktop tabs with overview inside the scroll strip, active close affordance, and global close menu", () => {
    const onNavigate = jest.fn();
    const onClose = jest.fn();
    const onCloseCurrent = jest.fn();
    const onCloseOther = jest.fn();
    const onCloseAll = jest.fn();
    const view = render(
      <WorkspaceTabs
        tabs={tabs}
        activePath="/applications"
        isMobile={false}
        onNavigate={onNavigate}
        onClose={onClose}
        onCloseCurrent={onCloseCurrent}
        onCloseOther={onCloseOther}
        onCloseAll={onCloseAll}
      />
    );

    expect(view.container.querySelector(".admin-workspace-tabs-desktop")).not.toBeNull();
    expect(view.container.querySelector(".admin-workspace-tabs-fixed-area")).toBeNull();
    expect(view.container.querySelector(".admin-workspace-tabs-scroll-viewport")).not.toBeNull();
    expect(view.container.querySelector(".admin-workspace-tabs-scroll-strip")?.textContent).toContain("企业认证总览");
    expect(view.getByText("接入中心").closest("button")?.getAttribute("aria-current")).toBe("page");
    expect(view.getByLabelText("关闭 接入中心").className).toContain("admin-workspace-tab-close-active");
    expect(view.getByLabelText("关闭 企业认证总览").className).toContain("admin-workspace-tab-close-deferred");
    expect(view.getByRole("button", {name: "关闭工作页面"}).textContent).toBe("");

    fireEvent.click(view.getByLabelText("关闭 身份源中心"));
    expect(onClose).toHaveBeenCalledWith("/providers");

    const globalCloseMenu = view.getAllByTestId("workspace-tabs-dropdown-menu")
      .find((item: HTMLElement) => item.getAttribute("data-trigger") === "click");
    const globalCloseItems = Array.from(globalCloseMenu?.querySelectorAll("[role='menuitem']") ?? []) as HTMLDivElement[];

    expect(globalCloseItems.map(item => item.textContent)).toEqual(["关闭当前", "关闭其他", "关闭所有"]);

    fireEvent.click(globalCloseItems[0]);
    fireEvent.click(globalCloseItems[1]);
    fireEvent.click(globalCloseItems[2]);
    expect(onCloseCurrent).toHaveBeenCalledWith("/applications");
    expect(onCloseOther).toHaveBeenCalledWith("/applications");
    expect(onCloseAll).toHaveBeenCalledTimes(1);

    fireEvent.click(view.getByText("企业认证总览"));
    expect(onNavigate).toHaveBeenCalledWith("/");
  });

  test("passes draft route state back when navigating a workspace tab", () => {
    const onNavigate = jest.fn();
    const draftState = {
      mode: "add",
      user: {
        owner: "built-in",
        name: "user_draft",
      },
    };
    const view = render(
      <WorkspaceTabs
        tabs={[
          ...tabs,
          {
            key: "/users/built-in/user_draft",
            path: "/users/built-in/user_draft",
            label: "编辑：user_draft",
            fixed: false,
            closable: true,
            locationState: draftState,
          },
        ]}
        activePath="/applications"
        isMobile={false}
        onNavigate={onNavigate}
        onClose={jest.fn()}
      />
    );

    fireEvent.click(view.getByText("编辑：user_draft"));

    expect(onNavigate).toHaveBeenCalledWith("/users/built-in/user_draft", draftState);
  });

  test("renders desktop context menu with close current left right other and all actions", () => {
    const onCloseCurrent = jest.fn();
    const onCloseLeft = jest.fn();
    const onCloseRight = jest.fn();
    const onCloseOther = jest.fn();
    const onCloseAll = jest.fn();
    const view = render(
      <WorkspaceTabs
        {...({
          tabs,
          activePath: "/applications",
          isMobile: false,
          onNavigate: jest.fn(),
          onClose: jest.fn(),
          onCloseCurrent,
          onCloseLeft,
          onCloseRight,
          onCloseOther,
          onCloseAll,
        } as React.ComponentProps<typeof WorkspaceTabs> & {
          onCloseLeft: (path: string) => void;
          onCloseRight: (path: string) => void;
        })}
      />
    );

    const contextMenus = view.getAllByTestId("workspace-tabs-dropdown-menu").filter((item: HTMLElement) => item.getAttribute("data-trigger") === "contextMenu");

    expect(contextMenus.length).toBeGreaterThan(0);
    expect(view.getAllByText("关闭当前").length).toBeGreaterThan(0);
    expect(view.getAllByText("关闭左侧").length).toBeGreaterThan(0);
    expect(view.getAllByText("关闭右侧").length).toBeGreaterThan(0);
    expect(view.getAllByText("关闭其他").length).toBeGreaterThan(0);
    expect(view.getAllByText("关闭所有").length).toBeGreaterThan(0);

    fireEvent.click(view.getAllByText("关闭当前")[0]);
    fireEvent.click(view.getAllByText("关闭左侧")[0]);
    fireEvent.click(view.getAllByText("关闭右侧")[0]);
    fireEvent.click(view.getAllByText("关闭其他")[0]);
    fireEvent.click(view.getAllByText("关闭所有")[0]);

    expect(onCloseCurrent).toHaveBeenCalledTimes(1);
    expect(onCloseLeft).toHaveBeenCalledTimes(1);
    expect(onCloseRight).toHaveBeenCalledTimes(1);
    expect(onCloseOther).toHaveBeenCalledTimes(1);
    expect(onCloseAll).toHaveBeenCalledTimes(1);
  });

  test("places desktop scroll controls on both sides of the scroll strip", async() => {
    const originalResizeObserver = globalThis.ResizeObserver;
    const clientWidthSpy = jest.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(function getClientWidth(this: HTMLElement) {
      return this.classList.contains("admin-workspace-tabs-scroll-viewport") ? 160 : 0;
    });
    const scrollWidthSpy = jest.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockImplementation(function getScrollWidth(this: HTMLElement) {
      return this.classList.contains("admin-workspace-tabs-scroll-viewport") ? 420 : 0;
    });
    globalThis.ResizeObserver = class {
      private readonly callback: ResizeObserverCallback;

      constructor(callback: ResizeObserverCallback) {
        this.callback = callback;
      }

      observe(target: Element) {
        this.callback([{target} as ResizeObserverEntry], this as unknown as ResizeObserver);
      }

      unobserve() {}

      disconnect() {}
    };

    try {
      const view = render(
        <WorkspaceTabs
          tabs={[
            ...tabs,
            {key: "/records", path: "/records", label: "审计记录", fixed: false, closable: true},
            {key: "/tokens", path: "/tokens", label: "令牌管理", fixed: false, closable: true},
          ]}
          activePath="/providers"
          isMobile={false}
          onNavigate={jest.fn()}
          onClose={jest.fn()}
          onCloseCurrent={jest.fn()}
          onCloseOther={jest.fn()}
          onCloseAll={jest.fn()}
        />
      );

      await act(async() => {});

      const scrollShell = view.container.querySelector(".admin-workspace-tabs-scroll-shell");

      expect(scrollShell).not.toBeNull();
      expect(scrollShell?.querySelectorAll(".admin-workspace-tabs-scroll-button")).toHaveLength(2);
      expect(view.container.querySelector(".admin-workspace-tabs-actions")).toBeNull();
      expect(view.container.querySelector(".admin-workspace-tabs-fixed-area")).toBeNull();
      expect(view.container.querySelector(".admin-workspace-tabs-close-menu")).not.toBeNull();
    } finally {
      clientWidthSpy.mockRestore();
      scrollWidthSpy.mockRestore();
      if (originalResizeObserver === undefined) {
        delete (globalThis as {ResizeObserver?: typeof ResizeObserver}).ResizeObserver;
      } else {
        globalThis.ResizeObserver = originalResizeObserver;
      }
    }
  });

  test("keeps overview closeable from visible affordance and context menu", () => {
    const view = render(
      <WorkspaceTabs
        {...({
          tabs,
          activePath: "/",
          isMobile: false,
          onNavigate: jest.fn(),
          onClose: jest.fn(),
          onCloseCurrent: jest.fn(),
          onCloseOther: jest.fn(),
          onCloseAll: jest.fn(),
        } as React.ComponentProps<typeof WorkspaceTabs>)}
      />
    );

    expect(view.getByLabelText("关闭 企业认证总览").className).toContain("admin-workspace-tab-close-active");
    expect(view.getAllByText("关闭当前")[0].closest("[role='menuitem']")?.getAttribute("aria-disabled")).toBeNull();
  });

  test("updates desktop scroll arrows only when hidden tabs exist on that side", async() => {
    const originalResizeObserver = globalThis.ResizeObserver;
    const originalScrollBy = HTMLElement.prototype.scrollBy;
    const scrollBy = jest.fn();
    let scrollLeft = 0;
    const clientWidthSpy = jest.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(function getClientWidth(this: HTMLElement) {
      return this.classList.contains("admin-workspace-tabs-scroll-viewport") ? 180 : 0;
    });
    const scrollWidthSpy = jest.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockImplementation(function getScrollWidth(this: HTMLElement) {
      return this.classList.contains("admin-workspace-tabs-scroll-viewport") ? 420 : 0;
    });
    const scrollLeftSpy = jest.spyOn(HTMLElement.prototype, "scrollLeft", "get").mockImplementation(function getScrollLeft(this: HTMLElement) {
      return this.classList.contains("admin-workspace-tabs-scroll-viewport") ? scrollLeft : 0;
    });
    globalThis.ResizeObserver = class {
      private readonly callback: ResizeObserverCallback;

      constructor(callback: ResizeObserverCallback) {
        this.callback = callback;
      }

      observe(target: Element) {
        this.callback([{target} as ResizeObserverEntry], this as unknown as ResizeObserver);
      }

      unobserve() {}

      disconnect() {}
    };
    const manyTabs = [
      ...tabs,
      {key: "/records", path: "/records", label: "审计记录", fixed: false, closable: true},
      {key: "/tokens", path: "/tokens", label: "令牌管理", fixed: false, closable: true},
    ];
    HTMLElement.prototype.scrollBy = scrollBy;

    try {
      const view = render(
        <WorkspaceTabs
          tabs={manyTabs}
          activePath="/tokens"
          isMobile={false}
          onNavigate={jest.fn()}
          onClose={jest.fn()}
        />
      );

      await act(async() => {});

      expect(view.queryByLabelText("向左滚动工作标签")).toBeNull();
      fireEvent.click(view.getByLabelText("向右滚动工作标签"));
      expect(scrollBy).toHaveBeenCalledWith({left: 120, behavior: "smooth"});

      scrollLeft = 120;
      fireEvent.scroll(view.container.querySelector(".admin-workspace-tabs-scroll-viewport") as HTMLElement);

      expect(view.getByLabelText("向左滚动工作标签")).not.toBeNull();
      expect(view.getByLabelText("向右滚动工作标签")).not.toBeNull();

      scrollLeft = 240;
      fireEvent.scroll(view.container.querySelector(".admin-workspace-tabs-scroll-viewport") as HTMLElement);

      expect(view.getByLabelText("向左滚动工作标签")).not.toBeNull();
      expect(view.queryByLabelText("向右滚动工作标签")).toBeNull();
    } finally {
      clientWidthSpy.mockRestore();
      scrollWidthSpy.mockRestore();
      scrollLeftSpy.mockRestore();
      HTMLElement.prototype.scrollBy = originalScrollBy;
      if (originalResizeObserver === undefined) {
        delete (globalThis as {ResizeObserver?: typeof ResizeObserver}).ResizeObserver;
      } else {
        globalThis.ResizeObserver = originalResizeObserver;
      }
    }
  });

  test("scrolls the active desktop tab into view when selection changes", async() => {
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    const scrollIntoView = jest.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoView;

    const manyTabs = [
      ...tabs,
      {key: "/records", path: "/records", label: "审计记录", fixed: false, closable: true},
    ];

    try {
      render(
        <WorkspaceTabs
          tabs={manyTabs}
          activePath="/records"
          isMobile={false}
          onNavigate={jest.fn()}
          onClose={jest.fn()}
        />
      );

      await act(async() => {});

      expect(scrollIntoView).toHaveBeenCalledWith({block: "nearest", inline: "nearest"});
    } finally {
      HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    }
  });

  test("renders compact mobile title instead of full desktop tabs", () => {
    const view = render(
      <WorkspaceTabs
        tabs={tabs}
        activePath="/providers"
        isMobile={true}
        onNavigate={jest.fn()}
        onClose={jest.fn()}
      />
    );

    expect(view.container.querySelector(".admin-workspace-tabs-mobile")).not.toBeNull();
    expect(view.container.querySelector(".admin-workspace-tabs-desktop")).toBeNull();
    expect(view.container.querySelector(".admin-workspace-tabs-actions")).toBeNull();
    expect(view.getAllByText("身份源中心").length).toBeGreaterThan(0);
    expect(view.getByLabelText("更多工作页面")).not.toBeNull();
  });

  test("mobile overflow menu navigates and closes pages without changing the compact layout", () => {
    const onNavigate = jest.fn();
    const onClose = jest.fn();
    const view = render(
      <WorkspaceTabs
        tabs={tabs}
        activePath="/providers"
        isMobile={true}
        onNavigate={onNavigate}
        onClose={onClose}
      />
    );
    const menuItems = Array.from(
      view.getByTestId("workspace-tabs-dropdown-menu").querySelectorAll("[role='menuitem']") as NodeListOf<HTMLDivElement>
    );

    expect(menuItems[2].className).toContain("admin-workspace-tabs-overflow-item-active");

    fireEvent.click(menuItems[1]);
    expect(onNavigate).toHaveBeenCalledWith("/applications");

    fireEvent.click(view.getByLabelText("关闭 接入中心"));
    expect(onClose).toHaveBeenCalledWith("/applications");
    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(view.container.querySelector(".admin-workspace-tabs-mobile")).not.toBeNull();
  });

  test("renders all desktop tabs in the scroll strip without an overflow menu", () => {
    const onNavigate = jest.fn();
    const manyTabs = [
      ...tabs,
      {key: "/records", path: "/records", label: "审计记录", fixed: false, closable: true},
    ];
    const view = render(
      <WorkspaceTabs
        tabs={manyTabs}
        activePath="/providers"
        isMobile={false}
        onNavigate={onNavigate}
        onClose={jest.fn()}
      />
    );

    const visibleTabLabels = Array.from(
      view.container.querySelectorAll(".admin-workspace-tabs-scroll-strip .admin-workspace-tab-label") as NodeListOf<HTMLButtonElement>
    ).map(item => item.textContent);

    expect(visibleTabLabels).toEqual([
      "企业认证总览",
      "接入中心",
      "身份源中心",
      "审计记录",
    ]);
    expect(view.container.querySelector(".admin-workspace-tabs-more")).toBeNull();

    fireEvent.click(view.getByText("审计记录"));

    expect(onNavigate).toHaveBeenCalledWith("/records");
    expect(view.getByText("企业认证总览")).not.toBeNull();
    expect(view.getByText("接入中心")).not.toBeNull();
  });
});
