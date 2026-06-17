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

  test("renders enterprise identity status entries from existing dashboard data", async() => {
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

    expect(screen.getByText("身份治理总览")).toBeInTheDocument();
    expect(screen.getByText("加载身份治理状态...")).toBeInTheDocument();

    expect(await screen.findAllByText("组织主数据")).toHaveLength(2);
    expect(screen.getAllByText("企业微信 / 飞书 / OIDC").length).toBeGreaterThan(0);
    expect(screen.getByText("应用接入 / API 映射")).toBeInTheDocument();
    expect(screen.getAllByText("LLM AI 网关中心").length).toBeGreaterThan(0);
    expect(screen.getByText("最近失败 / 待处理风险")).toBeInTheDocument();
    expect(screen.getAllByText("进入应用接入").some(item => item.closest("a")?.getAttribute("href") === "/applications")).toBe(true);
    expect(screen.getByText("API 网关映射").closest("a")).toHaveAttribute("href", "/platform-api-mappings");
    expect(screen.queryByText(/Gateway 投影/)).not.toBeInTheDocument();
    expect(screen.getByText("身份域覆盖")).toBeInTheDocument();
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
    expect(screen.getByText("处理组织质量").closest("a")).toHaveAttribute("href", "/organization-directory-quality");
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
