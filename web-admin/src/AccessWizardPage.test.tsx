/* eslint-env jest */
import React from "react";
import {MemoryRouter} from "react-router-dom";
import {expect, jest} from "@jest/globals";
import {cleanup, render} from "@testing-library/react";
import i18next from "i18next";
import AccessWizardPage from "./AccessWizardPage";
import {buildAccessWizardPlans} from "./identityAccessWizard";
import en from "./locales/en/data.json";
import zh from "./locales/zh/data.json";

const {fireEvent} = require("@testing-library/react") as {
  fireEvent: {
    click: (element: Element) => void;
  };
};

type MockListResponse = {status: string; data?: unknown; data2?: unknown; msg?: string} | Error;

const mockBackendResponses: Record<string, MockListResponse> = {
  agents: {status: "ok", data: [], data2: 0},
  applications: {status: "ok", data: [], data2: 0},
  providers: {status: "ok", data: [], data2: 0},
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

const adminAccount = {
  owner: "built-in",
  name: "admin",
  isAdmin: true,
  organization: {
    navItems: ["all"],
    userNavItems: [],
  },
};

const plans = buildAccessWizardPlans({
  providers: {
    pagePath: "/providers",
    rows: [{
      owner: "admin",
      name: "oidc-main",
      displayName: "OIDC Main",
      category: "OAuth",
      type: "OIDC",
      clientId: "",
      providerUrl: "https://idp.example.invalid/oauth",
      clientSecret: "raw-provider-secret",
    }],
    totalRows: 1,
  },
  applications: {
    pagePath: "/applications",
    rows: [{
      owner: "admin",
      organization: "built-in",
      name: "portal",
      displayName: "Portal",
      clientId: "",
      clientSecret: "raw-app-secret",
      redirectUris: [],
      scopes: [],
      providers: [],
    }],
    totalRows: 1,
  },
  agents: {
    pagePath: "/agents",
    rows: [{
      owner: "built-in",
      name: "support-agent",
      displayName: "Support Agent",
      application: "",
      url: "",
      token: "raw-agent-token",
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

  i18next.addResourceBundle("en", "accessWizard", en.accessWizard, true, true);
  i18next.addResourceBundle("zh", "accessWizard", zh.accessWizard, true, true);
  await i18next.changeLanguage(language);
}

describe("AccessWizardPage", () => {
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

  test("renders three read-only access wizard domains with steps gaps evidence and next entries", () => {
    const view = render(
      <MemoryRouter>
        <AccessWizardPage account={adminAccount} initialPlans={plans} />
      </MemoryRouter>
    );

    expect(view.getByText("接入预检工具")).not.toBeNull();
    expect(view.queryByText("接入预检中心")).toBeNull();
    expect(view.container.querySelector(".access-wizard-compact-workflow")).not.toBeNull();
    expect(view.getByText("认证源接入")).not.toBeNull();
    expect(view.getByText("应用接入")).not.toBeNull();
    expect(view.getByText("LLM AI / Gateway")).not.toBeNull();
    expect(view.getAllByText("配置缺口").length).toBeGreaterThan(0);
    expect(view.getAllByText("证据入口").length).toBeGreaterThan(0);
    expect(view.getAllByText("发布前核对").length).toBeGreaterThan(0);
    expect(view.getByText("OIDC Main")).not.toBeNull();
    expect(view.getByText("Portal")).not.toBeNull();
    expect(view.getByText("Support Agent")).not.toBeNull();
    expect(view.queryByText("raw-provider-secret")).toBeNull();
    expect(view.queryByText("raw-app-secret")).toBeNull();
    expect(view.queryByText("raw-agent-token")).toBeNull();
    expect(view.queryByText("真实连接测试")).toBeNull();
    expect(view.queryByText("mock")).toBeNull();

    fireEvent.click(view.getAllByText("应用接入")[0]);
    expect(view.getByText("核对应用配置").closest("a")?.getAttribute("href")).toBe("/applications/built-in/portal");
  });

  test("supports step transitions cancellation and result summary without write actions", () => {
    const view = render(
      <MemoryRouter>
        <AccessWizardPage account={adminAccount} initialPlans={plans} />
      </MemoryRouter>
    );

    fireEvent.click(view.getByText("应用接入"));
    expect(view.getAllByText("对象选择").length).toBeGreaterThan(0);
    fireEvent.click(view.getByText("下一步"));
    expect(view.container.querySelector(".access-wizard-step-panel")?.textContent).toContain("配置核对");
    fireEvent.click(view.getByText("下一步"));
    expect(view.container.querySelector(".access-wizard-step-panel")?.textContent).toContain("预检清单");
    fireEvent.click(view.getByText("发布前核对"));
    expect(view.container.querySelector(".access-wizard-step-panel")?.textContent).toContain("发布前核对");
    fireEvent.click(view.getByText("结果摘要"));
    expect(view.getByText("脱敏摘要")).not.toBeNull();
    expect(view.getByText("当前对象证据链").closest("a")?.getAttribute("href")).toContain("/identity-assets?asset=application-access");
    expect(view.getAllByText("Application:built-in/portal").length).toBeGreaterThan(0);
    expect(view.getByText("授权关系").closest("article")?.textContent).toContain("Provider 绑定");
    expect(view.getByText("取消并返回来源").closest("a")?.getAttribute("href")).toBe("/applications");
    expect(view.queryByText("保存")).toBeNull();
    expect(view.queryByText("发布")).toBeNull();
  });

  test("loads read-only source lists and keeps source failures as cannot-infer evidence", async() => {
    mockBackendResponses.applications = {
      status: "ok",
      data: [{
        owner: "admin",
        organization: "built-in",
        name: "loaded-portal",
        displayName: "Loaded Portal",
        clientId: "",
        redirectUris: [],
        scopes: [],
        providers: [],
      }],
      data2: 1,
    };
    mockBackendResponses.providers = {status: "error", msg: "source unavailable"};
    mockBackendResponses.agents = new Error("network unavailable");

    const view = render(
      <MemoryRouter>
        <AccessWizardPage account={adminAccount} />
      </MemoryRouter>
    );

    expect(view.getByText("正在加载接入预检...")).not.toBeNull();
    expect((await view.findAllByText("Loaded Portal")).length).toBeGreaterThan(0);
    expect(view.getByText("部分证据入口暂不可用")).not.toBeNull();
    expect(view.getAllByText("/providers").length).toBeGreaterThan(0);
    expect(view.getAllByText("/agents").length).toBeGreaterThan(0);
    expect(view.getAllByText("无法推断").length).toBeGreaterThan(0);
  });

  test("renders empty and permission states without leaking hidden source objects", () => {
    const view = render(
      <MemoryRouter>
        <AccessWizardPage account={adminAccount} initialPlans={[]} />
      </MemoryRouter>
    );
    const {rerender} = view;

    expect(view.getAllByText("当前范围暂无可预检对象").length).toBeGreaterThan(0);
    expect(view.getByText("进入认证源").closest("a")?.getAttribute("href")).toBe("/providers");

    rerender(
      <MemoryRouter>
        <AccessWizardPage account={{...adminAccount, owner: "demo", isAdmin: false}} initialPlans={plans} />
      </MemoryRouter>
    );

    expect(view.getByText("无权查看接入预检工具")).not.toBeNull();
    expect(view.queryByText("Portal")).toBeNull();
  });
});
