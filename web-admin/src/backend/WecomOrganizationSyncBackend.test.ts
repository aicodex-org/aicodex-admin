/* eslint-env jest */
// Copyright 2026 The AICodex Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {expect, jest} from "@jest/globals";
import * as WecomOrganizationSyncBackend from "./WecomOrganizationSyncBackend";

let fetchMock: ReturnType<typeof jest.fn>;

beforeEach(() => {
  fetchMock = jest.fn(() => Promise.resolve({
    json: () => Promise.resolve({status: "ok"}),
  }));
  global.fetch = fetchMock as unknown as typeof fetch;
});

test("uses module-based config API paths", async() => {
  await WecomOrganizationSyncBackend.getWecomOrganizationSyncConfig("engineering");
  await WecomOrganizationSyncBackend.saveWecomOrganizationSyncConfig({organization: "engineering"});
  await WecomOrganizationSyncBackend.testWecomOrganizationSyncConfig({organization: "engineering"});

  expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/wecom-org-sync/config?organization=engineering", expect.objectContaining({method: "GET"}));
  expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/wecom-org-sync/config", expect.objectContaining({method: "POST"}));
  expect(fetchMock).toHaveBeenNthCalledWith(3, "/api/wecom-org-sync/config/test", expect.objectContaining({method: "POST"}));
});

test("sends scheduled sync fields in config save body", async() => {
  await WecomOrganizationSyncBackend.saveWecomOrganizationSyncConfig({
    organization: "engineering",
    scheduleEnabled: true,
    scheduleCron: "*/15 * * * *",
    scheduleTimezone: "UTC",
  });

  const options = fetchMock.mock.calls[0][1] as RequestInit;
  expect(JSON.parse(options.body as string)).toEqual(expect.objectContaining({
    scheduleEnabled: true,
    scheduleCron: "*/15 * * * *",
    scheduleTimezone: "UTC",
  }));
});

test("uses module-based run API paths", async() => {
  await WecomOrganizationSyncBackend.startWecomOrganizationSyncRun("engineering");
  await WecomOrganizationSyncBackend.getWecomOrganizationSyncRuns("engineering", 1, 10);

  expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/wecom-org-sync/runs", expect.objectContaining({method: "POST"}));
  expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/wecom-org-sync/runs?organization=engineering&p=1&pageSize=10&field=&value=&sortField=&sortOrder=", expect.objectContaining({method: "GET"}));
});

test("uses module-based dry-run preview and history API paths", async() => {
  await WecomOrganizationSyncBackend.dryRunWecomOrganizationSyncPreview("engineering");
  await WecomOrganizationSyncBackend.getWecomOrganizationSyncDryRunHistories("engineering", {
    sourceConnectionIdHash: "source-a",
    status: "failed",
    diagnosticAlias: "contact_permission_missing",
    createdFrom: "2026-06-18T00:00:00Z",
    createdTo: "2026-06-18T23:59:59Z",
    topN: 5,
  });
  await WecomOrganizationSyncBackend.getWecomOrganizationSyncDryRunHistory("engineering", "history-1");

  expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/wecom-org-sync/dry-run-preview", expect.objectContaining({method: "POST"}));
  expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/wecom-org-sync/dry-run-history?organization=engineering&sourceConnectionIdHash=source-a&status=failed&diagnosticAlias=contact_permission_missing&createdFrom=2026-06-18T00%3A00%3A00Z&createdTo=2026-06-18T23%3A59%3A59Z&topN=5", expect.objectContaining({method: "GET"}));
  expect(fetchMock).toHaveBeenNthCalledWith(3, "/api/wecom-org-sync/dry-run-history/history-1?organization=engineering", expect.objectContaining({method: "GET"}));
});
