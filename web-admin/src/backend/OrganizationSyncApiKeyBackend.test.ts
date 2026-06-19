/* eslint-env jest */
import {expect, jest} from "@jest/globals";
import * as Setting from "../Setting";
import {
  addOrganizationSyncApiKey,
  deleteOrganizationSyncApiKey,
  disableOrganizationSyncApiKey,
  getOrganizationSyncApiKeys,
  rotateOrganizationSyncApiKey
} from "./OrganizationSyncApiKeyBackend";

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

test("calls organization sync API Key list endpoint with encoded organization", async() => {
  await getOrganizationSyncApiKeys("engineering org");

  expect(global.fetch).toHaveBeenCalledWith(
    "/api/organization-sync-api-keys?organization=engineering%20org",
    expect.objectContaining({
      method: "GET",
      credentials: "include",
      headers: {"Accept-Language": "zh"},
    })
  );
  const [, options] = fetchMock.mock.calls[0];
  expect(options).not.toHaveProperty("body");
});

test("calls organization sync API Key mutation endpoints without leaking list plaintext", async() => {
  const key = {
    owner: "engineering",
    organization: "engineering",
    name: "sync-key-main",
    displayName: "Engineering sync key",
  };

  await addOrganizationSyncApiKey(key);
  await rotateOrganizationSyncApiKey(key);
  await disableOrganizationSyncApiKey(key);
  await deleteOrganizationSyncApiKey(key);

  expect(global.fetch).toHaveBeenNthCalledWith(1, "/api/organization-sync-api-keys", expect.objectContaining({method: "POST"}));
  expect(global.fetch).toHaveBeenNthCalledWith(2, "/api/organization-sync-api-keys/rotate", expect.objectContaining({method: "POST"}));
  expect(global.fetch).toHaveBeenNthCalledWith(3, "/api/organization-sync-api-keys/disable", expect.objectContaining({method: "POST"}));
  expect(global.fetch).toHaveBeenNthCalledWith(4, "/api/organization-sync-api-keys/delete", expect.objectContaining({method: "POST"}));
  fetchMock.mock.calls.forEach(([, options]) => {
    const requestOptions = options as RequestInit;
    expect(options).toEqual(expect.objectContaining({
      credentials: "include",
      headers: {"Accept-Language": "zh"},
      body: JSON.stringify(key),
    }));
    expect(String(requestOptions.body)).not.toContain("secret-value");
  });
});
