/* eslint-env jest */

import {expect as jestExpect} from "@jest/globals";
import {
  getOrganizationTreeOperationsDiagnostics,
  getOrganizationTreeOperationsMembers,
  refreshOrganizationTreeOperations
} from "./OrganizationTreeOperationsBackend";

declare const jest: {
  fn: () => unknown;
  mock: (moduleName: string, factory: () => unknown) => void;
};

type FetchMock = {
  (...args: unknown[]): Promise<{json: () => Promise<unknown>}>;
  mockResolvedValue: (value: {json: () => Promise<unknown>}) => FetchMock;
  mockClear: () => void;
  mock: {calls: unknown[][]};
};

const expect = jestExpect;

jest.mock("../Setting", () => ({
  ServerUrl: "https://admin.example",
  getAcceptLanguage: () => "zh-CN",
}));

const fetchMock = jest.fn() as unknown as FetchMock;

beforeEach(() => {
  fetchMock.mockClear();
  fetchMock.mockResolvedValue({
    json: () => Promise.resolve({status: "ok", data: {accepted: true}}),
  });
  global.fetch = fetchMock as unknown as typeof fetch;
});

test("builds diagnostics query with stable filters and accept language header", async() => {
  await getOrganizationTreeOperationsDiagnostics("org-alpha", {
    query: "dept-root",
    lifecycleStatus: "active",
    sourceConnectionStatus: "ACTIVE",
    freshness: "current",
    readModelSource: "",
  });

  const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];

  expect(url).toBe("https://admin.example/api/organization-tree-operations/diagnostics?organization=org-alpha&query=dept-root&lifecycleStatus=active&sourceConnectionStatus=ACTIVE&freshness=current");
  expect(options.method).toBe("GET");
  expect(options.credentials).toBe("include");
  expect(options.headers).toEqual({"Accept-Language": "zh-CN"});
});

test("builds members query with page parameters stringified", async() => {
  await getOrganizationTreeOperationsMembers("org-alpha", "dept-root", 3, 25);

  const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];

  expect(url).toBe("https://admin.example/api/organization-tree-operations/members?organization=org-alpha&departmentId=dept-root&page=3&pageSize=25");
  expect(options.method).toBe("GET");
  expect(options.credentials).toBe("include");
  expect(options.headers).toEqual({"Accept-Language": "zh-CN"});
});

test("posts refresh request without changing trigger payload contract", async() => {
  await refreshOrganizationTreeOperations("org-alpha", "refresh_read_model");

  const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];

  expect(url).toBe("https://admin.example/api/organization-tree-operations/refresh");
  expect(options.method).toBe("POST");
  expect(options.credentials).toBe("include");
  expect(options.body).toBe(JSON.stringify({organization: "org-alpha", triggerType: "refresh_read_model"}));
  expect(options.headers).toEqual({"Accept-Language": "zh-CN"});
});
