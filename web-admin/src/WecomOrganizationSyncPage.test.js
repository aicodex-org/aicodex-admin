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
import {fireEvent, render, screen} from "@testing-library/react";
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
  expect(screen.getByText("通讯录读取权限要求")).toBeInTheDocument();
  expect(screen.getByText("开始全量同步")).toBeInTheDocument();
  expect(Setting.showMessage).not.toHaveBeenCalled();
});

test("refreshes after account organization is loaded", async() => {
  mockConfig({organization: "built-in"});
  const {rerender} = render(<WecomOrganizationSyncPage account={{owner: "", isAdmin: true}} />);

  expect(screen.queryByText("企业微信组织架构同步")).not.toBeInTheDocument();
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
  expect(screen.queryByTestId("organization-select")).not.toBeInTheDocument();
  expect(screen.getByDisplayValue("保存后按 Corp ID 自动创建或切换业务组织")).toBeInTheDocument();
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
      {name: "run-succeeded", status: "succeeded"},
      {name: "run-failed", status: "failed"},
      {name: "run-partial", status: "partial"},
    ],
    data2: 4,
  });

  render(<WecomOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);

  expect(await screen.findByText("run-running")).toBeInTheDocument();
  expect(screen.getByText("运行中")).toBeInTheDocument();
  expect(screen.getByText("成功")).toBeInTheDocument();
  expect(screen.getByText("失败")).toBeInTheDocument();
  expect(screen.getByText("部分成功")).toBeInTheDocument();
  expect(screen.getByText("1/2/3")).toBeInTheDocument();
  expect(screen.getByText("4/5/6")).toBeInTheDocument();
  expect(screen.getByText("safe summary")).toBeInTheDocument();
  expect(screen.queryByText(/0001-01-01/)).not.toBeInTheDocument();
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

test("shows duplicate running error returned by backend", async() => {
  mockConfig({isEnabled: true});
  WecomOrganizationSyncBackend.startWecomOrganizationSyncRun.mockResolvedValue({
    status: "error",
    msg: "sync already running",
  });

  render(<WecomOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);
  fireEvent.click(await screen.findByText("开始全量同步"));

  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("sync already running"));
});
