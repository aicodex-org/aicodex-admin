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
