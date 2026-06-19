/* eslint-env jest */
import React from "react";
import {MemoryRouter} from "react-router-dom";
import {render, screen} from "@testing-library/react";
import IdentityConsoleOverview from "./IdentityConsoleOverview";
import * as DashboardBackend from "./backend/DashboardBackend";

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
    DashboardBackend.getDashboard.mockReset();
    localStorage.clear();
  });

  test("renders AICodex identity infrastructure status from existing dashboard data", async() => {
    DashboardBackend.getDashboard.mockResolvedValue({
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

    expect(screen.getByText("AICodex 身份基础设施总览")).toBeInTheDocument();
    expect(screen.getAllByText("身份控制台").length).toBeGreaterThan(0);
    expect(screen.getByText("身份控制台 / 身份总览")).toBeInTheDocument();
    expect(screen.getByText("加载身份基础设施状态...")).toBeInTheDocument();

    expect((await screen.findAllByText("应用规格")).length).toBeGreaterThan(0);
    expect(screen.getByText("aicodex-app-spec")).toBeInTheDocument();
    expect(screen.getAllByText("用量洞察").length).toBeGreaterThan(0);
    expect(screen.getByText("aicodex-insight")).toBeInTheDocument();
    expect(screen.getAllByText("身份控制台").length).toBeGreaterThan(0);
    expect(screen.getByText("aicodex-admin")).toBeInTheDocument();
    expect(screen.getAllByText("API 网关").length).toBeGreaterThan(0);
    expect(screen.getByText("aicodex-api")).toBeInTheDocument();
    expect(screen.getByText("待核对事项")).toBeInTheDocument();
    expect(screen.getByText("接入健康")).toBeInTheDocument();
    expect(screen.getByText("最近审计证据")).toBeInTheDocument();
    expect(screen.getAllByText("进入应用接入").some(item => item.closest("a")?.getAttribute("href") === "/applications")).toBe(true);
    expect(screen.getAllByText("查看记录").some(item => item.closest("a")?.getAttribute("href") === "/records")).toBe(true);
    expect(screen.queryByText("能力入口")).not.toBeInTheDocument();
    expect(screen.queryByText(/Gateway 投影/)).not.toBeInTheDocument();
    expect(screen.queryByText(/企业认证中心/)).not.toBeInTheDocument();
    expect(screen.queryByText("对象上下文")).not.toBeInTheDocument();
    expect(screen.queryByText(/deep link/i)).not.toBeInTheDocument();
    expect(screen.queryByText("当前列表视图")).not.toBeInTheDocument();
  });

  test("keeps entry links available when dashboard data fails", async() => {
    DashboardBackend.getDashboard.mockResolvedValue({
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
    DashboardBackend.getDashboard.mockResolvedValue({
      status: "ok",
      data: {},
    });

    render(
      <MemoryRouter>
        <IdentityConsoleOverview account={{...adminAccount, owner: "demo", isAdmin: true}} />
      </MemoryRouter>
    );

    expect(await screen.findByText("AICodex 身份基础设施总览")).toBeInTheDocument();
    expect(DashboardBackend.getDashboard).toHaveBeenCalledWith("demo");
  });

  test("demotes abstract governance centers into status-oriented pending summaries", async() => {
    DashboardBackend.getDashboard.mockResolvedValue({
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

    expect(await screen.findByText("待核对事项")).toBeInTheDocument();
    expect(screen.queryByText("对象关系证据链")).not.toBeInTheDocument();
    expect(screen.queryByText("接入预检")).not.toBeInTheDocument();
    expect(screen.queryByText("进入身份资产关系")).not.toBeInTheDocument();
    expect(screen.queryByText("进入接入预检")).not.toBeInTheDocument();
    expect(screen.queryByText("进入任务中心")).not.toBeInTheDocument();
    expect(screen.queryByText("待处理")).not.toBeInTheDocument();

    expect(screen.getAllByText("查看映射").some(item => item.closest("a")?.getAttribute("href") === "/platform-api-mappings")).toBe(true);
    expect(screen.getAllByText("查看归因").some(item => item.closest("a")?.getAttribute("href") === "/users")).toBe(true);
    expect(screen.getByText("查看规格").closest("a")).toHaveAttribute("href", "/applications");
  });

  test("redirects non-admin users to their application workspace", () => {
    render(
      <MemoryRouter>
        <IdentityConsoleOverview account={{...adminAccount, owner: "demo", isAdmin: false}} />
      </MemoryRouter>
    );

    expect(screen.getByText("正在进入应用工作台...")).toBeInTheDocument();
    expect(DashboardBackend.getDashboard).not.toHaveBeenCalled();
  });
});
