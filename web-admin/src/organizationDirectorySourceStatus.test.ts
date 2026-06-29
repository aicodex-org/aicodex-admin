import {afterEach, describe, expect, it, jest} from "@jest/globals";
import {getDirectorySourceUiStatus, getOrganizationDirectorySourceStatus} from "./organizationDirectorySourceStatus";

const originalFetch = global.fetch;

function mockFetchJson(response: unknown) {
  const json = jest.fn(async() => response);
  const fetchMock = jest.fn(async(_input: RequestInfo | URL, _init?: RequestInit) => ({json} as unknown as Response));
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

afterEach(() => {
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

describe("organizationDirectorySourceStatus", () => {
  it("treats ambiguous source status as abnormal and blocked", () => {
    const status = getDirectorySourceUiStatus({
      sourceStatus: {
        organization: "engineering",
        state: "ambiguous",
        sources: [
          {source: "wecom", displayName: "WeCom", organization: "engineering", configured: true, enabled: true},
          {source: "lark", displayName: "Feishu/Lark", organization: "engineering", configured: true, enabled: false},
        ],
      },
    });

    expect(status.blocked).toBe(true);
    expect(status.abnormal).toBe(true);
    expect(status.provider).toBe("WeCom、Feishu/Lark");
    expect(status.organizations).toEqual(["engineering"]);
  });

  it("treats occupied source status as a normal occupied block", () => {
    const status = getDirectorySourceUiStatus({
      sourceStatus: {
        organization: "finance",
        state: "occupied",
        occupyingSource: {source: "lark", displayName: "Feishu/Lark", organization: "finance", configured: true, enabled: true},
      },
    });

    expect(status.blocked).toBe(true);
    expect(status.abnormal).toBe(false);
    expect(status.provider).toBe("Feishu/Lark");
    expect(status.organization).toBe("finance");
  });

  it("keeps legacy conflict fields as fallback", () => {
    const status = getDirectorySourceUiStatus({
      conflictingProvider: "WeCom",
      conflictingOrganization: "sales",
      conflictingConfigured: true,
      conflictingOrganizations: ["sales"],
    });

    expect(status.blocked).toBe(true);
    expect(status.abnormal).toBe(false);
    expect(status.provider).toBe("WeCom");
    expect(status.organizations).toEqual(["sales"]);
  });

  it("fetches source status with encoded organization and language headers", async() => {
    const fetchMock = mockFetchJson({
      status: "ok",
      data: {state: "available", currentSource: "lark"},
    });

    const response = await getOrganizationDirectorySourceStatus("lark", "org a+b");

    expect(response).toEqual({
      status: "ok",
      data: {state: "available", currentSource: "lark"},
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    const requestUrl = new URL(`${url}`, "http://example.test");
    expect(requestUrl.pathname).toBe("/api/organization-directory-source-status");
    expect(requestUrl.searchParams.get("source")).toBe("lark");
    expect(requestUrl.searchParams.get("organization")).toBe("org a+b");
    expect(options).toMatchObject({
      method: "GET",
      credentials: "include",
    });
    const headers = options?.headers as Record<string, string> | undefined;
    expect(headers?.["Accept-Language"]).toContain(";q=0.9");
  });

  it("omits organization query parameter when checking candidate status", async() => {
    const fetchMock = mockFetchJson({
      status: "ok",
      data: {state: "available"},
    });

    await getOrganizationDirectorySourceStatus("wecom");

    const [url] = fetchMock.mock.calls[0];
    const requestUrl = new URL(`${url}`, "http://example.test");
    expect(requestUrl.searchParams.get("source")).toBe("wecom");
    expect(requestUrl.searchParams.has("organization")).toBe(false);
  });

  it("deduplicates organizations from nested source statuses", () => {
    const status = getDirectorySourceUiStatus({
      sourceStatus: {
        state: "available",
        sources: [
          {source: "wecom", displayName: "WeCom", organization: " ", configured: true, enabled: true},
        ],
        statuses: [
          {
            organization: " engineering ",
            sources: [
              {source: "wecom", displayName: "WeCom", organization: "engineering", configured: true, enabled: true},
              {source: "lark", displayName: "Feishu/Lark", organization: "sales", configured: true, enabled: true},
            ],
          },
          {organization: "sales"},
        ],
      },
    });

    expect(status.blocked).toBe(false);
    expect(status.provider).toBe("另一通讯录来源");
    expect(status.organizations).toEqual(["engineering", "sales"]);
  });

  it("falls back to legacy labels for abnormal and occupied states", () => {
    const abnormal = getDirectorySourceUiStatus({
      conflictingProvider: "历史通讯录来源",
      conflictingOrganization: "legacy-org",
      sourceStatus: {
        state: "ambiguous",
        sources: [
          {source: "wecom", displayName: "", organization: "legacy-org", configured: true, enabled: true},
          {source: "lark", organization: "legacy-org", configured: true, enabled: true},
        ],
      },
    });
    const occupied = getDirectorySourceUiStatus({
      conflictingProvider: "历史通讯录来源",
      conflictingOrganization: "legacy-org",
      sourceStatus: {
        organization: "legacy-org",
        state: "occupied",
        occupyingSource: {source: "dingtalk", organization: "", configured: true, enabled: true},
      },
    });

    expect(abnormal.provider).toBe("历史通讯录来源");
    expect(abnormal.organization).toBe("legacy-org");
    expect(occupied.provider).toBe("历史通讯录来源");
    expect(occupied.organization).toBe("legacy-org");
  });
});
