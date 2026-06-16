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

import * as WecomOrganizationSyncBackend from "./WecomOrganizationSyncBackend";

beforeEach(() => {
  global.fetch = jest.fn(() => Promise.resolve({
    json: () => Promise.resolve({status: "ok"}),
  }));
});

test("uses module-based config API paths", async() => {
  await WecomOrganizationSyncBackend.getWecomOrganizationSyncConfig("engineering");
  await WecomOrganizationSyncBackend.saveWecomOrganizationSyncConfig({organization: "engineering"});
  await WecomOrganizationSyncBackend.testWecomOrganizationSyncConfig({organization: "engineering"});

  expect(global.fetch).toHaveBeenNthCalledWith(1, "/api/wecom-org-sync/config?organization=engineering", expect.objectContaining({method: "GET"}));
  expect(global.fetch).toHaveBeenNthCalledWith(2, "/api/wecom-org-sync/config", expect.objectContaining({method: "POST"}));
  expect(global.fetch).toHaveBeenNthCalledWith(3, "/api/wecom-org-sync/config/test", expect.objectContaining({method: "POST"}));
});

test("sends scheduled sync fields in config save body", async() => {
  await WecomOrganizationSyncBackend.saveWecomOrganizationSyncConfig({
    organization: "engineering",
    scheduleEnabled: true,
    scheduleCron: "*/15 * * * *",
    scheduleTimezone: "UTC",
  });

  const options = global.fetch.mock.calls[0][1];
  expect(JSON.parse(options.body)).toEqual(expect.objectContaining({
    scheduleEnabled: true,
    scheduleCron: "*/15 * * * *",
    scheduleTimezone: "UTC",
  }));
});

test("uses module-based run API paths", async() => {
  await WecomOrganizationSyncBackend.startWecomOrganizationSyncRun("engineering");
  await WecomOrganizationSyncBackend.getWecomOrganizationSyncRuns("engineering", 1, 10);

  expect(global.fetch).toHaveBeenNthCalledWith(1, "/api/wecom-org-sync/runs", expect.objectContaining({method: "POST"}));
  expect(global.fetch).toHaveBeenNthCalledWith(2, "/api/wecom-org-sync/runs?organization=engineering&p=1&pageSize=10&field=&value=&sortField=&sortOrder=", expect.objectContaining({method: "GET"}));
});
