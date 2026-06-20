/* eslint-env jest */
import React from "react";
import {expect as jestExpect, jest as jestValue} from "@jest/globals";
import {cleanup, render} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import {Button, Input, InputNumber, Select, Switch} from "antd";
import * as Setting from "./Setting";
import * as AdapterBackend from "./backend/AdapterBackend";
import * as OrganizationBackend from "./backend/OrganizationBackend";
import * as FormBackend from "./backend/FormBackend";
import AdapterListPage from "./AdapterListPage";
import AdapterEditPage from "./AdapterEditPage";

declare const jest: typeof jestValue;

type LooseMock = {
  (...args: unknown[]): unknown;
  mockImplementation: (implementation: (...args: unknown[]) => unknown) => LooseMock;
  mockImplementationOnce: (implementation: (...args: unknown[]) => unknown) => LooseMock;
  mockReturnValue: (value: unknown) => LooseMock;
  mockResolvedValue: (value: unknown) => LooseMock;
  mockResolvedValueOnce: (value: unknown) => LooseMock;
  mockRejectedValueOnce: (value: unknown) => LooseMock;
};

type AdapterBackendMock = Record<keyof typeof AdapterBackend, LooseMock>;
type OrganizationBackendMock = Record<"getOrganizations", LooseMock>;
type FormBackendMock = Record<"getForm", LooseMock>;

type Account = {
  owner: string;
  tag: string;
  isAdmin: boolean;
};

type AdapterRecord = {
  owner: string;
  name: string;
  createdTime: string;
  table: string;
  useSameDb: boolean;
  type: string;
  databaseType: string;
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  [key: string]: unknown;
};

type OrganizationRecord = {
  name: string;
};

type Pagination = {
  current: number;
  pageSize: number;
  total?: number;
};

type AdapterListHarness = Omit<AdapterListPage, "state" | "fetch"> & {
  state: {
    data: AdapterRecord[];
    pagination: Pagination;
    loading: boolean;
    isAuthorized: boolean;
    [key: string]: unknown;
  };
  fetch: (params: {pagination: Pagination; [key: string]: unknown}) => void;
};

type AdapterEditHarness = InstanceType<typeof AdapterEditPage> & {
  state: InstanceType<typeof AdapterEditPage>["state"] & {
    organizationName: string;
    adapterName: string;
    adapter: AdapterRecord | null;
    organizations: OrganizationRecord[];
    mode: string;
  };
};

type TableColumn = {
  key?: string;
  fixed?: unknown;
  sorter?: boolean | ((a: AdapterRecord, b: AdapterRecord) => number);
  render?: (text: unknown, record: AdapterRecord, index: number) => React.ReactNode;
};

const expect = jestExpect;
const adapterBackendMock = AdapterBackend as unknown as AdapterBackendMock;
const organizationBackendMock = OrganizationBackend as unknown as OrganizationBackendMock;
const formBackendMock = FormBackend as unknown as FormBackendMock;

const {fireEvent} = require("@testing-library/react") as {
  fireEvent: {
    click: (element: Element | null) => boolean;
    change: (element: Element | null, event: unknown) => boolean;
  };
};

jest.mock("./backend/AdapterBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    getAdapters: factoryJest.fn(),
    getAdapter: factoryJest.fn(),
    updateAdapter: factoryJest.fn(),
    addAdapter: factoryJest.fn(),
    deleteAdapter: factoryJest.fn(),
    getPolicies: factoryJest.fn(),
    UpdatePolicy: factoryJest.fn(),
    AddPolicy: factoryJest.fn(),
    RemovePolicy: factoryJest.fn(),
  };
});

jest.mock("./backend/OrganizationBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    getOrganizations: factoryJest.fn(),
  };
});

jest.mock("./backend/FormBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    getForm: factoryJest.fn(),
  };
});

jest.mock("./TourConfig", () => ({
  getTourVisible: () => false,
  getSteps: () => [],
  getNextUrl: () => "",
  setIsTourVisible: () => undefined,
}));

jest.mock("./common/modal/PopconfirmModal", () => (props: {disabled?: boolean; onConfirm?: () => void}) => (
  <button type="button" data-testid="popconfirm" data-disabled={props.disabled ? "true" : "false"} onClick={() => props.onConfirm?.()}>
    delete
  </button>
));

const adminAccount: Account = {owner: "built-in", tag: "", isAdmin: true};
const adapter: AdapterRecord = {
  owner: "engineering",
  name: "adapter-main",
  createdTime: "2026-06-20T10:00:00Z",
  table: "casbin_rule",
  useSameDb: true,
  type: "",
  databaseType: "",
  host: "",
  port: 0,
  user: "",
  password: "",
  database: "",
};
const externalAdapter: AdapterRecord = {
  ...adapter,
  useSameDb: false,
  type: "Database",
  databaseType: "mysql",
  host: "localhost",
  port: 3306,
  user: "root",
  password: "123456",
  database: "casdoor",
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

function createListPage(account: Account = adminAccount, history = createHistory()) {
  const page = new AdapterListPage({
    account,
    history,
    match: {path: "/adapters", params: {}},
  } as React.ComponentProps<typeof AdapterListPage>);
  installSynchronousSetState(page);
  return page as AdapterListHarness;
}

function createEditPage(overrides: Partial<React.ComponentProps<typeof AdapterEditPage>> = {}) {
  const props = {
    account: adminAccount,
    history: createHistory(),
    location: {},
    match: {params: {organizationName: "engineering", adapterName: "adapter-main"}},
    ...overrides,
  } as React.ComponentProps<typeof AdapterEditPage>;
  const page = new AdapterEditPage(props) as AdapterEditHarness;
  installSynchronousSetState(page);
  return page;
}

function collectElementsByType(node: React.ReactNode, type: React.ElementType, matches: React.ReactElement[] = []) {
  if (!React.isValidElement(node)) {
    return matches;
  }
  if (node.type === type) {
    matches.push(node);
  }
  const props = node.props as {children?: React.ReactNode; title?: React.ReactNode};
  collectElementsByType(props.title, type, matches);
  React.Children.forEach(props.children, child => collectElementsByType(child, type, matches));
  return matches;
}

function elementProps<T>(element: React.ReactElement): T {
  return element.props as T;
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
  jestValue.spyOn(Setting, "isAdminUser").mockImplementation((account: unknown) => Boolean((account as Account).isAdmin));
  formBackendMock.getForm.mockResolvedValue({status: "ok", data: {formItems: []}});
  adapterBackendMock.getAdapters.mockResolvedValue({status: "ok", data: [adapter], data2: 1});
  adapterBackendMock.getAdapter.mockResolvedValue({status: "ok", data: adapter});
  adapterBackendMock.addAdapter.mockResolvedValue({status: "ok"});
  adapterBackendMock.updateAdapter.mockResolvedValue({status: "ok"});
  adapterBackendMock.deleteAdapter.mockResolvedValue({status: "ok"});
  adapterBackendMock.getPolicies.mockResolvedValue({status: "ok"});
  organizationBackendMock.getOrganizations.mockResolvedValue({status: "ok", data: [{name: "engineering"}]});
});

afterEach(() => {
  jestValue.restoreAllMocks();
  jestValue.clearAllMocks();
  cleanup();
});

test("migrates Casbin adapter page modules to TSX files", () => {
  expect(() => require.resolve("./AdapterListPage.tsx")).not.toThrow();
  expect(() => require.resolve("./AdapterEditPage.tsx")).not.toThrow();
  expect(() => require.resolve("./AdapterListPage.js")).toThrow();
  expect(() => require.resolve("./AdapterEditPage.js")).toThrow();
});

test("keeps adapter list add, fetch and delete behavior", async() => {
  const history = createHistory();
  const page = new AdapterListPage({
    account: adminAccount,
    history,
    match: {path: "/adapters", params: {}},
  } as React.ComponentProps<typeof AdapterListPage>) as AdapterListHarness;
  installSynchronousSetState(page);

  expect(page.newAdapter()).toEqual(expect.objectContaining({
    owner: "engineering",
    name: "adapter_abc123",
    table: "table_name",
    useSameDb: true,
  }));

  page.addAdapter();
  await flushPromises();
  expect(adapterBackendMock.addAdapter).toHaveBeenCalledWith(expect.objectContaining({name: "adapter_abc123"}));
  expect(history.push).toHaveBeenCalledWith({pathname: "/adapters/engineering/adapter_abc123", mode: "add"});

  page.fetch({
    pagination: {...page.state.pagination, current: 1, pageSize: 20},
    type: "Database",
    sortField: "name",
    sortOrder: "ascend",
  });
  await flushPromises();
  expect(adapterBackendMock.getAdapters).toHaveBeenLastCalledWith("engineering", 1, 20, "type", "Database", "name", "ascend");
  expect(page.state.data).toEqual([adapter]);

  page.state = {
    ...page.state,
    data: [adapter],
    pagination: {...page.state.pagination, current: 2},
  };
  const fetchSpy = jestValue.fn();
  page.fetch = fetchSpy as unknown as typeof page.fetch;
  page.deleteAdapter(0);
  await flushPromises();
  expect(adapterBackendMock.deleteAdapter).toHaveBeenCalledWith(adapter);
  expect(fetchSpy).toHaveBeenCalledWith(expect.objectContaining({
    pagination: expect.objectContaining({current: 1}),
  }));
});

test("renders adapter list table actions and reports list errors", async() => {
  const history = createHistory();
  const page = createListPage(adminAccount, history);
  jestValue.spyOn(page, "addAdapter").mockImplementation(() => {});
  jestValue.spyOn(page, "deleteAdapter").mockImplementation(() => {});

  const tableWrapper = page.renderTable([adapter]) as React.ReactElement<{children: React.ReactElement<{columns: TableColumn[]; title: () => React.ReactNode}>}>;
  const table = tableWrapper.props.children;
  const columns = table.props.columns;

  expect(columns[0].key).toBe("name");
  expect(columns[12].fixed).toBe("right");
  expect(columns[8].render?.(0, adapter, 0)).toBe("");
  expect(columns[8].render?.(3306, adapter, 0)).toBe(3306);

  const nameView = render(<MemoryRouter>{columns[0].render?.(adapter.name, adapter, 0)}</MemoryRouter>);
  expect(nameView.getByText("adapter-main").closest("a")?.getAttribute("href")).toBe("/adapters/engineering/adapter-main");
  nameView.unmount();

  const actionNode = columns[12].render?.(undefined, adapter, 0) as React.ReactElement<{children: React.ReactNode}>;
  const actionView = render(<MemoryRouter>{actionNode}</MemoryRouter>);
  fireEvent.click(actionView.getByText(/编\s*辑|Edit/));
  expect(history.push).toHaveBeenCalledWith("/adapters/engineering/adapter-main");
  fireEvent.click(actionView.getByTestId("popconfirm"));
  expect(page.deleteAdapter).toHaveBeenCalledWith(0);
  actionView.unmount();

  const toolbarView = render(<>{table.props.title()}</>);
  fireEvent.click(toolbarView.getByText(/添\s*加|Add/));
  expect(page.addAdapter).toHaveBeenCalled();

  adapterBackendMock.getAdapters.mockResolvedValueOnce({status: "error", msg: "list failed"});
  page.fetch({pagination: {...page.state.pagination, current: 1, pageSize: 20}});
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "list failed");

  adapterBackendMock.getAdapters.mockResolvedValueOnce({status: "error", msg: "Unauthorized operation"});
  page.fetch({pagination: {...page.state.pagination, current: 1, pageSize: 20}});
  await flushPromises();
  expect(page.state.isAuthorized).toBe(false);
});

test("keeps adapter list column renderers and mutation error behavior", async() => {
  const page = createListPage();
  const tableWrapper = page.renderTable([adapter]) as React.ReactElement<{children: React.ReactElement<{columns: TableColumn[]}>}>;
  const table = tableWrapper.props.children;
  const columns = table.props.columns;

  const ownerView = render(<MemoryRouter>{columns[1].render?.(adapter.owner, adapter, 0)}</MemoryRouter>);
  expect(ownerView.getByText("engineering").closest("a")?.getAttribute("href")).toBe("/organizations/engineering");
  ownerView.unmount();

  const formattedDateSpy = jestValue.spyOn(Setting, "getFormattedDate").mockReturnValue("formatted-created-time");
  expect(columns[2].render?.(adapter.createdTime, adapter, 0)).toBe("formatted-created-time");
  expect(formattedDateSpy).toHaveBeenCalledWith(adapter.createdTime);

  const sameDbSwitch = columns[4].render?.(false, adapter, 0) as React.ReactElement;
  expect(elementProps<{checked: boolean; disabled: boolean}>(sameDbSwitch)).toEqual(expect.objectContaining({checked: false, disabled: true}));

  const databaseSorter = columns[6].sorter as (a: AdapterRecord, b: AdapterRecord) => number;
  expect(databaseSorter({...adapter, databaseType: "mysql"}, {...adapter, databaseType: "postgres"})).toBeLessThan(0);

  const tableView = render(<MemoryRouter>{page.renderTable([adapter])}</MemoryRouter>);
  expect(tableView.container.querySelector(".ant-table")).not.toBeNull();
  tableView.unmount();

  adapterBackendMock.addAdapter.mockResolvedValueOnce({status: "error", msg: "add failed"});
  page.addAdapter();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("add failed"));

  adapterBackendMock.addAdapter.mockRejectedValueOnce(new Error("add network"));
  page.addAdapter();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("add network"));

  page.state = {...page.state, data: [adapter]};
  adapterBackendMock.deleteAdapter.mockResolvedValueOnce({status: "error", msg: "delete failed"});
  page.deleteAdapter(0);
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete failed"));

  adapterBackendMock.deleteAdapter.mockRejectedValueOnce(new Error("delete network"));
  page.deleteAdapter(0);
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete network"));
});

test("keeps adapter list mobile and default-organization branch behavior", async() => {
  const page = createListPage();

  jestValue.spyOn(Setting, "isMobile").mockReturnValue(true);
  const mobileTable = page.renderTable([adapter]) as React.ReactElement<{children: React.ReactElement<{columns: TableColumn[]}>}>;
  expect(mobileTable.props.children.props.columns[12].fixed).toBe("false");

  const databaseSorter = mobileTable.props.children.props.columns[6].sorter as (a: AdapterRecord, b: AdapterRecord) => number;
  expect(databaseSorter(
    {...adapter, databaseType: undefined as unknown as string},
    {...adapter, databaseType: undefined as unknown as string}
  )).toBe(0);

  page.state = {
    ...page.state,
    data: [adapter, externalAdapter],
    pagination: {...page.state.pagination, current: 1},
  };
  const fetchSpy = jestValue.fn();
  page.fetch = fetchSpy as unknown as typeof page.fetch;
  page.deleteAdapter(0);
  await flushPromises();
  expect(fetchSpy).toHaveBeenCalledWith(expect.objectContaining({
    pagination: expect.objectContaining({current: 1}),
  }));

  const defaultOrganizationPage = createListPage();
  jestValue.spyOn(Setting, "isDefaultOrganizationSelected").mockReturnValue(true);
  defaultOrganizationPage.fetch({pagination: {...defaultOrganizationPage.state.pagination, current: 1, pageSize: 10}});
  await flushPromises();
  expect(adapterBackendMock.getAdapters).toHaveBeenLastCalledWith("", 1, 10, undefined, undefined, undefined, undefined);
});

test("loads adapter edit data and preserves save navigation", async() => {
  const page = createEditPage();
  const history = page.props.history as ReturnType<typeof createHistory>;

  page.UNSAFE_componentWillMount();
  await flushPromises();
  expect(adapterBackendMock.getAdapter).toHaveBeenCalledWith("engineering", "adapter-main");
  expect(organizationBackendMock.getOrganizations).toHaveBeenCalledWith("admin");
  expect(page.state.adapter).toEqual(adapter);
  expect(page.state.organizations).toEqual([{name: "engineering"}]);

  page.updateAdapterField("name", "adapter-renamed");
  page.submitAdapterEdit(false);
  await flushPromises();
  expect(adapterBackendMock.updateAdapter).toHaveBeenCalledWith("engineering", "adapter-main", expect.objectContaining({name: "adapter-renamed"}));
  expect(history.push).toHaveBeenCalledWith("/adapters/engineering/adapter-renamed");

  page.submitAdapterEdit(true);
  await flushPromises();
  expect(history.push).toHaveBeenCalledWith("/adapters");
});

test("keeps adapter edit null guards, button actions and network errors", async() => {
  const history = createHistory();
  const page = createEditPage({history, location: {mode: "add"}} as Partial<React.ComponentProps<typeof AdapterEditPage>>);
  page.state = {
    ...page.state,
    mode: "add",
    adapter: {...adapter},
    organizations: [{name: "engineering"}],
  };

  const submitSpy = jestValue.spyOn(page, "submitAdapterEdit").mockImplementation(() => {});
  const deleteSpy = jestValue.spyOn(page, "deleteAdapter").mockImplementation(() => {});
  const editButtons = collectElementsByType(page.renderAdapter(), Button);
  elementProps<{onClick: () => void}>(editButtons[0]).onClick();
  elementProps<{onClick: () => void}>(editButtons[1]).onClick();
  elementProps<{onClick: () => void}>(editButtons[2]).onClick();
  expect(submitSpy).toHaveBeenCalledWith(false);
  expect(submitSpy).toHaveBeenCalledWith(true);
  expect(deleteSpy).toHaveBeenCalled();

  const pageButtons = collectElementsByType(page.render(), Button);
  elementProps<{onClick: () => void}>(pageButtons[pageButtons.length - 3]).onClick();
  elementProps<{onClick: () => void}>(pageButtons[pageButtons.length - 2]).onClick();
  elementProps<{onClick: () => void}>(pageButtons[pageButtons.length - 1]).onClick();
  expect(submitSpy).toHaveBeenCalledTimes(4);
  expect(deleteSpy).toHaveBeenCalledTimes(2);
  submitSpy.mockRestore();
  deleteSpy.mockRestore();

  page.state = {...page.state, adapter: null};
  expect(page.renderAdapter()).toBeNull();
  page.updateAdapterField("name", "ignored");
  page.submitAdapterEdit(false);
  page.deleteAdapter();
  expect(adapterBackendMock.updateAdapter).not.toHaveBeenCalled();
  expect(adapterBackendMock.deleteAdapter).not.toHaveBeenCalled();

  page.state = {...page.state, adapter: {...adapter}};
  adapterBackendMock.updateAdapter.mockImplementationOnce(() => Promise.resolve({status: "ok"}).then(res => {
    page.state = {...page.state, adapter: null};
    return res;
  }));
  page.submitAdapterEdit(false);
  await flushPromises();
  expect(history.push).not.toHaveBeenCalled();

  page.state = {...page.state, adapter: {...adapter}};
  adapterBackendMock.updateAdapter.mockRejectedValueOnce(new Error("save network"));
  page.submitAdapterEdit(false);
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("save network"));

  adapterBackendMock.deleteAdapter.mockRejectedValueOnce(new Error("delete network"));
  page.deleteAdapter();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete network"));
});

test("keeps adapter edit mobile, constructor and empty-response branch behavior", async() => {
  const page = createEditPage({organizationName: "override-org"} as Partial<React.ComponentProps<typeof AdapterEditPage>>);
  expect(page.state.organizationName).toBe("override-org");

  adapterBackendMock.getAdapter.mockResolvedValueOnce({status: "error", msg: "load failed"});
  page.getAdapter();
  await flushPromises();
  expect(page.state.adapter).toBeNull();

  adapterBackendMock.getAdapter.mockResolvedValueOnce({status: "ok"});
  page.getAdapter();
  await flushPromises();
  expect(page.state.adapter).toBeNull();

  jestValue.spyOn(Setting, "isMobile").mockReturnValue(true);
  page.state = {
    ...page.state,
    adapter: {...externalAdapter},
    organizations: [{name: "engineering"}],
    mode: "edit",
  };
  const mobileView = page.renderAdapter();
  const mobileSelects = collectElementsByType(mobileView, Select);
  expect(mobileSelects.length).toBeGreaterThan(1);

  const editModeButtons = collectElementsByType(page.render(), Button);
  expect(editModeButtons.length).toBeGreaterThan(0);

  page.state = {...page.state, adapter: null};
  const nullRenderButtons = collectElementsByType(page.render(), Button);
  expect(nullRenderButtons.length).toBe(2);
});

test("keeps adapter edit field handlers, useSameDb switch and DB test behavior", async() => {
  const page = createEditPage({location: {mode: "add"}} as Partial<React.ComponentProps<typeof AdapterEditPage>>);
  page.state = {
    ...page.state,
    mode: "add",
    adapter: {...externalAdapter},
    organizations: [{name: "engineering"}, {name: "security"}],
  };

  const adapterView = page.renderAdapter();
  const selects = collectElementsByType(adapterView, Select);
  elementProps<{onChange: (value: string) => void}>(selects[0]).onChange("security");
  expect(page.state.adapter?.owner).toBe("security");

  const inputs = collectElementsByType(adapterView, Input);
  elementProps<{onChange: (event: {target: {value: string}}) => void}>(inputs[0]).onChange({target: {value: "adapter-updated"}});
  elementProps<{onChange: (event: {target: {value: string}}) => void}>(inputs[1]).onChange({target: {value: "policy_table"}});
  elementProps<{onChange: (event: {target: {value: string}}) => void}>(inputs[2]).onChange({target: {value: "db.example"}});
  elementProps<{onChange: (event: {target: {value: string}}) => void}>(inputs[3]).onChange({target: {value: "db-user"}});
  elementProps<{onChange: (event: {target: {value: string}}) => void}>(inputs[4]).onChange({target: {value: "db-pass"}});
  elementProps<{onChange: (event: {target: {value: string}}) => void}>(inputs[5]).onChange({target: {value: "db-main"}});
  expect(page.state.adapter).toEqual(expect.objectContaining({
    name: "adapter-updated",
    table: "policy_table",
    host: "db.example",
    user: "db-user",
    password: "db-pass",
    database: "db-main",
  }));

  elementProps<{onChange: (value: number | null) => void}>(collectElementsByType(adapterView, InputNumber)[0]).onChange(5432);
  expect(page.state.adapter?.port).toBe(5432);

  const switches = collectElementsByType(adapterView, Switch);
  elementProps<{onChange: (checked: boolean) => void}>(switches[0]).onChange(true);
  expect(page.state.adapter).toEqual(expect.objectContaining({useSameDb: true, type: "", port: 0}));
  elementProps<{onChange: (checked: boolean) => void}>(switches[0]).onChange(false);
  expect(page.state.adapter).toEqual(expect.objectContaining({useSameDb: false, type: "Database", databaseType: "mysql", port: 3306}));

  const typeSelects = collectElementsByType(page.renderAdapter(), Select);
  elementProps<{onChange: (value: string) => void}>(typeSelects[1]).onChange("Database");
  elementProps<{onChange: (value: string) => void}>(typeSelects[2]).onChange("postgres");
  expect(page.state.adapter).toEqual(expect.objectContaining({type: "Database", databaseType: "postgres"}));

  page.updateAdapterField("owner", "engineering");
  const dbTestButton = collectElementsByType(page.renderAdapter(), Button).find(button => elementProps<{disabled?: boolean}>(button).disabled === false) as React.ReactElement;
  elementProps<{onClick: () => void}>(dbTestButton).onClick();
  await flushPromises();
  expect(adapterBackendMock.getPolicies).toHaveBeenCalledWith("", "", "engineering/adapter-updated");
  expect(Setting.showMessage).toHaveBeenCalledWith("success", expect.any(String));
});

test("keeps adapter edit error, delete and null-safe branches", async() => {
  const history = createHistory();
  const page = createEditPage({history} as Partial<React.ComponentProps<typeof AdapterEditPage>>);

  adapterBackendMock.getAdapter.mockResolvedValueOnce({status: "ok", data: null});
  page.getAdapter();
  await flushPromises();
  expect(history.push).toHaveBeenCalledWith("/404");

  organizationBackendMock.getOrganizations.mockResolvedValueOnce({status: "ok"});
  page.getOrganizations();
  await flushPromises();
  expect(page.state.organizations).toEqual([]);

  page.state = {...page.state, adapter: {...adapter}};
  adapterBackendMock.updateAdapter.mockResolvedValueOnce({status: "error", msg: "save failed"});
  page.updateAdapterField("name", "bad-name");
  page.submitAdapterEdit(false);
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("save failed"));
  expect(page.state.adapter?.name).toBe("adapter-main");

  adapterBackendMock.getPolicies.mockResolvedValueOnce({status: "error", msg: "db failed"});
  const dbTestButton = collectElementsByType(page.renderAdapter(), Button).find(button => elementProps<{disabled?: boolean}>(button).disabled === false) as React.ReactElement;
  elementProps<{onClick: () => void}>(dbTestButton).onClick();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("db failed"));

  adapterBackendMock.getPolicies.mockRejectedValueOnce(new Error("db network"));
  elementProps<{onClick: () => void}>(dbTestButton).onClick();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("db network"));

  adapterBackendMock.deleteAdapter.mockResolvedValueOnce({status: "error", msg: "delete failed"});
  page.deleteAdapter();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete failed"));

  adapterBackendMock.deleteAdapter.mockResolvedValueOnce({status: "ok"});
  page.deleteAdapter();
  await flushPromises();
  expect(history.push).toHaveBeenCalledWith("/adapters");
});
