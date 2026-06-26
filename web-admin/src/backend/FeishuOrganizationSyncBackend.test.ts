/* eslint-env jest */
import {expect, jest} from "@jest/globals";
import * as Setting from "../Setting";
import {
  getFeishuOrganizationSyncConfig,
  saveFeishuOrganizationSyncConfig
} from "./FeishuOrganizationSyncBackend";

let fetchMock: ReturnType<typeof jest.fn>;

beforeEach(() => {
  fetchMock = jest.fn(() => Promise.resolve({
    json: () => Promise.resolve({
      status: "ok",
      data: {
        organization: "engineering",
        defaultOrganization: "feishu-org",
        defaultOrganizationSource: "configured",
        conflictingProvider: "WeCom",
        conflictingOrganization: "engineering",
        conflictingConfigured: true,
        conflictingEnabled: false,
        conflictingOrganizations: ["engineering"],
      },
    }),
  }));
  global.fetch = fetchMock as unknown as typeof fetch;
  jest.spyOn(Setting, "getAcceptLanguage").mockReturnValue("zh");
});

afterEach(() => {
  jest.restoreAllMocks();
});

test("passes Feishu organization sync source status through config APIs", async() => {
  const getResult = await getFeishuOrganizationSyncConfig("engineering");
  const saveResult = await saveFeishuOrganizationSyncConfig({
    organization: "engineering",
    endpointMode: "domestic",
    appId: "cli_a",
  });

  expect(getResult.data).toEqual(expect.objectContaining({
    defaultOrganization: "feishu-org",
    conflictingProvider: "WeCom",
    conflictingOrganization: "engineering",
    conflictingConfigured: true,
    conflictingEnabled: false,
    conflictingOrganizations: ["engineering"],
  }));
  expect(saveResult.data).toEqual(expect.objectContaining({
    defaultOrganizationSource: "configured",
    conflictingConfigured: true,
  }));
  expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/feishu-org-sync/config?organization=engineering", expect.objectContaining({
    method: "GET",
    credentials: "include",
    headers: {"Accept-Language": "zh"},
  }));
  expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/feishu-org-sync/config", expect.objectContaining({
    method: "POST",
    credentials: "include",
    headers: {"Accept-Language": "zh"},
    body: JSON.stringify({organization: "engineering", endpointMode: "domestic", appId: "cli_a"}),
  }));
});
