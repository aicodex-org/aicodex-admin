/* eslint-env jest */
import React from "react";
import {MemoryRouter} from "react-router-dom";
import {render} from "@testing-library/react";
import {expect as jestExpect} from "@jest/globals";
import IdentityConsoleOverview from "./IdentityConsoleOverview";
import * as DashboardBackend from "./backend/DashboardBackend";
import {getOrganizationSyncProviderLogoUrl} from "./organizationSync/OrganizationSyncTypes";

declare const jest: {
  mock: (moduleName: string) => void;
};
const {screen} = require("@testing-library/react") as {
  screen: {
    getByText: (text: string | RegExp) => HTMLElement;
    queryByText: (text: string | RegExp) => HTMLElement | null;
    getAllByText: (text: string | RegExp) => HTMLElement[];
    queryAllByText: (text: string | RegExp) => HTMLElement[];
    findByText: (text: string | RegExp) => Promise<HTMLElement>;
    findAllByText: (text: string | RegExp) => Promise<HTMLElement[]>;
  };
};

type LooseMock = {
  mockReset: () => void;
  mockResolvedValue: (value: unknown) => LooseMock;
};

type DomMatcherResult = ReturnType<typeof jestExpect> & {
  toBeInTheDocument: () => void;
  toHaveAttribute: (attr: string, value?: unknown) => void;
  not: ReturnType<typeof jestExpect> & {
    toBeInTheDocument: () => void;
  };
};

type TestExpect = {
  (actual: unknown): DomMatcherResult;
  objectContaining: typeof jestExpect.objectContaining;
  stringContaining: typeof jestExpect.stringContaining;
};

const expect = jestExpect as unknown as TestExpect;

const dashboardBackendMock = DashboardBackend as unknown as {
  getDashboard: LooseMock;
};

jest.mock("./backend/DashboardBackend");

const adminAccount = {
  owner: "built-in",
  name: "admin",
  isAdmin: true,
  organization: {
    name: "built-in",
    displayName: "Built In",
  },
};

describe("IdentityConsoleOverview", () => {
  beforeEach(() => {
    dashboardBackendMock.getDashboard.mockReset();
    localStorage.clear();
  });

  test("renders AICodex identity infrastructure status from existing dashboard data", async() => {
    dashboardBackendMock.getDashboard.mockResolvedValue({
      status: "ok",
      data: {
        organizationCounts: Array(31).fill(3),
        userCounts: Array(31).fill(42),
        providerCounts: Array(31).fill(5),
        applicationCounts: Array(31).fill(7),
        resourceCounts: Array(31).fill(2),
        roleCounts: Array(31).fill(4),
        permissionCounts: Array(31).fill(9),
        recordCounts: Array(31).fill(11),
      },
    });

    render(
      <MemoryRouter>
        <IdentityConsoleOverview account={adminAccount} />
      </MemoryRouter>
    );

    expect(screen.queryByText("AICodex 身份运行总览")).not.toBeInTheDocument();
    expect(screen.queryByText("关注接入覆盖、归因、授权和审计信号。")).not.toBeInTheDocument();
    expect(screen.queryByText("统一查看应用规格、用量洞察、身份配置与 API 网关的身份运行状态，优先呈现接入覆盖、用量归因、授权映射和审计证据。")).not.toBeInTheDocument();
    expect(screen.getAllByText("身份控制台").length).toBeGreaterThan(0);
    expect(screen.getByText("身份总览")).toBeInTheDocument();
    expect(screen.queryByText("身份控制台 / 身份总览")).not.toBeInTheDocument();
    expect(screen.getByText("加载身份基础设施状态...")).toBeInTheDocument();
    expect((await screen.findAllByText("应用规格")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("98%")).toHaveLength(1);
    expect(screen.queryByText("4 个产品域")).not.toBeInTheDocument();
    expect(screen.queryByText("API 网关映射有 1 项需复核，用量归因有 1 项等待身份关系补齐。")).not.toBeInTheDocument();
    expect(screen.getByText("查看核对建议").closest("a")).toHaveAttribute("href", "/platform-api-mappings");

    expect(screen.getAllByText("用量洞察").length).toBeGreaterThan(0);
    expect(screen.getAllByText("身份控制台").length).toBeGreaterThan(0);
    expect(screen.getAllByText("API 网关").length).toBeGreaterThan(0);
    expect(screen.queryByText("aicodex-app-spec")).not.toBeInTheDocument();
    expect(screen.queryByText("aicodex-insight")).not.toBeInTheDocument();
    expect(screen.queryByText("aicodex-admin")).not.toBeInTheDocument();
    expect(screen.queryByText("aicodex-api")).not.toBeInTheDocument();
    expect(screen.getByText("重点事项")).toBeInTheDocument();
    expect(screen.getByText("关联模块")).toBeInTheDocument();
    expect(screen.getByText("接入概况")).toBeInTheDocument();
    expect(screen.getByText("最近审计证据")).toBeInTheDocument();
    expect(screen.getAllByText("进入应用接入").some((item: HTMLElement) => item.closest("a")?.getAttribute("href") === "/applications")).toBe(true);
    expect(screen.getAllByText("企业微信同步").some((item: HTMLElement) => item.closest("a")?.getAttribute("href") === "/wecom-org-sync")).toBe(true);
    expect(screen.getAllByText("飞书同步").some((item: HTMLElement) => item.closest("a")?.getAttribute("href") === "/feishu-org-sync")).toBe(true);
    expect(screen.getAllByText("钉钉同步").some((item: HTMLElement) => item.closest("a")?.getAttribute("href") === "/dingtalk-org-sync")).toBe(true);
    expect(screen.getByText("企业微信、飞书、钉钉、内置账号")).toBeInTheDocument();
    expect(screen.getByText("组织同步目录质量")).toBeInTheDocument();
    expect(screen.queryByText("查看记录")).not.toBeInTheDocument();
    expect(screen.getByText("核对审计记录").closest("a")).toHaveAttribute("href", "/records");
    expect(screen.getByText("核对同步记录").closest("a")).toHaveAttribute("href", "/records");
    expect(screen.getByText("核对网关证据").closest("a")).toHaveAttribute("href", "/records");
    expect(screen.queryByText("能力入口")).not.toBeInTheDocument();
    expect(screen.queryByText(/Gateway 投影/)).not.toBeInTheDocument();
    expect(screen.queryByText(/企业认证中心/)).not.toBeInTheDocument();
    expect(screen.queryByText("对象上下文")).not.toBeInTheDocument();
    expect(screen.queryByText(/deep link/i)).not.toBeInTheDocument();
    expect(screen.queryByText("当前列表视图")).not.toBeInTheDocument();
    expect(screen.queryAllByText("系统标识")).toHaveLength(0);
  });

  test("renders provider-specific logos for organization sync shortcuts", async() => {
    dashboardBackendMock.getDashboard.mockResolvedValue({
      status: "ok",
      data: {},
    });

    const view = render(
      <MemoryRouter>
        <IdentityConsoleOverview account={adminAccount} />
      </MemoryRouter>
    );

    await screen.findAllByText("待核对事项");

    const providerLogos = Array.from(view.container.querySelectorAll<HTMLImageElement>(".identity-console-overview-sync-provider-logo"));

    expect(providerLogos).toHaveLength(3);
    expect(providerLogos[0]).toHaveAttribute("src", getOrganizationSyncProviderLogoUrl("wecom"));
    expect(providerLogos[1]).toHaveAttribute("src", getOrganizationSyncProviderLogoUrl("feishu"));
    expect(providerLogos[2]).toHaveAttribute("src", getOrganizationSyncProviderLogoUrl("dingtalk"));
    providerLogos.forEach(logo => {
      expect(logo).toHaveAttribute("width", "16");
      expect(logo).toHaveAttribute("height", "16");
      expect(logo).toHaveAttribute("alt", "");
    });
  });

  test("keeps the page header separate while treating summary and workbench as body content", async() => {
    dashboardBackendMock.getDashboard.mockResolvedValue({
      status: "ok",
      data: {
        organizationCounts: Array(31).fill(3),
        userCounts: Array(31).fill(42),
        providerCounts: Array(31).fill(5),
        applicationCounts: Array(31).fill(7),
        resourceCounts: Array(31).fill(2),
        permissionCounts: Array(31).fill(9),
        recordCounts: Array(31).fill(11),
      },
    });

    const view = render(
      <MemoryRouter>
        <IdentityConsoleOverview account={adminAccount} />
      </MemoryRouter>
    );

    expect((await screen.findAllByText("待核对事项")).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("能力与元数据")).toBeInTheDocument();
    expect(screen.getByText("组织与模型归因")).toBeInTheDocument();
    expect(screen.getByText("账号、来源、权限")).toBeInTheDocument();
    expect(screen.getByText("授权与审计事实")).toBeInTheDocument();
    expect(screen.getByText("查看各模块当前状态与下一步动作。")).toBeInTheDocument();

    const pageShell = view.container.querySelector(".admin-page-scroll-shell.identity-console-overview");
    const headerRegion = view.container.querySelector(".enterprise-identity-console-header");
    const bodyRegion = view.container.querySelector(".enterprise-identity-console-body");
    const spotlightRegion = view.container.querySelector(".identity-console-overview-notice");
    const workbench = view.container.querySelector(".identity-console-overview-workbench");
    const statusGrid = view.container.querySelector(".enterprise-identity-status-grid");

    expect(pageShell).not.toBeNull();
    expect(pageShell?.classList.contains("enterprise-identity-console-density-compact")).toBe(true);
    expect(headerRegion?.contains(screen.getByText("身份总览"))).toBe(true);
    expect(headerRegion?.querySelector(".enterprise-identity-console-title")).toBeNull();
    expect(headerRegion?.contains(spotlightRegion)).toBe(true);
    expect(spotlightRegion?.classList.contains("identity-console-overview-notice-compact")).toBe(true);
    expect(view.container.querySelector(".enterprise-identity-summary-strip")).toBeNull();
    expect(bodyRegion?.contains(statusGrid)).toBe(true);
    expect(bodyRegion?.contains(workbench)).toBe(true);
    expect(headerRegion?.contains(workbench)).toBe(false);
  });

  test("renders compact health and audit side sections instead of card-like detail blocks", async() => {
    dashboardBackendMock.getDashboard.mockResolvedValue({
      status: "ok",
      data: {
        organizationCounts: Array(31).fill(3),
        userCounts: Array(31).fill(42),
        providerCounts: Array(31).fill(5),
        applicationCounts: Array(31).fill(7),
        resourceCounts: Array(31).fill(2),
        permissionCounts: Array(31).fill(9),
        recordCounts: Array(31).fill(11),
      },
    });

    const view = render(
      <MemoryRouter>
        <IdentityConsoleOverview account={adminAccount} />
      </MemoryRouter>
    );

    expect(await screen.findByText("接入概况")).toBeInTheDocument();

    expect(view.container.querySelector(".identity-console-health-list-compact")).not.toBeNull();
    expect(view.container.querySelector(".identity-console-audit-list-compact")).not.toBeNull();
  });

  test("keeps entry links available when dashboard data fails", async() => {
    dashboardBackendMock.getDashboard.mockResolvedValue({
      status: "error",
      msg: "dashboard unavailable",
    });

    render(
      <MemoryRouter>
        <IdentityConsoleOverview account={adminAccount} />
      </MemoryRouter>
    );

    expect(await screen.findByText("只读状态暂不可用")).toBeInTheDocument();
    expect(screen.getByText("dashboard unavailable")).toBeInTheDocument();
    expect(screen.getByText("查看质量").closest("a")).toHaveAttribute("href", "/organization-directory-quality");
    expect(screen.queryByText("能力入口")).not.toBeInTheDocument();
  });

  test("requests the owning organization for non-built-in local admins", async() => {
    dashboardBackendMock.getDashboard.mockResolvedValue({
      status: "ok",
      data: {},
    });

    render(
      <MemoryRouter>
        <IdentityConsoleOverview account={{...adminAccount, owner: "demo", isAdmin: true}} />
      </MemoryRouter>
    );

    expect(await screen.findByText("身份总览")).toBeInTheDocument();
    expect(dashboardBackendMock.getDashboard).toHaveBeenCalledWith("demo");
  });

  test("demotes abstract governance centers into status-oriented pending summaries", async() => {
    dashboardBackendMock.getDashboard.mockResolvedValue({
      status: "ok",
      data: {
        organizationCounts: Array(31).fill(2),
        userCounts: Array(31).fill(16),
        providerCounts: Array(31).fill(3),
        applicationCounts: Array(31).fill(4),
        resourceCounts: Array(31).fill(6),
        permissionCounts: Array(31).fill(8),
        recordCounts: Array(31).fill(12),
      },
    });

    render(
      <MemoryRouter>
        <IdentityConsoleOverview account={adminAccount} />
      </MemoryRouter>
    );

    expect((await screen.findAllByText("待核对事项")).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("对象关系证据链")).not.toBeInTheDocument();
    expect(screen.queryByText("接入预检")).not.toBeInTheDocument();
    expect(screen.queryByText("进入身份资产关系")).not.toBeInTheDocument();
    expect(screen.queryByText("进入接入预检")).not.toBeInTheDocument();
    expect(screen.queryByText("进入任务中心")).not.toBeInTheDocument();
    expect(screen.queryByText("待处理")).not.toBeInTheDocument();

    expect(screen.getAllByText("查看映射").some((item: HTMLElement) => item.closest("a")?.getAttribute("href") === "/platform-api-mappings")).toBe(true);
    expect(screen.getAllByText("查看归因").some((item: HTMLElement) => item.closest("a")?.getAttribute("href") === "/users")).toBe(true);
    expect(screen.getByText("查看规格").closest("a")).toHaveAttribute("href", "/applications");
  });

  test("redirects non-admin users to their application workspace", () => {
    render(
      <MemoryRouter>
        <IdentityConsoleOverview account={{...adminAccount, owner: "demo", isAdmin: false}} />
      </MemoryRouter>
    );

    expect(screen.getByText("正在进入应用工作台...")).toBeInTheDocument();
    expect(dashboardBackendMock.getDashboard).not.toHaveBeenCalled();
  });
});
