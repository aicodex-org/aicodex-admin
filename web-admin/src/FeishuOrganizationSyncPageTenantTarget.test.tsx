/* eslint-env jest */
import {expect, jest as jestValue} from "@jest/globals";
import React from "react";
import {render} from "@testing-library/react";
import FeishuOrganizationSyncPage from "./FeishuOrganizationSyncPage";
import {getFeishuBusinessOrganizationNameFromTenantKey} from "./FeishuOrganizationSyncPageUtils";
import * as FeishuOrganizationSyncBackend from "./backend/FeishuOrganizationSyncBackend";
import * as Setting from "./Setting";

declare const jest: typeof jestValue;

const {fireEvent} = require("@testing-library/react") as {fireEvent: {click: (element: Element) => void}};

jest.mock("./common/select/OrganizationSelect", () => function OrganizationSelectMock(props: {initValue?: string}) {
  return <input aria-label="organization-select" value={props.initValue || ""} readOnly />;
});

type LooseMock = {
  (...args: unknown[]): unknown;
  mockResolvedValue: (value: unknown) => LooseMock;
  mockResolvedValueOnce: (value: unknown) => LooseMock;
};
type FeishuBackendMock = Record<keyof typeof FeishuOrganizationSyncBackend, LooseMock>;

const backendMock = {} as FeishuBackendMock;

function spyBackend(name: keyof typeof FeishuOrganizationSyncBackend): LooseMock {
  return jestValue.spyOn(FeishuOrganizationSyncBackend, name) as unknown as LooseMock;
}

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
  jestValue.spyOn(Setting, "showMessage").mockImplementation(() => {});
  backendMock.getFeishuOrganizationSyncConfig = spyBackend("getFeishuOrganizationSyncConfig");
  backendMock.saveFeishuOrganizationSyncConfig = spyBackend("saveFeishuOrganizationSyncConfig");
  backendMock.testFeishuOrganizationSyncConfig = spyBackend("testFeishuOrganizationSyncConfig");
  backendMock.getFeishuOrganizationSyncRuns = spyBackend("getFeishuOrganizationSyncRuns");
  backendMock.getFeishuOrganizationSyncDryRunHistories = spyBackend("getFeishuOrganizationSyncDryRunHistories");
  backendMock.getFeishuOrganizationSyncUserBindingConflicts = spyBackend("getFeishuOrganizationSyncUserBindingConflicts");
  backendMock.getFeishuOrganizationSyncHandoffEvidence = spyBackend("getFeishuOrganizationSyncHandoffEvidence");

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: mockMatchMedia,
  });
  backendMock.getFeishuOrganizationSyncConfig.mockResolvedValue({
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
  backendMock.saveFeishuOrganizationSyncConfig.mockResolvedValue({
    status: "ok",
    data: {
      organization: "feishu-tenant-a",
      config: {
        organization: "feishu-tenant-a",
        appId: "cli_123",
        appSecret: "***",
        endpointMode: "feishu",
        tenantKey: "tenant-a",
        isEnabled: true,
        softDisableMissingData: true,
      },
    },
  });
  backendMock.testFeishuOrganizationSyncConfig.mockResolvedValue({
    status: "ok",
    data: {
      accessTokenOk: true,
      departmentSnapshotOk: true,
      userSnapshotOk: true,
      departmentCount: 1,
      userCount: 2,
      tenantKey: "tenant-a",
    },
  });
  backendMock.getFeishuOrganizationSyncRuns.mockResolvedValue({status: "ok", data: [], data2: 0});
  backendMock.getFeishuOrganizationSyncDryRunHistories.mockResolvedValue({status: "ok", data: []});
  backendMock.getFeishuOrganizationSyncUserBindingConflicts.mockResolvedValue({
    status: "ok",
    data: {status: "disabled", riskLevel: "none", counts: {total: 0}, issues: []},
  });
  backendMock.getFeishuOrganizationSyncHandoffEvidence.mockResolvedValue({
    status: "ok",
    data: {readiness: "no_run", blockedReasons: [], operatorNextActions: [], cannotInfer: []},
  });
});

afterEach(() => {
  jestValue.restoreAllMocks();
});

test("normalizes Feishu business organization name from tenant key", () => {
  expect(getFeishuBusinessOrganizationNameFromTenantKey(" Tenant/A ")).toBe("feishu-tenant-a");
  expect(getFeishuBusinessOrganizationNameFromTenantKey("cli_aaba06aa64399cbc")).toBe("feishu-cli_aaba06aa64399cbc");
  expect(getFeishuBusinessOrganizationNameFromTenantKey("")).toBe("");
});

test("keeps tenant key from connection test before saving config", async() => {
  const view = render(<FeishuOrganizationSyncPage account={{owner: "engineering", isAdmin: true}} />);

  fireEvent.click(await view.findByText("测试连接"));

  expect(await view.findByText(/保存后同步组织：feishu-tenant-a/)).not.toBeNull();

  const saveButton = view.getByText("保存").closest("button");
  expect(saveButton).not.toBeNull();
  fireEvent.click(saveButton as HTMLElement);

  expect(backendMock.saveFeishuOrganizationSyncConfig).toHaveBeenCalledWith(expect.objectContaining({
    organization: "engineering",
    tenantKey: "tenant-a",
  }));
  expect(await view.findByDisplayValue("feishu-tenant-a")).not.toBeNull();
});
