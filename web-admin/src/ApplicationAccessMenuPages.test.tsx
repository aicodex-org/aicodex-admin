/* eslint-env jest */
import React from "react";
import {expect, jest} from "@jest/globals";
import {cleanup, render} from "@testing-library/react";
import * as TestingLibrary from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import CertListPage from "./CertListPage";
import KeyListPage from "./KeyListPage";
import ResourceListPage from "./ResourceListPage";
import WebhookEventListPage from "./WebhookEventListPage";
import WebhookListPage from "./WebhookListPage";
import * as CertBackend from "./backend/CertBackend";
import * as KeyBackend from "./backend/KeyBackend";
import * as ResourceBackend from "./backend/ResourceBackend";
import * as WebhookBackend from "./backend/WebhookBackend";
import * as WebhookEventBackend from "./backend/WebhookEventBackend";
import * as Setting from "./Setting";
import EnterpriseListQueryToolbar from "./common/EnterpriseListQueryToolbar";
import ListPageTable from "./common/ListPageTable";
import {
  getActiveApplicationAccessQueryCondition,
  renderApplicationAccessAdvancedFilters,
  renderApplicationAccessKeywordControl
} from "./common/ApplicationAccessListControls";
import type {LegacyAny} from "./types/legacyPage";

type AdminRouteProps = import("./types/legacyPage").AdminRouteProps;
type TestTableElement = React.ReactElement<{
  className?: string;
  columns: LegacyAny[];
  pagination?: LegacyAny;
  scroll?: LegacyAny;
  title?: () => React.ReactNode;
  bordered?: boolean;
}>;
type TestToolbarElement = React.ReactElement<React.ComponentProps<typeof EnterpriseListQueryToolbar>>;

jest.mock("./common/Editor", () => () => <pre data-testid="editor" />);
jest.mock("copy-to-clipboard", () => () => true);

const expectAny: any = expect;
const wait = (TestingLibrary as LegacyAny).wait || (TestingLibrary as LegacyAny).waitFor;
const fireEvent = (TestingLibrary as LegacyAny).fireEvent;

const routeProps: AdminRouteProps = {
  account: {
    owner: "org-alpha",
    name: "admin",
    isAdmin: true,
    organization: {name: "org-alpha"},
  },
  history: {push: jest.fn()},
  match: {path: "/", params: {}},
};

function defaultListState(extra: Record<string, LegacyAny> = {}) {
  return {
    data: [],
    loading: false,
    pagination: {current: 1, pageSize: 10, total: 1},
    searchText: "",
    searchedColumn: "",
    formItems: [],
    isAuthorized: true,
    ...extra,
  };
}

function renderLegacyPageTable(page: LegacyAny, element: React.ReactElement) {
  page.state = defaultListState(page.state || {});
  return render(<MemoryRouter>{element}</MemoryRouter>);
}

function attachLegacyState(page: LegacyAny, extra: Record<string, LegacyAny> = {}): LegacyAny {
  page.state = defaultListState({
    ...(page.state || {}),
    ...extra,
  });
  page.setState = jest.fn((patch: LegacyAny, callback?: () => void) => {
    const nextState = typeof patch === "function" ? patch(page.state, page.props) : patch;
    page.state = {
      ...page.state,
      ...nextState,
    };
    callback?.();
  });
  return page;
}

function getSharedListTable(element: React.ReactNode): TestTableElement {
  const node = element as React.ReactElement<LegacyAny>;
  if (React.isValidElement(node) && node.type === ListPageTable) {
    return node as TestTableElement;
  }

  const child = node?.props?.children;
  if (React.isValidElement(child) && child.type === ListPageTable) {
    return child as TestTableElement;
  }

  throw new Error("Expected a shared ListPageTable element");
}

function getSharedListShell(element: React.ReactNode): React.ReactElement<{className?: string}> {
  if (!React.isValidElement(element)) {
    throw new Error("Expected a shared list shell element");
  }
  const node = element as React.ReactElement<LegacyAny>;
  if (typeof node.props.className === "string" && node.props.className.includes("list-page-table-shell")) {
    return node as React.ReactElement<{className?: string}>;
  }

  const children = React.Children.toArray(node.props.children);
  for (const child of children) {
    if (React.isValidElement(child)) {
      try {
        return getSharedListShell(child);
      } catch {
        // 递归继续查找兄弟节点，确保嵌套页面壳也能被一致性测试覆盖。
      }
    }
  }

  throw new Error("Expected a shared list shell element");
}

function getEnterpriseToolbar(table: TestTableElement): TestToolbarElement {
  const titleNode = table.props.title?.() as React.ReactElement<LegacyAny>;
  if (React.isValidElement(titleNode) && titleNode.type === EnterpriseListQueryToolbar) {
    return titleNode as TestToolbarElement;
  }

  const children = React.Children.toArray(titleNode?.props?.children) as React.ReactElement<LegacyAny>[];
  const toolbar = children.find(child => React.isValidElement(child) && child.type === EnterpriseListQueryToolbar);
  if (toolbar) {
    return toolbar as TestToolbarElement;
  }

  throw new Error("Expected an enterprise list query toolbar");
}

function findReactElement(node: React.ReactNode, predicate: (element: React.ReactElement<LegacyAny>) => boolean): React.ReactElement<LegacyAny> | null {
  if (!React.isValidElement(node)) {
    return null;
  }
  const element = node as React.ReactElement<LegacyAny>;
  if (predicate(element)) {
    return element;
  }

  const children = React.Children.toArray(element.props.children);
  for (const child of children) {
    const match = findReactElement(child, predicate);
    if (match) {
      return match;
    }
  }

  return null;
}

function getColumnRender(table: TestTableElement, key: string): NonNullable<LegacyAny["render"]> {
  const column = table.props.columns.find((item: LegacyAny) => item.key === key);
  if (!column?.render) {
    throw new Error(`Expected ${key} column renderer`);
  }

  return column.render;
}

function mockOrganizationScope() {
  jest.spyOn(Setting, "isDefaultOrganizationSelected").mockReturnValue(false);
  jest.spyOn(Setting, "getRequestOrganization").mockReturnValue("org-alpha");
}

beforeEach(() => {
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
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  cleanup();
});

test("renders migrated resource list table with existing row actions", () => {
  const page = new (ResourceListPage as LegacyAny)(routeProps) as LegacyAny;
  const view = renderLegacyPageTable(page, page.renderTable([{
    owner: "org-alpha",
    provider: "provider-main",
    application: "portal-app",
    user: "admin",
    name: "avatar.png",
    fileType: "image",
    fileSize: "1024",
    url: "https://static.example.invalid/avatar.png",
  }]));

  expectAny(view.getByText("provider-main")).not.toBeNull();
  expectAny(view.getByText("portal-app")).not.toBeNull();
  expectAny(view.getByRole("button", {name: /Copy Link|复制/i})).not.toBeNull();
});

test("uses shared table shell and enterprise query toolbar on application access lists", () => {
  const cases = [
    {
      className: "resource-list-table",
      hasActions: true,
      element: attachLegacyState(new (ResourceListPage as LegacyAny)(routeProps) as LegacyAny).renderTable([]),
    },
    {
      className: "cert-list-table",
      hasActions: true,
      element: attachLegacyState(new (CertListPage as LegacyAny)(routeProps) as LegacyAny).renderTable([]),
    },
    {
      className: "key-list-table",
      hasActions: true,
      element: attachLegacyState(new (KeyListPage as LegacyAny)(routeProps) as LegacyAny).renderTable([]),
    },
    {
      className: "webhook-list-table",
      hasActions: true,
      element: attachLegacyState(new (WebhookListPage as LegacyAny)(routeProps) as LegacyAny).renderTable([]),
    },
    {
      className: "webhook-event-list-table",
      hasActions: false,
      element: attachLegacyState(new WebhookEventListPage(routeProps) as LegacyAny).renderTable(),
    },
  ];

  for (const item of cases) {
    const shell = getSharedListShell(item.element);
    const table = getSharedListTable(item.element);

    expect(shell.props.className).toContain("enterprise-list-page-table-shell");
    expect(table.type).toBe(ListPageTable);
    expect(table.props.className).toContain(item.className);
    expect(table.props.bordered).toBeUndefined();
    expect(table.props.scroll?.x).toBeUndefined();
    expect(table.props.pagination).toEqual(expect.objectContaining({
      showQuickJumper: true,
      showSizeChanger: true,
    }));
    expect(table.props.pagination?.showTotal?.(1)).toContain("1");

    const toolbar = getEnterpriseToolbar(table);
    expect(toolbar.type).toBe(EnterpriseListQueryToolbar);
    expect(toolbar.props.fields.length).toBeGreaterThan(0);
    expect(toolbar.props.advancedFilters).not.toBeUndefined();
    if (item.hasActions) {
      expect(toolbar.props.actions).not.toBeUndefined();
      expect(toolbar.props.actionsPlacement).toBe("topRight");
    } else {
      expect(toolbar.props.actions).toBeUndefined();
      expect(toolbar.props.actionsPlacement).toBeUndefined();
    }

    const toolbarView = render(<>{table.props.title?.()}</>);
    expect(toolbarView.container.querySelector(".enterprise-list-query-toolbar")).not.toBeNull();
    expect(toolbarView.container.querySelector(".enterprise-list-query-toolbar-title")).not.toBeNull();
    if (item.hasActions) {
      expect(toolbarView.container.querySelector(".enterprise-list-query-toolbar-actions")).not.toBeNull();
    }
    fireEvent.click(toolbarView.getByText(/更\s*多\s*筛\s*选|More filters/));
    expect(toolbarView.container.querySelector(".enterprise-list-query-toolbar-advanced")).not.toBeNull();
    toolbarView.unmount();
  }
});

test("keeps common add actions visually aligned without a page-specific plus icon", () => {
  const pages = [
    attachLegacyState(new (CertListPage as LegacyAny)(routeProps) as LegacyAny),
    attachLegacyState(new (KeyListPage as LegacyAny)(routeProps) as LegacyAny),
    attachLegacyState(new (WebhookListPage as LegacyAny)(routeProps) as LegacyAny),
  ];

  for (const page of pages) {
    const toolbar = getEnterpriseToolbar(getSharedListTable(page.renderTable([])));
    const actions = toolbar.props.actions;
    expect(React.isValidElement(actions)).toBe(true);
    expect((actions as React.ReactElement<LegacyAny>).props.icon).toBeUndefined();
  }
});

test("maps application access list toolbar search and advanced filters to existing fetch params", () => {
  const resourcePage = attachLegacyState(new (ResourceListPage as LegacyAny)(routeProps) as LegacyAny);
  resourcePage.fetch = jest.fn();
  const resourceToolbar = getEnterpriseToolbar(getSharedListTable(resourcePage.renderTable([])));
  resourceToolbar.props.onFieldChange("provider");
  resourceToolbar.props.onKeywordChange("provider-main");
  resourceToolbar.props.onSearch();
  expectAny(resourcePage.fetch).toHaveBeenCalledWith(expect.objectContaining({
    pagination: expect.objectContaining({current: 1}),
    searchedColumn: "provider",
    searchText: "provider-main",
  }));

  resourcePage.fetch = jest.fn();
  resourcePage.handleAdvancedFilterChange("provider", "provider-advanced");
  resourceToolbar.props.onSearch();
  expectAny(resourcePage.fetch).toHaveBeenCalledWith(expect.objectContaining({
    pagination: expect.objectContaining({current: 1}),
    searchedColumn: "provider",
    searchText: "provider-advanced",
  }));

  const certPage = attachLegacyState(new (CertListPage as LegacyAny)(routeProps) as LegacyAny);
  certPage.fetch = jest.fn();
  const certToolbar = getEnterpriseToolbar(getSharedListTable(certPage.renderTable([])));
  certToolbar.props.onFieldChange("type");
  certToolbar.props.onKeywordChange("SSL");
  certToolbar.props.onSearch();
  expectAny(certPage.fetch).toHaveBeenCalledWith(expect.objectContaining({
    searchedColumn: "type",
    searchText: "SSL",
  }));

  const eventPage = attachLegacyState(new WebhookEventListPage(routeProps) as LegacyAny);
  eventPage.fetchWebhookEvents = jest.fn();
  const eventToolbar = getEnterpriseToolbar(getSharedListTable(eventPage.renderTable()));
  eventToolbar.props.onFieldChange("status");
  eventToolbar.props.onKeywordChange("failed");
  eventToolbar.props.onSearch();
  expectAny(eventPage.fetchWebhookEvents).toHaveBeenCalledWith(expect.objectContaining({current: 1}), "failed", "", "", "");
});

test("renders migrated cert and key list rows without exposing secrets", () => {
  const certPage = new (CertListPage as LegacyAny)(routeProps) as LegacyAny;
  const certView = renderLegacyPageTable(certPage, certPage.renderTable([{
    owner: "org-alpha",
    name: "cert_alpha",
    displayName: "Tenant Cert",
    type: "x509",
    scope: "JWT",
    cryptoAlgorithm: "RS256",
  }]));

  expectAny(certView.getByText("cert_alpha")).not.toBeNull();
  expectAny(certView.getByText("RS256")).not.toBeNull();
  certView.unmount();

  const keyPage = new (KeyListPage as LegacyAny)(routeProps) as LegacyAny;
  const keyView = renderLegacyPageTable(keyPage, keyPage.renderTable([{
    owner: "org-alpha",
    name: "key_alpha",
    displayName: "Tenant Key",
    type: "Organization",
    accessKey: "ak-safe-display",
    accessSecret: "secret-should-not-render-in-list",
    state: "Active",
  }]));

  expectAny(keyView.getByText("key_alpha")).not.toBeNull();
  expectAny(keyView.getByText("ak-safe-display")).not.toBeNull();
  expectAny(keyView.queryByText("secret-should-not-render-in-list")).toBeNull();
});

test("renders migrated webhook list row and keeps callback secret out of the table", () => {
  const page = new (WebhookListPage as LegacyAny)(routeProps) as LegacyAny;
  const view = renderLegacyPageTable(page, page.renderTable([{
    owner: "admin",
    name: "webhook_alpha",
    organization: "org-alpha",
    url: "https://callback.example.invalid/hook",
    method: "POST",
    contentType: "application/json",
    events: ["login", "signup"],
    secret: "webhook-secret-should-not-render",
    isEnabled: true,
  }]));

  expectAny(view.getByText("webhook_alpha")).not.toBeNull();
  expectAny(view.getByText("POST")).not.toBeNull();
  expectAny(view.queryByText("webhook-secret-should-not-render")).toBeNull();
});

test("renders migrated webhook event table with replay action", () => {
  const page = new WebhookEventListPage(routeProps) as LegacyAny;
  page.state = defaultListState({
    data: [{
      owner: "admin",
      name: "event_alpha",
      webhookName: "webhook_alpha",
      organization: "org-alpha",
      status: "success",
      attemptCount: 1,
      nextRetryTime: "",
    }],
    replayingId: "",
    statusFilter: "",
    sortField: "",
    sortOrder: "",
    detailShow: false,
    detailRecord: null,
  });

  const view = render(<MemoryRouter>{page.renderTable()}</MemoryRouter>);

  expectAny(view.getByText("webhook_alpha")).not.toBeNull();
  expectAny(view.getByRole("button", {name: /Replay|重放/i})).not.toBeNull();
});

test("keeps migrated list page fetch contracts and state updates", async() => {
  mockOrganizationScope();
  const params = {
    pagination: {current: 2, pageSize: 25, total: 0},
    searchedColumn: "name",
    searchText: "alpha",
    sortField: "createdTime",
    sortOrder: "descend",
  };
  const resourceBackend = jest.spyOn(ResourceBackend, "getResources").mockResolvedValue({status: "ok", data: [{owner: "org-alpha", name: "resource-alpha"}], data2: 1});
  const certBackend = jest.spyOn(CertBackend, "getCerts").mockResolvedValue({status: "ok", data: [{owner: "org-alpha", name: "cert-alpha"}], data2: 1});
  const keyBackend = jest.spyOn(KeyBackend, "getKeys").mockResolvedValue({status: "ok", data: [{owner: "org-alpha", name: "key-alpha"}], data2: 1});
  const webhookBackend = jest.spyOn(WebhookBackend, "getWebhooks").mockResolvedValue({status: "ok", data: [{owner: "admin", name: "webhook-alpha"}], data2: 1});

  const resourcePage = attachLegacyState(new (ResourceListPage as LegacyAny)(routeProps));
  resourcePage.fetch(params);
  await wait(() => expectAny(resourceBackend).toHaveBeenCalledWith("org-alpha", "admin", 2, 25, "name", "alpha", "createdTime", "descend"));
  await wait(() => expectAny(resourcePage.setState).toHaveBeenCalledWith(expect.objectContaining({data: expect.any(Array)})));

  const certPage = attachLegacyState(new (CertListPage as LegacyAny)(routeProps));
  certPage.fetch({...params, type: "SSL"});
  await wait(() => expectAny(certBackend).toHaveBeenCalledWith("org-alpha", 2, 25, "type", "SSL", "createdTime", "descend"));
  await wait(() => expectAny(certPage.setState).toHaveBeenCalledWith(expect.objectContaining({data: expect.any(Array)})));

  const keyPage = attachLegacyState(new (KeyListPage as LegacyAny)(routeProps));
  keyPage.fetch({...params, type: "Organization"});
  await wait(() => expectAny(keyBackend).toHaveBeenCalledWith("org-alpha", 2, 25, "type", "Organization", "createdTime", "descend"));
  await wait(() => expectAny(keyPage.setState).toHaveBeenCalledWith(expect.objectContaining({data: expect.any(Array)})));

  const webhookPage = attachLegacyState(new (WebhookListPage as LegacyAny)(routeProps));
  webhookPage.fetch({...params, contentType: "application/json"});
  await wait(() => expectAny(webhookBackend).toHaveBeenCalledWith("admin", "org-alpha", 2, 25, "contentType", "application/json", "createdTime", "descend"));
  await wait(() => expectAny(webhookPage.setState).toHaveBeenCalledWith(expect.objectContaining({data: expect.any(Array)})));
});

test("keeps migrated add and delete actions wired to existing backends", async() => {
  mockOrganizationScope();
  jest.spyOn(Setting, "getRandomName").mockReturnValue("fixed");
  const history = {push: jest.fn()};
  const props = {...routeProps, history};
  const addCert = jest.spyOn(CertBackend, "addCert").mockResolvedValue({status: "ok"});
  const addKey = jest.spyOn(KeyBackend, "addKey").mockResolvedValue({status: "ok"});
  const addWebhook = jest.spyOn(WebhookBackend, "addWebhook").mockResolvedValue({status: "ok"});
  const deleteResource = jest.spyOn(ResourceBackend, "deleteResource").mockResolvedValue({status: "ok"});

  const certPage = attachLegacyState(new (CertListPage as LegacyAny)(props), {owner: "org-alpha"});
  certPage.addCert();
  await wait(() => expectAny(addCert).toHaveBeenCalledWith(expect.objectContaining({
    owner: "org-alpha",
    name: "cert_fixed",
    privateKey: "",
    certificate: "",
  })));
  expectAny(history.push).toHaveBeenCalledWith({pathname: "/certs/org-alpha/cert_fixed", mode: "add"});

  const keyPage = attachLegacyState(new (KeyListPage as LegacyAny)(props));
  keyPage.addKey();
  await wait(() => expectAny(addKey).toHaveBeenCalledWith(expect.objectContaining({
    owner: "org-alpha",
    name: "key_fixed",
    accessSecret: "",
  })));
  expectAny(history.push).toHaveBeenCalledWith({pathname: "/keys/org-alpha/key_fixed", mode: "add"});

  const webhookPage = attachLegacyState(new (WebhookListPage as LegacyAny)(props));
  webhookPage.addWebhook();
  await wait(() => expectAny(addWebhook).toHaveBeenCalledWith(expect.objectContaining({
    owner: "admin",
    name: "webhook_fixed",
    organization: "org-alpha",
  })));
  expectAny(history.push).toHaveBeenCalledWith({pathname: "/webhooks/webhook_fixed", mode: "add"});

  const resourcePage = attachLegacyState(new (ResourceListPage as LegacyAny)(props), {
    data: [{owner: "org-alpha", name: "resource-alpha"}],
    pagination: {current: 2, pageSize: 10, total: 1},
  });
  resourcePage.fetch = jest.fn();
  resourcePage.deleteResource(0);

  await wait(() => expectAny(deleteResource).toHaveBeenCalledWith({owner: "org-alpha", name: "resource-alpha"}));
  expectAny(resourcePage.fetch).toHaveBeenCalledWith({pagination: expect.objectContaining({current: 1})});
});

test("keeps migrated webhook event helpers and replay behavior", async() => {
  mockOrganizationScope();
  const replayWebhookEvent = jest.spyOn(WebhookEventBackend, "replayWebhookEvent").mockResolvedValue({status: "ok", data: "queued"});
  const page = attachLegacyState(new WebhookEventListPage(routeProps) as LegacyAny, {
    statusFilter: "",
    sortField: "",
    sortOrder: "",
    detailShow: false,
    detailRecord: null,
  });
  page.fetchWebhookEvents = jest.fn();

  expectAny(page.jsonStrFormatter("{\"a\":1}")).toContain("\n");
  expectAny(page.jsonStrFormatter("not-json")).toBe("not-json");
  expectAny(page.getOrganizationFilter()).toBe("org-alpha");

  page.handleTableChange({current: 3, pageSize: 10}, {status: ["failed"]}, {field: "attemptCount", order: "descend"});
  expectAny(page.fetchWebhookEvents).toHaveBeenCalledWith(expect.objectContaining({current: 1}), "failed", "attemptCount", "descend");

  page.openDetailDrawer({owner: "admin", name: "event-alpha", webhookName: "webhook-alpha"});
  expectAny(page.state.detailShow).toBe(true);
  expectAny(page.state.detailRecord.name).toBe("event-alpha");
  page.closeDetailDrawer();
  expectAny(page.state.detailShow).toBe(false);

  page.replayWebhookEvent({owner: "admin", name: "event-alpha"});
  await wait(() => expectAny(replayWebhookEvent).toHaveBeenCalledWith("admin/event-alpha"));
  await wait(() => expectAny(page.fetchWebhookEvents).toHaveBeenCalled());
  expectAny(page.state.replayingId).toBe("");
});

test("covers shared application access query helper branches", () => {
  const fields = [
    {label: "Name", value: "name"},
    {label: "Status", value: "status", options: [{label: "Active", value: "active"}]},
  ];
  const onChange = jest.fn();
  const onSearch = jest.fn();

  expect(getActiveApplicationAccessQueryCondition(fields, "name", "  ", {status: ""})).toBeNull();
  expect(getActiveApplicationAccessQueryCondition(fields, "name", " primary ", {status: null})).toEqual({field: "name", value: "primary"});
  expect(getActiveApplicationAccessQueryCondition(fields, "name", "primary", {status: " active "})).toEqual({field: "status", value: "active"});

  const inputControl = renderApplicationAccessKeywordControl(fields, "name", "initial", onChange, onSearch) as React.ReactElement<LegacyAny>;
  inputControl.props.onChange({target: {value: "typed"}});
  inputControl.props.onPressEnter();
  expect(onChange).toHaveBeenCalledWith("typed");
  expect(onSearch).toHaveBeenCalled();

  const selectControl = renderApplicationAccessKeywordControl(fields, "status", "", onChange, onSearch) as React.ReactElement<LegacyAny>;
  selectControl.props.onChange("active");
  selectControl.props.onChange(undefined);
  expect(onChange).toHaveBeenCalledWith("active");
  expect(onChange).toHaveBeenCalledWith("");

  const advancedFilters = renderApplicationAccessAdvancedFilters(fields, {name: "alpha", status: ""}, onChange) as React.ReactElement<LegacyAny>;
  const labels = React.Children.toArray(advancedFilters.props.children) as React.ReactElement<LegacyAny>[];
  const nameInput = findReactElement(labels[0], element => typeof element.props.onChange === "function");
  const statusSelect = findReactElement(labels[1], element => typeof element.props.onChange === "function");
  nameInput?.props.onChange({target: {value: "beta"}});
  statusSelect?.props.onChange("active");
  statusSelect?.props.onChange(undefined);
  expect(onChange).toHaveBeenCalledWith("name", "beta");
  expect(onChange).toHaveBeenCalledWith("status", "active");
  expect(onChange).toHaveBeenCalledWith("status", "");
});

test("keeps reset and empty toolbar search paths on migrated lists", () => {
  const pages = [
    {page: attachLegacyState(new (ResourceListPage as LegacyAny)(routeProps) as LegacyAny), defaultField: "provider"},
    {page: attachLegacyState(new (CertListPage as LegacyAny)(routeProps) as LegacyAny), defaultField: "name"},
    {page: attachLegacyState(new (KeyListPage as LegacyAny)(routeProps) as LegacyAny), defaultField: "name"},
    {page: attachLegacyState(new (WebhookListPage as LegacyAny)(routeProps) as LegacyAny), defaultField: "name"},
  ];

  for (const {page, defaultField} of pages) {
    page.fetch = jest.fn();
    page.state.queryField = defaultField;
    page.state.queryKeyword = "";
    page.handleToolbarSearch();
    expectAny(page.fetch).toHaveBeenCalledWith({pagination: expect.objectContaining({current: 1})});

    page.state.queryKeyword = "dirty";
    page.state.searchText = "dirty";
    page.state.searchedColumn = defaultField;
    page.handleToolbarReset();
    expect(page.state.queryKeyword).toBe("");
    expect(page.state.searchText).toBeUndefined();
    expectAny(page.fetch).toHaveBeenLastCalledWith({pagination: expect.objectContaining({current: 1})});
  }

  const eventPage = attachLegacyState(new WebhookEventListPage(routeProps) as LegacyAny, {
    sortField: "attemptCount",
    sortOrder: "ascend",
    statusFilter: "failed",
    webhookNameFilter: "webhook-alpha",
  });
  eventPage.fetchWebhookEvents = jest.fn();
  eventPage.handleToolbarSearch();
  expectAny(eventPage.fetchWebhookEvents).toHaveBeenCalledWith(expect.objectContaining({current: 1}), "", "attemptCount", "ascend", "");

  eventPage.handleAdvancedFilterChange("status", "success");
  eventPage.handleToolbarSearch();
  expectAny(eventPage.fetchWebhookEvents).toHaveBeenLastCalledWith(expect.objectContaining({current: 1}), "success", "attemptCount", "ascend", "");

  eventPage.handleToolbarReset();
  expect(eventPage.state.queryKeyword).toBe("");
  expect(eventPage.state.statusFilter).toBe("");
  expect(eventPage.state.webhookNameFilter).toBe("");
  expectAny(eventPage.fetchWebhookEvents).toHaveBeenLastCalledWith(expect.objectContaining({current: 1}), "", "attemptCount", "ascend", "");
});

test("keeps migrated list row callbacks and mobile scroll fallbacks", () => {
  jest.spyOn(Setting, "isMobile").mockReturnValue(true);
  jest.spyOn(Setting, "getFriendlyFileSize").mockReturnValue("1 KB");
  jest.spyOn(Setting, "getShortText").mockReturnValue("https://short");
  const history = {push: jest.fn()};
  const props = {...routeProps, history};

  const resourcePage = attachLegacyState(new (ResourceListPage as LegacyAny)(props) as LegacyAny);
  resourcePage.deleteResource = jest.fn();
  const resourceTable = getSharedListTable(resourcePage.renderTable([{owner: "org-alpha", provider: "provider-main", application: "portal-app", user: "admin", name: "clip.mp4", fileType: "video", fileSize: "1024", url: "https://static.example.invalid/clip.mp4"}]));
  expect(resourceTable.props.scroll?.x).toBe(960);
  const copyButton = getColumnRender(resourceTable, "url")("", {url: "https://static.example.invalid/clip.mp4"}, 0);
  findReactElement(copyButton, element => typeof element.props.onClick === "function")?.props.onClick();
  expectAny(Setting.showMessage).toHaveBeenCalledWith("success", expect.any(String));
  const resourceAction = getColumnRender(resourceTable, "op")("", {name: "clip.mp4"}, 0);
  findReactElement(resourceAction, element => typeof element.props.onConfirm === "function")?.props.onConfirm();
  expectAny(resourcePage.deleteResource).toHaveBeenCalledWith(0);

  const certPage = attachLegacyState(new (CertListPage as LegacyAny)(props) as LegacyAny);
  certPage.refreshCert = jest.fn();
  certPage.deleteCert = jest.fn();
  const certTable = getSharedListTable(certPage.renderTable([{owner: "org-alpha", name: "cert-alpha", type: "SSL"}]));
  expect(certTable.props.scroll?.x).toBe(900);
  const certAction = getColumnRender(certTable, "op")("", {owner: "org-alpha", name: "cert-alpha", type: "SSL"}, 0);
  findReactElement(certAction, element => typeof element.props.onClick === "function" && element.props.children)?.props.onClick();
  findReactElement(certAction, element => typeof element.props.onConfirm === "function")?.props.onConfirm();
  expectAny(certPage.refreshCert).toHaveBeenCalledWith(0);
  expectAny(certPage.deleteCert).toHaveBeenCalledWith(0);

  const keyPage = attachLegacyState(new (KeyListPage as LegacyAny)(props) as LegacyAny);
  keyPage.deleteKey = jest.fn();
  const keyTable = getSharedListTable(keyPage.renderTable([{owner: "org-alpha", name: "key-alpha"}]));
  expect(keyTable.props.scroll?.x).toBe(900);
  const keyAction = getColumnRender(keyTable, "op")("", {owner: "org-alpha", name: "key-alpha"}, 0);
  findReactElement(keyAction, element => typeof element.props.onClick === "function")?.props.onClick();
  findReactElement(keyAction, element => typeof element.props.onConfirm === "function")?.props.onConfirm();
  expectAny(history.push).toHaveBeenCalledWith("/keys/org-alpha/key-alpha");
  expectAny(keyPage.deleteKey).toHaveBeenCalledWith(0);

  const webhookPage = attachLegacyState(new (WebhookListPage as LegacyAny)(props) as LegacyAny);
  webhookPage.deleteWebhook = jest.fn();
  const webhookTable = getSharedListTable(webhookPage.renderTable([{owner: "admin", name: "webhook-alpha", organization: "org-alpha", url: "https://callback.example.invalid/hook"}]));
  expect(webhookTable.props.scroll?.x).toBe(920);
  const webhookAction = getColumnRender(webhookTable, "op")("", {name: "webhook-alpha"}, 0);
  findReactElement(webhookAction, element => typeof element.props.onClick === "function")?.props.onClick();
  findReactElement(webhookAction, element => typeof element.props.onConfirm === "function")?.props.onConfirm();
  expectAny(history.push).toHaveBeenCalledWith("/webhooks/webhook-alpha");
  expectAny(webhookPage.deleteWebhook).toHaveBeenCalledWith(0);

  const eventPage = attachLegacyState(new WebhookEventListPage(props) as LegacyAny, {
    data: [{owner: "admin", name: "event-alpha", webhookName: "", organization: "", status: "unknown", nextRetryTime: ""}],
    sortField: "nextRetryTime",
    sortOrder: "descend",
    replayingId: "admin/event-alpha",
  });
  eventPage.openDetailDrawer = jest.fn();
  eventPage.replayWebhookEvent = jest.fn();
  const eventTable = getSharedListTable(eventPage.renderTable());
  expect(eventTable.props.scroll?.x).toBe(820);
  const eventAction = getColumnRender(eventTable, "action")("", {owner: "admin", name: "event-alpha"}, 0);
  const actionButtons = React.Children.toArray((eventAction as React.ReactElement<LegacyAny>).props.children) as React.ReactElement<LegacyAny>[];
  actionButtons.forEach(button => button.props.onClick());
  expectAny(eventPage.openDetailDrawer).toHaveBeenCalled();
  expectAny(eventPage.replayWebhookEvent).toHaveBeenCalled();
});

test("keeps migrated list backend failure and authorization handling", async() => {
  mockOrganizationScope();
  const deniedResponse = {status: "error", msg: "denied"};
  jest.spyOn(Setting, "isResponseDenied").mockImplementation((res: LegacyAny) => res === deniedResponse);

  const resourcePage = attachLegacyState(new (ResourceListPage as LegacyAny)(routeProps) as LegacyAny);
  jest.spyOn(ResourceBackend, "getResources").mockResolvedValue({status: "error", data: "Please login first"});
  resourcePage.fetch({pagination: {current: 1, pageSize: 20, total: 0}});
  await wait(() => expect(resourcePage.state.isAuthorized).toBe(false));

  const certPage = attachLegacyState(new (CertListPage as LegacyAny)(routeProps) as LegacyAny);
  jest.spyOn(CertBackend, "getGlobalCerts").mockResolvedValue({status: "ok", data: [], data2: 0});
  jest.spyOn(Setting, "isDefaultOrganizationSelected").mockReturnValueOnce(true);
  certPage.fetch({pagination: {current: 1, pageSize: 20, total: 0}, category: "tenant"});
  await wait(() => expectAny(CertBackend.getGlobalCerts).toHaveBeenCalledWith(1, 20, "category", "tenant", undefined, undefined));

  jest.spyOn(CertBackend, "getCerts").mockResolvedValue(deniedResponse);
  certPage.fetch({pagination: {current: 1, pageSize: 20, total: 0}});
  await wait(() => expect(certPage.state.isAuthorized).toBe(false));

  const keyPage = attachLegacyState(new (KeyListPage as LegacyAny)(routeProps) as LegacyAny);
  jest.spyOn(KeyBackend, "getKeys").mockResolvedValue({status: "error", msg: "key failed"});
  keyPage.fetch({pagination: {current: 1, pageSize: 20, total: 0}});
  await wait(() => expectAny(Setting.showMessage).toHaveBeenCalledWith("error", "key failed"));

  const webhookPage = attachLegacyState(new (WebhookListPage as LegacyAny)(routeProps) as LegacyAny);
  jest.spyOn(WebhookBackend, "getWebhooks").mockResolvedValue(deniedResponse);
  webhookPage.fetch({pagination: {current: 1, pageSize: 20, total: 0}, contentType: "application/json"});
  await wait(() => expect(webhookPage.state.isAuthorized).toBe(false));

  const eventPage = attachLegacyState(new WebhookEventListPage(routeProps) as LegacyAny);
  jest.spyOn(WebhookEventBackend, "getWebhookEvents").mockResolvedValue({status: "error", msg: "event failed"});
  eventPage.fetchWebhookEvents({current: 1, pageSize: 20, total: 0}, "failed", "attemptCount", "descend", "webhook-alpha");
  await wait(() => expectAny(Setting.showMessage).toHaveBeenCalledWith("error", "event failed"));

  (WebhookEventBackend.getWebhookEvents as LegacyAny).mockResolvedValue(deniedResponse);
  eventPage.fetchWebhookEvents({current: 1, pageSize: 20, total: 0});
  await wait(() => expect(eventPage.state.isAuthorized).toBe(false));

  (WebhookEventBackend.getWebhookEvents as LegacyAny).mockRejectedValue(new Error("network"));
  eventPage.state.isAuthorized = true;
  eventPage.fetchWebhookEvents({current: 1, pageSize: 20, total: 0});
  await wait(() => expectAny(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("network")));
});

test("keeps migrated create delete upload refresh and replay failure branches", async() => {
  mockOrganizationScope();
  jest.spyOn(Setting, "getRandomName").mockReturnValue("fixed");
  const history = {push: jest.fn()};
  const props = {...routeProps, history};

  const resourcePage = attachLegacyState(new (ResourceListPage as LegacyAny)(props) as LegacyAny, {
    data: [{owner: "org-alpha", name: "resource-alpha"}],
    pagination: {current: 1, pageSize: 10, total: 1},
  });
  resourcePage.fetch = jest.fn();
  jest.spyOn(ResourceBackend, "uploadResource").mockResolvedValueOnce({status: "ok"}).mockResolvedValueOnce({status: "error", msg: "upload failed"});
  await resourcePage.handleUpload({fileList: [{name: "asset.png"}], file: {uid: "1"}});
  expectAny(ResourceBackend.uploadResource).toHaveBeenCalledWith("org-alpha", "admin", "custom", "ResourceListPage", "resource/org-alpha/admin/asset.png", {uid: "1"});
  expectAny(resourcePage.fetch).toHaveBeenCalledWith({pagination: resourcePage.state.pagination});
  await resourcePage.handleUpload({fileList: [{name: "bad.png"}], file: {uid: "2"}});
  expect(resourcePage.state.uploading).toBe(false);

  jest.spyOn(ResourceBackend, "deleteResource").mockResolvedValueOnce({status: "error", msg: "delete failed"}).mockRejectedValueOnce(new Error("network"));
  resourcePage.deleteResource(0);
  await wait(() => expectAny(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete failed")));
  resourcePage.deleteResource(0);
  await wait(() => expectAny(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("network")));

  const certPage = attachLegacyState(new (CertListPage as LegacyAny)(props) as LegacyAny, {
    owner: "org-alpha",
    data: [{owner: "org-alpha", name: "cert-alpha", type: "SSL"}],
    pagination: {current: 2, pageSize: 10, total: 1},
  });
  certPage.fetch = jest.fn();
  jest.spyOn(CertBackend, "addCert").mockResolvedValueOnce({status: "error", msg: "add failed"}).mockRejectedValueOnce(new Error("network"));
  certPage.addCert();
  await wait(() => expectAny(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("add failed")));
  certPage.addCert();
  await wait(() => expectAny(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("network")));

  jest.spyOn(CertBackend, "deleteCert").mockResolvedValueOnce({status: "ok"}).mockResolvedValueOnce({status: "error", msg: "delete failed"}).mockRejectedValueOnce(new Error("network"));
  certPage.deleteCert(0);
  await wait(() => expectAny(certPage.fetch).toHaveBeenCalledWith({pagination: expect.objectContaining({current: 1})}));
  certPage.deleteCert(0);
  await wait(() => expectAny(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete failed")));
  certPage.deleteCert(0);
  await wait(() => expectAny(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("network")));

  jest.spyOn(CertBackend, "refreshDomainExpire").mockResolvedValueOnce({status: "ok"}).mockResolvedValueOnce({status: "error", msg: "refresh failed"}).mockRejectedValueOnce(new Error("network"));
  certPage.refreshCert(0);
  await wait(() => expectAny(certPage.fetch).toHaveBeenCalled());
  certPage.refreshCert(0);
  await wait(() => expectAny(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("refresh failed")));
  certPage.refreshCert(0);
  await wait(() => expectAny(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("network")));

  const keyPage = attachLegacyState(new (KeyListPage as LegacyAny)(props) as LegacyAny, {
    data: [{owner: "org-alpha", name: "key-alpha"}],
    pagination: {current: 2, pageSize: 10, total: 1},
  });
  keyPage.fetch = jest.fn();
  jest.spyOn(KeyBackend, "addKey").mockResolvedValueOnce({status: "error", msg: "add failed"}).mockRejectedValueOnce(new Error("network"));
  keyPage.addKey();
  await wait(() => expectAny(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("add failed")));
  keyPage.addKey();
  await wait(() => expectAny(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("network")));

  jest.spyOn(KeyBackend, "deleteKey").mockResolvedValueOnce({status: "ok"}).mockResolvedValueOnce({status: "error", msg: "delete failed"}).mockRejectedValueOnce(new Error("network"));
  keyPage.deleteKey(0);
  await wait(() => expectAny(keyPage.fetch).toHaveBeenCalledWith({pagination: expect.objectContaining({current: 1})}));
  keyPage.deleteKey(0);
  await wait(() => expectAny(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete failed")));
  keyPage.deleteKey(0);
  await wait(() => expectAny(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("network")));

  const webhookPage = attachLegacyState(new (WebhookListPage as LegacyAny)(props) as LegacyAny, {
    data: [{owner: "admin", name: "webhook-alpha"}],
    pagination: {current: 2, pageSize: 10, total: 1},
  });
  webhookPage.fetch = jest.fn();
  jest.spyOn(WebhookBackend, "addWebhook").mockResolvedValueOnce({status: "error", msg: "add failed"}).mockRejectedValueOnce(new Error("network"));
  webhookPage.addWebhook();
  await wait(() => expectAny(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("add failed")));
  webhookPage.addWebhook();
  await wait(() => expectAny(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("network")));

  jest.spyOn(WebhookBackend, "deleteWebhook").mockResolvedValueOnce({status: "ok"}).mockResolvedValueOnce({status: "error", msg: "delete failed"}).mockRejectedValueOnce(new Error("network"));
  webhookPage.deleteWebhook(0);
  await wait(() => expectAny(webhookPage.fetch).toHaveBeenCalledWith({pagination: expect.objectContaining({current: 1})}));
  webhookPage.deleteWebhook(0);
  await wait(() => expectAny(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete failed")));
  webhookPage.deleteWebhook(0);
  await wait(() => expectAny(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("network")));

  const eventPage = attachLegacyState(new WebhookEventListPage(props) as LegacyAny);
  jest.spyOn(WebhookEventBackend, "replayWebhookEvent").mockResolvedValueOnce({status: "error", msg: "replay failed"}).mockRejectedValueOnce(new Error("network"));
  eventPage.replayWebhookEvent({owner: "admin", name: "event-alpha"});
  await wait(() => expectAny(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("replay failed")));
  eventPage.replayWebhookEvent({owner: "admin", name: "event-alpha"});
  await wait(() => expectAny(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("network")));
});

test("keeps webhook event lifecycle detail drawer and unauthorized render branches", async() => {
  mockOrganizationScope();
  const addEventListener = jest.spyOn(window, "addEventListener");
  const removeEventListener = jest.spyOn(window, "removeEventListener");
  const page = attachLegacyState(new WebhookEventListPage(routeProps) as LegacyAny, {
    detailRecord: {
      owner: "admin",
      name: "event-alpha",
      webhookName: "webhook-alpha-long-name",
      organization: "org-alpha",
      status: "success",
      attemptCount: 2,
      nextRetryTime: "2026-06-24T00:00:00Z",
      payload: "{\"ok\":true}",
      lastError: "",
    },
    detailShow: true,
  });
  page.fetchWebhookEvents = jest.fn();
  page.componentDidMount();
  expectAny(addEventListener).toHaveBeenCalledWith("storageOrganizationChanged", page.handleOrganizationChange);
  expectAny(page.fetchWebhookEvents).toHaveBeenCalled();

  page.handleOrganizationChange();
  expectAny(page.fetchWebhookEvents).toHaveBeenLastCalledWith(expect.objectContaining({current: 1}), page.state.statusFilter, page.state.sortField, page.state.sortOrder, page.state.webhookNameFilter);
  page.componentWillUnmount();
  expectAny(removeEventListener).toHaveBeenCalledWith("storageOrganizationChanged", page.handleOrganizationChange);

  expect(page.getOrganizationFilter()).toBe("org-alpha");
  const noAccountPage = new WebhookEventListPage({...(routeProps as LegacyAny), account: null} as LegacyAny) as LegacyAny;
  expect(noAccountPage.getOrganizationFilter()).toBe("");
  expect(page.getWebhookLink()).toBe("-");
  expect(page.getDetailField("missing")).toBe("");
  expect(page.getEditorMaxWidth()).toBe(520);

  const detailView = render(<MemoryRouter>{page.render()}</MemoryRouter>);
  expectAny(detailView.getByText(/Webhook Event Detail|Webhook 事件详情/i)).not.toBeNull();
  detailView.unmount();

  page.setState({isAuthorized: false});
  const unauthorizedView = render(<MemoryRouter>{page.render()}</MemoryRouter>);
  expectAny(unauthorizedView.getByText(/403/)).not.toBeNull();
});
