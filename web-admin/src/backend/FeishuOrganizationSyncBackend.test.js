/* eslint-env jest */

import * as FeishuOrganizationSyncBackend from "./FeishuOrganizationSyncBackend";

beforeEach(() => {
  global.fetch = jest.fn(() => Promise.resolve({json: () => Promise.resolve({status: "ok"})}));
});

afterEach(() => {
  jest.restoreAllMocks();
});

test("calls Feishu organization sync config endpoints", async() => {
  await FeishuOrganizationSyncBackend.getFeishuOrganizationSyncConfig("engineering");
  await FeishuOrganizationSyncBackend.saveFeishuOrganizationSyncConfig({organization: "engineering"});
  await FeishuOrganizationSyncBackend.testFeishuOrganizationSyncConfig({organization: "engineering"});

  expect(global.fetch).toHaveBeenNthCalledWith(1, "/api/feishu-org-sync/config?organization=engineering", expect.objectContaining({method: "GET"}));
  expect(global.fetch).toHaveBeenNthCalledWith(2, "/api/feishu-org-sync/config", expect.objectContaining({method: "POST"}));
  expect(global.fetch).toHaveBeenNthCalledWith(3, "/api/feishu-org-sync/config/test", expect.objectContaining({method: "POST"}));
});

test("calls Feishu organization sync run endpoints", async() => {
  await FeishuOrganizationSyncBackend.startFeishuOrganizationSyncRun("engineering");
  await FeishuOrganizationSyncBackend.getFeishuOrganizationSyncRuns("engineering", 1, 10);
  await FeishuOrganizationSyncBackend.getFeishuOrganizationSyncRun("engineering", "run-1");

  expect(global.fetch).toHaveBeenNthCalledWith(1, "/api/feishu-org-sync/runs", expect.objectContaining({method: "POST"}));
  expect(global.fetch).toHaveBeenNthCalledWith(2, "/api/feishu-org-sync/runs?organization=engineering&p=1&pageSize=10&field=&value=&sortField=&sortOrder=", expect.objectContaining({method: "GET"}));
  expect(global.fetch).toHaveBeenNthCalledWith(3, "/api/feishu-org-sync/runs/run-1?organization=engineering", expect.objectContaining({method: "GET"}));
});

test("calls Feishu organization sync dry-run preview endpoint", async() => {
  await FeishuOrganizationSyncBackend.dryRunFeishuOrganizationSyncPreview("engineering");

  expect(global.fetch).toHaveBeenCalledWith("/api/feishu-org-sync/dry-run-preview", expect.objectContaining({
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

  expect(global.fetch).toHaveBeenNthCalledWith(1, "/api/feishu-org-sync/dry-run-history?organization=engineering&sourceConnectionIdHash=source-a&status=failed&diagnosticAlias=contact_permission_missing&createdFrom=2026-06-15T00%3A00%3A00Z&createdTo=2026-06-15T23%3A59%3A59Z&topN=5", expect.objectContaining({method: "GET"}));
  expect(global.fetch).toHaveBeenNthCalledWith(2, "/api/feishu-org-sync/dry-run-history/history-1?organization=engineering", expect.objectContaining({method: "GET"}));
});

test("calls Feishu organization sync user binding conflict diagnostics endpoint", async() => {
  await FeishuOrganizationSyncBackend.getFeishuOrganizationSyncUserBindingConflicts("engineering", {
    limit: 5,
    includeOk: true,
  });

  expect(global.fetch).toHaveBeenCalledWith("/api/feishu-org-sync/user-binding-conflicts?organization=engineering&limit=5&includeOk=true", expect.objectContaining({method: "GET"}));
});

test("passes Feishu organization sync diagnostics payload through run detail", async() => {
  global.fetch = jest.fn(() => Promise.resolve({
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

  const result = await FeishuOrganizationSyncBackend.getFeishuOrganizationSyncRun("engineering", "run-1");

  expect(result.data.diagnostics).toEqual(expect.objectContaining({
    failedStage: "tenant_token",
    failureCategory: "credentials",
    operatorAction: "fix_credentials",
  }));
  expect(global.fetch).toHaveBeenCalledWith("/api/feishu-org-sync/runs/run-1?organization=engineering", expect.objectContaining({method: "GET"}));
});
