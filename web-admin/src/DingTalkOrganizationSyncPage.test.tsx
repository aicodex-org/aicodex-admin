/* eslint-env jest */

import React from "react";
import {expect as jestExpect, jest as jestValue} from "@jest/globals";
import {render} from "@testing-library/react";
import i18next from "i18next";
import * as Setting from "./Setting";
import * as DingTalkOrganizationSyncBackend from "./backend/DingTalkOrganizationSyncBackend";
import * as OrganizationBackend from "./backend/OrganizationBackend";
import DingTalkOrganizationSyncPage from "./DingTalkOrganizationSyncPage";

declare const jest: typeof jestValue;

type DomMatcherResult = ReturnType<typeof jestExpect> & {
  toBeInTheDocument: () => void;
  toHaveAttribute: (attr: string, value?: unknown) => void;
  toBeDisabled: () => void;
  not: ReturnType<typeof jestExpect> & {
    toBeInTheDocument: () => void;
    toHaveBeenCalled: () => void;
    toBeDisabled: () => void;
  };
};

type TestExpect = {
  (actual: unknown): DomMatcherResult;
  objectContaining: typeof jestExpect.objectContaining;
  stringContaining: typeof jestExpect.stringContaining;
};

const expect = jestExpect as unknown as TestExpect;

jest.mock("./backend/DingTalkOrganizationSyncBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    getDingTalkOrganizationSyncConfig: factoryJest.fn(),
    saveDingTalkOrganizationSyncConfig: factoryJest.fn(),
    testDingTalkOrganizationSyncConfig: factoryJest.fn(),
    startDingTalkOrganizationSyncRun: factoryJest.fn(),
    getDingTalkOrganizationSyncRuns: factoryJest.fn(),
    getDingTalkOrganizationSyncRun: factoryJest.fn(),
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

jest.mock("./common/select/OrganizationSelect", () => function OrganizationSelectMock(props: {initValue?: string; excludedOrganizations?: string[]; onChange?: (value: string) => void; onOrganizationsLoaded?: (organizations: Array<{name: string; displayName: string}>) => void}) {
  const mockReact = require("react") as {useEffect: (effect: () => void, deps?: unknown[]) => void};
  mockReact.useEffect(() => {
    props.onOrganizationsLoaded?.([
      {name: "built-in", displayName: "Built-in Organization"},
      {name: "engineering", displayName: "测试组织"},
      {name: "wecom-occupied", displayName: "WeCom Occupied"},
      {name: "support", displayName: "Support"},
    ]);
  }, [props.onOrganizationsLoaded]);
  const organizations = [
    {value: "built-in", label: "Built-in Organization"},
    {value: "engineering", label: "engineering"},
    {value: "wecom-occupied", label: "wecom-occupied"},
    {value: "support", label: "support"},
  ].filter(organization => !(props.excludedOrganizations || []).includes(organization.value));
  return (
    <select data-testid="organization-select" value={props.initValue || ""} onChange={event => props.onChange?.(event.target.value)}>
      {organizations.map(organization => <option key={organization.value} value={organization.value}>{organization.label}</option>)}
    </select>
  );
});

type LooseMock = {
  (...args: unknown[]): unknown;
  mockResolvedValue: (value: unknown) => LooseMock;
  mockResolvedValueOnce: (value: unknown) => LooseMock;
  mockRejectedValueOnce: (value: unknown) => LooseMock;
};
type DingTalkBackendMock = Record<keyof typeof DingTalkOrganizationSyncBackend, LooseMock>;
type OrganizationBackendMock = Record<keyof typeof OrganizationBackend, LooseMock>;

const dingtalkBackendMock = DingTalkOrganizationSyncBackend as unknown as DingTalkBackendMock;
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
    getByTestId: (testId: string) => HTMLElement;
  };
};

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
  localStorage.removeItem("dingtalk-org-sync:lastOrganization");
  jestValue.spyOn(Setting, "showMessage").mockImplementation(() => {});
  jestValue.spyOn(Setting, "getRandomName").mockReturnValue("abc123");
  organizationBackendMock.addOrganization.mockResolvedValue({status: "ok"});
  organizationBackendMock.updateOrganization.mockResolvedValue({status: "ok"});
  organizationBackendMock.deleteOrganization.mockResolvedValue({status: "ok"});
  mockConfig();
  dingtalkBackendMock.getDingTalkOrganizationSyncRuns.mockResolvedValue({status: "ok", data: [], data2: 0});
  dingtalkBackendMock.testDingTalkOrganizationSyncConfig.mockResolvedValue({
    status: "ok",
    data: {
      accessTokenOk: true,
      departmentSnapshotOk: true,
      userSnapshotOk: true,
      departmentCount: 2,
      userCount: 3,
      missingFields: [],
    },
  });
  dingtalkBackendMock.startDingTalkOrganizationSyncRun.mockResolvedValue({status: "ok", data: {runId: "run-1"}});
});

afterEach(() => {
  jestValue.useRealTimers();
  jestValue.restoreAllMocks();
  jestValue.clearAllMocks();
});

function mockConfig(config: Record<string, unknown> = {}, response: Record<string, unknown> = {}) {
  dingtalkBackendMock.getDingTalkOrganizationSyncConfig.mockResolvedValue({
    status: "ok",
    data: {
      organization: "engineering",
      isConfigured: true,
      defaultOrganization: "engineering",
      config: {
        organization: "engineering",
        appKey: "ding-app",
        appSecret: "***",
        isEnabled: true,
        softDisableMissingData: true,
        scheduleEnabled: false,
        scheduleCron: "0 2 * * *",
        scheduleTimezone: "Asia/Shanghai",
        ...config,
      },
      ...response,
    },
  });
}

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}

test("renders DingTalk organization sync configuration and empty formal records", async() => {
  const {container} = render(<DingTalkOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);

  expect(await screen.findByText("钉钉组织架构同步")).toBeInTheDocument();
  expect(screen.getByAltText("DingTalk provider logo")).toHaveAttribute("src", expect.stringContaining("/img/social_dingtalk.png"));
  expect(screen.getByText("同步目标组织")).toBeInTheDocument();
  expect(screen.queryByText("Built-in Organization")).not.toBeInTheDocument();
  expect(screen.getByText("选择要绑定钉钉通讯录的 aicodex-admin 组织。不同组织的 AppKey、AppSecret 和同步记录互不混用。")).toBeInTheDocument();
  expect(screen.getByText("AppKey")).toBeInTheDocument();
  expect(screen.getByText("AppSecret")).toBeInTheDocument();
  expect(screen.getByText("同步选项")).toBeInTheDocument();
  expect(screen.getByText("启用同步")).toBeInTheDocument();
  expect(screen.getByText("定时同步")).toBeInTheDocument();
  expect(screen.getByText("通讯录读取权限要求")).toBeInTheDocument();
  expect(screen.getByText("开始全量同步")).toBeInTheDocument();
  expect(screen.getByText("暂无同步记录")).toBeInTheDocument();
  expect(container.querySelector(".dingtalk-organization-sync-options")).not.toBeNull();
  const permissionAlert = container.querySelector(".dingtalk-organization-sync-permission-alert");
  const permissionAlertRow = permissionAlert?.closest(".organization-sync-permission-alert-row");
  expect(permissionAlert).not.toBeNull();
  expect(permissionAlertRow).not.toBeNull();
  expect(permissionAlertRow?.classList.contains("ant-col-24")).toBe(true);
  expect(dingtalkBackendMock.getDingTalkOrganizationSyncConfig).toHaveBeenCalledWith("engineering");
  expect(dingtalkBackendMock.getDingTalkOrganizationSyncRuns).toHaveBeenCalledWith("engineering", 1, 10);
});

test("saves DingTalk sync configuration from the form", async() => {
  dingtalkBackendMock.saveDingTalkOrganizationSyncConfig.mockResolvedValue({
    status: "ok",
    data: {
      organization: "engineering",
      config: {
        organization: "engineering",
        appKey: "ding-next",
        appSecret: "***",
        isEnabled: true,
        softDisableMissingData: true,
        scheduleEnabled: true,
        scheduleCron: "*/15 * * * *",
        scheduleTimezone: "UTC",
      },
    },
  });

  render(<DingTalkOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);

  await screen.findByText("钉钉组织架构同步");
  fireEvent.change(screen.getByDisplayValue("ding-app"), {target: {value: "ding-next"}});
  fireEvent.change(screen.getByDisplayValue("***"), {target: {value: "next-secret"}});
  fireEvent.click(screen.getByText("启用同步").closest(".ant-space")?.querySelector("button") || null);
  fireEvent.click(screen.getByText("全量同步成功后软禁用缺失数据").closest(".ant-space")?.querySelector("button") || null);
  const scheduleSwitch = screen.getByText("启用定时同步").closest(".ant-space")?.querySelector("button") || null;
  fireEvent.click(scheduleSwitch);
  fireEvent.change(screen.getByDisplayValue("0 2 * * *"), {target: {value: "*/15 * * * *"}});
  fireEvent.change(screen.getByDisplayValue("Asia/Shanghai"), {target: {value: "UTC"}});
  fireEvent.click(screen.getByText("保存"));

  await flushPromises();
  expect(dingtalkBackendMock.saveDingTalkOrganizationSyncConfig).toHaveBeenCalledWith(expect.objectContaining({
    organization: "engineering",
    appKey: "ding-next",
    appSecret: "next-secret",
    isEnabled: false,
    softDisableMissingData: false,
    scheduleEnabled: true,
    scheduleCron: "*/15 * * * *",
    scheduleTimezone: "UTC",
  }));
  expect(Setting.showMessage).toHaveBeenCalledWith("success", i18next.t("general:Successfully saved"));
});

test("shows DingTalk address book permission result after connection test", async() => {
  render(<DingTalkOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);

  fireEvent.click(await screen.findByText("测试连接"));

  expect(await screen.findByText("通讯录权限已满足")).toBeInTheDocument();
  expect(screen.getByText("部门：2，成员：3")).toBeInTheDocument();
  expect(dingtalkBackendMock.testDingTalkOrganizationSyncConfig).toHaveBeenCalledWith(expect.objectContaining({organization: "engineering"}));
});

test("starts DingTalk full sync and renders compact run impacts", async() => {
  dingtalkBackendMock.getDingTalkOrganizationSyncRuns.mockResolvedValueOnce({
    status: "ok",
    data: [{
      name: "run-1",
      status: "succeeded",
      stage: "finalizing",
      triggerType: "manual",
      actor: "admin",
      departmentCreatedCount: 1,
      departmentUpdatedCount: 2,
      departmentDisabledCount: 3,
      userCreatedCount: 4,
      userUpdatedCount: 5,
      userDisabledCount: 6,
      membershipUpdatedCount: 7,
      membershipDisabledCount: 8,
      departmentLeaderUpdatedCount: 9,
      directLeaderUpdatedCount: 10,
      errorText: "safe summary",
    }],
    data2: 1,
  });

  render(<DingTalkOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);

  expect(await screen.findByText("成功")).toBeInTheDocument();
  expect(screen.getByText("手动")).toBeInTheDocument();
  expect(screen.getByText("已完成")).toBeInTheDocument();
  expect(screen.getByText("部门")).toBeInTheDocument();
  expect(screen.getByText("用户")).toBeInTheDocument();
  expect(screen.getByText("关系")).toBeInTheDocument();
  expect(screen.getByText("新 1 / 更 2 / 禁 3")).toBeInTheDocument();
  expect(screen.getByText("新 4 / 更 5 / 禁 6")).toBeInTheDocument();
  expect(screen.getByText("更 26 / 禁 8")).toBeInTheDocument();
  expect(screen.getByText("safe summary")).toBeInTheDocument();

  fireEvent.click(screen.getByText("开始全量同步"));
  await flushPromises();

  expect(dingtalkBackendMock.startDingTalkOrganizationSyncRun).toHaveBeenCalledWith("engineering");
  expect(Setting.showMessage).toHaveBeenCalledWith("success", "同步任务已启动");
});

test("shows source conflict warning, disables actions, and filters occupied organizations", async() => {
  mockConfig({organization: "engineering", isEnabled: false}, {
    conflictingProvider: "WeCom",
    conflictingOrganization: "engineering",
    conflictingConfigured: true,
    conflictingEnabled: true,
    conflictingOrganizations: ["engineering", "wecom-occupied"],
    sourceStatus: {
      organization: "engineering",
      currentSource: "dingtalk",
      state: "occupied",
      occupyingSource: {
        source: "wecom",
        displayName: "WeCom",
        organization: "engineering",
        configured: true,
        enabled: true,
      },
    },
  });

  render(<DingTalkOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);

  expect(await screen.findByText("WeCom 已选择为当前组织的通讯录同步来源")).toBeInTheDocument();
  expect(await screen.findByText(/当前组织 测试组织 已被 WeCom 占用/)).toBeInTheDocument();
  expect(screen.queryByText(/当前组织 engineering 已被 WeCom 占用/)).not.toBeInTheDocument();
  expect(screen.queryByText("wecom-occupied")).not.toBeInTheDocument();
  expect(screen.getByText("support")).toBeInTheDocument();
  const enableSwitch = screen.getByText("启用同步").closest(".ant-space")?.querySelector("button") || null;
  expect(enableSwitch).toBeDisabled();
  expect(screen.getByText("开始全量同步").closest("button")).toBeDisabled();
  expect(screen.getByText("保存").closest("button")).toBeDisabled();
});

test("renders DingTalk schedule diagnostics, organization changes, and create-organization action", async() => {
  const history = {push: jestValue.fn()};
  const dispatchEventSpy = jestValue.spyOn(window, "dispatchEvent");
  mockConfig({
    scheduleEnabled: true,
    scheduleCron: "*/30 * * * *",
    scheduleTimezone: "UTC",
    scheduleLastFireAt: "2026-07-02T00:00:00Z",
    scheduleLastStatus: "failed",
    scheduleLastErrorText: "safe schedule error",
  });

  render(<DingTalkOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} history={history} />);

  expect(await screen.findByText("钉钉组织架构同步")).toBeInTheDocument();
  expect(screen.getByDisplayValue("*/30 * * * *")).toBeInTheDocument();
  expect(screen.getByDisplayValue("UTC")).toBeInTheDocument();
  expect(screen.getByText(/最近调度：/)).toBeInTheDocument();
  expect(screen.getByText("最近结果：failed，safe schedule error")).toBeInTheDocument();

  fireEvent.click(screen.getByText("新建组织"));
  await flushPromises();
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

  fireEvent.change(screen.getByTestId("organization-select"), {target: {value: "support"}});
  await flushPromises();

  expect(localStorage.getItem("dingtalk-org-sync:lastOrganization")).toBe("support");
  expect(dingtalkBackendMock.getDingTalkOrganizationSyncConfig).toHaveBeenCalledWith("support");
});

test("refreshes the resolved organization after save response switches target organization", async() => {
  dingtalkBackendMock.saveDingTalkOrganizationSyncConfig.mockResolvedValue({
    status: "ok",
    data: {
      organization: "support",
      config: {
        organization: "support",
        appKey: "support-app",
        appSecret: "***",
        isEnabled: true,
        softDisableMissingData: true,
        scheduleEnabled: false,
        scheduleCron: "0 2 * * *",
        scheduleTimezone: "Asia/Shanghai",
      },
    },
  });

  render(<DingTalkOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);

  await screen.findByText("钉钉组织架构同步");
  fireEvent.click(screen.getByText("保存"));
  await flushPromises();

  expect(dingtalkBackendMock.getDingTalkOrganizationSyncConfig).toHaveBeenCalledWith("support");
  expect(Setting.showMessage).toHaveBeenCalledWith("success", "已保存，当前同步组织：support");
});

test("surfaces safe refresh and action errors without exposing raw provider payloads", async() => {
  dingtalkBackendMock.getDingTalkOrganizationSyncRuns.mockResolvedValueOnce({status: "error", msg: "safe runs error"});

  render(<DingTalkOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);

  expect(await screen.findByText("同步记录刷新失败，请手动刷新重试。")).toBeInTheDocument();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "safe runs error");

  dingtalkBackendMock.saveDingTalkOrganizationSyncConfig.mockResolvedValueOnce({status: "error", msg: "safe save error"});
  fireEvent.click(screen.getByText("保存"));
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", `${i18next.t("general:Failed to save")}: safe save error`);

  dingtalkBackendMock.testDingTalkOrganizationSyncConfig.mockResolvedValueOnce({
    status: "ok",
    data: {
      accessTokenOk: true,
      departmentSnapshotOk: true,
      userSnapshotOk: true,
      departmentCount: 2,
      userCount: 3,
      missingFields: ["mobile", "email"],
    },
  });
  fireEvent.click(screen.getByText("测试连接"));
  expect(await screen.findByText("缺失字段：mobile, email")).toBeInTheDocument();
  expect(Setting.showMessage).toHaveBeenCalledWith("info", "缺失字段：mobile, email");

  dingtalkBackendMock.testDingTalkOrganizationSyncConfig.mockResolvedValueOnce({status: "error", msg: "safe test error"});
  fireEvent.click(screen.getByText("测试连接"));
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "连接测试失败：safe test error");

  dingtalkBackendMock.startDingTalkOrganizationSyncRun.mockResolvedValueOnce({status: "error", msg: "already running"});
  fireEvent.click(screen.getByText("开始全量同步"));
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("info", "已有同步任务在运行，已刷新同步记录。");

  dingtalkBackendMock.startDingTalkOrganizationSyncRun.mockResolvedValueOnce({status: "error", msg: "provider unavailable"});
  fireEvent.click(screen.getByText("开始全量同步"));
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "同步失败：provider unavailable");

  dingtalkBackendMock.startDingTalkOrganizationSyncRun.mockRejectedValueOnce("network down");
  fireEvent.click(screen.getByText("开始全量同步"));
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", `${i18next.t("general:Failed to connect to server")}: network down`);
});

test("pauses run refresh when the backend rejects refresh request", async() => {
  dingtalkBackendMock.getDingTalkOrganizationSyncRuns.mockRejectedValueOnce("network down");

  render(<DingTalkOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);

  expect(await screen.findByText("自动刷新已暂停，请手动刷新重试。")).toBeInTheDocument();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", `${i18next.t("general:Failed to connect to server")}: network down`);

  fireEvent.click(screen.getByText("刷新"));
  await flushPromises();
  expect(dingtalkBackendMock.getDingTalkOrganizationSyncRuns).toHaveBeenCalledWith("engineering", 1, 10);
});

test("keeps polling running DingTalk runs and copies run ids", async() => {
  jestValue.useFakeTimers();
  const writeText = jestValue.fn((_: string) => Promise.resolve());
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {writeText},
  });
  dingtalkBackendMock.getDingTalkOrganizationSyncRuns.mockResolvedValueOnce({
    status: "ok",
    data: [{
      name: "run-running",
      status: "running",
      stage: "fetching",
      triggerType: "scheduled",
      actor: "scheduler",
      startedAt: "2026-07-02T00:00:00Z",
    }],
    data2: 1,
  });

  render(<DingTalkOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);

  expect(await screen.findByText("运行中")).toBeInTheDocument();
  expect(screen.getByText("定时")).toBeInTheDocument();
  expect(screen.getByText("拉取数据")).toBeInTheDocument();
  expect(screen.getByText("同步进行中").closest("button")).toBeDisabled();
  expect(screen.getByText(/自动每 3 秒刷新/)).toBeInTheDocument();

  fireEvent.click(screen.getAllByText("1")[0]);
  await flushPromises();
  expect(writeText).toHaveBeenCalledWith("run-running");
  expect(Setting.showMessage).toHaveBeenCalledWith("success", "已复制运行 ID");

  fireEvent.keyDown(screen.getAllByText("1")[0], {key: "Enter", preventDefault: jestValue.fn()});
  await flushPromises();
  expect(writeText).toHaveBeenCalledWith("run-running");

  jestValue.advanceTimersByTime(3000);
  await flushPromises();
  expect(dingtalkBackendMock.getDingTalkOrganizationSyncRuns).toHaveBeenCalledWith("engineering", 1, 10);
});

test("shows ambiguous source conflicts as fail-closed data anomalies", async() => {
  mockConfig({organization: "engineering", isEnabled: true}, {
    conflictingOrganizations: ["engineering"],
    sourceStatus: {
      organization: "engineering",
      currentSource: "dingtalk",
      state: "ambiguous",
      sources: [
        {source: "wecom", displayName: "WeCom", organization: "engineering", configured: true, enabled: true},
        {source: "dingtalk", displayName: "DingTalk", organization: "engineering", configured: true, enabled: true},
      ],
    },
  });

  render(<DingTalkOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);

  expect(await screen.findByText("数据异常：当前组织存在多个通讯录同步来源")).toBeInTheDocument();
  expect(screen.getByText(/同时存在 WeCom、DingTalk 配置/)).toBeInTheDocument();
  expect(screen.getByText("保存").closest("button")).toBeDisabled();
  expect(screen.getByText("开始全量同步").closest("button")).toBeDisabled();
});

test("normalizes helper edge cases and copy fallback behavior", async() => {
  const page = new DingTalkOrganizationSyncPage({account: {owner: "built-in", isAdmin: true}});
  const pageAccess = page as unknown as {
    state: typeof page.state;
    runRefreshTimer: ReturnType<typeof setTimeout> | null;
  };
  expect(page.getAccountOrganization()).toBe("");
  expect(page.getBusinessOrganization(" built-in ")).toBe("");
  expect(page.getBusinessOrganization(" engineering ")).toBe("engineering");
  expect(page.normalizeOrganizations(["engineering", "built-in", "engineering"], "support")).toEqual(["engineering", "support"]);
  expect(page.isDuplicateRunningStartError("ALREADY RUNNING")).toBe(true);
  expect(page.isDuplicateRunningStartError("queued")).toBe(false);
  expect(page.getStageText("planning", "running")).toBe("计算差异");
  expect(page.getStageText("unknown", "failed")).toBe("unknown");
  expect(page.formatRunTime("0001-01-01T00:00:00Z")).toBe("-");
  await page.refreshRuns("");

  pageAccess.state = {
    ...page.state,
    organization: "",
    sourceStatus: {
      sourceStatus: {
        organization: "engineering",
        state: "ambiguous",
        sources: [
          {displayName: "WeCom", organization: "engineering"},
          {displayName: "DingTalk", organization: "engineering"},
        ],
      },
    },
  };

  expect(page.getSourceConflictActionMessage("暂不能保存钉钉配置。")).toContain("多个已配置通讯录来源");
  page.updateSyncEnabled(true);
  page.saveConfig();
  page.startSync();
  expect(Setting.showMessage).toHaveBeenCalledWith("warning", expect.stringContaining("多个已配置通讯录来源"));

  const updatePage = new DingTalkOrganizationSyncPage({account: {owner: "engineering", isAdmin: true}});
  const updatePageAccess = updatePage as unknown as {
    state: typeof updatePage.state;
    changeOrganization: (organization: string, remember?: boolean) => void;
  };
  updatePageAccess.state = {...updatePage.state, organization: ""};
  updatePageAccess.changeOrganization = jestValue.fn();
  updatePage.componentDidUpdate();
  expect(updatePageAccess.changeOrganization).toHaveBeenCalledWith("engineering", false);

  const execCommand = jestValue.fn();
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: undefined,
  });
  Object.defineProperty(document, "execCommand", {
    configurable: true,
    value: execCommand,
  });

  page.copyRunId("");
  page.copyRunId("run-fallback");
  await flushPromises();

  expect(execCommand).toHaveBeenCalledWith("copy");
  expect(Setting.showMessage).toHaveBeenCalledWith("success", "已复制运行 ID");

  const writeText = jestValue.fn((_: string) => Promise.reject("clipboard denied"));
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {writeText},
  });
  page.copyRunId("run-rejected");
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "复制失败：clipboard denied");

  pageAccess.runRefreshTimer = setTimeout(() => {}, 1000);
  page.scheduleRunRefresh("engineering");
  expect(pageAccess.runRefreshTimer).not.toBeNull();
  page.syncRunRefreshLoop("support", []);
  expect(pageAccess.runRefreshTimer).toBeNull();
});
