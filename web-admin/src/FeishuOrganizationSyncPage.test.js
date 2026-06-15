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
