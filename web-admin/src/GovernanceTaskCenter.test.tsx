/* eslint-env jest */
import React from "react";
import {MemoryRouter} from "react-router-dom";
import {expect, jest} from "@jest/globals";
import {cleanup, render} from "@testing-library/react";
import i18next from "i18next";
import GovernanceTaskCenter from "./GovernanceTaskCenter";
import {buildGovernanceTasks} from "./identityGovernanceTasks";
import en from "./locales/en/data.json";
import zh from "./locales/zh/data.json";

const {fireEvent} = require("@testing-library/react") as {
  fireEvent: {
    change: (element: Element, event: {target: {value: string}}) => void;
    click: (element: Element) => void;
  };
};

type MockListResponse = {status: string; data?: unknown; data2?: unknown; msg?: string} | Error;

const mockBackendResponses: Record<string, MockListResponse> = {
  agents: {status: "ok", data: [], data2: 0},
  applications: {status: "ok", data: [], data2: 0},
  providers: {status: "ok", data: [], data2: 0},
  records: {status: "ok", data: [], data2: 0},
  roles: {status: "ok", data: [], data2: 0},
  tokens: {status: "ok", data: [], data2: 0},
  users: {status: "ok", data: [], data2: 0},
};

function mockReadSource(key: string) {
  const response = mockBackendResponses[key];
  if (response instanceof Error) {
    return Promise.reject(response);
  }

  return Promise.resolve(response);
}

function resetMockBackendResponses() {
  Object.assign(mockBackendResponses, {
    agents: {status: "ok", data: [], data2: 0},
    applications: {status: "ok", data: [], data2: 0},
    providers: {status: "ok", data: [], data2: 0},
    records: {status: "ok", data: [], data2: 0},
    roles: {status: "ok", data: [], data2: 0},
    tokens: {status: "ok", data: [], data2: 0},
    users: {status: "ok", data: [], data2: 0},
  });
}

jest.mock("./backend/AgentBackend", () => ({getAgents: () => mockReadSource("agents")}));
jest.mock("./backend/ApplicationBackend", () => ({
  getApplications: () => mockReadSource("applications"),
  getApplicationsByOrganization: () => mockReadSource("applications"),
}));
jest.mock("./backend/ProviderBackend", () => ({
  getGlobalProviders: () => mockReadSource("providers"),
  getProviders: () => mockReadSource("providers"),
}));
jest.mock("./backend/RecordBackend", () => ({getRecords: () => mockReadSource("records")}));
jest.mock("./backend/RoleBackend", () => ({getRoles: () => mockReadSource("roles")}));
jest.mock("./backend/TokenBackend", () => ({getTokens: () => mockReadSource("tokens")}));
jest.mock("./backend/UserBackend", () => ({
  getGlobalUsers: () => mockReadSource("users"),
  getUsers: () => mockReadSource("users"),
}));

const adminAccount = {
  owner: "built-in",
  name: "admin",
  isAdmin: true,
  organization: {
    navItems: ["all"],
    userNavItems: [],
  },
};

const tasks = buildGovernanceTasks({
  applications: {
    pagePath: "/applications",
    rows: [{
      owner: "admin",
      organization: "built-in",
      name: "callback-gap",
      displayName: "Callback Gap",
      clientId: "client-id",
      redirectUris: [],
      scopes: ["openid"],
      providers: [],
      clientSecret: "client-secret-value",
    }],
    totalRows: 1,
  },
  tokens: {
    pagePath: "/tokens",
    rows: [{
      owner: "admin",
      name: "token-risk",
      accessToken: "raw-token-value",
      application: "",
      user: "",
      expiresIn: 0,
    }],
    totalRows: 1,
  },
});

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

  i18next.addResourceBundle("en", "governanceTaskCenter", en.governanceTaskCenter, true, true);
  i18next.addResourceBundle("zh", "governanceTaskCenter", zh.governanceTaskCenter, true, true);
  await i18next.changeLanguage(language);
}

describe("GovernanceTaskCenter", () => {
  let consoleErrorSpy: {mockRestore: () => void};

  beforeEach(async() => {
    resetMockBackendResponses();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      throw new Error(args.map(item => String(item)).join(" "));
    });
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }),
    });
    await useTestLanguage("zh");
  });

  afterEach(() => {
    cleanup();
    consoleErrorSpy.mockRestore();
  });

  test("renders a read-only task queue with scope evidence and safe actions", () => {
    const view = render(
      <MemoryRouter>
        <GovernanceTaskCenter account={adminAccount} initialTasks={tasks} />
      </MemoryRouter>
    );

    expect(view.getByText("治理任务中心")).not.toBeNull();
    expect(view.getByText(/风险待办闭环/)).not.toBeNull();
    expect(view.getByText("缺少回调地址")).not.toBeNull();
    expect(view.getByText("异常令牌核对")).not.toBeNull();
    expect(view.getAllByText("高").length).toBeGreaterThan(0);
    expect(view.getAllByText("当前对象").length).toBeGreaterThan(0);
    expect(view.getAllByText("证据入口").length).toBeGreaterThan(0);
    expect(view.getAllByText("核对应用配置").some((item: HTMLElement) => item.closest("a")?.getAttribute("href") === "/applications/built-in/callback-gap")).toBe(true);
    expect(view.getByText("核对令牌").closest("a")?.getAttribute("href")).toBe("/tokens");
    expect(view.queryByText("client-secret-value")).toBeNull();
    expect(view.queryByText("raw-token-value")).toBeNull();
    expect(view.queryByText("全局风险")).toBeNull();
    expect(view.queryByText("只读推导")).toBeNull();
  });

  test("loads tasks from read-only source APIs and keeps source failures as evidence entries", async() => {
    mockBackendResponses.applications = {
      status: "ok",
      data: [{
        owner: "admin",
        organization: "tenant-a",
        name: "loaded-app",
        displayName: "Loaded App",
        clientId: "",
        redirectUris: [],
        scopes: [],
        providers: [],
      }],
      data2: 1,
    };
    mockBackendResponses.providers = {status: "error", msg: "source unavailable"};
    mockBackendResponses.tokens = {
      status: "ok",
      data: [{
        owner: "admin",
        name: "loaded-token",
        application: "",
        user: "",
        expiresIn: 0,
      }],
      data2: 1,
    };
    mockBackendResponses.agents = new Error("network unavailable");

    const view = render(
      <MemoryRouter>
        <GovernanceTaskCenter account={{...adminAccount, owner: "tenant-a", isAdmin: true}} />
      </MemoryRouter>
    );

    expect(view.getByText("正在加载治理任务...")).not.toBeNull();
    expect((await view.findAllByText("Loaded App")).length).toBeGreaterThan(0);
    expect(view.getByText("异常令牌核对")).not.toBeNull();
    expect(view.getAllByText("Provider 绑定风险").length).toBeGreaterThan(0);
    expect(view.getByText("网关映射缺口")).not.toBeNull();
    expect(view.getByText("部分证据入口暂不可用")).not.toBeNull();
    expect(view.getAllByText("/providers").length).toBeGreaterThan(0);
    expect(view.getAllByText("/agents").length).toBeGreaterThan(0);
  });

  test("filters by keyword and updates session-only processing state", () => {
    const view = render(
      <MemoryRouter>
        <GovernanceTaskCenter account={adminAccount} initialTasks={tasks} />
      </MemoryRouter>
    );

    fireEvent.change(view.getByPlaceholderText("搜索任务、对象或证据"), {target: {value: "token"}});

    expect(view.queryByText("缺少回调地址")).toBeNull();
    expect(view.getByText("异常令牌核对")).not.toBeNull();

    fireEvent.click(view.getByText("标记已查看"));

    expect(view.getByText("已查看")).not.toBeNull();

    fireEvent.click(view.getByText("忽略当前会话"));

    expect(view.getByText("当前会话忽略")).not.toBeNull();
  });

  test("renders empty error and permission states without leaking hidden objects", () => {
    const view = render(
      <MemoryRouter>
        <GovernanceTaskCenter account={adminAccount} initialTasks={[]} />
      </MemoryRouter>
    );
    const {rerender} = view;

    expect(view.getByText("当前范围未发现待办")).not.toBeNull();
    expect(view.getByText("进入应用接入").closest("a")?.getAttribute("href")).toBe("/applications");

    rerender(
      <MemoryRouter>
        <GovernanceTaskCenter account={adminAccount} initialTasks={[]} sourceErrors={["/providers"]} />
      </MemoryRouter>
    );

    expect(view.getByText("部分证据入口暂不可用")).not.toBeNull();
    expect(view.getByText("/providers")).not.toBeNull();

    rerender(
      <MemoryRouter>
        <GovernanceTaskCenter account={{...adminAccount, owner: "demo", isAdmin: false}} initialTasks={tasks} />
      </MemoryRouter>
    );

    expect(view.getByText("无权查看治理任务中心")).not.toBeNull();
    expect(view.queryByText("Callback Gap")).toBeNull();
  });
});
