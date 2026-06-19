/* eslint-env jest */
import {expect, jest} from "@jest/globals";
import * as Setting from "../Setting";
import {
  addSyncer,
  deleteSyncer,
  getSyncer,
  getSyncers,
  runSyncer,
  testSyncerDb,
  updateSyncer
} from "./SyncerBackend";

let fetchMock: ReturnType<typeof jest.fn>;

beforeEach(() => {
  fetchMock = jest.fn(() => Promise.resolve({
    json: () => Promise.resolve({status: "ok"}),
  }));
  global.fetch = fetchMock as unknown as typeof fetch;
  jest.spyOn(Setting, "getAcceptLanguage").mockReturnValue("zh");
});

afterEach(() => {
  jest.restoreAllMocks();
});

test("calls syncer list endpoint with the existing query contract", async() => {
  await getSyncers("admin", "engineering", 2, 20, "type", "LDAP", "name", "ascend");

  expect(global.fetch).toHaveBeenCalledWith(
    "/api/get-syncers?owner=admin&organization=engineering&p=2&pageSize=20&field=type&value=LDAP&sortField=name&sortOrder=ascend",
    expect.objectContaining({
      method: "GET",
      credentials: "include",
      headers: {"Accept-Language": "zh"},
    })
  );
});

test("calls syncer detail and run endpoints with encoded names", async() => {
  await getSyncer("admin", "syncer main");
  await runSyncer("admin", "syncer main");

  expect(global.fetch).toHaveBeenNthCalledWith(1, "/api/get-syncer?id=admin/syncer%20main", expect.objectContaining({method: "GET"}));
  expect(global.fetch).toHaveBeenNthCalledWith(2, "/api/run-syncer?id=admin/syncer%20main", expect.objectContaining({method: "GET"}));
});

test("calls syncer mutation endpoints with cloned payloads", async() => {
  const syncer = {
    owner: "admin",
    name: "syncer-main",
    organization: "engineering",
    type: "Database",
    password: "secret",
  };

  await addSyncer(syncer);
  await updateSyncer("admin", "syncer-main", syncer);
  await testSyncerDb(syncer);
  await deleteSyncer(syncer);

  expect(global.fetch).toHaveBeenNthCalledWith(1, "/api/add-syncer", expect.objectContaining({method: "POST"}));
  expect(global.fetch).toHaveBeenNthCalledWith(2, "/api/update-syncer?id=admin/syncer-main", expect.objectContaining({method: "POST"}));
  expect(global.fetch).toHaveBeenNthCalledWith(3, "/api/test-syncer-db", expect.objectContaining({method: "POST"}));
  expect(global.fetch).toHaveBeenNthCalledWith(4, "/api/delete-syncer", expect.objectContaining({method: "POST"}));
  fetchMock.mock.calls.forEach(([, options]) => {
    if ((options as RequestInit).method === "POST") {
      expect(options).toEqual(expect.objectContaining({
        credentials: "include",
        headers: {"Accept-Language": "zh"},
        body: JSON.stringify(syncer),
      }));
    }
  });
});
