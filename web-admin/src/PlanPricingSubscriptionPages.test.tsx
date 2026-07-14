/* eslint-env jest */
import React from "react";
import * as fs from "fs";
import * as path from "path";
import {expect as jestExpect, jest as jestValue} from "@jest/globals";
import {cleanup, render} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import PlanListPage from "./PlanListPage";
import PlanEditPage from "./PlanEditPage";
import PricingListPage from "./PricingListPage";
import PricingEditPage from "./PricingEditPage";
import PricingPage from "./pricing/PricingPage";
import SubscriptionListPage from "./SubscriptionListPage";
import SubscriptionEditPage from "./SubscriptionEditPage";
import * as PlanBackend from "./backend/PlanBackend";
import * as PricingBackend from "./backend/PricingBackend";
import * as SubscriptionBackend from "./backend/SubscriptionBackend";
import * as ProviderBackend from "./backend/ProviderBackend";
import * as OrganizationBackend from "./backend/OrganizationBackend";
import * as RoleBackend from "./backend/RoleBackend";
import * as ApplicationBackend from "./backend/ApplicationBackend";
import * as UserBackend from "./backend/UserBackend";
import * as Setting from "./Setting";
import type {LegacyAny} from "./types/legacyPage";

declare const jest: typeof jestValue;

type PlanRecord = import("./types/businessPayment").PlanRecord;
type PricingRecord = import("./types/businessPayment").PricingRecord;
type SubscriptionRecord = import("./types/businessPayment").SubscriptionRecord;

type LooseMock = {
  (...args: unknown[]): unknown;
  mockImplementation: (implementation: (...args: unknown[]) => unknown) => LooseMock;
  mockReturnValue: (value: unknown) => LooseMock;
  mockResolvedValue: (value: unknown) => LooseMock;
  mockResolvedValueOnce: (value: unknown) => LooseMock;
  mockRejectedValueOnce: (value: unknown) => LooseMock;
  mockClear: () => LooseMock;
};
type PlanBackendMock = Record<keyof typeof PlanBackend, LooseMock>;
type PricingBackendMock = Record<keyof typeof PricingBackend, LooseMock>;
type SubscriptionBackendMock = Record<keyof typeof SubscriptionBackend, LooseMock>;
type ProviderBackendMock = Record<keyof typeof ProviderBackend, LooseMock>;
type OrganizationBackendMock = Record<keyof typeof OrganizationBackend, LooseMock>;
type RoleBackendMock = Record<keyof typeof RoleBackend, LooseMock>;
type ApplicationBackendMock = Record<keyof typeof ApplicationBackend, LooseMock>;
type UserBackendMock = Record<keyof typeof UserBackend, LooseMock>;
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
type TestPageConstructor<T> = new (props: Record<string, LegacyAny>) => T;

function newTestPage<T>(Page: unknown, props: Record<string, LegacyAny>): T {
  const PageCtor = Page as TestPageConstructor<T>;
  return new PageCtor(props);
}

const planBackendMock = PlanBackend as unknown as PlanBackendMock;
const pricingBackendMock = PricingBackend as unknown as PricingBackendMock;
const subscriptionBackendMock = SubscriptionBackend as unknown as SubscriptionBackendMock;
const providerBackendMock = ProviderBackend as unknown as ProviderBackendMock;
const organizationBackendMock = OrganizationBackend as unknown as OrganizationBackendMock;
const roleBackendMock = RoleBackend as unknown as RoleBackendMock;
const applicationBackendMock = ApplicationBackend as unknown as ApplicationBackendMock;
const userBackendMock = UserBackend as unknown as UserBackendMock;
const expect = jestExpect;
const {fireEvent} = require("@testing-library/react") as {
  fireEvent: {
    click: (element: Element | null) => boolean;
    change: (element: Element | null, event: unknown) => boolean;
  };
};

jest.mock("i18next", () => ({
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

jest.mock("copy-to-clipboard", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return factoryJest.fn();
});

jest.mock("./backend/PlanBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    addPlan: factoryJest.fn(),
    deletePlan: factoryJest.fn(),
    getPlan: factoryJest.fn(),
    getPlans: factoryJest.fn(),
    updatePlan: factoryJest.fn(),
  };
});

jest.mock("./backend/PricingBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    addPricing: factoryJest.fn(),
    deletePricing: factoryJest.fn(),
    getPricing: factoryJest.fn(),
    getPricings: factoryJest.fn(),
    updatePricing: factoryJest.fn(),
  };
});

jest.mock("./backend/SubscriptionBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    addSubscription: factoryJest.fn(),
    deleteSubscription: factoryJest.fn(),
    getSubscription: factoryJest.fn(),
    getSubscriptions: factoryJest.fn(),
    updateSubscription: factoryJest.fn(),
  };
});

jest.mock("./backend/ProviderBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    getProviders: factoryJest.fn(),
  };
});

jest.mock("./backend/OrganizationBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    getOrganizations: factoryJest.fn(),
  };
});

jest.mock("./backend/RoleBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    getRoles: factoryJest.fn(),
  };
});

jest.mock("./backend/ApplicationBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    getApplicationsByOrganization: factoryJest.fn(),
  };
});

jest.mock("./backend/UserBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    getUsers: factoryJest.fn(),
  };
});

jest.mock("./pricing/SingleCard", () => {
  const ReactFactory = require("react");
  return {
    __esModule: true,
    default: (props: {plan?: PlanRecord; link?: string}) => ReactFactory.createElement(
      "a",
      {
        href: props.link,
        "data-testid": "pricing-single-card",
      },
      props.plan?.displayName || props.plan?.name || "plan"
    ),
  };
});

jest.mock("./common/CustomGithubCorner", () => {
  const ReactFactory = require("react");
  return {
    __esModule: true,
    default: () => ReactFactory.createElement("span", {"data-testid": "github-corner"}, "corner"),
  };
});

jest.mock("./common/modal/PopconfirmModal", () => {
  const ReactFactory = require("react");
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

const account = {owner: "built-in", name: "admin", tag: "", isAdmin: true};
const plan: PlanRecord = {
  owner: "built-in",
  name: "plan_basic",
  createdTime: "2026-06-20T10:00:00Z",
  displayName: "Basic Plan",
  description: "Basic subscription",
  price: 19,
  currency: "USD",
  period: "Monthly",
  role: "member",
  product: "workspace_credits",
  paymentProviders: ["stripe-main"],
  isEnabled: true,
  isExclusive: false,
};
const yearlyPlan: PlanRecord = {
  ...plan,
  name: "plan_yearly",
  displayName: "Yearly Plan",
  period: "Yearly",
  price: 199,
};
const pricing: PricingRecord = {
  owner: "built-in",
  name: "pricing_monthly",
  createdTime: "2026-06-20T10:00:00Z",
  displayName: "Workspace Pricing",
  description: "Choose a plan",
  application: "app_main",
  plans: ["plan_basic", "plan_yearly"],
  isEnabled: true,
  trialDuration: 7,
};
const subscription: SubscriptionRecord = {
  owner: "built-in",
  name: "sub_123",
  createdTime: "2026-06-20T10:00:00Z",
  displayName: "Alice Subscription",
  startTime: "2026-06-20T00:00:00Z",
  endTime: "2026-07-20T00:00:00Z",
  period: "Monthly",
  description: "subscription detail",
  user: "alice",
  pricing: "pricing_monthly",
  plan: "plan_basic",
  payment: "payment_123",
  state: "Active",
};

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
    push: jestValue.fn(),
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

function createPlanListPage(props: Record<string, LegacyAny> = {}) {
  const page = newTestPage<PlanListPage>(PlanListPage, {
    account,
    history: createHistory(),
    match: {path: "/plans", params: {}},
    ...props,
  }) as unknown as Harness<PlanListPage>;
  installSynchronousSetState(page);
  page.state = {...page.state, data: [cloneFixture(plan)], pagination: {current: 2, pageSize: 10, total: 1}, loading: false};
  page.getColumnSearchProps = jestValue.fn(() => ({})) as unknown as LooseMock;
  page.getTablePaginationProps = jestValue.fn(() => false) as unknown as LooseMock;
  page.handleTableChange = jestValue.fn() as unknown as LooseMock;
  return page;
}

function createPricingListPage(props: Record<string, LegacyAny> = {}) {
  const page = newTestPage<PricingListPage>(PricingListPage, {
    account,
    history: createHistory(),
    match: {path: "/pricings", params: {}},
    ...props,
  }) as unknown as Harness<PricingListPage>;
  installSynchronousSetState(page);
  page.state = {...page.state, data: [cloneFixture(pricing)], pagination: {current: 2, pageSize: 10, total: 1}, loading: false};
  page.getColumnSearchProps = jestValue.fn(() => ({})) as unknown as LooseMock;
  page.getTablePaginationProps = jestValue.fn(() => false) as unknown as LooseMock;
  page.handleTableChange = jestValue.fn() as unknown as LooseMock;
  return page;
}

function createSubscriptionListPage(props: Record<string, LegacyAny> = {}) {
  const page = newTestPage<SubscriptionListPage>(SubscriptionListPage, {
    account,
    history: createHistory(),
    match: {path: "/subscriptions", params: {}},
    ...props,
  }) as unknown as Harness<SubscriptionListPage>;
  installSynchronousSetState(page);
  page.state = {...page.state, data: [cloneFixture(subscription)], pagination: {current: 2, pageSize: 10, total: 1}, loading: false};
  page.getColumnSearchProps = jestValue.fn(() => ({})) as unknown as LooseMock;
  page.getTablePaginationProps = jestValue.fn(() => false) as unknown as LooseMock;
  page.handleTableChange = jestValue.fn() as unknown as LooseMock;
  return page;
}

function createPlanEditPage(props: Record<string, LegacyAny> = {}) {
  const page = new PlanEditPage({
    account,
    history: createHistory(),
    match: {params: {organizationName: "built-in", planName: "plan_basic"}},
    location: {mode: "edit"},
    ...props,
  }) as unknown as Harness<PlanEditPage>;
  installSynchronousSetState(page);
  page.state = {
    ...page.state,
    plan: cloneFixture(plan),
    organizations: [{name: "built-in"}, {name: "tenant-a"}],
    paymentProviders: [{name: "stripe-main", type: "Stripe", category: "Payment"}],
  };
  return page;
}

function createPricingEditPage(props: Record<string, LegacyAny> = {}) {
  const page = new PricingEditPage({
    account,
    history: createHistory(),
    match: {params: {organizationName: "built-in", pricingName: "pricing_monthly"}},
    location: {mode: "edit"},
    ...props,
  }) as unknown as Harness<PricingEditPage>;
  installSynchronousSetState(page);
  page.state = {
    ...page.state,
    pricing: cloneFixture(pricing),
    organizations: [{name: "built-in"}, {name: "tenant-a"}],
    applications: [{name: "app_main"}],
    plans: [cloneFixture(plan), cloneFixture(yearlyPlan)],
  };
  return page;
}

function createSubscriptionEditPage(props: Record<string, LegacyAny> = {}) {
  const page = new SubscriptionEditPage({
    account,
    history: createHistory(),
    match: {params: {organizationName: "built-in", subscriptionName: "sub_123"}},
    location: {mode: "edit"},
    ...props,
  }) as unknown as Harness<SubscriptionEditPage>;
  installSynchronousSetState(page);
  page.state = {
    ...page.state,
    subscription: cloneFixture(subscription),
    organizations: [{name: "built-in"}, {name: "tenant-a"}],
    pricings: [cloneFixture(pricing)],
    plans: [cloneFixture(plan), cloneFixture(yearlyPlan)],
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
      addListener: jestValue.fn(),
      removeListener: jestValue.fn(),
      addEventListener: jestValue.fn(),
      removeEventListener: jestValue.fn(),
      dispatchEvent: jestValue.fn(),
    }),
  });
  jestValue.spyOn(Setting, "showMessage").mockImplementation(() => {});
  jestValue.spyOn(Setting, "getRandomName").mockReturnValue("random");
  jestValue.spyOn(Setting, "getRequestOrganization").mockReturnValue("built-in");
  jestValue.spyOn(Setting, "isDefaultOrganizationSelected").mockReturnValue(false);
  jestValue.spyOn(Setting, "isLocalAdminUser").mockReturnValue(true);
  jestValue.spyOn(Setting, "isMobile").mockReturnValue(false);
  jestValue.spyOn(Setting, "goToLinkSoft").mockImplementation(() => {});
  jestValue.spyOn(Setting, "getFormattedDate").mockImplementation((value: LegacyAny) => `formatted:${value}`);
  jestValue.spyOn(Setting, "getPriceDisplay").mockImplementation(((value: LegacyAny, currency: LegacyAny) => `$${value} (${currency})`) as LegacyAny);
  jestValue.spyOn(Setting, "getCurrencySymbol").mockReturnValue("$");
  jestValue.spyOn(Setting, "getCurrencyText").mockReturnValue("USD");
  jestValue.spyOn(Setting, "getTag").mockImplementation(((type: string, text: string, icon: React.ReactNode) => <span data-tag-type={type}>{icon}{text}</span>) as LegacyAny);
  jestValue.spyOn(Setting, "getLabel").mockImplementation(((label: LegacyAny) => `${label}`) as LegacyAny);
  jestValue.spyOn(Setting, "getOption").mockImplementation((label: string, value: string) => ({label, value}));
  planBackendMock.addPlan.mockResolvedValue({status: "ok"});
  planBackendMock.deletePlan.mockResolvedValue({status: "ok"});
  planBackendMock.getPlan.mockResolvedValue({status: "ok", data: cloneFixture(plan)});
  planBackendMock.getPlans.mockResolvedValue({status: "ok", data: [cloneFixture(plan), cloneFixture(yearlyPlan)], data2: 2});
  planBackendMock.updatePlan.mockResolvedValue({status: "ok"});
  pricingBackendMock.addPricing.mockResolvedValue({status: "ok"});
  pricingBackendMock.deletePricing.mockResolvedValue({status: "ok"});
  pricingBackendMock.getPricing.mockResolvedValue({status: "ok", data: cloneFixture(pricing)});
  pricingBackendMock.getPricings.mockResolvedValue({status: "ok", data: [cloneFixture(pricing)], data2: 1});
  pricingBackendMock.updatePricing.mockResolvedValue({status: "ok"});
  subscriptionBackendMock.addSubscription.mockResolvedValue({status: "ok"});
  subscriptionBackendMock.deleteSubscription.mockResolvedValue({status: "ok"});
  subscriptionBackendMock.getSubscription.mockResolvedValue({status: "ok", data: cloneFixture(subscription)});
  subscriptionBackendMock.getSubscriptions.mockResolvedValue({status: "ok", data: [cloneFixture(subscription)], data2: 1});
  subscriptionBackendMock.updateSubscription.mockResolvedValue({status: "ok"});
  providerBackendMock.getProviders.mockResolvedValue({status: "ok", data: [{name: "stripe-main", category: "Payment"}, {name: "github", category: "OAuth"}]});
  organizationBackendMock.getOrganizations.mockResolvedValue({status: "ok", data: [{name: "built-in"}, {name: "tenant-a"}]});
  roleBackendMock.getRoles.mockResolvedValue({status: "ok", data: [{name: "member"}]});
  applicationBackendMock.getApplicationsByOrganization.mockResolvedValue({status: "ok", data: [{name: "app_main"}]});
  userBackendMock.getUsers.mockResolvedValue({status: "ok", data: [{name: "alice"}]});
});

afterEach(() => {
  jestValue.restoreAllMocks();
  jestValue.clearAllMocks();
  cleanup();
});

test("uses TSX files for migrated plan pricing and subscription pages", () => {
  const srcDir = __dirname;
  [
    "PlanListPage",
    "PlanEditPage",
    "PricingListPage",
    "PricingEditPage",
    "SubscriptionListPage",
    "SubscriptionEditPage",
    path.join("pricing", "PricingPage"),
  ].forEach(file => {
    expect(fs.existsSync(path.join(srcDir, `${file}.tsx`))).toBe(true);
    expect(fs.existsSync(path.join(srcDir, `${file}.js`))).toBe(false);
  });
});

test("keeps plan list creation fetch table actions and failure branches stable", async() => {
  const history = createHistory();
  const page = createPlanListPage({history});

  expect(page.newPlan()).toEqual(expect.objectContaining({owner: "built-in", name: "plan_random", isEnabled: true}));
  page.addPlan();
  await flushAsyncWork();
  expect(planBackendMock.addPlan).toHaveBeenCalledWith(expect.objectContaining({name: "plan_random"}));
  expect(history.push).toHaveBeenCalledWith({pathname: "/plans/built-in/plan_random", mode: "add"});

  const originalFetch = page.fetch;
  page.fetch = jestValue.fn() as unknown as LooseMock;
  page.deletePlan(0);
  await flushAsyncWork();
  expect(planBackendMock.deletePlan).toHaveBeenCalledWith(plan);
  expect(page.fetch).toHaveBeenCalledWith(expect.objectContaining({pagination: expect.objectContaining({current: 1})}));

  page.fetch = originalFetch;
  page.fetch({pagination: {current: 1, pageSize: 10}, searchedColumn: "name", searchText: "basic", sortField: "price", sortOrder: "descend"});
  await flushAsyncWork();
  expect(planBackendMock.getPlans).toHaveBeenCalledWith("built-in", 1, 10, "name", "basic", "price", "descend");

  const table = page.renderTable([plan]) as React.ReactElement<{children: React.ReactElement<{columns: Array<{key?: string; render?: LegacyAny}>; title: () => React.ReactNode}>}>;
  const tableElement = React.Children.toArray(table.props.children)[0] as React.ReactElement<{columns: Array<{key?: string; render?: LegacyAny}>; title: () => React.ReactNode}>;
  const columns = tableElement.props.columns;
  expect(render(<MemoryRouter>{columns.find(column => column.key === "name")?.render?.("plan_basic", plan, 0)}</MemoryRouter>).getByText("plan_basic").closest("a")?.getAttribute("href")).toBe("/plans/built-in/plan_basic");
  expect(render(<MemoryRouter>{columns.find(column => column.key === "owner")?.render?.("built-in", plan, 0)}</MemoryRouter>).getByText("built-in").closest("a")?.getAttribute("href")).toBe("/organizations/built-in");
  expect(columns.find(column => column.key === "createdTime")?.render?.("2026-06-20T10:00:00Z", plan, 0)).toBe("formatted:2026-06-20T10:00:00Z");
  expect(columns.find(column => column.key === "price")?.render?.(19, plan, 0)).toBe("$19 (USD)");
  expect(render(<MemoryRouter>{columns.find(column => column.key === "role")?.render?.("member", plan, 0)}</MemoryRouter>).getByText("member").closest("a")?.getAttribute("href")).toBe("/roles/member");
  expect(render(<MemoryRouter>{columns.find(column => column.key === "product")?.render?.("workspace_credits", plan, 0)}</MemoryRouter>).getByText("workspace_credits").closest("a")?.getAttribute("href")).toBe("/products/built-in/workspace_credits");

  const actionView = render(<>{columns.find(column => column.key === "op")?.render?.(undefined, plan, 0)}</>);
  fireEvent.click(actionView.getByText("Edit"));
  expect(history.push).toHaveBeenCalledWith({pathname: "/plans/built-in/plan_basic", mode: "edit"});
  fireEvent.click(actionView.getByText("Delete"));
  expect(planBackendMock.deletePlan).toHaveBeenCalled();
  actionView.unmount();

  planBackendMock.addPlan.mockResolvedValueOnce({status: "error", msg: "add failed"});
  page.addPlan();
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "Failed to add: add failed");

  planBackendMock.deletePlan.mockResolvedValueOnce({status: "error", msg: "delete failed"});
  page.deletePlan(0);
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "Failed to delete: delete failed");

  jestValue.spyOn(Setting, "isResponseDenied").mockReturnValueOnce(true);
  planBackendMock.getPlans.mockResolvedValueOnce({status: "error", msg: "denied"});
  page.fetch({pagination: {current: 1, pageSize: 10}});
  await flushAsyncWork();
  expect(page.state.isAuthorized).toBe(false);
});

test("keeps pricing list creation fetch plan links and permission branches stable", async() => {
  const history = createHistory();
  const page = createPricingListPage({history});

  expect(page.newPricing()).toEqual(expect.objectContaining({owner: "built-in", name: "pricing_random", trialDuration: 7}));
  page.addPricing();
  await flushAsyncWork();
  expect(pricingBackendMock.addPricing).toHaveBeenCalledWith(expect.objectContaining({name: "pricing_random"}));
  expect(history.push).toHaveBeenCalledWith({pathname: "/pricings/built-in/pricing_random", mode: "add"});

  page.fetch({pagination: {current: 1, pageSize: 10}, type: "ignored", sortField: "name", sortOrder: "ascend"});
  await flushAsyncWork();
  expect(pricingBackendMock.getPricings).toHaveBeenCalledWith("built-in", 1, 10, "type", "ignored", "name", "ascend");

  const table = page.renderTable([pricing]) as React.ReactElement<{children: React.ReactElement<{columns: Array<{key?: string; render?: LegacyAny}>; title: () => React.ReactNode}>}>;
  const tableElement = React.Children.toArray(table.props.children)[0] as React.ReactElement<{columns: Array<{key?: string; render?: LegacyAny}>; title: () => React.ReactNode}>;
  const columns = tableElement.props.columns;
  expect(render(<MemoryRouter>{columns.find(column => column.key === "application")?.render?.("app_main", pricing, 0)}</MemoryRouter>).getByText("app_main").closest("a")?.getAttribute("href")).toBe("/applications/built-in/app_main");
  const plansView = render(<MemoryRouter>{columns.find(column => column.key === "plans")?.render?.(["plan_basic"], pricing, 0)}</MemoryRouter>);
  expect(plansView.getByText("plan_basic").closest("a")?.getAttribute("href")).toBe("/plans/built-in/plan_basic");
  fireEvent.click(plansView.getByRole("button"));
  expect(Setting.goToLinkSoft).toHaveBeenCalledWith(page, "/plans/built-in/plan_basic");
  plansView.unmount();
  expect(columns.find(column => column.key === "plans")?.render?.([], pricing, 0)).toBe("(empty)");

  jestValue.spyOn(Setting, "isLocalAdminUser").mockReturnValue(false);
  const actionView = render(<>{columns.find(column => column.key === "op")?.render?.(undefined, pricing, 0)}</>);
  fireEvent.click(actionView.getByText("View"));
  expect(history.push).toHaveBeenCalledWith({pathname: "/pricings/built-in/pricing_monthly", mode: "view"});
  expect((actionView.getByText("Delete").closest("button") as HTMLButtonElement | null)?.disabled).toBe(true);
  actionView.unmount();

  pricingBackendMock.getPricings.mockResolvedValueOnce({status: "error", msg: "pricing list failed"});
  page.fetch({pagination: {current: 1, pageSize: 10}});
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "pricing list failed");
});

test("keeps subscription list creation status renderers and failure branches stable", async() => {
  const history = createHistory();
  const page = createSubscriptionListPage({history});

  expect(page.newSubscription()).toEqual(expect.objectContaining({owner: "built-in", name: "sub_random", state: "Active"}));
  page.addSubscription();
  await flushAsyncWork();
  expect(subscriptionBackendMock.addSubscription).toHaveBeenCalledWith(expect.objectContaining({name: "sub_random"}));
  expect(history.push).toHaveBeenCalledWith({pathname: "/subscriptions/built-in/sub_random", mode: "add"});

  page.fetch({pagination: {current: 1, pageSize: 10}, searchedColumn: "state", searchText: "Active", sortField: "state", sortOrder: "ascend"});
  await flushAsyncWork();
  expect(subscriptionBackendMock.getSubscriptions).toHaveBeenCalledWith("built-in", 1, 10, "state", "Active", "state", "ascend");

  const table = page.renderTable([subscription]) as React.ReactElement<{children: React.ReactElement<{columns: Array<{key?: string; render?: LegacyAny}>; title: () => React.ReactNode}>}>;
  const tableElement = React.Children.toArray(table.props.children)[0] as React.ReactElement<{columns: Array<{key?: string; render?: LegacyAny}>; title: () => React.ReactNode}>;
  const columns = tableElement.props.columns;
  expect(render(<MemoryRouter>{columns.find(column => column.key === "plan")?.render?.("plan_basic", subscription, 0)}</MemoryRouter>).getByText("plan_basic").closest("a")?.getAttribute("href")).toBe("/plans/plan_basic");
  expect(render(<MemoryRouter>{columns.find(column => column.key === "user")?.render?.("alice", subscription, 0)}</MemoryRouter>).getByText("alice").closest("a")?.getAttribute("href")).toBe("/users/alice");
  expect(render(<MemoryRouter>{columns.find(column => column.key === "payment")?.render?.("payment_123", subscription, 0)}</MemoryRouter>).getByText("payment_123").closest("a")?.getAttribute("href")).toBe("/payments/payment_123");
  ["Pending", "Active", "Upcoming", "Expired", "Error", "Suspended"].forEach(state => {
    expect(render(<>{columns.find(column => column.key === "state")?.render?.(state, subscription, 0)}</>).container.textContent).toContain(state === "Pending" ? "Pending" : state);
  });

  const actionView = render(<>{columns.find(column => column.key === "op")?.render?.(undefined, subscription, 0)}</>);
  fireEvent.click(actionView.getByText("Edit"));
  expect(history.push).toHaveBeenCalledWith({pathname: "/subscriptions/built-in/sub_123", mode: "edit"});
  fireEvent.click(actionView.getByText("Delete"));
  expect(subscriptionBackendMock.deleteSubscription).toHaveBeenCalled();
  actionView.unmount();

  subscriptionBackendMock.addSubscription.mockResolvedValueOnce({status: "error", msg: "add failed"});
  page.addSubscription();
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "Failed to add: add failed");

  subscriptionBackendMock.deleteSubscription.mockResolvedValueOnce({status: "error", msg: "delete failed"});
  page.deleteSubscription(0);
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "Failed to delete: delete failed");
});

test("publishes plan pricing and subscription display names for their workspace tabs", async() => {
  const dispatchSpy = jestValue.spyOn(window, "dispatchEvent");
  const planPage = createPlanEditPage();
  const pricingPage = createPricingEditPage();
  const subscriptionPage = createSubscriptionEditPage();

  planPage.getPlan();
  await flushAsyncWork();
  expect((dispatchSpy.mock.calls.at(-1)?.[0] as CustomEvent | undefined)?.detail).toEqual({
    path: "/plans/built-in/plan_basic",
    label: "Edit Plan: Basic Plan",
  });
  const planEventCountBeforeOtherFieldUpdate = dispatchSpy.mock.calls.length;
  planPage.updatePlanField("price", 29);
  expect(dispatchSpy).toHaveBeenCalledTimes(planEventCountBeforeOtherFieldUpdate);
  planPage.updatePlanField("displayName", "");
  expect((dispatchSpy.mock.calls.at(-1)?.[0] as CustomEvent | undefined)?.detail.label).toBe("Edit Plan: plan_basic");

  pricingPage.getPricing();
  await flushAsyncWork();
  expect((dispatchSpy.mock.calls.at(-1)?.[0] as CustomEvent | undefined)?.detail).toEqual({
    path: "/pricings/built-in/pricing_monthly",
    label: "Edit Pricing: Workspace Pricing",
  });
  const pricingEventCountBeforeOtherFieldUpdate = dispatchSpy.mock.calls.length;
  pricingPage.updatePricingField("trialDuration", 14);
  expect(dispatchSpy).toHaveBeenCalledTimes(pricingEventCountBeforeOtherFieldUpdate);
  pricingPage.updatePricingField("displayName", "");
  expect((dispatchSpy.mock.calls.at(-1)?.[0] as CustomEvent | undefined)?.detail.label).toBe("Edit Pricing: pricing_monthly");

  subscriptionPage.getSubscription();
  await flushAsyncWork();
  expect((dispatchSpy.mock.calls.at(-1)?.[0] as CustomEvent | undefined)?.detail).toEqual({
    path: "/subscriptions/built-in/sub_123",
    label: "Edit Subscription: Alice Subscription",
  });
  const subscriptionEventCountBeforeOtherFieldUpdate = dispatchSpy.mock.calls.length;
  subscriptionPage.updateSubscriptionField("state", "Suspended");
  expect(dispatchSpy).toHaveBeenCalledTimes(subscriptionEventCountBeforeOtherFieldUpdate);
  subscriptionPage.updateSubscriptionField("displayName", "");
  expect((dispatchSpy.mock.calls.at(-1)?.[0] as CustomEvent | undefined)?.detail.label).toBe("Edit Subscription: sub_123");
});

test("keeps plan edit loading field updates save delete and provider filtering stable", async() => {
  const history = createHistory();
  const page = createPlanEditPage({history});

  page.getPlan();
  page.getOrganizations();
  page.getPaymentProviders("built-in");
  await flushAsyncWork();
  expect(page.state.plan).toEqual(plan);
  expect(page.state.organizations).toEqual([{name: "built-in"}, {name: "tenant-a"}]);
  expect(page.state.paymentProviders).toEqual([{name: "stripe-main", category: "Payment"}]);

  planBackendMock.getPlan.mockResolvedValueOnce({status: "ok", data: null});
  page.getPlan();
  await flushAsyncWork();
  expect(history.push).toHaveBeenCalledWith("/404");

  page.updatePlanField("displayName", "Renamed Plan");
  page.updatePlanField("price", 29);
  expect(page.state.plan!.displayName).toBe("Renamed Plan");
  expect(page.state.plan!.price).toBe(29);

  const tree = page.renderPlan();
  const changeElements = collectElements(tree, element => typeof element.props.onChange === "function");
  changeElements.forEach(element => {
    const props = element.props;
    if (props.mode === "multiple") {
      props.onChange(["stripe-main"]);
    } else if (typeof props.checked === "boolean") {
      props.onChange(!props.checked);
    } else if (props.options) {
      props.onChange(props.options[0]?.value || "Monthly");
    } else if (typeof props.value === "number") {
      props.onChange(39);
    } else if (typeof props.value === "string") {
      props.onChange({target: {value: `updated-${props.value}`}});
    }
  });
  expect(page.state.plan!.paymentProviders).toEqual(["stripe-main"]);

  page.submitPlanEdit(false);
  await flushAsyncWork();
  expect(planBackendMock.updatePlan).toHaveBeenCalledWith("built-in", "plan_basic", expect.objectContaining({name: expect.any(String)}));
  expect(history.push).toHaveBeenCalledWith(expect.stringContaining("/plans/"));

  page.submitPlanEdit(true);
  await flushAsyncWork();
  expect(history.push).toHaveBeenCalledWith("/plans");

  page.deletePlan();
  await flushAsyncWork();
  expect(planBackendMock.deletePlan).toHaveBeenCalledWith(expect.objectContaining({name: expect.any(String)}));
  expect(history.push).toHaveBeenCalledWith("/plans");

  providerBackendMock.getProviders.mockResolvedValueOnce({status: "error", msg: "provider failed"});
  page.getPaymentProviders("built-in");
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "provider failed");
});

test("keeps pricing edit preview field updates save delete and PricingPage stable", async() => {
  const history = createHistory();
  const page = createPricingEditPage({history});

  page.getPricing();
  page.getOrganizations();
  page.getApplicationsByOrganization("built-in");
  page.getPlans("built-in");
  await flushAsyncWork();
  expect(page.state.pricing).toEqual(pricing);
  expect(page.state.applications).toEqual([{name: "app_main"}]);
  expect(page.state.plans).toEqual([plan, yearlyPlan]);

  pricingBackendMock.getPricing.mockResolvedValueOnce({status: "ok", data: null});
  page.getPricing();
  await flushAsyncWork();
  expect(history.push).toHaveBeenCalledWith("/404");

  page.updatePricingField("displayName", "Renamed Pricing");
  page.updatePricingField("trialDuration", 14);
  expect(page.state.pricing!.displayName).toBe("Renamed Pricing");
  expect(page.state.pricing!.trialDuration).toBe(14);

  const pricingTree = page.renderPricing();
  const changeElements = collectElements(pricingTree, element => typeof element.props.onChange === "function");
  changeElements.forEach(element => {
    const props = element.props;
    if (props.mode === "multiple") {
      props.onChange(["plan_basic"]);
    } else if (typeof props.checked === "boolean") {
      props.onChange(!props.checked);
    } else if (props.options) {
      props.onChange(props.options[0]?.value || "built-in");
    } else if (typeof props.value === "number") {
      props.onChange(21);
    } else if (typeof props.value === "string") {
      props.onChange({target: {value: `updated-${props.value}`}});
    }
  });
  expect(page.state.pricing!.plans).toEqual(["plan_basic"]);

  page.submitPricingEdit(false);
  await flushAsyncWork();
  expect(pricingBackendMock.updatePricing).toHaveBeenCalledWith("built-in", "pricing_monthly", expect.objectContaining({name: expect.any(String)}));
  page.submitPricingEdit(true);
  await flushAsyncWork();
  expect(history.push).toHaveBeenCalledWith("/pricings");
  page.deletePricing();
  await flushAsyncWork();
  expect(pricingBackendMock.deletePricing).toHaveBeenCalledWith(expect.objectContaining({name: expect.any(String)}));

  const previewPricing = {...pricing, displayName: "Workspace Pricing", description: "Choose a plan", plans: ["plan_basic", "plan_yearly"], trialDuration: 7};
  planBackendMock.getPlan
    .mockResolvedValueOnce({status: "ok", data: {...plan, name: "plan_basic", displayName: "Basic Plan"}})
    .mockResolvedValueOnce({status: "ok", data: {...yearlyPlan, name: "plan_yearly", displayName: "Yearly Plan"}});
  const pricingPage = new PricingPage({owner: "built-in", pricing: previewPricing, account, onUpdatePricing: jestValue.fn()}) as unknown as Harness<PricingPage>;
  installSynchronousSetState(pricingPage);
  pricingPage.componentDidMount();
  await flushAsyncWork();
  expect(planBackendMock.getPlan).toHaveBeenCalledWith("built-in", "plan_basic", true);
  const preview = render(<MemoryRouter>{pricingPage.render()}</MemoryRouter>);
  expect(preview.getByText("Workspace Pricing")).not.toBeNull();
  expect(preview.getAllByTestId("pricing-single-card").length).toBeGreaterThan(0);
  preview.unmount();

  pricingPage.setState({periods: ["Monthly", "Yearly"], selectedPeriod: "Monthly"});
  const periodView = render(<>{pricingPage.renderSelectPeriod()}</>);
  fireEvent.click(periodView.getByText("Yearly"));
  expect(pricingPage.state.selectedPeriod).toBe("Yearly");
  periodView.unmount();

  pricingBackendMock.getPricing.mockResolvedValueOnce({status: "error", msg: "pricing failed"});
  pricingPage.loadPricing("missing");
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "pricing failed");
});

test("keeps subscription edit loading field updates save delete and status behavior stable", async() => {
  const history = createHistory();
  const page = createSubscriptionEditPage({history});

  page.getSubscription();
  page.getOrganizations();
  page.getPricings("built-in");
  page.getPlans("built-in");
  await flushAsyncWork();
  expect(page.state.subscription).toEqual(subscription);
  expect(page.state.pricings).toEqual([pricing]);
  expect(page.state.plans).toEqual([plan, yearlyPlan]);

  subscriptionBackendMock.getSubscription.mockResolvedValueOnce({status: "ok", data: null});
  page.getSubscription();
  await flushAsyncWork();
  expect(history.push).toHaveBeenCalledWith("/404");

  page.updateSubscriptionField("displayName", "Renamed Subscription");
  page.updateSubscriptionField("state", "Suspended");
  expect(page.state.subscription!.displayName).toBe("Renamed Subscription");
  expect(page.state.subscription!.state).toBe("Suspended");

  const tree = page.renderSubscription();
  const changeElements = collectElements(tree, element => typeof element.props.onChange === "function");
  changeElements.forEach(element => {
    const props = element.props;
    if (props.options) {
      props.onChange(props.options[0]?.value || "Monthly");
    } else if (typeof props.value === "string") {
      props.onChange({target: {value: `updated-${props.value}`}});
    }
  });
  expect(page.state.subscription!.plan).toContain("plan_basic");

  page.submitSubscriptionEdit(false);
  await flushAsyncWork();
  expect(subscriptionBackendMock.updateSubscription).toHaveBeenCalledWith("built-in", "sub_123", expect.objectContaining({name: expect.any(String)}));
  page.submitSubscriptionEdit(true);
  await flushAsyncWork();
  expect(history.push).toHaveBeenCalledWith("/subscriptions");
  page.deleteSubscription();
  await flushAsyncWork();
  expect(subscriptionBackendMock.deleteSubscription).toHaveBeenCalledWith(expect.objectContaining({name: expect.any(String)}));

  subscriptionBackendMock.updateSubscription.mockResolvedValueOnce({status: "error", msg: "save failed"});
  page.submitSubscriptionEdit(false);
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "Failed to save: save failed");

  subscriptionBackendMock.deleteSubscription.mockResolvedValueOnce({status: "error", msg: "delete failed"});
  page.deleteSubscription();
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "Failed to delete: delete failed");
});

test("covers plan pricing and subscription list permission and network branches", async() => {
  const planPage = createPlanListPage({account: {...account, isAdmin: false}});
  const pricingPage = createPricingListPage();
  const subscriptionPage = createSubscriptionListPage();

  jestValue.spyOn(Setting, "isLocalAdminUser").mockReturnValue(false);
  const planTable = planPage.renderTable([plan]) as React.ReactElement<{children: React.ReactElement<{columns: Array<{key?: string; render?: LegacyAny}>; title: () => React.ReactNode}>}>;
  const planTableElement = React.Children.toArray(planTable.props.children)[0] as React.ReactElement<{columns: Array<{key?: string; render?: LegacyAny}>; title: () => React.ReactNode}>;
  const planToolbar = render(<>{planTableElement.props.title()}</>);
  expect((planToolbar.getByText("Add").closest("button") as HTMLButtonElement | null)?.disabled).toBe(true);
  planToolbar.unmount();
  const planAction = render(<>{planTableElement.props.columns.find(column => column.key === "op")?.render?.(undefined, plan, 0)}</>);
  fireEvent.click(planAction.getByText("View"));
  expect(planPage.props.history.push).toHaveBeenCalledWith({pathname: "/plans/built-in/plan_basic", mode: "view"});
  expect((planAction.getByText("Delete").closest("button") as HTMLButtonElement | null)?.disabled).toBe(true);
  planAction.unmount();

  planBackendMock.addPlan.mockRejectedValueOnce(new Error("plan add network"));
  planPage.addPlan();
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("plan add network"));
  planBackendMock.deletePlan.mockRejectedValueOnce(new Error("plan delete network"));
  planPage.deletePlan(0);
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("plan delete network"));
  planBackendMock.getPlans.mockResolvedValueOnce({status: "error", msg: "plan list failed"});
  planPage.fetch({pagination: {current: 1, pageSize: 10}});
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "plan list failed");
  jestValue.spyOn(Setting, "isDefaultOrganizationSelected").mockReturnValueOnce(true);
  planBackendMock.getPlans.mockResolvedValueOnce({status: "ok", data: [plan], data2: 1});
  planPage.fetch({pagination: {current: 3, pageSize: 20}, type: "Monthly"});
  await flushAsyncWork();
  expect(planBackendMock.getPlans).toHaveBeenLastCalledWith("", 3, 20, "type", "Monthly", undefined, undefined);

  pricingBackendMock.addPricing.mockRejectedValueOnce(new Error("pricing add network"));
  pricingPage.addPricing();
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("pricing add network"));
  pricingBackendMock.deletePricing.mockResolvedValueOnce({status: "ok"});
  pricingPage.fetch = jestValue.fn() as unknown as LooseMock;
  pricingPage.deletePricing(0);
  await flushAsyncWork();
  expect(pricingPage.fetch).toHaveBeenCalledWith(expect.objectContaining({pagination: expect.objectContaining({current: 1})}));
  pricingBackendMock.deletePricing.mockResolvedValueOnce({status: "error", msg: "pricing delete failed"});
  pricingPage.deletePricing(0);
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "Failed to delete: pricing delete failed");
  pricingBackendMock.deletePricing.mockRejectedValueOnce(new Error("pricing delete network"));
  pricingPage.deletePricing(0);
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("pricing delete network"));
  const pricingTable = pricingPage.renderTable([pricing]) as React.ReactElement<{children: React.ReactElement<{columns: Array<{key?: string; render?: LegacyAny}>}>}>;
  const pricingColumns = (React.Children.toArray(pricingTable.props.children)[0] as React.ReactElement<{columns: Array<{key?: string; render?: LegacyAny}>}>).props.columns;
  expect(render(<MemoryRouter>{pricingColumns.find(column => column.key === "name")?.render?.("pricing_monthly", pricing, 0)}</MemoryRouter>).getByText("pricing_monthly").closest("a")?.getAttribute("href")).toBe("/pricings/built-in/pricing_monthly");
  expect(render(<MemoryRouter>{pricingColumns.find(column => column.key === "owner")?.render?.("built-in", pricing, 0)}</MemoryRouter>).getByText("built-in").closest("a")?.getAttribute("href")).toBe("/organizations/built-in");
  expect(pricingColumns.find(column => column.key === "createdTime")?.render?.("2026-06-20T10:00:00Z", pricing, 0)).toBe("formatted:2026-06-20T10:00:00Z");

  subscriptionBackendMock.addSubscription.mockRejectedValueOnce(new Error("subscription add network"));
  subscriptionPage.addSubscription();
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("subscription add network"));
  subscriptionBackendMock.deleteSubscription.mockRejectedValueOnce(new Error("subscription delete network"));
  subscriptionPage.deleteSubscription(0);
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("subscription delete network"));
  subscriptionBackendMock.getSubscriptions.mockResolvedValueOnce({status: "error", msg: "subscription list failed"});
  subscriptionPage.fetch({pagination: {current: 1, pageSize: 10}});
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "subscription list failed");
  const subscriptionTable = subscriptionPage.renderTable([subscription]) as React.ReactElement<{children: React.ReactElement<{columns: Array<{key?: string; render?: LegacyAny}>; title: () => React.ReactNode}>}>;
  const subscriptionTableElement = React.Children.toArray(subscriptionTable.props.children)[0] as React.ReactElement<{columns: Array<{key?: string; render?: LegacyAny}>; title: () => React.ReactNode}>;
  expect(subscriptionTableElement.props.columns.find(column => column.key === "createdTime")?.render?.("2026-06-20T10:00:00Z", subscription, 0)).toBe("formatted:2026-06-20T10:00:00Z");
  expect(subscriptionTableElement.props.columns.find(column => column.key === "startTime")?.render?.("2026-06-20T00:00:00Z", subscription, 0)).toBe("formatted:2026-06-20T00:00:00Z");
  expect(subscriptionTableElement.props.columns.find(column => column.key === "endTime")?.render?.("2026-07-20T00:00:00Z", subscription, 0)).toBe("formatted:2026-07-20T00:00:00Z");
  const subscriptionToolbar = render(<>{subscriptionTableElement.props.title()}</>);
  expect((subscriptionToolbar.getByText("Add").closest("button") as HTMLButtonElement | null)?.disabled).toBe(true);
  subscriptionToolbar.unmount();
});

test("covers edit page null guards add and view modes plus backend failure branches", async() => {
  const planPage = createPlanEditPage({location: {mode: "add"}});
  const pricingPage = createPricingEditPage({location: {mode: "add"}});
  const subscriptionPage = createSubscriptionEditPage({location: {mode: "add"}});

  expect(planPage.parsePlanField("", "7")).toBe(7);
  expect(pricingPage.parsePricingField("", "8")).toBe(8);
  expect(subscriptionPage.parseSubscriptionField("", "9")).toBe(9);

  const planTree = planPage.renderPlan();
  const planPaginate = collectElements(planTree, element => Boolean(element.props.buildFetchArgs))[0];
  expect(planPaginate.props.buildFetchArgs({page: 1, pageSize: 10, searchText: "mem"})).toEqual([planPage.state.plan!.owner, 1, 10, "name", "mem", "", ""]);
  expect(planPaginate.props.optionMapper({name: "member"})).toEqual({label: "member", value: "member"});
  planPaginate.props.onChange("member");
  expect(planPage.state.plan!.role).toBe("member");
  const planView = render(<MemoryRouter>{planPage.render()}</MemoryRouter>);
  fireEvent.click(planView.getAllByText("Save")[0]);
  fireEvent.click(planView.getAllByText("Save & Exit")[0]);
  fireEvent.click(planView.getAllByText("Cancel")[0]);
  expect(planBackendMock.updatePlan).toHaveBeenCalled();
  expect(planBackendMock.deletePlan).toHaveBeenCalled();
  planView.unmount();
  const planViewMode = createPlanEditPage({location: {mode: "view"}});
  expect(render(<MemoryRouter>{planViewMode.render()}</MemoryRouter>).getByText("View Plan")).not.toBeNull();

  planBackendMock.updatePlan.mockResolvedValueOnce({status: "error", msg: "plan save failed"});
  planPage.submitPlanEdit(false);
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "Failed to save: plan save failed");
  planBackendMock.updatePlan.mockRejectedValueOnce(new Error("plan save network"));
  planPage.submitPlanEdit(false);
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("plan save network"));
  planBackendMock.deletePlan.mockResolvedValueOnce({status: "error", msg: "plan delete failed"});
  planPage.deletePlan();
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "Failed to delete: plan delete failed");
  planBackendMock.deletePlan.mockRejectedValueOnce(new Error("plan delete network"));
  planPage.deletePlan();
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("plan delete network"));

  pricingBackendMock.getPricing.mockResolvedValueOnce({status: "error", msg: "pricing load failed"});
  pricingPage.getPricing();
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "pricing load failed");
  planBackendMock.getPlans.mockResolvedValueOnce({status: "error", msg: "plans failed"});
  pricingPage.getPlans("built-in");
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "plans failed");
  const pricingView = render(<MemoryRouter>{pricingPage.render()}</MemoryRouter>);
  fireEvent.click(pricingView.getAllByText("Save")[0]);
  fireEvent.click(pricingView.getAllByText("Save & Exit")[0]);
  fireEvent.click(pricingView.getAllByText("Cancel")[0]);
  expect(pricingBackendMock.updatePricing).toHaveBeenCalled();
  expect(pricingBackendMock.deletePricing).toHaveBeenCalled();
  pricingView.unmount();
  const copyView = render(<>{pricingPage.renderPreview()}</>);
  fireEvent.click(copyView.getByText("Copy pricing page URL"));
  expect(Setting.showMessage).toHaveBeenCalledWith("success", "Copied to clipboard successfully");
  copyView.unmount();
  pricingBackendMock.updatePricing.mockResolvedValueOnce({status: "error", msg: "pricing save failed"});
  pricingPage.submitPricingEdit(false);
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "Failed to save: pricing save failed");
  pricingBackendMock.updatePricing.mockRejectedValueOnce(new Error("pricing save network"));
  pricingPage.submitPricingEdit(false);
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("pricing save network"));
  pricingBackendMock.deletePricing.mockResolvedValueOnce({status: "error", msg: "pricing delete failed"});
  pricingPage.deletePricing();
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "Failed to delete: pricing delete failed");
  pricingBackendMock.deletePricing.mockRejectedValueOnce(new Error("pricing delete network"));
  pricingPage.deletePricing();
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("pricing delete network"));

  subscriptionBackendMock.getSubscription.mockResolvedValueOnce({status: "error", msg: "subscription load failed"});
  subscriptionPage.getSubscription();
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "subscription load failed");
  const subscriptionTree = subscriptionPage.renderSubscription();
  const subscriptionPaginate = collectElements(subscriptionTree, element => Boolean(element.props.buildFetchArgs))[0];
  expect(subscriptionPaginate.props.buildFetchArgs({page: 1, pageSize: 10, searchText: "ali"})).toEqual([subscriptionPage.state.subscription!.owner, 1, 10, "name", "ali"]);
  expect(subscriptionPaginate.props.optionMapper({name: "alice"})).toEqual({label: "alice", value: "alice"});
  subscriptionPaginate.props.onChange("alice");
  expect(subscriptionPage.state.subscription!.user).toBe("alice");
  const subscriptionDatePickers = collectElements(subscriptionTree, element => typeof element.props.value?.format === "function" && typeof element.props.onChange === "function");
  subscriptionDatePickers.forEach(element => element.props.onChange("2026-08-01T00:00:00Z"));
  expect(subscriptionPage.state.subscription!.startTime).toBe("2026-08-01T00:00:00Z");
  const subscriptionView = render(<MemoryRouter>{subscriptionPage.render()}</MemoryRouter>);
  fireEvent.click(subscriptionView.getAllByText("Save")[0]);
  fireEvent.click(subscriptionView.getAllByText("Save & Exit")[0]);
  fireEvent.click(subscriptionView.getAllByText("Cancel")[0]);
  expect(subscriptionBackendMock.updateSubscription).toHaveBeenCalled();
  expect(subscriptionBackendMock.deleteSubscription).toHaveBeenCalled();
  subscriptionView.unmount();
  subscriptionBackendMock.updateSubscription.mockRejectedValueOnce(new Error("subscription save network"));
  subscriptionPage.submitSubscriptionEdit(false);
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("subscription save network"));
  subscriptionBackendMock.deleteSubscription.mockRejectedValueOnce(new Error("subscription delete network"));
  subscriptionPage.deleteSubscription();
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("subscription delete network"));

  planPage.setState({plan: null});
  pricingPage.setState({pricing: null});
  subscriptionPage.setState({subscription: null});
  expect(planPage.renderPlan()).toBeNull();
  expect(pricingPage.renderPricing()).toBeNull();
  expect(pricingPage.renderPreview()).toBeNull();
  expect(subscriptionPage.renderSubscription()).toBeNull();
  planPage.updatePlanField("name", "noop");
  pricingPage.updatePricingField("name", "noop");
  subscriptionPage.updateSubscriptionField("name", "noop");
  planPage.submitPlanEdit(false);
  pricingPage.submitPricingEdit(false);
  subscriptionPage.submitSubscriptionEdit(false);
  planPage.deletePlan();
  pricingPage.deletePricing();
  subscriptionPage.deleteSubscription();
});

test("covers PricingPage loading, update, mobile, anonymous and error branches", async() => {
  const onUpdatePricing = jestValue.fn();
  window.history.pushState({}, "", "/select-plan/built-in/pricing_monthly?user=alice");
  const loadedPage = new PricingPage({
    owner: "built-in",
    pricingName: "pricing_monthly",
    match: {params: {owner: "built-in", pricingName: "pricing_monthly"}},
    onUpdatePricing,
  }) as unknown as Harness<PricingPage>;
  installSynchronousSetState(loadedPage);
  loadedPage.componentDidMount();
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("info", "paid-user do not have active subscription or pending subscription, please select a plan to buy");
  expect(pricingBackendMock.getPricing).toHaveBeenCalledWith("built-in", "pricing_monthly");
  expect(onUpdatePricing).toHaveBeenCalledWith(pricing);
  loadedPage.componentDidUpdate();
  await flushAsyncWork();

  loadedPage.setState({pricing: {...pricing, plans: ["plan_basic"]}, plans: [], loading: false});
  loadedPage.componentDidUpdate();
  await flushAsyncWork();
  expect(planBackendMock.getPlan).toHaveBeenCalledWith("built-in", "plan_basic", true);

  planBackendMock.getPlan.mockResolvedValueOnce({status: "error", msg: "plan failed"});
  loadedPage.setState({pricing: {...pricing, plans: ["bad_plan"]}, loading: false});
  loadedPage.loadPlans();
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "Failed to get");

  planBackendMock.getPlan.mockRejectedValueOnce(new Error("plan network"));
  loadedPage.loadPlans();
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("plan network"));

  const emptyPlansPage = new PricingPage({owner: "built-in", pricing: {...pricing, plans: []}, account: null}) as unknown as Harness<PricingPage>;
  installSynchronousSetState(emptyPlansPage);
  emptyPlansPage.loadPlans();
  await flushAsyncWork();
  expect(emptyPlansPage.state.plans).toEqual([]);
  expect(emptyPlansPage.renderSelectPeriod()).toBeNull();
  const emptyPlansView = render(<MemoryRouter>{emptyPlansPage.renderCards()}</MemoryRouter>);
  expect(emptyPlansView.container.textContent).toBe("");
  emptyPlansView.unmount();

  const anonymousPage = new PricingPage({owner: "built-in", pricing: {...pricing, plans: ["plan_basic"]}, account: null}) as unknown as Harness<PricingPage>;
  installSynchronousSetState(anonymousPage);
  anonymousPage.setState({plans: [plan], periods: ["Monthly"], selectedPeriod: "Monthly", loading: false});
  const anonymousView = render(<MemoryRouter>{anonymousPage.renderCards()}</MemoryRouter>);
  expect(anonymousView.getByTestId("pricing-single-card").getAttribute("href")).toBe("/signup/app_main?plan=plan_basic&pricing=pricing_monthly");
  anonymousView.unmount();

  jestValue.spyOn(Setting, "isMobile").mockReturnValueOnce(true);
  const mobileView = render(<MemoryRouter>{anonymousPage.renderCards()}</MemoryRouter>);
  expect(mobileView.getByTestId("pricing-single-card")).not.toBeNull();
  mobileView.unmount();

  expect(new PricingPage({owner: "built-in", pricing: null})["render"]()).toBeNull();
  const noNamePage = new PricingPage({owner: "built-in"}) as unknown as Harness<PricingPage>;
  installSynchronousSetState(noNamePage);
  noNamePage.loadPricing(null);
  expect(pricingBackendMock.getPricing).not.toHaveBeenCalledWith("built-in", null);
});
