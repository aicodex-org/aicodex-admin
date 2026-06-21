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
    Dropdown: ({children, menu}: {children: React.ReactNode; menu?: {items?: Array<{key: string; label: React.ReactNode; className?: string; onClick: () => void}>}}) => (
      <>
        {children}
        <div data-testid="workspace-tabs-overflow-menu">
          {menu?.items?.map(item => (
            <div role="menuitem" tabIndex={0} key={item.key} className={item.className} onClick={item.onClick}>{item.label}</div>
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
  };
};
const WorkspaceTabs = require("./WorkspaceTabs.tsx").default as typeof import("./WorkspaceTabs").default;

const tabs = [
  {key: "/", path: "/", label: "企业认证总览", fixed: true, closable: false},
  {key: "/applications", path: "/applications", label: "应用接入中心", fixed: false, closable: true},
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
      if (typeof args[0] === "string" && args[0].includes("ReactDOM.render is no longer supported")) {
        return;
      }

      throw new Error(args.map(item => String(item)).join(" "));
    });
    await useTestLanguage("zh");
  });

  afterEach(() => {
    cleanup();
    consoleErrorSpy.mockRestore();
  });

  test("renders desktop tabs with active state fixed overview and close action", () => {
    const onNavigate = jest.fn();
    const onClose = jest.fn();
    const view = render(
      <WorkspaceTabs
        tabs={tabs}
        activePath="/applications"
        isMobile={false}
        onNavigate={onNavigate}
        onClose={onClose}
      />
    );

    expect(view.container.querySelector(".admin-workspace-tabs-desktop")).not.toBeNull();
    expect(view.getByText("企业认证总览")).not.toBeNull();
    expect(view.getByText("应用接入中心").closest("button")?.getAttribute("aria-current")).toBe("page");
    expect(view.queryByLabelText("关闭 企业认证总览")).toBeNull();

    fireEvent.click(view.getByLabelText("关闭 身份源中心"));
    expect(onClose).toHaveBeenCalledWith("/providers");

    fireEvent.click(view.getByText("企业认证总览"));
    expect(onNavigate).toHaveBeenCalledWith("/");
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
    expect(view.getAllByText("身份源中心").length).toBeGreaterThan(0);
    expect(view.getByLabelText("更多工作页面")).not.toBeNull();
  });

  test("navigates from overflow menu without changing rendered tab order", () => {
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
        maxVisible={2}
        onNavigate={onNavigate}
        onClose={jest.fn()}
      />
    );

    const visibleTabLabels = Array.from(
      view.container.querySelectorAll(".admin-workspace-tab-label") as NodeListOf<HTMLButtonElement>
    ).map(item => item.textContent);

    expect(visibleTabLabels).toEqual([
      "企业认证总览",
      "应用接入中心",
    ]);
    const overflowItems = Array.from(
      view.getByTestId("workspace-tabs-overflow-menu").querySelectorAll("[role='menuitem']") as NodeListOf<HTMLDivElement>
    );
    expect(overflowItems[0].className).toContain("admin-workspace-tabs-overflow-item-active");

    fireEvent.click(overflowItems[0]);

    expect(onNavigate).toHaveBeenCalledWith("/providers");
    expect(view.getByText("企业认证总览")).not.toBeNull();
    expect(view.getByText("应用接入中心")).not.toBeNull();
  });

  test("closes an active overflow tab without firing overflow navigation", () => {
    const onNavigate = jest.fn();
    const onClose = jest.fn();
    const manyTabs = [
      ...tabs,
      {key: "/records", path: "/records", label: "审计记录", fixed: false, closable: true},
    ];
    const view = render(
      <WorkspaceTabs
        tabs={manyTabs}
        activePath="/providers"
        isMobile={false}
        maxVisible={2}
        onNavigate={onNavigate}
        onClose={onClose}
      />
    );

    fireEvent.click(view.getByLabelText("关闭 身份源中心"));

    expect(onClose).toHaveBeenCalledWith("/providers");
    expect(onNavigate).not.toHaveBeenCalled();
  });

  test("measures desktop strip width before splitting overflow tabs", async() => {
    const originalResizeObserver = globalThis.ResizeObserver;
    const clientWidthSpy = jest.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(function getClientWidth(this: HTMLElement) {
      return this.classList.contains("admin-workspace-tabs-strip") ? 320 : 0;
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
      {key: "/tokens", path: "/tokens", label: "令牌复核", fixed: false, closable: true},
    ];

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
      const visibleTabLabels = Array.from(
        view.container.querySelectorAll(".admin-workspace-tab-label") as NodeListOf<HTMLButtonElement>
      ).map(item => item.textContent);

      expect(visibleTabLabels).toEqual([
        "企业认证总览",
        "应用接入中心",
      ]);
      expect(view.getByText("令牌复核")).not.toBeNull();
    } finally {
      clientWidthSpy.mockRestore();
      if (originalResizeObserver === undefined) {
        delete (globalThis as {ResizeObserver?: typeof ResizeObserver}).ResizeObserver;
      } else {
        globalThis.ResizeObserver = originalResizeObserver;
      }
    }
  });
});
