/* eslint-env jest */
import React from "react";
import {act, cleanup, render} from "@testing-library/react";
import {expect, jest} from "@jest/globals";
import {MemoryRouter} from "react-router-dom";
import i18next from "i18next";
import ServerListPage from "./ServerListPage";
import * as ServerBackend from "./backend/ServerBackend";
import * as FormBackend from "./backend/FormBackend";
import * as Setting from "./Setting";
import en from "./locales/en/data.json";
import zh from "./locales/zh/data.json";

type LooseMock = {
  (...args: unknown[]): unknown;
  mockImplementation: (implementation: (...args: unknown[]) => unknown) => LooseMock;
  mockReturnValue: (value: unknown) => LooseMock;
  mockResolvedValue: (value: unknown) => LooseMock;
  mockResolvedValueOnce: (value: unknown) => LooseMock;
  mockRejectedValueOnce: (value: unknown) => LooseMock;
};

type ServerBackendMock = Record<keyof typeof ServerBackend, LooseMock>;
type FormBackendMock = Record<keyof typeof FormBackend, LooseMock>;

interface TestServerRecord {
  owner: string;
  name: string;
  createdTime: string;
  displayName: string;
  url: string;
  application: string;
  token?: string;
  tools?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

interface TestTableColumn {
  key?: string;
  fixed?: unknown;
  render?: (text: unknown, record: TestServerRecord, index: number) => React.ReactNode;
}

function getRenderedTable(node: React.ReactNode): React.ReactElement<{columns: TestTableColumn[]; title: () => React.ReactNode}> {
  const fragment = node as React.ReactElement<{children: React.ReactNode}>;
  return React.Children.only(fragment.props.children) as React.ReactElement<{columns: TestTableColumn[]; title: () => React.ReactNode}>;
}

jest.mock("./backend/ServerBackend", () => {
  const {jest: factoryJest} = require("@jest/globals");
  return {
    getServers: factoryJest.fn(),
    getOnlineServers: factoryJest.fn(),
    getServer: factoryJest.fn(),
    updateServer: factoryJest.fn(),
    addServer: factoryJest.fn(),
    deleteServer: factoryJest.fn(),
  };
});

jest.mock("./backend/FormBackend", () => {
  const {jest: factoryJest} = require("@jest/globals");
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

const serverBackendMock = ServerBackend as unknown as ServerBackendMock;
const formBackendMock = FormBackend as unknown as FormBackendMock;
const fs = require("fs") as {existsSync: (filePath: string) => boolean};
const path = require("path") as {join: (...parts: string[]) => string};
const {fireEvent} = require("@testing-library/react") as {
  fireEvent: {
    click: (element: Element | null) => boolean;
  };
};
let consoleErrorSpy: {mockRestore: () => void};

const adminAccount = {owner: "admin", tag: "", isAdmin: true};
const server: TestServerRecord = {
  owner: "engineering",
  name: "server-one",
  createdTime: "2026-06-20T10:00:00Z",
  displayName: "Server One",
  url: "https://server.example.invalid/mcp",
  application: "admin-app",
};

async function useTestLanguage(language: string) {
  if (!i18next.isInitialized) {
    await i18next.init({
      lng: language,
      fallbackLng: "en",
      resources: {en, zh},
      ns: Object.keys(en),
      keySeparator: false,
    });
    return;
  }

  Object.entries(en).forEach(([namespace, values]) => {
    i18next.addResourceBundle("en", namespace, values, true, true);
  });
  Object.entries(zh).forEach(([namespace, values]) => {
    i18next.addResourceBundle("zh", namespace, values, true, true);
  });
  await i18next.changeLanguage(language);
}

function createHistory() {
  return {
    push: jest.fn(),
  };
}

function installSynchronousSetState(page: ServerListPage) {
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
  const page = new ServerListPage({
    account: adminAccount,
    history: createHistory(),
    match: {path: "/servers", params: {}},
  });
  installSynchronousSetState(page);
  return page;
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ServerListPage
        account={adminAccount}
        history={createHistory()}
        match={{path: "/servers", params: {}}}
      />
    </MemoryRouter>
  );
}

async function flushPromises() {
  await act(async() => {
    await Promise.resolve();
  });
}

describe("ServerListPage", () => {
  beforeEach(async() => {
    await useTestLanguage("zh");
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation((message?: unknown, ...args: unknown[]) => {
      if (`${message}`.includes("ReactDOM.render is no longer supported")) {
        return;
      }

      throw new Error([message, ...args].map(item => `${item}`).join(" "));
    });
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: () => ({
        matches: false,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }),
    });
    jest.spyOn(Setting, "showMessage").mockImplementation(() => {});
    jest.spyOn(Setting, "getRandomName").mockReturnValue("abc123");
    jest.spyOn(Setting, "getRequestOrganization").mockReturnValue("engineering");
    jest.spyOn(Setting, "isMobile").mockReturnValue(false);
    formBackendMock.getForm.mockResolvedValue({status: "ok", data: {formItems: []}});
    serverBackendMock.getServers.mockResolvedValue({status: "ok", data: [server], data2: 1});
    serverBackendMock.addServer.mockResolvedValue({status: "ok"});
    serverBackendMock.deleteServer.mockResolvedValue({status: "ok"});
  });

  afterEach(() => {
    cleanup();
    consoleErrorSpy.mockRestore();
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  test("is migrated from JavaScript to TSX", () => {
    expect(fs.existsSync(path.join(__dirname, "ServerListPage.tsx"))).toBe(true);
    expect(fs.existsSync(path.join(__dirname, "ServerListPage.js"))).toBe(false);
  });

  test("renders server rows through the existing list API", async() => {
    const view = renderPage();

    expect(await view.findByText("server-one")).not.toBeNull();
    expect(view.getByText("Server One")).not.toBeNull();
    expect(serverBackendMock.getServers).toHaveBeenCalledWith("engineering", expect.any(Number), expect.any(Number), undefined, undefined, undefined, undefined);
    expect(formBackendMock.getForm).toHaveBeenCalled();
  });

  test("creates a default server and navigates to the edit route", async() => {
    const history = createHistory();
    const page = new ServerListPage({
      account: adminAccount,
      history,
      match: {path: "/servers", params: {}},
    });

    expect(page.newServer()).toEqual(expect.objectContaining({
      owner: "engineering",
      name: "server_abc123",
      displayName: "New Server - abc123",
      url: "",
      application: "",
    }));

    page.addServer();
    await flushPromises();

    expect(serverBackendMock.addServer).toHaveBeenCalledWith(expect.objectContaining({
      owner: "engineering",
      name: "server_abc123",
    }));
    expect(history.push).toHaveBeenCalledWith({pathname: "/servers/engineering/server_abc123", mode: "add"});
    expect(Setting.showMessage).toHaveBeenCalledWith("success", expect.any(String));
  });

  test("fetches servers with pagination, search and sorting state", async() => {
    const page = createPage();

    page.fetch({
      pagination: {...page.state.pagination, current: 2, pageSize: 20},
      searchedColumn: "name",
      searchText: "server",
      sortField: "createdTime",
      sortOrder: "descend",
    });
    await flushPromises();

    expect(serverBackendMock.getServers).toHaveBeenCalledWith("engineering", 2, 20, "name", "server", "createdTime", "descend");
    expect(page.state.loading).toBe(false);
    expect(page.state.data).toEqual([server]);
    expect(page.state.pagination.total).toBe(1);
  });

  test("uses default pagination and empty data fallback during fetch", async() => {
    const page = createPage();
    serverBackendMock.getServers.mockResolvedValueOnce({status: "ok", data: undefined, data2: 0});

    page.fetch();
    await flushPromises();

    expect(serverBackendMock.getServers).toHaveBeenCalledWith("engineering", 1, 10, undefined, undefined, undefined, undefined);
    expect(page.state.data).toEqual([]);
    expect(page.state.pagination.total).toBe(0);
  });

  test("deletes servers and rolls back pagination for the last row", async() => {
    const page = createPage();
    page.fetch = jest.fn() as unknown as typeof page.fetch;
    page.state = {
      ...page.state,
      data: [server],
      pagination: {...page.state.pagination, current: 3},
    };

    page.deleteServer(0);
    await flushPromises();

    expect(serverBackendMock.deleteServer).toHaveBeenCalledWith(server);
    expect(page.fetch).toHaveBeenCalledWith(expect.objectContaining({
      pagination: expect.objectContaining({current: 2}),
    }));
    expect(Setting.showMessage).toHaveBeenCalledWith("success", expect.any(String));
  });

  test("keeps current pagination when deleting from a page with multiple rows", async() => {
    const secondServer = {...server, name: "server-two"};
    const page = createPage();
    page.fetch = jest.fn() as unknown as typeof page.fetch;
    page.state = {
      ...page.state,
      data: [server, secondServer],
      pagination: {...page.state.pagination, current: 3},
    };

    page.deleteServer(0);
    await flushPromises();

    expect(page.fetch).toHaveBeenCalledWith(expect.objectContaining({
      pagination: expect.objectContaining({current: 3}),
    }));
  });

  test("reports add, delete and list failures", async() => {
    const page = createPage();
    page.state = {
      ...page.state,
      data: [server],
    };
    serverBackendMock.addServer.mockResolvedValueOnce({status: "error", msg: "add failed"});
    serverBackendMock.addServer.mockRejectedValueOnce(new Error("add network"));
    serverBackendMock.deleteServer.mockResolvedValueOnce({status: "error", msg: "delete failed"});
    serverBackendMock.deleteServer.mockRejectedValueOnce(new Error("delete network"));
    serverBackendMock.getServers.mockResolvedValueOnce({status: "error", msg: "list failed"});

    page.addServer();
    await flushPromises();
    expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("add failed"));

    page.addServer();
    await flushPromises();
    expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("add network"));

    page.deleteServer(0);
    await flushPromises();
    expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete failed"));

    page.deleteServer(0);
    await flushPromises();
    expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete network"));

    page.fetch({pagination: {...page.state.pagination, current: 1, pageSize: 10}});
    await flushPromises();
    expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("list failed"));
  });

  test("keeps table columns, toolbar and row actions wired", () => {
    const history = createHistory();
    const page = new ServerListPage({
      account: adminAccount,
      history,
      match: {path: "/servers", params: {}},
    });
    installSynchronousSetState(page);
    jest.spyOn(page, "addServer").mockImplementation(() => {});
    jest.spyOn(page, "deleteServer").mockImplementation(() => {});

    const table = getRenderedTable(page.renderTable([server]));
    const columns = table.props.columns;

    expect(columns[0].key).toBe("name");
    expect(columns[6].fixed).toBe("right");
    expect(columns[4].render?.("", server, 0)).toBeNull();

    const actionNode = columns[6].render?.(undefined, server, 0) as React.ReactElement<{children: React.ReactNode}>;
    const actionChildren = React.Children.toArray(actionNode.props.children) as React.ReactElement[];
    const actionView = render(<>{actionNode}</>);
    fireEvent.click(actionView.getByText(/编\s*辑|Edit/));
    expect(history.push).toHaveBeenCalledWith("/servers/engineering/server-one");
    actionChildren[1].props.onConfirm();
    expect(page.deleteServer).toHaveBeenCalledWith(0);
    actionView.unmount();

    const toolbarView = render(<>{table.props.title()}</>);
    fireEvent.click(toolbarView.getByText(/添\s*加|Add/));
    expect(page.addServer).toHaveBeenCalled();
    fireEvent.click(toolbarView.getByText("MCP Store"));
    expect(history.push).toHaveBeenCalledWith("/server-store");
  });

  test("does not fix the action column on mobile", () => {
    jest.spyOn(Setting, "isMobile").mockReturnValue(true);
    const page = createPage();

    const table = getRenderedTable(page.renderTable([server]));

    expect(table.props.columns[6].fixed).toBe(false);
  });
});
