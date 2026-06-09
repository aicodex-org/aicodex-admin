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
import {act, fireEvent, render, screen} from "@testing-library/react";
import * as Setting from "./Setting";
import * as WecomOrganizationSyncBackend from "./backend/WecomOrganizationSyncBackend";
import WecomOrganizationSyncPage from "./WecomOrganizationSyncPage";

jest.mock("./backend/WecomOrganizationSyncBackend", () => ({
  getWecomOrganizationSyncConfig: jest.fn(),
  saveWecomOrganizationSyncConfig: jest.fn(),
  testWecomOrganizationSyncConfig: jest.fn(),
  startWecomOrganizationSyncRun: jest.fn(),
  getWecomOrganizationSyncRuns: jest.fn(),
}));

jest.mock("./common/select/OrganizationSelect", () => (props) => {
  const organizations = [
    {value: "built-in", label: "Built-in Organization"},
    {value: "engineering", label: "engineering"},
  ].filter(organization => !(props.excludedOrganizations || []).includes(organization.value));
  return (
    <select data-testid="organization-select" value={props.initValue} onChange={event => props.onChange(event.target.value)}>
      {organizations.map(organization => <option key={organization.value} value={organization.value}>{organization.label}</option>)}
    </select>
  );
});

const mockMatchMedia = query => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: jest.fn(),
  removeListener: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
});

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: mockMatchMedia,
  });
  localStorage.removeItem("organization");
  jest.spyOn(Setting, "showMessage").mockImplementation(() => {});
  mockConfig();
  WecomOrganizationSyncBackend.getWecomOrganizationSyncRuns.mockResolvedValue({status: "ok", data: [], data2: 0});
  WecomOrganizationSyncBackend.testWecomOrganizationSyncConfig.mockResolvedValue({status: "ok", data: {missingFields: [], departmentCount: 0, userCount: 0}});
  WecomOrganizationSyncBackend.startWecomOrganizationSyncRun.mockResolvedValue({status: "ok", data: {name: "run-1"}});
});

afterEach(() => {
  jest.useRealTimers();
  Setting.showMessage.mockRestore();
  jest.clearAllMocks();
});

function mockConfig(config = {}) {
  WecomOrganizationSyncBackend.getWecomOrganizationSyncConfig.mockResolvedValue({
    status: "ok",
    data: {
      organization: "engineering",
      isConfigured: false,
      config: {
        organization: "engineering",
        corpId: "",
        addressBookSecret: "",
        isEnabled: false,
        softDisableMissingData: true,
        ...config,
      },
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
  render(<WecomOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);

  expect(await screen.findByText("企业微信组织架构同步")).toBeInTheDocument();
  expect(screen.getByText("同步目标组织")).toBeInTheDocument();
  expect(screen.getByText("新建组织")).toBeInTheDocument();
  expect(screen.queryByText("Built-in Organization")).not.toBeInTheDocument();
  expect(screen.getByText("选择要绑定企业微信通讯录的 aicodex-admin 组织。不同组织的 Corp ID、Secret 和同步记录互不混用。")).toBeInTheDocument();
  expect(screen.getByText("企业 ID（Corp ID）")).toBeInTheDocument();
  expect(screen.getByText("自建应用 Secret")).toBeInTheDocument();
  expect(screen.getByText("同步选项")).toBeInTheDocument();
  expect(screen.getByText("启用同步")).toBeInTheDocument();
  expect(screen.getByText("定时同步")).toBeInTheDocument();
  expect(screen.getByText("启用定时同步")).toBeInTheDocument();
  expect(screen.getByText("Cron 表达式")).toBeInTheDocument();
  expect(screen.getByText("时区")).toBeInTheDocument();
  expect(screen.getByText("通讯录读取权限要求")).toBeInTheDocument();
  expect(screen.getByText("开始全量同步")).toBeInTheDocument();
  expect(Setting.showMessage).not.toHaveBeenCalled();
});

test("saves scheduled sync settings from the config form", async() => {
  mockConfig({
    isEnabled: true,
    scheduleEnabled: false,
    scheduleCron: "0 2 * * *",
    scheduleTimezone: "Asia/Shanghai",
  });
  WecomOrganizationSyncBackend.saveWecomOrganizationSyncConfig.mockResolvedValue({
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
  const scheduleSwitch = screen.getByText("启用定时同步").closest(".ant-space").querySelector("button");
  fireEvent.click(scheduleSwitch);
  fireEvent.change(screen.getByDisplayValue("0 2 * * *"), {target: {value: "*/15 * * * *"}});
  fireEvent.change(screen.getByDisplayValue("Asia/Shanghai"), {target: {value: "UTC"}});
  fireEvent.click(screen.getByText("保存"));

  await flushPromises();
  expect(WecomOrganizationSyncBackend.saveWecomOrganizationSyncConfig).toHaveBeenCalledWith(expect.objectContaining({
    scheduleEnabled: true,
    scheduleCron: "*/15 * * * *",
    scheduleTimezone: "UTC",
  }));
});

test("refreshes after account organization is loaded", async() => {
  mockConfig({organization: "built-in"});
  const {rerender} = render(<WecomOrganizationSyncPage account={{owner: "", isAdmin: true}} />);

  expect(screen.getByText("企业微信组织架构同步")).toBeInTheDocument();
  expect(screen.getByText("正在加载企业微信同步页面...")).toBeInTheDocument();
  expect(WecomOrganizationSyncBackend.getWecomOrganizationSyncConfig).not.toHaveBeenCalled();

  rerender(<WecomOrganizationSyncPage account={{owner: "built-in", isAdmin: true}} />);

  expect(await screen.findByText("企业微信组织架构同步")).toBeInTheDocument();
  expect(WecomOrganizationSyncBackend.getWecomOrganizationSyncConfig).toHaveBeenCalledWith("built-in");
  expect(WecomOrganizationSyncBackend.getWecomOrganizationSyncRuns).toHaveBeenCalledWith("built-in", 1, 10);
});

test("refreshes when account object is filled in place", async() => {
  mockConfig({organization: "built-in"});
  const account = {owner: "", isAdmin: true};
  const {rerender} = render(<WecomOrganizationSyncPage account={account} />);

  account.owner = "built-in";
  rerender(<WecomOrganizationSyncPage account={account} />);

  expect(await screen.findByText("企业微信组织架构同步")).toBeInTheDocument();
  expect(WecomOrganizationSyncBackend.getWecomOrganizationSyncConfig).toHaveBeenCalledWith("built-in");
  expect(WecomOrganizationSyncBackend.getWecomOrganizationSyncRuns).toHaveBeenCalledWith("built-in", 1, 10);
});

test("falls back to account owner when stored organization is blank", async() => {
  localStorage.setItem("organization", "");
  mockConfig({organization: "built-in"});

  render(<WecomOrganizationSyncPage account={{owner: "built-in", isAdmin: true}} />);

  expect(await screen.findByText("企业微信组织架构同步")).toBeInTheDocument();
  expect(screen.getByTestId("organization-select")).toBeInTheDocument();
  expect(WecomOrganizationSyncBackend.getWecomOrganizationSyncConfig).toHaveBeenCalledWith("built-in");
  expect(WecomOrganizationSyncBackend.getWecomOrganizationSyncRuns).toHaveBeenCalledWith("built-in", 1, 10);
});

test("navigates to organization list when creating sync target organization", async() => {
  const history = {push: jest.fn()};
  render(<WecomOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} history={history} />);

  fireEvent.click(await screen.findByText("新建组织"));

  expect(history.push).toHaveBeenCalledWith("/organizations");
});

test("renders sync run history with status, counts, and safe error summary", async() => {
  WecomOrganizationSyncBackend.getWecomOrganizationSyncRuns.mockResolvedValue({
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

  render(<WecomOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);

  expect(await screen.findByText("run-running")).toBeInTheDocument();
  expect(screen.getByText("运行中")).toBeInTheDocument();
  expect(screen.getByText("成功")).toBeInTheDocument();
  expect(screen.getByText("失败")).toBeInTheDocument();
  expect(screen.getByText("部分成功")).toBeInTheDocument();
  expect(screen.getByText("状态")).toBeInTheDocument();
  expect(screen.getByText("触发方式")).toBeInTheDocument();
  expect(screen.getByText("手动")).toBeInTheDocument();
  expect(screen.getByText("定时")).toBeInTheDocument();
  expect(screen.queryByText("Status")).not.toBeInTheDocument();
  expect(screen.getByText("部门（新增 / 更新 / 禁用）")).toBeInTheDocument();
  expect(screen.getByText("用户（新增 / 更新 / 禁用）")).toBeInTheDocument();
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

test("shows address book permission result after connection test", async() => {
  WecomOrganizationSyncBackend.testWecomOrganizationSyncConfig.mockResolvedValue({
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
  expect(WecomOrganizationSyncBackend.testWecomOrganizationSyncConfig).toHaveBeenCalledWith(expect.objectContaining({organization: "engineering"}));
});

test("starts full sync when config is enabled", async() => {
  mockConfig({isEnabled: true});

  render(<WecomOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);
  fireEvent.click(await screen.findByText("开始全量同步"));

  await flushPromises();
  expect(WecomOrganizationSyncBackend.startWecomOrganizationSyncRun).toHaveBeenCalledWith("engineering");
  expect(Setting.showMessage).toHaveBeenCalledWith("success", "同步任务已启动");
});

test("disables start sync action while a run is already active", async() => {
  mockConfig({isEnabled: true});
  WecomOrganizationSyncBackend.getWecomOrganizationSyncRuns.mockResolvedValue({
    status: "ok",
    data: [{name: "run-running", status: "running", stage: "fetching"}],
    data2: 1,
  });

  render(<WecomOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);

  const syncButtonLabel = await screen.findByText("同步进行中");
  expect(syncButtonLabel.closest("button")).toBeDisabled();
  expect(WecomOrganizationSyncBackend.startWecomOrganizationSyncRun).not.toHaveBeenCalled();
});

test("refreshes sync runs when refresh button is clicked", async() => {
  mockConfig({isEnabled: true});
  let resolveRefresh;
  const refreshPromise = new Promise(resolve => {
    resolveRefresh = resolve;
  });
  WecomOrganizationSyncBackend.getWecomOrganizationSyncRuns
    .mockResolvedValueOnce({status: "ok", data: [], data2: 0})
    .mockReturnValueOnce(refreshPromise);

  render(<WecomOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);

  const refreshButton = await screen.findByText("刷新");
  expect(WecomOrganizationSyncBackend.getWecomOrganizationSyncRuns).toHaveBeenCalledTimes(1);

  fireEvent.click(refreshButton);
  expect(refreshButton.closest("button")).toHaveClass("ant-btn-loading");

  resolveRefresh({status: "ok", data: [], data2: 0});
  await flushPromises();
  expect(WecomOrganizationSyncBackend.getWecomOrganizationSyncRuns).toHaveBeenCalledTimes(2);
  expect(screen.getByText(/当前无运行中任务，可手动刷新同步记录/)).toBeInTheDocument();
});

test("loads the selected history page when pagination changes", async() => {
  mockConfig({isEnabled: true});
  WecomOrganizationSyncBackend.getWecomOrganizationSyncRuns
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

  expect(await screen.findByText("run-page-1-0")).toBeInTheDocument();

  const page2Item = container.querySelector(".ant-pagination-item-2");
  fireEvent.click(page2Item.querySelector("a") || page2Item);

  await flushPromises();
  expect(WecomOrganizationSyncBackend.getWecomOrganizationSyncRuns).toHaveBeenNthCalledWith(2, "engineering", 2, 10);
  expect(await screen.findByText("run-page-2-0")).toBeInTheDocument();
});

test("auto refreshes while a sync run is running and stops after terminal status", async() => {
  jest.useFakeTimers();
  mockConfig({isEnabled: true});
  WecomOrganizationSyncBackend.getWecomOrganizationSyncRuns
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

  render(<WecomOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);

  await act(async() => {
    await flushMicrotasks();
  });
  expect(screen.getByText("run-running")).toBeInTheDocument();
  expect(screen.getByText(/检测到运行中任务，自动每 3 秒刷新/)).toBeInTheDocument();
  expect(WecomOrganizationSyncBackend.getWecomOrganizationSyncRuns).toHaveBeenCalledTimes(1);

  await act(async() => {
    jest.advanceTimersByTime(3000);
    await flushMicrotasks();
  });

  expect(WecomOrganizationSyncBackend.getWecomOrganizationSyncRuns).toHaveBeenCalledTimes(2);
  expect(screen.getByText(/当前无运行中任务，可手动刷新同步记录/)).toBeInTheDocument();

  await act(async() => {
    jest.advanceTimersByTime(3000);
    await flushMicrotasks();
  });

  expect(WecomOrganizationSyncBackend.getWecomOrganizationSyncRuns).toHaveBeenCalledTimes(2);
});

test("switches to resolved business organization after saving built-in config", async() => {
  mockConfig({organization: "built-in", corpId: "ww123", addressBookSecret: "secret"});
  WecomOrganizationSyncBackend.saveWecomOrganizationSyncConfig.mockResolvedValue({
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
  expect(WecomOrganizationSyncBackend.getWecomOrganizationSyncConfig).toHaveBeenCalledWith("wecom-ww123");
  expect(WecomOrganizationSyncBackend.getWecomOrganizationSyncRuns).toHaveBeenCalledWith("wecom-ww123", 1, 10);
  expect(Setting.showMessage).toHaveBeenCalledWith("success", expect.stringContaining("wecom-ww123"));
});

test("refreshes runs and shows info when backend reports a duplicate running sync", async() => {
  mockConfig({isEnabled: true});
  WecomOrganizationSyncBackend.getWecomOrganizationSyncRuns
    .mockResolvedValueOnce({status: "ok", data: [], data2: 0})
    .mockResolvedValueOnce({
      status: "ok",
      data: [{name: "run-running", status: "running", stage: "fetching"}],
      data2: 1,
    });
  WecomOrganizationSyncBackend.startWecomOrganizationSyncRun.mockResolvedValue({
    status: "error",
    msg: "wecom organization sync run is already running",
  });

  render(<WecomOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);
  fireEvent.click(await screen.findByText("开始全量同步"));

  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("info", "已有同步任务在运行，已刷新同步记录。");
  expect(WecomOrganizationSyncBackend.getWecomOrganizationSyncRuns).toHaveBeenCalledTimes(2);
  expect(screen.getByText(/检测到运行中任务，自动每 3 秒刷新/)).toBeInTheDocument();
});
