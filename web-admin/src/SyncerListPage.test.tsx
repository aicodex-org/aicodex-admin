/* eslint-env jest */
import React from "react";
import {expect as jestExpect, jest as jestValue} from "@jest/globals";
import {render} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import * as Setting from "./Setting";
import * as FormBackend from "./backend/FormBackend";
import * as SyncerBackend from "./backend/SyncerBackend";
import SyncerListPage from "./SyncerListPage";
import type {SyncerRecord} from "./backend/SyncerBackend";

declare const jest: typeof jestValue;

type LooseMock = {
  (...args: unknown[]): unknown;
  mockResolvedValue: (value: unknown) => LooseMock;
  mockResolvedValueOnce: (value: unknown) => LooseMock;
  mockRejectedValueOnce: (value: unknown) => LooseMock;
};

type BackendMock = Record<keyof typeof SyncerBackend, LooseMock>;
type FormBackendMock = Record<keyof typeof FormBackend, LooseMock>;

const backendMock = SyncerBackend as unknown as BackendMock;
const formBackendMock = FormBackend as unknown as FormBackendMock;
const expect = jestExpect;
type TestTableColumn = {
  key?: string;
  sorter?: unknown;
  render?: (text: unknown, record: SyncerRecord, index: number) => React.ReactNode;
};
const {fireEvent} = require("@testing-library/react") as {
  fireEvent: {
    click: (element: Element | null) => boolean;
  };
};

jest.mock("./backend/SyncerBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    getSyncers: factoryJest.fn(),
    getSyncer: factoryJest.fn(),
    updateSyncer: factoryJest.fn(),
    addSyncer: factoryJest.fn(),
    testSyncerDb: factoryJest.fn(),
    deleteSyncer: factoryJest.fn(),
    runSyncer: factoryJest.fn(),
  };
});

jest.mock("./backend/FormBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    getForm: factoryJest.fn(),
  };
});

const account = {owner: "built-in", tag: "", isAdmin: true};

function flushPromises() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

function createHistory() {
  return {
    push: jestValue.fn(),
  };
}

function createPage() {
  const page = new SyncerListPage({
    account,
    history: createHistory(),
    match: {path: "/syncers", params: {}},
  });
  page.setState = ((stateUpdate: unknown, callback?: () => void) => {
    const patch = typeof stateUpdate === "function" ? stateUpdate(page.state, page.props) : stateUpdate;
    page.state = {
      ...page.state,
      ...(patch as Record<string, unknown>),
    };
    callback?.();
  }) as typeof page.setState;
  return page;
}

function renderPage() {
  return render(
    <MemoryRouter>
      <SyncerListPage
        account={account}
        history={createHistory()}
        match={{path: "/syncers", params: {}}}
      />
    </MemoryRouter>
  );
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("organization", "engineering");
  jestValue.spyOn(Setting, "showMessage").mockImplementation(() => {});
  jestValue.spyOn(Setting, "getRandomName").mockReturnValue("abc123");
  formBackendMock.getForm.mockResolvedValue({status: "ok", data: {formItems: []}});
  backendMock.getSyncers.mockResolvedValue({
    status: "ok",
    data: [],
    data2: 0,
  });
  backendMock.addSyncer.mockResolvedValue({status: "ok"});
  backendMock.deleteSyncer.mockResolvedValue({status: "ok"});
  backendMock.runSyncer.mockResolvedValue({status: "ok"});
});

afterEach(() => {
  jestValue.restoreAllMocks();
  jestValue.clearAllMocks();
});

test("renders syncer rows and fetches the selected organization", async() => {
  backendMock.getSyncers.mockResolvedValue({
    status: "ok",
    data: [{
      owner: "admin",
      name: "syncer-main",
      organization: "engineering",
      type: "Database",
      databaseType: "mysql",
      host: "localhost",
      port: 3306,
      user: "root",
      password: "secret",
      database: "dbName",
      table: "user",
      syncInterval: 10,
      isEnabled: true,
    }],
    data2: 1,
  });

  const view = renderPage();

  expect(await view.findByText("syncer-main")).not.toBeNull();
  expect(view.getByText("engineering")).not.toBeNull();
  expect(backendMock.getSyncers).toHaveBeenCalledWith("admin", "engineering", expect.any(Number), expect.any(Number), undefined, undefined, undefined, undefined);
  expect(formBackendMock.getForm).toHaveBeenCalled();
});

test("creates a default syncer and navigates to edit page", async() => {
  const history = createHistory();
  const page = new SyncerListPage({
    account,
    history,
    match: {path: "/syncers", params: {}},
  });

  expect(page.newSyncer()).toEqual(expect.objectContaining({
    owner: "admin",
    name: "syncer_abc123",
    organization: "engineering",
    type: "Database",
    databaseType: "mysql",
    isReadOnly: false,
    isEnabled: false,
  }));

  page.addSyncer();
  await flushPromises();

  expect(backendMock.addSyncer).toHaveBeenCalledWith(expect.objectContaining({
    name: "syncer_abc123",
    organization: "engineering",
  }));
  expect(history.push).toHaveBeenCalledWith({pathname: "/syncers/syncer_abc123", mode: "add"});
  expect(Setting.showMessage).toHaveBeenCalledWith("success", expect.any(String));
});

test("fetches all organizations when default organization is selected", async() => {
  localStorage.setItem("organization", "All");
  const page = createPage();

  page.fetch({pagination: {...page.state.pagination, current: 3, pageSize: 50}});
  await flushPromises();

  expect(backendMock.getSyncers).toHaveBeenCalledWith("admin", "", 3, 50, undefined, undefined, undefined, undefined);
});

test("passes search, type filter and sorting parameters to backend", async() => {
  const page = createPage();

  page.fetch({
    pagination: {...page.state.pagination, current: 1, pageSize: 20},
    searchedColumn: "name",
    searchText: "main",
    sortField: "name",
    sortOrder: "ascend",
  });
  await flushPromises();

  expect(backendMock.getSyncers).toHaveBeenLastCalledWith("admin", "engineering", 1, 20, "name", "main", "name", "ascend");

  page.fetch({
    pagination: {...page.state.pagination, current: 1, pageSize: 20},
    type: ["LDAP"],
  });
  await flushPromises();

  expect(backendMock.getSyncers).toHaveBeenLastCalledWith("admin", "engineering", 1, 20, "type", "LDAP", undefined, undefined);

  page.fetch({
    pagination: {...page.state.pagination, current: 1, pageSize: 20},
    type: "Database",
  });
  await flushPromises();

  expect(backendMock.getSyncers).toHaveBeenLastCalledWith("admin", "engineering", 1, 20, "type", "Database", undefined, undefined);
});

test("runs syncer and reports success or failure", async() => {
  const page = createPage();
  page.state = {
    ...page.state,
    data: [{owner: "admin", name: "syncer-main"}],
  };

  page.runSyncer(0);
  await flushPromises();

  expect(backendMock.runSyncer).toHaveBeenCalledWith("admin", "syncer-main");
  expect(Setting.showMessage).toHaveBeenCalledWith("success", expect.any(String));

  backendMock.runSyncer.mockResolvedValueOnce({status: "error", msg: "sync failed"});
  page.runSyncer(0);
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("sync failed"));

  backendMock.runSyncer.mockRejectedValueOnce(new Error("offline"));
  page.runSyncer(0);
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("offline"));
  expect(page.state.loading).toBe(false);
});

test("deletes syncer and rolls back pagination for the last row", async() => {
  const page = createPage();
  page.fetch = jestValue.fn() as unknown as typeof page.fetch;
  page.state = {
    ...page.state,
    data: [{owner: "admin", name: "syncer-main"}],
    pagination: {...page.state.pagination, current: 2},
  };

  page.deleteSyncer(0);
  await flushPromises();

  expect(backendMock.deleteSyncer).toHaveBeenCalledWith(expect.objectContaining({name: "syncer-main"}));
  expect(page.fetch).toHaveBeenCalledWith(expect.objectContaining({
    pagination: expect.objectContaining({current: 1}),
  }));
  expect(Setting.showMessage).toHaveBeenCalledWith("success", expect.any(String));
});

test("reports add and delete failures", async() => {
  const page = createPage();
  page.state = {
    ...page.state,
    data: [{owner: "admin", name: "syncer-main"}],
  };
  backendMock.addSyncer.mockResolvedValueOnce({status: "error", msg: "add failed"});
  backendMock.addSyncer.mockRejectedValueOnce(new Error("add network"));
  backendMock.deleteSyncer.mockResolvedValueOnce({status: "error", msg: "delete failed"});
  backendMock.deleteSyncer.mockRejectedValueOnce(new Error("delete network"));

  page.addSyncer();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("add failed"));

  page.addSyncer();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("add network"));

  page.deleteSyncer(0);
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete failed"));

  page.deleteSyncer(0);
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete network"));
});

test("builds table columns, actions and toolbar without changing handlers", () => {
  const history = createHistory();
  const page = new SyncerListPage({
    account,
    history,
    match: {path: "/syncers", params: {}},
  });
  page.setState = ((stateUpdate: unknown, callback?: () => void) => {
    const patch = typeof stateUpdate === "function" ? stateUpdate(page.state, page.props) : stateUpdate;
    page.state = {
      ...page.state,
      ...(patch as Record<string, unknown>),
    };
    callback?.();
  }) as typeof page.setState;
  jestValue.spyOn(page, "runSyncer").mockImplementation(() => {});
  jestValue.spyOn(page, "deleteSyncer").mockImplementation(() => {});
  jestValue.spyOn(page, "addSyncer").mockImplementation(() => {});

  const tableWrapper = page.renderTable([{
    owner: "admin",
    name: "syncer-main",
    organization: "engineering",
    databaseType: "mysql",
    isEnabled: false,
  } as SyncerRecord]) as React.ReactElement<{children: React.ReactElement<{columns: TestTableColumn[]; title: () => React.ReactNode}>}>;
  const table = tableWrapper.props.children;
  const columns = table.props.columns;

  expect(columns[0].key).toBe("name");
  expect((columns[4].sorter as (a: SyncerRecord, b: SyncerRecord) => number)({databaseType: "postgres"}, {databaseType: "mysql"})).toBeGreaterThan(0);

  const actionNode = columns[13].render?.(undefined, {owner: "admin", name: "syncer-main"}, 0) as React.ReactElement;
  const actionView = render(<>{actionNode}</>);
  fireEvent.click(actionView.getByText(/同\s*步/));
  fireEvent.click(actionView.getByText(/编\s*辑/));
  expect(page.runSyncer).toHaveBeenCalledWith(0);
  expect(history.push).toHaveBeenCalledWith("/syncers/syncer-main");
  actionView.unmount();

  const toolbarView = render(<>{table.props.title()}</>);
  fireEvent.click(toolbarView.getByText(/添\s*加/));
  expect(page.addSyncer).toHaveBeenCalled();
});

test("renders unauthorized state when syncer list request is denied", async() => {
  backendMock.getSyncers.mockResolvedValue({
    status: "error",
    msg: "Unauthorized operation",
  });

  const view = renderPage();

  expect(await view.findByText("403 Unauthorized")).not.toBeNull();
  expect(Setting.showMessage).not.toHaveBeenCalledWith("error", "Unauthorized operation");
});

test("reports list fetch server errors", async() => {
  const page = createPage();
  backendMock.getSyncers.mockResolvedValueOnce({
    status: "error",
    msg: "list failed",
  });

  page.fetch();
  await flushPromises();

  expect(Setting.showMessage).toHaveBeenCalledWith("error", "list failed");
});
