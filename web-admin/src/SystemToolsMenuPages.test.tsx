import {afterEach, beforeEach, expect, test, vi} from "vitest";
import React from "react";
import {cleanup, fireEvent, render, waitFor} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import {Card, Input, Row, Select} from "antd";
import SystemInfo from "./SystemInfo";
import FormListPage from "./FormListPage";
import FormEditPage from "./FormEditPage";
import TicketListPage from "./TicketListPage";
import TicketEditPage from "./TicketEditPage";
import * as SystemBackend from "./backend/SystemInfo";
import * as FormBackend from "./backend/FormBackend";
import * as TicketBackend from "./backend/TicketBackend";
import * as Setting from "./Setting";
import * as TourConfig from "./TourConfig";
import {buildEnterpriseNavigationGroups} from "./enterpriseNavigation";
import type {LegacyAny} from "./types/legacyPage";

vi.mock("./common/Editor", async() => {
  const React = await vi.importActual<typeof import("react")>("react");
  return ({default: function MockEditor() {
    return React.createElement("pre", {"data-testid": "editor"});
  }});
});

type AdminRouteProps = import("./types/legacyPage").AdminRouteProps;

const expectAny: LegacyAny = expect;

type TestElement = React.ReactElement<{children?: React.ReactNode; [key: string]: LegacyAny}>;

const account = {
  owner: "org-alpha",
  name: "operator",
  isAdmin: true,
  organization: {name: "org-alpha"},
};

const routeProps: AdminRouteProps = {
  account,
  history: {push: vi.fn()},
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

function attachLegacyState(page: LegacyAny, extra: Record<string, LegacyAny> = {}): LegacyAny {
  page.state = {
    ...page.state,
    ...defaultListState(extra),
  };
  page.setState = vi.fn((patch: LegacyAny) => {
    const nextState = typeof patch === "function" ? patch(page.state, page.props) : patch;
    page.state = {
      ...page.state,
      ...nextState,
    };
  });
  return page;
}

function flushPromises() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

function findElementByType(node: React.ReactNode, type: React.ElementType): TestElement | null {
  if (!React.isValidElement(node)) {
    return null;
  }
  if (node.type === type) {
    return node as TestElement;
  }

  let match: TestElement | null = null;
  React.Children.forEach((node.props as {children?: React.ReactNode}).children, child => {
    if (match === null) {
      match = findElementByType(child, type);
    }
  });
  return match;
}

function findElementsByType(node: React.ReactNode, type: React.ElementType, matches: TestElement[] = []): TestElement[] {
  if (!React.isValidElement(node)) {
    return matches;
  }
  if (node.type === type) {
    matches.push(node as TestElement);
  }
  React.Children.forEach((node.props as {children?: React.ReactNode}).children, child => {
    findElementsByType(child, type, matches);
  });
  return matches;
}

function formRecord(extra: Record<string, LegacyAny> = {}) {
  return {
    owner: "org-alpha",
    name: "users",
    displayName: "Users Form",
    type: "users",
    tag: "",
    formItems: [{name: "displayName", label: "general:Display name", visible: true}],
    ...extra,
  };
}

function ticketRecord(extra: Record<string, LegacyAny> = {}) {
  return {
    owner: "org-alpha",
    name: "ticket_alpha",
    createdTime: "2026-06-20T10:00:00Z",
    updatedTime: "2026-06-20T10:05:00Z",
    displayName: "Tenant ticket",
    user: "operator",
    title: "Need help",
    content: "Ticket content",
    state: "Open",
    messages: [],
    ...extra,
  };
}

beforeEach(() => {
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
  vi.spyOn(Setting, "isMobile").mockReturnValue(false);
  vi.spyOn(Setting, "getRequestOrganization").mockReturnValue("org-alpha");
  vi.spyOn(Setting, "isDefaultOrganizationSelected").mockReturnValue(false);
  vi.spyOn(Setting, "isAdminUser").mockReturnValue(true);
  vi.spyOn(Setting, "getRandomName").mockReturnValue("fixed");
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.clearAllMocks();
  cleanup();
});

test("migrates system tools menu page modules to TSX files", () => {
  for (const moduleName of ["SystemInfo", "FormListPage", "FormEditPage", "TicketListPage", "TicketEditPage"]) {
    expect(() => require.resolve(`./${moduleName}.tsx`)).not.toThrow();
    expect(() => require.resolve(`./${moduleName}.js`)).toThrow();
  }
});

test("renders system information cards and cleans polling timer", () => {
  const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");
  const page = new (SystemInfo as LegacyAny)({...routeProps, history: {push: vi.fn()}});
  page.state = {
    ...page.state,
    loading: false,
    intervalId: 123,
    isTourVisible: false,
    systemInfo: {
      cpuUsage: [95.432, 75.123],
      memoryUsed: 800,
      memoryTotal: 1000,
      diskUsed: 256,
      diskTotal: 1024,
      networkSent: 128,
      networkRecv: 256,
      networkTotal: 384,
    },
    versionInfo: {version: "v1.2.3", commitOffset: 2},
    prometheusInfo: {
      apiLatency: [{method: "GET", path: "/api/get", latency: 12}],
      apiThroughput: [{method: "GET", path: "/api/get", throughput: 34}],
      totalThroughput: 34,
    },
  };

  const view = render(<>{page.render()}</>);

  expect(view.container.querySelector(".system-info-page")).not.toBeNull();
  expect(view.container.querySelector(".system-info-metrics-grid")).not.toBeNull();
  expect(view.container.querySelector(".system-info-data-grid")).not.toBeNull();
  expect(view.container.querySelector(".system-info-page .ant-col-6")).toBeNull();
  expectAny(view.getByText(/CPU\s*Usage|CPU\s*使用率/)).not.toBeNull();
  expectAny(view.getByText(/Memory Usage|内存使用率/)).not.toBeNull();
  expectAny(view.getByText(/Network Usage|网络使用率/)).not.toBeNull();
  expectAny(view.getByText(/v1\.2\.3 \(ahead\+2\)/)).not.toBeNull();

  page.stopTimer();
  expect(clearIntervalSpy).toHaveBeenCalledWith(123);
});

test("keeps system information lifecycle polling and tour state behavior", async() => {
  vi.useFakeTimers();
  const systemInfo = {
    cpuUsage: [1.2],
    memoryUsed: 256,
    memoryTotal: 1024,
    diskUsed: 128,
    diskTotal: 1024,
    networkSent: 64,
    networkRecv: 128,
    networkTotal: 192,
  };
  const getSystemInfo = vi.spyOn(SystemBackend, "getSystemInfo")
    .mockResolvedValueOnce({status: "ok", data: systemInfo})
    .mockResolvedValueOnce({status: "error", msg: "poll down"})
    .mockRejectedValueOnce(new Error("poll reject"));
  vi.spyOn(SystemBackend, "getVersionInfo").mockResolvedValue({status: "ok", data: {version: "v2.0.0", commitOffset: 0}});
  const getPrometheusInfo = vi.spyOn(SystemBackend, "getPrometheusInfo").mockResolvedValue({
    data: {apiLatency: [{path: "/api/get", latency: 1}], apiThroughput: [{path: "/api/get", throughput: 2}], totalThroughput: 2},
  });
  vi.spyOn(TourConfig, "getTourVisible").mockReturnValue(true);
  vi.spyOn(TourConfig, "getNextUrl").mockReturnValue("forms");
  vi.spyOn(TourConfig, "getSteps").mockReturnValue([{id: "cpu-card"}] as LegacyAny);
  const setIsTourVisible = vi.spyOn(TourConfig, "setIsTourVisible").mockImplementation(() => {});
  const history = {push: vi.fn()};
  const page = new (SystemInfo as LegacyAny)({...routeProps, history});
  page.setState = vi.fn((patch: LegacyAny) => {
    page.state = {...page.state, ...(typeof patch === "function" ? patch(page.state, page.props) : patch)};
  });

  page.UNSAFE_componentWillMount();
  await flushMicrotasks();
  expect(page.state.loading).toBe(false);
  expect(page.state.systemInfo).toEqual(systemInfo);
  expect(page.state.versionInfo.version).toBe("v2.0.0");

  vi.advanceTimersByTime(2000);
  await flushMicrotasks();
  expect(getSystemInfo).toHaveBeenCalledTimes(2);
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "poll down");

  expect(getPrometheusInfo).toHaveBeenCalled();

  page.componentDidMount();
  page.handleTourChange();
  expect(page.state.isTourVisible).toBe(true);
  page.setIsTourVisible();
  expect(setIsTourVisible).toHaveBeenCalledWith(false);
  expect(page.state.isTourVisible).toBe(false);

  page.getSteps();
  page.handleTourComplete();
  expect(history.push).toHaveBeenCalledWith("/forms");
  page.componentWillUnmount();
});

test("keeps system information mobile rendering and fail-closed messages", async() => {
  vi.spyOn(Setting, "isMobile").mockReturnValue(true);
  vi.spyOn(SystemBackend, "getSystemInfo").mockRejectedValue(new Error("network down"));
  vi.spyOn(SystemBackend, "getVersionInfo").mockResolvedValue({status: "error", msg: "version down"});
  const page = new (SystemInfo as LegacyAny)({...routeProps, history: {push: vi.fn()}});
  page.setState = vi.fn((patch: LegacyAny) => {
    page.state = {...page.state, ...(typeof patch === "function" ? patch(page.state, page.props) : patch)};
  });

  page.UNSAFE_componentWillMount();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("network down"));
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "version down");

  page.state = {
    ...page.state,
    loading: false,
    systemInfo: {
      cpuUsage: [],
      memoryUsed: 0,
      memoryTotal: 0,
      diskUsed: 0,
      diskTotal: 0,
      networkSent: 0,
      networkRecv: 0,
      networkTotal: null,
    },
    versionInfo: {version: "", commitOffset: 0},
  };
  const view = render(<>{page.render()}</>);
  expectAny(view.getByText(/CPU\s*Usage|CPU\s*使用率/)).not.toBeNull();
  expectAny(view.getByText(/Unknown version|未知版本/)).not.toBeNull();
});

test("keeps system information initial backend error handling", async() => {
  vi.useFakeTimers();
  vi.spyOn(SystemBackend, "getSystemInfo").mockResolvedValue({status: "error", msg: "system down"});
  vi.spyOn(SystemBackend, "getVersionInfo").mockRejectedValue(new Error("version reject"));
  const page = new (SystemInfo as LegacyAny)({...routeProps, history: {push: vi.fn()}});
  page.setState = vi.fn((patch: LegacyAny) => {
    page.state = {...page.state, ...(typeof patch === "function" ? patch(page.state, page.props) : patch)};
  });

  page.UNSAFE_componentWillMount();
  await flushMicrotasks();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "system down");
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("version reject"));
});

test("keeps form list table display, add and delete behavior", async() => {
  const addForm = vi.spyOn(FormBackend, "addForm").mockResolvedValue({status: "ok"});
  const deleteForm = vi.spyOn(FormBackend, "deleteForm").mockResolvedValue({status: "ok"});
  const history = {push: vi.fn()};
  const page = attachLegacyState(new (FormListPage as LegacyAny)({...routeProps, history}), {
    data: [formRecord()],
    pagination: {current: 1, pageSize: 10, total: 1},
  });
  const view = render(<MemoryRouter>{page.renderTable([formRecord()])}</MemoryRouter>);

  expectAny(view.getByText("users")).not.toBeNull();
  expect(view.getAllByText(/Display name|显示名/).length).toBeGreaterThan(0);
  expectAny(view.getByText(/Add|添\s*加/)).not.toBeNull();
  expect(view.container.querySelector(".enterprise-list-page-table-shell.form-list-page-table-shell")).not.toBeNull();
  expect(view.container.querySelector(".enterprise-list-query-toolbar")).not.toBeNull();
  expect(view.container.querySelector(".enterprise-list-row-actions.form-row-actions")).not.toBeNull();
  expect(view.container.querySelector(".ant-table-filter-trigger")).toBeNull();
  fireEvent.click(view.getByText(/更\s*多\s*筛\s*选|More filters/));
  await waitFor(() => expect(view.container.querySelector(".enterprise-list-query-toolbar-advanced")).not.toBeNull());

  page.addForm();
  await flushPromises();
  expect(addForm).toHaveBeenCalledWith(expect.objectContaining({
    owner: "org-alpha",
    name: "form_fixed",
    displayName: "New Form - fixed",
  }));
  expect(history.push).toHaveBeenCalledWith({pathname: "/forms/form_fixed", mode: "add"});

  page.deleteForm(formRecord());
  await flushPromises();
  expect(deleteForm).toHaveBeenCalledWith(expect.objectContaining({name: "users"}));
  expect(page.state.data).toEqual([]);
  expect(page.state.pagination.total).toBe(0);
});

test("keeps form list empty items and backend failure behavior", async() => {
  const addForm = vi.spyOn(FormBackend, "addForm")
    .mockResolvedValueOnce({status: "error", msg: "add denied"})
    .mockRejectedValueOnce(new Error("add down"));
  const deleteForm = vi.spyOn(FormBackend, "deleteForm")
    .mockResolvedValueOnce({status: "error", msg: "delete denied"})
    .mockRejectedValueOnce(new Error("delete down"));
  const page = attachLegacyState(new (FormListPage as LegacyAny)({...routeProps, history: {push: vi.fn()}}), {
    data: [formRecord()],
    pagination: {current: 1, pageSize: 10, total: 1},
  });
  const view = render(<MemoryRouter>{page.renderTable([
    formRecord({formItems: []}),
    formRecord({
      name: "tagged",
      displayName: "Tagged Form",
      formItems: [
        {label: "general:Display name", visible: true},
        {label: "general:Type", visible: false},
        {label: "general:Name", visible: true},
      ],
    }),
  ])}</MemoryRouter>);

  expectAny(view.getByText("tagged")).not.toBeNull();
  expectAny(view.getAllByText(/Name|名称/).length).toBeGreaterThan(0);

  page.addForm();
  await flushPromises();
  expect(addForm).toHaveBeenCalled();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("add denied"));

  page.addForm();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("add down"));

  page.deleteForm(formRecord());
  await flushPromises();
  expect(deleteForm).toHaveBeenCalled();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete denied"));

  page.deleteForm(formRecord());
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete down"));
});

test("keeps form fetch contract and denied response handling", async() => {
  const getForms = vi.spyOn(FormBackend, "getForms").mockResolvedValue({status: "ok", data: [formRecord()], data2: 1});
  const page = attachLegacyState(new (FormListPage as LegacyAny)(routeProps));
  const params = {
    pagination: {current: 2, pageSize: 25},
    searchedColumn: "name",
    searchText: "users",
    sortField: "createdTime",
    sortOrder: "descend",
  };

  page.fetch(params);
  await flushPromises();

  expect(getForms).toHaveBeenCalledWith("org-alpha", 2, 25, "name", "users", "createdTime", "descend");
  expect(page.state.data).toEqual([formRecord()]);
  expect(page.state.pagination.total).toBe(1);

  vi.spyOn(Setting, "isResponseDenied").mockReturnValue(true);
  getForms.mockResolvedValueOnce({status: "error", msg: "denied"});
  page.fetch(params);
  await flushPromises();
  expect(page.state.isAuthorized).toBe(false);
});

test("keeps form edit type defaults, preview link and save behavior", async() => {
  const updateForm = vi.spyOn(FormBackend, "updateForm").mockResolvedValue({status: "ok", data: true});
  const openLink = vi.spyOn(Setting, "openLink").mockImplementation(() => {});
  const history = {push: vi.fn()};
  const page = new (FormEditPage as LegacyAny)({
    ...routeProps,
    history,
    match: {params: {formName: "users"}},
    location: {},
  });
  page.state = {
    ...page.state,
    formName: "users",
    form: formRecord(),
  };
  page.setState = vi.fn((patch: LegacyAny) => {
    page.state = {...page.state, ...(typeof patch === "function" ? patch(page.state, page.props) : patch)};
  });

  const typeSelect = findElementByType(page.renderForm(), Select);
  expect(typeSelect).not.toBeNull();
  const formCard = findElementByType(page.renderForm(), Card);
  expect(formCard?.props.className).toBe("admin-identity-object-edit-card form-edit-card");
  expect(findElementsByType(page.renderForm(), Row).filter(row => row.props.className === "admin-identity-object-edit-field-row")).toHaveLength(6);
  typeSelect?.props.onChange("applications");
  expect(page.state.form.name).toBe("applications");
  expect(page.state.form.displayName).toBe("applications");
  expect(page.state.form.formItems.length).toBeGreaterThan(0);

  const preview = page.renderListPreview();
  preview.props.onClick();
  expect(openLink).toHaveBeenCalledWith("/applications");

  page.submitFormEdit(true);
  await flushPromises();
  expect(updateForm).toHaveBeenCalledWith("org-alpha", "users", expect.objectContaining({name: "applications"}));
  expect(history.push).toHaveBeenCalledWith("/forms");
});

test("keeps form edit loading, preview type routing and save failure behavior", async() => {
  const getForm = vi.spyOn(FormBackend, "getForm").mockResolvedValue({status: "ok", data: formRecord({type: "users"})});
  const updateForm = vi.spyOn(FormBackend, "updateForm")
    .mockResolvedValueOnce({status: "ok", data: false})
    .mockResolvedValueOnce({status: "error", msg: "duplicate"})
    .mockRejectedValueOnce(new Error("save down"));
  const openLink = vi.spyOn(Setting, "openLink").mockImplementation(() => {});
  const page = new (FormEditPage as LegacyAny)({
    ...routeProps,
    history: {push: vi.fn()},
    match: {params: {formName: "users"}},
    location: {},
  });
  page.setState = vi.fn((patch: LegacyAny) => {
    page.state = {...page.state, ...(typeof patch === "function" ? patch(page.state, page.props) : patch)};
  });

  page.getForm();
  await flushPromises();
  expect(getForm).toHaveBeenCalledWith("org-alpha", "users");
  expect(page.state.form.type).toBe("users");

  for (const type of ["users", "providers", "organizations"]) {
    page.state.form = formRecord({type, formItems: []});
    const preview = page.renderListPreview();
    preview.props.onClick();
    expect(openLink).toHaveBeenLastCalledWith(`/${type}`);
  }

  page.state.form = formRecord({name: "changed"});
  const formView = page.renderForm();
  const inputs = findElementsByType(formView, Input);
  inputs[0].props.onChange({target: {value: "manual-name"}});
  inputs[1].props.onChange({target: {value: "Manual Display"}});
  inputs[2].props.onChange({target: {value: "vip"}});
  expect(page.state.form.name).toBe("users-tag-vip");
  expect(page.state.form.displayName).toBe("Manual Display");

  page.submitFormEdit(false);
  await flushPromises();
  expect(updateForm).toHaveBeenCalledWith("org-alpha", "users", expect.objectContaining({name: "users-tag-vip"}));
  expect(page.state.form.name).toBe("users");

  page.state.form = formRecord({name: "duplicate"});
  page.submitFormEdit(false);
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("duplicate"));

  page.submitFormEdit(false);
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("save down"));
});

test("keeps ticket list state labels, add and delete behavior", async() => {
  const addTicket = vi.spyOn(TicketBackend, "addTicket").mockResolvedValue({status: "ok"});
  const deleteTicket = vi.spyOn(TicketBackend, "deleteTicket").mockResolvedValue({status: "ok"});
  const history = {push: vi.fn()};
  const page = attachLegacyState(new (TicketListPage as LegacyAny)({...routeProps, history}), {
    data: [ticketRecord()],
    pagination: {current: 2, pageSize: 10, total: 1},
  });
  page.fetch = vi.fn();
  const view = render(<MemoryRouter>{page.renderTable([ticketRecord({state: "Resolved"})])}</MemoryRouter>);

  expectAny(view.getByText("ticket_alpha")).not.toBeNull();
  expectAny(view.getByText(/Resolved|已解决/)).not.toBeNull();
  expectAny(view.getByText(/Add|添\s*加/)).not.toBeNull();
  expect(view.container.querySelector(".enterprise-list-page-table-shell.ticket-list-page-table-shell")).not.toBeNull();
  expect(view.container.querySelector(".enterprise-list-query-toolbar")).not.toBeNull();
  expect(view.container.querySelector(".enterprise-list-row-actions.ticket-row-actions")).not.toBeNull();
  expect(view.container.querySelector(".ant-table-filter-trigger")).toBeNull();
  fireEvent.click(view.getByText(/更\s*多\s*筛\s*选|More filters/));
  await waitFor(() => expect(view.container.querySelector(".enterprise-list-query-toolbar-advanced")).not.toBeNull());

  page.addTicket();
  await flushPromises();
  expect(addTicket).toHaveBeenCalledWith(expect.objectContaining({
    owner: "org-alpha",
    name: "ticket_fixed",
    user: "operator",
  }));
  expect(history.push).toHaveBeenCalledWith({pathname: "/tickets/org-alpha/ticket_fixed", mode: "add"});

  page.deleteTicket(0);
  await flushPromises();
  expect(deleteTicket).toHaveBeenCalledWith(expect.objectContaining({name: "ticket_alpha"}));
  expect(page.fetch).toHaveBeenCalledWith({pagination: expect.objectContaining({current: 1})});
});

test("keeps ticket list state variants and backend failure behavior", async() => {
  const addTicket = vi.spyOn(TicketBackend, "addTicket")
    .mockResolvedValueOnce({status: "error", msg: "add ticket denied"})
    .mockRejectedValueOnce(new Error("add ticket down"));
  const deleteTicket = vi.spyOn(TicketBackend, "deleteTicket")
    .mockResolvedValueOnce({status: "error", msg: "delete ticket denied"})
    .mockRejectedValueOnce(new Error("delete ticket down"));
  const getTickets = vi.spyOn(TicketBackend, "getTickets").mockResolvedValue({status: "ok", data: [ticketRecord({state: "Open"})], data2: 1});
  const page = attachLegacyState(new (TicketListPage as LegacyAny)({...routeProps, history: {push: vi.fn()}}), {
    data: [ticketRecord()],
    pagination: {current: 1, pageSize: 10, total: 1},
  });
  page.fetch = vi.fn(page.fetch.bind(page));
  const view = render(<MemoryRouter>{page.renderTable([
    ticketRecord({name: "ticket_open", state: "Open"}),
    ticketRecord({name: "ticket_progress", state: "In Progress"}),
    ticketRecord({name: "ticket_closed", state: "Closed"}),
    ticketRecord({name: "ticket_unknown", state: "Unknown"}),
  ])}</MemoryRouter>);

  expectAny(view.getByText("ticket_open")).not.toBeNull();
  expectAny(view.getByText("ticket_progress")).not.toBeNull();
  expectAny(view.getByText("ticket_closed")).not.toBeNull();

  page.addTicket();
  await flushPromises();
  expect(addTicket).toHaveBeenCalled();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("add ticket denied"));

  page.addTicket();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("add ticket down"));

  page.deleteTicket(0);
  await flushPromises();
  expect(deleteTicket).toHaveBeenCalled();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete ticket denied"));

  page.deleteTicket(0);
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete ticket down"));

  page.fetch({pagination: {current: 1, pageSize: 10}, type: "Open"});
  await flushPromises();
  expect(getTickets).toHaveBeenCalledWith("org-alpha", 1, 10, "type", "Open", undefined, undefined);
});

test("keeps ticket fetch contract and authorization handling", async() => {
  const getTickets = vi.spyOn(TicketBackend, "getTickets").mockResolvedValue({status: "ok", data: [ticketRecord()], data2: 1});
  const page = attachLegacyState(new (TicketListPage as LegacyAny)(routeProps));
  const params = {
    pagination: {current: 3, pageSize: 20},
    searchedColumn: "title",
    searchText: "help",
    sortField: "updatedTime",
    sortOrder: "ascend",
  };

  page.fetch(params);
  await flushPromises();

  expect(getTickets).toHaveBeenCalledWith("org-alpha", 3, 20, "title", "help", "updatedTime", "ascend");
  expect(page.state.data).toEqual([ticketRecord()]);

  vi.spyOn(Setting, "isResponseDenied").mockReturnValue(true);
  getTickets.mockResolvedValueOnce({status: "error", msg: "denied"});
  page.fetch(params);
  await flushPromises();
  expect(page.state.isAuthorized).toBe(false);
});

test("keeps ticket edit loading, message sending and navigation behavior", async() => {
  const getTicket = vi.spyOn(TicketBackend, "getTicket").mockResolvedValue({data: ticketRecord({messages: null})});
  const updateTicket = vi.spyOn(TicketBackend, "updateTicket").mockResolvedValue({status: "ok"});
  const addTicketMessage = vi.spyOn(TicketBackend, "addTicketMessage").mockResolvedValue({status: "ok"});
  const history = {push: vi.fn()};
  const page = new (TicketEditPage as LegacyAny)({
    ...routeProps,
    history,
    match: {params: {organizationName: "org-alpha", ticketName: "ticket_alpha"}},
    location: {},
  });
  page.setState = vi.fn((patch: LegacyAny) => {
    page.state = {...page.state, ...(typeof patch === "function" ? patch(page.state, page.props) : patch)};
  });

  page.getTicket();
  await flushPromises();
  expect(getTicket).toHaveBeenCalledWith("org-alpha", "ticket_alpha");
  expect(page.state.ticket.messages).toEqual([]);

  page.state.ticket = ticketRecord({messages: [{author: "operator", text: "hello", timestamp: "2026-06-20T10:06:00Z", isAdmin: false}]});
  const editView = render(<MemoryRouter>{page.render()}</MemoryRouter>);
  expectAny(editView.getByDisplayValue("Need help")).not.toBeNull();
  expectAny(editView.getByText("hello")).not.toBeNull();

  page.updateTicketField("title", "Updated title");
  expect(page.state.ticket.title).toBe("Updated title");

  page.submitTicketEdit(false);
  await flushPromises();
  expect(updateTicket).toHaveBeenCalledWith("org-alpha", "ticket_alpha", expect.objectContaining({title: "Updated title"}));
  expect(history.push).toHaveBeenCalledWith("/tickets/org-alpha/ticket_alpha");

  page.state.messageText = "reply";
  page.sendMessage();
  await flushPromises();
  expect(addTicketMessage).toHaveBeenCalledWith("org-alpha", "ticket_alpha", expect.objectContaining({
    author: "operator",
    text: "reply",
    isAdmin: true,
  }));
  expect(page.state.messageText).toBe("");
});

test("publishes the ticket display name for its workspace tab after loading", async() => {
  const dispatchSpy = vi.spyOn(window, "dispatchEvent");
  vi.spyOn(TicketBackend, "getTicket").mockResolvedValue({status: "ok", data: ticketRecord({displayName: "Tenant support"})});
  const page = new (TicketEditPage as LegacyAny)({
    ...routeProps,
    history: {push: vi.fn()},
    match: {params: {organizationName: "org-alpha", ticketName: "ticket_alpha"}},
    location: {},
  });
  page.setState = vi.fn((patch: LegacyAny, callback?: () => void) => {
    page.state = {...page.state, ...(typeof patch === "function" ? patch(page.state, page.props) : patch)};
    callback?.();
  });

  page.getTicket();
  await flushPromises();

  const dispatchedEvent = dispatchSpy.mock.calls.at(-1)?.[0] as CustomEvent | undefined;
  expect(dispatchedEvent?.type).toBe("aicodex.admin.workspaceTabLabelUpdate");
  expect(dispatchedEvent?.detail?.path).toBe("/tickets/org-alpha/ticket_alpha");
  expect(dispatchedEvent?.detail?.label).toMatch(/Tenant support$/);
});

test("only republishes the ticket workspace label for top-level display name changes", () => {
  const dispatchSpy = vi.spyOn(window, "dispatchEvent");
  const page = new (TicketEditPage as LegacyAny)({
    ...routeProps,
    history: {push: vi.fn()},
    match: {params: {organizationName: "org-alpha", ticketName: "ticket_alpha"}},
    location: {},
  });
  page.state.ticket = ticketRecord();
  page.setState = vi.fn((patch: LegacyAny, callback?: () => void) => {
    page.state = {...page.state, ...(typeof patch === "function" ? patch(page.state, page.props) : patch)};
    callback?.();
  });

  page.updateTicketField("name", "ticket_beta");
  page.updateTicketField("messages", [{displayName: "Nested message name"}]);
  expect(dispatchSpy).not.toHaveBeenCalled();

  page.updateTicketField("displayName", "   ");

  const dispatchedEvent = dispatchSpy.mock.calls.at(-1)?.[0] as CustomEvent | undefined;
  expect(dispatchedEvent?.detail?.path).toBe("/tickets/org-alpha/ticket_alpha");
  expect(dispatchedEvent?.detail?.label).toMatch(/ticket_beta$/);
});

test("keeps ticket edit field controls, send failure and send shortcut behavior", async() => {
  const addTicketMessage = vi.spyOn(TicketBackend, "addTicketMessage")
    .mockResolvedValueOnce({status: "error", msg: "blocked"})
    .mockRejectedValueOnce(new Error("message down"))
    .mockResolvedValueOnce({status: "ok"});
  const page = new (TicketEditPage as LegacyAny)({
    ...routeProps,
    history: {push: vi.fn()},
    match: {params: {organizationName: "org-alpha", ticketName: "ticket_alpha"}},
    location: {mode: "add"},
  });
  page.state.ticket = ticketRecord({state: "Closed", user: "another-user", messages: [{author: "admin", text: "note", timestamp: "2026-06-20T10:06:00Z", isAdmin: true}]});
  page.setState = vi.fn((patch: LegacyAny) => {
    page.state = {...page.state, ...(typeof patch === "function" ? patch(page.state, page.props) : patch)};
  });
  const ticketForm = page.renderTicket();
  const renderedTicket = render(<MemoryRouter>{ticketForm}</MemoryRouter>);
  expectAny(renderedTicket.getByText(/New Ticket|新工单/)).not.toBeNull();
  const updateTicket = vi.spyOn(TicketBackend, "updateTicket")
    .mockResolvedValueOnce({status: "ok"})
    .mockResolvedValueOnce({status: "error", msg: "save denied"})
    .mockRejectedValueOnce(new Error("save down"));
  const inputs = findElementsByType(ticketForm, Input);
  inputs[1].props.onChange({target: {value: "renamed-ticket"}});
  inputs[2].props.onChange({target: {value: "Renamed Ticket"}});
  inputs[5].props.onChange({target: {value: "Updated title"}});
  const ticketTextAreas = findElementsByType(ticketForm, Input.TextArea as LegacyAny);
  ticketTextAreas[0].props.onChange({target: {value: "Updated content"}});
  const stateSelect = findElementByType(ticketForm, Select);
  stateSelect?.props.onChange("Resolved");
  expect(page.state.ticket.state).toBe("Resolved");
  expect(page.state.ticket.name).toBe("renamed-ticket");
  expect(page.state.ticket.content).toBe("Updated content");
  page.submitTicketEdit(false);
  await flushPromises();
  expect(updateTicket).toHaveBeenCalledWith("org-alpha", "ticket_alpha", expect.objectContaining({name: "renamed-ticket"}));

  page.state.ticket = ticketRecord({name: "bad-ticket"});
  page.submitTicketEdit(false);
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("save denied"));

  page.submitTicketEdit(false);
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("save down"));

  const messages = page.renderMessages();
  const renderedMessages = render(<MemoryRouter>{messages}</MemoryRouter>);
  const messageButtons = renderedMessages.getAllByRole("button");
  messageButtons[messageButtons.length - 1].click();
  await flushPromises();
  const textAreas = findElementsByType(messages, Input.TextArea as LegacyAny);
  textAreas[textAreas.length - 1].props.onChange({target: {value: "shortcut reply"}});
  textAreas[textAreas.length - 1].props.onPressEnter({ctrlKey: true});
  await flushPromises();
  expect(addTicketMessage).toHaveBeenCalledWith("org-alpha", "renamed-ticket", expect.objectContaining({text: "shortcut reply"}));
  expect(page.state.sending).toBe(false);
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("blocked"));

  page.state.messageText = "retry reply";
  page.sendMessage();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("message down"));
  expect(page.state.sending).toBe(false);
});

test("keeps ticket edit null-ticket guards", () => {
  const addTicketMessage = vi.spyOn(TicketBackend, "addTicketMessage");
  const updateTicket = vi.spyOn(TicketBackend, "updateTicket");
  const page = new (TicketEditPage as LegacyAny)({
    ...routeProps,
    history: {push: vi.fn()},
    match: {params: {organizationName: "org-alpha", ticketName: "ticket_alpha"}},
    location: {},
  });
  page.state.ticket = null;

  page.UNSAFE_componentWillMount = vi.fn();
  page.updateTicketField("name", "ignored");
  page.submitTicketEdit(false);
  page.sendMessage();

  expect(updateTicket).not.toHaveBeenCalled();
  expect(addTicketMessage).not.toHaveBeenCalled();
});

test("keeps ticket edit empty message and not-found behavior", async() => {
  const history = {push: vi.fn()};
  const page = new (TicketEditPage as LegacyAny)({
    ...routeProps,
    history,
    match: {params: {organizationName: "org-alpha", ticketName: "missing"}},
    location: {},
  });
  page.setState = vi.fn((patch: LegacyAny) => {
    page.state = {...page.state, ...(typeof patch === "function" ? patch(page.state, page.props) : patch)};
  });
  vi.spyOn(TicketBackend, "getTicket").mockResolvedValue({data: null});

  page.getTicket();
  await flushPromises();
  expect(history.push).toHaveBeenCalledWith("/404");

  page.state.ticket = ticketRecord();
  page.state.messageText = " ";
  page.sendMessage();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.any(String));
});

test("keeps Swagger API documentation as an external navigation entry", () => {
  const groups = buildEnterpriseNavigationGroups({account: {...account, organization: {navItems: ["all"]}}, themeData: {colorPrimary: "#1677ff"}});
  const systemTools = groups.find((group: LegacyAny) => group.key === "/system-tools");
  const swagger = systemTools.children.find((item: LegacyAny) => item.key === "/swagger");

  expect(swagger.external).toBe(true);
  expect(swagger.href).toBe(Setting.isLocalhost() ? `${Setting.ServerUrl}/swagger` : "/swagger");
});
