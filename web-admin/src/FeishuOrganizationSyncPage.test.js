/* eslint-env jest */

import React from "react";
import {fireEvent, render, screen} from "@testing-library/react";
import FeishuOrganizationSyncPage from "./FeishuOrganizationSyncPage";
import * as FeishuOrganizationSyncBackend from "./backend/FeishuOrganizationSyncBackend";

jest.mock("./backend/FeishuOrganizationSyncBackend", () => ({
  getFeishuOrganizationSyncConfig: jest.fn(),
  saveFeishuOrganizationSyncConfig: jest.fn(),
  testFeishuOrganizationSyncConfig: jest.fn(),
  dryRunFeishuOrganizationSyncPreview: jest.fn(),
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
  FeishuOrganizationSyncBackend.dryRunFeishuOrganizationSyncPreview.mockResolvedValue({
    status: "ok",
    data: {
      status: "succeeded",
      source: {appAlias: "app-abc", tenantAlias: "tenant-def", previewedAt: "2026-06-15T10:00:00Z"},
      snapshotStats: {departmentCount: 2, userCount: 3, membershipCount: 4},
      diff: {
        departments: {toCreate: 1, toUpdate: 1, toSoftDisable: 0, unchanged: 0, conflict: 0, invalid: 0},
        users: {toCreate: 2, toUpdate: 0, toSoftDisable: 1, unchanged: 0, conflict: 0, invalid: 0},
        memberships: {toCreate: 3, toUpdate: 0, toSoftDisable: 1, unchanged: 1, conflict: 0, invalid: 0},
      },
      reasonCounts: {would_soft_disable: 2},
      diagnostics: {safeSummary: "preview completed"},
    },
  });
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

test("runs dry-run preview and renders compact diff summary", async() => {
  render(<FeishuOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);

  fireEvent.click(await screen.findByText("预览影响"));

  expect(FeishuOrganizationSyncBackend.dryRunFeishuOrganizationSyncPreview).toHaveBeenCalledWith("engineering");
  expect(await screen.findByText("Dry-run 预览")).toBeInTheDocument();
  expect(screen.getByText("app-abc / tenant-def")).toBeInTheDocument();
  expect(screen.getByText(/预览时间/)).toBeInTheDocument();
  expect(screen.getByText("部门 2 / 用户 3 / 关系 4")).toBeInTheDocument();
  expect(screen.getByText("新增 1 / 更新 1 / 软禁 0 / 冲突 0 / 无效 0")).toBeInTheDocument();
  expect(screen.getByText("新增 2 / 更新 0 / 软禁 1 / 冲突 0 / 无效 0")).toBeInTheDocument();
  expect(screen.getByText("would_soft_disable: 2")).toBeInTheDocument();
});
