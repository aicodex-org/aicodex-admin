import {beforeEach, expect, test, vi} from "vitest";
import {getIdentityAssetRelationshipAggregation} from "./IdentityAssetRelationshipBackend";

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn(() => Promise.resolve({
    json: () => Promise.resolve({status: "ok"}),
  }));
  global.fetch = fetchMock as unknown as typeof fetch;
});

test("requests read-only identity asset relationship aggregation without write actions", async() => {
  await getIdentityAssetRelationshipAggregation({
    assetType: "application",
    owner: "admin",
    name: "portal app",
    organization: "built-in",
  });

  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(global.fetch).toHaveBeenCalledWith(
    expect.stringContaining("/api/get-identity-asset-relationship-aggregation?"),
    expect.objectContaining({
      method: "GET",
      credentials: "include",
    })
  );
  const [url, options] = fetchMock.mock.calls[0];
  expect(url).toContain("assetType=application");
  expect(url).toContain("owner=admin");
  expect(url).toContain("name=portal+app");
  expect(url).toContain("organization=built-in");
  expect(url).not.toContain("publish");
  expect(url).not.toContain("callback");
  expect(options).not.toHaveProperty("body");
});

test("omits optional organization when requesting provider aggregation", async() => {
  await getIdentityAssetRelationshipAggregation({
    assetType: "provider",
    owner: "admin",
    name: "enterprise-oidc",
  });

  const [url] = fetchMock.mock.calls[0];
  expect(url).toContain("assetType=provider");
  expect(url).toContain("name=enterprise-oidc");
  expect(url).not.toContain("organization=");
});
