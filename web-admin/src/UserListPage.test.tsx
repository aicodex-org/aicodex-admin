/* eslint-env jest */
import React from "react";
import {expect as jestExpect, jest as jestValue} from "@jest/globals";
import {cleanup, render} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import * as Setting from "./Setting";
import * as FormBackend from "./backend/FormBackend";
import * as OrganizationBackend from "./backend/OrganizationBackend";
import * as UserBackend from "./backend/UserBackend";
import ListPageTable from "./common/ListPageTable";
import UserListPage from "./UserListPage";
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

type UserBackendMock = Record<keyof typeof UserBackend, LooseMock>;
type OrganizationBackendMock = Record<keyof typeof OrganizationBackend, LooseMock>;
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
type TestUserRecord = {
  owner: string;
  name: string;
  [key: string]: unknown;
};
type TestTableColumn = {
  dataIndex?: string;
  key?: string;
  fixed?: unknown;
  title?: React.ReactNode;
  width?: string | number;
  render?: (text: unknown, record: TestUserRecord, index: number) => React.ReactNode;
};
type TestUserTableElement = React.ReactElement<{
  className?: string;
  columns: TestTableColumn[];
  scroll?: unknown;
  title: () => React.ReactNode;
}>;

const userBackendMock = UserBackend as unknown as UserBackendMock;
const organizationBackendMock = OrganizationBackend as unknown as OrganizationBackendMock;
const formBackendMock = FormBackend as unknown as FormBackendMock;
const xlsxMock = XLSX as unknown as XlsxMock;
const expect = jestExpect;
const {fireEvent} = require("@testing-library/react") as {
  fireEvent: {
    click: (element: Element | null) => boolean;
    change: (element: Element | null, event: {target: {value: string}}) => boolean;
    error: (element: Element | null) => boolean;
  };
};

jest.mock("./backend/UserBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    getGlobalUsers: factoryJest.fn(),
    getUsers: factoryJest.fn(),
    getUser: factoryJest.fn(),
    updateUser: factoryJest.fn(),
    addUser: factoryJest.fn(),
    deleteUser: factoryJest.fn(),
    getAddressOptions: factoryJest.fn(),
    getAffiliationOptions: factoryJest.fn(),
    setPassword: factoryJest.fn(),
    sendCode: factoryJest.fn(),
    verifyCaptcha: factoryJest.fn(),
    resetEmailOrPhone: factoryJest.fn(),
    impersonateUser: factoryJest.fn(),
    exitImpersonateUser: factoryJest.fn(),
    getCaptcha: factoryJest.fn(),
    verifyCode: factoryJest.fn(),
    checkUserPassword: factoryJest.fn(),
    removeUserFromGroup: factoryJest.fn(),
    verifyIdentification: factoryJest.fn(),
  };
});

jest.mock("./backend/OrganizationBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    getOrganizations: factoryJest.fn(),
    getOrganization: factoryJest.fn(),
    updateOrganization: factoryJest.fn(),
    addOrganization: factoryJest.fn(),
    deleteOrganization: factoryJest.fn(),
    getDefaultApplication: factoryJest.fn(),
    getOrganizationNames: factoryJest.fn(),
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

jest.mock("./OrganizationIdentityCenter", () => {
  const ReactFactory = require("react");
  const MockOrganizationIdentityCenter = ({children, currentOrganization, loadedCount, total}: {children?: unknown; currentOrganization?: string; loadedCount?: number; total?: number}) => ReactFactory.createElement(
    "div",
    {
      "data-testid": "identity-center",
      "data-current-organization": currentOrganization,
      "data-loaded-count": loadedCount,
      "data-total": total,
    },
    children
  );
  return {
    __esModule: true,
    default: MockOrganizationIdentityCenter,
  };
});

jest.mock("./account/AccountAvatar", () => {
  const ReactFactory = require("react");
  return {
    __esModule: true,
    default: (props: {src?: string; alt?: string}) => ReactFactory.createElement("img", {"data-testid": "account-avatar", src: props.src, alt: props.alt}),
  };
});

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

const account = {owner: "built-in", name: "admin", tag: "", isAdmin: true};
const organization = {
  name: "engineering",
  defaultAvatar: "/default-avatar.png",
  countryCodes: ["US"],
  initScore: 5,
  defaultApplication: "app-main",
  balanceCurrency: "USD",
  tags: ["staff|员工"],
};
const user = {
  owner: "engineering",
  name: "alice",
  createdTime: "2026-06-19T10:00:00Z",
  displayName: "Alice",
  avatar: "/alice.png",
  email: "alice@example.com",
  phone: "123",
  affiliation: "Example Inc.",
  realName: "Alice Real",
  isVerified: true,
  region: "US",
  type: "normal-user",
  tag: "staff",
  registerType: "Add User",
  registerSource: "built-in/admin",
  balance: 10,
  balanceCredit: 1,
  balanceCurrency: "USD",
  isAdmin: false,
  isForbidden: false,
  isDeleted: false,
  signupApplication: "app-main",
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

function installSynchronousSetState(page: UserListPage) {
  page.setState = ((stateUpdate: unknown, callback?: () => void) => {
    const patch = typeof stateUpdate === "function" ? stateUpdate(page.state, page.props) : stateUpdate;
    page.state = {
      ...page.state,
      ...(patch as Record<string, unknown>),
    };
    callback?.();
  }) as typeof page.setState;
}

function createPage(props: Partial<React.ComponentProps<typeof UserListPage>> = {}) {
  const page = new UserListPage({
    account,
    history: createHistory(),
    match: {path: "/users", params: {}},
    ...props,
  });
  installSynchronousSetState(page);
  page.state = {
    ...page.state,
    organization,
  };
  return page;
}

function renderPage(props: Partial<React.ComponentProps<typeof UserListPage>> = {}) {
  return render(
    <MemoryRouter>
      <UserListPage
        account={account}
        history={createHistory()}
        match={{path: "/users", params: {}}}
        {...props}
      />
    </MemoryRouter>
  );
}

function getUploadAndModal(page: UserListPage) {
  const uploadFragment = page.renderUpload() as React.ReactElement<{children: React.ReactNode}>;
  const children = React.Children.toArray(uploadFragment.props.children) as React.ReactElement[];
  return {
    upload: children[0],
    modal: children[1],
  };
}

function getTableFromRender(page: UserListPage, data: TestUserRecord[] = [user]) {
  const identityWrapper = page.renderTable(data) as React.ReactElement<{children: React.ReactElement<{children: TestUserTableElement}>}>;
  const tableShell = identityWrapper.props.children;
  return tableShell.props.children;
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
  sessionStorage.clear();
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
  jestValue.spyOn(Setting, "getRandomNumber").mockReturnValue("123456");
  jestValue.spyOn(Setting, "getUserColumns").mockReturnValue(["Name#name", "Owner#owner"]);
  jestValue.spyOn(Setting, "isMobile").mockReturnValue(false);
  jestValue.spyOn(Setting, "goToLinkSoft").mockImplementation(() => {});
  formBackendMock.getForm.mockResolvedValue({status: "ok", data: {formItems: []}});
  organizationBackendMock.getOrganization.mockResolvedValue({status: "ok", data: organization});
  userBackendMock.getUsers.mockResolvedValue({status: "ok", data: [], data2: 0});
  userBackendMock.getGlobalUsers.mockResolvedValue({status: "ok", data: [], data2: 0});
  userBackendMock.addUser.mockResolvedValue({status: "ok"});
  userBackendMock.deleteUser.mockResolvedValue({status: "ok"});
  userBackendMock.removeUserFromGroup.mockResolvedValue({status: "ok"});
  userBackendMock.impersonateUser.mockResolvedValue({status: "ok"});
  xlsxMock.utils.json_to_sheet.mockReturnValue({sheet: true});
  xlsxMock.utils.book_new.mockReturnValue({book: true});
  xlsxMock.read.mockReturnValue({SheetNames: ["Sheet1"], Sheets: {Sheet1: {}}});
  xlsxMock.utils.sheet_to_json.mockReturnValue([{name: "alice", owner: "engineering"}]);
  global.fetch = jestValue.fn(() => Promise.resolve({
    json: () => Promise.resolve({status: "ok"}),
  })) as unknown as typeof fetch;
});

afterEach(() => {
  jestValue.restoreAllMocks();
  jestValue.clearAllMocks();
  cleanup();
});

test("renders user rows and fetches users from the selected organization", async() => {
  userBackendMock.getUsers.mockResolvedValue({
    status: "ok",
    data: [user],
    data2: 1,
  });

  const view = renderPage();

  expect(await view.findByText("alice")).not.toBeNull();
  expect(view.getByText("Alice")).not.toBeNull();
  expect(userBackendMock.getUsers).toHaveBeenCalledWith("engineering", expect.any(Number), expect.any(Number), undefined, undefined, undefined, undefined);
  expect(organizationBackendMock.getOrganization).toHaveBeenCalledWith("admin", "engineering");
});

test("fetches global, organization route and group users with existing parameters", async() => {
  localStorage.setItem("organization", "All");
  const globalPage = createPage();
  globalPage.fetch({pagination: {...globalPage.state.pagination, current: 3, pageSize: 50}});
  await flushPromises();
  expect(userBackendMock.getGlobalUsers).toHaveBeenCalledWith(3, 50, undefined, undefined, undefined, undefined);

  const organizationPage = createPage({
    match: {path: "/organizations/:organizationName/users", params: {organizationName: "engineering"}},
  });
  organizationPage.state = {...organizationPage.state, organizationName: "engineering"};
  organizationPage.fetch({
    pagination: {...organizationPage.state.pagination, current: 1, pageSize: 20},
    searchedColumn: "email",
    searchText: "alice",
    sortField: "name",
    sortOrder: "ascend",
  });
  await flushPromises();
  expect(userBackendMock.getUsers).toHaveBeenLastCalledWith("engineering", 1, 20, "email", "alice", "name", "ascend");

  const groupPage = createPage({
    match: {path: "/organizations/:organizationName/users", params: {organizationName: "engineering"}},
    groupName: "platform",
  });
  groupPage.state = {...groupPage.state, organizationName: "engineering"};
  groupPage.fetch({pagination: {...groupPage.state.pagination, current: 2, pageSize: 10}});
  await flushPromises();
  expect(userBackendMock.getUsers).toHaveBeenLastCalledWith("engineering", 2, 10, undefined, undefined, undefined, undefined, "platform");
});

test("creates default users from organization defaults and navigates to edit page", async() => {
  const history = createHistory();
  const page = createPage({history});

  expect(page.newUser()).toEqual(expect.objectContaining({
    owner: "engineering",
    name: "user_abc123",
    type: "normal-user",
    password: "123",
    avatar: "/default-avatar.png",
    countryCode: "US",
    score: 5,
    signupApplication: "app-main",
    registerSource: "built-in/admin",
    balanceCurrency: "USD",
  }));

  page.addUser();
  await flushPromises();

  expect(userBackendMock.addUser).toHaveBeenCalledWith(expect.objectContaining({
    owner: "engineering",
    name: "user_abc123",
  }));
  expect(sessionStorage.getItem("userListUrl")).toBe("/");
  expect(history.push).toHaveBeenCalledWith({pathname: "/users/engineering/user_abc123", mode: "add"});
  expect(Setting.showMessage).toHaveBeenCalledWith("success", expect.any(String));
});

test("deletes users and removes users from groups", async() => {
  const page = createPage({groupName: "platform"});
  page.fetch = jestValue.fn() as unknown as typeof page.fetch;
  page.state = {
    ...page.state,
    data: [user],
    pagination: {...page.state.pagination, current: 2, total: 1},
  };

  page.deleteUser(0);
  await flushPromises();
  expect(userBackendMock.deleteUser).toHaveBeenCalledWith(expect.objectContaining({name: "alice"}));
  expect(page.fetch).toHaveBeenCalledWith(expect.objectContaining({
    pagination: expect.objectContaining({current: 1}),
  }));

  page.removeUserFromGroup(0);
  await flushPromises();
  expect(userBackendMock.removeUserFromGroup).toHaveBeenCalledWith({groupName: "platform", owner: "engineering", name: "alice"});
  expect(page.state.data).toEqual([]);
  expect(page.state.pagination).toEqual({total: 0});
});

test("reports add, delete, remove and list response errors", async() => {
  const page = createPage({groupName: "platform"});
  page.state = {
    ...page.state,
    data: [user],
  };
  userBackendMock.addUser.mockResolvedValueOnce({status: "error", msg: "add failed"});
  userBackendMock.addUser.mockRejectedValueOnce(new Error("add network"));
  userBackendMock.deleteUser.mockResolvedValueOnce({status: "error", msg: "delete failed"});
  userBackendMock.deleteUser.mockRejectedValueOnce(new Error("delete network"));
  userBackendMock.removeUserFromGroup.mockResolvedValueOnce({status: "error", msg: "remove failed"});
  userBackendMock.removeUserFromGroup.mockRejectedValueOnce(new Error("remove network"));
  userBackendMock.getUsers.mockResolvedValueOnce({status: "error", msg: "list failed"});

  page.addUser();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("add failed"));

  page.addUser();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("add network"));

  page.deleteUser(0);
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete failed"));

  page.deleteUser(0);
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete network"));

  page.removeUserFromGroup(0);
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("remove failed"));

  page.removeUserFromGroup(0);
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("remove network"));

  page.fetch({pagination: {...page.state.pagination, current: 1, pageSize: 20}});
  await flushPromises();
  expect(page.state.loading).toBe(false);
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "list failed");
});

test("reports organization detail and impersonation failures", async() => {
  const page = createPage();
  organizationBackendMock.getOrganization.mockResolvedValueOnce({status: "error", msg: "org failed"});
  userBackendMock.impersonateUser.mockResolvedValueOnce({status: "error", msg: "impersonate failed"});

  page.getOrganization("engineering");
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("org failed"));

  page.impersonateUser("engineering/alice");
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "impersonate failed");
});

test("redirects and reloads after successful impersonation", async() => {
  const page = createPage();
  jestValue.spyOn(console, "error").mockImplementation(() => {});

  page.impersonateUser("engineering/alice");
  await flushPromises();

  expect(userBackendMock.impersonateUser).toHaveBeenCalledWith("engineering/alice");
  expect(Setting.showMessage).toHaveBeenCalledWith("success", expect.any(String));
  expect(Setting.goToLinkSoft).toHaveBeenCalledWith(page, "/");
});

test("updates organization context and refetches when route props change", async() => {
  const page = createPage({
    match: {path: "/organizations/:organizationName/users", params: {organizationName: "engineering"}},
  });
  page.fetch = jestValue.fn() as unknown as typeof page.fetch;
  page.getOrganization = jestValue.fn() as unknown as typeof page.getOrganization;
  const previousProps = {
    ...page.props,
    match: {path: "/users", params: {}},
    organizationName: "old-org",
    groupName: undefined,
  };
  const previousState = {
    ...page.state,
    organizationName: "old-org",
  };

  page.componentDidUpdate(previousProps, previousState);

  expect(page.state.organizationName).toBe("engineering");
  expect(page.getOrganization).toHaveBeenCalledWith("engineering");
  expect(page.fetch).toHaveBeenCalledWith({
    pagination: page.state.pagination,
    searchText: page.state.searchText,
    searchedColumn: page.state.searchedColumn,
  });
});

test("reports organization route list errors and unauthorized responses", async() => {
  const page = createPage({
    match: {path: "/organizations/:organizationName/users", params: {organizationName: "engineering"}},
  });
  page.state = {...page.state, organizationName: "engineering"};
  userBackendMock.getUsers.mockResolvedValueOnce({status: "error", msg: "org list failed"});

  page.fetch({pagination: {...page.state.pagination, current: 1, pageSize: 20}});
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "org list failed");

  userBackendMock.getUsers.mockResolvedValueOnce({status: "error", msg: "Unauthorized operation"});
  page.fetch({pagination: {...page.state.pagination, current: 1, pageSize: 20}});
  await flushPromises();
  expect(page.state.isAuthorized).toBe(false);
});

test("renders unauthorized state when user list request is denied", async() => {
  userBackendMock.getUsers.mockResolvedValue({
    status: "error",
    msg: "Unauthorized operation",
  });

  const view = renderPage();

  expect(await view.findByText("403 Unauthorized")).not.toBeNull();
  expect(Setting.showMessage).not.toHaveBeenCalledWith("error", "Unauthorized operation");
});

test("builds table actions for edit, impersonation, remove and delete", () => {
  const history = createHistory();
  const page = createPage({history, groupName: "platform"});
  jestValue.spyOn(page, "impersonateUser").mockImplementation(() => {});
  jestValue.spyOn(page, "deleteUser").mockImplementation(() => {});
  jestValue.spyOn(page, "removeUserFromGroup").mockImplementation(() => {});

  const table = getTableFromRender(page);
  const columns = table.props.columns;
  const actionColumn = columns.find(column => column.key === "op") as TestTableColumn;

  expect(table.type).toBe(ListPageTable);
  expect(table.props.className).toContain("user-list-table");
  expect(columns.map(column => column.key)).toEqual(["name", "email", "owner", "isVerified", "createdTime", "op"]);
  expect(columns.find(column => column.key === "signupApplication")).toBeUndefined();
  expect(actionColumn.fixed).toBeUndefined();
  const actionNode = actionColumn.render?.(undefined, user, 0) as React.ReactElement<{children: React.ReactNode; className?: string}>;
  expect(actionNode.props.className).toContain("enterprise-list-row-actions");
  const actionChildren = React.Children.toArray(actionNode.props.children) as React.ReactElement[];
  const actionView = render(<>{actionNode}</>);

  fireEvent.click(actionView.getByLabelText(/身\s*份\s*模\s*拟|Impersonation/));
  expect(page.impersonateUser).toHaveBeenCalledWith("engineering/alice");
  fireEvent.click(actionView.getByText(/编\s*辑|Edit/));
  expect(sessionStorage.getItem("userListUrl")).toBe("/");
  expect(history.push).toHaveBeenCalledWith("/users/engineering/alice");
  actionChildren[2].props.onConfirm();
  expect(page.removeUserFromGroup).toHaveBeenCalledWith(0);
  actionChildren[3].props.onConfirm();
  expect(page.deleteUser).toHaveBeenCalledWith(0);
  actionView.unmount();

  const toolbarView = render(<>{table.props.title()}</>);
  fireEvent.click(toolbarView.getByText(/添\s*加|Add/));
  expect(userBackendMock.addUser).toHaveBeenCalled();
  toolbarView.unmount();

  const toolbarShell = table.props.title() as React.ReactElement<{children: React.ReactElement<{
    onFieldChange: (value: string) => void;
    onKeywordChange: (value: string) => void;
  }>}>;
  toolbarShell.props.children.props.onFieldChange("phone");
  toolbarShell.props.children.props.onKeywordChange("138");
  expect(page.state.queryField).toBe("phone");
  expect(page.state.queryKeyword).toBe("138");
});

test("renders advanced user filters and maps them to the existing single-field query contract", () => {
  const page = createPage();
  page.fetch = jestValue.fn() as unknown as typeof page.fetch;
  page.state = {
    ...page.state,
    pagination: {...page.state.pagination, current: 3, pageSize: 20},
  };
  const table = getTableFromRender(page);
  const toolbarView = render(<>{table.props.title()}</>);
  expect(table.props.scroll).toEqual({y: "calc(100vh - 360px)"});

  fireEvent.click(toolbarView.getByText(/更\s*多\s*筛\s*选|More filters/));
  const expandedTable = getTableFromRender(page);
  expect(expandedTable.props.scroll).toEqual({y: "calc(100vh - 414px)"});

  expect(toolbarView.getByText(/收\s*起\s*筛\s*选|Hide filters/)).not.toBeNull();
  expect(toolbarView.container.querySelector(".enterprise-list-query-toolbar-advanced")).not.toBeNull();
  expect(toolbarView.container.querySelectorAll(".enterprise-list-query-toolbar-advanced .organization-advanced-filter-input")).toHaveLength(6);
  const advancedFilterLabels = (Array.from(toolbarView.container.querySelectorAll(".enterprise-list-query-toolbar-advanced .organization-advanced-filter-label")) as HTMLElement[])
    .map(node => node.textContent);
  expect(advancedFilterLabels).toHaveLength(6);
  expect(advancedFilterLabels.every(label => label?.endsWith(":"))).toBe(true);

  fireEvent.change(getAdvancedFilterInputByLabel(toolbarView.container, /^(Advanced filters Email|高级筛选 电子邮箱)$/), {target: {value: " alice@example.com "}});
  expect(page.state.queryField).toBe("email");
  expect(page.state.queryKeyword).toBe(" alice@example.com ");
  expect(page.state.advancedQueryKeywords.email).toBe(" alice@example.com ");
  expect(page.state.advancedQueryKeywords.name).toBe("");

  page.handleToolbarSearch();
  expect(page.fetch).toHaveBeenCalledWith({
    pagination: expect.objectContaining({current: 1, pageSize: 20}),
    searchedColumn: "email",
    searchText: "alice@example.com",
  });

  fireEvent.change(getAdvancedFilterInputByLabel(toolbarView.container, /^(Advanced filters Phone|高级筛选 手机号)$/), {target: {value: "138"}});
  expect(page.state.queryField).toBe("phone");
  expect(page.state.queryKeyword).toBe("138");
  expect(page.state.advancedQueryKeywords.email).toBe("");
  expect(page.state.advancedQueryKeywords.phone).toBe("138");

  page.handleToolbarReset();
  expect(Object.values(page.state.advancedQueryKeywords).every(value => value === "")).toBe(true);
  expect(page.fetch).toHaveBeenLastCalledWith({pagination: expect.objectContaining({current: 1})});
  toolbarView.unmount();
});

test("uses toolbar query state with existing fetch parameters", () => {
  const page = createPage();
  page.fetch = jestValue.fn() as unknown as typeof page.fetch;
  page.state = {
    ...page.state,
    queryField: "email",
    queryKeyword: " alice@example.com ",
    pagination: {...page.state.pagination, current: 3, pageSize: 20},
  };

  page.handleToolbarSearch();

  expect(page.fetch).toHaveBeenCalledWith({
    pagination: expect.objectContaining({current: 1, pageSize: 20}),
    searchedColumn: "email",
    searchText: "alice@example.com",
  });

  page.handleToolbarReset();
  expect(page.state.queryField).toBe("name");
  expect(page.state.queryKeyword).toBe("");
  expect(page.fetch).toHaveBeenLastCalledWith({pagination: expect.objectContaining({current: 1})});
});

test("keeps compact table scroll and sorting compatible with existing fetch contract", () => {
  const page = createPage();
  page.fetch = jestValue.fn() as unknown as typeof page.fetch;
  page.state = {
    ...page.state,
    searchText: "alice",
    searchedColumn: "name",
  };
  (Setting.isMobile as unknown as LooseMock).mockReturnValueOnce(true);

  const mobileTable = getTableFromRender(page);
  expect(mobileTable.props.scroll).toEqual({x: 780});

  page.handleTableChange({current: 2, pageSize: 20}, {}, {field: "email", order: "ascend"} as never, {} as never);
  expect(page.fetch).toHaveBeenCalledWith(expect.objectContaining({
    pagination: expect.objectContaining({current: 2}),
    sortField: "email",
    sortOrder: "ascend",
    searchText: "alice",
    searchedColumn: "name",
  }));

  page.handleTableChange({current: 1, pageSize: 20}, {}, [{columnKey: "createdTime", order: "descend"}] as never, {} as never);
  expect(page.fetch).toHaveBeenLastCalledWith(expect.objectContaining({
    sortField: "createdTime",
    sortOrder: "descend",
  }));

  page.state = {...page.state, queryKeyword: "   "};
  page.handleToolbarSearch();
  expect(page.fetch).toHaveBeenLastCalledWith(expect.objectContaining({
    searchedColumn: undefined,
    searchText: undefined,
  }));
});

test("renders compact user identity, contact, source and status cells", () => {
  const page = createPage();
  const table = getTableFromRender(page, [{
    ...user,
    avatar: "",
    displayName: "Bob",
    email: null,
    phone: undefined,
    isVerified: false,
    isForbidden: true,
  }]);
  const columns = table.props.columns;
  const identityColumn = columns.find(column => column.key === "name") as TestTableColumn;
  const contactColumn = columns.find(column => column.key === "email") as TestTableColumn;
  const sourceColumn = columns.find(column => column.key === "owner") as TestTableColumn;
  const statusColumn = columns.find(column => column.key === "isVerified") as TestTableColumn;
  const compactUser = {
    ...user,
    avatar: "",
    displayName: "Bob",
    email: null,
    phone: undefined,
    isVerified: false,
    isForbidden: true,
  };

  const identityView = render(<MemoryRouter>{identityColumn.render?.(undefined, compactUser, 0)}</MemoryRouter>);
  expect(identityView.getByText("Bob")).not.toBeNull();
  expect(identityView.getByText("B")).not.toBeNull();
  expect(identityView.getByText("Bob").className).toContain("enterprise-list-primary-text");
  expect(identityView.getByText("alice").className).toContain("enterprise-list-secondary-text");
  identityView.unmount();

  const contactView = render(<>{contactColumn.render?.(undefined, compactUser, 0)}</>);
  expect(contactView.getByText(/无联系方式|No contact/)).not.toBeNull();
  expect(contactView.getByText(/无联系方式|No contact/).className).toContain("enterprise-list-secondary-text");
  contactView.unmount();

  const sourceView = render(<MemoryRouter>{sourceColumn.render?.(undefined, compactUser, 0)}</MemoryRouter>);
  expect(sourceView.getByText("engineering")).not.toBeNull();
  expect(sourceView.getByText("app-main")).not.toBeNull();
  sourceView.unmount();

  const statusView = render(<>{statusColumn.render?.(undefined, compactUser, 0)}</>);
  expect(statusView.getByText(/未验证|Unverified/)).not.toBeNull();
  expect(statusView.getByText(/被禁用|Is forbidden/)).not.toBeNull();
  statusView.unmount();

  const emptyIdentityUser = {
    ...compactUser,
    name: "",
    displayName: "",
    realName: "",
    avatar: "https://example.invalid/avatar.png",
  };
  const emptyIdentityView = render(<MemoryRouter>{identityColumn.render?.(undefined, emptyIdentityUser, 0)}</MemoryRouter>);
  const avatarImage = emptyIdentityView.container.querySelector("img");
  if (avatarImage !== null) {
    fireEvent.error(avatarImage);
  }
  expect(emptyIdentityView.getByText("?")).not.toBeNull();
  emptyIdentityView.unmount();

  const realNameUser = {
    ...compactUser,
    displayName: "",
    realName: "Rachel Real",
    name: "rachel",
  };
  const realNameView = render(<MemoryRouter>{identityColumn.render?.(undefined, realNameUser, 0)}</MemoryRouter>);
  expect(realNameView.getByText("Rachel Real")).not.toBeNull();
  expect(realNameView.getByText("R")).not.toBeNull();
  realNameView.unmount();

  const emailOnlyView = render(<>{contactColumn.render?.(undefined, {...compactUser, email: "bob@example.com", phone: ""}, 0)}</>);
  expect(emailOnlyView.getByText("bob@example.com").closest("a")?.getAttribute("href")).toBe("mailto:bob@example.com");
  emailOnlyView.unmount();

  const phoneOnlyView = render(<>{contactColumn.render?.(undefined, {...compactUser, email: "", phone: "13900000000"}, 0)}</>);
  expect(phoneOnlyView.getByText("13900000000")).not.toBeNull();
  phoneOnlyView.unmount();

  const unknownSourceView = render(<MemoryRouter>{sourceColumn.render?.(undefined, {...compactUser, owner: "", signupApplication: ""}, 0)}</MemoryRouter>);
  expect(unknownSourceView.getByText(/未知|Unknown/)).not.toBeNull();
  unknownSourceView.unmount();

  const deletedStatusView = render(<>{statusColumn.render?.(undefined, {
    ...compactUser,
    isVerified: true,
    isForbidden: undefined,
    IsForbidden: true,
    isDeleted: true,
  }, 0)}</>);
  expect(deletedStatusView.getByText(/已验证|Verified/)).not.toBeNull();
  expect(deletedStatusView.getByText(/被禁用|Is forbidden/)).not.toBeNull();
  expect(deletedStatusView.getByText(/被删除|Is deleted/)).not.toBeNull();
  deletedStatusView.unmount();
});

test("keeps non-tree destructive actions available but disabled for protected users", () => {
  const selfPage = createPage({
    account: {...account, owner: "engineering", name: "alice"},
  });
  const builtInPage = createPage({
    account: {...account, owner: "engineering", name: "ops"},
  });
  const selfActionColumn = getTableFromRender(selfPage).props.columns.find(column => column.key === "op") as TestTableColumn;
  const builtInActionColumn = getTableFromRender(builtInPage).props.columns.find(column => column.key === "op") as TestTableColumn;

  const selfActionNode = selfActionColumn.render?.(undefined, user, 0) as React.ReactElement<{children: React.ReactNode}>;
  const selfActionChildren = React.Children.toArray(selfActionNode.props.children) as React.ReactElement[];
  expect(selfActionChildren).toHaveLength(3);
  expect(selfActionChildren[2].props.children.props.disabled).toBe(true);

  const builtInActionNode = builtInActionColumn.render?.(undefined, {...user, owner: "built-in", name: "admin"}, 0) as React.ReactElement<{children: React.ReactNode}>;
  const builtInActionChildren = React.Children.toArray(builtInActionNode.props.children) as React.ReactElement[];
  expect(builtInActionChildren).toHaveLength(3);
  expect(builtInActionChildren[2].props.children.props.disabled).toBe(true);
});

test("generates upload template and previews xlsx upload", async() => {
  const page = createPage();
  page.fetch = jestValue.fn() as unknown as typeof page.fetch;
  const file = new File(["content"], "users.xlsx");
  const {upload} = getUploadAndModal(page);

  const beforeUploadResult = upload.props.beforeUpload(file);
  MockFileReader.instances[0].onload?.({target: {result: new ArrayBuffer(8)}});

  expect(beforeUploadResult).toBe(false);
  expect(xlsxMock.read).toHaveBeenCalledWith(expect.any(ArrayBuffer), {type: "array"});
  expect(page.state.uploadJsonData).toEqual([{name: "alice", owner: "engineering"}]);
  expect(page.state.uploadColumns).toEqual([
    {title: "Name", dataIndex: "Name#name", key: "Name#name"},
    {title: "Owner", dataIndex: "Owner#owner", key: "Owner#owner"},
  ]);
  expect(page.state.showUploadModal).toBe(true);

  page.generateDownloadTemplate();
  expect(xlsxMock.utils.json_to_sheet).toHaveBeenCalledWith([{"Name#name": null, "Owner#owner": null}]);
  expect(xlsxMock.writeFile).toHaveBeenCalledWith({book: true}, "import-user.xlsx", {compression: true});

  const {modal} = getUploadAndModal(page);
  modal.props.onOk();
  await flushPromises();

  expect(global.fetch).toHaveBeenCalledWith("/api/upload-users", expect.objectContaining({
    method: "post",
    credentials: "include",
    headers: {"Accept-Language": expect.any(String)},
  }));
  expect(page.fetch).toHaveBeenCalledWith({pagination: page.state.pagination});
  expect(page.state.showUploadModal).toBe(false);
});

test("cancels upload preview", () => {
  const page = createPage();
  page.state = {
    ...page.state,
    uploadJsonData: [{name: "alice"}],
    uploadColumns: [{title: "Name", dataIndex: "name", key: "name"}],
    showUploadModal: true,
  };

  const {modal} = getUploadAndModal(page);
  modal.props.onCancel();

  expect(page.state.showUploadModal).toBe(false);
  expect(page.state.uploadJsonData).toEqual([]);
  expect(page.state.uploadColumns).toEqual([]);
});

test("reports upload preview and upload result errors", async() => {
  const page = createPage();
  const file = new File(["content"], "users.xlsx");
  const {upload} = getUploadAndModal(page);

  xlsxMock.read.mockReturnValueOnce({SheetNames: [], Sheets: {}});
  upload.props.beforeUpload(file);
  MockFileReader.instances[0].onload?.({target: {result: new ArrayBuffer(8)}});
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringMatching(/No sheets|未找到/));

  upload.props.beforeUpload(file);
  MockFileReader.instances[1].onerror?.({message: "read failed"});
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("read failed"));

  xlsxMock.read.mockImplementationOnce(() => {
    throw new Error("parse failed");
  });
  upload.props.beforeUpload(file);
  MockFileReader.instances[2].onload?.({target: {result: new ArrayBuffer(8)}});
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("parse failed"));

  page.uploadFile({status: "error", msg: "server rejected"});
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("server rejected"));
  expect(page.state.uploadJsonData).toEqual([]);
  expect(page.state.showUploadModal).toBe(false);

  page.state = {...page.state, file};
  global.fetch = jestValue.fn(() => Promise.reject(new Error("upload failed"))) as unknown as typeof fetch;
  const {modal} = getUploadAndModal(page);
  modal.props.onOk();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("upload failed"));
});
