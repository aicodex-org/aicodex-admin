/* eslint-env jest */
import {expect, jest} from "@jest/globals";
import * as Setting from "../Setting";
import * as FeishuOrganizationSyncBackend from "./FeishuOrganizationSyncBackend";
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

test("calls Feishu organization sync config endpoints", async() => {
  await FeishuOrganizationSyncBackend.getFeishuOrganizationSyncConfig("engineering");
  await FeishuOrganizationSyncBackend.saveFeishuOrganizationSyncConfig({organization: "engineering"});
  await FeishuOrganizationSyncBackend.testFeishuOrganizationSyncConfig({organization: "engineering"});

  expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/feishu-org-sync/config?organization=engineering", expect.objectContaining({method: "GET"}));
  expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/feishu-org-sync/config", expect.objectContaining({method: "POST"}));
  expect(fetchMock).toHaveBeenNthCalledWith(3, "/api/feishu-org-sync/config/test", expect.objectContaining({method: "POST"}));
});

test("calls Feishu organization sync run endpoints", async() => {
  await FeishuOrganizationSyncBackend.startFeishuOrganizationSyncRun("engineering");
  await FeishuOrganizationSyncBackend.getFeishuOrganizationSyncRuns("engineering", 1, 10);
  await FeishuOrganizationSyncBackend.getFeishuOrganizationSyncRun("engineering", "run-1");

  expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/feishu-org-sync/runs", expect.objectContaining({method: "POST"}));
  expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/feishu-org-sync/runs?organization=engineering&p=1&pageSize=10&field=&value=&sortField=&sortOrder=", expect.objectContaining({method: "GET"}));
  expect(fetchMock).toHaveBeenNthCalledWith(3, "/api/feishu-org-sync/runs/run-1?organization=engineering", expect.objectContaining({method: "GET"}));
});

test("calls Feishu organization sync dry-run preview endpoint", async() => {
  await FeishuOrganizationSyncBackend.dryRunFeishuOrganizationSyncPreview("engineering");

  expect(fetchMock).toHaveBeenCalledWith("/api/feishu-org-sync/dry-run-preview", expect.objectContaining({
    method: "POST",
    body: JSON.stringify({organization: "engineering"}),
  }));
});

test("calls Feishu organization sync dry-run history endpoints", async() => {
  await FeishuOrganizationSyncBackend.getFeishuOrganizationSyncDryRunHistories("engineering", {
    sourceConnectionIdHash: "source-a",
    status: "failed",
    diagnosticAlias: "contact_permission_missing",
    createdFrom: "2026-06-15T00:00:00Z",
    createdTo: "2026-06-15T23:59:59Z",
    topN: 5,
  });
  await FeishuOrganizationSyncBackend.getFeishuOrganizationSyncDryRunHistory("engineering", "history-1");

  expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/feishu-org-sync/dry-run-history?organization=engineering&sourceConnectionIdHash=source-a&status=failed&diagnosticAlias=contact_permission_missing&createdFrom=2026-06-15T00%3A00%3A00Z&createdTo=2026-06-15T23%3A59%3A59Z&topN=5", expect.objectContaining({method: "GET"}));
  expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/feishu-org-sync/dry-run-history/history-1?organization=engineering", expect.objectContaining({method: "GET"}));
});

test("calls Feishu organization sync user binding conflict diagnostics endpoint", async() => {
  await FeishuOrganizationSyncBackend.getFeishuOrganizationSyncUserBindingConflicts("engineering", {
    limit: 5,
    includeOk: true,
  });

  expect(fetchMock).toHaveBeenCalledWith("/api/feishu-org-sync/user-binding-conflicts?organization=engineering&limit=5&includeOk=true", expect.objectContaining({method: "GET"}));
});

test("calls Feishu organization sync handoff evidence endpoint", async() => {
  await FeishuOrganizationSyncBackend.getFeishuOrganizationSyncHandoffEvidence("engineering", {
    sourceType: "run",
    sourceId: "run-1",
  });

  expect(fetchMock).toHaveBeenCalledWith("/api/feishu-org-sync/handoff-evidence?organization=engineering&sourceType=run&sourceId=run-1", expect.objectContaining({method: "GET"}));
});

test("passes Feishu organization sync diagnostics payload through run detail", async() => {
  fetchMock = jest.fn(() => Promise.resolve({
    json: () => Promise.resolve({
      status: "ok",
      data: {
        name: "run-1",
        diagnostics: {
          failedStage: "tenant_token",
          failureCategory: "credentials",
          retryReadiness: "not_ready",
          operatorAction: "fix_credentials",
          safeSummary: "invalid app credentials",
        },
      },
    }),
  }));
  global.fetch = fetchMock as unknown as typeof fetch;

  const result = await FeishuOrganizationSyncBackend.getFeishuOrganizationSyncRun("engineering", "run-1");

  expect(result.data?.diagnostics).toEqual(expect.objectContaining({
    failedStage: "tenant_token",
    failureCategory: "credentials",
    operatorAction: "fix_credentials",
  }));
  expect(fetchMock).toHaveBeenCalledWith("/api/feishu-org-sync/runs/run-1?organization=engineering", expect.objectContaining({method: "GET"}));
});
