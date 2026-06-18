import React from "react";
import {expect, jest as jestValue} from "@jest/globals";
import {render} from "@testing-library/react";
import {CloudSyncOutlined, PlayCircleOutlined, ReloadOutlined, SaveOutlined, ToolOutlined} from "@ant-design/icons";
import {
  OrganizationSyncActionBar,
  OrganizationSyncPageHeader,
  OrganizationSyncRunRecordHeader
} from "./OrganizationSyncShell";

const {fireEvent, screen} = require("@testing-library/react") as {
  fireEvent: {
    click: (element: Element | null) => boolean;
  };
  screen: {
    getByAltText: (text: string) => HTMLElement;
    getByText: (text: string) => HTMLElement;
  };
};

function expectElement(element: HTMLElement | null): asserts element is HTMLElement {
  expect(element).not.toBeNull();
}

beforeEach(() => {
  jestValue.spyOn(console, "error").mockImplementation((message?: unknown) => {
    if (typeof message === "string" && message.includes("ReactDOM.render is no longer supported in React 18")) {
      return;
    }
  });
});

afterEach(() => {
  jestValue.restoreAllMocks();
});

describe("OrganizationSyncPageHeader", () => {
  test("renders compact provider logo, title, subtitle, and status text", () => {
    const {container} = render(
      <OrganizationSyncPageHeader
        className="organization-sync-page-title"
        provider="wecom"
        title="企业微信组织架构同步"
        subtitle="配置通讯录同步并查看正式同步记录。"
        statusText="当前无运行中任务"
      />
    );

    expect(container.querySelector(".organization-sync-page-title")).not.toBeNull();
    expect(screen.getByAltText("WeCom provider logo").getAttribute("src")).toContain("/img/social_wecom.png");
    expectElement(screen.getByText("企业微信组织架构同步"));
    expectElement(screen.getByText("配置通讯录同步并查看正式同步记录。"));
    expectElement(screen.getByText("当前无运行中任务"));
  });

  test("uses Lark logo infrastructure for Feishu provider branding", () => {
    render(<OrganizationSyncPageHeader provider="feishu" title="飞书组织架构同步" />);

    expect(screen.getByAltText("Feishu/Lark provider logo").getAttribute("src")).toContain("/img/social_lark.png");
  });
});

describe("OrganizationSyncActionBar", () => {
  test("renders provider actions in a stable order and respects disabled running state", () => {
    const calls: string[] = [];
    const {container} = render(
      <OrganizationSyncActionBar
        className="organization-sync-action-bar"
        actions={[
          {key: "save", label: "保存", icon: <SaveOutlined />, type: "primary", onClick: () => calls.push("save")},
          {key: "test", label: "测试连接", icon: <ToolOutlined />, onClick: () => calls.push("test")},
          {key: "preview", label: "预览影响", icon: <CloudSyncOutlined />, onClick: () => calls.push("preview")},
          {key: "sync", label: "同步进行中", icon: <PlayCircleOutlined />, disabled: true, onClick: () => calls.push("sync")},
        ]}
      />
    );

    const buttons = Array.from(container.querySelectorAll("button")) as HTMLButtonElement[];
    expect(container.querySelector(".organization-sync-action-bar")).not.toBeNull();
    expect(buttons.map(button => button.textContent)).toEqual(["保存", "测试连接", "预览影响", "同步进行中"]);
    fireEvent.click(screen.getByText("保存"));
    fireEvent.click(screen.getByText("测试连接"));
    fireEvent.click(screen.getByText("预览影响"));
    fireEvent.click(screen.getByText("同步进行中"));

    expect(calls).toEqual(["save", "test", "preview"]);
  });
});

describe("OrganizationSyncRunRecordHeader", () => {
  test("renders refresh hint and refresh action without a wide table wrapper", () => {
    const onRefresh = jestValue.fn();
    const {container} = render(
      <OrganizationSyncRunRecordHeader
        className="organization-sync-record-header"
        title="同步记录"
        hint="当前无运行中任务，可手动刷新同步记录。"
        hintType="secondary"
        refreshAction={{label: "刷新", icon: <ReloadOutlined />, loading: false, onClick: onRefresh}}
      />
    );

    expect(container.querySelector(".organization-sync-record-header")).not.toBeNull();
    expectElement(screen.getByText("同步记录"));
    expectElement(screen.getByText("当前无运行中任务，可手动刷新同步记录。"));
    fireEvent.click(screen.getByText("刷新"));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
