/* eslint-env jest */
import React from "react";
import {expect as jestExpect, jest as jestValue} from "@jest/globals";
import {cleanup, render} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import * as Setting from "./Setting";
import * as EnforcerBackend from "./backend/EnforcerBackend";
import * as FormBackend from "./backend/FormBackend";
import EnforcerListPage from "./EnforcerListPage";

declare const jest: typeof jestValue;

type LooseMock = {
  (...args: unknown[]): unknown;
  mockImplementation: (implementation: (...args: unknown[]) => unknown) => LooseMock;
  mockReturnValue: (value: unknown) => LooseMock;
  mockResolvedValue: (value: unknown) => LooseMock;
  mockResolvedValueOnce: (value: unknown) => LooseMock;
  mockRejectedValueOnce: (value: unknown) => LooseMock;
};

type EnforcerBackendMock = Record<keyof typeof EnforcerBackend, LooseMock>;
type FormBackendMock = Record<"getForm", LooseMock>;

type Account = {
  owner: string;
  tag: string;
  isAdmin: boolean;
};

type TestEnforcerRecord = {
  owner: string;
  name: string;
  createdTime: string;
  displayName: string;
  model: string;
  adapter: string;
};

type TestTableColumn = {
  key?: string;
  fixed?: unknown;
  render?: (text: unknown, record: TestEnforcerRecord, index: number) => React.ReactNode;
};

type TestPagination = {
  current: number;
  pageSize: number;
  total?: number;
};

type TestEnforcerListPage = Omit<EnforcerListPage, "state" | "fetch"> & {
  state: {
    data: TestEnforcerRecord[];
    pagination: TestPagination;
    loading: boolean;
    isAuthorized: boolean;
    [key: string]: unknown;
  };
  fetch: (params: {pagination: TestPagination; [key: string]: unknown}) => void;
};

const enforcerBackendMock = EnforcerBackend as unknown as EnforcerBackendMock;
const formBackendMock = FormBackend as unknown as FormBackendMock;
const expect = jestExpect;
const {fireEvent} = require("@testing-library/react") as {
  fireEvent: {
    click: (element: Element | null) => boolean;
  };
};

jest.mock("./backend/EnforcerBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    getEnforcers: factoryJest.fn(),
    getEnforcer: factoryJest.fn(),
    updateEnforcer: factoryJest.fn(),
    addEnforcer: factoryJest.fn(),
    deleteEnforcer: factoryJest.fn(),
  };
});

jest.mock("./TourConfig", () => ({
  getTourVisible: () => false,
  getSteps: () => [],
  getNextUrl: () => "",
  setIsTourVisible: () => undefined,
}));

jest.mock("./backend/FormBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    getForm: factoryJest.fn(),
  };
});

const adminAccount: Account = {owner: "built-in", tag: "", isAdmin: true};
const enforcer: TestEnforcerRecord = {
  owner: "engineering",
  name: "main-enforcer",
  createdTime: "2026-06-20T10:00:00Z",
  displayName: "Main Enforcer",
  model: "engineering/rbac-model",
  adapter: "engineering/db-adapter",
};
const builtInEnforcer: TestEnforcerRecord = {
  ...enforcer,
  owner: "built-in",
  name: "api-enforcer-built-in",
};

function flushPromises() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

function createHistory() {
  return {
    push: jestValue.fn(),
  };
}

function installSynchronousSetState<T extends React.Component>(page: T) {
  page.setState = ((stateUpdate: unknown, callback?: () => void) => {
    const patch = typeof stateUpdate === "function"
      ? (stateUpdate as (state: T["state"], props: T["props"]) => unknown)(page.state, page.props)
      : stateUpdate;
    page.state = {
      ...(page.state as Record<string, unknown>),
      ...(patch as Record<string, unknown>),
    } as T["state"];
    callback?.();
  }) as typeof page.setState;
}

function createListPage(account: Account = adminAccount) {
  const page = new EnforcerListPage({
    account,
    history: createHistory(),
    match: {path: "/enforcers", params: {}},
  } as React.ComponentProps<typeof EnforcerListPage>);
  installSynchronousSetState(page);
  return page as TestEnforcerListPage;
}

beforeEach(() => {
  cleanup();
  localStorage.clear();
  localStorage.setItem("organization", "engineering");
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: () => ({
      matches: false,
      addListener: jestValue.fn(),
      removeListener: jestValue.fn(),
      addEventListener: jestValue.fn(),
      removeEventListener: jestValue.fn(),
    }),
  });
  jestValue.spyOn(Setting, "showMessage").mockImplementation(() => {});
  jestValue.spyOn(Setting, "getRandomName").mockReturnValue("abc123");
  jestValue.spyOn(Setting, "isMobile").mockReturnValue(false);
  jestValue.spyOn(Setting, "builtInObject").mockImplementation((record: unknown) => {
    return (record as {owner?: string}).owner === "built-in";
  });
  formBackendMock.getForm.mockResolvedValue({status: "ok", data: {formItems: []}});
  enforcerBackendMock.getEnforcers.mockResolvedValue({status: "ok", data: [enforcer], data2: 1});
  enforcerBackendMock.addEnforcer.mockResolvedValue({status: "ok"});
  enforcerBackendMock.deleteEnforcer.mockResolvedValue({status: "ok"});
});

afterEach(() => {
  jestValue.restoreAllMocks();
  jestValue.clearAllMocks();
  cleanup();
});

test("migrates Casbin enforcer list page module to TSX", () => {
  expect(() => require.resolve("./EnforcerListPage.tsx")).not.toThrow();
  expect(() => require.resolve("./EnforcerListPage.js")).toThrow();
});

test("renders enforcer table, links and action handlers", () => {
  const history = createHistory();
  const page = new EnforcerListPage({
    account: adminAccount,
    history,
    match: {path: "/enforcers", params: {}},
  } as React.ComponentProps<typeof EnforcerListPage>);
  installSynchronousSetState(page);
  jestValue.spyOn(page, "addEnforcer").mockImplementation(() => {});
  jestValue.spyOn(page, "deleteEnforcer").mockImplementation(() => {});

  const tableWrapper = page.renderTable([enforcer]) as React.ReactElement<{children: React.ReactElement<{columns: TestTableColumn[]; title: () => React.ReactNode}>}>;
  const table = tableWrapper.props.children;
  const columns = table.props.columns;

  expect(columns[0].key).toBe("name");
  expect(columns[0].fixed).toBeUndefined();
  expect(columns[6].fixed).toBeUndefined();

  const tableView = render(<MemoryRouter>{tableWrapper}</MemoryRouter>);
  expect(tableView.container.querySelector(".enterprise-list-page-table-shell.enforcer-list-page-table-shell")).not.toBeNull();
  expect(tableView.container.querySelector(".ant-table")).not.toBeNull();
  tableView.unmount();

  const nameView = render(<MemoryRouter>{columns[0].render?.(enforcer.name, enforcer, 0)}</MemoryRouter>);
  expect(nameView.getByText("main-enforcer").closest("a")?.getAttribute("href")).toBe("/enforcers/engineering/main-enforcer");
  nameView.unmount();

  const ownerView = render(<MemoryRouter>{columns[1].render?.(enforcer.owner, enforcer, 0)}</MemoryRouter>);
  expect(ownerView.getByText("engineering").closest("a")?.getAttribute("href")).toBe("/organizations/engineering");
  ownerView.unmount();

  const modelView = render(<MemoryRouter>{columns[4].render?.(enforcer.model, enforcer, 0)}</MemoryRouter>);
  expect(modelView.getByText("engineering/rbac-model").closest("a")?.getAttribute("href")).toBe("/models/engineering/rbac-model");
  modelView.unmount();

  const adapterView = render(<MemoryRouter>{columns[5].render?.(enforcer.adapter, enforcer, 0)}</MemoryRouter>);
  expect(adapterView.getByText("engineering/db-adapter").closest("a")?.getAttribute("href")).toBe("/adapters/engineering/db-adapter");
  adapterView.unmount();

  const actionNode = columns[6].render?.(undefined, enforcer, 0) as React.ReactElement<{children: React.ReactNode}>;
  const actionChildren = React.Children.toArray(actionNode.props.children) as React.ReactElement[];
  const actionView = render(<MemoryRouter>{actionNode}</MemoryRouter>);
  fireEvent.click(actionView.getByText(/编\s*辑|Edit/));
  expect(history.push).toHaveBeenCalledWith("/enforcers/engineering/main-enforcer");
  actionChildren[1].props.onConfirm();
  expect(page.deleteEnforcer).toHaveBeenCalledWith(0);
  actionView.unmount();

  const blockedActionNode = columns[6].render?.(undefined, builtInEnforcer, 0) as React.ReactElement<{children: React.ReactNode}>;
  const blockedActionChildren = React.Children.toArray(blockedActionNode.props.children) as React.ReactElement[];
  expect(blockedActionChildren[1].props.disabled).toBe(true);

  const toolbarView = render(<>{table.props.title()}</>);
  expect(toolbarView.container.querySelector(".enterprise-list-query-toolbar")).not.toBeNull();
  expect(toolbarView.getByText(/执\s*行\s*器|Enforcers/).closest(".enterprise-list-query-toolbar-title")).not.toBeNull();
  fireEvent.click(toolbarView.getByText(/添\s*加|Add/));
  expect(page.addEnforcer).toHaveBeenCalled();
});

test("keeps mobile action column without fixed behavior and creates enforcer through existing route", async() => {
  jestValue.spyOn(Setting, "isMobile").mockReturnValue(true);
  const history = createHistory();
  const page = new EnforcerListPage({
    account: adminAccount,
    history,
    match: {path: "/enforcers", params: {}},
  } as React.ComponentProps<typeof EnforcerListPage>);

  const mobileTable = page.renderTable([enforcer]) as React.ReactElement<{children: React.ReactElement<{columns: TestTableColumn[]}>}>;
  expect(mobileTable.props.children.props.columns[6].fixed).toBeUndefined();

  expect(page.newEnforcer()).toEqual(expect.objectContaining({
    owner: "engineering",
    name: "enforcer_abc123",
    displayName: "New Enforcer - abc123",
  }));

  page.addEnforcer();
  await flushPromises();

  expect(enforcerBackendMock.addEnforcer).toHaveBeenCalledWith(expect.objectContaining({
    owner: "engineering",
    name: "enforcer_abc123",
  }));
  expect(history.push).toHaveBeenCalledWith({pathname: "/enforcers/engineering/enforcer_abc123", mode: "add"});
  expect(Setting.showMessage).toHaveBeenCalledWith("success", expect.any(String));
});

test("fetches enforcers with organization filters and handles denied responses", async() => {
  const page = createListPage();
  jestValue.spyOn(Setting, "isDefaultOrganizationSelected").mockReturnValue(true);
  enforcerBackendMock.getEnforcers.mockResolvedValueOnce({status: "ok", data: [enforcer], data2: 1});

  page.fetch({
    pagination: {...page.state.pagination, current: 1, pageSize: 20},
    type: "main",
    sortField: "name",
    sortOrder: "ascend",
  });
  await flushPromises();

  expect(enforcerBackendMock.getEnforcers).toHaveBeenLastCalledWith("", 1, 20, "type", "main", "name", "ascend");
  expect(page.state.data).toEqual([enforcer]);
  expect(page.state.pagination.total).toBe(1);

  (Setting.isDefaultOrganizationSelected as unknown as LooseMock).mockReturnValue(false);
  enforcerBackendMock.getEnforcers.mockResolvedValueOnce({status: "ok", data: [enforcer], data2: 1});
  page.fetch({pagination: {...page.state.pagination, current: 2, pageSize: 10}});
  await flushPromises();
  expect(enforcerBackendMock.getEnforcers).toHaveBeenLastCalledWith("engineering", 2, 10, undefined, undefined, undefined, undefined);

  enforcerBackendMock.getEnforcers.mockResolvedValueOnce({status: "error", msg: "Unauthorized operation"});
  page.fetch({pagination: {...page.state.pagination, current: 1, pageSize: 20}});
  await flushPromises();
  expect(page.state.isAuthorized).toBe(false);
});

test("deletes enforcer, refreshes pagination and reports errors", async() => {
  const page = createListPage();
  const originalFetch = page.fetch;
  page.fetch = jestValue.fn() as unknown as typeof page.fetch;
  page.state = {
    ...page.state,
    data: [enforcer],
    pagination: {...page.state.pagination, current: 2},
  };

  page.deleteEnforcer(0);
  await flushPromises();

  expect(enforcerBackendMock.deleteEnforcer).toHaveBeenCalledWith(enforcer);
  expect(page.fetch).toHaveBeenCalledWith(expect.objectContaining({
    pagination: expect.objectContaining({current: 1}),
  }));
  expect(Setting.showMessage).toHaveBeenCalledWith("success", expect.any(String));

  page.fetch = originalFetch;
  enforcerBackendMock.addEnforcer.mockResolvedValueOnce({status: "error", msg: "add failed"});
  enforcerBackendMock.addEnforcer.mockRejectedValueOnce(new Error("add network"));
  enforcerBackendMock.deleteEnforcer.mockResolvedValueOnce({status: "error", msg: "delete failed"});
  enforcerBackendMock.deleteEnforcer.mockRejectedValueOnce(new Error("delete network"));
  enforcerBackendMock.getEnforcers.mockResolvedValueOnce({status: "error", msg: "list failed"});

  page.addEnforcer();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("add failed"));

  page.addEnforcer();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("add network"));

  page.deleteEnforcer(0);
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete failed"));

  page.deleteEnforcer(0);
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete network"));

  page.fetch({pagination: {...page.state.pagination, current: 1, pageSize: 20}});
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "list failed");
});
