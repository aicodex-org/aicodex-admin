import {afterEach, beforeEach, expect, test, vi} from "vitest";
import * as Setting from "../Setting";
import {
  addGroup,
  deleteGroup,
  getGroup,
  getGroups,
  updateGroup
} from "./GroupBackend";

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn(() => Promise.resolve({
    json: () => Promise.resolve({status: "ok"}),
  }));
  global.fetch = fetchMock as unknown as typeof fetch;
  vi.spyOn(Setting, "getAcceptLanguage").mockReturnValue("zh");
});

afterEach(() => {
  vi.restoreAllMocks();
});

test("calls group list endpoint with the existing query contract", async() => {
  await getGroups("engineering", true, 2, 20, "type", "Virtual", "name", "ascend");

  expect(global.fetch).toHaveBeenCalledWith(
    "/api/get-groups?owner=engineering&p=2&pageSize=20&field=type&value=Virtual&sortField=name&sortOrder=ascend&withTree=true",
    expect.objectContaining({
      method: "GET",
      credentials: "include",
      headers: {"Accept-Language": "zh"},
    })
  );
});

test("keeps default group list query parameters compatible", async() => {
  await getGroups();

  expect(global.fetch).toHaveBeenCalledWith(
    "/api/get-groups?owner=&p=&pageSize=&field=&value=&sortField=&sortOrder=&withTree=false",
    expect.objectContaining({
      method: "GET",
      credentials: "include",
      headers: {"Accept-Language": "zh"},
    })
  );
});

test("calls group detail endpoint with encoded group names", async() => {
  await getGroup("engineering", "group main");

  expect(global.fetch).toHaveBeenCalledWith(
    "/api/get-group?id=engineering/group%20main",
    expect.objectContaining({
      method: "GET",
      credentials: "include",
      headers: {"Accept-Language": "zh"},
    })
  );
});

test("calls group mutation endpoints with cloned payloads", async() => {
  const group = {
    owner: "engineering",
    name: "group-main",
    displayName: "Main Group",
    type: "Virtual",
    parentId: "engineering",
    isEnabled: true,
  };

  await addGroup(group);
  await updateGroup("engineering", "group-main", group);
  await deleteGroup(group);

  expect(global.fetch).toHaveBeenNthCalledWith(1, "/api/add-group", expect.objectContaining({method: "POST"}));
  expect(global.fetch).toHaveBeenNthCalledWith(2, "/api/update-group?id=engineering/group-main", expect.objectContaining({method: "POST"}));
  expect(global.fetch).toHaveBeenNthCalledWith(3, "/api/delete-group", expect.objectContaining({method: "POST"}));
  fetchMock.mock.calls.forEach(([, options]) => {
    expect(options).toEqual(expect.objectContaining({
      credentials: "include",
      headers: {"Accept-Language": "zh"},
      body: JSON.stringify(group),
    }));
    expect(JSON.parse(String((options as RequestInit).body))).not.toBe(group);
  });
});
