import {afterEach, beforeEach, expect, test, vi} from "vitest";
import * as Setting from "../Setting";
import * as DingTalkOrganizationSyncBackend from "./DingTalkOrganizationSyncBackend";
import {
  getDingTalkOrganizationSyncConfig,
  saveDingTalkOrganizationSyncConfig
} from "./DingTalkOrganizationSyncBackend";

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn(() => Promise.resolve({
    json: () => Promise.resolve({
      status: "ok",
      data: {
        organization: "engineering",
        defaultOrganization: "engineering",
        defaultOrganizationSource: "configured",
        conflictingProvider: "WeCom",
        conflictingOrganization: "engineering",
        conflictingConfigured: true,
        conflictingEnabled: false,
        conflictingOrganizations: ["engineering"],
        sourceStatus: {
          organization: "engineering",
          currentSource: "dingtalk",
          state: "occupied",
          occupyingSource: {
            source: "wecom",
            displayName: "WeCom",
            organization: "engineering",
            configured: true,
            enabled: false,
          },
        },
      },
    }),
  }));
  global.fetch = fetchMock as unknown as typeof fetch;
  vi.spyOn(Setting, "getAcceptLanguage").mockReturnValue("zh");
});

afterEach(() => {
  vi.restoreAllMocks();
});

test("passes DingTalk organization sync source status through config APIs", async() => {
  const getResult = await getDingTalkOrganizationSyncConfig("engineering");
  const saveResult = await saveDingTalkOrganizationSyncConfig({
    organization: "engineering",
    appKey: "ding-app",
    appSecret: "***",
  });

  expect(getResult.data).toEqual(expect.objectContaining({
    defaultOrganization: "engineering",
    conflictingProvider: "WeCom",
    conflictingOrganization: "engineering",
    conflictingConfigured: true,
    conflictingOrganizations: ["engineering"],
    sourceStatus: expect.objectContaining({
      currentSource: "dingtalk",
      state: "occupied",
    }),
  }));
  expect(saveResult.data).toEqual(expect.objectContaining({
    defaultOrganizationSource: "configured",
    conflictingConfigured: true,
  }));
  expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/dingtalk-org-sync/config?organization=engineering", expect.objectContaining({
    method: "GET",
    credentials: "include",
    headers: {"Accept-Language": "zh"},
  }));
  expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/dingtalk-org-sync/config", expect.objectContaining({
    method: "POST",
    credentials: "include",
    headers: {"Accept-Language": "zh"},
    body: JSON.stringify({organization: "engineering", appKey: "ding-app", appSecret: "***"}),
  }));
});

test("calls DingTalk organization sync config endpoints", async() => {
  await DingTalkOrganizationSyncBackend.getDingTalkOrganizationSyncConfig("engineering");
  await DingTalkOrganizationSyncBackend.saveDingTalkOrganizationSyncConfig({organization: "engineering"});
  await DingTalkOrganizationSyncBackend.testDingTalkOrganizationSyncConfig({organization: "engineering"});

  expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/dingtalk-org-sync/config?organization=engineering", expect.objectContaining({method: "GET"}));
  expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/dingtalk-org-sync/config", expect.objectContaining({method: "POST"}));
  expect(fetchMock).toHaveBeenNthCalledWith(3, "/api/dingtalk-org-sync/config/test", expect.objectContaining({method: "POST"}));
});

test("calls DingTalk organization sync run endpoints", async() => {
  await DingTalkOrganizationSyncBackend.startDingTalkOrganizationSyncRun("engineering");
  await DingTalkOrganizationSyncBackend.getDingTalkOrganizationSyncRuns("engineering", 1, 10);
  await DingTalkOrganizationSyncBackend.getDingTalkOrganizationSyncRun("engineering", "run-1");

  expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/dingtalk-org-sync/runs", expect.objectContaining({
    method: "POST",
    body: JSON.stringify({organization: "engineering"}),
  }));
  expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/dingtalk-org-sync/runs?organization=engineering&p=1&pageSize=10&field=&value=&sortField=&sortOrder=", expect.objectContaining({method: "GET"}));
  expect(fetchMock).toHaveBeenNthCalledWith(3, "/api/dingtalk-org-sync/runs/run-1?organization=engineering", expect.objectContaining({method: "GET"}));
});
