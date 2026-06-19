/* eslint-env jest */
import React from "react";
import {expect, jest} from "@jest/globals";
import {cleanup, render} from "@testing-library/react";
import i18next from "i18next";
import en from "../locales/en/data.json";
import zh from "../locales/zh/data.json";
import type {WorkspaceTabItem} from "./workspaceTabState";

jest.mock("antd", () => {
  const React = require("react");
  return {
    Button: ({children, icon, ...props}: {children?: React.ReactNode; icon?: React.ReactNode}) => (
      <button type="button" {...props}>
        {icon}
        {children}
      </button>
    ),
    Dropdown: ({children}: {children: React.ReactNode}) => <>{children}</>,
    Tooltip: ({children}: {children: React.ReactNode}) => <>{children}</>,
  };
});

const {fireEvent} = require("@testing-library/react") as {
  fireEvent: {
    click: (element: Element) => void;
  };
};
const WorkspaceTabs = require("./WorkspaceTabs.tsx").default as typeof import("./WorkspaceTabs").default;

const tabs: WorkspaceTabItem[] = [
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
    expect(view.getByText("身份源中心")).not.toBeNull();
    expect(view.getByLabelText("更多工作页面")).not.toBeNull();
  });
});
