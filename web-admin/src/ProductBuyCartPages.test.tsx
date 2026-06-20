/* eslint-env jest */
import React from "react";
import * as fs from "fs";
import * as path from "path";
import {expect as jestExpect, jest as jestValue} from "@jest/globals";
import {cleanup, render} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import ProductBuyPage from "./ProductBuyPage";
import CartListPage from "./CartListPage";
import * as ProductBackend from "./backend/ProductBackend";
import * as PlanBackend from "./backend/PlanBackend";
import * as PricingBackend from "./backend/PricingBackend";
import * as OrderBackend from "./backend/OrderBackend";
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
type ProductBackendMock = Record<keyof typeof ProductBackend, LooseMock>;
type PlanBackendMock = Record<keyof typeof PlanBackend, LooseMock>;
type PricingBackendMock = Record<keyof typeof PricingBackend, LooseMock>;
type OrderBackendMock = Record<keyof typeof OrderBackend, LooseMock>;
type UserBackendMock = Record<keyof typeof UserBackend, LooseMock>;
type TestStatePatch = Record<string, unknown> | ((state: Record<string, unknown>, props?: Record<string, unknown>) => Record<string, unknown> | null) | null;
type Harness<T> = T & {
  props: Record<string, LegacyAny>;
  state: Record<string, LegacyAny>;
  setState: (patch: TestStatePatch, callback?: () => void) => void;
};
type ProductRecord = {
  owner: string;
  name: string;
  displayName: string;
  image: string;
  tag: string;
  detail?: string;
  currency: string;
  price: number;
  quantity: number;
  sold: number;
  isRecharge: boolean;
  disableCustomRecharge?: boolean;
  rechargeOptions?: number[];
  providers: string[];
  state: string;
  [key: string]: LegacyAny;
};
type CartRecord = ProductRecord & {
  createdTime?: string;
  pricingName?: string;
  planName?: string;
  isInvalid?: boolean;
};

const productBackendMock = ProductBackend as unknown as ProductBackendMock;
const planBackendMock = PlanBackend as unknown as PlanBackendMock;
const pricingBackendMock = PricingBackend as unknown as PricingBackendMock;
const orderBackendMock = OrderBackend as unknown as OrderBackendMock;
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

jest.mock("./backend/ProductBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    getProduct: factoryJest.fn(),
  };
});

jest.mock("./backend/PlanBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    getPlan: factoryJest.fn(),
  };
});

jest.mock("./backend/PricingBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    getPricing: factoryJest.fn(),
  };
});

jest.mock("./backend/OrderBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    placeOrder: factoryJest.fn(),
  };
});

jest.mock("./backend/UserBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    getUser: factoryJest.fn(),
    updateUser: factoryJest.fn(),
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
const product: ProductRecord = {
  owner: "built-in",
  name: "workspace_credits",
  displayName: "Workspace Credits",
  image: "/img/product.png",
  tag: "cloud",
  detail: "Credits for usage",
  currency: "USD",
  price: 12,
  quantity: 99,
  sold: 3,
  isRecharge: false,
  providers: ["stripe-main"],
  state: "Published",
};
const rechargeProduct: ProductRecord = {
  ...product,
  name: "recharge_wallet",
  displayName: "Recharge Wallet",
  price: 0,
  isRecharge: true,
  rechargeOptions: [10, 20],
  disableCustomRecharge: false,
};
const disabledRechargeProduct: ProductRecord = {
  ...rechargeProduct,
  rechargeOptions: [],
  disableCustomRecharge: true,
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

function createProductBuyPage(props: Record<string, LegacyAny> = {}) {
  const page = new ProductBuyPage({
    account,
    history: createHistory(),
    match: {params: {organizationName: "built-in", productName: "workspace_credits"}},
    onUpdatePricing: jestValue.fn(),
    ...props,
  }) as unknown as Harness<ProductBuyPage>;
  installSynchronousSetState(page);
  return page;
}

function createCartListPage(props: Record<string, LegacyAny> = {}) {
  const page = new CartListPage({
    account,
    history: createHistory(),
    match: {path: "/cart", params: {}},
    ...props,
  }) as unknown as Harness<CartListPage>;
  installSynchronousSetState(page);
  page.state = {
    ...page.state,
    data: [],
    user: {owner: "built-in", name: "admin", cart: []},
    updatingCartItems: {},
    isPlacingOrder: false,
    loading: false,
    pagination: {current: 1, pageSize: 10, total: 0},
  };
  return page;
}

beforeEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
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
  jestValue.spyOn(Setting, "getLanguageText").mockImplementation((value: LegacyAny) => `${value || ""}`);
  jestValue.spyOn(Setting, "isMobile").mockReturnValue(false);
  productBackendMock.getProduct.mockResolvedValue({status: "ok", data: product});
  pricingBackendMock.getPricing.mockResolvedValue({status: "ok", data: {owner: "built-in", name: "monthly", currency: "USD"}});
  planBackendMock.getPlan.mockResolvedValue({status: "ok", data: {owner: "built-in", name: "basic", product: "workspace_credits"}});
  orderBackendMock.placeOrder.mockResolvedValue({status: "ok", data: {owner: "built-in", name: "order_123"}});
  userBackendMock.getUser.mockResolvedValue({status: "ok", data: {owner: "built-in", name: "admin", cart: []}});
  userBackendMock.updateUser.mockResolvedValue({status: "ok"});
});

afterEach(() => {
  jestValue.restoreAllMocks();
  jestValue.clearAllMocks();
  cleanup();
});

test("uses TSX files for migrated product buy and cart pages", () => {
  const srcDir = __dirname;

  ["ProductBuyPage", "CartListPage"].forEach(file => {
    expect(fs.existsSync(path.join(srcDir, `${file}.tsx`))).toBe(true);
    expect(fs.existsSync(path.join(srcDir, `${file}.js`))).toBe(false);
  });
});

test("keeps ProductBuyPage loading, pricing plan hydration and cart count behavior stable", async() => {
  window.history.pushState({}, "", "/products/built-in/workspace_credits/buy?plan=basic&user=alice&quantity=3");
  const onUpdatePricing = jestValue.fn();
  const page = createProductBuyPage({
    match: {params: {organizationName: "built-in", pricingName: "monthly"}},
    onUpdatePricing,
  });

  await page.getProduct();
  expect(pricingBackendMock.getPricing).toHaveBeenCalledWith("built-in", "monthly");
  expect(planBackendMock.getPlan).toHaveBeenCalledWith("built-in", "basic");
  expect(productBackendMock.getProduct).toHaveBeenCalledWith("built-in", "workspace_credits");
  expect(onUpdatePricing).toHaveBeenCalledWith(expect.objectContaining({name: "monthly"}));
  expect(page.state.product).toEqual(product);
  expect(page.state.buyQuantity).toBe(3);

  page.getCartItemCount();
  await flushAsyncWork();
  expect(page.state.cartItemCount).toBe(0);

  productBackendMock.getProduct.mockResolvedValueOnce({status: "ok", data: rechargeProduct});
  page.setState({productName: "recharge_wallet", pricingName: null});
  await page.getProduct();
  expect(page.state.customPrice).toBe(10);
});

test("keeps ProductBuyPage add-to-cart merge, validation and order redirect behavior stable", async() => {
  const page = createProductBuyPage();
  page.setState({buyQuantity: 2, product});

  userBackendMock.getUser.mockResolvedValueOnce({
    status: "ok",
    data: {
      owner: "built-in",
      name: "admin",
      cart: [{name: "workspace_credits", currency: "USD", pricingName: "", planName: "", quantity: 1}],
    },
  });
  page.addToCart(product);
  await flushAsyncWork();
  expect(userBackendMock.updateUser).toHaveBeenCalledWith("built-in", "admin", expect.objectContaining({
    cart: [expect.objectContaining({name: "workspace_credits", quantity: 3})],
  }));
  expect(Setting.showMessage).toHaveBeenCalledWith("success", "Successfully added");
  expect(page.state.cartItemCount).toBe(1);

  page.setState({customPrice: 0, isAddingToCart: false});
  page.addToCart(rechargeProduct);
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "Custom price should be greater than zero");

  page.setState({customPrice: 20, buyQuantity: 4});
  page.placeOrder(rechargeProduct);
  await flushAsyncWork();
  expect(orderBackendMock.placeOrder).toHaveBeenCalledWith("built-in", [expect.objectContaining({
    name: "recharge_wallet",
    price: 20,
    quantity: 4,
  })], "");
  expect(Setting.goToLink).toHaveBeenCalledWith("/orders/built-in/order_123/pay");
});

test("keeps ProductBuyPage rendering and disabled recharge purchase states stable", () => {
  const history = createHistory();
  const page = createProductBuyPage({history});
  page.setState({product, cartItemCount: 2, buyQuantity: 1});

  const view = render(<MemoryRouter>{page.render()}</MemoryRouter>);
  expect(view.getByText("Workspace Credits")).not.toBeNull();
  expect(view.getByText("Add to cart")).not.toBeNull();
  fireEvent.click(view.container.querySelector(".ant-badge") as Element);
  expect(history.push).toHaveBeenCalledWith("/cart");
  view.unmount();

  page.setState({product: disabledRechargeProduct});
  const rechargeView = render(<MemoryRouter>{page.renderRechargeInput(disabledRechargeProduct)}</MemoryRouter>);
  expect(rechargeView.getByText("This product is currently not purchasable (No options available)")).not.toBeNull();
});

test("keeps ProductBuyPage guards and backend failure branches stable", async() => {
  const page = createProductBuyPage();

  Object.defineProperty(navigator, "userAgent", {value: "micromessenger mobile", configurable: true});
  page.getPaymentEnv();
  expect(page.state.paymentEnv).toBe("WechatBrowser");
  expect(page.renderPlaceOrderButton(null)).toBeNull();
  expect(page.renderPlaceOrderButton({...product, state: "Draft"})).toBe("This product is currently not in sale.");
  expect(page.getPrice(product)).toContain("12");
  expect(page.getProductObj()).toBe(page.state.product);

  const propsProductPage = createProductBuyPage({product});
  expect(propsProductPage.getProductObj()).toBe(product);

  const missingRoutePage = createProductBuyPage({match: {params: {}}, productName: null, pricingName: null});
  await missingRoutePage.getProduct();
  expect(productBackendMock.getProduct).not.toHaveBeenCalledWith(null, null);

  const missingPlanPage = createProductBuyPage({
    match: {params: {organizationName: "built-in", pricingName: "monthly"}},
  });
  await missingPlanPage.getProduct();
  expect(pricingBackendMock.getPricing).not.toHaveBeenCalledWith("built-in", "monthly");

  pricingBackendMock.getPricing.mockResolvedValueOnce({status: "error", msg: "pricing failed"});
  const pricingErrorPage = createProductBuyPage({
    match: {params: {organizationName: "built-in", pricingName: "monthly"}},
  });
  pricingErrorPage.setState({planName: "basic", userName: "alice"});
  await pricingErrorPage.getProduct();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "pricing failed");

  planBackendMock.getPlan.mockResolvedValueOnce({status: "error", msg: "plan failed"});
  const planErrorPage = createProductBuyPage({
    match: {params: {organizationName: "built-in", pricingName: "monthly"}},
  });
  planErrorPage.setState({planName: "basic", userName: "alice"});
  await planErrorPage.getProduct();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "plan failed");

  productBackendMock.getProduct.mockResolvedValueOnce({status: "error", msg: "product failed"});
  await page.getProduct();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "product failed");

  productBackendMock.getProduct.mockResolvedValueOnce({status: "ok", data: {...rechargeProduct, rechargeOptions: []}});
  await page.getProduct();
  expect(page.state.customPrice).toBe(100);

  const noAccountPage = createProductBuyPage({account: undefined});
  noAccountPage.getCartItemCount();
  noAccountPage.addToCart(product);
  expect(noAccountPage.state.isAddingToCart).toBe(false);
});

test("keeps ProductBuyPage cart and order failure handling stable", async() => {
  const page = createProductBuyPage();

  userBackendMock.getUser.mockResolvedValueOnce({
    status: "ok",
    data: {owner: "built-in", name: "admin", cart: [{name: "old", currency: "CNY"}]},
  });
  page.addToCart(product);
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "The currency of the product you are adding is different from the currency of the items in the cart");

  userBackendMock.getUser.mockResolvedValueOnce({status: "ok", data: {owner: "built-in", name: "admin", cart: []}});
  userBackendMock.updateUser.mockResolvedValueOnce({status: "error", msg: "cart update failed"});
  page.addToCart(product);
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "cart update failed");

  userBackendMock.getUser.mockResolvedValueOnce({status: "ok", data: {owner: "built-in", name: "admin", cart: []}});
  userBackendMock.updateUser.mockRejectedValueOnce(new Error("cart network down"));
  page.addToCart(product);
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("cart network down"));

  userBackendMock.getUser.mockResolvedValueOnce({status: "error", msg: "user failed"});
  page.addToCart(product);
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "Failed to connect to server: user failed");

  userBackendMock.getUser.mockRejectedValueOnce(new Error("user network down"));
  page.addToCart(product);
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("user network down"));

  page.setState({isAddingToCart: true});
  page.addToCart(product);
  expect(userBackendMock.getUser).toHaveBeenCalledTimes(5);
  page.setState({isAddingToCart: false});

  orderBackendMock.placeOrder.mockResolvedValueOnce({status: "error", msg: "order failed"});
  page.placeOrder(product);
  await flushAsyncWork();
  expect(page.state.isPlacingOrder).toBe(false);
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "Failed to create order: order failed");

  orderBackendMock.placeOrder.mockRejectedValueOnce(new Error("order network down"));
  page.placeOrder(product);
  await flushAsyncWork();
  expect(page.state.isPlacingOrder).toBe(false);
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("order network down"));
});

test("keeps CartListPage fetch, invalid product handling and total rendering stable", async() => {
  const page = createCartListPage();
  userBackendMock.getUser.mockResolvedValueOnce({
    status: "ok",
    data: {
      owner: "built-in",
      name: "admin",
      cart: [
        {name: "workspace_credits", createdTime: "2026-06-20T10:00:00Z", currency: "USD", quantity: 2},
        {name: "missing_product", createdTime: "2026-06-20T09:00:00Z", currency: "USD", quantity: 1},
      ],
    },
  });
  productBackendMock.getProduct
    .mockResolvedValueOnce({status: "ok", data: product})
    .mockResolvedValueOnce({status: "error", msg: "missing"});

  page.fetch({pagination: {current: 1, pageSize: 10}});
  await flushAsyncWork();
  expect(page.state.data).toEqual(expect.arrayContaining([
    expect.objectContaining({name: "workspace_credits", quantity: 2, isInvalid: false}),
    expect.objectContaining({name: "missing_product", isInvalid: true}),
  ]));
  expect(Setting.showMessage).toHaveBeenCalledWith("warning", "Product not found or invalid: missing_product");
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "Product not found or invalid: missing_product");

  const tableView = render(<MemoryRouter>{page.renderTable(page.state.data as CartRecord[])}</MemoryRouter>);
  expect(tableView.getByText("Total Price:")).not.toBeNull();
  expect(tableView.getAllByText("Place Order").length).toBeGreaterThan(0);
});

test("keeps CartListPage quantity update, delete, clear and place-order behavior stable", async() => {
  const history = createHistory();
  const page = createCartListPage({history});
  const cartRecord: CartRecord = {...product, createdTime: "2026-06-20T10:00:00Z", quantity: 2, pricingName: "", planName: ""};
  page.setState({
    data: [cartRecord],
    user: {
      owner: "built-in",
      name: "admin",
      cart: [{name: "workspace_credits", currency: "USD", quantity: 2, pricingName: "", planName: ""}],
    },
  });
  page.fetch = jestValue.fn() as unknown as typeof page.fetch;

  page.updateCartItemQuantity(cartRecord, 3);
  await flushAsyncWork();
  expect(userBackendMock.updateUser).toHaveBeenCalledWith("built-in", "admin", expect.objectContaining({
    cart: [expect.objectContaining({name: "workspace_credits", quantity: 3})],
  }));
  expect((page.state.user as LegacyAny).cart[0].quantity).toBe(3);

  page.deleteCart(cartRecord);
  await flushAsyncWork();
  expect(userBackendMock.updateUser).toHaveBeenCalledWith("built-in", "admin", expect.objectContaining({cart: []}));
  expect(page.fetch).toHaveBeenCalled();

  page.setState({user: {owner: "built-in", name: "admin", cart: [{name: "workspace_credits"}]}});
  page.clearCart();
  await flushAsyncWork();
  expect(userBackendMock.updateUser).toHaveBeenCalledWith("built-in", "admin", expect.objectContaining({cart: []}));

  page.setState({data: [cartRecord], user: {owner: "built-in", name: "admin", cart: [{name: "workspace_credits"}]}});
  page.placeOrder();
  await flushAsyncWork();
  expect(orderBackendMock.placeOrder).toHaveBeenCalledWith("built-in", [expect.objectContaining({
    name: "workspace_credits",
    quantity: 3,
  })], "admin");
  expect(Setting.goToLink).toHaveBeenCalledWith("/orders/built-in/order_123/pay");
});

test("keeps CartListPage clear, delete and quantity failure branches stable", async() => {
  const page = createCartListPage();
  const cartRecord: CartRecord = {...product, createdTime: "2026-06-20T10:00:00Z", quantity: 2, pricingName: "", planName: ""};
  page.fetch = jestValue.fn() as unknown as typeof page.fetch;

  page.setState({user: {owner: "built-in", name: "admin", cart: [{name: "workspace_credits", currency: "USD", quantity: 2}]}});
  userBackendMock.updateUser.mockResolvedValueOnce({status: "error", msg: "clear failed"});
  page.clearCart();
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "Failed to delete: clear failed");

  userBackendMock.updateUser.mockRejectedValueOnce(new Error("clear network down"));
  page.clearCart();
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("clear network down"));

  page.setState({user: null});
  page.deleteCart(cartRecord);
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "Failed to delete");

  page.setState({user: {owner: "built-in", name: "admin", cart: [{name: "workspace_credits", currency: "USD", quantity: 2}]}});
  userBackendMock.updateUser.mockResolvedValueOnce({status: "error", msg: "delete failed"});
  page.deleteCart(cartRecord);
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "Failed to delete: delete failed");

  page.setState({user: {owner: "built-in", name: "admin", cart: [{name: "workspace_credits", currency: "USD", quantity: 2}]}});
  userBackendMock.updateUser.mockRejectedValueOnce(new Error("delete network down"));
  page.deleteCart(cartRecord);
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenLastCalledWith("error", expect.stringContaining("delete network down"));

  userBackendMock.updateUser.mockClear();
  page.updateCartItemQuantity(cartRecord, 0);
  expect(userBackendMock.updateUser).not.toHaveBeenCalled();

  const itemKey = "workspace_credits-12--";
  page.updatingCartItemsRef[itemKey] = true;
  page.updateCartItemQuantity(cartRecord, 3);
  expect(userBackendMock.updateUser).not.toHaveBeenCalled();
  delete page.updatingCartItemsRef[itemKey];

  page.setState({user: {owner: "built-in", name: "admin", cart: []}});
  page.updateCartItemQuantity(cartRecord, 3);
  expect(userBackendMock.updateUser).not.toHaveBeenCalled();

  page.setState({
    data: [],
    user: {owner: "built-in", name: "admin", cart: [{name: "workspace_credits", currency: "USD", quantity: 2}]},
  });
  userBackendMock.updateUser.mockResolvedValueOnce({status: "error", msg: "quantity failed"});
  page.updateCartItemQuantity(cartRecord, 4);
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "quantity failed");
  expect(page.fetch).toHaveBeenCalled();

  userBackendMock.updateUser.mockRejectedValueOnce(new Error("quantity network down"));
  page.updateCartItemQuantity(cartRecord, 5);
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("quantity network down"));
});

test("keeps CartListPage table column renderers and fetch sorting branches stable", async() => {
  const history = createHistory();
  const page = createCartListPage({history});
  const validRecord: CartRecord = {...product, quantity: 2, pricingName: "monthly", planName: "basic"};
  const invalidRecord: CartRecord = {...product, name: "bad_product", quantity: 1, pricingName: "legacy", planName: "old", isInvalid: true};
  page.setState({data: [validRecord, invalidRecord], user: {owner: "built-in", name: "admin", cart: []}});

  const table = page.renderTable([validRecord, invalidRecord]) as React.ReactElement<{children: React.ReactElement<{columns: Array<{key?: string; render?: LegacyAny; title?: () => React.ReactNode}>; title: () => React.ReactNode}>}>;
  const tableElement = React.Children.toArray(table.props.children)[0] as React.ReactElement<{columns: Array<{key?: string; render?: LegacyAny; title?: () => React.ReactNode}>; title: () => React.ReactNode}>;
  const columns = tableElement.props.columns;

  const nameView = render(<MemoryRouter>{columns.find(column => column.key === "name")?.render?.("workspace_credits", validRecord, 0)}</MemoryRouter>);
  expect(nameView.getByText("workspace_credits").closest("a")?.getAttribute("href")).toBe("/products/built-in/workspace_credits");
  nameView.unmount();

  const invalidNameView = render(<>{columns.find(column => column.key === "name")?.render?.("bad_product", invalidRecord, 1)}</>);
  expect(invalidNameView.getByText("bad_product").style.color).toBe("red");
  invalidNameView.unmount();

  expect(render(<>{columns.find(column => column.key === "displayName")?.render?.("Bad", invalidRecord, 1)}</>).getByText("Invalid product")).not.toBeNull();
  expect(render(<>{columns.find(column => column.key === "image")?.render?.("/img/product.png", validRecord, 0)}</>).container.querySelector("img")?.getAttribute("src")).toBe("/img/product.png");
  expect(render(<>{columns.find(column => column.key === "price")?.render?.(12, validRecord, 0)}</>).container.textContent).toContain("24");

  const pricingView = render(<MemoryRouter>{columns.find(column => column.key === "pricingName")?.render?.("monthly", validRecord, 0)}</MemoryRouter>);
  expect(pricingView.getByText("monthly").closest("a")?.getAttribute("href")).toBe("/pricings/built-in/monthly");
  pricingView.unmount();
  expect(columns.find(column => column.key === "pricingName")?.render?.("", validRecord, 0)).toBeNull();

  const planView = render(<MemoryRouter>{columns.find(column => column.key === "planName")?.render?.("basic", validRecord, 0)}</MemoryRouter>);
  expect(planView.getByText("basic").closest("a")?.getAttribute("href")).toBe("/plans/built-in/basic");
  planView.unmount();

  const actionView = render(<>{columns.find(column => column.key === "op")?.render?.(undefined, validRecord, 0)}</>);
  fireEvent.click(actionView.getByText("Detail"));
  expect(history.push).toHaveBeenCalledWith("/products/built-in/workspace_credits/buy");
  actionView.unmount();

  const emptyTableElement = React.Children.toArray(page.renderTable([]).props.children)[0] as React.ReactElement<{title: () => React.ReactNode}>;
  const emptyToolbar = render(<>{emptyTableElement.props.title()}</>);
  expect((emptyToolbar.getByText("Clear").closest("button") as HTMLButtonElement | null)?.disabled).toBe(true);
  fireEvent.click(emptyToolbar.getByText("Add"));
  expect(history.push).toHaveBeenCalledWith("/product-store");
  emptyToolbar.unmount();

  userBackendMock.getUser.mockResolvedValueOnce({
    status: "ok",
    data: {
      owner: "built-in",
      name: "admin",
      cart: [
        {name: "workspace_credits", createdTime: "2026-06-20T10:00:00Z", currency: "CNY", quantity: 1},
        {name: "recharge_wallet", createdTime: "2026-06-20T09:00:00Z", currency: "USD", price: 20, quantity: 1},
      ],
    },
  });
  productBackendMock.getProduct
    .mockResolvedValueOnce({status: "ok", data: product})
    .mockRejectedValueOnce(new Error("missing"));
  page.fetch({pagination: {current: 1, pageSize: 10}, sortField: "name", sortOrder: "ascend"});
  await flushAsyncWork();
  expect(page.state.data[0].name).toBe("recharge_wallet");
  expect(Setting.showMessage).toHaveBeenCalledWith("warning", "Product not found or invalid: workspace_credits");
  expect(Setting.showMessage).toHaveBeenCalledWith("warning", "Product not found or invalid: recharge_wallet");

  userBackendMock.getUser.mockRejectedValueOnce(new Error("user network down"));
  page.fetch();
  await flushAsyncWork();
  expect(page.state.loading).toBe(false);
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("user network down"));
});

test("keeps CartListPage place-order guards and network failures stable", async() => {
  const page = createCartListPage();
  const cartRecord: CartRecord = {...product, createdTime: "2026-06-20T10:00:00Z", quantity: 2, pricingName: "", planName: ""};

  page.setState({isPlacingOrder: true, data: [cartRecord], user: {owner: "built-in", name: "admin", cart: [{name: "workspace_credits"}]}});
  page.placeOrder();
  expect(orderBackendMock.placeOrder).not.toHaveBeenCalled();

  orderBackendMock.placeOrder.mockRejectedValueOnce(new Error("order network down"));
  page.setState({isPlacingOrder: false});
  page.placeOrder();
  await flushAsyncWork();
  expect(page.state.isPlacingOrder).toBe(false);
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("order network down"));
});

test("keeps CartListPage validation and failure paths stable", async() => {
  const page = createCartListPage();
  page.setState({
    data: [{...product, isInvalid: true, quantity: 1}],
    user: {owner: "built-in", name: "admin", cart: [{name: "workspace_credits"}]},
  });

  page.placeOrder();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "Cart contains invalid products, please delete them before placing an order");

  page.setState({data: []});
  page.placeOrder();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "Product list cannot be empty");

  page.setState({user: {owner: "built-in", name: "admin", cart: []}});
  page.deleteCart({...product, name: "missing", quantity: 1});
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "Failed to delete");

  userBackendMock.getUser.mockResolvedValueOnce({status: "error", msg: "user failed"});
  page.fetch();
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "user failed");

  orderBackendMock.placeOrder.mockResolvedValueOnce({status: "error", msg: "order failed"});
  page.setState({data: [{...product, quantity: 1}], user: {owner: "built-in", name: "admin", cart: [{name: "workspace_credits"}]}});
  page.placeOrder();
  await flushAsyncWork();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "Failed to create order: order failed");
});
