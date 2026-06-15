/* eslint-env jest */

import React from "react";
import {render, screen} from "@testing-library/react";
import FeishuOrganizationSyncPage from "./FeishuOrganizationSyncPage";
import * as FeishuOrganizationSyncBackend from "./backend/FeishuOrganizationSyncBackend";

jest.mock("./backend/FeishuOrganizationSyncBackend", () => ({
  getFeishuOrganizationSyncConfig: jest.fn(),
  saveFeishuOrganizationSyncConfig: jest.fn(),
  testFeishuOrganizationSyncConfig: jest.fn(),
  startFeishuOrganizationSyncRun: jest.fn(),
  getFeishuOrganizationSyncRuns: jest.fn(),
}));

jest.mock("./common/select/OrganizationSelect", () => function OrganizationSelectMock(props) {
  return <input aria-label="organization-select" value={props.initValue || ""} readOnly />;
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
  FeishuOrganizationSyncBackend.getFeishuOrganizationSyncConfig.mockResolvedValue({
    status: "ok",
    data: {
      config: {
        organization: "engineering",
        appId: "cli_123",
        appSecret: "***",
        endpointMode: "feishu",
        isEnabled: true,
        softDisableMissingData: true,
      },
    },
  });
  FeishuOrganizationSyncBackend.getFeishuOrganizationSyncRuns.mockResolvedValue({status: "ok", data: [], data2: 0});
});

afterEach(() => {
  jest.clearAllMocks();
});

test("renders Feishu organization sync config and endpoint mode", async() => {
  render(<FeishuOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);

  expect(await screen.findByText("飞书组织架构同步")).toBeInTheDocument();
  expect(FeishuOrganizationSyncBackend.getFeishuOrganizationSyncConfig).toHaveBeenCalledWith("engineering");
  expect(screen.getByText("飞书组织架构同步")).toBeInTheDocument();
  expect(screen.getByText("国内飞书（open.feishu.cn）")).toBeInTheDocument();
  expect(screen.getByDisplayValue("cli_123")).toBeInTheDocument();
});

test("renders run diagnostics with compact labels and redacted summary", async() => {
  FeishuOrganizationSyncBackend.getFeishuOrganizationSyncRuns.mockResolvedValue({
    status: "ok",
    data: [{
      name: "run-failed",
      status: "failed",
      stage: "fetching",
      triggerType: "scheduled",
      diagnostics: {
        failedStage: "tenant_token",
        failureCategory: "credentials",
        retryReadiness: "not_ready",
        operatorAction: "fix_credentials",
        safeSummary: "invalid app credentials user_id=*** *** ***",
        durationMs: 125000,
        stats: {
          departmentCount: 3,
          userCount: 5,
          membershipCount: 7,
          disabledCount: 1,
        },
      },
      errorText: "tenant_access_token open_id=open_1 alice@example.test 13800138000",
    }],
    data2: 1,
  });

  render(<FeishuOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);

  expect(await screen.findByText("run-failed")).toBeInTheDocument();
  expect(screen.getByText("凭证")).toBeInTheDocument();
  expect(screen.getByText("租户 token")).toBeInTheDocument();
  expect(screen.getByText("修凭证")).toBeInTheDocument();
  expect(screen.getByText("部 3 / 人 5 / 关系 7 / 禁 1")).toBeInTheDocument();
  expect(screen.getByText("2 分 5 秒")).toBeInTheDocument();
  expect(screen.getByText("invalid app credentials user_id=*** *** ***")).toBeInTheDocument();
  expect(screen.queryByText(/open_1/)).not.toBeInTheDocument();
  expect(screen.queryByText(/alice@example\.test/)).not.toBeInTheDocument();
  expect(screen.queryByText(/13800138000/)).not.toBeInTheDocument();
});
