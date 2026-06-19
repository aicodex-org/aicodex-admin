/* eslint-env jest */
import React from "react";
import {expect as jestExpect, jest as jestValue} from "@jest/globals";
import {render} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import * as Setting from "./Setting";
import * as FormBackend from "./backend/FormBackend";
import * as InvitationBackend from "./backend/InvitationBackend";
import type {InvitationRecord} from "./backend/InvitationBackend";
import InvitationListPage from "./InvitationListPage";

declare const jest: typeof jestValue;

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
  render?: (text: unknown, record: InvitationRecord, index: number) => React.ReactNode;
};

const {fireEvent} = require("@testing-library/react") as {
  fireEvent: {
    click: (element: Element | null) => boolean;
  };
};

const backendMock = InvitationBackend as unknown as BackendMock;
const formBackendMock = FormBackend as unknown as FormBackendMock;
const expect = jestExpect;

jest.mock("./backend/InvitationBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    getInvitations: factoryJest.fn(),
    getInvitation: factoryJest.fn(),
    getInvitationCodeInfo: factoryJest.fn(),
    updateInvitation: factoryJest.fn(),
    addInvitation: factoryJest.fn(),
    deleteInvitation: factoryJest.fn(),
    verifyInvitation: factoryJest.fn(),
    sendInvitation: factoryJest.fn(),
  };
});

jest.mock("./backend/FormBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    getForm: factoryJest.fn(),
  };
});

const account = {owner: "built-in", tag: "", isAdmin: true};

const invitation: InvitationRecord = {
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
    push: jestValue.fn(),
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
  jestValue.spyOn(Setting, "showMessage").mockImplementation(() => {});
  jestValue.spyOn(Setting, "getRandomName").mockReturnValue("abc123");
  jestValue.spyOn(Math, "random").mockReturnValue(0.123456789);
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
  jestValue.restoreAllMocks();
  jestValue.clearAllMocks();
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

test("creates a default invitation and navigates to edit page", async() => {
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
  await flushPromises();

  expect(backendMock.addInvitation).toHaveBeenCalledWith(expect.objectContaining({
    owner: "engineering",
    name: "invitation_abc123",
    defaultCode: expect.any(String),
  }));
  expect(history.push).toHaveBeenCalledWith({pathname: "/invitations/engineering/invitation_abc123", mode: "add"});
  expect(Setting.showMessage).toHaveBeenCalledWith("success", expect.any(String));
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
  page.fetch = jestValue.fn() as unknown as typeof page.fetch;
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

test("reports add and delete failures", async() => {
  const page = createPage();
  page.state = {
    ...page.state,
    data: [invitation],
  };
  backendMock.addInvitation.mockResolvedValueOnce({status: "error", msg: "add failed"});
  backendMock.addInvitation.mockRejectedValueOnce(new Error("add network"));
  backendMock.deleteInvitation.mockResolvedValueOnce({status: "error", msg: "delete failed"});
  backendMock.deleteInvitation.mockRejectedValueOnce(new Error("delete network"));

  page.addInvitation();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("add failed"));

  page.addInvitation();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("add network"));

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
  jestValue.spyOn(page, "deleteInvitation").mockImplementation(() => {});
  jestValue.spyOn(page, "addInvitation").mockImplementation(() => {});

  const tableWrapper = page.renderTable([invitation]) as React.ReactElement<{children: React.ReactElement<{columns: TestTableColumn[]; title: () => React.ReactNode}>}>;
  const table = tableWrapper.props.children;
  const columns = table.props.columns;

  expect(columns[0].key).toBe("name");
  expect(columns[1].key).toBe("owner");
  expect(columns[10].render?.("Active", invitation, 0)).not.toBeNull();
  expect(columns[10].render?.("Suspended", invitation, 0)).not.toBeNull();
  expect(columns[10].render?.("Unknown", invitation, 0)).toBeNull();

  const actionNode = columns[11].render?.(undefined, invitation, 0) as React.ReactElement;
  const actionView = render(<>{actionNode}</>);
  fireEvent.click(actionView.getByText(/编\s*辑|Edit/));
  expect(history.push).toHaveBeenCalledWith("/invitations/engineering/invite-main");
  const actionChildren = React.Children.toArray(actionNode.props.children) as React.ReactElement<{onConfirm: () => void}>[];
  actionChildren[1].props.onConfirm();
  expect(page.deleteInvitation).toHaveBeenCalledWith(0);
  actionView.unmount();

  const toolbarView = render(<>{table.props.title()}</>);
  fireEvent.click(toolbarView.getByText(/添\s*加|Add/));
  expect(page.addInvitation).toHaveBeenCalled();
  toolbarView.unmount();
});

test("uses a non-fixed action column on mobile", () => {
  jestValue.spyOn(Setting, "isMobile").mockReturnValue(true);
  const page = createPage();

  const tableWrapper = page.renderTable([invitation]) as React.ReactElement<{children: React.ReactElement<{columns: TestTableColumn[]}>}>;
  const table = tableWrapper.props.children;
  const columns = table.props.columns;

  expect(columns[11]).toEqual(expect.objectContaining({fixed: false}));
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
