import {afterEach, beforeEach, describe, expect, test, vi} from "vitest";
import React from "react";
import {act, cleanup, render} from "@testing-library/react";
import SiteListPage from "./SiteListPage";
import * as SiteBackend from "./backend/SiteBackend";
import * as FormBackend from "./backend/FormBackend";
import * as Setting from "./Setting";
import * as fs from "fs";
import * as path from "path";
import {fireEvent} from "@testing-library/react";
import {fileURLToPath} from "url";
const testFileDirectory = path.dirname(fileURLToPath(import.meta.url));

type LooseMock = {
  (...args: unknown[]): unknown;
  mockResolvedValue: (value: unknown) => LooseMock;
  mockResolvedValueOnce: (value: unknown) => LooseMock;
  mockRejectedValueOnce: (value: unknown) => LooseMock;
  mockReturnValue: (value: unknown) => LooseMock;
};

type SiteBackendMock = Pick<Record<keyof typeof SiteBackend, LooseMock>, "getGlobalSites" | "getSites" | "addSite" | "deleteSite">;
type FormBackendMock = Pick<Record<keyof typeof FormBackend, LooseMock>, "getForm">;

interface TestSiteRecord {
  owner: string;
  name: string;
  createdTime: string;
  displayName: string;
  domain: string;
  tag: string;
  otherDomains: string[];
  needRedirect: boolean;
  disableVerbose: boolean;
  rules: string[];
  enableAlert: boolean;
  alertInterval: number;
  alertTryTimes: number;
  alertProviders: string[];
  challenges: string[];
  host: string;
  port: number;
  hosts: string[];
  sslMode: string;
  nodes: Array<{name: string; version: string; message: string; provider: string}>;
  sslCert: string;
  publicIp: string;
  node: string;
  isSelf: boolean;
  casdoorApplication: string;
  organizations: string[];
  status: string;
  [key: string]: unknown;
}

interface TestTableColumn {
  key?: string;
  dataIndex?: string;
  sorter?: ((a: TestSiteRecord, b: TestSiteRecord) => number) | boolean;
  render?: (text: unknown, record: TestSiteRecord, index: number) => React.ReactNode;
}

interface TestTableElementProps {
  columns: TestTableColumn[];
  title: () => React.ReactNode;
}

vi.mock("./backend/SiteBackend", () => {
  return {
    getGlobalSites: vi.fn(),
    getSites: vi.fn(),
    getSite: vi.fn(),
    updateSite: vi.fn(),
    addSite: vi.fn(),
    deleteSite: vi.fn(),
  };
});

vi.mock("./backend/FormBackend", () => {
  return {
    getForm: vi.fn(),
  };
});

vi.mock("./TourConfig", () => ({
  getTourVisible: () => false,
  getSteps: () => [],
  getNextUrl: () => "",
  setIsTourVisible: () => undefined,
}));

const siteBackendMock = SiteBackend as unknown as SiteBackendMock;
const formBackendMock = FormBackend as unknown as FormBackendMock;

let consoleErrorSpy: {mockRestore: () => void};

const adminAccount = {owner: "admin", tag: "", isAdmin: true};
const site: TestSiteRecord = {
  owner: "engineering",
  name: "site-one",
  createdTime: "2026-06-20T10:00:00Z",
  displayName: "Site One",
  domain: "site.example.invalid",
  tag: "edge-a",
  otherDomains: ["www.example.invalid"],
  needRedirect: false,
  disableVerbose: false,
  rules: ["engineering/rule-one"],
  enableAlert: false,
  alertInterval: 60,
  alertTryTimes: 3,
  alertProviders: [],
  challenges: [],
  host: "backend.example.invalid",
  port: 8443,
  hosts: ["backend-a:8443"],
  sslMode: "HTTPS Only",
  nodes: [{name: "node-a", version: "", message: "", provider: ""}],
  sslCert: "cert-one",
  publicIp: "203.0.113.10",
  node: "",
  isSelf: false,
  casdoorApplication: "",
  organizations: [],
  status: "Active",
};

function createHistory() {
  return {
    push: vi.fn(),
  };
}

function installSynchronousSetState(page: SiteListPage) {
  page.setState = ((stateUpdate: unknown, callback?: () => void) => {
    const patch = typeof stateUpdate === "function" ? stateUpdate(page.state, page.props) : stateUpdate;
    page.state = {
      ...page.state,
      ...(patch as Record<string, unknown>),
    };
    callback?.();
  }) as typeof page.setState;
}

function createPage() {
  const page = new SiteListPage({
    account: adminAccount,
    history: createHistory(),
    match: {path: "/sites", params: {}},
  });
  installSynchronousSetState(page);
  return page;
}

function getRenderedTable(page = createPage()) {
  const tableWrapper = page.renderTable([site]) as React.ReactElement<{children: React.ReactElement<TestTableElementProps>}>;
  return tableWrapper.props.children;
}

function getColumn(table: React.ReactElement<TestTableElementProps>, key: string) {
  const column = table.props.columns.find(item => item.key === key);
  if (!column) {
    throw new Error(`Missing column: ${key}`);
  }
  return column;
}

async function flushPromises() {
  await act(async() => {
    await Promise.resolve();
  });
}

describe("SiteListPage", () => {
  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation((message?: unknown, ...args: unknown[]) => {
      throw new Error([message, ...args].map(item => `${item}`).join(" "));
    });
    vi.spyOn(Setting, "showMessage").mockImplementation(() => {});
    vi.spyOn(Setting, "getRandomName").mockReturnValue("abc123");
    vi.spyOn(Setting, "getRequestOrganization").mockReturnValue("engineering");
    vi.spyOn(Setting, "isDefaultOrganizationSelected").mockReturnValue(false);
    vi.spyOn(Setting, "getVersionInfo").mockReturnValue(null);
    formBackendMock.getForm.mockResolvedValue({status: "ok", data: {formItems: []}});
    siteBackendMock.getGlobalSites.mockResolvedValue({status: "ok", data: [site], data2: 1});
    siteBackendMock.getSites.mockResolvedValue({status: "ok", data: [site], data2: 1});
    siteBackendMock.addSite.mockResolvedValue({status: "ok"});
    siteBackendMock.deleteSite.mockResolvedValue({status: "ok"});
  });

  afterEach(() => {
    cleanup();
    consoleErrorSpy.mockRestore();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  test("is migrated from JavaScript to TSX", () => {
    expect(fs.existsSync(path.join(testFileDirectory, "SiteListPage.tsx"))).toBe(true);
    expect(fs.existsSync(path.join(testFileDirectory, "SiteListPage.js"))).toBe(false);
  });

  test("creates a default site and refreshes the list after add", async() => {
    const page = createPage();
    page.fetch = vi.fn() as unknown as typeof page.fetch;

    expect(page.newSite()).toEqual(expect.objectContaining({
      owner: "engineering",
      name: "site_abc123",
      displayName: "New Site - abc123",
      domain: "aicodex-admin.local",
      port: 8000,
      sslMode: "HTTPS Only",
      rules: [],
    }));

    page.addSite();
    await flushPromises();

    expect(siteBackendMock.addSite).toHaveBeenCalledWith(expect.objectContaining({
      owner: "engineering",
      name: "site_abc123",
    }));
    expect(page.state.data[0]).toEqual(expect.objectContaining({name: "site_abc123"}));
    expect(page.fetch).toHaveBeenCalled();
    expect(Setting.showMessage).toHaveBeenCalledWith("success", "Site added successfully");
  });

  test("initializes legacy pagination before the first fetch", () => {
    const page = createPage();
    page.fetch = vi.fn() as unknown as typeof page.fetch;

    page.UNSAFE_componentWillMount();

    expect(page.state.pagination).toEqual(expect.objectContaining({
      current: 1,
      pageSize: 1000,
    }));
    expect(page.fetch).toHaveBeenCalledWith({
      pagination: expect.objectContaining({current: 1, pageSize: 1000}),
    });
  });

  test("fetches organization sites with pagination, search and sorting state", async() => {
    const page = createPage();

    page.fetch({
      pagination: {...page.state.pagination, current: 2, pageSize: 20},
      searchedColumn: "name",
      searchText: "site",
      sortField: "createdTime",
      sortOrder: "descend",
    });
    await flushPromises();

    expect(siteBackendMock.getSites).toHaveBeenCalledWith("engineering", "", "", "name", "site", "createdTime", "descend");
    expect(page.state.loading).toBe(false);
    expect(page.state.data).toEqual([site]);
    expect(page.state.pagination.total).toBe(1);
  });

  test("uses the global site API when the default organization is selected", async() => {
    vi.spyOn(Setting, "isDefaultOrganizationSelected").mockReturnValue(true);
    const page = createPage();

    page.fetch();
    await flushPromises();

    expect(siteBackendMock.getGlobalSites).toHaveBeenCalled();
    expect(siteBackendMock.getSites).not.toHaveBeenCalled();
  });

  test("deletes sites and rolls back pagination for the last row", async() => {
    const page = createPage();
    page.fetch = vi.fn() as unknown as typeof page.fetch;
    page.state = {
      ...page.state,
      data: [site],
      pagination: {...page.state.pagination, current: 3},
    };

    page.deleteSite(0);
    await flushPromises();

    expect(siteBackendMock.deleteSite).toHaveBeenCalledWith(site);
    expect(page.fetch).toHaveBeenCalledWith(expect.objectContaining({
      pagination: expect.objectContaining({current: 2}),
    }));
    expect(Setting.showMessage).toHaveBeenCalledWith("success", "Site deleted successfully");
  });

  test("keeps pagination when deleting does not empty a later page", async() => {
    const page = createPage();
    page.fetch = vi.fn() as unknown as typeof page.fetch;
    page.state = {
      ...page.state,
      data: [site, {...site, name: "site-two"}],
      pagination: {...page.state.pagination, current: 1},
    };

    page.deleteSite(0);
    await flushPromises();

    expect(page.fetch).toHaveBeenCalledWith(expect.objectContaining({
      pagination: expect.objectContaining({current: 1}),
    }));
  });

  test("reports add, delete and list failures", async() => {
    const page = createPage();
    page.state = {
      ...page.state,
      data: [site],
    };
    siteBackendMock.addSite.mockResolvedValueOnce({status: "error", msg: "add failed"});
    siteBackendMock.addSite.mockRejectedValueOnce(new Error("add network"));
    siteBackendMock.deleteSite.mockResolvedValueOnce({status: "error", msg: "delete failed"});
    siteBackendMock.deleteSite.mockRejectedValueOnce(new Error("delete network"));
    siteBackendMock.getSites.mockResolvedValueOnce({status: "error", msg: "list failed"});

    page.addSite();
    await flushPromises();
    expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("add failed"));

    page.addSite();
    await flushPromises();
    expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("add network"));

    page.deleteSite(0);
    await flushPromises();
    expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete failed"));

    page.deleteSite(0);
    await flushPromises();
    expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete network"));

    page.fetch({pagination: {...page.state.pagination, current: 1, pageSize: 10}});
    await flushPromises();
    expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("list failed"));
  });

  test("normalizes successful empty list responses", async() => {
    const page = createPage();
    siteBackendMock.getSites.mockResolvedValueOnce({status: "ok", data: undefined, data2: undefined});

    page.fetch();
    await flushPromises();

    expect(page.state.data).toEqual([]);
    expect(page.state.pagination.total).toBeUndefined();
  });

  test("keeps table toolbar and row actions wired", () => {
    const history = createHistory();
    const page = new SiteListPage({
      account: adminAccount,
      history,
      match: {path: "/sites", params: {}},
    });
    installSynchronousSetState(page);
    vi.spyOn(page, "addSite").mockImplementation(() => {});
    vi.spyOn(page, "deleteSite").mockImplementation(() => {});

    const table = getRenderedTable(page);
    const actionColumn = table.props.columns.find(column => column.key === "action");
    const actionNode = actionColumn?.render?.(undefined, site, 0) as React.ReactElement;
    const actionView = render(<>{actionNode}</>);

    fireEvent.click(actionView.getByText(/编\s*辑|Edit/));
    expect(history.push).toHaveBeenCalledWith("/sites/engineering/site-one");
    actionView.unmount();

    const actionChildren = React.Children.toArray((actionNode.props as {children: React.ReactNode}).children) as React.ReactElement[];
    actionChildren[1].props.onConfirm();
    expect(page.deleteSite).toHaveBeenCalledWith(0);

    const toolbarView = render(<>{table.props.title()}</>);
    fireEvent.click(toolbarView.getByText(/添\s*加|Add/));
    expect(page.addSite).toHaveBeenCalled();
  });

  test("renders table metadata columns without changing row semantics", () => {
    const table = getRenderedTable();
    const inactiveSite: TestSiteRecord = {
      ...site,
      tag: "",
      publicIp: "",
      needRedirect: true,
      rules: null as unknown as string[],
      host: "",
      port: 8080,
      hosts: [],
      status: "Inactive",
      sslCert: "cert-two",
      nodes: [
        {name: "node-warning", version: "", message: "", provider: "agent"},
      ],
    };

    table.props.columns.forEach(column => {
      if (typeof column.sorter === "function") {
        expect(typeof column.sorter(site, inactiveSite)).toBe("number");
      }
    });

    expect(getColumn(table, "tag").render?.("", inactiveSite, 0)).toBeNull();
    const tagLink = getColumn(table, "tag").render?.("edge-a", site, 0) as React.ReactElement<{to: string}>;
    expect(tagLink.props.to).toBe("/nodes/engineering/edge-a");

    const siteLink = getColumn(table, "name").render?.("site-one", site, 0) as React.ReactElement<{to: string}>;
    expect(siteLink.props.to).toBe("/sites/engineering/site-one");

    expect(getColumn(table, "domain").render?.("site.example.invalid", inactiveSite, 0)).toBe("site.example.invalid");
    const domainLink = getColumn(table, "domain").render?.("site.example.invalid", site, 0) as React.ReactElement<{href: string}>;
    expect(domainLink.props.href).toBe("https://site.example.invalid");

    const otherDomains = getColumn(table, "otherDomains").render?.(site.otherDomains, site, 0) as React.ReactElement[];
    expect(otherDomains).toHaveLength(1);
    expect(otherDomains[0].props.href).toBe("https://www.example.invalid");
    const redirectedDomains = getColumn(table, "otherDomains").render?.(inactiveSite.otherDomains, inactiveSite, 0) as React.ReactElement<{children: React.ReactElement<{color: string}>}>[];
    expect(redirectedDomains[0].props.children.props.color).toBe("default");

    expect(getColumn(table, "rules").render?.(null, inactiveSite, 0)).toBeNull();
    const rules = getColumn(table, "rules").render?.(site.rules, site, 0) as React.ReactElement[];
    expect(rules[0].props.href).toBe("/rules/engineering/rule-one");

    expect(getColumn(table, "host").render?.(site.host, site, 0)).toBe("backend.example.invalid:8443");
    const inactiveHost = getColumn(table, "host").render?.("", inactiveSite, 0) as React.ReactElement<{color: string}>;
    expect(inactiveHost.props.color).toBe("warning");

    expect(getColumn(table, "hosts").render?.("not-array", site, 0)).toBeNull();
    const hosts = getColumn(table, "hosts").render?.(site.hosts, site, 0) as React.ReactElement[];
    expect(hosts[0].props.children).toBe("backend-a:8443");

    const sslCertLink = getColumn(table, "sslCert").render?.("cert-one", site, 0) as React.ReactElement<{to: string}>;
    expect(sslCertLink.props.to).toBe("/certs/admin/cert-one");

    const tagSorter = getColumn(table, "tag").sorter as (a: TestSiteRecord, b: TestSiteRecord) => number;
    expect(typeof tagSorter({...site, tag: undefined as unknown as string}, {...inactiveSite, tag: undefined as unknown as string})).toBe("number");
  });

  test("renders node status tags for version, provider and error states", () => {
    const table = getRenderedTable();
    const nodesColumn = getColumn(table, "nodes");
    const getVersionInfo = Setting.getVersionInfo as unknown as {mockReturnValueOnce: (value: unknown) => unknown};

    getVersionInfo.mockReturnValueOnce({link: "https://versions.example.invalid/node-a", text: "v1"});
    const linkedNode = nodesColumn.render?.(undefined, {
      ...site,
      nodes: [{name: "node-a", version: "1.0.0", message: "", provider: "agent"}],
    }, 0) as React.ReactElement[];
    expect(linkedNode[0].props.href).toBe("https://versions.example.invalid/node-a");

    const warningNode = nodesColumn.render?.(undefined, {
      ...site,
      nodes: [{name: "node-warning", version: "", message: "", provider: "agent"}],
    }, 0) as React.ReactElement[];
    expect(warningNode[0].props.color).toBe("warning");

    const erroredNode = nodesColumn.render?.(undefined, {
      ...site,
      nodes: [{name: "node-error", version: "", message: "agent offline", provider: ""}],
    }, 0) as React.ReactElement[];
    expect(erroredNode[0].props.title).toBe("agent offline");
  });
});
