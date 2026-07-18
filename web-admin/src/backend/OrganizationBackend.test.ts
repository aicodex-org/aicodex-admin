import {afterEach, beforeEach, expect, test, vi} from "vitest";
import * as Setting from "../Setting";
import {
  addOrganization,
  deleteOrganization,
  getDefaultApplication,
  getOrganization,
  getOrganizationNames,
  getOrganizations,
  updateOrganization
} from "./OrganizationBackend";

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

test("calls organization list endpoint with the existing query contract", async() => {
  await getOrganizations("admin", "engineering", 2, 20, "passwordType", "bcrypt", "name", "ascend");

  expect(global.fetch).toHaveBeenCalledWith(
    "/api/get-organizations?owner=admin&organizationName=engineering&p=2&pageSize=20&field=passwordType&value=bcrypt&sortField=name&sortOrder=ascend",
    expect.objectContaining({
      method: "GET",
      credentials: "include",
      headers: {"Accept-Language": "zh"},
    })
  );
});

test("keeps default organization list query parameters compatible", async() => {
  await getOrganizations("admin");

  expect(global.fetch).toHaveBeenCalledWith(
    "/api/get-organizations?owner=admin&organizationName=&p=&pageSize=&field=&value=&sortField=&sortOrder=",
    expect.objectContaining({
      method: "GET",
      credentials: "include",
      headers: {"Accept-Language": "zh"},
    })
  );
});

test("calls organization detail and default application endpoints with encoded names", async() => {
  await getOrganization("admin", "engineering org");
  await getDefaultApplication("admin", "engineering org");

  expect(global.fetch).toHaveBeenNthCalledWith(
    1,
    "/api/get-organization?id=admin/engineering%20org",
    expect.objectContaining({
      method: "GET",
      credentials: "include",
      headers: {"Accept-Language": "zh"},
    })
  );
  expect(global.fetch).toHaveBeenNthCalledWith(
    2,
    "/api/get-default-application?id=admin/engineering%20org",
    expect.objectContaining({
      method: "GET",
      credentials: "include",
      headers: {"Accept-Language": "zh"},
    })
  );
});

test("calls organization names endpoint", async() => {
  await getOrganizationNames("admin");

  expect(global.fetch).toHaveBeenCalledWith(
    "/api/get-organization-names?owner=admin",
    expect.objectContaining({
      method: "GET",
      credentials: "include",
      headers: {"Accept-Language": "zh"},
    })
  );
});

test("calls organization mutation endpoints with cloned payloads", async() => {
  const organization = {
    owner: "admin",
    name: "engineering",
    displayName: "Engineering",
    passwordType: "bcrypt",
    enableSoftDeletion: false,
  };
  vi.spyOn(Setting, "deepCopy").mockImplementation((obj: unknown) => ({
    ...(obj as Record<string, unknown>),
    copied: true,
  }));

  await addOrganization(organization);
  await updateOrganization("admin", "engineering org", organization);
  await deleteOrganization(organization);

  expect(global.fetch).toHaveBeenNthCalledWith(1, "/api/add-organization", expect.objectContaining({method: "POST"}));
  expect(global.fetch).toHaveBeenNthCalledWith(2, "/api/update-organization?id=admin/engineering%20org", expect.objectContaining({method: "POST"}));
  expect(global.fetch).toHaveBeenNthCalledWith(3, "/api/delete-organization", expect.objectContaining({method: "POST"}));
  fetchMock.mock.calls.forEach(([, options]) => {
    expect(options).toEqual(expect.objectContaining({
      credentials: "include",
      headers: {"Accept-Language": "zh"},
      body: JSON.stringify({...organization, copied: true}),
    }));
  });
});
