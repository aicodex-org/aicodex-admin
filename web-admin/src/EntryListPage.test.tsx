import {afterEach, beforeEach, describe, expect, test, vi} from "vitest";
import React from "react";
import {act, cleanup, render} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import i18next from "i18next";
import EntryListPage from "./EntryListPage";
import * as EntryBackend from "./backend/EntryBackend";
import * as FormBackend from "./backend/FormBackend";
import * as Setting from "./Setting";
import en from "./locales/en/data.json";
import zh from "./locales/zh/data.json";
import * as fs from "fs";
import * as path from "path";
import {fireEvent} from "@testing-library/react";
import {fileURLToPath} from "url";
const testFileDirectory = path.dirname(fileURLToPath(import.meta.url));

type LooseMock = {
  (...args: unknown[]): unknown;
  mockImplementation: (implementation: (...args: unknown[]) => unknown) => LooseMock;
  mockReturnValue: (value: unknown) => LooseMock;
  mockResolvedValue: (value: unknown) => LooseMock;
  mockResolvedValueOnce: (value: unknown) => LooseMock;
  mockRejectedValueOnce: (value: unknown) => LooseMock;
};

type EntryBackendMock = Record<keyof typeof EntryBackend, LooseMock>;
type FormBackendMock = Record<keyof typeof FormBackend, LooseMock>;

interface TestEntryRecord {
  owner: string;
  name: string;
  createdTime: string;
  displayName: string;
  url: string;
  token: string;
  application: string;
  message: string;
  [key: string]: unknown;
}

interface TestTableColumn {
  key?: string;
  fixed?: unknown;
  filterDropdown?: unknown;
  filterIcon?: unknown;
  render?: (text: unknown, record: TestEntryRecord, index: number) => React.ReactNode;
}

function getRenderedTable(node: React.ReactNode): React.ReactElement<{columns: TestTableColumn[]; title: () => React.ReactNode}> {
  const wrapper = node as React.ReactElement<{children: React.ReactNode; className?: string}>;
  expect(wrapper.props.className).toContain("entry-list-page-table-shell");
  return React.Children.only(wrapper.props.children) as React.ReactElement<{columns: TestTableColumn[]; title: () => React.ReactNode}>;
}

vi.mock("./backend/EntryBackend", () => {
  return {
    getEntries: vi.fn(),
    getEntry: vi.fn(),
    updateEntry: vi.fn(),
    addEntry: vi.fn(),
    deleteEntry: vi.fn(),
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

const entryBackendMock = EntryBackend as unknown as EntryBackendMock;
const formBackendMock = FormBackend as unknown as FormBackendMock;
let consoleErrorSpy: {mockRestore: () => void};

const adminAccount = {owner: "admin", tag: "", isAdmin: true};
const entry: TestEntryRecord = {
  owner: "engineering",
  name: "entry-one",
  createdTime: "2026-06-19T10:00:00Z",
  displayName: "Entry One",
  url: "https://entry.example.invalid/listen",
  token: "secret-token",
  application: "admin-app",
  message: "hello",
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
    push: vi.fn(),
  };
}

function installSynchronousSetState(page: EntryListPage) {
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
  const page = new EntryListPage({
    account: adminAccount,
    history: createHistory(),
    match: {path: "/entries", params: {}},
  });
  installSynchronousSetState(page);
  return page;
}

function renderPage() {
  return render(
    <MemoryRouter>
      <EntryListPage
        account={adminAccount}
        history={createHistory()}
        match={{path: "/entries", params: {}}}
      />
    </MemoryRouter>
  );
}

async function flushPromises() {
  await act(async() => {
    await Promise.resolve();
  });
}

describe("EntryListPage", () => {
  beforeEach(async() => {
    await useTestLanguage("zh");
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation((message?: unknown, ...args: unknown[]) => {
      throw new Error([message, ...args].map(item => `${item}`).join(" "));
    });
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: () => ({
        matches: false,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    });
    vi.spyOn(Setting, "showMessage").mockImplementation(() => {});
    vi.spyOn(Setting, "getRandomName").mockReturnValue("abc123");
    vi.spyOn(Setting, "getRequestOrganization").mockReturnValue("engineering");
    vi.spyOn(Setting, "isMobile").mockReturnValue(false);
    formBackendMock.getForm.mockResolvedValue({status: "ok", data: {formItems: []}});
    entryBackendMock.getEntries.mockResolvedValue({status: "ok", data: [entry], data2: 1});
    entryBackendMock.addEntry.mockResolvedValue({status: "ok"});
    entryBackendMock.deleteEntry.mockResolvedValue({status: "ok"});
  });

  afterEach(() => {
    cleanup();
    consoleErrorSpy.mockRestore();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  test("is migrated from JavaScript to TSX", () => {
    expect(fs.existsSync(path.join(testFileDirectory, "EntryListPage.tsx"))).toBe(true);
    expect(fs.existsSync(path.join(testFileDirectory, "EntryListPage.js"))).toBe(false);
  });

  test("renders entry rows through the existing list API", async() => {
    const view = renderPage();

    expect(await view.findByText("entry-one")).not.toBeNull();
    expect(view.getByText("Entry One")).not.toBeNull();
    expect(view.getByText("入口配置")).not.toBeNull();
    expect(entryBackendMock.getEntries).toHaveBeenCalledWith("engineering", expect.any(Number), expect.any(Number), undefined, undefined, undefined, undefined);
    expect(formBackendMock.getForm).toHaveBeenCalled();
  });

  test("creates a default entry and navigates to the edit route", async() => {
    const history = createHistory();
    const page = new EntryListPage({
      account: adminAccount,
      history,
      match: {path: "/entries", params: {}},
    });

    expect(page.newEntry()).toEqual(expect.objectContaining({
      owner: "engineering",
      name: "entry_abc123",
      displayName: "New Entry - abc123",
      url: "",
      token: "",
      application: "",
      message: "",
    }));

    page.addEntry();
    await flushPromises();

    expect(entryBackendMock.addEntry).toHaveBeenCalledWith(expect.objectContaining({
      owner: "engineering",
      name: "entry_abc123",
    }));
    expect(history.push).toHaveBeenCalledWith({pathname: "/entries/engineering/entry_abc123", mode: "add"});
    expect(Setting.showMessage).toHaveBeenCalledWith("success", expect.any(String));
  });

  test("fetches entries with pagination, search and sorting state", async() => {
    const page = createPage();

    page.fetch({
      pagination: {...page.state.pagination, current: 2, pageSize: 20},
      searchedColumn: "name",
      searchText: "entry",
      sortField: "createdTime",
      sortOrder: "descend",
    });
    await flushPromises();

    expect(entryBackendMock.getEntries).toHaveBeenCalledWith("engineering", 2, 20, "name", "entry", "createdTime", "descend");
    expect(page.state.loading).toBe(false);
    expect(page.state.data).toEqual([entry]);
    expect(page.state.pagination.total).toBe(1);
  });

  test("uses default pagination and empty data fallback during fetch", async() => {
    const page = createPage();
    entryBackendMock.getEntries.mockResolvedValueOnce({status: "ok", data: undefined, data2: 0});

    page.fetch();
    await flushPromises();

    expect(entryBackendMock.getEntries).toHaveBeenCalledWith("engineering", 1, 10, undefined, undefined, undefined, undefined);
    expect(page.state.data).toEqual([]);
    expect(page.state.pagination.total).toBe(0);
  });

  test("deletes entries and rolls back pagination for the last row", async() => {
    const page = createPage();
    page.fetch = vi.fn() as unknown as typeof page.fetch;
    page.state = {
      ...page.state,
      data: [entry],
      pagination: {...page.state.pagination, current: 3},
    };

    page.deleteEntry(0);
    await flushPromises();

    expect(entryBackendMock.deleteEntry).toHaveBeenCalledWith(entry);
    expect(page.fetch).toHaveBeenCalledWith(expect.objectContaining({
      pagination: expect.objectContaining({current: 2}),
    }));
    expect(Setting.showMessage).toHaveBeenCalledWith("success", expect.any(String));
  });

  test("keeps current pagination when deleting from a page with multiple rows", async() => {
    const secondEntry = {...entry, name: "entry-two"};
    const page = createPage();
    page.fetch = vi.fn() as unknown as typeof page.fetch;
    page.state = {
      ...page.state,
      data: [entry, secondEntry],
      pagination: {...page.state.pagination, current: 3},
    };

    page.deleteEntry(0);
    await flushPromises();

    expect(page.fetch).toHaveBeenCalledWith(expect.objectContaining({
      pagination: expect.objectContaining({current: 3}),
    }));
  });

  test("reports add, delete and list failures", async() => {
    const page = createPage();
    page.state = {
      ...page.state,
      data: [entry],
    };
    entryBackendMock.addEntry.mockResolvedValueOnce({status: "error", msg: "add failed"});
    entryBackendMock.addEntry.mockRejectedValueOnce(new Error("add network"));
    entryBackendMock.deleteEntry.mockResolvedValueOnce({status: "error", msg: "delete failed"});
    entryBackendMock.deleteEntry.mockRejectedValueOnce(new Error("delete network"));
    entryBackendMock.getEntries.mockResolvedValueOnce({status: "error", msg: "list failed"});

    page.addEntry();
    await flushPromises();
    expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("add failed"));

    page.addEntry();
    await flushPromises();
    expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("add network"));

    page.deleteEntry(0);
    await flushPromises();
    expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete failed"));

    page.deleteEntry(0);
    await flushPromises();
    expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete network"));

    page.fetch({pagination: {...page.state.pagination, current: 1, pageSize: 10}});
    await flushPromises();
    expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("list failed"));
  });

  test("keeps table columns, toolbar and row actions wired", () => {
    const history = createHistory();
    const page = new EntryListPage({
      account: adminAccount,
      history,
      match: {path: "/entries", params: {}},
    });
    installSynchronousSetState(page);
    vi.spyOn(page, "addEntry").mockImplementation(() => {});
    vi.spyOn(page, "deleteEntry").mockImplementation(() => {});

    const table = getRenderedTable(page.renderTable([entry]));
    const columns = table.props.columns;

    expect(columns[0].key).toBe("name");
    expect(columns[6].fixed).toBeUndefined();
    columns.forEach(column => {
      expect(column.filterDropdown).toBeUndefined();
      expect(column.filterIcon).toBeUndefined();
    });
    expect(columns[4].render?.("", entry, 0)).toBeNull();

    const actionNode = columns[6].render?.(undefined, entry, 0) as React.ReactElement<{children: React.ReactNode}>;
    const actionChildren = React.Children.toArray(actionNode.props.children) as React.ReactElement[];
    const actionView = render(<>{actionNode}</>);
    fireEvent.click(actionView.getByText(/编\s*辑|Edit/));
    expect(history.push).toHaveBeenCalledWith("/entries/engineering/entry-one");
    actionChildren[1].props.onConfirm();
    expect(page.deleteEntry).toHaveBeenCalledWith(0);
    actionView.unmount();

    const toolbarView = render(<>{table.props.title()}</>);
    fireEvent.click(toolbarView.getByText(/添\s*加|Add/));
    expect(page.addEntry).toHaveBeenCalled();
  });

  test("does not fix the action column on mobile", () => {
    vi.spyOn(Setting, "isMobile").mockReturnValue(true);
    const page = createPage();

    const table = getRenderedTable(page.renderTable([entry]));

    expect(table.props.columns[6].fixed).toBeUndefined();
  });
});
