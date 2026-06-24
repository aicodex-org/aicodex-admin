/* eslint-env jest */
import React from "react";
import {expect as jestExpect, jest as jestValue} from "@jest/globals";
import {cleanup, render} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import * as Setting from "./Setting";
import * as FormBackend from "./backend/FormBackend";
import * as GroupBackend from "./backend/GroupBackend";
import ListPageTable from "./common/ListPageTable";
import GroupListPage from "./GroupListPage";
import * as XLSX from "xlsx";

declare const jest: typeof jestValue;

type LooseMock = {
  (...args: unknown[]): unknown;
  mockImplementation: (implementation: (...args: unknown[]) => unknown) => LooseMock;
  mockReturnValue: (value: unknown) => LooseMock;
  mockReturnValueOnce: (value: unknown) => LooseMock;
  mockResolvedValue: (value: unknown) => LooseMock;
  mockResolvedValueOnce: (value: unknown) => LooseMock;
  mockRejectedValueOnce: (value: unknown) => LooseMock;
};

type BackendMock = Record<keyof typeof GroupBackend, LooseMock>;
type FormBackendMock = Record<keyof typeof FormBackend, LooseMock>;
type XlsxMock = {
  read: LooseMock;
  writeFile: LooseMock;
  utils: {
    json_to_sheet: LooseMock;
    book_new: LooseMock;
    book_append_sheet: LooseMock;
    sheet_to_json: LooseMock;
  };
};
type TestGroupRecord = {
  owner: string;
  name: string;
  [key: string]: unknown;
};
type TestTableColumn = {
  key?: string;
  dataIndex?: string;
  fixed?: unknown;
  sorter?: unknown;
  render?: (text: unknown, record: TestGroupRecord, index: number) => React.ReactNode;
};
type TestGroupTableElement = React.ReactElement<{
  bordered?: boolean;
  className?: string;
  columns: TestTableColumn[];
  pagination?: {pageSize?: number};
  scroll?: {x?: unknown; y?: unknown};
  showSorterTooltip?: {target?: string};
  tableLayout?: string;
  title: () => React.ReactNode;
}>;
type TestSharedTableElement = React.ReactElement<{
  bordered?: boolean;
  className?: string;
  showSorterTooltip?: {target?: string};
  size?: string;
  tableLayout?: string;
}>;

const backendMock = GroupBackend as unknown as BackendMock;
const formBackendMock = FormBackend as unknown as FormBackendMock;
const xlsxMock = XLSX as unknown as XlsxMock;
const expect = jestExpect;
const {fireEvent} = require("@testing-library/react") as {
  fireEvent: {
    click: (element: Element | null) => boolean;
    change: (element: Element | null, event: {target: {value: string}}) => boolean;
  };
};

jest.mock("./backend/GroupBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    getGroups: factoryJest.fn(),
    getGroup: factoryJest.fn(),
    updateGroup: factoryJest.fn(),
    addGroup: factoryJest.fn(),
    deleteGroup: factoryJest.fn(),
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

jest.mock("xlsx", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    read: factoryJest.fn(),
    writeFile: factoryJest.fn(),
    utils: {
      json_to_sheet: factoryJest.fn(() => ({sheet: true})),
      book_new: factoryJest.fn(() => ({book: true})),
      book_append_sheet: factoryJest.fn(),
      sheet_to_json: factoryJest.fn(),
    },
  };
});

const account = {owner: "built-in", tag: "", isAdmin: true};
const group = {
  owner: "engineering",
  name: "group-main",
  displayName: "Main Group",
  type: "Virtual",
  parentId: "engineering",
  parentName: "Engineering",
  users: [],
  isTopGroup: true,
  isEnabled: true,
};

function flushPromises() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

function getAdvancedFilterInputByLabel(container: HTMLElement, labelPattern: RegExp): HTMLInputElement {
  const input = Array.from(container.querySelectorAll<HTMLElement>(".enterprise-list-query-toolbar-advanced .organization-advanced-filter-input"))
    .map(element => element instanceof HTMLInputElement ? element : element.querySelector<HTMLInputElement>("input"))
    .find(element => element ? labelPattern.test(element.getAttribute("aria-label") || "") : false);
  if (!input) {
    throw new Error(`Unable to find advanced filter input by label pattern: ${labelPattern}`);
  }
  return input;
}

function createHistory() {
  return {
    push: jestValue.fn(),
  };
}

function installSynchronousSetState(page: GroupListPage) {
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
  const page = new GroupListPage({
    account,
    history: createHistory(),
    match: {path: "/groups", params: {}},
  });
  installSynchronousSetState(page);
  return page;
}

function renderPage() {
  return render(
    <MemoryRouter>
      <GroupListPage
        account={account}
        history={createHistory()}
        match={{path: "/groups", params: {}}}
      />
    </MemoryRouter>
  );
}

function getUploadAndModal(page: GroupListPage) {
  const uploadFragment = page.renderUpload() as React.ReactElement<{children: React.ReactNode}>;
  const children = React.Children.toArray(uploadFragment.props.children) as React.ReactElement[];
  return {
    upload: children[0],
    modal: children[1],
  };
}

class MockFileReader {
  static instances: MockFileReader[] = [];

  onload: ((event: {target?: {result?: ArrayBuffer}}) => void) | null = null;
  onerror: ((event: {message?: string}) => void) | null = null;

  constructor() {
    MockFileReader.instances.push(this);
  }

  readAsArrayBuffer = jestValue.fn();
}

beforeEach(() => {
  cleanup();
  localStorage.clear();
  localStorage.setItem("organization", "engineering");
  MockFileReader.instances = [];
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
  Object.defineProperty(global, "FileReader", {
    writable: true,
    value: MockFileReader,
  });
  jestValue.spyOn(Setting, "showMessage").mockImplementation(() => {});
  jestValue.spyOn(Setting, "getRandomName").mockReturnValue("abc123");
  jestValue.spyOn(Setting, "getGroupColumns").mockReturnValue(["Name#name", "Owner#owner"]);
  formBackendMock.getForm.mockResolvedValue({status: "ok", data: {formItems: []}});
  backendMock.getGroups.mockResolvedValue({status: "ok", data: [], data2: 0});
  backendMock.addGroup.mockResolvedValue({status: "ok"});
  backendMock.deleteGroup.mockResolvedValue({status: "ok"});
  xlsxMock.utils.json_to_sheet.mockReturnValue({sheet: true});
  xlsxMock.utils.book_new.mockReturnValue({book: true});
  xlsxMock.read.mockReturnValue({SheetNames: ["Sheet1"], Sheets: {Sheet1: {}}});
  xlsxMock.utils.sheet_to_json.mockReturnValue([{name: "group-main", owner: "engineering"}]);
  global.fetch = jestValue.fn(() => Promise.resolve({
    json: () => Promise.resolve({status: "ok"}),
  })) as unknown as typeof fetch;
});

afterEach(() => {
  jestValue.restoreAllMocks();
  jestValue.clearAllMocks();
  cleanup();
});

test("renders group rows and fetches the selected organization", async() => {
  backendMock.getGroups.mockResolvedValue({
    status: "ok",
    data: [group],
    data2: 1,
  });

  const view = renderPage();

  expect(await view.findByText("group-main")).not.toBeNull();
  expect(view.getAllByText("engineering").length).toBeGreaterThan(0);
  expect(backendMock.getGroups).toHaveBeenCalledWith("engineering", false, expect.any(Number), expect.any(Number), undefined, undefined, undefined, undefined);
  expect(formBackendMock.getForm).toHaveBeenCalled();
});

test("creates a default group and navigates to edit page", async() => {
  const history = createHistory();
  const page = new GroupListPage({
    account,
    history,
    match: {path: "/groups", params: {}},
  });

  expect(page.newGroup()).toEqual(expect.objectContaining({
    owner: "engineering",
    name: "group_abc123",
    displayName: "New Group - abc123",
    type: "Virtual",
    parentId: "built-in",
    isTopGroup: true,
    isEnabled: true,
  }));

  page.addGroup();
  await flushPromises();

  expect(backendMock.addGroup).toHaveBeenCalledWith(expect.objectContaining({
    owner: "engineering",
    name: "group_abc123",
  }));
  expect(history.push).toHaveBeenCalledWith({pathname: "/groups/engineering/group_abc123", mode: "add"});
  expect(Setting.showMessage).toHaveBeenCalledWith("success", expect.any(String));
});

test("fetches all organizations when default organization is selected", async() => {
  localStorage.setItem("organization", "All");
  const page = createPage();

  page.fetch({pagination: {...page.state.pagination, current: 3, pageSize: 50}});
  await flushPromises();

  expect(backendMock.getGroups).toHaveBeenCalledWith("", false, 3, 50, undefined, undefined, undefined, undefined);
});

test("passes search, category, type filter and sorting parameters to backend", async() => {
  const page = createPage();

  page.fetch({
    pagination: {...page.state.pagination, current: 1, pageSize: 20},
    searchedColumn: "name",
    searchText: "main",
    sortField: "name",
    sortOrder: "ascend",
  });
  await flushPromises();

  expect(backendMock.getGroups).toHaveBeenLastCalledWith("engineering", false, 1, 20, "name", "main", "name", "ascend");

  page.fetch({
    pagination: {...page.state.pagination, current: 1, pageSize: 20},
    category: "department",
    type: "Physical",
  });
  await flushPromises();

  expect(backendMock.getGroups).toHaveBeenLastCalledWith("engineering", false, 1, 20, "category", "department", undefined, undefined);

  page.fetch({
    pagination: {...page.state.pagination, current: 1, pageSize: 20},
    type: ["Virtual"],
  });
  await flushPromises();

  expect(backendMock.getGroups).toHaveBeenLastCalledWith("engineering", false, 1, 20, "type", ["Virtual"], undefined, undefined);
});

test("deletes group and rolls back pagination for the last row", async() => {
  const page = createPage();
  page.fetch = jestValue.fn() as unknown as typeof page.fetch;
  page.state = {
    ...page.state,
    data: [group],
    pagination: {...page.state.pagination, current: 2},
  };

  page.deleteGroup(0);
  await flushPromises();

  expect(backendMock.deleteGroup).toHaveBeenCalledWith(expect.objectContaining({name: "group-main"}));
  expect(page.fetch).toHaveBeenCalledWith(expect.objectContaining({
    pagination: expect.objectContaining({current: 1}),
  }));
  expect(Setting.showMessage).toHaveBeenCalledWith("success", expect.any(String));
});

test("reports add, delete and list fetch errors without changing contracts", async() => {
  const page = createPage();
  page.state = {
    ...page.state,
    data: [group],
  };
  backendMock.addGroup.mockResolvedValueOnce({status: "error", msg: "add failed"});
  backendMock.addGroup.mockRejectedValueOnce(new Error("add network"));
  backendMock.deleteGroup.mockResolvedValueOnce({status: "error", msg: "delete failed"});
  backendMock.deleteGroup.mockRejectedValueOnce(new Error("delete network"));
  backendMock.getGroups.mockRejectedValueOnce(new Error("list network"));

  page.addGroup();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("add failed"));

  page.addGroup();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("add network"));

  page.deleteGroup(0);
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete failed"));

  page.deleteGroup(0);
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete network"));

  page.fetch({pagination: {...page.state.pagination, current: 1, pageSize: 20}});
  await flushPromises();
  expect(page.state.loading).toBe(false);
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("list network"));
});

test("renders unauthorized state when group list request is denied", async() => {
  backendMock.getGroups.mockResolvedValue({
    status: "error",
    msg: "Unauthorized operation",
  });

  const view = renderPage();

  expect(await view.findByText("403 Unauthorized")).not.toBeNull();
  expect(Setting.showMessage).not.toHaveBeenCalledWith("error", "Unauthorized operation");
});

test("builds table columns, toolbar and action handlers", () => {
  const history = createHistory();
  const page = new GroupListPage({
    account,
    history,
    match: {path: "/groups", params: {}},
  });
  installSynchronousSetState(page);
  jestValue.spyOn(page, "addGroup").mockImplementation(() => {});
  jestValue.spyOn(page, "deleteGroup").mockImplementation(() => {});

  const tableWrapper = page.renderTable([group]) as React.ReactElement<{children: TestGroupTableElement}>;
  const table = tableWrapper.props.children;
  const columns = table.props.columns;
  const opColumn = columns.find(column => column.key === "op");
  const groupColumn = columns.find(column => column.key === "group");
  const usersColumn = columns.find(column => column.key === "users");

  expect(table.type).toBe(ListPageTable);
  expect(columns.map(column => column.key)).toEqual(["group", "parentId", "users", "updatedTime", "op"]);
  expect(groupColumn?.dataIndex).toBe("displayName");
  expect(usersColumn?.sorter).toBeUndefined();
  expect(opColumn?.fixed).toBeUndefined();
  expect(table.props.scroll?.x).toBeUndefined();
  expect(table.props.scroll?.y).toBe("calc(100vh - 360px)");
  expect(table.props.pagination?.pageSize).toBe(20);
  expect(table.props.className).toContain("group-list-table");

  const actionNode = opColumn?.render?.(undefined, group, 0) as React.ReactElement<{children: React.ReactNode; className?: string}>;
  expect(actionNode.props.className).toBe("group-row-actions");
  const actionChildren = React.Children.toArray(actionNode.props.children) as React.ReactElement[];
  const actionView = render(<>{actionNode}</>);
  expect(actionView.container.querySelector(".enterprise-list-row-actions")).not.toBeNull();
  fireEvent.click(actionView.getByText(/编\s*辑|Edit/));
  expect(history.push).toHaveBeenCalledWith("/groups/engineering/group-main");
  actionChildren[1].props.onConfirm();
  expect(page.deleteGroup).toHaveBeenCalledWith(0);
  expect(actionView.getByText(/删\s*除|Delete/).closest("button")?.className).toContain("group-row-action-delete");
  actionView.unmount();

  const blockedActionNode = opColumn?.render?.(undefined, {...group, haveChildren: true}, 0) as React.ReactElement;
  const blockedActionView = render(<>{blockedActionNode}</>);
  expect(blockedActionView.getByText(/删\s*除|Delete/).closest("button")?.hasAttribute("disabled")).toBe(true);
  blockedActionView.unmount();

  const toolbarView = render(<>{table.props.title()}</>);
  fireEvent.click(toolbarView.getByText(/添\s*加|Add/));
  expect(page.addGroup).toHaveBeenCalled();
});

test("list page table centralizes shared table defaults", () => {
  const sharedTable = ListPageTable<TestGroupRecord>({columns: [], dataSource: []}) as TestSharedTableElement;

  expect(sharedTable.props.className).toBe("enterprise-list-table");
  expect(sharedTable.props.size).toBe("middle");
  expect(sharedTable.props.bordered).toBe(false);
  expect(sharedTable.props.tableLayout).toBe("fixed");
  expect(sharedTable.props.showSorterTooltip).toEqual({target: "sorter-icon"});
});

test("list page table wraps title content in the shared toolbar shell", () => {
  const sharedTable = ListPageTable<TestGroupRecord>({
    columns: [],
    dataSource: [],
    title: () => <span>Shared toolbar</span>,
  }) as React.ReactElement<{title?: () => React.ReactNode}>;

  const titleNode = sharedTable.props.title?.() as React.ReactElement<{className?: string; children?: React.ReactNode}>;

  expect(titleNode.props.className).toBe("enterprise-list-toolbar-shell");
  expect(titleNode.props.children).toEqual(<span>Shared toolbar</span>);
});

test("keeps mobile group table horizontally scrollable without desktop vertical lock", () => {
  jestValue.spyOn(Setting, "isMobile").mockReturnValue(true);
  const page = createPage();
  const tableWrapper = page.renderTable([group]) as React.ReactElement<{children: TestGroupTableElement}>;
  const table = tableWrapper.props.children;

  expect(table.props.scroll?.x).toBe(760);
  expect(table.props.scroll?.y).toBeUndefined();
});

test("keeps the outer page stable when advanced filters expand", () => {
  const page = createPage();
  const collapsedTableWrapper = page.renderTable([group]) as React.ReactElement<{children: TestGroupTableElement}>;
  const collapsedTable = collapsedTableWrapper.props.children;
  const toolbarView = render(<>{collapsedTable.props.title()}</>);

  expect(collapsedTable.props.scroll?.y).toBe("calc(100vh - 360px)");
  fireEvent.click(toolbarView.getByText(/更\s*多\s*筛\s*选|More filters/));

  const expandedTableWrapper = page.renderTable([group]) as React.ReactElement<{children: TestGroupTableElement}>;
  const expandedTable = expandedTableWrapper.props.children;
  expect(expandedTable.props.scroll?.y).toBe("calc(100vh - 414px)");
  toolbarView.unmount();
});

test("uses an enterprise query toolbar instead of column header search as the primary group search entry", () => {
  const page = createPage();
  page.fetch = jestValue.fn() as unknown as typeof page.fetch;
  page.state = {
    ...page.state,
    pagination: {...page.state.pagination, total: 258},
  };
  const tableWrapper = page.renderTable([group]) as React.ReactElement<{children: TestGroupTableElement}>;
  const table = tableWrapper.props.children;
  const columns = table.props.columns as Array<TestTableColumn & {filterDropdown?: unknown}>;
  const toolbarView = render(<>{table.props.title()}</>);

  expect(toolbarView.getByText(/群\s*组|Groups/)).not.toBeNull();
  expect(toolbarView.queryByText(/258/)).toBeNull();
  expect(toolbarView.getByText(/查\s*询|Search/)).not.toBeNull();
  expect(toolbarView.getByText(/重\s*置|Reset/)).not.toBeNull();
  fireEvent.click(toolbarView.getByText(/更\s*多\s*筛\s*选|More filters/));
  expect(toolbarView.getByText(/收\s*起\s*筛\s*选|Hide filters/)).not.toBeNull();
  expect(toolbarView.container.querySelector(".enterprise-list-query-toolbar-advanced")).not.toBeNull();
  expect(document.body.querySelector(".enterprise-list-query-toolbar-popover")).toBeNull();
  expect(toolbarView.container.querySelector(".enterprise-list-advanced-filters")).not.toBeNull();
  expect(toolbarView.container.querySelectorAll(".enterprise-list-query-toolbar-advanced .organization-advanced-filter-input")).toHaveLength(3);
  const advancedFilterLabels = (Array.from(toolbarView.container.querySelectorAll(".enterprise-list-query-toolbar-advanced .organization-advanced-filter-label")) as HTMLElement[])
    .map(node => node.textContent);
  expect(advancedFilterLabels).toHaveLength(3);
  expect(advancedFilterLabels.every(label => label?.endsWith(":"))).toBe(true);
  expect(getAdvancedFilterInputByLabel(toolbarView.container, /^(Advanced filters Name|高级筛选 名称)$/)).not.toBeNull();
  expect(getAdvancedFilterInputByLabel(toolbarView.container, /^(Advanced filters Display name|高级筛选 显示名称)$/)).not.toBeNull();
  expect(getAdvancedFilterInputByLabel(toolbarView.container, /^(Advanced filters Parent group|高级筛选 上级组)$/)).not.toBeNull();
  expect(toolbarView.getByText(/添\s*加|Add/).closest(".enterprise-list-query-toolbar-actions")).not.toBeNull();
  expect(toolbarView.queryByText(/高\s*级\s*筛\s*选|Advanced filters/)).toBeNull();
  expect(columns.find(column => column.key === "group")?.dataIndex).toBe("displayName");
  expect(columns.find(column => column.key === "displayName")).toBeUndefined();
  expect(columns.find(column => column.key === "owner")).toBeUndefined();
  expect(columns.find(column => column.key === "createdTime")).toBeUndefined();
  expect(columns.find(column => column.key === "type")).toBeUndefined();
});

test("renders compact group identity and user count for table scanning", () => {
  const page = createPage();
  const longGroup = {
    ...group,
    owner: "engineering-organization-with-long-id",
    name: "group-main-with-long-readable-machine-id",
    displayName: "Main platform group with a long display name",
    users: ["alice.long.identifier", "bob.long.identifier", "charlie.long.identifier"],
  };
  const tableWrapper = page.renderTable([longGroup]) as React.ReactElement<{children: TestGroupTableElement}>;
  const columns = tableWrapper.props.children.props.columns;
  const groupColumn = columns.find(column => column.key === "group");
  const usersColumn = columns.find(column => column.key === "users");

  const nameNode = groupColumn?.render?.(undefined, longGroup, 0) as React.ReactElement;
  const nameView = render(<MemoryRouter>{nameNode}</MemoryRouter>);
  expect(nameView.getByText("Main platform group with a long display name")).not.toBeNull();
  expect(nameView.getByText("Main platform group with a long display name").className).toContain("enterprise-list-primary-text");
  expect(nameView.container.querySelector(".group-table-group-id")?.textContent).toContain("group-main-with-long-readable-machine-id");
  expect(nameView.container.querySelector(".group-table-group-id")?.className).toContain("enterprise-list-secondary-text");
  expect(nameView.container.querySelector(".group-table-copy-id")?.getAttribute("aria-label")).toMatch(/Copy|复制/);
  nameView.unmount();

  const userNode = usersColumn?.render?.(["alice.long.identifier", "bob.long.identifier", "charlie.long.identifier"], group, 0) as React.ReactElement;
  const userView = render(<>{userNode}</>);
  expect(userView.getByText(/3\s*(人|users)/)).not.toBeNull();
  expect(userView.container.querySelectorAll(".group-table-user-tag")).toHaveLength(0);
  userView.unmount();

  const emptyUserNode = usersColumn?.render?.([], group, 0) as React.ReactElement;
  const emptyUserView = render(<>{emptyUserNode}</>);
  expect(emptyUserView.getByText(/无用户|No users/)).not.toBeNull();
  emptyUserView.unmount();
});

test("query toolbar keeps the existing group fetch contract for keyword and reset", () => {
  const page = createPage();
  page.fetch = jestValue.fn() as unknown as typeof page.fetch;
  page.state = {
    ...page.state,
    pagination: {...page.state.pagination, current: 3, pageSize: 20},
    queryField: "displayName",
    queryKeyword: " Platform ",
  };

  const keywordToolbar = render(<>{page.renderListToolbar()}</>);
  fireEvent.click(keywordToolbar.getByText(/查\s*询|Search/));
  expect(page.fetch).toHaveBeenLastCalledWith({
    pagination: expect.objectContaining({current: 1, pageSize: 20}),
    searchedColumn: "displayName",
    searchText: "Platform",
  });
  fireEvent.click(keywordToolbar.getByText(/重\s*置|Reset/));
  expect(page.state.queryField).toBe("name");
  expect(page.state.queryKeyword).toBe("");
  expect(page.state.queryType).toBeUndefined();
  expect(page.state.advancedQueryKeywords).toEqual({
    name: "",
    displayName: "",
    parentId: "",
  });
  expect(page.fetch).toHaveBeenLastCalledWith({
    pagination: expect.objectContaining({current: 1, pageSize: 20}),
  });
  keywordToolbar.unmount();
});

test("applies group advanced filters with organization-style AND semantics", async() => {
  const page = createPage();
  const matchingGroup = {
    ...group,
    name: "group-main",
    displayName: "Platform Engineering",
    users: ["alice.long.identifier", "bob.long.identifier"],
  };
  backendMock.getGroups.mockResolvedValueOnce({
    status: "ok",
    data: [
      matchingGroup,
      {
        ...group,
        name: "group-main-cn",
        displayName: "Engineering China",
        users: ["alice.long.identifier"],
      },
      {
        ...group,
        name: "group-marketing",
        displayName: "Platform Marketing",
        users: ["marketing.user"],
      },
    ],
    data2: 3,
  });
  page.state = {
    ...page.state,
    pagination: {...page.state.pagination, current: 2, pageSize: 20, total: 3},
  };

  const toolbarView = render(<>{page.renderListToolbar()}</>);
  fireEvent.click(toolbarView.getByText(/更\s*多\s*筛\s*选|More filters/));
  fireEvent.change(getAdvancedFilterInputByLabel(toolbarView.container, /^(Advanced filters Name|高级筛选 名称)$/), {target: {value: "group-main"}});
  fireEvent.change(getAdvancedFilterInputByLabel(toolbarView.container, /^(Advanced filters Display name|高级筛选 显示名称)$/), {target: {value: "platform"}});
  fireEvent.click(toolbarView.getByText(/查\s*询|Search/));
  await flushPromises();

  expect(backendMock.getGroups).toHaveBeenLastCalledWith("engineering", false, "", "", undefined, undefined, undefined, undefined);
  expect(page.state.data).toEqual([matchingGroup]);
  expect(page.state.pagination).toEqual(expect.objectContaining({
    current: 1,
    total: 1,
  }));
  expect(page.state.searchText).toBeUndefined();
  expect(page.state.searchedColumn).toBeUndefined();
});

test("generates group import template with existing columns", () => {
  const page = createPage();

  page.generateDownloadTemplate();

  expect(xlsxMock.utils.json_to_sheet).toHaveBeenCalledWith([{"Name#name": null, "Owner#owner": null}]);
  expect(xlsxMock.utils.book_append_sheet).toHaveBeenCalledWith({book: true}, {sheet: true}, "Sheet1");
  expect(xlsxMock.writeFile).toHaveBeenCalledWith({book: true}, "import-group.xlsx", {compression: true});
});

test("previews xlsx upload and uploads selected file", async() => {
  const page = createPage();
  page.fetch = jestValue.fn() as unknown as typeof page.fetch;
  const file = new File(["content"], "groups.xlsx");
  const {upload} = getUploadAndModal(page);

  const beforeUploadResult = upload.props.beforeUpload(file);
  MockFileReader.instances[0].onload?.({target: {result: new ArrayBuffer(8)}});

  expect(beforeUploadResult).toBe(false);
  expect(xlsxMock.read).toHaveBeenCalledWith(expect.any(ArrayBuffer), {type: "array"});
  expect(page.state.uploadJsonData).toEqual([{name: "group-main", owner: "engineering"}]);
  expect(page.state.uploadColumns).toEqual([
    {title: "Name", dataIndex: "Name#name", key: "Name#name"},
    {title: "Owner", dataIndex: "Owner#owner", key: "Owner#owner"},
  ]);
  expect(page.state.showUploadModal).toBe(true);

  const {modal} = getUploadAndModal(page);
  modal.props.onOk();
  await flushPromises();

  expect(global.fetch).toHaveBeenCalledWith("/api/upload-groups", expect.objectContaining({
    method: "post",
    credentials: "include",
    headers: {"Accept-Language": expect.any(String)},
  }));
  expect(page.fetch).toHaveBeenCalledWith({pagination: page.state.pagination});
  expect(page.state.showUploadModal).toBe(false);
});

test("reports upload preview and upload result errors", async() => {
  const page = createPage();
  const file = new File(["content"], "groups.xlsx");
  const {upload} = getUploadAndModal(page);

  xlsxMock.read.mockReturnValueOnce({SheetNames: [], Sheets: {}});
  upload.props.beforeUpload(file);
  MockFileReader.instances[0].onload?.({target: {result: new ArrayBuffer(8)}});
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringMatching(/No sheets|未找到/));

  upload.props.beforeUpload(file);
  MockFileReader.instances[1].onerror?.({message: "read failed"});
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("read failed"));

  page.uploadFile({status: "error", msg: "server rejected"});
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("server rejected"));
  expect(page.state.uploadJsonData).toEqual([]);
  expect(page.state.showUploadModal).toBe(false);
});
