import {afterEach, beforeEach, expect, test, vi} from "vitest";
import React from "react";
import * as fs from "fs";
import * as path from "path";
import {cleanup, render} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import TransactionListPage from "./TransactionListPage";
import TransactionEditPage from "./TransactionEditPage";
import TransactionTable from "./table/TransactionTable";
import {getTransactionTableColumns} from "./table/TransactionTableColumns";
import * as TransactionBackend from "./backend/TransactionBackend";
import * as OrganizationBackend from "./backend/OrganizationBackend";
import * as ApplicationBackend from "./backend/ApplicationBackend";
import * as UserBackend from "./backend/UserBackend";
import * as Setting from "./Setting";
import type {LegacyAny} from "./types/legacyPage";
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
  mockClear: () => LooseMock;
};
type TransactionBackendMock = Record<keyof typeof TransactionBackend, LooseMock>;
type OrganizationBackendMock = Record<keyof typeof OrganizationBackend, LooseMock>;
type ApplicationBackendMock = Record<keyof typeof ApplicationBackend, LooseMock>;
type UserBackendMock = Record<keyof typeof UserBackend, LooseMock>;
type TransactionRecord = import("./types/businessPayment").TransactionRecord;
type TestStatePatch = Record<string, unknown> | ((state: Record<string, unknown>, props?: Record<string, unknown>) => Record<string, unknown> | null) | null;
type Harness<T> = T & {
  props: Record<string, LegacyAny>;
  state: Record<string, LegacyAny>;
  setState: (patch: TestStatePatch, callback?: () => void) => void;
  fetch: LooseMock;
  getColumnSearchProps: LooseMock;
  getTablePaginationProps: LooseMock;
  handleTableChange: LooseMock;
};

const transactionBackendMock = TransactionBackend as unknown as TransactionBackendMock;
const organizationBackendMock = OrganizationBackend as unknown as OrganizationBackendMock;
const applicationBackendMock = ApplicationBackend as unknown as ApplicationBackendMock;
const userBackendMock = UserBackend as unknown as UserBackendMock;

vi.mock("i18next", () => ({
  __esModule: true,
  default: {
    language: "en",
    use() {
      return this;
    },
    init() {
      return this;
    },
    changeLanguage() {
      return Promise.resolve();
    },
    t: (key: string) => key.includes(":") ? key.split(":").pop() : key,
  },
}));

vi.mock("./backend/TransactionBackend", () => {
  return {
    addTransaction: vi.fn(),
    deleteTransaction: vi.fn(),
    getTransaction: vi.fn(),
    getTransactions: vi.fn(),
    updateTransaction: vi.fn(),
  };
});

vi.mock("./backend/OrganizationBackend", () => {
  return {
    getOrganizations: vi.fn(),
  };
});

vi.mock("./backend/ApplicationBackend", () => {
  return {
    getApplicationsByOrganization: vi.fn(),
  };
});

vi.mock("./backend/UserBackend", () => {
  return {
    getUsers: vi.fn(),
  };
});

vi.mock("./common/modal/PopconfirmModal", async() => {
  const ReactFactory = await vi.importActual<typeof import("react")>("react");
  return {
    __esModule: true,
    default: (props: {disabled?: boolean; onConfirm?: () => void; text?: string; children?: React.ReactNode}) => ReactFactory.createElement(
      "button",
      {
        type: "button",
        disabled: props.disabled,
        onClick: props.onConfirm,
      },
      props.text || props.children || "Delete"
    ),
  };
});

vi.mock("./common/PaginateSelect", async() => {
  const ReactFactory = await vi.importActual<typeof import("react")>("react");
  return {
    __esModule: true,
    default: (props: {
      value?: string;
      disabled?: boolean;
      buildFetchArgs?: (args: {page: number; pageSize: number; searchText: string}) => unknown[];
      optionMapper?: (user: {name: string}) => unknown;
      onChange?: (value: string) => void;
    }) => ReactFactory.createElement(
      "select",
      {
        "aria-label": "PaginateSelect",
        value: props.value || "",
        disabled: props.disabled,
        "data-fetch-args": JSON.stringify(props.buildFetchArgs?.({page: 1, pageSize: 10, searchText: "ali"})),
        "data-option": JSON.stringify(props.optionMapper?.({name: "alice"})),
        onChange: (event: React.ChangeEvent<HTMLSelectElement>) => props.onChange?.(event.target.value),
      },
      ReactFactory.createElement("option", {value: ""}, "(empty)"),
      ReactFactory.createElement("option", {value: "alice"}, "alice")
    ),
  };
});

const account = {owner: "built-in", name: "admin", tag: "", isAdmin: true, signupApplication: "app_main"};
const transaction: TransactionRecord = {
  owner: "built-in",
  name: "tx_123",
  createdTime: "2026-06-20T10:00:00Z",
  application: "app_main",
  domain: "https://example.test",
  category: "Usage",
  type: "chat_1",
  subtype: "message_1",
  provider: "provider_chatgpt",
  user: "alice",
  tag: "User",
  amount: 12.5,
  currency: "USD",
  payment: "payment_123",
  state: "Paid",
};

function newTestPage<T>(Page: unknown, props: Record<string, LegacyAny>): T {
  return new (Page as new(props: Record<string, LegacyAny>) => T)(props);
}

function cloneFixture<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function flushPromises() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

async function flushAsyncWork() {
  await flushPromises();
  await flushPromises();
}

function createHistory() {
  return {
    push: vi.fn(),
  };
}

function installSynchronousSetState<T>(page: Harness<T>) {
  page.setState = ((stateUpdate: TestStatePatch, callback?: () => void) => {
    const patch = typeof stateUpdate === "function" ? stateUpdate(page.state, page.props) : stateUpdate;
    if (patch !== null) {
      page.state = {
        ...page.state,
        ...patch,
      };
    }
    callback?.();
  }) as typeof page.setState;
}

function collectElements(node: React.ReactNode, predicate: (element: React.ReactElement<Record<string, LegacyAny>>) => boolean) {
  const matches: React.ReactElement<Record<string, LegacyAny>>[] = [];

  function visit(child: React.ReactNode) {
    if (!React.isValidElement<Record<string, LegacyAny>>(child)) {
      return;
    }
    if (predicate(child)) {
      matches.push(child);
    }
    if (child.props.title) {
      visit(child.props.title);
    }
    React.Children.forEach(child.props.children, visit);
  }

  visit(node);
  return matches;
}

function expectRenderedLink(node: React.ReactNode, text: string, href: string) {
  const view = render(<MemoryRouter>{node}</MemoryRouter>);
  expect(view.getByText(text).closest("a")?.getAttribute("href")).toBe(href);
  view.unmount();
}

function createTransactionListPage(props: Record<string, LegacyAny> = {}) {
  const page = newTestPage<TransactionListPage>(TransactionListPage, {
    account,
    history: createHistory(),
    match: {path: "/transactions", params: {}},
    ...props,
  }) as unknown as Harness<TransactionListPage>;
  installSynchronousSetState(page);
  page.state = {...page.state, data: [cloneFixture(transaction)], pagination: {current: 2, pageSize: 10, total: 1}, loading: false};
  page.getColumnSearchProps = vi.fn(() => ({})) as unknown as LooseMock;
  page.getTablePaginationProps = vi.fn(() => false) as unknown as LooseMock;
  page.handleTableChange = vi.fn() as unknown as LooseMock;
  return page;
}

function createTransactionEditPage(props: Record<string, LegacyAny> = {}) {
  const page = new TransactionEditPage({
    account,
    history: createHistory(),
    match: {params: {organizationName: "built-in", transactionName: "tx_123"}},
    location: {mode: "edit"},
    ...props,
  }) as unknown as Harness<TransactionEditPage>;
  installSynchronousSetState(page);
  page.state = {
    ...page.state,
    transaction: cloneFixture(transaction),
    organizations: [{name: "built-in"}, {name: "tenant-a"}],
    applications: [{name: "app_main"}, {name: "app_secondary"}],
    users: [{name: "alice"}],
  };
  return page;
}

beforeEach(() => {
  cleanup();
  window.history.pushState({}, "", "/");
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: () => ({
      matches: false,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
  vi.spyOn(Setting, "showMessage").mockImplementation(() => {});
  vi.spyOn(Setting, "getRequestOrganization").mockReturnValue("built-in");
  vi.spyOn(Setting, "isDefaultOrganizationSelected").mockReturnValue(false);
  vi.spyOn(Setting, "isLocalAdminUser").mockReturnValue(true);
  vi.spyOn(Setting, "isAdminUser").mockReturnValue(true);
  vi.spyOn(Setting, "isMobile").mockReturnValue(false);
  vi.spyOn(Setting, "isAnonymousUserName").mockImplementation((value: string) => value === "anonymous");
  vi.spyOn(Setting, "getFormattedDate").mockImplementation((value: LegacyAny) => `formatted:${value}`);
  vi.spyOn(Setting, "getPriceDisplay").mockImplementation(((value: LegacyAny, currency: LegacyAny) => `$${value} (${currency})`) as LegacyAny);
  vi.spyOn(Setting, "getLabel").mockImplementation(((label: LegacyAny) => `${label}`) as LegacyAny);
  vi.spyOn(Setting, "getOption").mockImplementation((label: string, value: string) => ({label, value}));
  vi.spyOn(Setting, "scrollToDiv").mockImplementation(() => {});
  transactionBackendMock.addTransaction.mockResolvedValue({status: "ok", data: "tx_new"});
  transactionBackendMock.deleteTransaction.mockResolvedValue({status: "ok"});
  transactionBackendMock.getTransaction.mockResolvedValue({status: "ok", data: cloneFixture(transaction)});
  transactionBackendMock.getTransactions.mockResolvedValue({status: "ok", data: [cloneFixture(transaction)], data2: 1});
  transactionBackendMock.updateTransaction.mockResolvedValue({status: "ok"});
  organizationBackendMock.getOrganizations.mockResolvedValue({status: "ok", data: [{name: "built-in"}, {name: "tenant-a"}]});
  applicationBackendMock.getApplicationsByOrganization.mockResolvedValue({status: "ok", data: [{name: "app_main"}]});
  userBackendMock.getUsers.mockResolvedValue({status: "ok", data: [{name: "alice"}]});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  cleanup();
});

test("uses TSX files for migrated transaction pages and table", () => {
  const srcDir = testFileDirectory;
  [
    "TransactionListPage",
    "TransactionEditPage",
    path.join("table", "TransactionTable"),
    path.join("table", "TransactionTableColumns"),
  ].forEach(file => {
    expect(fs.existsSync(path.join(srcDir, `${file}.tsx`))).toBe(true);
    expect(fs.existsSync(path.join(srcDir, `${file}.js`))).toBe(false);
  });
});

test("keeps transaction list creation recharge fetch table actions and failures stable", async() => {
  const history = createHistory();
  const page = createTransactionListPage({history});

  expect(page.newTransaction()).toEqual(expect.objectContaining({owner: "built-in", application: "app-built-in", amount: 0.1, state: "Paid"}));
  page.addTransaction();
  await flushAsyncWork();
  expect(transactionBackendMock.addTransaction).toHaveBeenCalledWith(expect.objectContaining({owner: "built-in", category: ""}));
  expect(history.push).toHaveBeenCalledWith({pathname: "/transactions/built-in/tx_new", mode: "add"});

  page.rechargeTransaction();
  await flushAsyncWork();
  expect(transactionBackendMock.addTransaction).toHaveBeenLastCalledWith(expect.objectContaining({category: "Recharge", application: "app_main", user: "admin", amount: 100}));
  expect(history.push).toHaveBeenLastCalledWith({pathname: "/transactions/built-in/tx_new", mode: "recharge"});

  const actualFetch = page.fetch;
  page.fetch = vi.fn() as unknown as LooseMock;
  page.deleteTransaction(0);
  await flushAsyncWork();
  expect(transactionBackendMock.deleteTransaction).toHaveBeenCalledWith(expect.objectContaining({name: "tx_123"}));
  expect(page.fetch).toHaveBeenCalledWith(expect.objectContaining({pagination: expect.objectContaining({current: 1})}));

  page.fetch = actualFetch;
  transactionBackendMock.getTransactions.mockResolvedValueOnce({status: "ok", data: [cloneFixture(transaction)], data2: 1});
  page.fetch({pagination: {current: 3, pageSize: 20}, type: "chat_1"});
  await flushAsyncWork();
  expect(transactionBackendMock.getTransactions).toHaveBeenLastCalledWith("built-in", 3, 20, "type", "chat_1", undefined, undefined);

  vi.spyOn(Setting, "isDefaultOrganizationSelected").mockReturnValueOnce(true);
  transactionBackendMock.getTransactions.mockResolvedValueOnce({status: "ok", data: [cloneFixture(transaction)], data2: 1});
  page.fetch({pagination: {current: 1, pageSize: 10}, searchedColumn: "provider", searchText: "provider_chatgpt"});
  await flushAsyncWork();
  expect(transactionBackendMock.getTransactions).toHaveBeenLastCalledWith("", 1, 10, "provider", "provider_chatgpt", undefined, undefined);

  transactionBackendMock.addTransaction.mockResolvedValueOnce({status: "error", msg: "add failed"});
  page.addTransaction();
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "Failed to add: add failed");
  transactionBackendMock.addTransaction.mockRejectedValueOnce(new Error("add network"));
  page.rechargeTransaction();
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("add network"));

  transactionBackendMock.deleteTransaction.mockResolvedValueOnce({status: "error", msg: "delete failed"});
  page.deleteTransaction(0);
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "Failed to delete: delete failed");
  transactionBackendMock.deleteTransaction.mockRejectedValueOnce(new Error("delete network"));
  page.deleteTransaction(0);
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete network"));

  transactionBackendMock.getTransactions.mockResolvedValueOnce({status: "error", msg: "list denied"});
  page.fetch({pagination: {current: 1, pageSize: 10}});
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "list denied");
  vi.spyOn(Setting, "isResponseDenied").mockReturnValueOnce(true);
  transactionBackendMock.getTransactions.mockResolvedValueOnce({status: "error", msg: "denied"});
  page.fetch({pagination: {current: 1, pageSize: 10}});
  await flushAsyncWork();
  expect(page.state.isAuthorized).toBe(false);

  const table = page.renderTable([transaction]) as React.ReactElement<{children: React.ReactElement<{columns: Array<{key?: string; render?: LegacyAny}>; title: () => React.ReactNode}>}>;
  const tableElement = React.Children.toArray(table.props.children)[0] as React.ReactElement<{columns: Array<{key?: string; render?: LegacyAny}>; title: () => React.ReactNode}>;
  expect(tableElement.props.columns.find(column => column.key === "createdTime")?.render?.("2026-06-20T10:00:00Z", transaction, 0)).toBe("formatted:2026-06-20T10:00:00Z");
  const toolbar = render(<>{tableElement.props.title()}</>);
  expect((toolbar.getByText("Add").closest("button") as HTMLButtonElement | null)?.disabled).toBe(false);
  expect((toolbar.getByText("Recharge").closest("button") as HTMLButtonElement | null)?.disabled).toBe(false);
  toolbar.unmount();
});

test("keeps transaction edit loading recharge form save delete and null guards stable", async() => {
  const history = createHistory();
  const page = createTransactionEditPage({history, location: {mode: "recharge"}});

  page.getTransaction();
  await flushAsyncWork();
  expect(transactionBackendMock.getTransaction).toHaveBeenCalledWith("built-in", "tx_123");
  expect(Setting.scrollToDiv).toHaveBeenCalledWith("invoice-area");

  transactionBackendMock.getTransaction.mockResolvedValueOnce({status: "ok", data: null});
  page.getTransaction();
  await flushAsyncWork();
  expect(history.push).toHaveBeenCalledWith("/404");

  transactionBackendMock.getTransaction.mockResolvedValueOnce({status: "error", msg: "load failed", data: cloneFixture(transaction)});
  page.getTransaction();
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "load failed");
  transactionBackendMock.getTransaction.mockRejectedValueOnce(new Error("load network"));
  page.getTransaction();
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("load network"));

  page.getOrganizations();
  page.getApplications("tenant-a");
  await flushAsyncWork();
  expect(organizationBackendMock.getOrganizations).toHaveBeenCalledWith("admin");
  expect(applicationBackendMock.getApplicationsByOrganization).toHaveBeenCalledWith("admin", "tenant-a");

  organizationBackendMock.getOrganizations.mockResolvedValueOnce({status: "error", msg: "org failed"});
  page.getOrganizations();
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "org failed");
  organizationBackendMock.getOrganizations.mockRejectedValueOnce(new Error("org network"));
  page.getOrganizations();
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("org network"));
  applicationBackendMock.getApplicationsByOrganization.mockRejectedValueOnce(new Error("apps network"));
  page.getApplications("tenant-a");
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("apps network"));

  expect(page.parseTransactionField("amount", "not-a-number")).toBe(0);
  page.updateTransactionField("amount", "42.5");
  expect(page.state.transaction!.amount).toBe(42.5);

  const editTree = page.renderTransaction();
  const paginateSelect = collectElements(editTree, element => Boolean(element.props.buildFetchArgs))[0];
  expect(paginateSelect.props.buildFetchArgs({page: 1, pageSize: 10, searchText: "ali"})).toEqual(["built-in", 1, 10, "name", "ali"]);
  expect(paginateSelect.props.optionMapper({name: "alice"})).toEqual({label: "alice", value: "alice"});
  const ownerSelect = collectElements(editTree, element => element.props.value === "built-in" && typeof element.props.onChange === "function")[0];
  ownerSelect.props.onChange("tenant-a");
  expect(page.state.transaction!.owner).toBe("tenant-a");
  expect(page.state.transaction!.application).toBe("");
  const appSelect = collectElements(editTree, element => element.props.value === "app_main" && typeof element.props.onChange === "function")[0];
  appSelect.props.onChange("app_secondary");
  expect(page.state.transaction!.application).toBe("app_secondary");
  const tagSelect = collectElements(editTree, element => element.props.value === "User" && typeof element.props.onChange === "function")[0];
  tagSelect.props.onChange("Organization");
  expect(page.state.transaction!.tag).toBe("Organization");
  expect(page.state.transaction!.user).toBe("");
  const amountInput = collectElements(editTree, element => element.props.value === 42.5 && typeof element.props.onChange === "function")[0];
  amountInput.props.onChange(88);
  expect(page.state.transaction!.amount).toBe(88);
  const currencySelect = collectElements(editTree, element => element.props.value === "USD" && typeof element.props.onChange === "function")[0];
  currencySelect.props.onChange("CNY");
  expect(page.state.transaction!.currency).toBe("CNY");
  const rechargeView = render(<MemoryRouter>{page.render()}</MemoryRouter>);
  fireEvent.change(rechargeView.getByLabelText("PaginateSelect"), {target: {value: "alice"}});
  expect(page.state.transaction!.user).toBe("alice");
  fireEvent.click(rechargeView.getAllByText("Save")[0]);
  fireEvent.click(rechargeView.getAllByText("Save & Exit")[0]);
  fireEvent.click(rechargeView.getAllByText("Cancel")[0]);
  await flushAsyncWork();
  expect(transactionBackendMock.updateTransaction).toHaveBeenCalledWith("tenant-a", "tx_123", expect.objectContaining({amount: 88, currency: "CNY"}));
  expect(transactionBackendMock.deleteTransaction).toHaveBeenCalledWith(expect.objectContaining({name: "tx_123"}));
  rechargeView.unmount();

  transactionBackendMock.updateTransaction.mockResolvedValueOnce({status: "error", msg: "save failed"});
  page.submitTransactionEdit(false);
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "Failed to save: save failed");
  transactionBackendMock.updateTransaction.mockRejectedValueOnce(new Error("save network"));
  page.submitTransactionEdit(false);
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("save network"));

  transactionBackendMock.deleteTransaction.mockResolvedValueOnce({status: "error", msg: "delete failed"});
  page.deleteTransaction();
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "Failed to delete: delete failed");
  transactionBackendMock.deleteTransaction.mockRejectedValueOnce(new Error("delete network"));
  page.deleteTransaction();
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete network"));

  page.setState({transaction: null});
  expect(page.renderTransaction()).toBeNull();
  page.updateTransactionField("amount", "9");
  page.submitTransactionEdit(false);
  page.deleteTransaction();

  const readonlyPage = createTransactionEditPage({location: {mode: "edit"}});
  const readonlyView = render(<MemoryRouter>{readonlyPage.render()}</MemoryRouter>);
  expect(readonlyView.getAllByDisplayValue("built-in").length).toBeGreaterThan(0);
  readonlyView.unmount();
  const addPage = createTransactionEditPage({location: {mode: "add"}});
  const addView = render(<MemoryRouter>{addPage.render()}</MemoryRouter>);
  fireEvent.click(addView.getAllByText("Cancel")[0]);
  expect(transactionBackendMock.deleteTransaction).toHaveBeenCalled();
  addView.unmount();
});

test("keeps transaction table columns links search and action behavior stable", () => {
  const edit = vi.fn();
  const remove = vi.fn();
  const columns = getTransactionTableColumns({
    includeOrganization: true,
    includeUser: true,
    includeTag: true,
    includeActions: true,
    getColumnSearchProps: vi.fn(() => ({})),
    account,
    onEdit: edit,
    onDelete: remove,
  });

  expectRenderedLink(columns.find(column => column.key === "owner")?.render?.("built-in", transaction, 0), "built-in", "/organizations/built-in");
  expectRenderedLink(columns.find(column => column.key === "name")?.render?.("tx_123", transaction, 0), "tx_123", "/transactions/built-in/tx_123");
  expectRenderedLink(columns.find(column => column.key === "user")?.render?.("alice", transaction, 0), "alice", "/users/built-in/alice");
  expect(columns.find(column => column.key === "user")?.render?.("anonymous", {...transaction, user: "anonymous"}, 0)).toBe("anonymous");
  expectRenderedLink(columns.find(column => column.key === "application")?.render?.("app_main", transaction, 0), "app_main", "/applications/built-in/app_main");
  expectRenderedLink(columns.find(column => column.key === "domain")?.render?.("https://example.test", transaction, 0), "https://example.test", "https://example.test");
  expectRenderedLink(columns.find(column => column.key === "type")?.render?.("chat_1", transaction, 0), "chat_1", "https://example.test/chats/chat_1");
  expectRenderedLink(columns.find(column => column.key === "subtype")?.render?.("message_1", transaction, 0), "message_1", "https://example.test/messages/message_1");
  expectRenderedLink(columns.find(column => column.key === "provider")?.render?.("provider_chatgpt", transaction, 0), "provider_chatgpt", "https://example.test/providers/provider_chatgpt");
  expectRenderedLink(columns.find(column => column.key === "provider")?.render?.("provider_chatgpt", {...transaction, domain: ""}, 0), "provider_chatgpt", "/providers/built-in/provider_chatgpt");
  expectRenderedLink(columns.find(column => column.key === "payment")?.render?.("payment_123", transaction, 0), "payment_123", "/payments/built-in/payment_123");
  expect(columns.find(column => column.key === "amount")?.render?.(12.5, transaction, 0)).toBe("$12.5 (USD)");
  const clientColumns = getTransactionTableColumns({getColumnSearchProps: vi.fn(() => ({}))});
  expect(clientColumns.find(column => column.key === "name")?.sorter?.({name: "b"}, {name: "a"})).toBeGreaterThan(0);
  const plainColumns = getTransactionTableColumns();
  expect(plainColumns.find(column => column.key === "name")?.sorter).toBe(false);
  expect(columns.find(column => column.key === "application")?.render?.("", transaction, 0)).toBe("");
  expect(columns.find(column => column.key === "domain")?.render?.("", transaction, 0)).toBeNull();
  expect(columns.find(column => column.key === "type")?.render?.("chat_1", {...transaction, domain: ""}, 0)).toBe("chat_1");
  expect(columns.find(column => column.key === "subtype")?.render?.("message_1", {...transaction, domain: ""}, 0)).toBe("message_1");
  expect(columns.find(column => column.key === "provider")?.render?.("", transaction, 0)).toBe("");
  expect(columns.find(column => column.key === "payment")?.render?.("", transaction, 0)).toBe("");
  const action = render(<MemoryRouter>{columns.find(column => column.key === "op")?.render?.("", transaction, 7)}</MemoryRouter>);
  fireEvent.click(action.getByText("Edit"));
  fireEvent.click(action.getByText("Delete"));
  expect(edit).toHaveBeenCalledWith(transaction, true);
  expect(remove).toHaveBeenCalledWith(7);
  action.unmount();

  vi.spyOn(Setting, "isLocalAdminUser").mockReturnValueOnce(false);
  const readonlyAction = render(<MemoryRouter>{columns.find(column => column.key === "op")?.render?.("", transaction, 1)}</MemoryRouter>);
  expect((readonlyAction.getByText("Delete") as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(readonlyAction.getByText("View"));
  expect(edit).toHaveBeenLastCalledWith(transaction, false);
  readonlyAction.unmount();

  const table = render(<MemoryRouter><TransactionTable title="Transactions" transactions={[transaction]} includeUser hideTag /></MemoryRouter>);
  expect(table.getByText("Transactions")).not.toBeNull();
  expect(table.getAllByText("tx_123").length).toBeGreaterThan(0);
  table.unmount();

  const embeddedTableElement = new TransactionTable({transactions: [transaction], hideTag: true, embedded: true}).render() as React.ReactElement<{
    columns: Array<{key?: string; fixed?: string; width?: number; ellipsis?: boolean}>;
    scroll?: unknown;
    tableLayout?: string;
    className?: string;
  }>;
  expect(new Set(embeddedTableElement.props.className?.split(/\s+/))).toEqual(new Set([
    "transaction-table-embedded",
    "user-edit-embedded-table",
  ]));
  expect(embeddedTableElement.props.scroll).toBeUndefined();
  expect(embeddedTableElement.props.tableLayout).toBe("fixed");
  expect(embeddedTableElement.props.columns.map(column => column.key)).toEqual(["name", "createdTime", "application", "domain", "amount"]);
  expect(embeddedTableElement.props.columns.find(column => column.key === "amount")?.fixed).toBeUndefined();
  expect(embeddedTableElement.props.columns.every(column => column.ellipsis)).toBe(true);

  const tableInstance = new TransactionTable({transactions: [transaction]}) as unknown as Harness<TransactionTable>;
  installSynchronousSetState(tableInstance);
  (tableInstance as unknown as {searchInput: {select: () => void}}).searchInput = {select: vi.fn()};
  const searchProps = tableInstance.getColumnSearchProps("name");
  expect(searchProps.onFilter("tx", transaction)).toBe(true);
  expect(searchProps.onFilter("missing", {owner: "built-in"})).toBe(false);
  expect(searchProps.filterIcon(true)).not.toBeNull();
  const confirm = vi.fn();
  const clearFilters = vi.fn();
  const dropdown = render(searchProps.filterDropdown({
    setSelectedKeys: vi.fn(),
    selectedKeys: ["tx"],
    confirm,
    clearFilters,
  }));
  fireEvent.click(dropdown.getByText("Search"));
  expect(confirm).toHaveBeenCalled();
  fireEvent.click(dropdown.getByText("Reset"));
  expect(clearFilters).toHaveBeenCalled();
  fireEvent.click(dropdown.getByText("Filter"));
  expect(tableInstance.state.searchedColumn).toBe("name");
  dropdown.unmount();
  tableInstance.handleSearch(["alice"], vi.fn(), "user");
  expect(tableInstance.state.searchText).toBe("alice");
  tableInstance.handleReset(vi.fn());
  expect(tableInstance.state.searchText).toBe("");
  searchProps.filterDropdownProps.onOpenChange(false);
  searchProps.filterDropdownProps.onOpenChange(true);
  expect(tableInstance.render()).not.toBeNull();
});
