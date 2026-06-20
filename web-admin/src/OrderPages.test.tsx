/* eslint-env jest */
import React from "react";
import * as fs from "fs";
import * as path from "path";
import {expect as jestExpect, jest as jestValue} from "@jest/globals";
import {cleanup, render} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import OrderListPage from "./OrderListPage";
import OrderEditPage from "./OrderEditPage";
import OrderPayPage from "./OrderPayPage";
import * as OrderBackend from "./backend/OrderBackend";
import * as ProductBackend from "./backend/ProductBackend";
import * as UserBackend from "./backend/UserBackend";
import * as PaymentBackend from "./backend/PaymentBackend";
import * as Setting from "./Setting";
import type {LegacyAny} from "./types/legacyPage";

declare const jest: typeof jestValue;

type LooseMock = {
  (...args: unknown[]): unknown;
  mockImplementation: (implementation: (...args: unknown[]) => unknown) => LooseMock;
  mockReturnValue: (value: unknown) => LooseMock;
  mockResolvedValue: (value: unknown) => LooseMock;
  mockResolvedValueOnce: (value: unknown) => LooseMock;
  mockRejectedValueOnce: (value: unknown) => LooseMock;
  mockClear: () => LooseMock;
};
type OrderBackendMock = Record<keyof typeof OrderBackend, LooseMock>;
type ProductBackendMock = Record<keyof typeof ProductBackend, LooseMock>;
type UserBackendMock = Record<keyof typeof UserBackend, LooseMock>;
type PaymentBackendMock = Record<keyof typeof PaymentBackend, LooseMock>;
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
type ProductInfo = {
  name: string;
  displayName?: string;
  price: number;
  quantity?: number;
  pricingName?: string;
  planName?: string;
  image?: string;
  detail?: string;
};
type OrderRecord = {
  owner: string;
  name: string;
  createdTime: string;
  updateTime?: string;
  displayName: string;
  products: string[];
  productInfos: ProductInfo[];
  user: string;
  payment: string;
  price: number;
  currency: string;
  state: string;
  message?: string;
  [key: string]: LegacyAny;
};
type ProviderRecord = {
  owner?: string;
  name: string;
  displayName: string;
  type: string;
  [key: string]: LegacyAny;
};

const orderBackendMock = OrderBackend as unknown as OrderBackendMock;
const productBackendMock = ProductBackend as unknown as ProductBackendMock;
const userBackendMock = UserBackend as unknown as UserBackendMock;
const paymentBackendMock = PaymentBackend as unknown as PaymentBackendMock;
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

jest.mock("./backend/OrderBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    addOrder: factoryJest.fn(),
    cancelOrder: factoryJest.fn(),
    deleteOrder: factoryJest.fn(),
    getOrder: factoryJest.fn(),
    getOrders: factoryJest.fn(),
    payOrder: factoryJest.fn(),
    updateOrder: factoryJest.fn(),
  };
});

jest.mock("./backend/ProductBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    getProduct: factoryJest.fn(),
    getProducts: factoryJest.fn(),
  };
});

jest.mock("./backend/UserBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    getUsers: factoryJest.fn(),
  };
});

jest.mock("./backend/PaymentBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    getPayments: factoryJest.fn(),
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

jest.mock("./common/PaginateSelect", () => {
  const ReactFactory = require("react");
  return {
    __esModule: true,
    default: (props: {value?: string; disabled?: boolean; onChange?: (value: string) => void}) => ReactFactory.createElement(
      "select",
      {
        "aria-label": "PaginateSelect",
        value: props.value || "",
        disabled: props.disabled,
        onChange: (event: React.ChangeEvent<HTMLSelectElement>) => props.onChange?.(event.target.value),
      },
      ReactFactory.createElement("option", {value: ""}, "(empty)"),
      ReactFactory.createElement("option", {value: "alice"}, "alice")
    ),
  };
});

const account = {owner: "built-in", name: "admin", tag: "", isAdmin: true};
const productInfo: ProductInfo = {
  name: "workspace_credits",
  displayName: "Workspace Credits",
  price: 12,
  quantity: 2,
  image: "/img/product.png",
  detail: "Credits for usage",
};
const order: OrderRecord = {
  owner: "built-in",
  name: "order_123",
  createdTime: "2026-06-20T10:00:00Z",
  updateTime: "2026-06-20T11:00:00Z",
  displayName: "Workspace Order",
  products: ["workspace_credits"],
  productInfos: [productInfo],
  user: "alice",
  payment: "payment_123",
  price: 24,
  currency: "USD",
  state: "Created",
  message: "ready",
};

function makeOrder(overrides: Partial<OrderRecord> = {}): OrderRecord {
  return {
    ...order,
    products: [...order.products],
    productInfos: order.productInfos.map(item => ({...item})),
    ...overrides,
  };
}
const provider: ProviderRecord = {
  owner: "built-in",
  name: "stripe-main",
  displayName: "Stripe Main",
  type: "Stripe",
};
const wechatProvider: ProviderRecord = {
  owner: "built-in",
  name: "wechat-main",
  displayName: "WeChat Main",
  type: "WeChat Pay",
};
const product = {
  owner: "built-in",
  name: "workspace_credits",
  displayName: "Workspace Credits",
  image: "/img/product.png",
  detail: "Credits for usage",
  price: 12,
  providerObjs: [provider, wechatProvider],
};

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

function createOrderListPage(props: Record<string, LegacyAny> = {}) {
  const OrderListPageClass = OrderListPage as unknown as {new(props: Record<string, LegacyAny>): OrderListPage};
  const page = new OrderListPageClass({
    account,
    history: createHistory(),
    match: {path: "/orders", params: {}},
    ...props,
  }) as unknown as Harness<OrderListPage>;
  installSynchronousSetState(page);
  page.state = {
    ...page.state,
    data: [makeOrder()],
    pagination: {current: 2, pageSize: 10, total: 11},
    loading: false,
  };
  page.getColumnSearchProps = jestValue.fn(() => ({})) as unknown as LooseMock;
  page.getTablePaginationProps = jestValue.fn(() => false) as unknown as LooseMock;
  page.handleTableChange = jestValue.fn() as unknown as LooseMock;
  return page;
}

function createOrderEditPage(props: Record<string, LegacyAny> = {}) {
  const page = new OrderEditPage({
    account,
    history: createHistory(),
    match: {params: {organizationName: "built-in", orderName: "order_123"}},
    location: {mode: "edit"},
    ...props,
  }) as unknown as Harness<OrderEditPage>;
  installSynchronousSetState(page);
  page.state = {
    ...page.state,
    order: makeOrder(),
    products: [product],
    users: [],
    payments: [{name: "payment_123"}],
  };
  return page;
}

function createOrderPayPage(props: Record<string, LegacyAny> = {}) {
  const page = new OrderPayPage({
    account,
    history: createHistory(),
    match: {params: {organizationName: "built-in", orderName: "order_123"}},
    ...props,
  }) as unknown as Harness<OrderPayPage>;
  installSynchronousSetState(page);
  page.state = {
    ...page.state,
    order: makeOrder(),
    firstProduct: product,
    productInfos: [productInfo],
    paymentEnv: "",
    isProcessingPayment: false,
    isViewMode: false,
  };
  return page;
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
  jestValue.spyOn(Setting, "goToLink").mockImplementation(() => {});
  jestValue.spyOn(Setting, "goToLinkSoft").mockImplementation(() => {});
  jestValue.spyOn(Setting, "getRandomName").mockReturnValue("abc123");
  jestValue.spyOn(Setting, "getRequestOrganization").mockReturnValue("built-in");
  jestValue.spyOn(Setting, "isDefaultOrganizationSelected").mockReturnValue(false);
  jestValue.spyOn(Setting, "isLocalAdminUser").mockReturnValue(true);
  jestValue.spyOn(Setting, "isMobile").mockReturnValue(false);
  jestValue.spyOn(Setting, "getFormattedDate").mockImplementation((value: LegacyAny) => `formatted:${value}`);
  jestValue.spyOn(Setting, "getLanguageText").mockImplementation((value: LegacyAny) => `${value || ""}`);
  jestValue.spyOn(Setting, "getCurrencySymbol").mockReturnValue("$");
  jestValue.spyOn(Setting, "getCurrencyText").mockReturnValue("USD");
  jestValue.spyOn(Setting, "getPriceDisplay").mockImplementation(((value: LegacyAny, currency: LegacyAny) => `$${value} (${currency})`) as LegacyAny);
  jestValue.spyOn(Setting, "getProviderLogoURL").mockReturnValue("/img/provider.png");

  orderBackendMock.addOrder.mockResolvedValue({status: "ok"});
  orderBackendMock.cancelOrder.mockResolvedValue({status: "ok"});
  orderBackendMock.deleteOrder.mockResolvedValue({status: "ok"});
  orderBackendMock.getOrders.mockResolvedValue({status: "ok", data: [makeOrder()], data2: 1});
  orderBackendMock.getOrder.mockResolvedValue({status: "ok", data: makeOrder()});
  orderBackendMock.payOrder.mockResolvedValue({status: "ok", data: {owner: "built-in", name: "payment_123", payUrl: "/pay", successUrl: "/success"}, data2: {}});
  orderBackendMock.updateOrder.mockResolvedValue({status: "ok"});
  productBackendMock.getProduct.mockResolvedValue({status: "ok", data: product});
  productBackendMock.getProducts.mockResolvedValue({status: "ok", data: [product]});
  userBackendMock.getUsers.mockResolvedValue({status: "ok", data: [{name: "alice"}], data2: 1});
  paymentBackendMock.getPayments.mockResolvedValue({status: "ok", data: [{name: "payment_123"}]});
});

afterEach(() => {
  jestValue.restoreAllMocks();
  jestValue.clearAllMocks();
  cleanup();
  delete (window as unknown as {WeixinJSBridge?: LegacyAny}).WeixinJSBridge;
});

test("uses TSX files for migrated order pages", () => {
  const srcDir = __dirname;

  ["OrderListPage", "OrderEditPage", "OrderPayPage"].forEach(file => {
    expect(fs.existsSync(path.join(srcDir, `${file}.tsx`))).toBe(true);
    expect(fs.existsSync(path.join(srcDir, `${file}.js`))).toBe(false);
  });
});

test("keeps OrderListPage add, cancel, delete and fetch behavior stable", async() => {
  const history = createHistory();
  const page = createOrderListPage({history});

  expect(page.newOrder()).toEqual(expect.objectContaining({
    owner: "built-in",
    name: "order_abc123",
    state: "Created",
  }));

  page.addOrder();
  await flushAsyncWork();
  expect(orderBackendMock.addOrder).toHaveBeenCalledWith(expect.objectContaining({name: "order_abc123"}));
  expect(history.push).toHaveBeenCalledWith({pathname: "/orders/built-in/order_abc123", mode: "add"});

  page.cancelOrder(order);
  await flushAsyncWork();
  expect(orderBackendMock.cancelOrder).toHaveBeenCalledWith("built-in", "order_123");
  expect(Setting.showMessage).toHaveBeenCalledWith("success", "Successfully canceled");

  page.deleteOrder(0);
  await flushAsyncWork();
  expect(orderBackendMock.deleteOrder).toHaveBeenCalledWith(expect.objectContaining({name: "order_123"}));
  expect(Setting.showMessage).toHaveBeenCalledWith("success", "Successfully deleted");

  orderBackendMock.getOrders.mockClear();
  page.fetch({pagination: {current: 1, pageSize: 10}, searchedColumn: "name", searchText: "order", sortField: "createdTime", sortOrder: "descend"});
  await flushAsyncWork();
  expect(orderBackendMock.getOrders).toHaveBeenCalledWith("built-in", 1, 10, "name", "order", "createdTime", "descend");
  expect(page.state.data).toEqual([makeOrder()]);
});

test("keeps OrderListPage table renderers and admin actions stable", () => {
  const history = createHistory();
  const page = createOrderListPage({history});
  page.cancelOrder = jestValue.fn() as LegacyAny;
  page.deleteOrder = jestValue.fn() as LegacyAny;
  const table = page.renderTable([order]) as React.ReactElement<{children: React.ReactElement<{columns: Array<{key?: string; render?: LegacyAny; title?: () => React.ReactNode}>; title: () => React.ReactNode}>}>;
  const tableElement = React.Children.toArray(table.props.children)[0] as React.ReactElement<{columns: Array<{key?: string; render?: LegacyAny}>; title: () => React.ReactNode}>;
  const columns = tableElement.props.columns;

  const nameView = render(<MemoryRouter>{columns.find(column => column.key === "name")?.render?.("order_123", order, 0)}</MemoryRouter>);
  expect(nameView.getByText("order_123").closest("a")?.getAttribute("href")).toBe("/orders/built-in/order_123");
  nameView.unmount();

  const productsView = render(<MemoryRouter>{columns.find(column => column.key === "products")?.render?.(order.products, order, 0)}</MemoryRouter>);
  expect(productsView.getByText("Workspace Credits")).not.toBeNull();
  fireEvent.click(productsView.container.querySelector("button"));
  expect(Setting.goToLinkSoft).toHaveBeenCalledWith(page, "/products/built-in/workspace_credits");
  productsView.unmount();

  const priceView = render(<MemoryRouter>{columns.find(column => column.key === "price")?.render?.(24, order, 0)}</MemoryRouter>);
  expect(priceView.getByText("$24.00 (USD)").closest("a")?.getAttribute("href")).toBe("/payments/built-in/payment_123");
  priceView.unmount();

  const emptyUserView = render(<>{columns.find(column => column.key === "user")?.render?.("", {...order, user: ""}, 0)}</>);
  expect(emptyUserView.container.textContent).toBe("(empty)");
  emptyUserView.unmount();

  const actionView = render(<>{columns.find(column => column.key === "op")?.render?.(undefined, order, 0)}</>);
  fireEvent.click(actionView.getByText("Pay"));
  expect(history.push).toHaveBeenCalledWith("/orders/built-in/order_123/pay");
  fireEvent.click(actionView.getByText("Cancel"));
  expect(page.cancelOrder).toHaveBeenCalledWith(order);
  fireEvent.click(actionView.getByText("Edit"));
  expect(history.push).toHaveBeenCalledWith({pathname: "/orders/built-in/order_123", mode: "edit"});
  fireEvent.click(actionView.getByText("Delete"));
  expect(page.deleteOrder).toHaveBeenCalledWith(0);
  actionView.unmount();

  const toolbarView = render(<>{tableElement.props.title()}</>);
  fireEvent.click(toolbarView.getByText("Add"));
  expect(orderBackendMock.addOrder).toHaveBeenCalled();
});

test("keeps OrderListPage error branches and non-admin renderers stable", async() => {
  const history = createHistory();
  const page = createOrderListPage({
    account: {...account, isAdmin: false},
    history,
  });
  jestValue.spyOn(Setting, "isLocalAdminUser").mockReturnValue(false);

  const table = page.renderTable([makeOrder({state: "Paid", payment: "", productInfos: []})]) as React.ReactElement<{children: React.ReactElement<{columns: Array<{key?: string; render?: LegacyAny; title?: () => React.ReactNode}>; title: () => React.ReactNode}>}>;
  const tableElement = React.Children.toArray(table.props.children)[0] as React.ReactElement<{columns: Array<{key?: string; render?: LegacyAny}>; title: () => React.ReactNode}>;
  const columns = tableElement.props.columns;

  const organizationView = render(<MemoryRouter>{columns.find(column => column.key === "owner")?.render?.("built-in", order, 0)}</MemoryRouter>);
  expect(organizationView.getByText("built-in").closest("a")?.getAttribute("href")).toBe("/organizations/built-in");
  organizationView.unmount();

  expect(columns.find(column => column.key === "createdTime")?.render?.("2026-06-20T10:00:00Z", order, 0)).toBe("formatted:2026-06-20T10:00:00Z");
  expect(columns.find(column => column.key === "products")?.render?.([], makeOrder({productInfos: []}), 0)).toBe("(empty)");

  const userView = render(<MemoryRouter>{columns.find(column => column.key === "user")?.render?.("alice", order, 0)}</MemoryRouter>);
  expect(userView.getByText("alice").closest("a")?.getAttribute("href")).toBe("/users/built-in/alice");
  userView.unmount();

  const stateView = render(<>{columns.find(column => column.key === "state")?.render?.("Paid", makeOrder({state: "Paid", message: "already paid"}), 0)}</>);
  expect(stateView.getByText("Paid")).not.toBeNull();
  stateView.unmount();

  const priceView = render(<MemoryRouter>{columns.find(column => column.key === "price")?.render?.(24, makeOrder({payment: ""}), 0)}</MemoryRouter>);
  expect(priceView.getByText("$24.00 (USD)").closest("a")).toBeNull();
  priceView.unmount();

  const actionView = render(<>{columns.find(column => column.key === "op")?.render?.(undefined, makeOrder({state: "Paid"}), 0)}</>);
  fireEvent.click(actionView.getByText("Detail"));
  expect(history.push).toHaveBeenCalledWith("/orders/built-in/order_123/pay");
  fireEvent.click(actionView.getByText("View"));
  expect(history.push).toHaveBeenCalledWith({pathname: "/orders/built-in/order_123", mode: "view"});
  expect(actionView.queryByText("Delete")).toBeNull();
  expect(actionView.getByText("Cancel").closest("button")?.hasAttribute("disabled")).toBe(true);
  actionView.unmount();

  const toolbarView = render(<>{tableElement.props.title()}</>);
  expect(toolbarView.getByText("Add").closest("button")?.hasAttribute("disabled")).toBe(true);
  toolbarView.unmount();

  orderBackendMock.addOrder.mockResolvedValueOnce({status: "error", msg: "add failed"});
  page.addOrder();
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "Failed to add: add failed");

  orderBackendMock.addOrder.mockRejectedValueOnce(new Error("add network down"));
  page.addOrder();
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("add network down"));

  orderBackendMock.cancelOrder.mockResolvedValueOnce({status: "error", msg: "cancel failed"});
  page.cancelOrder(order);
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "Failed to cancel: cancel failed");

  orderBackendMock.cancelOrder.mockRejectedValueOnce(new Error("cancel network down"));
  page.cancelOrder(order);
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("cancel network down"));

  orderBackendMock.deleteOrder.mockResolvedValueOnce({status: "error", msg: "delete failed"});
  page.deleteOrder(0);
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "Failed to delete: delete failed");

  orderBackendMock.deleteOrder.mockRejectedValueOnce(new Error("delete network down"));
  page.deleteOrder(0);
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete network down"));

  jestValue.spyOn(Setting, "isResponseDenied").mockReturnValueOnce(true);
  orderBackendMock.getOrders.mockResolvedValueOnce({status: "error", msg: "denied"});
  page.fetch({pagination: {current: 1, pageSize: 10}});
  await flushAsyncWork();
  expect(page.state.isAuthorized).toBe(false);

  jestValue.spyOn(Setting, "isDefaultOrganizationSelected").mockReturnValueOnce(true);
  orderBackendMock.getOrders.mockResolvedValueOnce({status: "error", msg: "list failed"});
  page.fetch({pagination: {current: 3, pageSize: 20}});
  await flushAsyncWork();
  expect(orderBackendMock.getOrders).toHaveBeenLastCalledWith("", 3, 20, undefined, undefined, undefined, undefined);
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "list failed");
});

test("keeps OrderEditPage loading, field updates, save and delete behavior stable", async() => {
  const history = createHistory();
  const page = createOrderEditPage({history});

  orderBackendMock.getOrder.mockResolvedValueOnce({status: "ok", data: null});
  page.getOrder();
  await flushAsyncWork();
  expect(history.push).toHaveBeenCalledWith("/404");

  orderBackendMock.getOrder.mockResolvedValueOnce({status: "ok", data: makeOrder()});
  page.getOrder();
  await flushAsyncWork();
  expect(page.state.order).toEqual(order);

  page.getProducts();
  page.getPayments();
  await flushAsyncWork();
  expect(page.state.products).toEqual([product]);
  expect(page.state.payments).toEqual([{name: "payment_123"}]);

  page.updateOrderField("displayName", "Updated Order");
  expect(page.state.order?.displayName).toBe("Updated Order");

  page.submitOrderEdit(false);
  await flushAsyncWork();
  expect(orderBackendMock.updateOrder).toHaveBeenCalledWith("built-in", "order_123", expect.objectContaining({displayName: "Updated Order"}));
  expect(history.push).toHaveBeenCalledWith("/orders/built-in/order_123");

  page.submitOrderEdit(true);
  await flushAsyncWork();
  expect(history.push).toHaveBeenCalledWith("/orders");

  page.deleteOrder();
  await flushAsyncWork();
  expect(orderBackendMock.deleteOrder).toHaveBeenCalledWith(expect.objectContaining({name: "order_123"}));
  expect(history.push).toHaveBeenCalledWith("/orders");
});

test("keeps OrderEditPage render and failure branches stable", async() => {
  const page = createOrderEditPage();
  const view = render(<MemoryRouter>{page.renderOrder()}</MemoryRouter>);
  expect(view.getByDisplayValue("Workspace Order")).not.toBeNull();
  fireEvent.change(view.getByDisplayValue("Workspace Order"), {target: {value: "Changed"}});
  expect(page.state.order?.displayName).toBe("Changed");
  view.unmount();

  productBackendMock.getProducts.mockResolvedValueOnce({status: "error", msg: "products failed"});
  page.getProducts();
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "Failed to get products: products failed");

  paymentBackendMock.getPayments.mockResolvedValueOnce({status: "error", msg: "payments failed"});
  page.getPayments();
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "Failed to get payments: payments failed");

  orderBackendMock.updateOrder.mockResolvedValueOnce({status: "error", msg: "save failed"});
  page.submitOrderEdit(false);
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "Failed to save: save failed");

  orderBackendMock.deleteOrder.mockResolvedValueOnce({status: "error", msg: "delete failed"});
  page.deleteOrder();
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "Failed to delete: delete failed");
});

test("keeps OrderEditPage guarded updates, form callbacks and modes stable", async() => {
  const history = createHistory();
  const page = createOrderEditPage({history, location: {mode: "add"}});
  const getOrderSpy = jestValue.spyOn(page, "getOrder");
  const getProductsSpy = jestValue.spyOn(page, "getProducts");
  const getPaymentsSpy = jestValue.spyOn(page, "getPayments");

  page.UNSAFE_componentWillMount();
  expect(getOrderSpy).toHaveBeenCalled();
  expect(getProductsSpy).toHaveBeenCalled();
  expect(getPaymentsSpy).toHaveBeenCalled();

  jestValue.spyOn(Setting, "myParseInt").mockReturnValueOnce(42);
  expect(page.parseOrderField("", "42")).toBe(42);

  page.setState({order: null});
  page.updateOrderField("displayName", "Ignored");
  expect(page.renderOrder()).toBeNull();
  page.submitOrderEdit(false);
  page.deleteOrder();
  expect(orderBackendMock.updateOrder).not.toHaveBeenCalledWith("built-in", "order_123", null);

  page.setState({order: makeOrder(), mode: "add"});
  const addTree = page.renderOrder();
  const addTitleView = render(<MemoryRouter>{addTree}</MemoryRouter>);
  expect(addTitleView.getByText("New Order")).not.toBeNull();
  addTitleView.unmount();

  const inputs = collectElements(addTree, element => typeof element.props.onChange === "function" && element.props.value !== undefined);
  inputs.find(element => element.props.value === "order_123")?.props.onChange({target: {value: "order_456"}});
  inputs.find(element => element.props.value === "Workspace Order")?.props.onChange({target: {value: "Changed Order"}});
  inputs.find(element => element.props.value === "ready")?.props.onChange({target: {value: "changed message"}});
  expect(page.state.order?.name).toBe("order_456");
  expect(page.state.order?.displayName).toBe("Changed Order");
  expect(page.state.order?.message).toBe("changed message");

  const selects = collectElements(addTree, element => typeof element.props.onChange === "function" && element.type !== "input");
  selects.find(element => Array.isArray(element.props.value))?.props.onChange(["workspace_credits", "addon"]);
  selects.find(element => element.props.value === "alice")?.props.onChange("");
  selects.find(element => element.props.value === "payment_123")?.props.onChange("");
  selects.find(element => element.props.value === "Created")?.props.onChange("Paid");
  expect(page.state.order?.products).toEqual(["workspace_credits", "addon"]);
  expect(page.state.order?.user).toBe("");
  expect(page.state.order?.payment).toBe("");
  expect(page.state.order?.state).toBe("Paid");

  const addBottomView = render(<MemoryRouter>{page.render()}</MemoryRouter>);
  expect(addBottomView.getAllByText("Cancel").length).toBeGreaterThan(0);
  addBottomView.unmount();

  const viewModePage = createOrderEditPage({location: {mode: "view"}});
  const viewModeView = render(<MemoryRouter>{viewModePage.render()}</MemoryRouter>);
  expect(viewModeView.getByText("View Order")).not.toBeNull();
  expect(viewModeView.queryByText("Save & Exit")).toBeNull();
  viewModeView.unmount();

  orderBackendMock.updateOrder.mockRejectedValueOnce(new Error("save network down"));
  page.setState({order: makeOrder()});
  page.submitOrderEdit(false);
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("save network down"));

  orderBackendMock.deleteOrder.mockRejectedValueOnce(new Error("delete network down"));
  page.deleteOrder();
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete network down"));
});

test("keeps OrderPayPage loading, render and normal payment behavior stable", async() => {
  const page = createOrderPayPage();
  const getProductSpy = jestValue.spyOn(page, "getProduct");

  page.getOrder();
  await flushAsyncWork();
  expect(orderBackendMock.getOrder).toHaveBeenCalledWith("built-in", "order_123");
  expect(page.state.order).toEqual(order);
  expect(getProductSpy).toHaveBeenCalled();

  page.getProduct();
  await flushAsyncWork();
  expect(productBackendMock.getProduct).toHaveBeenCalledWith("built-in", "workspace_credits");
  expect(page.state.firstProduct).toEqual(product);

  const view = render(<MemoryRouter>{page.render()}</MemoryRouter>);
  expect(view.getByText("Workspace Credits")).not.toBeNull();
  expect(view.getByText("Stripe")).not.toBeNull();
  expect(view.getByText("WeChat Pay")).not.toBeNull();
  view.unmount();

  page.payOrder(provider);
  await flushAsyncWork();
  expect(orderBackendMock.payOrder).toHaveBeenCalledWith("built-in", "order_123", "stripe-main", "");
  expect(Setting.goToLink).toHaveBeenCalledWith("/pay");
});

test("keeps OrderPayPage WeChat, QR code and failure branches stable", async() => {
  const page = createOrderPayPage();

  Object.defineProperty(navigator, "userAgent", {value: "micromessenger mobile", configurable: true});
  page.getPaymentEnv();
  expect(page.state.paymentEnv).toBe("WechatBrowser");

  const bridgeInvoke = jestValue.fn((method: string, payload: LegacyAny, callback: (res: {err_msg: string}) => void) => {
    callback({err_msg: "get_brand_wcpay_request:ok"});
  });
  (window as unknown as {WeixinJSBridge?: LegacyAny}).WeixinJSBridge = {invoke: bridgeInvoke};
  orderBackendMock.payOrder.mockResolvedValueOnce({
    status: "ok",
    data: {owner: "built-in", name: "payment_wechat", payUrl: "weixin://pay", successUrl: "/success"},
    data2: {appId: "app", timeStamp: "1", nonceStr: "nonce", package: "pkg", signType: "MD5", paySign: "sign"},
  });
  page.payOrder(wechatProvider);
  await flushAsyncWork();
  expect(bridgeInvoke).toHaveBeenCalledWith("getBrandWCPayRequest", expect.objectContaining({appId: "app"}), expect.any(Function));
  expect(Setting.goToLink).toHaveBeenCalledWith("/success");

  page.setState({paymentEnv: ""});
  orderBackendMock.payOrder.mockResolvedValueOnce({
    status: "ok",
    data: {owner: "built-in", name: "payment_qr", payUrl: "weixin://pay", successUrl: "/success"},
    data2: {},
  });
  page.payOrder(wechatProvider);
  await flushAsyncWork();
  expect(Setting.goToLink).toHaveBeenCalledWith("/qrcode/built-in/payment_qr?providerName=wechat-main&payUrl=weixin%3A%2F%2Fpay&successUrl=%2Fsuccess");

  orderBackendMock.payOrder.mockResolvedValueOnce({status: "error", msg: "pay failed"});
  page.payOrder(provider);
  await flushAsyncWork();
  expect(page.state.isProcessingPayment).toBe(false);
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "Payment failed: pay failed");

  orderBackendMock.payOrder.mockRejectedValueOnce(new Error("pay network down"));
  page.payOrder(provider);
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("pay network down"));

  const emptyProviderPage = createOrderPayPage();
  emptyProviderPage.setState({firstProduct: {...product, providerObjs: []}});
  expect(render(<>{emptyProviderPage.renderPaymentMethods()}</>).getByText("There is no payment channel for this product.")).not.toBeNull();
});

test("keeps OrderPayPage guards, provider fallbacks and rendered product variants stable", async() => {
  const page = createOrderPayPage();

  page.componentDidMount();
  await flushAsyncWork();
  expect(orderBackendMock.getOrder).toHaveBeenCalledWith("built-in", "order_123");

  const missingParamsPage = createOrderPayPage({match: {params: {}}});
  missingParamsPage.getOrder();
  await flushAsyncWork();
  expect(orderBackendMock.getOrder).not.toHaveBeenCalledWith(null, null);

  orderBackendMock.getOrder.mockResolvedValueOnce({status: "error", msg: "order failed"});
  page.getOrder();
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "order failed");

  const productFallbackPage = createOrderPayPage();
  productFallbackPage.setState({order: makeOrder({products: [], productInfos: [{...productInfo, name: "fallback_product"}]})});
  productFallbackPage.getProduct();
  await flushAsyncWork();
  expect(productBackendMock.getProduct).toHaveBeenCalledWith("built-in", "fallback_product");

  productFallbackPage.setState({order: makeOrder({products: [], productInfos: []})});
  productBackendMock.getProduct.mockClear();
  productFallbackPage.getProduct();
  await flushAsyncWork();
  expect(productBackendMock.getProduct).not.toHaveBeenCalled();

  productFallbackPage.setState({order: null});
  productFallbackPage.getProduct();
  await flushAsyncWork();
  expect(productBackendMock.getProduct).not.toHaveBeenCalled();

  productBackendMock.getProduct.mockResolvedValueOnce({status: "error", msg: "product failed"});
  page.getProduct();
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "product failed");

  page.setState({firstProduct: null});
  page.payOrder(provider);
  await flushAsyncWork();
  expect(orderBackendMock.payOrder).not.toHaveBeenCalledWith("built-in", "order_123", "stripe-main", "");

  const unknownProviderView = render(<>{page.getPayButton({...provider, type: "BankCard"}, () => {})}</>);
  expect(unknownProviderView.getByText("BankCard")).not.toBeNull();
  unknownProviderView.unmount();

  const productVariantView = render(<>{page.renderProduct({...productInfo, quantity: undefined, detail: undefined, pricingName: "monthly", planName: "pro"})}</>);
  expect(productVariantView.getByText("monthly")).not.toBeNull();
  expect(productVariantView.getByText("pro")).not.toBeNull();
  expect(productVariantView.getByText("1")).not.toBeNull();
  productVariantView.unmount();

  const paidPage = createOrderPayPage();
  paidPage.setState({order: makeOrder({state: "Paid"}), isViewMode: true});
  const paidView = render(<MemoryRouter>{paidPage.render()}</MemoryRouter>);
  expect(paidView.getByText("Payment time")).not.toBeNull();
  expect(paidView.queryByText("Stripe")).toBeNull();
  paidView.unmount();

  const nullRenderPage = createOrderPayPage();
  nullRenderPage.setState({order: null});
  expect(nullRenderPage.render()).toBeNull();
});

test("keeps OrderPayPage WeChat bridge cancel, failure and delayed bridge branches stable", () => {
  const page = createOrderPayPage();
  const addEventListenerSpy = jestValue.spyOn(document, "addEventListener");
  const attachInfo = {
    appId: "app",
    timeStamp: "1",
    nonceStr: "nonce",
    package: "pkg",
    signType: "MD5",
    paySign: "sign",
    payment: {owner: "built-in", name: "payment_wechat", successUrl: "/success"},
  };

  page.callWechatPay(attachInfo);
  expect(addEventListenerSpy).toHaveBeenCalledWith("WeixinJSBridgeReady", expect.any(Function), false);

  const bridgeCallback = addEventListenerSpy.mock.calls.find(call => call[0] === "WeixinJSBridgeReady")?.[1] as (() => void) | undefined;
  const bridgeInvoke = jestValue.fn((method: string, payload: LegacyAny, callback: (res: {err_msg: string}) => void) => {
    callback({err_msg: "get_brand_wcpay_request:cancel"});
  });
  (window as unknown as {WeixinJSBridge?: LegacyAny}).WeixinJSBridge = {invoke: bridgeInvoke};
  bridgeCallback?.();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "Payment cancelled");

  bridgeInvoke.mockImplementation((method: string, payload: LegacyAny, callback: (res: {err_msg: string}) => void) => {
    callback({err_msg: "get_brand_wcpay_request:fail"});
  });
  page.onBridgeReady(attachInfo);
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "Payment failed");
});
