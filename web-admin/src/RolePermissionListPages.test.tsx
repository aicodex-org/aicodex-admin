/* eslint-env jest */
import React from "react";
import {expect as jestExpect, jest as jestValue} from "@jest/globals";
import {cleanup, render} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import * as Setting from "./Setting";
import * as Conf from "./Conf";
import * as FormBackend from "./backend/FormBackend";
import * as RoleBackend from "./backend/RoleBackend";
import * as PermissionBackend from "./backend/PermissionBackend";
import RoleListPage from "./RoleListPage";
import PermissionListPage from "./PermissionListPage";
import ListPageTable from "./common/ListPageTable";
import * as XLSX from "xlsx";

declare const jest: typeof jestValue;

type LooseMock = {
  (...args: unknown[]): unknown;
  mockImplementation: (implementation: (...args: unknown[]) => unknown) => LooseMock;
  mockImplementationOnce: (implementation: (...args: unknown[]) => unknown) => LooseMock;
  mockReturnValue: (value: unknown) => LooseMock;
  mockReturnValueOnce: (value: unknown) => LooseMock;
  mockResolvedValue: (value: unknown) => LooseMock;
  mockResolvedValueOnce: (value: unknown) => LooseMock;
  mockRejectedValueOnce: (value: unknown) => LooseMock;
};

type RoleBackendMock = Record<keyof typeof RoleBackend, LooseMock>;
type PermissionBackendMock = Record<keyof typeof PermissionBackend, LooseMock>;
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

type Account = {
  owner: string;
  name: string;
  tag: string;
  isAdmin: boolean;
};

type TestRoleRecord = {
  owner: string;
  name: string;
  createdTime: string;
  displayName: string;
  users: string[];
  groups: string[];
  roles: string[];
  domains: string[];
  isEnabled: boolean;
};

type TestPermissionRecord = TestRoleRecord & {
  model: string;
  resourceType: string;
  resources: string[];
  actions: string[];
  effect: "Allow" | "Deny";
  submitter: string;
  approver: string;
  approveTime: string;
  state: "Approved" | "Pending";
};

type TestPagination = {
  current: number;
  pageSize: number;
  total?: number;
};

type TestTableColumn<TRecord> = {
  key?: string;
  fixed?: unknown;
  render?: (text: unknown, record: TRecord, index: number) => React.ReactNode;
};

type TestListPageTableElement<TRecord> = React.ReactElement<{
  columns: TestTableColumn<TRecord>[];
  title: () => React.ReactNode;
  rowKey: (record: TRecord) => string;
}>;

type RolePageHarness = InstanceType<typeof RoleListPage> & {
  state: InstanceType<typeof RoleListPage>["state"] & {
    data: TestRoleRecord[];
    pagination: TestPagination;
    uploadJsonData: unknown[];
    uploadColumns: unknown[];
    showUploadModal: boolean;
    file?: File;
  };
  fetch: (params: {pagination: TestPagination; [key: string]: unknown}) => void;
};

type PermissionPageHarness = InstanceType<typeof PermissionListPage> & {
  state: InstanceType<typeof PermissionListPage>["state"] & {
    data: TestPermissionRecord[];
    pagination: TestPagination;
    uploadJsonData: unknown[];
    uploadColumns: unknown[];
    showUploadModal: boolean;
    file?: File;
  };
  fetch: (params: {pagination: TestPagination; [key: string]: unknown}) => void;
};

const expect = jestExpect;
const roleBackendMock = RoleBackend as unknown as RoleBackendMock;
const permissionBackendMock = PermissionBackend as unknown as PermissionBackendMock;
const formBackendMock = FormBackend as unknown as FormBackendMock;
const xlsxMock = XLSX as unknown as XlsxMock;
const {fireEvent} = require("@testing-library/react") as {
  fireEvent: {
    click: (element: Element | null) => boolean;
  };
};

jest.mock("./backend/RoleBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    getRoles: factoryJest.fn(),
    getRole: factoryJest.fn(),
    updateRole: factoryJest.fn(),
    addRole: factoryJest.fn(),
    deleteRole: factoryJest.fn(),
  };
});

jest.mock("./backend/PermissionBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    getPermissions: factoryJest.fn(),
    getPermissionsBySubmitter: factoryJest.fn(),
    getPermission: factoryJest.fn(),
    updatePermission: factoryJest.fn(),
    addPermission: factoryJest.fn(),
    deletePermission: factoryJest.fn(),
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

const account: Account = {owner: "built-in", name: "admin", tag: "", isAdmin: true};
const role: TestRoleRecord = {
  owner: "engineering",
  name: "role-main",
  createdTime: "2026-06-20T09:00:00Z",
  displayName: "Main Role",
  users: ["alice"],
  groups: ["ops"],
  roles: [],
  domains: ["domain-a"],
  isEnabled: true,
};
const permission: TestPermissionRecord = {
  owner: "engineering",
  name: "permission-main",
  createdTime: "2026-06-20T09:10:00Z",
  displayName: "Main Permission",
  users: ["built-in/admin"],
  groups: ["ops"],
  roles: ["role-main"],
  domains: ["domain-a"],
  model: "engineering/rbac",
  resourceType: "Application",
  resources: [Conf.DefaultApplication],
  actions: ["Read", "Write", "Admin", "Custom"],
  effect: "Allow",
  isEnabled: true,
  submitter: "admin",
  approver: "owner",
  approveTime: "2026-06-20T09:20:00Z",
  state: "Approved",
};

class MockFileReader {
  static instances: MockFileReader[] = [];

  onload: ((event: {target?: {result?: ArrayBuffer}}) => void) | null = null;
  onerror: ((event: {message?: string}) => void) | null = null;

  constructor() {
    MockFileReader.instances.push(this);
  }

  readAsArrayBuffer = jestValue.fn();
}

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

function createRolePage(accountOverride: Account = account) {
  const page = new RoleListPage({
    account: accountOverride,
    history: createHistory(),
    match: {path: "/roles", params: {}},
  } as ConstructorParameters<typeof RoleListPage>[0]) as RolePageHarness;
  installSynchronousSetState(page);
  return page;
}

function createPermissionPage(accountOverride: Account = account) {
  const page = new PermissionListPage({
    account: accountOverride,
    history: createHistory(),
    match: {path: "/permissions", params: {}},
  } as ConstructorParameters<typeof PermissionListPage>[0]) as PermissionPageHarness;
  installSynchronousSetState(page);
  return page;
}

function getRoleUploadAndModal(page: RolePageHarness) {
  const uploadFragment = page.renderRoleUpload() as React.ReactElement<{children: React.ReactNode}>;
  const children = React.Children.toArray(uploadFragment.props.children) as React.ReactElement[];
  return {
    upload: children[0],
    modal: children[1],
  };
}

function getPermissionUploadAndModal(page: PermissionPageHarness) {
  const uploadFragment = page.renderPermissionUpload() as React.ReactElement<{children: React.ReactNode}>;
  const children = React.Children.toArray(uploadFragment.props.children) as React.ReactElement[];
  return {
    upload: children[0],
    modal: children[1],
  };
}

function findElementByType(node: React.ReactNode, type: React.ElementType): React.ReactElement | null {
  if (!React.isValidElement(node)) {
    return null;
  }
  if (node.type === type) {
    return node;
  }

  const props = node.props as {children?: React.ReactNode};
  let match: React.ReactElement | null = null;
  React.Children.forEach(props.children, child => {
    if (match === null) {
      match = findElementByType(child, type);
    }
  });
  return match;
}

function getRoleTable(page: RolePageHarness, rows: TestRoleRecord[] = [role]) {
  const tree = page.renderTable(rows);
  const table = findElementByType(tree, ListPageTable) as TestListPageTableElement<TestRoleRecord> | null;
  if (!table) {
    throw new Error("Expected role list to render shared ListPageTable");
  }
  return {tree, table};
}

function getPermissionTable(page: PermissionPageHarness, rows: TestPermissionRecord[] = [permission]) {
  const tree = page.renderTable(rows);
  const table = findElementByType(tree, ListPageTable) as TestListPageTableElement<TestPermissionRecord> | null;
  if (!table) {
    throw new Error("Expected permission list to render shared ListPageTable");
  }
  return {tree, table};
}

function getRoleColumns(page: RolePageHarness) {
  return getRoleTable(page).table.props.columns;
}

function getPermissionColumns(page: PermissionPageHarness) {
  return getPermissionTable(page).table.props.columns;
}

function renderWithRouter(node: React.ReactNode) {
  return render(<MemoryRouter>{node}</MemoryRouter>);
}

function textFromNode(node: React.ReactNode): string {
  if (Array.isArray(node)) {
    return node.map(textFromNode).join("");
  }
  if (React.isValidElement(node)) {
    return textFromNode(node.props.children);
  }
  if (node === null || node === undefined || typeof node === "boolean") {
    return "";
  }
  return String(node);
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
  jestValue.spyOn(Setting, "isMobile").mockReturnValue(false);
  jestValue.spyOn(Setting, "getRoleColumns").mockReturnValue(["Name#name", "Owner#owner"]);
  jestValue.spyOn(Setting, "getPermissionColumns").mockReturnValue(["Name#name", "Effect#effect"]);
  formBackendMock.getForm.mockResolvedValue({status: "ok", data: {formItems: []}});
  roleBackendMock.getRoles.mockResolvedValue({status: "ok", data: [role], data2: 1});
  roleBackendMock.addRole.mockResolvedValue({status: "ok"});
  roleBackendMock.deleteRole.mockResolvedValue({status: "ok"});
  permissionBackendMock.getPermissions.mockResolvedValue({status: "ok", data: [permission], data2: 1});
  permissionBackendMock.getPermissionsBySubmitter.mockResolvedValue({status: "ok", data: [permission], data2: 1});
  permissionBackendMock.addPermission.mockResolvedValue({status: "ok"});
  permissionBackendMock.deletePermission.mockResolvedValue({status: "ok"});
  xlsxMock.utils.json_to_sheet.mockReturnValue({sheet: true});
  xlsxMock.utils.book_new.mockReturnValue({book: true});
  xlsxMock.read.mockReturnValue({SheetNames: ["Sheet1"], Sheets: {Sheet1: {}}});
  xlsxMock.utils.sheet_to_json.mockReturnValue([{name: "row-main", owner: "engineering"}]);
  global.fetch = jestValue.fn(() => Promise.resolve({
    json: () => Promise.resolve({status: "ok"}),
  })) as unknown as typeof fetch;
});

afterEach(() => {
  jestValue.restoreAllMocks();
  jestValue.clearAllMocks();
  cleanup();
});

test("migrates role and permission list page modules to TSX files", () => {
  expect(() => require.resolve("./RoleListPage.tsx")).not.toThrow();
  expect(() => require.resolve("./PermissionListPage.tsx")).not.toThrow();
  expect(() => require.resolve("./RoleListPage.js")).toThrow();
  expect(() => require.resolve("./PermissionListPage.js")).toThrow();
});

test("creates default role and permission records and navigates to add routes", async() => {
  const roleHistory = createHistory();
  const rolePage = new RoleListPage({
    account,
    history: roleHistory,
    match: {path: "/roles", params: {}},
  } as ConstructorParameters<typeof RoleListPage>[0]);
  const permissionHistory = createHistory();
  const permissionPage = new PermissionListPage({
    account,
    history: permissionHistory,
    match: {path: "/permissions", params: {}},
  } as ConstructorParameters<typeof PermissionListPage>[0]);

  expect(rolePage.newRole()).toEqual(expect.objectContaining({
    owner: "engineering",
    name: "role_abc123",
    displayName: "New Role - abc123",
    users: [],
    isEnabled: true,
  }));
  expect(permissionPage.newPermission()).toEqual(expect.objectContaining({
    owner: "engineering",
    name: "permission_abc123",
    displayName: "New Permission - abc123",
    users: ["built-in/admin"],
    resourceType: "Application",
    resources: [Conf.DefaultApplication],
    actions: ["Read"],
    state: "Approved",
  }));

  rolePage.addRole();
  permissionPage.addPermission();
  await flushPromises();

  expect(roleBackendMock.addRole).toHaveBeenCalledWith(expect.objectContaining({name: "role_abc123"}));
  expect(roleHistory.push).toHaveBeenCalledWith({pathname: "/roles/engineering/role_abc123", mode: "add"});
  expect(permissionBackendMock.addPermission).toHaveBeenCalledWith(expect.objectContaining({name: "permission_abc123"}));
  expect(permissionHistory.push).toHaveBeenCalledWith({pathname: "/permissions/engineering/permission_abc123", mode: "add"});
});

test("keeps role table columns, links, toolbar and delete refresh behavior", async() => {
  const history = createHistory();
  const page = new RoleListPage({
    account,
    history,
    match: {path: "/roles", params: {}},
  } as ConstructorParameters<typeof RoleListPage>[0]) as RolePageHarness;
  installSynchronousSetState(page);
  jestValue.spyOn(page, "addRole").mockImplementation(() => undefined);
  page.fetch = jestValue.fn() as unknown as RolePageHarness["fetch"];
  page.state = {
    ...page.state,
    data: [role],
    pagination: {...page.state.pagination, current: 2},
  };

  const {tree: tableWrapper, table} = getRoleTable(page, [role]);
  const columns = table.props.columns;

  const tableView = render(<MemoryRouter>{tableWrapper}</MemoryRouter>);
  expect(tableView.container.querySelector(".enterprise-list-page-table-shell.role-list-page-table-shell")).not.toBeNull();
  expect(tableView.container.querySelector(".ant-table")).not.toBeNull();
  tableView.unmount();

  expect(columns[0].key).toBe("name");
  expect(columns[9].fixed).toBe("right");
  expect(table.props.rowKey(role)).toBe("engineering/role-main");

  const nameView = render(<MemoryRouter>{columns[0].render?.(role.name, role, 0)}</MemoryRouter>);
  expect(nameView.getByText("role-main").closest("a")?.getAttribute("href")).toBe("/roles/engineering/role-main");
  nameView.unmount();

  const actionNode = columns[9].render?.(undefined, role, 0) as React.ReactElement<{children: React.ReactNode}>;
  const actionChildren = React.Children.toArray(actionNode.props.children) as React.ReactElement[];
  const actionView = render(<>{actionNode}</>);
  fireEvent.click(actionView.getByText(/编\s*辑|Edit/));
  expect(history.push).toHaveBeenCalledWith("/roles/engineering/role-main");
  actionChildren[1].props.onConfirm();
  await flushPromises();
  expect(roleBackendMock.deleteRole).toHaveBeenCalledWith(role);
  expect(page.fetch).toHaveBeenCalledWith(expect.objectContaining({
    pagination: expect.objectContaining({current: 1}),
  }));

  const toolbarView = render(<>{table.props.title()}</>);
  expect(toolbarView.container.querySelector(".enterprise-list-query-toolbar")).not.toBeNull();
  expect(toolbarView.container.querySelector(".enterprise-list-query-toolbar-title")?.textContent).toMatch(/角色|Roles/);
  expect(toolbarView.getByText(/添\s*加|Add/).closest(".enterprise-list-query-toolbar-actions")).not.toBeNull();
  expect(toolbarView.container.querySelector(".enterprise-list-query-toolbar-header-meta")?.className).toContain("enterprise-list-query-toolbar-header-meta-top-right");
  fireEvent.click(toolbarView.getByText(/添\s*加|Add/));
  expect(page.addRole).toHaveBeenCalled();
});

test("keeps permission table columns, links, tags and delete refresh behavior", async() => {
  const history = createHistory();
  const page = new PermissionListPage({
    account,
    history,
    match: {path: "/permissions", params: {}},
  } as ConstructorParameters<typeof PermissionListPage>[0]) as PermissionPageHarness;
  installSynchronousSetState(page);
  jestValue.spyOn(page, "addPermission").mockImplementation(() => undefined);
  page.fetch = jestValue.fn() as unknown as PermissionPageHarness["fetch"];
  page.state = {
    ...page.state,
    data: [permission],
    pagination: {...page.state.pagination, current: 2},
  };

  const {tree: tableWrapper, table} = getPermissionTable(page, [permission]);
  const columns = table.props.columns;

  const tableView = render(<MemoryRouter>{tableWrapper}</MemoryRouter>);
  expect(tableView.container.querySelector(".enterprise-list-page-table-shell.permission-list-page-table-shell")).not.toBeNull();
  expect(tableView.container.querySelector(".ant-table")).not.toBeNull();
  tableView.unmount();

  expect(columns[0].key).toBe("name");
  const actionColumn = columns.find(column => column.key === "op");
  expect(actionColumn?.fixed).toBe("right");

  const nameView = render(<MemoryRouter>{columns[0].render?.(permission.name, permission, 0)}</MemoryRouter>);
  expect(nameView.getByText("permission-main").closest("a")?.getAttribute("href")).toBe("/permissions/engineering/permission-main");
  nameView.unmount();

  const effectColumn = columns.find(column => column.key === "effect");
  const effectView = render(<>{effectColumn?.render?.("Allow", permission, 0)}</>);
  expect(effectView.getByText(/Allow|允许/)).not.toBeNull();
  effectView.unmount();

  const stateColumn = columns.find(column => column.key === "state");
  const stateView = render(<>{stateColumn?.render?.("Approved", permission, 0)}</>);
  expect(stateView.getByText(/Approved|已批准|审批通过/)).not.toBeNull();
  stateView.unmount();

  const actionNode = actionColumn?.render?.(undefined, permission, 0) as React.ReactElement<{children: React.ReactNode}>;
  const actionChildren = React.Children.toArray(actionNode.props.children) as React.ReactElement[];
  const actionView = render(<>{actionNode}</>);
  fireEvent.click(actionView.getByText(/编\s*辑|Edit/));
  expect(history.push).toHaveBeenCalledWith("/permissions/engineering/permission-main");
  actionChildren[1].props.onConfirm();
  await flushPromises();
  expect(permissionBackendMock.deletePermission).toHaveBeenCalledWith(permission);
  expect(page.fetch).toHaveBeenCalledWith(expect.objectContaining({
    pagination: expect.objectContaining({current: 1}),
  }));

  const toolbarView = render(<>{table.props.title()}</>);
  expect(toolbarView.container.querySelector(".enterprise-list-query-toolbar")).not.toBeNull();
  expect(toolbarView.container.querySelector(".enterprise-list-query-toolbar-title")?.textContent).toMatch(/权限|Permissions/);
  expect(toolbarView.getByText(/添\s*加|Add/).closest(".enterprise-list-query-toolbar-actions")).not.toBeNull();
  expect(toolbarView.container.querySelector(".enterprise-list-query-toolbar-header-meta")?.className).toContain("enterprise-list-query-toolbar-header-meta-top-right");
  fireEvent.click(toolbarView.getByText(/添\s*加|Add/));
  expect(page.addPermission).toHaveBeenCalled();
});

test("keeps remaining role column renderers and mobile fixed behavior", () => {
  jestValue.spyOn(Setting, "isMobile").mockReturnValue(true);
  const page = createRolePage();
  const columns = getRoleColumns(page);

  expect(columns[9].fixed).toBe(false);
  expect(renderWithRouter(columns[1].render?.(role.owner, role, 0)).getByText("engineering").closest("a")?.getAttribute("href")).toBe("/organizations/engineering");
  expect(columns[2].render?.(role.createdTime, role, 0)).not.toBeNull();
  expect(textFromNode(columns[4].render?.(role.users, role, 0))).toContain("alice");
  expect(textFromNode(columns[5].render?.(role.groups, role, 0))).toContain("ops");
  expect(textFromNode(columns[6].render?.(["nested"], role, 0))).toContain("nested");
  expect(textFromNode(columns[7].render?.(role.domains, role, 0))).toContain("domain-a");
  expect(render(<>{columns[8].render?.(true, role, 0)}</>).container.textContent).toMatch(/ON|开/);
});

test("keeps remaining permission column renderers and mobile fixed behavior", () => {
  jestValue.spyOn(Setting, "isMobile").mockReturnValue(true);
  const page = createPermissionPage();
  const columns = getPermissionColumns(page);

  expect(columns.find(column => column.key === "op")?.fixed).toBe(false);
  expect(renderWithRouter(columns[1].render?.(permission.owner, permission, 0)).getByText("engineering").closest("a")?.getAttribute("href")).toBe("/organizations/engineering");
  expect(renderWithRouter(columns.find(column => column.key === "model")?.render?.(permission.model, permission, 0)).getByText("engineering/rbac").closest("a")?.getAttribute("href")).toBe("/models/engineering/rbac");
  expect(textFromNode(columns.find(column => column.key === "resources")?.render?.(permission.resources, permission, 0))).toContain(Conf.DefaultApplication);
  const actionsText = textFromNode(columns.find(column => column.key === "actions")?.render?.(permission.actions, permission, 0));
  expect(actionsText).toMatch(/Read|读取|读权限/);
  expect(actionsText).toMatch(/Write|写入|写权限/);
  expect(actionsText).toMatch(/Admin|管理员|管理工具/);
  expect(actionsText).toContain("Custom");
  const effectColumn = columns.find(column => column.key === "effect");
  expect(render(<>{effectColumn?.render?.("Deny", permission, 0)}</>).container.textContent).toMatch(/Deny|拒绝/);
  expect(effectColumn?.render?.("Unknown", permission, 0)).toBeNull();
  const stateColumn = columns.find(column => column.key === "state");
  expect(render(<>{stateColumn?.render?.("Pending", permission, 0)}</>).container.textContent).toMatch(/Pending|待审批/);
  expect(stateColumn?.render?.("Unknown", permission, 0)).toBeNull();
});

test("keeps role and permission fetch parameters and authorization fallback", async() => {
  localStorage.setItem("organization", "All");
  const rolePage = createRolePage();
  const permissionPage = createPermissionPage();

  rolePage.fetch({
    pagination: {...rolePage.state.pagination, current: 3, pageSize: 50},
    searchedColumn: "name",
    searchText: "main",
    sortField: "name",
    sortOrder: "ascend",
  });
  permissionPage.fetch({
    pagination: {...permissionPage.state.pagination, current: 4, pageSize: 25},
    type: "Application",
    sortField: "createdTime",
    sortOrder: "descend",
  });
  await flushPromises();

  expect(roleBackendMock.getRoles).toHaveBeenCalledWith("", 3, 50, "name", "main", "name", "ascend");
  expect(permissionBackendMock.getPermissions).toHaveBeenCalledWith("", 4, 25, "type", "Application", "createdTime", "descend");

  roleBackendMock.getRoles.mockResolvedValueOnce({status: "error", msg: "Unauthorized operation"});
  permissionBackendMock.getPermissions.mockResolvedValueOnce({status: "error", msg: "Unauthorized operation"});
  rolePage.fetch({pagination: {...rolePage.state.pagination, current: 1, pageSize: 20}});
  permissionPage.fetch({pagination: {...permissionPage.state.pagination, current: 1, pageSize: 20}});
  await flushPromises();

  expect(rolePage.state.isAuthorized).toBe(false);
  expect(permissionPage.state.isAuthorized).toBe(false);
});

test("keeps permission submitter fetch branch for non-local-admin users", async() => {
  jestValue.spyOn(Setting, "isLocalAdminUser").mockReturnValue(false);
  const page = createPermissionPage({...account, isAdmin: false});

  page.fetch({pagination: {...page.state.pagination, current: 1, pageSize: 20}});
  await flushPromises();

  expect(permissionBackendMock.getPermissionsBySubmitter).toHaveBeenCalledWith("engineering", 1, 20, undefined, undefined, undefined, undefined);
  expect(permissionBackendMock.getPermissions).not.toHaveBeenCalled();
});

test("keeps role error, fallback and upload failure branches", async() => {
  const page = createRolePage();
  const file = new File(["content"], "roles.xlsx");
  const {upload, modal} = getRoleUploadAndModal(page);

  roleBackendMock.addRole.mockResolvedValueOnce({status: "error", msg: "duplicate"});
  page.addRole();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("duplicate"));

  roleBackendMock.addRole.mockRejectedValueOnce(new Error("network down"));
  page.addRole();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("network down"));

  page.state = {
    ...page.state,
    data: [role],
    pagination: {...page.state.pagination, current: 1},
    file,
  };
  roleBackendMock.deleteRole.mockResolvedValueOnce({status: "error", msg: "in use"});
  page.deleteRole(0);
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("in use"));

  page.uploadRoleFile({status: "error", msg: "server rejected"});
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("server rejected"));

  page.state = {
    ...page.state,
    showUploadModal: true,
    uploadJsonData: [{name: "row-main"}],
    uploadColumns: [{key: "name"}],
  };
  modal.props.onCancel();
  expect(page.state.showUploadModal).toBe(false);
  expect(page.state.uploadJsonData).toEqual([]);
  expect(page.state.uploadColumns).toEqual([]);

  xlsxMock.read.mockReturnValueOnce({SheetNames: [], Sheets: {}});
  upload.props.beforeUpload(file);
  MockFileReader.instances[MockFileReader.instances.length - 1].onload?.({target: {result: new ArrayBuffer(8)}});
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringMatching(/No sheets|未找到/));

  xlsxMock.read.mockImplementationOnce(() => {
    throw new Error("parse failed");
  });
  upload.props.beforeUpload(file);
  MockFileReader.instances[MockFileReader.instances.length - 1].onload?.({target: {result: new ArrayBuffer(8)}});
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("parse failed"));

  upload.props.beforeUpload(file);
  MockFileReader.instances[MockFileReader.instances.length - 1].onerror?.({message: "read failed"});
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("read failed"));

  global.fetch = jestValue.fn(() => Promise.reject(new Error("upload failed"))) as unknown as typeof fetch;
  modal.props.onOk();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("upload failed"));

  global.fetch = jestValue.fn(() => Promise.reject("plain upload failed")) as unknown as typeof fetch;
  modal.props.onOk();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("plain upload failed"));

  roleBackendMock.getRoles.mockResolvedValueOnce({status: "error", msg: "plain failure"});
  page.fetch({pagination: {...page.state.pagination, current: 1, pageSize: 20}});
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "plain failure");

  roleBackendMock.getRoles.mockResolvedValueOnce({status: "ok", data: undefined, data2: "3"});
  page.fetch({pagination: {...page.state.pagination, current: 1, pageSize: 20}, type: "Virtual"});
  await flushPromises();
  expect(roleBackendMock.getRoles).toHaveBeenLastCalledWith("engineering", 1, 20, "type", "Virtual", undefined, undefined);
  expect(page.state.data).toEqual([]);
  expect(page.state.pagination.total).toBe(3);
});

test("keeps permission error, fallback and upload failure branches", async() => {
  const page = createPermissionPage();
  const file = new File(["content"], "permissions.xlsx");
  const {modal} = getPermissionUploadAndModal(page);

  expect(createPermissionPage({owner: "engineering", name: "bob", tag: "", isAdmin: false}).newPermission().state).toBe("Pending");

  permissionBackendMock.addPermission.mockResolvedValueOnce({status: "error", msg: "duplicate"});
  page.addPermission();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("duplicate"));

  permissionBackendMock.addPermission.mockRejectedValueOnce(new Error("network down"));
  page.addPermission();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("network down"));

  page.state = {
    ...page.state,
    data: [permission],
    pagination: {...page.state.pagination, current: 1},
    file,
  };
  permissionBackendMock.deletePermission.mockResolvedValueOnce({status: "error", msg: "in use"});
  page.deletePermission(0);
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("in use"));

  permissionBackendMock.deletePermission.mockRejectedValueOnce(new Error("delete failed"));
  page.deletePermission(0);
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete failed"));

  page.fetch = jestValue.fn() as unknown as PermissionPageHarness["fetch"];
  page.uploadPermissionFile({status: "ok"});
  expect(page.fetch).toHaveBeenCalledWith({pagination: page.state.pagination});

  global.fetch = jestValue.fn(() => Promise.reject(new Error("upload failed"))) as unknown as typeof fetch;
  modal.props.onOk();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("upload failed"));

  const fetchPage = createPermissionPage();
  permissionBackendMock.getPermissions.mockResolvedValueOnce({status: "error", msg: "plain failure"});
  fetchPage.fetch({pagination: {...fetchPage.state.pagination, current: 1, pageSize: 20}});
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "plain failure");

  permissionBackendMock.getPermissions.mockResolvedValueOnce({status: "ok", data: undefined, data2: "4"});
  fetchPage.fetch({pagination: {...fetchPage.state.pagination, current: 1, pageSize: 20}, type: "Application"});
  await flushPromises();
  expect(permissionBackendMock.getPermissions).toHaveBeenLastCalledWith("engineering", 1, 20, "type", "Application", undefined, undefined);
  expect(fetchPage.state.data).toEqual([]);
  expect(fetchPage.state.pagination.total).toBe(4);
});

test("generates role and permission import templates with existing columns", () => {
  const rolePage = createRolePage();
  const permissionPage = createPermissionPage();

  rolePage.generateDownloadTemplate();
  permissionPage.generateDownloadTemplate();

  expect(xlsxMock.utils.json_to_sheet).toHaveBeenCalledWith([{"Name#name": null, "Owner#owner": null}]);
  expect(xlsxMock.writeFile).toHaveBeenCalledWith({book: true}, "import-role.xlsx", {compression: true});
  expect(xlsxMock.utils.json_to_sheet).toHaveBeenCalledWith([{"Name#name": null, "Effect#effect": null}]);
  expect(xlsxMock.writeFile).toHaveBeenCalledWith({book: true}, "import-permission.xlsx", {compression: true});
});

test("previews and uploads role xlsx data", async() => {
  const page = createRolePage();
  page.fetch = jestValue.fn() as unknown as RolePageHarness["fetch"];
  const file = new File(["content"], "roles.xlsx");
  const {upload} = getRoleUploadAndModal(page);

  const beforeUploadResult = upload.props.beforeUpload(file);
  MockFileReader.instances[0].onload?.({target: {result: new ArrayBuffer(8)}});

  expect(beforeUploadResult).toBe(false);
  expect(xlsxMock.read).toHaveBeenCalledWith(expect.any(ArrayBuffer), {type: "array"});
  expect(page.state.uploadJsonData).toEqual([{name: "row-main", owner: "engineering"}]);
  expect(page.state.uploadColumns).toEqual([
    {title: "Name", dataIndex: "Name#name", key: "Name#name"},
    {title: "Owner", dataIndex: "Owner#owner", key: "Owner#owner"},
  ]);
  expect(page.state.showUploadModal).toBe(true);

  const {modal} = getRoleUploadAndModal(page);
  modal.props.onOk();
  await flushPromises();

  expect(global.fetch).toHaveBeenCalledWith("/api/upload-roles", expect.objectContaining({
    method: "post",
    credentials: "include",
    headers: {"Accept-Language": expect.any(String)},
  }));
  expect(page.fetch).toHaveBeenCalledWith({pagination: page.state.pagination});
  expect(page.state.showUploadModal).toBe(false);
});

test("previews permission xlsx data and reports upload errors", async() => {
  const page = createPermissionPage();
  const file = new File(["content"], "permissions.xlsx");
  const {upload} = getPermissionUploadAndModal(page);

  upload.props.beforeUpload(file);
  MockFileReader.instances[0].onload?.({target: {result: new ArrayBuffer(8)}});

  expect(page.state.uploadJsonData).toEqual([{name: "row-main", owner: "engineering"}]);
  expect(page.state.uploadColumns).toEqual([
    {title: "Name", dataIndex: "Name#name", key: "Name#name"},
    {title: "Effect", dataIndex: "Effect#effect", key: "Effect#effect"},
  ]);

  xlsxMock.read.mockReturnValueOnce({SheetNames: [], Sheets: {}});
  upload.props.beforeUpload(file);
  MockFileReader.instances[1].onload?.({target: {result: new ArrayBuffer(8)}});
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringMatching(/No sheets|未找到/));

  upload.props.beforeUpload(file);
  MockFileReader.instances[2].onerror?.({message: "read failed"});
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("read failed"));

  page.uploadPermissionFile({status: "error", msg: "server rejected"});
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("server rejected"));
  expect(page.state.uploadJsonData).toEqual([]);
  expect(page.state.showUploadModal).toBe(false);
});
