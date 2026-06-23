/* eslint-env jest */
import React from "react";
import {expect as jestExpect, jest as jestValue} from "@jest/globals";
import {cleanup, render} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import * as Setting from "./Setting";
import * as FormBackend from "./backend/FormBackend";
import * as OrganizationBackend from "./backend/OrganizationBackend";
import OrganizationListPage from "./OrganizationListPage";
import EnterpriseListQueryToolbar from "./common/EnterpriseListQueryToolbar";
import ListPageTable from "./common/ListPageTable";

declare const jest: typeof jestValue;

type LooseMock = {
  (...args: unknown[]): unknown;
  mockImplementation: (implementation: (...args: unknown[]) => unknown) => LooseMock;
  mockReturnValue: (value: unknown) => LooseMock;
  mockResolvedValue: (value: unknown) => LooseMock;
  mockResolvedValueOnce: (value: unknown) => LooseMock;
  mockRejectedValueOnce: (value: unknown) => LooseMock;
};

type BackendMock = Record<keyof typeof OrganizationBackend, LooseMock>;
type FormBackendMock = Record<keyof typeof FormBackend, LooseMock>;
type TestOrganizationRecord = {
  owner: string;
  name: string;
  [key: string]: unknown;
};
type TestTableColumn = {
  key?: string;
  fixed?: unknown;
  filters?: unknown;
  sorter?: unknown;
  render?: (text: unknown, record: TestOrganizationRecord, index: number) => React.ReactNode;
};
type TestOrganizationTableElement = React.ReactElement<{
  bordered?: boolean;
  className?: string;
  columns: TestTableColumn[];
  scroll?: {x?: unknown; y?: unknown};
  title: () => React.ReactNode;
}>;
type TestToolbarProps = React.ComponentProps<typeof EnterpriseListQueryToolbar>;
type TestIdentityCenterProps = {
  children: TestOrganizationTableElement;
  listAction?: React.ReactNode;
};

const backendMock = OrganizationBackend as unknown as BackendMock;
const formBackendMock = FormBackend as unknown as FormBackendMock;
const expect = jestExpect;
const {fireEvent} = require("@testing-library/react") as {
  fireEvent: {
    click: (element: Element | null) => boolean;
    change: (element: Element | null, event: {target: {value: string}}) => boolean;
  };
};

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

const adminAccount = {owner: "built-in", tag: "", isAdmin: true};
const nonAdminAccount = {owner: "engineering", tag: "", isAdmin: false};
const organization = {
  owner: "admin",
  name: "engineering",
  displayName: "Engineering",
  createdTime: "2026-06-19T10:00:00Z",
  favicon: "/favicon.png",
  websiteUrl: "https://example.test",
  passwordType: "bcrypt",
  passwordSalt: "",
  defaultAvatar: "/avatar.png",
  enableSoftDeletion: false,
};

function flushPromises() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

function createHistory() {
  return {
    push: jestValue.fn(),
  };
}

function installSynchronousSetState(page: OrganizationListPage) {
  page.setState = ((stateUpdate: unknown, callback?: () => void) => {
    const patch = typeof stateUpdate === "function" ? stateUpdate(page.state, page.props) : stateUpdate;
    page.state = {
      ...page.state,
      ...(patch as Record<string, unknown>),
    };
    callback?.();
  }) as typeof page.setState;
}

function createPage(account = adminAccount) {
  const page = new OrganizationListPage({
    account,
    history: createHistory(),
    match: {path: "/organizations", params: {}},
  });
  installSynchronousSetState(page);
  return page;
}

function renderPage(account = adminAccount) {
  return render(
    <MemoryRouter>
      <OrganizationListPage
        account={account}
        history={createHistory()}
        match={{path: "/organizations", params: {}}}
      />
    </MemoryRouter>
  );
}

beforeEach(() => {
  cleanup();
  localStorage.clear();
  localStorage.setItem("organization", "engineering");
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value: 1024,
  });
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
  formBackendMock.getForm.mockResolvedValue({status: "ok", data: {formItems: []}});
  backendMock.getOrganizations.mockResolvedValue({status: "ok", data: [], data2: 0});
  backendMock.addOrganization.mockResolvedValue({status: "ok"});
  backendMock.deleteOrganization.mockResolvedValue({status: "ok"});
});

afterEach(() => {
  jestValue.restoreAllMocks();
  jestValue.clearAllMocks();
  cleanup();
});

test("renders organization rows and fetches the selected organization", async() => {
  backendMock.getOrganizations.mockResolvedValue({
    status: "ok",
    data: [organization],
    data2: 1,
  });

  const view = renderPage();

  expect(await view.findByText("engineering")).not.toBeNull();
  expect(view.getByText("Engineering")).not.toBeNull();
  expect(backendMock.getOrganizations).toHaveBeenCalledWith("admin", "engineering", expect.any(Number), expect.any(Number), undefined, undefined, undefined, undefined);
  expect(formBackendMock.getForm).toHaveBeenCalled();
});

test("creates a default organization and navigates to edit page", async() => {
  const history = createHistory();
  const storageListener = jestValue.fn();
  window.addEventListener("storageOrganizationsChanged", storageListener);
  const page = new OrganizationListPage({
    account: adminAccount,
    history,
    match: {path: "/organizations", params: {}},
  });

  expect(page.newOrganization()).toEqual(expect.objectContaining({
    owner: "admin",
    name: "organization_abc123",
    displayName: "New Organization - abc123",
    websiteUrl: "https://git.leagsoft.com/aicodex/aicodex-admin",
    passwordType: "bcrypt",
    PasswordSalt: "",
    countryCodes: ["US"],
    balanceCurrency: "USD",
    enableSoftDeletion: false,
    isProfilePublic: true,
  }));

  page.addOrganization();
  await flushPromises();

  expect(backendMock.addOrganization).toHaveBeenCalledWith(expect.objectContaining({
    owner: "admin",
    name: "organization_abc123",
  }));
  expect(history.push).toHaveBeenCalledWith({pathname: "/organizations/organization_abc123", mode: "add"});
  expect(Setting.showMessage).toHaveBeenCalledWith("success", expect.any(String));
  expect(storageListener).toHaveBeenCalled();
  window.removeEventListener("storageOrganizationsChanged", storageListener);
});

test("fetches all organizations when default organization is selected", async() => {
  localStorage.setItem("organization", "All");
  const page = createPage();

  page.fetch({pagination: {...page.state.pagination, current: 3, pageSize: 50}});
  await flushPromises();

  expect(backendMock.getOrganizations).toHaveBeenCalledWith("admin", "", 3, 50, undefined, undefined, undefined, undefined);
});

test("passes search, password type query and sorting parameters to backend", async() => {
  const page = createPage();

  page.fetch({
    pagination: {...page.state.pagination, current: 1, pageSize: 20},
    searchedColumn: "name",
    searchText: "main",
    sortField: "name",
    sortOrder: "ascend",
  });
  await flushPromises();

  expect(backendMock.getOrganizations).toHaveBeenLastCalledWith("admin", "engineering", 1, 20, "name", "main", "name", "ascend");

  page.fetch({
    pagination: {...page.state.pagination, current: 1, pageSize: 20},
    searchedColumn: "passwordType",
    searchText: "bcrypt",
  });
  await flushPromises();

  expect(backendMock.getOrganizations).toHaveBeenLastCalledWith("admin", "engineering", 1, 20, "passwordType", "bcrypt", undefined, undefined);
});

test("deletes organization and rolls back pagination for the last row", async() => {
  const page = createPage();
  const storageListener = jestValue.fn();
  window.addEventListener("storageOrganizationsChanged", storageListener);
  page.fetch = jestValue.fn() as unknown as typeof page.fetch;
  page.state = {
    ...page.state,
    data: [organization],
    pagination: {...page.state.pagination, current: 2},
  };

  page.deleteOrganization(0);
  await flushPromises();

  expect(backendMock.deleteOrganization).toHaveBeenCalledWith(expect.objectContaining({name: "engineering"}));
  expect(page.fetch).toHaveBeenCalledWith(expect.objectContaining({
    pagination: expect.objectContaining({current: 1}),
  }));
  expect(Setting.showMessage).toHaveBeenCalledWith("success", expect.any(String));
  expect(storageListener).toHaveBeenCalled();
  window.removeEventListener("storageOrganizationsChanged", storageListener);
});

test("reports add, delete and list response errors", async() => {
  const page = createPage();
  page.state = {
    ...page.state,
    data: [organization],
  };
  backendMock.addOrganization.mockResolvedValueOnce({status: "error", msg: "add failed"});
  backendMock.addOrganization.mockRejectedValueOnce(new Error("add network"));
  backendMock.deleteOrganization.mockResolvedValueOnce({status: "error", msg: "delete failed"});
  backendMock.deleteOrganization.mockRejectedValueOnce(new Error("delete network"));
  backendMock.getOrganizations.mockResolvedValueOnce({status: "error", msg: "list failed"});

  page.addOrganization();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("add failed"));

  page.addOrganization();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("add network"));

  page.deleteOrganization(0);
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete failed"));

  page.deleteOrganization(0);
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete network"));

  page.fetch({pagination: {...page.state.pagination, current: 1, pageSize: 20}});
  await flushPromises();
  expect(page.state.loading).toBe(false);
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "list failed");
});

test("renders unauthorized state when organization list request is denied", async() => {
  backendMock.getOrganizations.mockResolvedValue({
    status: "error",
    msg: "Unauthorized operation",
  });

  const view = renderPage();

  expect(await view.findByText("403 Unauthorized")).not.toBeNull();
  expect(Setting.showMessage).not.toHaveBeenCalledWith("error", "Unauthorized operation");
});

test("builds table columns, toolbar and action handlers", () => {
  const history = createHistory();
  const page = new OrganizationListPage({
    account: adminAccount,
    history,
    match: {path: "/organizations", params: {}},
  });
  installSynchronousSetState(page);
  jestValue.spyOn(page, "addOrganization").mockImplementation(() => {});
  jestValue.spyOn(page, "deleteOrganization").mockImplementation(() => {});

  const tableWrapper = page.renderTable([organization]) as React.ReactElement<TestIdentityCenterProps>;
  const table = tableWrapper.props.children;
  const columns = table.props.columns;

  expect(table.type).toBe(ListPageTable);
  expect(columns[0].key).toBe("name");
  expect(columns.map(column => column.key)).toEqual([
    "name",
    "createdTime",
    "displayName",
    "favicon",
    "websiteUrl",
    "passwordType",
    "enableSoftDeletion",
    "op",
  ]);
  expect(columns.some(column => column.key === "passwordSalt")).toBe(false);
  expect(columns.some(column => column.key === "defaultAvatar")).toBe(false);
  expect(columns.some(column => column.key === "orgBalance")).toBe(false);
  expect(columns.some(column => column.key === "userBalance")).toBe(false);
  expect(columns.some(column => column.key === "balanceCredit")).toBe(false);
  expect(columns.some(column => column.key === "balanceCurrency")).toBe(false);
  expect(columns[7].fixed).toBe("right");
  expect(table.props.className).toContain("organization-list-table");
  expect(table.props.bordered).toBeUndefined();
  expect(table.props.scroll?.x).toBeUndefined();
  expect(table.props.scroll?.y).toBe("calc(100vh - 360px)");

  const actionNode = columns[7].render?.(undefined, organization, 0) as React.ReactElement<{children: React.ReactNode}>;
  const actionChildren = React.Children.toArray(actionNode.props.children) as React.ReactElement[];
  const actionView = render(<>{actionNode}</>);
  fireEvent.click(actionView.getByText(/群\s*组|Groups/));
  expect(history.push).toHaveBeenCalledWith("/trees/engineering");
  fireEvent.click(actionView.getByText(/用\s*户|Users/));
  expect(history.push).toHaveBeenCalledWith("/organizations/engineering/users");
  fireEvent.click(actionView.getByText(/编\s*辑|Edit/));
  expect(history.push).toHaveBeenCalledWith("/organizations/engineering");
  actionChildren[3].props.onConfirm();
  expect(page.deleteOrganization).toHaveBeenCalledWith(0);
  actionView.unmount();

  const blockedActionNode = columns[7].render?.(undefined, {...organization, name: "built-in"}, 0) as React.ReactElement<{children: React.ReactNode}>;
  const blockedActionChildren = React.Children.toArray(blockedActionNode.props.children) as React.ReactElement[];
  expect(blockedActionChildren[3].props.disabled).toBe(true);

  const toolbar = table.props.title() as React.ReactElement<TestToolbarProps>;
  const addActionView = render(<>{toolbar.props.actions}</>);
  fireEvent.click(addActionView.getByText(/添\s*加|Add/));
  expect(page.addOrganization).toHaveBeenCalled();
  expect(tableWrapper.props.listAction).toBeUndefined();
});

test("disables fixed organization table columns in compact viewport", () => {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value: 390,
  });
  const page = createPage(adminAccount);

  const tableWrapper = page.renderTable([organization]) as React.ReactElement<TestIdentityCenterProps>;
  const table = tableWrapper.props.children;
  const columns = table.props.columns;

  expect(columns[0].fixed).toBe(false);
  expect(columns[7].fixed).toBe(false);
  expect(table.props.scroll?.x).toBeUndefined();
  expect(table.props.scroll?.y).toBe("calc(100vh - 360px)");
});

test("disables fixed organization table columns when mobile mode is active", () => {
  jestValue.spyOn(Setting, "isMobile").mockReturnValue(true);
  const page = createPage(adminAccount);

  const tableWrapper = page.renderTable([organization]) as React.ReactElement<TestIdentityCenterProps>;
  const table = tableWrapper.props.children;
  const columns = table.props.columns;

  expect(columns[0].fixed).toBe(false);
  expect(columns[7].fixed).toBe(false);
  expect(table.props.scroll?.x).toBe(980);
  expect(table.props.scroll?.y).toBeUndefined();
});

test("uses shared query toolbar for organization search controls and directory context", () => {
  const page = createPage(adminAccount);
  page.fetch = jestValue.fn() as unknown as typeof page.fetch;
  jestValue.spyOn(page, "addOrganization").mockImplementation(() => {});
  page.state = {
    ...page.state,
    pagination: {...page.state.pagination, current: 3, pageSize: 20, total: 18},
  };

  const tableWrapper = page.renderTable([organization]) as React.ReactElement<TestIdentityCenterProps>;
  const table = tableWrapper.props.children;
  const toolbar = table.props.title() as React.ReactElement<TestToolbarProps>;

  expect(toolbar.type).toBe(EnterpriseListQueryToolbar);
  expect(toolbar.props.fields.map(field => field.value)).toEqual(["name", "displayName", "websiteUrl", "passwordType", "passwordSalt"]);

  toolbar.props.onFieldChange("websiteUrl");
  expect((page.state as Record<string, unknown>).queryField).toBe("websiteUrl");

  toolbar.props.onFieldChange("name");
  toolbar.props.onKeywordChange("platform");
  toolbar.props.onSearch();

  expect(page.fetch).toHaveBeenLastCalledWith({
    pagination: expect.objectContaining({current: 1, pageSize: 20}),
    searchedColumn: "name",
    searchText: "platform",
  });

  toolbar.props.onReset();

  expect(page.fetch).toHaveBeenLastCalledWith({
    pagination: expect.objectContaining({current: 1, pageSize: 20}),
  });
  expect((page.state as Record<string, unknown>).queryKeyword).toBe("");

  expect(toolbar.props.actions).not.toBeUndefined();
  expect(toolbar.props.context).not.toBeUndefined();
  expect(toolbar.props.showHeader).toBe(false);
});

test("moves password type filtering out of the table header and into query controls", () => {
  const page = createPage(adminAccount);
  page.fetch = jestValue.fn() as unknown as typeof page.fetch;

  const tableWrapper = page.renderTable([organization]) as React.ReactElement<TestIdentityCenterProps>;
  const table = tableWrapper.props.children;
  const columns = table.props.columns;
  const passwordTypeColumn = columns.find(column => column.key === "passwordType");
  expect(passwordTypeColumn?.filters).toBeUndefined();

  const toolbar = table.props.title() as React.ReactElement<TestToolbarProps & {keywordControl?: React.ReactNode}>;
  expect(toolbar.props.fields.map(field => field.value)).toContain("passwordType");

  toolbar.props.onFieldChange("passwordType");
  const passwordTypeToolbar = page.renderListToolbar() as React.ReactElement<TestToolbarProps & {keywordControl?: React.ReactNode}>;
  const keywordControl = passwordTypeToolbar.props.keywordControl as React.ReactElement<{options?: Array<{value: string}>; placeholder?: string}>;
  expect(keywordControl.props.options?.map(option => option.value)).toContain("bcrypt");
  expect(keywordControl.props.placeholder).not.toBe("general:Please select");
  const keywordControlView = render(<>{passwordTypeToolbar.props.keywordControl}</>);
  expect(keywordControlView.getByRole("combobox")).not.toBeNull();
  keywordControlView.unmount();

  passwordTypeToolbar.props.onKeywordChange("bcrypt");
  passwordTypeToolbar.props.onSearch();
  expect(page.fetch).toHaveBeenLastCalledWith({
    pagination: expect.objectContaining({current: 1}),
    searchedColumn: "passwordType",
    searchText: "bcrypt",
  });
});

test("passes create action through shared query toolbar actions", () => {
  const page = createPage(adminAccount);
  page.fetch = jestValue.fn() as unknown as typeof page.fetch;
  jestValue.spyOn(page, "addOrganization").mockImplementation(() => {});

  const identityCenter = page.renderTable([organization]) as React.ReactElement<TestIdentityCenterProps>;
  const toolbar = identityCenter.props.children.props.title() as React.ReactElement<TestToolbarProps>;

  expect(toolbar.type).toBe(EnterpriseListQueryToolbar);
  expect(toolbar.props.actions).not.toBeUndefined();
  expect(identityCenter.props.listAction).toBeUndefined();

  const actionView = render(<>{toolbar.props.actions}</>);
  const addButton = actionView.getByText(/添\s*加|Add/).closest("button");
  expect(addButton).not.toBeNull();
  expect((addButton as HTMLButtonElement).disabled).toBe(false);
  fireEvent.click(addButton);
  expect(page.addOrganization).toHaveBeenCalled();
  actionView.unmount();

  const nonAdminPage = createPage(nonAdminAccount);
  const nonAdminIdentityCenter = nonAdminPage.renderTable([organization]) as React.ReactElement<TestIdentityCenterProps>;
  const nonAdminToolbar = nonAdminIdentityCenter.props.children.props.title() as React.ReactElement<TestToolbarProps>;
  const nonAdminActionView = render(<>{nonAdminToolbar.props.actions}</>);
  expect((nonAdminActionView.getByText(/添\s*加|Add/).closest("button") as HTMLButtonElement).disabled).toBe(true);
});

test("renders concrete advanced filter inputs from organization query fields", () => {
  const page = createPage(adminAccount);
  const toolbar = page.renderListToolbar() as React.ReactElement<TestToolbarProps>;
  const advancedView = render(<>{toolbar.props.advancedFilters}</>);

  expect(advancedView.container.querySelectorAll(".organization-advanced-filter-input")).toHaveLength(4);
  expect(advancedView.container.querySelectorAll(".organization-advanced-filter-select")).toHaveLength(1);
  const advancedFilterLabels = (Array.from(advancedView.container.querySelectorAll(".organization-advanced-filter-label")) as HTMLElement[])
    .map(node => node.textContent);
  expect(advancedFilterLabels).toHaveLength(5);
  expect(advancedFilterLabels.every(label => label?.endsWith(":"))).toBe(true);
  expect(advancedView.getByLabelText(/^(Advanced filters Name|高级筛选 名称)$/)).not.toBeNull();
  expect(advancedView.getByLabelText(/^(Advanced filters Display name|高级筛选 显示名称)$/)).not.toBeNull();
  expect(advancedView.getByLabelText(/^(Advanced filters Website URL|高级筛选 主页地址)$/)).not.toBeNull();
  expect(advancedView.getAllByLabelText(/^(Advanced filters Password type|高级筛选 密码类型)$/).length).toBeGreaterThan(0);
  expect(advancedView.getByLabelText(/^(Advanced filters Password salt|高级筛选 密码Salt值)$/)).not.toBeNull();
  expect(advancedView.queryByText(/^高\s*级\s*筛\s*选$|^Advanced filters$/)).toBeNull();
});

test("applies organization advanced filters with AND semantics and filtered total", async() => {
  const page = createPage(adminAccount);
  const matchingOrganization = {
    ...organization,
    name: "engineering",
    displayName: "Platform Engineering",
    websiteUrl: "https://eng.example.test",
    passwordSalt: "pepper",
  };
  backendMock.getOrganizations.mockResolvedValueOnce({
    status: "ok",
    data: [
      matchingOrganization,
      {
        ...organization,
        name: "engineering-cn",
        displayName: "Engineering China",
        websiteUrl: "https://cn.example.test",
        passwordSalt: "pepper",
      },
      {
        ...organization,
        name: "marketing",
        displayName: "Platform Marketing",
        websiteUrl: "https://marketing.example.test",
        passwordSalt: "pepper",
      },
    ],
    data2: 3,
  });
  page.state = {
    ...page.state,
    pagination: {...page.state.pagination, current: 3, pageSize: 20, total: 3},
  };

  const toolbar = page.renderListToolbar() as React.ReactElement<TestToolbarProps>;
  const advancedView = render(<>{toolbar.props.advancedFilters}</>);

  fireEvent.change(advancedView.getByLabelText(/^(Advanced filters Name|高级筛选 名称)$/), {target: {value: "engineering"}});
  fireEvent.change(advancedView.getByLabelText(/^(Advanced filters Display name|高级筛选 显示名称)$/), {target: {value: "platform"}});
  toolbar.props.onSearch();
  await flushPromises();

  expect(backendMock.getOrganizations).toHaveBeenLastCalledWith("admin", "engineering", "", "", undefined, undefined, undefined, undefined);
  expect(page.state.data).toEqual([matchingOrganization]);
  expect(page.state.pagination).toEqual(expect.objectContaining({
    current: 1,
    total: 1,
  }));
  expect(page.state.searchText).toBeUndefined();
  expect(page.state.searchedColumn).toBeUndefined();
});

test("keeps ordinary table changes on the existing single-field fetch path", () => {
  const page = createPage(adminAccount);
  page.fetch = jestValue.fn() as unknown as typeof page.fetch;
  page.state = {
    ...page.state,
    searchText: "platform",
    searchedColumn: "displayName",
  };

  page.handleTableChange(
    {current: 2, pageSize: 20, total: 3},
    {},
    {field: "displayName", order: "descend"} as Parameters<typeof page.handleTableChange>[2],
    {currentDataSource: [], action: "paginate"} as Parameters<typeof page.handleTableChange>[3]
  );

  expect(page.fetch).toHaveBeenLastCalledWith({
    pagination: expect.objectContaining({current: 2, pageSize: 20}),
    sortField: "displayName",
    sortOrder: "descend",
    searchText: "platform",
    searchedColumn: "displayName",
  });
});

test("keeps organization advanced filters when table pagination and sorting change", async() => {
  const page = createPage(adminAccount);
  const matchingOrganizations = [
    {
      ...organization,
      name: "engineering",
      displayName: "Platform Engineering",
      passwordType: "bcrypt",
    },
    {
      ...organization,
      name: "engineering-cn",
      displayName: "Engineering China",
      passwordType: "bcrypt",
    },
  ];
  backendMock.getOrganizations.mockResolvedValueOnce({
    status: "ok",
    data: [
      ...matchingOrganizations,
      {
        ...organization,
        name: "marketing",
        displayName: "Platform Marketing",
        passwordType: "plain",
      },
    ],
    data2: 3,
  });
  const toolbar = page.renderListToolbar() as React.ReactElement<TestToolbarProps>;
  const advancedView = render(<>{toolbar.props.advancedFilters}</>);

  fireEvent.change(advancedView.getByLabelText(/^(Advanced filters Name|高级筛选 名称)$/), {target: {value: "engineering"}});
  page.handleAdvancedFilterChange("passwordType", "bcrypt");
  page.handleTableChange(
    {current: 2, pageSize: 1, total: 3},
    {},
    {field: "name", order: "ascend"} as Parameters<typeof page.handleTableChange>[2],
    {currentDataSource: [], action: "paginate"} as Parameters<typeof page.handleTableChange>[3]
  );
  await flushPromises();

  expect(backendMock.getOrganizations).toHaveBeenLastCalledWith("admin", "engineering", "", "", undefined, undefined, "name", "ascend");
  expect(page.state.data).toEqual([matchingOrganizations[1]]);
  expect(page.state.pagination).toEqual(expect.objectContaining({
    current: 2,
    pageSize: 1,
    total: 2,
  }));
});

test("combines base query with advanced filters and handles non-string candidate values", async() => {
  const page = createPage(adminAccount);
  const matchingOrganization = {
    ...organization,
    name: "engineering",
    displayName: "Platform Engineering",
    websiteUrl: "https://eng.example.test",
    passwordSalt: ["pepper", "salt"],
  };
  backendMock.getOrganizations.mockResolvedValueOnce({
    status: "ok",
    data: [
      matchingOrganization,
      {
        ...organization,
        name: "engineering-empty-url",
        displayName: "Platform Engineering",
        websiteUrl: null,
        passwordSalt: ["pepper"],
      },
      {
        ...organization,
        name: "engineering-wrong-salt",
        displayName: "Platform Engineering",
        websiteUrl: "https://eng.example.test",
        passwordSalt: null,
      },
    ],
    data2: 3,
  });

  const toolbar = page.renderListToolbar() as React.ReactElement<TestToolbarProps>;
  const advancedView = render(<>{toolbar.props.advancedFilters}</>);

  toolbar.props.onFieldChange("websiteUrl");
  toolbar.props.onKeywordChange("example");
  fireEvent.change(advancedView.getByLabelText(/^(Advanced filters Password salt|高级筛选 密码Salt值)$/), {target: {value: "pepper"}});
  toolbar.props.onSearch();
  await flushPromises();

  expect(page.state.data).toEqual([matchingOrganization]);
  expect(page.state.pagination.total).toBe(1);
  expect(page.state.searchText).toBe("example");
  expect(page.state.searchedColumn).toBe("websiteUrl");
});

test("reports advanced filter request errors and denied responses", async() => {
  const page = createPage(adminAccount);
  const toolbar = page.renderListToolbar() as React.ReactElement<TestToolbarProps>;
  const advancedView = render(<>{toolbar.props.advancedFilters}</>);
  fireEvent.change(advancedView.getByLabelText(/^(Advanced filters Name|高级筛选 名称)$/), {target: {value: "engineering"}});

  backendMock.getOrganizations.mockResolvedValueOnce({status: "error", msg: "advanced failed"});
  toolbar.props.onSearch();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenLastCalledWith("error", "advanced failed");

  backendMock.getOrganizations.mockResolvedValueOnce({status: "error", msg: "Unauthorized operation"});
  toolbar.props.onSearch();
  await flushPromises();
  expect(page.state.isAuthorized).toBe(false);
});

test("resets base and advanced organization filters together", () => {
  const page = createPage(adminAccount);
  page.fetch = jestValue.fn() as unknown as typeof page.fetch;
  const toolbar = page.renderListToolbar() as React.ReactElement<TestToolbarProps>;
  const advancedView = render(<>{toolbar.props.advancedFilters}</>);

  toolbar.props.onFieldChange("websiteUrl");
  toolbar.props.onKeywordChange("example.test");
  fireEvent.change(advancedView.getByLabelText(/^(Advanced filters Name|高级筛选 名称)$/), {target: {value: "engineering"}});
  fireEvent.change(advancedView.getByLabelText(/^(Advanced filters Password salt|高级筛选 密码Salt值)$/), {target: {value: "pepper"}});
  toolbar.props.onReset();

  expect((page.state as Record<string, unknown>).queryField).toBe("name");
  expect((page.state as Record<string, unknown>).queryKeyword).toBe("");
  expect((page.state as Record<string, unknown>).advancedQueryKeywords).toEqual({
    name: "",
    displayName: "",
    websiteUrl: "",
    passwordType: "",
    passwordSalt: "",
  });
  expect(page.fetch).toHaveBeenLastCalledWith({
    pagination: expect.objectContaining({current: 1}),
  });
});

test("disables add action for non-admin accounts", () => {
  const page = createPage(nonAdminAccount);

  const tableWrapper = page.renderTable([organization]) as React.ReactElement<TestIdentityCenterProps>;
  const toolbar = tableWrapper.props.children.props.title() as React.ReactElement<TestToolbarProps>;
  const addActionView = render(<>{toolbar.props.actions}</>);

  expect((addActionView.getByText(/添\s*加|Add/).closest("button") as HTMLButtonElement).disabled).toBe(true);
});
