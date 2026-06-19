/* eslint-env jest */
import React from "react";
import {expect as jestExpect, jest as jestValue} from "@jest/globals";
import {cleanup, render} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import * as Setting from "./Setting";
import * as FormBackend from "./backend/FormBackend";
import * as OrganizationBackend from "./backend/OrganizationBackend";
import OrganizationListPage from "./OrganizationListPage";

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
  render?: (text: unknown, record: TestOrganizationRecord, index: number) => React.ReactNode;
};

const backendMock = OrganizationBackend as unknown as BackendMock;
const formBackendMock = FormBackend as unknown as FormBackendMock;
const expect = jestExpect;
const {fireEvent} = require("@testing-library/react") as {
  fireEvent: {
    click: (element: Element | null) => boolean;
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

test("passes search, password type filter and sorting parameters to backend", async() => {
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
    passwordType: ["bcrypt"],
  });
  await flushPromises();

  expect(backendMock.getOrganizations).toHaveBeenLastCalledWith("admin", "engineering", 1, 20, "passwordType", ["bcrypt"], undefined, undefined);
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

  const tableWrapper = page.renderTable([organization]) as React.ReactElement<{children: React.ReactElement<{columns: TestTableColumn[]; title: () => React.ReactNode}>}>;
  const table = tableWrapper.props.children;
  const columns = table.props.columns;

  expect(columns[0].key).toBe("name");
  expect(columns[13].fixed).toBe("right");

  const actionNode = columns[13].render?.(undefined, organization, 0) as React.ReactElement<{children: React.ReactNode}>;
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

  const blockedActionNode = columns[13].render?.(undefined, {...organization, name: "built-in"}, 0) as React.ReactElement<{children: React.ReactNode}>;
  const blockedActionChildren = React.Children.toArray(blockedActionNode.props.children) as React.ReactElement[];
  expect(blockedActionChildren[3].props.disabled).toBe(true);

  const toolbarView = render(<>{table.props.title()}</>);
  fireEvent.click(toolbarView.getByText(/添\s*加|Add/));
  expect(page.addOrganization).toHaveBeenCalled();
});

test("disables add action for non-admin accounts", () => {
  const page = createPage(nonAdminAccount);

  const tableWrapper = page.renderTable([organization]) as React.ReactElement<{children: React.ReactElement<{title: () => React.ReactNode}>}>;
  const table = tableWrapper.props.children;
  const toolbarView = render(<>{table.props.title()}</>);

  expect(toolbarView.getByText(/添\s*加|Add/).closest("button")?.hasAttribute("disabled")).toBe(true);
});
