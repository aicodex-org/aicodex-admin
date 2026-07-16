import React from "react";
import {expect, jest as jestValue} from "@jest/globals";
import {render} from "@testing-library/react";
import {CloudSyncOutlined, PlayCircleOutlined, ReloadOutlined, SaveOutlined, ToolOutlined} from "@ant-design/icons";
import {
  OrganizationSyncActionBar,
  OrganizationSyncPageHeader,
  OrganizationSyncRunRecordHeader,
  OrganizationSyncSectionCard
} from "./OrganizationSyncShell";
import {readLessWithImports} from "../testUtils/less";

const {fireEvent, screen} = require("@testing-library/react") as {
  fireEvent: {
    click: (element: Element | null) => boolean;
  };
  screen: {
    getByAltText: (text: string) => HTMLElement;
    getByText: (text: string) => HTMLElement;
  };
};
const path = require("path") as {join: (...parts: string[]) => string};

function expectElement(element: HTMLElement | null): asserts element is HTMLElement {
  expect(element).not.toBeNull();
}

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
    expect((container.querySelector(".organization-sync-page-title") as HTMLElement).getAttribute("style")).toBeNull();
    expect(screen.getByAltText("WeCom provider logo").getAttribute("src")).toContain("/img/social_wecom.png");
    expect(screen.getByAltText("WeCom provider logo").className).toContain("organization-sync-provider-logo");
    expect(screen.getByAltText("WeCom provider logo").getAttribute("style")).toBeNull();
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
    expect((container.querySelector(".organization-sync-action-bar") as HTMLElement).getAttribute("style")).toBeNull();
    expect(buttons.map(button => button.textContent)).toEqual(["保存", "测试连接", "预览影响", "同步进行中"]);
    fireEvent.click(screen.getByText("保存"));
    fireEvent.click(screen.getByText("测试连接"));
    fireEvent.click(screen.getByText("预览影响"));
    fireEvent.click(screen.getByText("同步进行中"));

    expect(calls).toEqual(["save", "test", "preview"]);
  });
});

describe("OrganizationSyncSectionCard", () => {
  test("renders separate config and record section cards without inline layout styles", () => {
    const {container} = render(
      <div>
        <OrganizationSyncSectionCard variant="config">
          <span>配置区</span>
        </OrganizationSyncSectionCard>
        <OrganizationSyncSectionCard variant="record" className="custom-record-section">
          <span>同步记录</span>
        </OrganizationSyncSectionCard>
      </div>
    );

    const configCard = container.querySelector(".organization-sync-section-card.organization-sync-config-card") as HTMLElement | null;
    const recordCard = container.querySelector(".organization-sync-section-card.organization-sync-record-card.custom-record-section") as HTMLElement | null;

    expect(configCard).not.toBeNull();
    expect(recordCard).not.toBeNull();
    expect(configCard?.getAttribute("style")).toBeNull();
    expect(recordCard?.getAttribute("style")).toBeNull();
    expectElement(screen.getByText("配置区"));
    expectElement(screen.getByText("同步记录"));
  });

  test("uses shared shell tokens for sync page cards and spacing", () => {
    const appLess = readLessWithImports(path.join(__dirname, "../App.less"));
    const pageBlock = appLess.match(/\.organization-sync-page \{([\s\S]*?)\}/)?.[1] ?? "";
    const sectionCardBlock = appLess.match(/\.organization-sync-section-card \{([\s\S]*?)\}/)?.[1] ?? "";

    expect(pageBlock).toContain("gap: 12px");
    expect(sectionCardBlock).toContain("background: var(--admin-shell-surface-bg");
    expect(sectionCardBlock).toContain("border: 1px solid var(--admin-shell-border");
    expect(sectionCardBlock).toContain("box-shadow: var(--admin-shell-shadow-sm");
    expect(appLess).toMatch(/\.organization-sync-provider-logo \{[\s\S]*display:\s*block;[\s\S]*border-radius:\s*4px;/);
    expect(appLess).toMatch(/\.organization-sync-page \.ant-btn-default \{[\s\S]*background:\s*var\(--admin-shell-surface-soft-bg/);
    expect(appLess).toMatch(/\.organization-sync-page \.ant-btn-default:hover,[\s\S]*border-color:\s*var\(--admin-shell-link-strong/);
    expect(appLess).toMatch(/\.organization-sync-page-title \{[\s\S]*margin-bottom:\s*0;/);
    expect(appLess).toMatch(/\.organization-sync-permission-alert \{[\s\S]*margin-top:\s*14px;/);
    expect(appLess).toMatch(/\.dingtalk-organization-sync-options \{[\s\S]*width:\s*100%;/);
    expect(appLess).toMatch(/\.dingtalk-organization-sync-permission-alert \{[\s\S]*margin-top:\s*20px;/);
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
    expect((container.querySelector(".organization-sync-record-header") as HTMLElement).getAttribute("style")).toBeNull();
    expectElement(screen.getByText("同步记录"));
    expectElement(screen.getByText("当前无运行中任务，可手动刷新同步记录。"));
    fireEvent.click(screen.getByText("刷新"));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
