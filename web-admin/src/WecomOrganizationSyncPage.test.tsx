/* eslint-env jest */
// Copyright 2026 The AICodex Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import React from "react";
import {expect as jestExpect, jest as jestValue} from "@jest/globals";
import {act, render, waitFor} from "@testing-library/react";
import * as Setting from "./Setting";
import * as FeishuOrganizationSyncBackend from "./backend/FeishuOrganizationSyncBackend";
import * as OrganizationBackend from "./backend/OrganizationBackend";
import * as WecomOrganizationSyncBackend from "./backend/WecomOrganizationSyncBackend";
import WecomOrganizationSyncPage from "./WecomOrganizationSyncPage";

declare const jest: typeof jestValue;

type DomMatcherResult = ReturnType<typeof jestExpect> & {
  toBeInTheDocument: () => void;
  toHaveAttribute: (attr: string, value?: unknown) => void;
  toBeDisabled: () => void;
  toHaveClass: (...classNames: string[]) => void;
  not: ReturnType<typeof jestExpect> & {
    toBeInTheDocument: () => void;
    toHaveBeenCalled: () => void;
    toBeNull: () => void;
    toBeDisabled: () => void;
  };
};

type TestExpect = {
  (actual: unknown): DomMatcherResult;
  objectContaining: typeof jestExpect.objectContaining;
  stringContaining: typeof jestExpect.stringContaining;
};

const expect = jestExpect as unknown as TestExpect;

jest.mock("./backend/WecomOrganizationSyncBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    getWecomOrganizationSyncConfig: factoryJest.fn(),
    saveWecomOrganizationSyncConfig: factoryJest.fn(),
    testWecomOrganizationSyncConfig: factoryJest.fn(),
    dryRunWecomOrganizationSyncPreview: factoryJest.fn(),
    getWecomOrganizationSyncDryRunHistories: factoryJest.fn(),
    getWecomOrganizationSyncDryRunHistory: factoryJest.fn(),
    startWecomOrganizationSyncRun: factoryJest.fn(),
    getWecomOrganizationSyncRuns: factoryJest.fn(),
  };
});

jest.mock("./backend/FeishuOrganizationSyncBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    getFeishuOrganizationSyncConfig: factoryJest.fn(),
  };
});

jest.mock("./backend/OrganizationBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    addOrganization: factoryJest.fn(),
    updateOrganization: factoryJest.fn(),
    deleteOrganization: factoryJest.fn(),
  };
});

jest.mock("./common/select/OrganizationSelect", () => (props: {initValue?: string; excludedOrganizations?: string[]; onChange: (value: string) => void; onOrganizationsLoaded?: (organizations: Array<{name: string; displayName: string}>) => void}) => {
  const mockReact = require("react") as {useEffect: (effect: () => void, deps?: unknown[]) => void};
  mockReact.useEffect(() => {
    props.onOrganizationsLoaded?.([
      {name: "built-in", displayName: "Built-in Organization"},
      {name: "engineering", displayName: "测试组织"},
      {name: "feishu-occupied", displayName: "Feishu Occupied"},
      {name: "support", displayName: "Support"},
    ]);
  }, [props.onOrganizationsLoaded]);
  const organizations = [
    {value: "built-in", label: "Built-in Organization"},
    {value: "engineering", label: "engineering"},
    {value: "feishu-occupied", label: "feishu-occupied"},
    {value: "support", label: "support"},
  ].filter(organization => !(props.excludedOrganizations || []).includes(organization.value));
  return (
    <select data-testid="organization-select" value={props.initValue} onChange={event => props.onChange(event.target.value)}>
      {organizations.map(organization => <option key={organization.value} value={organization.value}>{organization.label}</option>)}
    </select>
  );
});

type LooseMock = {
  (...args: unknown[]): unknown;
  mockResolvedValue: (value: unknown) => LooseMock;
  mockResolvedValueOnce: (value: unknown) => LooseMock;
  mockReturnValueOnce: (value: unknown) => LooseMock;
};
type WecomBackendMock = Record<keyof typeof WecomOrganizationSyncBackend, LooseMock>;
type FeishuBackendMock = Record<keyof typeof FeishuOrganizationSyncBackend, LooseMock>;
type OrganizationBackendMock = Record<keyof typeof OrganizationBackend, LooseMock>;

const wecomBackendMock = WecomOrganizationSyncBackend as unknown as WecomBackendMock;
const feishuBackendMock = FeishuOrganizationSyncBackend as unknown as FeishuBackendMock;
const organizationBackendMock = OrganizationBackend as unknown as OrganizationBackendMock;
const {fireEvent, screen} = require("@testing-library/react") as {
  fireEvent: {
    click: (element: Element | null) => boolean;
    change: (element: Element | null, event: unknown) => boolean;
    keyDown: (element: Element | null, event: unknown) => boolean;
  };
  screen: {
    findByText: (text: string | RegExp) => Promise<HTMLElement>;
    getByText: (text: string | RegExp) => HTMLElement;
    getAllByText: (text: string | RegExp) => HTMLElement[];
    queryByText: (text: string | RegExp) => HTMLElement | null;
    getByAltText: (text: string) => HTMLElement;
    getByDisplayValue: (text: string) => HTMLElement;
    queryByDisplayValue: (text: string) => HTMLElement | null;
    getByTestId: (testId: string) => HTMLElement;
  };
};

function getModalCloseButton(title: string): HTMLButtonElement {
  const modal = screen.getByText(title).closest(".ant-modal-content");
  if (!modal) {
    throw new Error(`Modal not found: ${title}`);
  }
  const button = modal.querySelector<HTMLButtonElement>(".ant-modal-close");
  if (!button) {
    throw new Error(`Modal close button not found: ${title}`);
  }
  return button;
}

function expectTableColumnHeader(container: HTMLElement, label: string): void {
  expect(Array.from(container.querySelectorAll("thead th[scope='col']")).some(cell => cell.textContent === label)).toBe(true);
}

const mockMatchMedia = (query: string): MediaQueryList => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: jestValue.fn(),
  removeListener: jestValue.fn(),
  addEventListener: jestValue.fn(),
  removeEventListener: jestValue.fn(),
  dispatchEvent: jestValue.fn(),
} as unknown as MediaQueryList);

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: mockMatchMedia,
  });
  localStorage.removeItem("organization");
  localStorage.removeItem("wecom-org-sync:lastOrganization");
  jestValue.spyOn(Setting, "showMessage").mockImplementation(() => {});
  jestValue.spyOn(Setting, "getRandomName").mockReturnValue("abc123");
  organizationBackendMock.addOrganization.mockResolvedValue({status: "ok"});
  organizationBackendMock.updateOrganization.mockResolvedValue({status: "ok"});
  organizationBackendMock.deleteOrganization.mockResolvedValue({status: "ok"});
  mockConfig();
  feishuBackendMock.getFeishuOrganizationSyncConfig.mockResolvedValue({status: "ok", data: {config: null}});
  wecomBackendMock.getWecomOrganizationSyncRuns.mockResolvedValue({status: "ok", data: [], data2: 0});
  wecomBackendMock.testWecomOrganizationSyncConfig.mockResolvedValue({status: "ok", data: {missingFields: [], departmentCount: 0, userCount: 0}});
  wecomBackendMock.dryRunWecomOrganizationSyncPreview.mockResolvedValue({status: "ok", data: null});
  wecomBackendMock.getWecomOrganizationSyncDryRunHistories.mockResolvedValue({status: "ok", data: []});
  wecomBackendMock.getWecomOrganizationSyncDryRunHistory.mockResolvedValue({status: "ok", data: null});
  wecomBackendMock.startWecomOrganizationSyncRun.mockResolvedValue({status: "ok", data: {name: "run-1"}});
});

afterEach(() => {
  jestValue.useRealTimers();
  jestValue.restoreAllMocks();
  jestValue.clearAllMocks();
});

function mockConfig(config: Record<string, unknown> = {}, response: Record<string, unknown> = {}) {
  wecomBackendMock.getWecomOrganizationSyncConfig.mockResolvedValue({
    status: "ok",
    data: {
      organization: "engineering",
      isConfigured: false,
      defaultOrganization: "engineering",
      config: {
        organization: "engineering",
        corpId: "",
        addressBookSecret: "",
        isEnabled: false,
        softDisableMissingData: true,
        ...config,
      },
      ...response,
    },
  });
}

function flushPromises() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

test("renders localized WeCom organization sync configuration entry", async() => {
  const {container} = render(<WecomOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);

  expect(await screen.findByText("企业微信组织架构同步")).toBeInTheDocument();
  expect(screen.getByAltText("WeCom provider logo")).toHaveAttribute("src", expect.stringContaining("/img/social_wecom.png"));
  expect(await screen.findByText("同步目标组织")).toBeInTheDocument();
  expect(screen.getByText("新建组织")).toBeInTheDocument();
  expect(screen.queryByText("Built-in Organization")).not.toBeInTheDocument();
  expect(screen.getByText("选择要绑定企业微信通讯录的 aicodex-admin 组织。不同组织的 Corp ID、Secret 和同步记录互不混用。")).toBeInTheDocument();
  expect(screen.getByText("App ID（Corp ID）")).toBeInTheDocument();
  expect(screen.getByText("App Secret")).toBeInTheDocument();
  expect(screen.getByText("同步选项")).toBeInTheDocument();
  expect(screen.getByText("启用同步")).toBeInTheDocument();
  expect(screen.getByText("定时同步")).toBeInTheDocument();
  expect(screen.getByText("启用定时同步")).toBeInTheDocument();
  expect(screen.getByText("未启用定时同步")).toBeInTheDocument();
  expect(screen.queryByText("Cron 表达式")).not.toBeInTheDocument();
  expect(screen.queryByText("时区")).not.toBeInTheDocument();
  expect(screen.getByText("通讯录读取权限要求")).toBeInTheDocument();
  expect(screen.getByText("开始全量同步")).toBeInTheDocument();
  const permissionAlert = container.querySelector(".organization-sync-permission-alert");
  const permissionAlertRow = permissionAlert?.closest(".organization-sync-permission-alert-row");
  expect(permissionAlert).not.toBeNull();
  expect(permissionAlertRow).not.toBeNull();
  expect(permissionAlertRow?.classList.contains("ant-col-24")).toBe(true);
  expect(Setting.showMessage).not.toHaveBeenCalled();
});

test("saves scheduled sync settings from the config form", async() => {
  mockConfig({
    isEnabled: true,
    scheduleEnabled: false,
    scheduleCron: "0 2 * * *",
    scheduleTimezone: "Asia/Shanghai",
  });
  wecomBackendMock.saveWecomOrganizationSyncConfig.mockResolvedValue({
    status: "ok",
    data: {
      organization: "engineering",
      config: {
        organization: "engineering",
        corpId: "",
        addressBookSecret: "",
        isEnabled: true,
        softDisableMissingData: true,
        scheduleEnabled: true,
        scheduleCron: "*/15 * * * *",
        scheduleTimezone: "UTC",
      },
    },
  });

  render(<WecomOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);

  await screen.findByText("定时同步");
  expect(screen.queryByDisplayValue("0 2 * * *")).not.toBeInTheDocument();
  const scheduleSwitch = screen.getByText("启用定时同步").closest(".ant-space")?.querySelector("button") || null;
  fireEvent.click(scheduleSwitch);
  expect(screen.getByText("Cron 表达式")).toBeInTheDocument();
  expect(screen.getByText("时区")).toBeInTheDocument();
  fireEvent.change(screen.getByDisplayValue("0 2 * * *"), {target: {value: "*/15 * * * *"}});
  fireEvent.change(screen.getByDisplayValue("Asia/Shanghai"), {target: {value: "UTC"}});
  fireEvent.click(screen.getByText("保存"));

  await flushPromises();
  expect(wecomBackendMock.saveWecomOrganizationSyncConfig).toHaveBeenCalledWith(expect.objectContaining({
    scheduleEnabled: true,
    scheduleCron: "*/15 * * * *",
    scheduleTimezone: "UTC",
  }));
});

test("renders WeCom scheduled sync details after enabling schedule", async() => {
  mockConfig({
    scheduleEnabled: true,
    scheduleCron: "0 2 * * *",
    scheduleTimezone: "Asia/Shanghai",
    scheduleLastFireAt: "2026-06-15T10:00:00Z",
    scheduleLastStatus: "failed",
    scheduleLastErrorText: "network timeout",
  });

  render(<WecomOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);

  expect(await screen.findByText("定时同步")).toBeInTheDocument();
  expect(screen.queryByText("未启用定时同步")).not.toBeInTheDocument();
  expect(screen.getByText("Cron 表达式")).toBeInTheDocument();
  expect(screen.getByText("时区")).toBeInTheDocument();
  expect(screen.getByText(/最近调度：/)).toBeInTheDocument();
  expect(screen.getByText("最近结果：failed，network timeout")).toBeInTheDocument();
});

test("restores configured WeCom organization when account owner is built-in", async() => {
  mockConfig({organization: "engineering", corpId: "ww-restored"});

  render(<WecomOrganizationSyncPage account={{owner: "built-in", isAdmin: true}} />);

  expect(await screen.findByText("企业微信组织架构同步")).toBeInTheDocument();
  expect(screen.getByDisplayValue("ww-restored")).toBeInTheDocument();
  expect(screen.getByDisplayValue("ww-restored")).toHaveAttribute("name", "wecom-organization-sync-corp-id");
  expect(screen.getByDisplayValue("ww-restored")).toHaveAttribute("autocomplete", "off");
  expect(document.querySelector("input[name='wecom-organization-sync-address-book-secret']")).toHaveAttribute("autocomplete", "new-password");
  expect(wecomBackendMock.getWecomOrganizationSyncConfig).toHaveBeenCalledWith("");
  expect(wecomBackendMock.getWecomOrganizationSyncRuns).toHaveBeenCalledWith("engineering", 1, 10);
});

test("prefers remembered WeCom sync organization over account owner", async() => {
  localStorage.setItem("wecom-org-sync:lastOrganization", "engineering");
  mockConfig({organization: "engineering"});

  render(<WecomOrganizationSyncPage account={{owner: "built-in", isAdmin: true}} />);

  expect(await screen.findByText("企业微信组织架构同步")).toBeInTheDocument();
  expect(wecomBackendMock.getWecomOrganizationSyncConfig).toHaveBeenCalledWith("engineering");
  expect(wecomBackendMock.getWecomOrganizationSyncRuns).toHaveBeenCalledWith("engineering", 1, 10);
});

test("falls back to account owner when stored organization is blank", async() => {
  localStorage.setItem("organization", "");
  mockConfig({organization: "engineering"});

  render(<WecomOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);

  expect(await screen.findByText("企业微信组织架构同步")).toBeInTheDocument();
  expect(screen.getByTestId("organization-select")).toBeInTheDocument();
  expect(wecomBackendMock.getWecomOrganizationSyncConfig).toHaveBeenCalledWith("engineering");
  expect(wecomBackendMock.getWecomOrganizationSyncRuns).toHaveBeenCalledWith("engineering", 1, 10);
});

test("shows source conflict warning and disables saving or enabling WeCom full sync", async() => {
  mockConfig({organization: "engineering", isEnabled: false}, {
    conflictingProvider: "Feishu/Lark",
    conflictingOrganization: "engineering",
    conflictingConfigured: true,
    conflictingEnabled: true,
    conflictingOrganizations: ["engineering"],
  });

  render(<WecomOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);

  expect(await screen.findByText("Feishu/Lark 已选择为当前组织的通讯录同步来源")).toBeInTheDocument();
  expect(await screen.findByText(/当前组织 测试组织 已被 Feishu\/Lark 占用/)).toBeInTheDocument();
  expect(screen.queryByText(/当前组织 engineering 已被 Feishu\/Lark 占用/)).not.toBeInTheDocument();
  const enableSwitch = screen.getByText("启用同步").closest(".ant-space")?.querySelector("button") || null;
  expect(enableSwitch).toBeDisabled();
  expect(screen.getByText("开始全量同步").closest("button")).toBeDisabled();
  expect(screen.getByText("保存").closest("button")).toBeDisabled();
});

test("keeps already-enabled WeCom source read-only when another source occupies organization", async() => {
  mockConfig({organization: "engineering", corpId: "ww-enabled", isEnabled: true}, {
    conflictingProvider: "Feishu/Lark",
    conflictingOrganization: "engineering",
    conflictingConfigured: true,
    conflictingEnabled: true,
    conflictingOrganizations: ["engineering"],
  });

  render(<WecomOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);

  expect(await screen.findByText("Feishu/Lark 已选择为当前组织的通讯录同步来源")).toBeInTheDocument();
  const enableSwitch = screen.getByText("启用同步").closest(".ant-space")?.querySelector("button") || null;
  const saveButton = document.querySelector(".organization-sync-action-bar button");
  expect(enableSwitch).toBeDisabled();
  expect(saveButton).toBeDisabled();
  expect(wecomBackendMock.saveWecomOrganizationSyncConfig).not.toHaveBeenCalled();
});

test("detects Feishu conflict from legacy backend response without source status", async() => {
  mockConfig({organization: "engineering", isEnabled: false});
  feishuBackendMock.getFeishuOrganizationSyncConfig.mockResolvedValue({
    status: "ok",
    data: {
      config: {
        organization: "engineering",
        isEnabled: false,
      },
    },
  });

  render(<WecomOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);

  expect(await screen.findByText("Feishu/Lark 已选择为当前组织的通讯录同步来源")).toBeInTheDocument();
  expect(screen.getByText(/已被 Feishu\/Lark 占用/)).toBeInTheDocument();
});

test("filters organizations occupied by Feishu from the sync target selector", async() => {
  mockConfig({organization: "engineering", isEnabled: false}, {
    conflictingOrganizations: ["feishu-occupied"],
  });

  render(<WecomOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);

  expect(await screen.findByText("企业微信组织架构同步")).toBeInTheDocument();
  expect(screen.getByText("engineering")).toBeInTheDocument();
  expect(screen.queryByText("feishu-occupied")).not.toBeInTheDocument();
  expect(screen.getByText("support")).toBeInTheDocument();
  expect(screen.queryByText("Feishu/Lark 已选择为当前组织的通讯录同步来源")).not.toBeInTheDocument();
  expect(screen.getByText("保存").closest("button")).not.toBeDisabled();
});

test("opens an unsaved organization draft when creating WeCom sync target organization", async() => {
  const history = {push: jestValue.fn()};
  const dispatchEventSpy = jestValue.spyOn(window, "dispatchEvent");
  render(<WecomOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} history={history} />);

  fireEvent.click(await screen.findByText("新建组织"));
  await flushMicrotasks();

  expect(organizationBackendMock.addOrganization).not.toHaveBeenCalled();
  expect(organizationBackendMock.updateOrganization).not.toHaveBeenCalled();
  expect(organizationBackendMock.deleteOrganization).not.toHaveBeenCalled();
  expect(Setting.showMessage).not.toHaveBeenCalled();
  expect(dispatchEventSpy).not.toHaveBeenCalledWith(expect.objectContaining({type: "storageOrganizationsChanged"}));
  expect(history.push).toHaveBeenCalledWith({
    pathname: "/organizations/organization_abc123",
    state: {
      mode: "add",
      organization: expect.objectContaining({
        owner: "admin",
        name: "organization_abc123",
        displayName: "New Organization - abc123",
        passwordType: "bcrypt",
        countryCodes: ["US"],
      }),
    },
  });
});

test("renders sync run history with status, counts, and safe error summary", async() => {
  const writeText = jestValue.fn(() => Promise.resolve());
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {writeText},
  });
  wecomBackendMock.getWecomOrganizationSyncRuns.mockResolvedValue({
    status: "ok",
    data: [
      {
        name: "run-running",
        status: "running",
        stage: "fetch",
        triggerType: "manual",
        actor: "admin",
        departmentCreatedCount: 1,
        departmentUpdatedCount: 2,
        departmentDisabledCount: 3,
        userCreatedCount: 4,
        userUpdatedCount: 5,
        userDisabledCount: 6,
        finishedAt: "0001-01-01T00:00:00Z",
        errorText: "safe summary",
      },
      {name: "run-succeeded", status: "succeeded", stage: "finalizing", triggerType: "scheduled"},
      {name: "run-failed", status: "failed", stage: "applying"},
      {name: "run-partial", status: "partial", stage: "planning"},
    ],
    data2: 4,
  });

  const {container} = render(<WecomOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);

  expect(await screen.findByText("运行中")).toBeInTheDocument();
  expectTableColumnHeader(container, "序号");
  expect(screen.queryByText("运行 ID")).not.toBeInTheDocument();
  expect(screen.queryByText("run-running")).not.toBeInTheDocument();
  const runIndexCell = container.querySelector("tbody tr[data-row-key='run-running'] td:first-child");
  expect(runIndexCell?.textContent).toBe("1");
  expect(container.querySelector(".ant-typography-copy")).not.toBeInTheDocument();
  const runIndexButton = runIndexCell?.querySelector("[role='button']");
  fireEvent.click(runIndexButton as HTMLElement);
  fireEvent.keyDown(runIndexButton as HTMLElement, {key: " "});
  expect(writeText).toHaveBeenCalledWith("run-running");
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("success", "已复制运行 ID");
  expect(screen.getByText("运行中")).toBeInTheDocument();
  expect(screen.getByText("成功")).toBeInTheDocument();
  expect(screen.getByText("失败")).toBeInTheDocument();
  expect(screen.getByText("部分成功")).toBeInTheDocument();
  expectTableColumnHeader(container, "状态");
  expectTableColumnHeader(container, "触发方式");
  expect(screen.getByText("手动")).toBeInTheDocument();
  expect(screen.getByText("定时")).toBeInTheDocument();
  expect(screen.queryByText("Status")).not.toBeInTheDocument();
  expectTableColumnHeader(container, "部门");
  expectTableColumnHeader(container, "用户");
  expect(screen.queryByText("部门（新增 / 更新 / 禁用）")).not.toBeInTheDocument();
  expect(screen.queryByText("用户（新增 / 更新 / 禁用）")).not.toBeInTheDocument();
  expect(screen.getByText("已完成")).toBeInTheDocument();
  expect(screen.getByText("应用变更")).toBeInTheDocument();
  expect(screen.getByText("计算差异")).toBeInTheDocument();
  expect(screen.queryByText("收尾处理")).not.toBeInTheDocument();
  expect(screen.getByText("新 1 / 更 2 / 禁 3")).toBeInTheDocument();
  expect(screen.getByText("新 4 / 更 5 / 禁 6")).toBeInTheDocument();
  expect(screen.getByText("safe summary")).toBeInTheDocument();
  expect(screen.getByText(/检测到运行中任务，自动每 3 秒刷新/)).toBeInTheDocument();
  expect(screen.queryByText(/0001-01-01/)).not.toBeInTheDocument();
  expect(screen.queryByText("新增 / 更新 / 禁用")).not.toBeInTheDocument();
});

test("copies WeCom run ID through keyboard, fallback, and failure paths", async() => {
  const originalClipboard = navigator.clipboard;
  const originalExecCommand = document.execCommand;
  const page = new WecomOrganizationSyncPage({account: {owner: "engineering", isAdmin: true}} as any);
  const writeText = jestValue.fn(() => Promise.resolve());

  try {
    page.copyRunId("");
    expect(Setting.showMessage).not.toHaveBeenCalled();

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {writeText},
    });

    const event = {key: "Enter", preventDefault: jestValue.fn()} as unknown as React.KeyboardEvent<HTMLElement>;
    page.handleRunIndexKeyDown(event, "run-keyboard");

    expect(event.preventDefault).toHaveBeenCalled();
    expect(writeText).toHaveBeenCalledWith("run-keyboard");
    await flushPromises();
    expect(Setting.showMessage).toHaveBeenCalledWith("success", "已复制运行 ID");

    writeText.mockRejectedValueOnce(new Error("clipboard denied"));
    page.copyRunId("run-failed");
    await flushPromises();
    expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("复制失败："));

    const execCommand = jestValue.fn(() => true);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: execCommand,
    });

    page.copyRunId("run-fallback");

    expect(execCommand).toHaveBeenCalledWith("copy");
    expect(Setting.showMessage).toHaveBeenCalledWith("success", "已复制运行 ID");
  } finally {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: originalClipboard,
    });
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: originalExecCommand,
    });
  }
});

test("shows address book permission result after connection test", async() => {
  wecomBackendMock.testWecomOrganizationSyncConfig.mockResolvedValue({
    status: "ok",
    data: {
      missingFields: ["direct_leader"],
      departmentCount: 1,
      userCount: 2,
    },
  });

  render(<WecomOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);
  fireEvent.click(await screen.findByText("测试连接"));

  expect(await screen.findByText("缺失字段：direct_leader")).toBeInTheDocument();
  expect(screen.getByText("部门：1，成员：2")).toBeInTheDocument();
  expect(wecomBackendMock.testWecomOrganizationSyncConfig).toHaveBeenCalledWith(expect.objectContaining({organization: "engineering"}));
});

test("starts full sync when config is enabled", async() => {
  mockConfig({isEnabled: true});

  render(<WecomOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);
  fireEvent.click(await screen.findByText("开始全量同步"));

  await flushPromises();
  expect(wecomBackendMock.startWecomOrganizationSyncRun).toHaveBeenCalledWith("engineering");
  expect(Setting.showMessage).toHaveBeenCalledWith("success", "同步任务已启动");
});

test("previews WeCom sync impact in a compact modal", async() => {
  mockConfig({isEnabled: true});
  wecomBackendMock.dryRunWecomOrganizationSyncPreview.mockResolvedValue({
    status: "ok",
    data: {
      status: "succeeded",
      source: {organization: "engineering", corpAlias: "corp-safe", previewedAt: "2026-06-18T10:00:00Z"},
      snapshotStats: {departmentCount: 3, userCount: 4, relationshipCount: 5},
      diff: {
        departments: {toCreate: 1, toUpdate: 2, toSoftDisable: 3},
        users: {toCreate: 4, toUpdate: 5, toSoftDisable: 6},
        relationships: {toCreate: 7, toUpdate: 8, toSoftDisable: 9},
      },
      reasonCounts: {would_soft_disable: 3},
      historyWarning: "dry-run history could not be recorded",
    },
  });

  render(<WecomOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);
  fireEvent.click(await screen.findByText("预览影响"));

  expect(wecomBackendMock.dryRunWecomOrganizationSyncPreview).toHaveBeenCalledWith("engineering");
  expect(await screen.findByText("预览影响结果")).toBeInTheDocument();
  expect(screen.getByText("预览通过")).toBeInTheDocument();
  expect(screen.getByText("快照：部门 3 / 用户 4 / 关系 5")).toBeInTheDocument();
  expect(screen.getByText("来源：corp-safe")).toBeInTheDocument();
  expect(screen.getByText("历史记录未写入，但预览结果仍可用于本次判断。")).toBeInTheDocument();
  expect(screen.getAllByText("新 1 / 更 2 / 禁 3").length).toBeGreaterThan(0);
  expect(screen.getAllByText("新 4 / 更 5 / 禁 6").length).toBeGreaterThan(0);
  expect(screen.getAllByText("新 7 / 更 8 / 禁 9").length).toBeGreaterThan(0);
});

test("reloads WeCom preview after the hidden modal child tree is destroyed", async() => {
  mockConfig({isEnabled: true});
  const previewResponse = (corpAlias: string) => ({
    status: "ok",
    data: {
      status: "succeeded",
      source: {organization: "engineering", corpAlias, previewedAt: "2026-06-18T10:00:00Z"},
      snapshotStats: {departmentCount: 1, userCount: 1, relationshipCount: 1},
      diff: {
        departments: {toCreate: 0, toUpdate: 0, toSoftDisable: 0},
        users: {toCreate: 0, toUpdate: 0, toSoftDisable: 0},
        relationships: {toCreate: 0, toUpdate: 0, toSoftDisable: 0},
      },
      reasonCounts: {},
    },
  });
  wecomBackendMock.dryRunWecomOrganizationSyncPreview
    .mockResolvedValueOnce(previewResponse("preview-first"))
    .mockResolvedValueOnce(previewResponse("preview-second"));

  render(<WecomOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);
  const openPreview = await screen.findByText("预览影响");
  fireEvent.click(openPreview);
  expect(await screen.findByText("来源：preview-first")).toBeInTheDocument();

  fireEvent.click(getModalCloseButton("预览影响结果"));
  await waitFor(() => expect(screen.queryByText("预览影响结果")).toBeNull());
  expect(screen.queryByText("来源：preview-first")).toBeNull();

  fireEvent.click(openPreview);
  expect(await screen.findByText("来源：preview-second")).toBeInTheDocument();
  expect(wecomBackendMock.dryRunWecomOrganizationSyncPreview).toHaveBeenCalledTimes(2);
});

test("shows WeCom dry-run history empty and error states in a modal", async() => {
  mockConfig({isEnabled: true});
  wecomBackendMock.getWecomOrganizationSyncDryRunHistories.mockResolvedValueOnce({status: "ok", data: []});

  render(<WecomOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);
  fireEvent.click(await screen.findByText("预览历史"));

  expect(wecomBackendMock.getWecomOrganizationSyncDryRunHistories).toHaveBeenCalledWith("engineering", {topN: 10});
  expect(await screen.findByText("预览历史记录")).toBeInTheDocument();
  expect(screen.getByText("暂无预览历史")).toBeInTheDocument();

  wecomBackendMock.getWecomOrganizationSyncDryRunHistories.mockResolvedValueOnce({status: "error", msg: "history unavailable"});
  const refreshHistoryButton = screen.getByText("刷新历史").closest("button");
  await waitFor(() => expect(refreshHistoryButton).not.toBeDisabled());
  fireEvent.click(refreshHistoryButton);
  await waitFor(() => expect(wecomBackendMock.getWecomOrganizationSyncDryRunHistories).toHaveBeenCalledTimes(2));

  expect(await screen.findByText("预览历史加载失败，请稍后重试。")).toBeInTheDocument();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "预览历史加载失败：history unavailable");
});

test("opens WeCom dry-run history detail with long safe summary", async() => {
  mockConfig({isEnabled: true});
  const longSummary = "permission denied ".repeat(20);
  wecomBackendMock.getWecomOrganizationSyncDryRunHistories.mockResolvedValue({
    status: "ok",
    data: [{
      name: "history-1",
      status: "failed",
      createdAt: "2026-06-18T10:00:00Z",
      diagnosticAlias: "contact_permission_missing",
      corpAlias: "corp-safe",
      snapshotDepartmentCount: 1,
      snapshotUserCount: 2,
      snapshotRelationshipCount: 3,
      departmentToCreate: 0,
      departmentToUpdate: 0,
      departmentToSoftDisable: 0,
      userToCreate: 0,
      userToUpdate: 0,
      userToSoftDisable: 0,
      relationshipToCreate: 0,
      relationshipToUpdate: 0,
      relationshipToSoftDisable: 0,
      safeSummary: "short summary",
    }],
  });
  wecomBackendMock.getWecomOrganizationSyncDryRunHistory.mockResolvedValue({
    status: "ok",
    data: {
      name: "history-1",
      status: "failed",
      createdAt: "2026-06-18T10:00:00Z",
      diagnosticAlias: "contact_permission_missing",
      corpAlias: "corp-safe",
      snapshotDepartmentCount: 1,
      snapshotUserCount: 2,
      snapshotRelationshipCount: 3,
      relationshipToCreate: 0,
      relationshipToUpdate: 0,
      relationshipToSoftDisable: 0,
      safeSummary: longSummary,
      redactionApplied: true,
      retentionDays: 90,
    },
  });

  render(<WecomOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);
  fireEvent.click(await screen.findByText("预览历史"));
  fireEvent.click(await screen.findByText("查看详情"));

  expect(wecomBackendMock.getWecomOrganizationSyncDryRunHistory).toHaveBeenCalledWith("engineering", "history-1");
  expect(await screen.findByText("预览历史详情")).toBeInTheDocument();
  expect(screen.getByText("contact_permission_missing")).toBeInTheDocument();
  expect(await screen.findByText(longSummary.trim())).toBeInTheDocument();
  expect(screen.getByText("脱敏：已应用")).toBeInTheDocument();
  expect(screen.getByText("保留：90 天")).toBeInTheDocument();
});

test("refreshes WeCom history and detail when hidden modals reopen", async() => {
  mockConfig({isEnabled: true});
  const history = {
    name: "history-reopen",
    status: "failed",
    createdAt: "2026-06-18T10:00:00Z",
    diagnosticAlias: "safe-diagnostic",
    corpAlias: "corp-safe",
    snapshotDepartmentCount: 1,
    snapshotUserCount: 1,
    snapshotRelationshipCount: 1,
    departmentToCreate: 0,
    departmentToUpdate: 0,
    departmentToSoftDisable: 0,
    userToCreate: 0,
    userToUpdate: 0,
    userToSoftDisable: 0,
    relationshipToCreate: 0,
    relationshipToUpdate: 0,
    relationshipToSoftDisable: 0,
    safeSummary: "safe summary",
  };
  wecomBackendMock.getWecomOrganizationSyncDryRunHistories.mockResolvedValue({status: "ok", data: [history]});
  wecomBackendMock.getWecomOrganizationSyncDryRunHistory.mockResolvedValue({status: "ok", data: history});

  render(<WecomOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);
  const openHistory = await screen.findByText("预览历史");
  fireEvent.click(openHistory);
  expect(await screen.findByText("预览历史记录")).toBeInTheDocument();
  expect(wecomBackendMock.getWecomOrganizationSyncDryRunHistories).toHaveBeenCalledTimes(1);

  fireEvent.click(getModalCloseButton("预览历史记录"));
  await waitFor(() => expect(screen.queryByText("预览历史记录")).toBeNull());
  fireEvent.click(openHistory);
  expect(await screen.findByText("预览历史记录")).toBeInTheDocument();
  expect(wecomBackendMock.getWecomOrganizationSyncDryRunHistories).toHaveBeenCalledTimes(2);

  fireEvent.click(await screen.findByText("查看详情"));
  expect(await screen.findByText("预览历史详情")).toBeInTheDocument();
  expect(wecomBackendMock.getWecomOrganizationSyncDryRunHistory).toHaveBeenCalledTimes(1);

  fireEvent.click(getModalCloseButton("预览历史详情"));
  await waitFor(() => expect(screen.queryByText("预览历史详情")).toBeNull());
  fireEvent.click(await screen.findByText("查看详情"));
  expect(await screen.findByText("预览历史详情")).toBeInTheDocument();
  expect(wecomBackendMock.getWecomOrganizationSyncDryRunHistory).toHaveBeenCalledTimes(2);
});

test("disables start sync action while a run is already active", async() => {
  mockConfig({isEnabled: true});
  wecomBackendMock.getWecomOrganizationSyncRuns.mockResolvedValue({
    status: "ok",
    data: [{name: "run-running", status: "running", stage: "fetching"}],
    data2: 1,
  });

  render(<WecomOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);

  const syncButtonLabel = await screen.findByText("同步进行中");
  expect(syncButtonLabel.closest("button")).toBeDisabled();
  expect(wecomBackendMock.startWecomOrganizationSyncRun).not.toHaveBeenCalled();
});

test("refreshes sync runs when refresh button is clicked", async() => {
  mockConfig({isEnabled: true});
  let resolveRefresh: (value: unknown) => void = () => {};
  const refreshPromise = new Promise(resolve => {
    resolveRefresh = resolve;
  });
  wecomBackendMock.getWecomOrganizationSyncRuns
    .mockResolvedValueOnce({status: "ok", data: [], data2: 0})
    .mockReturnValueOnce(refreshPromise);

  render(<WecomOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);

  const refreshButton = await screen.findByText("刷新");
  expect(wecomBackendMock.getWecomOrganizationSyncRuns).toHaveBeenCalledTimes(1);

  fireEvent.click(refreshButton);
  expect(refreshButton.closest("button")).toHaveClass("ant-btn-loading");

  resolveRefresh({status: "ok", data: [], data2: 0});
  await flushPromises();
  expect(wecomBackendMock.getWecomOrganizationSyncRuns).toHaveBeenCalledTimes(2);
  expect(screen.getByText(/当前无运行中任务，可手动刷新同步记录/)).toBeInTheDocument();
});

test("loads the selected history page when pagination changes", async() => {
  mockConfig({isEnabled: true});
  wecomBackendMock.getWecomOrganizationSyncRuns
    .mockResolvedValueOnce({
      status: "ok",
      data: Array.from({length: 10}, (_, index) => ({name: `run-page-1-${index}`, status: "succeeded", stage: "finalizing"})),
      data2: 11,
    })
    .mockResolvedValueOnce({
      status: "ok",
      data: [{name: "run-page-2-0", status: "succeeded", stage: "finalizing"}],
      data2: 11,
    });

  const {container} = render(<WecomOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);

  await flushPromises();
  expect(container.querySelector("tbody tr[data-row-key='run-page-1-0']")).toBeInTheDocument();
  expect(container.querySelector("tbody tr[data-row-key='run-page-1-0'] td:first-child")?.textContent).toContain("1");
  expect(screen.queryByText("run-page-1-0")).not.toBeInTheDocument();

  const page2Item = container.querySelector(".ant-pagination-item-2");
  fireEvent.click(page2Item?.querySelector("a") || page2Item);

  await flushPromises();
  expect(wecomBackendMock.getWecomOrganizationSyncRuns).toHaveBeenNthCalledWith(2, "engineering", 2, 10);
  expect(container.querySelector("tbody tr[data-row-key='run-page-2-0'] td:first-child")?.textContent).toContain("11");
  expect(screen.queryByText("run-page-2-0")).not.toBeInTheDocument();
});

test("auto refreshes while a sync run is running and stops after terminal status", async() => {
  jestValue.useFakeTimers();
  mockConfig({isEnabled: true});
  wecomBackendMock.getWecomOrganizationSyncRuns
    .mockResolvedValueOnce({
      status: "ok",
      data: [{name: "run-running", status: "running", stage: "fetching"}],
      data2: 1,
    })
    .mockResolvedValueOnce({
      status: "ok",
      data: [{name: "run-running", status: "succeeded", stage: "finalizing"}],
      data2: 1,
    });

  const {container} = render(<WecomOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);

  await act(async() => {
    await flushMicrotasks();
  });
  expectTableColumnHeader(container, "序号");
  expect(screen.queryByText("run-running")).not.toBeInTheDocument();
  expect(screen.getByText(/检测到运行中任务，自动每 3 秒刷新/)).toBeInTheDocument();
  expect(wecomBackendMock.getWecomOrganizationSyncRuns).toHaveBeenCalledTimes(1);

  await act(async() => {
    jestValue.advanceTimersByTime(3000);
    await flushMicrotasks();
  });

  expect(wecomBackendMock.getWecomOrganizationSyncRuns).toHaveBeenCalledTimes(2);
  expect(screen.getByText(/当前无运行中任务，可手动刷新同步记录/)).toBeInTheDocument();

  await act(async() => {
    jestValue.advanceTimersByTime(3000);
    await flushMicrotasks();
  });

  expect(wecomBackendMock.getWecomOrganizationSyncRuns).toHaveBeenCalledTimes(2);
});

test("switches to resolved business organization after saving built-in config", async() => {
  mockConfig({organization: "built-in", corpId: "ww123", addressBookSecret: "secret"});
  wecomBackendMock.saveWecomOrganizationSyncConfig.mockResolvedValue({
    status: "ok",
    data: {
      organization: "wecom-ww123",
      config: {
        organization: "wecom-ww123",
        corpId: "ww123",
        addressBookSecret: "***",
        isEnabled: true,
        softDisableMissingData: true,
      },
    },
  });

  render(<WecomOrganizationSyncPage account={{owner: "built-in", isAdmin: true}} />);
  fireEvent.click(await screen.findByText("保存"));

  await flushPromises();
  expect(wecomBackendMock.getWecomOrganizationSyncConfig).toHaveBeenCalledWith("wecom-ww123");
  expect(wecomBackendMock.getWecomOrganizationSyncRuns).toHaveBeenCalledWith("wecom-ww123", 1, 10);
  expect(Setting.showMessage).toHaveBeenCalledWith("success", expect.stringContaining("wecom-ww123"));
});

test("refreshes runs and shows info when backend reports a duplicate running sync", async() => {
  mockConfig({isEnabled: true});
  wecomBackendMock.getWecomOrganizationSyncRuns
    .mockResolvedValueOnce({status: "ok", data: [], data2: 0})
    .mockResolvedValueOnce({
      status: "ok",
      data: [{name: "run-running", status: "running", stage: "fetching"}],
      data2: 1,
    });
  wecomBackendMock.startWecomOrganizationSyncRun.mockResolvedValue({
    status: "error",
    msg: "wecom organization sync run is already running",
  });

  render(<WecomOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);
  fireEvent.click(await screen.findByText("开始全量同步"));

  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("info", "已有同步任务在运行，已刷新同步记录。");
  expect(wecomBackendMock.getWecomOrganizationSyncRuns).toHaveBeenCalledTimes(2);
  expect(screen.getByText(/检测到运行中任务，自动每 3 秒刷新/)).toBeInTheDocument();
});
