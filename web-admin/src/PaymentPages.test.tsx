/* eslint-env jest */
import React from "react";
import * as fs from "fs";
import * as path from "path";
import {expect as jestExpect, jest as jestValue} from "@jest/globals";
import {cleanup, render} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import PaymentResultPage from "./PaymentResultPage";
import PaymentListPage from "./PaymentListPage";
import PaymentEditPage from "./PaymentEditPage";
import * as PaymentBackend from "./backend/PaymentBackend";
import * as PricingBackend from "./backend/PricingBackend";
import * as SubscriptionBackend from "./backend/SubscriptionBackend";
import * as UserBackend from "./backend/UserBackend";
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
type PaymentBackendMock = Record<keyof typeof PaymentBackend, LooseMock>;
type PricingBackendMock = Record<keyof typeof PricingBackend, LooseMock>;
type SubscriptionBackendMock = Record<keyof typeof SubscriptionBackend, LooseMock>;
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
type ProductInfo = {
  name: string;
  displayName?: string;
  price: number;
  quantity?: number;
};
type PaymentRecord = {
  owner: string;
  name: string;
  createdTime: string;
  displayName: string;
  provider: string;
  type: string;
  user: string;
  products: string[];
  productsDisplayName: string;
  order?: string;
  orderObj?: {
    productInfos?: ProductInfo[];
  };
  detail: string;
  tag: string;
  currency: string;
  price: number;
  payUrl: string;
  state: string;
  message: string;
  isRecharge?: boolean;
  invoiceUrl: string;
  invoiceType: string;
  invoiceTitle: string;
  invoiceTaxId: string;
  invoiceRemark: string;
  personName: string;
  personIdCard: string;
  personEmail: string;
  personPhone: string;
  [key: string]: LegacyAny;
};

const paymentBackendMock = PaymentBackend as unknown as PaymentBackendMock;
const pricingBackendMock = PricingBackend as unknown as PricingBackendMock;
const subscriptionBackendMock = SubscriptionBackend as unknown as SubscriptionBackendMock;
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

jest.mock("./backend/PaymentBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    addPayment: factoryJest.fn(),
    deletePayment: factoryJest.fn(),
    getPayment: factoryJest.fn(),
    getPayments: factoryJest.fn(),
    invoicePayment: factoryJest.fn(),
    notifyPayment: factoryJest.fn(),
    updatePayment: factoryJest.fn(),
  };
});

jest.mock("./backend/PricingBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    getPricing: factoryJest.fn(),
  };
});

jest.mock("./backend/SubscriptionBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    getSubscription: factoryJest.fn(),
  };
});

jest.mock("./backend/UserBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    getUser: factoryJest.fn(),
  };
});

jest.mock("./auth/Provider", () => {
  const ReactFactory = require("react");
  return {
    getProviderLogoWidget: (provider: {type?: string}) => ReactFactory.createElement("span", null, `provider:${provider.type}`),
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
const productInfo: ProductInfo = {
  name: "workspace_credits",
  displayName: "Workspace Credits",
  price: 12,
  quantity: 2,
};
const payment: PaymentRecord = {
  owner: "built-in",
  name: "payment_123",
  createdTime: "2026-06-20T10:00:00Z",
  displayName: "Workspace Payment",
  provider: "provider_pay_paypal",
  type: "PayPal",
  user: "alice",
  products: ["workspace_credits"],
  productsDisplayName: "Workspace Credits",
  order: "order_123",
  orderObj: {productInfos: [productInfo]},
  detail: "payment detail",
  tag: "Promotion-1",
  currency: "USD",
  price: 24,
  payUrl: "/pay",
  state: "Paid",
  message: "paid",
  invoiceUrl: "",
  invoiceType: "Individual",
  invoiceTitle: "Alice",
  invoiceTaxId: "",
  invoiceRemark: "remark",
  personName: "Alice",
  personIdCard: "110101199001010011",
  personEmail: "alice@example.test",
  personPhone: "13800138000",
};

function makePayment(overrides: Partial<PaymentRecord> = {}): PaymentRecord {
  return {
    ...payment,
    products: [...payment.products],
    orderObj: {productInfos: payment.orderObj?.productInfos?.map(item => ({...item}))},
    ...overrides,
  };
}

function flushPromises() {
  return Promise.resolve();
}

async function flushAsyncWork() {
  await flushPromises();
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

function createPaymentResultPage(props: Record<string, LegacyAny> = {}) {
  const page = new PaymentResultPage({
    account,
    history: createHistory(),
    match: {params: {organizationName: "built-in", paymentName: "payment_123"}},
    onUpdatePricing: jestValue.fn(),
    ...props,
  }) as unknown as Harness<PaymentResultPage>;
  installSynchronousSetState(page);
  page.state = {
    ...page.state,
    payment: makePayment(),
    pricing: null,
    subscription: null,
    timeout: null,
    user: {balance: 100},
  };
  return page;
}

function createPaymentListPage(props: Record<string, LegacyAny> = {}) {
  const PaymentListPageClass = PaymentListPage as unknown as {new(props: Record<string, LegacyAny>): PaymentListPage};
  const page = new PaymentListPageClass({
    account,
    history: createHistory(),
    match: {path: "/payments", params: {}},
    ...props,
  }) as unknown as Harness<PaymentListPage>;
  installSynchronousSetState(page);
  page.state = {
    ...page.state,
    data: [makePayment()],
    pagination: {current: 2, pageSize: 10, total: 11},
    loading: false,
  };
  page.getColumnSearchProps = jestValue.fn(() => ({})) as unknown as LooseMock;
  page.getTablePaginationProps = jestValue.fn(() => false) as unknown as LooseMock;
  page.handleTableChange = jestValue.fn() as unknown as LooseMock;
  return page;
}

function createPaymentEditPage(props: Record<string, LegacyAny> = {}) {
  const page = new PaymentEditPage({
    account,
    history: createHistory(),
    match: {params: {organizationName: "built-in", paymentName: "payment_123"}},
    location: {mode: "edit"},
    ...props,
  }) as unknown as Harness<PaymentEditPage>;
  installSynchronousSetState(page);
  page.state = {
    ...page.state,
    payment: makePayment(),
    isModalVisible: false,
    isInvoiceLoading: false,
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
  jestValue.spyOn(Setting, "goToLinkSoft").mockImplementation(() => {});
  jestValue.spyOn(Setting, "openLinkSafe").mockImplementation(() => {});
  jestValue.spyOn(Setting, "scrollToDiv").mockImplementation(() => {});
  jestValue.spyOn(Setting, "renderHelmet").mockReturnValue(null);
  jestValue.spyOn(Setting, "getRandomName").mockReturnValue("abc123");
  jestValue.spyOn(Setting, "getRequestOrganization").mockReturnValue("built-in");
  jestValue.spyOn(Setting, "isDefaultOrganizationSelected").mockReturnValue(false);
  jestValue.spyOn(Setting, "isLocalAdminUser").mockReturnValue(true);
  jestValue.spyOn(Setting, "isMobile").mockReturnValue(false);
  jestValue.spyOn(Setting, "getFormattedDate").mockImplementation((value: LegacyAny) => `formatted:${value}`);
  jestValue.spyOn(Setting, "getCurrencySymbol").mockReturnValue("$");
  jestValue.spyOn(Setting, "getCurrencyText").mockReturnValue("USD");
  jestValue.spyOn(Setting, "getPriceDisplay").mockImplementation(((value: LegacyAny, currency: LegacyAny) => `$${value} (${currency})`) as LegacyAny);
  jestValue.spyOn(Setting, "getProviderTypeOptions").mockReturnValue([{id: "PayPal", name: "PayPal"}]);
  jestValue.spyOn(Setting, "getLabel").mockImplementation(((label: LegacyAny) => `${label}`) as LegacyAny);
  jestValue.spyOn(Setting, "isValidPersonName").mockReturnValue(true);
  jestValue.spyOn(Setting, "isValidIdCard").mockReturnValue(true);
  jestValue.spyOn(Setting, "isValidEmail").mockReturnValue(true);
  jestValue.spyOn(Setting, "isValidPhone").mockReturnValue(true);
  jestValue.spyOn(Setting, "isValidInvoiceTitle").mockReturnValue(true);
  jestValue.spyOn(Setting, "isValidTaxId").mockReturnValue(true);

  paymentBackendMock.addPayment.mockResolvedValue({status: "ok"});
  paymentBackendMock.deletePayment.mockResolvedValue({status: "ok"});
  paymentBackendMock.getPayment.mockResolvedValue({status: "ok", data: makePayment()});
  paymentBackendMock.getPayments.mockResolvedValue({status: "ok", data: [makePayment()], data2: 1});
  paymentBackendMock.invoicePayment.mockResolvedValue({status: "ok", data: "/invoice.pdf"});
  paymentBackendMock.notifyPayment.mockResolvedValue({status: "ok"});
  paymentBackendMock.updatePayment.mockResolvedValue({status: "ok"});
  pricingBackendMock.getPricing.mockResolvedValue({status: "ok", data: {name: "pricing_monthly"}});
  subscriptionBackendMock.getSubscription.mockResolvedValue({status: "ok", data: {name: "sub_123", payment: "payment_123"}});
  userBackendMock.getUser.mockResolvedValue({status: "ok", data: {name: "admin", balance: 100}});
});

afterEach(() => {
  jestValue.useRealTimers();
  jestValue.restoreAllMocks();
  jestValue.clearAllMocks();
  cleanup();
});

test("uses TSX files for migrated payment pages", () => {
  const srcDir = __dirname;

  ["PaymentResultPage", "PaymentListPage", "PaymentEditPage"].forEach(file => {
    expect(fs.existsSync(path.join(srcDir, `${file}.tsx`))).toBe(true);
    expect(fs.existsSync(path.join(srcDir, `${file}.js`))).toBe(false);
  });
});

test("keeps PaymentResultPage result states and navigation stable", () => {
  const history = createHistory();
  const page = createPaymentResultPage({history});

  const paidView = render(<>{page.render()}</>);
  expect(paidView.getByText(/You have successfully completed the payment/)).not.toBeNull();
  fireEvent.click(paidView.getByText("View Order"));
  expect(history.push).toHaveBeenCalledWith("/orders/built-in/order_123/pay");
  fireEvent.click(paidView.getByText("Return to Order List"));
  expect(history.push).toHaveBeenCalledWith("/orders");
  paidView.unmount();

  page.setState({payment: makePayment({isRecharge: true})});
  const rechargeView = render(<>{page.render()}</>);
  expect(rechargeView.getByText("Recharged successfully")).not.toBeNull();
  expect(rechargeView.getByText(/Your current balance is/)).not.toBeNull();
  rechargeView.unmount();

  ["Created", "Canceled", "Timeout", "Failed"].forEach(state => {
    page.setState({payment: makePayment({state, message: "failed reason"})});
    const stateView = render(<>{page.render()}</>);
    expect(stateView.container.textContent).toContain(state === "Created" ? "still under processing" : state);
    if (state !== "Created") {
      fireEvent.click(stateView.getByText("View Order"));
      expect(history.push).toHaveBeenCalledWith("/orders/built-in/order_123/pay");
      fireEvent.click(stateView.getByText("Return to Order List"));
      expect(history.push).toHaveBeenCalledWith("/orders");
    }
    stateView.unmount();
  });

  page.setState({payment: null});
  expect(page.render()).toBeNull();
  page.goToViewOrder();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "Order not found");
});

test("keeps PaymentResultPage loading, polling and error branches stable", async() => {
  jestValue.useFakeTimers();
  const onUpdatePricing = jestValue.fn();
  window.history.pushState({}, "", "/?subscription=sub_123");
  const page = createPaymentResultPage({
    onUpdatePricing,
    match: {params: {organizationName: "built-in", paymentName: undefined, pricingName: "pricing_monthly"}},
  });
  page.setState({
    payment: null,
    pricing: null,
    subscription: null,
    paymentName: null,
    pricingName: "pricing_monthly",
    subscriptionName: "sub_123",
  });
  paymentBackendMock.getPayment.mockResolvedValueOnce({status: "ok", data: makePayment({state: "Created", type: "PayPal"})});

  await page.getPayment();
  expect(pricingBackendMock.getPricing).toHaveBeenCalledWith("built-in", "pricing_monthly");
  expect(subscriptionBackendMock.getSubscription).toHaveBeenCalledWith("built-in", "sub_123");
  expect(onUpdatePricing).toHaveBeenCalledWith({name: "pricing_monthly"});
  expect(page.state.paymentName).toBe("payment_123");
  expect(page.state.timeout).not.toBeNull();

  jestValue.runOnlyPendingTimers();
  await flushAsyncWork();
  expect(paymentBackendMock.notifyPayment).toHaveBeenCalledWith("built-in", "payment_123");

  page.setState({payment: null, paymentName: "payment_123"});
  paymentBackendMock.getPayment.mockResolvedValueOnce({status: "ok", data: makePayment({state: "Paid"})});
  await page.getPayment();
  expect(userBackendMock.getUser).toHaveBeenCalledWith("built-in", "admin");

  userBackendMock.getUser.mockResolvedValueOnce({status: "error", msg: "user failed"});
  page.getUser();
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "user failed");

  userBackendMock.getUser.mockResolvedValueOnce({status: "ok", data: null});
  page.getUser();
  await flushAsyncWork();
  expect(page.props.history.push).toHaveBeenCalledWith("/404");

  pricingBackendMock.getPricing.mockResolvedValueOnce({status: "error", msg: "pricing failed"});
  page.setState({pricing: null, paymentName: null});
  await page.getPayment();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "pricing failed");

  const clearTimeoutSpy = jestValue.spyOn(global, "clearTimeout");
  page.setState({timeout: setTimeout(() => {}, 1000)});
  page.componentWillUnmount();
  expect(clearTimeoutSpy).toHaveBeenCalled();

  paymentBackendMock.getPayment.mockClear();
  const emptyPage = createPaymentResultPage();
  emptyPage.setState({owner: null, paymentName: null, pricingName: null, subscriptionName: null});
  await emptyPage.getPayment();
  expect(paymentBackendMock.getPayment).not.toHaveBeenCalled();

  subscriptionBackendMock.getSubscription.mockResolvedValueOnce({status: "error", msg: "subscription failed"});
  page.setState({pricing: {name: "pricing_monthly"}, subscription: null, paymentName: null});
  await page.getPayment();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "subscription failed");

  paymentBackendMock.notifyPayment.mockClear();
  paymentBackendMock.getPayment.mockResolvedValueOnce({status: "ok", data: makePayment({state: "Created", type: "Wire"})});
  page.setState({pricingName: null, subscriptionName: null, paymentName: "payment_123", payment: null});
  await page.getPayment();
  jestValue.runOnlyPendingTimers();
  await flushAsyncWork();
  expect(paymentBackendMock.notifyPayment).not.toHaveBeenCalled();
});

test("keeps PaymentListPage add, delete, fetch and renderers stable", async() => {
  const history = createHistory();
  const page = createPaymentListPage({history});

  expect(page.newPayment()).toEqual(expect.objectContaining({
    owner: "built-in",
    name: "payment_abc123",
    state: "Paid",
  }));

  page.addPayment();
  await flushAsyncWork();
  expect(paymentBackendMock.addPayment).toHaveBeenCalledWith(expect.objectContaining({name: "payment_abc123"}));
  expect(history.push).toHaveBeenCalledWith({pathname: "/payments/built-in/payment_abc123", mode: "add"});

  page.deletePayment(0);
  await flushAsyncWork();
  expect(paymentBackendMock.deletePayment).toHaveBeenCalledWith(expect.objectContaining({name: "payment_123"}));
  expect(Setting.showMessage).toHaveBeenCalledWith("success", "Successfully deleted");

  page.fetch({pagination: {current: 1, pageSize: 10}, type: "PayPal", searchedColumn: "name", searchText: "payment", sortField: "createdTime", sortOrder: "descend"});
  await flushAsyncWork();
  expect(paymentBackendMock.getPayments).toHaveBeenCalledWith("built-in", 1, 10, "type", "PayPal", "createdTime", "descend");

  const table = page.renderTable([payment]) as React.ReactElement<{children: React.ReactElement<{columns: Array<{key?: string; render?: LegacyAny}>; title: () => React.ReactNode}>}>;
  const tableElement = React.Children.toArray(table.props.children)[0] as React.ReactElement<{columns: Array<{key?: string; render?: LegacyAny}>; title: () => React.ReactNode}>;
  const columns = tableElement.props.columns;

  const nameView = render(<MemoryRouter>{columns.find(column => column.key === "name")?.render?.("payment_123", payment, 0)}</MemoryRouter>);
  expect(nameView.getByText("payment_123").closest("a")?.getAttribute("href")).toBe("/payments/built-in/payment_123");
  nameView.unmount();

  const providerView = render(<MemoryRouter>{columns.find(column => column.key === "provider")?.render?.("provider_pay_paypal", payment, 0)}</MemoryRouter>);
  expect(providerView.getByText("provider_pay_paypal").closest("a")?.getAttribute("href")).toBe("/providers/built-in/provider_pay_paypal");
  providerView.unmount();

  const productsView = render(<MemoryRouter>{columns.find(column => column.key === "products")?.render?.(payment.products, payment, 0)}</MemoryRouter>);
  expect(productsView.getByText("Workspace Credits")).not.toBeNull();
  fireEvent.click(productsView.container.querySelector("button"));
  expect(Setting.goToLinkSoft).toHaveBeenCalledWith(page, "/products/built-in/workspace_credits");
  productsView.unmount();

  expect(columns.find(column => column.key === "createdTime")?.render?.("2026-06-20T10:00:00Z", payment, 0)).toBe("formatted:2026-06-20T10:00:00Z");
  expect(columns.find(column => column.key === "products")?.render?.([], makePayment({orderObj: {productInfos: []}}), 0)).toBe("(empty)");
  expect(columns.find(column => column.key === "price")?.render?.(24, payment, 0)).toBe("$24 (USD)");
  expect(render(<>{columns.find(column => column.key === "type")?.render?.("PayPal", payment, 0)}</>).getByText("provider:PayPal")).not.toBeNull();

  const actionView = render(<>{columns.find(column => column.key === "op")?.render?.(undefined, payment, 0)}</>);
  fireEvent.click(actionView.getByText("Result"));
  expect(history.push).toHaveBeenCalledWith("/payments/built-in/payment_123/result");
  fireEvent.click(actionView.getByText("Edit"));
  expect(history.push).toHaveBeenCalledWith({pathname: "/payments/built-in/payment_123", mode: "edit"});
  fireEvent.click(actionView.getByText("Delete"));
  expect(paymentBackendMock.deletePayment).toHaveBeenCalled();
  actionView.unmount();
});

test("keeps PaymentListPage permission and error branches stable", async() => {
  const history = createHistory();
  const page = createPaymentListPage({account: {...account, isAdmin: false}, history});
  jestValue.spyOn(Setting, "isLocalAdminUser").mockReturnValue(false);

  const table = page.renderTable([payment]) as React.ReactElement<{children: React.ReactElement<{columns: Array<{key?: string; render?: LegacyAny}>; title: () => React.ReactNode}>}>;
  const tableElement = React.Children.toArray(table.props.children)[0] as React.ReactElement<{columns: Array<{key?: string; render?: LegacyAny}>; title: () => React.ReactNode}>;
  const columns = tableElement.props.columns;
  const actionView = render(<>{columns.find(column => column.key === "op")?.render?.(undefined, payment, 0)}</>);
  fireEvent.click(actionView.getByText("View"));
  expect(history.push).toHaveBeenCalledWith({pathname: "/payments/built-in/payment_123", mode: "view"});
  expect(actionView.getByText("Delete").closest("button")?.hasAttribute("disabled")).toBe(true);
  actionView.unmount();

  const toolbarView = render(<>{tableElement.props.title()}</>);
  expect(toolbarView.getByText("Add").closest("button")?.hasAttribute("disabled")).toBe(true);
  toolbarView.unmount();

  paymentBackendMock.addPayment.mockResolvedValueOnce({status: "error", msg: "add failed"});
  page.addPayment();
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "Failed to add: add failed");

  paymentBackendMock.addPayment.mockRejectedValueOnce(new Error("add network down"));
  page.addPayment();
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("add network down"));

  paymentBackendMock.deletePayment.mockResolvedValueOnce({status: "error", msg: "delete failed"});
  page.deletePayment(0);
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "Failed to delete: delete failed");

  paymentBackendMock.deletePayment.mockRejectedValueOnce(new Error("delete network down"));
  page.deletePayment(0);
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete network down"));

  jestValue.spyOn(Setting, "isResponseDenied").mockReturnValueOnce(true);
  paymentBackendMock.getPayments.mockResolvedValueOnce({status: "error", msg: "denied"});
  page.fetch({pagination: {current: 1, pageSize: 10}});
  await flushAsyncWork();
  expect(page.state.isAuthorized).toBe(false);

  jestValue.spyOn(Setting, "isDefaultOrganizationSelected").mockReturnValueOnce(true);
  paymentBackendMock.getPayments.mockResolvedValueOnce({status: "error", msg: "list failed"});
  page.fetch({pagination: {current: 3, pageSize: 20}});
  await flushAsyncWork();
  expect(paymentBackendMock.getPayments).toHaveBeenLastCalledWith("", 3, 20, undefined, undefined, undefined, undefined);
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "list failed");
});

test("keeps PaymentEditPage loading, invoice actions, save and delete behavior stable", async() => {
  const history = createHistory();
  const page = createPaymentEditPage({history});

  paymentBackendMock.getPayment.mockResolvedValueOnce({status: "ok", data: null});
  page.getPayment();
  await flushAsyncWork();
  expect(history.push).toHaveBeenCalledWith("/404");

  paymentBackendMock.getPayment.mockResolvedValueOnce({status: "ok", data: makePayment()});
  page.getPayment();
  await flushAsyncWork();
  expect(page.state.payment).toEqual(payment);
  expect(Setting.scrollToDiv).toHaveBeenCalledWith("invoice-area");

  page.goToViewOrder();
  expect(history.push).toHaveBeenCalledWith("/orders/built-in/order_123/pay");
  page.setState({payment: makePayment({order: ""})});
  page.goToViewOrder();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "Order not found");
  page.goToOrderList();
  expect(history.push).toHaveBeenCalledWith("/orders");

  page.setState({payment: makePayment()});
  page.downloadInvoice();
  expect(Setting.openLinkSafe).toHaveBeenCalledWith("");

  page.issueInvoice();
  await flushAsyncWork();
  expect(paymentBackendMock.invoicePayment).toHaveBeenCalledWith("built-in", "payment_123");
  expect(Setting.openLinkSafe).toHaveBeenCalledWith("/invoice.pdf");

  page.submitPaymentEdit(false);
  await flushAsyncWork();
  expect(paymentBackendMock.updatePayment).toHaveBeenCalledWith("built-in", "payment_123", expect.objectContaining({name: "payment_123"}));
  expect(history.push).toHaveBeenCalledWith("/payments/payment_123");

  page.submitPaymentEdit(true);
  await flushAsyncWork();
  expect(history.push).toHaveBeenCalledWith("/payments");

  page.deletePayment();
  await flushAsyncWork();
  expect(paymentBackendMock.deletePayment).toHaveBeenCalledWith(expect.objectContaining({name: "payment_123"}));
  expect(history.push).toHaveBeenCalledWith("/payments");
});

test("keeps PaymentEditPage form callbacks, validation and failure branches stable", async() => {
  const page = createPaymentEditPage({location: {mode: "add"}});
  jestValue.spyOn(Setting, "myParseInt").mockReturnValueOnce(7);
  expect(page.parsePaymentField("", "7")).toBe(7);

  const tree = page.renderPayment();
  const inputs = collectElements(tree, element => typeof element.props.onChange === "function" && element.props.value !== undefined);
  inputs.find(element => element.props.value === "Alice")?.props.onChange({target: {value: "Bob"}});
  inputs.find(element => element.props.value === "110101199001010011")?.props.onChange({target: {value: "110101199001010022"}});
  inputs.find(element => element.props.value === "alice@example.test")?.props.onChange({target: {value: "bob@example.test"}});
  inputs.find(element => element.props.value === "13800138000")?.props.onChange({target: {value: "13900139000"}});
  inputs.find(element => element.props.value === "remark")?.props.onChange({target: {value: "new remark"}});
  expect(page.state.payment!.personName).toBe("Bob");
  expect(page.state.payment!.invoiceTitle).toBe("Bob");
  expect(page.state.payment!.invoiceTaxId).toBe("");
  expect(page.state.payment!.personEmail).toBe("bob@example.test");
  expect(page.state.payment!.invoiceRemark).toBe("new remark");

  const selects = collectElements(tree, element => typeof element.props.onChange === "function" && element.props.value === "Individual");
  selects[0]?.props.onChange("Organization");
  expect(page.state.payment!.invoiceType).toBe("Organization");
  selects[0]?.props.onChange("Individual");
  expect(page.state.payment!.invoiceType).toBe("Individual");

  page.setState({payment: makePayment({invoiceType: "Organization", invoiceTitle: "Company", invoiceTaxId: "tax-id"})});
  const organizationInvoiceTree = page.renderPayment();
  const organizationInputs = collectElements(organizationInvoiceTree, element => typeof element.props.onChange === "function" && element.props.value !== undefined);
  organizationInputs.find(element => element.props.value === "Company")?.props.onChange({target: {value: "New Company"}});
  organizationInputs.find(element => element.props.value === "tax-id")?.props.onChange({target: {value: "new-tax-id"}});
  expect(page.state.payment!.invoiceTitle).toBe("New Company");
  expect(page.state.payment!.invoiceTaxId).toBe("new-tax-id");

  page.setState({payment: makePayment({state: "Created"})});
  expect(page.checkError()).toBe("Please pay the order first!");
  page.setState({payment: makePayment()});
  jestValue.spyOn(Setting, "isValidPersonName").mockReturnValueOnce(false);
  expect(page.checkError()).toBe("Please input your real name!");
  jestValue.spyOn(Setting, "isValidIdCard").mockReturnValueOnce(false);
  expect(page.checkError()).toBe("Please input the correct ID card number!");
  jestValue.spyOn(Setting, "isValidEmail").mockReturnValueOnce(false);
  expect(page.checkError()).toBe("The input is not valid Email!");
  jestValue.spyOn(Setting, "isValidPhone").mockReturnValueOnce(false);
  expect(page.checkError()).toBe("The input is not valid Phone!");
  page.setState({payment: makePayment({invoiceTitle: "Other"})});
  expect(page.checkError()).toBe("The input is not invoice title!");
  page.setState({payment: makePayment({invoiceTaxId: "tax"})});
  expect(page.checkError()).toBe("The input is not invoice Tax ID!");
  page.setState({payment: makePayment({invoiceType: "Organization", invoiceTitle: ""})});
  jestValue.spyOn(Setting, "isValidInvoiceTitle").mockReturnValueOnce(false);
  expect(page.checkError()).toBe("The input is not invoice title!");
  page.setState({payment: makePayment({invoiceType: "Organization", invoiceTitle: "Company", invoiceTaxId: ""})});
  jestValue.spyOn(Setting, "isValidTaxId").mockReturnValueOnce(false);
  expect(page.checkError()).toBe("The input is not invoice Tax ID!");

  const view = render(<MemoryRouter>{page.render()}</MemoryRouter>);
  expect(view.getAllByText("Cancel").length).toBeGreaterThan(0);
  fireEvent.click(view.getByText("Issue Invoice"));
  expect(page.state.isModalVisible).toBe(true);
  page.setState({isModalVisible: false});
  view.unmount();

  page.setState({payment: makePayment({invoiceUrl: "/existing-invoice.pdf"})});
  const invoiceView = render(<MemoryRouter>{page.render()}</MemoryRouter>);
  fireEvent.click(invoiceView.getByText("Download Invoice"));
  expect(Setting.openLinkSafe).toHaveBeenCalledWith("/existing-invoice.pdf");
  fireEvent.click(invoiceView.getByText("View Order"));
  expect(page.props.history.push).toHaveBeenCalledWith("/orders/built-in/order_123/pay");
  fireEvent.click(invoiceView.getByText("Return to Order List"));
  expect(page.props.history.push).toHaveBeenCalledWith("/orders");
  invoiceView.unmount();

  const readOnlyPage = createPaymentEditPage({location: {mode: "view"}});
  const readOnlyView = render(<MemoryRouter>{readOnlyPage.render()}</MemoryRouter>);
  expect(readOnlyView.getByText("View Payment")).not.toBeNull();
  readOnlyView.unmount();

  const modal = page.renderModal();
  const modalElements = collectElements(modal, element => typeof element.props.onCancel === "function" || typeof element.props.onOk === "function");
  modalElements[0]?.props.onCancel();
  expect(page.state.isModalVisible).toBe(false);

  paymentBackendMock.invoicePayment.mockResolvedValueOnce({status: "error", msg: "开票成功，请稍后查看"});
  page.issueInvoice();
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("info", "开票成功，请稍后查看");

  paymentBackendMock.invoicePayment.mockRejectedValueOnce(new Error("invoice network down"));
  page.issueInvoice();
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("invoice network down"));

  paymentBackendMock.updatePayment.mockResolvedValueOnce({status: "error", msg: "save failed"});
  page.setState({payment: makePayment({name: "renamed_payment"})});
  page.submitPaymentEdit(false);
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "Failed to save: save failed");
  expect(page.state.payment!.name).toBe("payment_123");

  paymentBackendMock.updatePayment.mockRejectedValueOnce(new Error("save network down"));
  page.submitPaymentEdit(false);
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("save network down"));

  paymentBackendMock.deletePayment.mockResolvedValueOnce({status: "error", msg: "delete failed"});
  page.deletePayment();
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "Failed to delete: delete failed");

  paymentBackendMock.deletePayment.mockRejectedValueOnce(new Error("delete network down"));
  page.deletePayment();
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete network down"));
});

test("keeps PaymentEditPage null guards stable", async() => {
  const page = createPaymentEditPage();
  page.setState({payment: null});

  paymentBackendMock.invoicePayment.mockClear();
  paymentBackendMock.updatePayment.mockClear();
  paymentBackendMock.deletePayment.mockClear();
  expect(page.renderPayment()).toBeNull();
  expect(page.checkError()).toBe("");

  page.updatePaymentField("personName", "Nobody");
  page.issueInvoice();
  page.downloadInvoice();
  page.submitPaymentEdit(false);
  page.deletePayment();

  expect(paymentBackendMock.invoicePayment).not.toHaveBeenCalled();
  expect(paymentBackendMock.updatePayment).not.toHaveBeenCalled();
  expect(paymentBackendMock.deletePayment).not.toHaveBeenCalled();

  paymentBackendMock.getPayment.mockResolvedValueOnce({status: "ok", data: makePayment()});
  page.UNSAFE_componentWillMount();
  await flushAsyncWork();
  expect(paymentBackendMock.getPayment).toHaveBeenCalledWith("built-in", "payment_123");
});
