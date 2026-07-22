import {afterEach, beforeEach, expect, test, vi} from "vitest";
import React from "react";
import * as fs from "fs";
import * as path from "path";
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
import {type ConsoleCallSpy, getAntdWarnings} from "./testUtils/reactAsyncWarnings";
import {fireEvent} from "@testing-library/react";
import {fileURLToPath} from "url";
const testFileDirectory = path.dirname(fileURLToPath(import.meta.url));

let consoleErrorSpy: ConsoleCallSpy;

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
const nativeSetTimeout = global.setTimeout;
const nativeClearTimeout = global.clearTimeout;

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

vi.mock("./backend/PaymentBackend", () => {
  return {
    addPayment: vi.fn(),
    deletePayment: vi.fn(),
    getPayment: vi.fn(),
    getPayments: vi.fn(),
    invoicePayment: vi.fn(),
    notifyPayment: vi.fn(),
    updatePayment: vi.fn(),
  };
});

vi.mock("./backend/PricingBackend", () => {
  return {
    getPricing: vi.fn(),
  };
});

vi.mock("./backend/SubscriptionBackend", () => {
  return {
    getSubscription: vi.fn(),
  };
});

vi.mock("./backend/UserBackend", () => {
  return {
    getUser: vi.fn(),
  };
});

vi.mock("./auth/Provider", async() => {
  const ReactFactory = await vi.importActual<typeof import("react")>("react");
  return {
    getProviderLogoWidget: (provider: {type?: string}) => ReactFactory.createElement("span", null, `provider:${provider.type}`),
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

function createPaymentResultPage(props: Record<string, LegacyAny> = {}) {
  const page = new PaymentResultPage({
    account,
    history: createHistory(),
    match: {params: {organizationName: "built-in", paymentName: "payment_123"}},
    onUpdatePricing: vi.fn(),
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
  page.getColumnSearchProps = vi.fn(() => ({})) as unknown as LooseMock;
  page.getTablePaginationProps = vi.fn(() => false) as unknown as LooseMock;
  page.handleTableChange = vi.fn() as unknown as LooseMock;
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
  consoleErrorSpy = vi.spyOn(console, "error") as unknown as ConsoleCallSpy;
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
  vi.spyOn(Setting, "goToLinkSoft").mockImplementation(() => {});
  vi.spyOn(Setting, "openLinkSafe").mockImplementation(() => {});
  vi.spyOn(Setting, "scrollToDiv").mockImplementation(() => {});
  vi.spyOn(Setting, "renderHelmet").mockReturnValue(null);
  vi.spyOn(Setting, "getRandomName").mockReturnValue("abc123");
  vi.spyOn(Setting, "getRequestOrganization").mockReturnValue("built-in");
  vi.spyOn(Setting, "isDefaultOrganizationSelected").mockReturnValue(false);
  vi.spyOn(Setting, "isLocalAdminUser").mockReturnValue(true);
  vi.spyOn(Setting, "isMobile").mockReturnValue(false);
  vi.spyOn(Setting, "getFormattedDate").mockImplementation((value: LegacyAny) => `formatted:${value}`);
  vi.spyOn(Setting, "getCurrencySymbol").mockReturnValue("$");
  vi.spyOn(Setting, "getCurrencyText").mockReturnValue("USD");
  vi.spyOn(Setting, "getPriceDisplay").mockImplementation(((value: LegacyAny, currency: LegacyAny) => `$${value} (${currency})`) as LegacyAny);
  vi.spyOn(Setting, "getProviderTypeOptions").mockReturnValue([{id: "PayPal", name: "PayPal"}]);
  vi.spyOn(Setting, "getLabel").mockImplementation(((label: LegacyAny) => `${label}`) as LegacyAny);
  vi.spyOn(Setting, "isValidPersonName").mockReturnValue(true);
  vi.spyOn(Setting, "isValidIdCard").mockReturnValue(true);
  vi.spyOn(Setting, "isValidEmail").mockReturnValue(true);
  vi.spyOn(Setting, "isValidPhone").mockReturnValue(true);
  vi.spyOn(Setting, "isValidInvoiceTitle").mockReturnValue(true);
  vi.spyOn(Setting, "isValidTaxId").mockReturnValue(true);

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
  cleanup();
  const antdWarnings = getAntdWarnings(consoleErrorSpy.mock.calls);
  consoleErrorSpy.mockRestore();
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.clearAllMocks();
  expect(antdWarnings).toEqual([]);
});

test("uses TSX files for migrated payment pages", () => {
  const srcDir = testFileDirectory;

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
    if (state === "Created") {
      const processingStatus = stateView.getByRole("status");
      expect(processingStatus.getAttribute("aria-live")).toBe("polite");
      expect(processingStatus.textContent).toContain("Processing...");
      expect(processingStatus.querySelector(".ant-spin")).not.toBeNull();
    }
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
  vi.useFakeTimers();
  const onUpdatePricing = vi.fn();
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

  vi.runOnlyPendingTimers();
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

  const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");
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
  vi.runOnlyPendingTimers();
  await flushAsyncWork();
  expect(paymentBackendMock.notifyPayment).not.toHaveBeenCalled();
});

test("restores native timer APIs after polling assertions", () => {
  expect(global.setTimeout).toBe(nativeSetTimeout);
  expect(global.clearTimeout).toBe(nativeClearTimeout);
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
  fireEvent.click(productsView.container.querySelector("button")!);
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
  vi.spyOn(Setting, "isLocalAdminUser").mockReturnValue(false);

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

  vi.spyOn(Setting, "isResponseDenied").mockReturnValueOnce(true);
  paymentBackendMock.getPayments.mockResolvedValueOnce({status: "error", msg: "denied"});
  page.fetch({pagination: {current: 1, pageSize: 10}});
  await flushAsyncWork();
  expect(page.state.isAuthorized).toBe(false);

  vi.spyOn(Setting, "isDefaultOrganizationSelected").mockReturnValueOnce(true);
  paymentBackendMock.getPayments.mockResolvedValueOnce({status: "error", msg: "list failed"});
  page.fetch({pagination: {current: 3, pageSize: 20}});
  await flushAsyncWork();
  expect(paymentBackendMock.getPayments).toHaveBeenLastCalledWith("", 3, 20, undefined, undefined, undefined, undefined);
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "list failed");
});

test("publishes the payment display name for its workspace tab and keeps read-only updates silent", async() => {
  const dispatchSpy = vi.spyOn(window, "dispatchEvent");
  const page = createPaymentEditPage();

  paymentBackendMock.getPayment.mockResolvedValueOnce({status: "ok", data: makePayment({displayName: "Workspace Payment"})});
  page.getPayment();
  await flushAsyncWork();

  const loadedEvent = dispatchSpy.mock.calls.at(-1)?.[0] as CustomEvent | undefined;
  expect(loadedEvent?.type).toBe("aicodex.admin.workspaceTabLabelUpdate");
  expect(loadedEvent?.detail).toEqual({
    path: "/payments/built-in/payment_123",
    label: "Edit Payment: Workspace Payment",
  });

  const eventCountBeforeOtherFieldUpdate = dispatchSpy.mock.calls.length;
  page.updatePaymentField("state", "Paid");
  expect(dispatchSpy).toHaveBeenCalledTimes(eventCountBeforeOtherFieldUpdate);

  page.updatePaymentField("displayName", "");
  const updatedEvent = dispatchSpy.mock.calls.at(-1)?.[0] as CustomEvent | undefined;
  expect(updatedEvent?.detail).toEqual({
    path: "/payments/built-in/payment_123",
    label: "Edit Payment: payment_123",
  });

  const readOnlyPage = createPaymentEditPage({location: {mode: "view"}});
  paymentBackendMock.getPayment.mockResolvedValueOnce({status: "ok", data: makePayment({displayName: "Read-only Payment"})});
  readOnlyPage.getPayment();
  await flushAsyncWork();
  const eventCountAfterReadOnlyLoad = dispatchSpy.mock.calls.length;

  readOnlyPage.updatePaymentField("displayName", "Ignored Payment");
  expect(dispatchSpy).toHaveBeenCalledTimes(eventCountAfterReadOnlyLoad);
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
  vi.spyOn(Setting, "myParseInt").mockReturnValueOnce(7);
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
  vi.spyOn(Setting, "isValidPersonName").mockReturnValueOnce(false);
  expect(page.checkError()).toBe("Please input your real name!");
  vi.spyOn(Setting, "isValidIdCard").mockReturnValueOnce(false);
  expect(page.checkError()).toBe("Please input the correct ID card number!");
  vi.spyOn(Setting, "isValidEmail").mockReturnValueOnce(false);
  expect(page.checkError()).toBe("The input is not valid Email!");
  vi.spyOn(Setting, "isValidPhone").mockReturnValueOnce(false);
  expect(page.checkError()).toBe("The input is not valid Phone!");
  page.setState({payment: makePayment({invoiceTitle: "Other"})});
  expect(page.checkError()).toBe("The input is not invoice title!");
  page.setState({payment: makePayment({invoiceTaxId: "tax"})});
  expect(page.checkError()).toBe("The input is not invoice Tax ID!");
  page.setState({payment: makePayment({invoiceType: "Organization", invoiceTitle: ""})});
  vi.spyOn(Setting, "isValidInvoiceTitle").mockReturnValueOnce(false);
  expect(page.checkError()).toBe("The input is not invoice title!");
  page.setState({payment: makePayment({invoiceType: "Organization", invoiceTitle: "Company", invoiceTaxId: ""})});
  vi.spyOn(Setting, "isValidTaxId").mockReturnValueOnce(false);
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
