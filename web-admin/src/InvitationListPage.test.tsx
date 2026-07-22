import {afterEach, beforeEach, expect, test, vi} from "vitest";
import React from "react";
import {render} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import * as Setting from "./Setting";
import * as FormBackend from "./backend/FormBackend";
import * as InvitationBackend from "./backend/InvitationBackend";
import InvitationListPage from "./InvitationListPage";
import {fireEvent} from "@testing-library/react";

type LooseMock = {
  (...args: unknown[]): unknown;
  mockResolvedValue: (value: unknown) => LooseMock;
  mockResolvedValueOnce: (value: unknown) => LooseMock;
  mockRejectedValueOnce: (value: unknown) => LooseMock;
};

type BackendMock = Record<keyof typeof InvitationBackend, LooseMock>;
type FormBackendMock = Record<keyof typeof FormBackend, LooseMock>;

type TestTableColumn = {
  key?: string;
  render?: (text: unknown, record: unknown, index: number) => React.ReactNode;
};

const backendMock = InvitationBackend as unknown as BackendMock;
const formBackendMock = FormBackend as unknown as FormBackendMock;

vi.mock("./backend/InvitationBackend", () => {
  return {
    getInvitations: vi.fn(),
    getInvitation: vi.fn(),
    getInvitationCodeInfo: vi.fn(),
    updateInvitation: vi.fn(),
    addInvitation: vi.fn(),
    deleteInvitation: vi.fn(),
    verifyInvitation: vi.fn(),
    sendInvitation: vi.fn(),
  };
});

vi.mock("./backend/FormBackend", () => {
  return {
    getForm: vi.fn(),
  };
});

const account = {owner: "built-in", tag: "", isAdmin: true};

const invitation = {
  owner: "engineering",
  name: "invite-main",
  updatedTime: "2026-06-19T09:00:00Z",
  displayName: "Main invitation",
  code: "main-code",
  defaultCode: "main-code",
  quota: 5,
  usedCount: 1,
  application: "All",
  username: "",
  email: "user@example.com",
  phone: "123456789",
  signupGroup: "",
  state: "Active",
};

function flushPromises() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

function createHistory() {
  return {
    push: vi.fn(),
  };
}

function createPage() {
  const page = new InvitationListPage({
    account,
    history: createHistory(),
    match: {path: "/invitations", params: {}},
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
      <InvitationListPage
        account={account}
        history={createHistory()}
        match={{path: "/invitations", params: {}}}
      />
    </MemoryRouter>
  );
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("organization", "engineering");
  vi.spyOn(Setting, "showMessage").mockImplementation(() => {});
  vi.spyOn(Setting, "getRandomName").mockReturnValue("abc123");
  vi.spyOn(Math, "random").mockReturnValue(0.123456789);
  formBackendMock.getForm.mockResolvedValue({status: "ok", data: {formItems: []}});
  backendMock.getInvitations.mockResolvedValue({
    status: "ok",
    data: [],
    data2: 0,
  });
  backendMock.addInvitation.mockResolvedValue({status: "ok"});
  backendMock.deleteInvitation.mockResolvedValue({status: "ok"});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

test("renders invitation rows and fetches the selected organization", async() => {
  backendMock.getInvitations.mockResolvedValue({
    status: "ok",
    data: [invitation],
    data2: 1,
  });

  const view = renderPage();

  expect(await view.findByText("invite-main")).not.toBeNull();
  expect(view.getByText("engineering")).not.toBeNull();
  expect(backendMock.getInvitations).toHaveBeenCalledWith("engineering", expect.any(Number), expect.any(Number), undefined, undefined, undefined, undefined);
  expect(formBackendMock.getForm).toHaveBeenCalled();
});

test("creates an in-memory invitation draft and navigates to edit page without persisting it", () => {
  const history = createHistory();
  const page = new InvitationListPage({
    account,
    history,
    match: {path: "/invitations", params: {}},
  });

  expect(page.newInvitation()).toEqual(expect.objectContaining({
    owner: "engineering",
    name: "invitation_abc123",
    displayName: "New Invitation - abc123",
    quota: 1,
    usedCount: 0,
    application: "All",
    state: "Active",
  }));

  page.addInvitation();

  expect(backendMock.addInvitation).not.toHaveBeenCalled();
  expect(history.push).toHaveBeenCalledWith(expect.objectContaining({
    pathname: "/invitations/engineering/invitation_abc123",
    state: expect.objectContaining({
      mode: "add",
      invitation: expect.objectContaining({
        owner: "engineering",
        name: "invitation_abc123",
        defaultCode: expect.any(String),
      }),
    }),
  }));
  expect(Setting.showMessage).not.toHaveBeenCalled();
});

test("fetches all organizations when default organization is selected", async() => {
  localStorage.setItem("organization", "All");
  const page = createPage();

  page.fetch({pagination: {...page.state.pagination, current: 3, pageSize: 50}});
  await flushPromises();

  expect(backendMock.getInvitations).toHaveBeenCalledWith("", 3, 50, undefined, undefined, undefined, undefined);
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

  expect(backendMock.getInvitations).toHaveBeenLastCalledWith("engineering", 1, 20, "name", "main", "name", "ascend");

  page.fetch({
    pagination: {...page.state.pagination, current: 1, pageSize: 20},
    type: "signup",
  });
  await flushPromises();

  expect(backendMock.getInvitations).toHaveBeenLastCalledWith("engineering", 1, 20, "type", "signup", undefined, undefined);
});

test("uses existing pagination and normalizes string totals when params are omitted", async() => {
  const page = createPage();
  backendMock.getInvitations.mockResolvedValueOnce({
    status: "ok",
    data: undefined,
    data2: "12",
  });
  page.state = {
    ...page.state,
    pagination: {...page.state.pagination, current: 4, pageSize: 25, total: 0},
  };

  page.fetch();
  await flushPromises();

  expect(backendMock.getInvitations).toHaveBeenLastCalledWith("engineering", 4, 25, undefined, undefined, undefined, undefined);
  expect(page.state.data).toEqual([]);
  expect(page.state.pagination.total).toBe(12);
});

test("deletes invitation and rolls back pagination for the last row", async() => {
  const page = createPage();
  page.fetch = vi.fn() as unknown as typeof page.fetch;
  page.state = {
    ...page.state,
    data: [invitation],
    pagination: {...page.state.pagination, current: 2},
  };

  page.deleteInvitation(0);
  await flushPromises();

  expect(backendMock.deleteInvitation).toHaveBeenCalledWith(expect.objectContaining({name: "invite-main"}));
  expect(page.fetch).toHaveBeenCalledWith(expect.objectContaining({
    pagination: expect.objectContaining({current: 1}),
  }));
  expect(Setting.showMessage).toHaveBeenCalledWith("success", expect.any(String));
});

test("reports delete failures", async() => {
  const page = createPage();
  page.state = {
    ...page.state,
    data: [invitation],
  };
  backendMock.deleteInvitation.mockResolvedValueOnce({status: "error", msg: "delete failed"});
  backendMock.deleteInvitation.mockRejectedValueOnce(new Error("delete network"));

  page.deleteInvitation(0);
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete failed"));

  page.deleteInvitation(0);
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete network"));
});

test("builds table columns, actions and toolbar without changing handlers", () => {
  const history = createHistory();
  const page = new InvitationListPage({
    account,
    history,
    match: {path: "/invitations", params: {}},
  });
  vi.spyOn(page, "deleteInvitation").mockImplementation(() => {});
  vi.spyOn(page, "addInvitation").mockImplementation(() => {});

  const tableWrapper = page.renderTable([invitation]) as React.ReactElement<{children: React.ReactElement<{columns: TestTableColumn[]; title: () => React.ReactNode}>}>;
  const table = tableWrapper.props.children;
  const columns = table.props.columns;

  const tableView = render(<MemoryRouter>{tableWrapper}</MemoryRouter>);
  expect(tableView.container.querySelector(".enterprise-list-page-table-shell.invitation-list-page-table-shell")).not.toBeNull();
  expect(tableView.container.querySelector(".ant-table")).not.toBeNull();
  tableView.unmount();

  expect(columns[0].key).toBe("name");
  expect(columns[1].key).toBe("owner");
  const stateColumn = columns.find(column => column.key === "state");
  expect(stateColumn?.render?.("Active", invitation, 0)).not.toBeNull();
  expect(stateColumn?.render?.("Suspended", invitation, 0)).not.toBeNull();
  expect(stateColumn?.render?.("Unknown", invitation, 0)).toBeNull();

  const actionNode = columns.find(column => column.key === "op")?.render?.(undefined, invitation, 0) as React.ReactElement;
  const actionView = render(<>{actionNode}</>);
  fireEvent.click(actionView.getByText(/编\s*辑|Edit/));
  expect(history.push).toHaveBeenCalledWith("/invitations/engineering/invite-main");
  const actionChildren = React.Children.toArray(actionNode.props.children) as React.ReactElement<{onConfirm: () => void}>[];
  actionChildren[1].props.onConfirm();
  expect(page.deleteInvitation).toHaveBeenCalledWith(0);
  actionView.unmount();

  const toolbarView = render(<>{table.props.title()}</>);
  expect(toolbarView.container.querySelector(".enterprise-list-query-toolbar")).not.toBeNull();
  expect(toolbarView.container.querySelector(".enterprise-list-query-toolbar-title")?.textContent).toMatch(/邀请|Invitations/);
  expect(toolbarView.getByText(/添\s*加|Add/).closest(".enterprise-list-query-toolbar-actions")).not.toBeNull();
  expect(toolbarView.container.querySelector(".enterprise-list-query-toolbar-header-meta")?.className).toContain("enterprise-list-query-toolbar-header-meta-top-right");
  fireEvent.click(toolbarView.getByText(/添\s*加|Add/));
  expect(page.addInvitation).toHaveBeenCalled();
  toolbarView.unmount();
});

test("uses a non-fixed action column on mobile", () => {
  vi.spyOn(Setting, "isMobile").mockReturnValue(true);
  const page = createPage();

  const tableWrapper = page.renderTable([invitation]) as React.ReactElement<{children: React.ReactElement<{columns: TestTableColumn[]}>}>;
  const table = tableWrapper.props.children;
  const columns = table.props.columns;

  expect(columns.find(column => column.key === "op")).toEqual(expect.objectContaining({fixed: false}));
});

test("renders unauthorized state when invitation list request is denied", async() => {
  backendMock.getInvitations.mockResolvedValue({
    status: "error",
    msg: "Unauthorized operation",
  });

  const view = renderPage();

  expect(await view.findByText("403 Unauthorized")).not.toBeNull();
  expect(Setting.showMessage).not.toHaveBeenCalledWith("error", "Unauthorized operation");
});

test("reports list fetch server errors", async() => {
  const page = createPage();
  backendMock.getInvitations.mockResolvedValueOnce({
    status: "error",
    msg: "list failed",
  });

  page.fetch();
  await flushPromises();

  expect(Setting.showMessage).toHaveBeenCalledWith("error", "list failed");
});
