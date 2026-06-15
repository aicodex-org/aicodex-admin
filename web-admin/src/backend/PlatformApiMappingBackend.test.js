/* eslint-env jest */

import {
  getPlatformApiOrganizationMappings,
  getPlatformApiUserMappingReadiness,
  getPlatformApiUserMappings,
  publishGatewayProjectionManually,
  updatePlatformApiOrganizationMapping,
  updatePlatformApiUserMapping
} from "./PlatformApiMappingBackend";

jest.mock("../Setting", () => ({
  ServerUrl: "https://admin.example.invalid",
  getAcceptLanguage: () => "en",
}));

beforeEach(() => {
  global.fetch = jest.fn(() => Promise.resolve({
    json: () => Promise.resolve({status: "ok"}),
  }));
});

afterEach(() => {
  jest.resetAllMocks();
});

test("loads platform api mappings with explicit organization query", async() => {
  await getPlatformApiOrganizationMappings("org-a");
  await getPlatformApiUserMappings("org-a", {current: 2, pageSize: 20, keyword: "alice"});
  await getPlatformApiUserMappingReadiness("org-a", {
    keyword: "alice",
    readinessCategory: "mapping_missing",
    mappingStatus: "CONFIRMED",
    limit: 20,
  });
  await publishGatewayProjectionManually("org-a", {traceId: "trace-synthetic", reason: "operator-check"});

  expect(global.fetch).toHaveBeenNthCalledWith(
    1,
    "https://admin.example.invalid/api/get-platform-api-organization-mappings?organization=org-a",
    expect.objectContaining({
      method: "GET",
      credentials: "include",
      headers: expect.objectContaining({"Accept-Language": "en"}),
    })
  );
  expect(global.fetch).toHaveBeenNthCalledWith(
    2,
    "https://admin.example.invalid/api/get-platform-api-user-mappings?organization=org-a&p=2&pageSize=20&keyword=alice",
    expect.objectContaining({
      method: "GET",
      credentials: "include",
      headers: expect.objectContaining({"Accept-Language": "en"}),
    })
  );
  expect(global.fetch).toHaveBeenNthCalledWith(
    3,
    "https://admin.example.invalid/api/get-platform-api-user-mapping-readiness?organization=org-a&keyword=alice&readinessCategory=mapping_missing&mappingStatus=CONFIRMED&limit=20",
    expect.objectContaining({
      method: "GET",
      credentials: "include",
      headers: expect.objectContaining({"Accept-Language": "en"}),
    })
  );
  expect(global.fetch).toHaveBeenNthCalledWith(
    4,
    "https://admin.example.invalid/api/gateway-projection/manual-publish",
    expect.objectContaining({
      method: "POST",
      credentials: "include",
      body: JSON.stringify({
        organizationId: "org-a",
        traceId: "trace-synthetic",
        reason: "operator-check",
      }),
      headers: expect.objectContaining({
        "Accept-Language": "en",
        "Content-Type": "application/json",
      }),
    })
  );
});

test("updates platform api mappings with json body and no sensitive fields", async() => {
  const organizationMapping = {
    organizationId: "org-a",
    apiOrganizationId: "api-org-synthetic",
    mappingStatus: "CONFIRMED",
  };
  const userMapping = {
    organizationId: "org-a",
    adminSubject: "org-a/alice",
    apiUserId: "api-user-synthetic",
    mappingStatus: "CONFIRMED",
  };

  await updatePlatformApiOrganizationMapping(organizationMapping);
  await updatePlatformApiUserMapping(userMapping);

  expect(global.fetch).toHaveBeenNthCalledWith(
    1,
    "https://admin.example.invalid/api/update-platform-api-organization-mapping",
    expect.objectContaining({
      method: "POST",
      credentials: "include",
      body: JSON.stringify(organizationMapping),
      headers: expect.objectContaining({
        "Accept-Language": "en",
        "Content-Type": "application/json",
      }),
    })
  );
  expect(global.fetch).toHaveBeenNthCalledWith(
    2,
    "https://admin.example.invalid/api/update-platform-api-user-mapping",
    expect.objectContaining({
      method: "POST",
      credentials: "include",
      body: JSON.stringify(userMapping),
      headers: expect.objectContaining({
        "Accept-Language": "en",
        "Content-Type": "application/json",
      }),
    })
  );
});
