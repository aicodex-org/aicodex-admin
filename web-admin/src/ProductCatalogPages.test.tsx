/* eslint-env jest */
import React from "react";
import * as fs from "fs";
import * as path from "path";
import {expect as jestExpect, jest as jestValue} from "@jest/globals";
import {cleanup, render} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import ProductStorePage from "./ProductStorePage";
import ProductListPage from "./ProductListPage";
import ProductEditPage from "./ProductEditPage";
import {FloatingCartButton, QuantityStepper} from "./common/product/CartControls";
import * as ProductBackend from "./backend/ProductBackend";
import * as UserBackend from "./backend/UserBackend";
import * as ProviderBackend from "./backend/ProviderBackend";
import * as OrganizationBackend from "./backend/OrganizationBackend";
import * as FormBackend from "./backend/FormBackend";
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
};
type ProductBackendMock = Record<keyof typeof ProductBackend, LooseMock>;
type UserBackendMock = Record<keyof typeof UserBackend, LooseMock>;
type ProviderBackendMock = Record<keyof typeof ProviderBackend, LooseMock>;
type OrganizationBackendMock = Record<keyof typeof OrganizationBackend, LooseMock>;
type FormBackendMock = Record<keyof typeof FormBackend, LooseMock>;
type ProductRecord = {
  owner: string;
  name: string;
  createdTime?: string;
  displayName: string;
  image: string;
  tag: string;
  detail?: string;
  description?: string;
  currency: string;
  price: number;
  quantity: number;
  sold: number;
  isRecharge: boolean;
  disableCustomRecharge?: boolean;
  rechargeOptions?: number[];
  providers: string[];
  state: string;
  successUrl?: string;
  [key: string]: LegacyAny;
};
type TestStatePatch = Record<string, unknown> | ((state: Record<string, unknown>, props?: Record<string, unknown>) => Record<string, unknown> | null) | null;
type Harness<T> = T & {
  props: Record<string, LegacyAny>;
  state: Record<string, LegacyAny>;
  setState: (patch: TestStatePatch, callback?: () => void) => void;
};

const productBackendMock = ProductBackend as unknown as ProductBackendMock;
const userBackendMock = UserBackend as unknown as UserBackendMock;
const providerBackendMock = ProviderBackend as unknown as ProviderBackendMock;
const organizationBackendMock = OrganizationBackend as unknown as OrganizationBackendMock;
const formBackendMock = FormBackend as unknown as FormBackendMock;
const expect = jestExpect;
const {fireEvent, screen} = require("@testing-library/react") as {
  fireEvent: {
    click: (element: Element | null) => boolean;
    change: (element: Element | null, event: unknown) => boolean;
  };
  screen: {
    getByText: (text: string | RegExp) => HTMLElement;
    getAllByText: (text: string | RegExp) => HTMLElement[];
    queryByText: (text: string | RegExp) => HTMLElement | null;
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
    getProducts: factoryJest.fn(),
    getProduct: factoryJest.fn(),
    addProduct: factoryJest.fn(),
    updateProduct: factoryJest.fn(),
    deleteProduct: factoryJest.fn(),
  };
});

jest.mock("./backend/UserBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    getUser: factoryJest.fn(),
    updateUser: factoryJest.fn(),
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

jest.mock("./backend/FormBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    getForm: factoryJest.fn(),
  };
});

jest.mock("./ProductBuyPage", () => {
  const ReactFactory = require("react");
  return {
    __esModule: true,
    default: (props: {product?: ProductRecord}) => ReactFactory.createElement(
      "div",
      {"data-testid": "product-buy-preview"},
      props.product?.name || "legacy-buy-preview"
    ),
  };
});

jest.mock("./common/modal/PopconfirmModal", () => {
  const ReactFactory = require("react");
  return {
    __esModule: true,
    default: (props: {disabled?: boolean; onConfirm?: () => void}) => ReactFactory.createElement(
      "button",
      {
        type: "button",
        disabled: props.disabled,
        onClick: props.onConfirm,
      },
      "Delete"
    ),
  };
});

const account = {owner: "built-in", name: "admin", tag: "", isAdmin: true};
const product: ProductRecord = {
  owner: "built-in",
  name: "workspace_credits",
  createdTime: "2026-06-20T10:00:00Z",
  displayName: "Workspace Credits",
  image: "/img/product.png",
  tag: "cloud",
  detail: "Credits for usage",
  description: "Credits description",
  currency: "USD",
  price: 12,
  quantity: 99,
  sold: 3,
  isRecharge: false,
  providers: ["stripe-main"],
  state: "Published",
  successUrl: "https://example.test/success",
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

function flushPromises() {
  return new Promise(resolve => setTimeout(resolve, 0));
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

function collectElements(node: React.ReactNode, predicate: (element: React.ReactElement) => boolean, results: React.ReactElement[] = []) {
  if (!React.isValidElement(node)) {
    return results;
  }

  if (predicate(node)) {
    results.push(node);
  }

  const props = node.props as {children?: React.ReactNode; title?: React.ReactNode};
  React.Children.forEach(props.children, child => collectElements(child, predicate, results));
  collectElements(props.title, predicate, results);
  return results;
}

function renderWithRouter(node: React.ReactNode) {
  return render(<MemoryRouter>{node}</MemoryRouter>);
}

function createProductListPage(props: Record<string, LegacyAny> = {}) {
  const page = new ProductListPage({
    account,
    history: createHistory(),
    match: {path: "/products", params: {}},
    ...props,
  }) as unknown as Harness<ProductListPage>;
  installSynchronousSetState(page);
  page.state = {
    ...page.state,
    data: [product],
    pagination: {current: 2, pageSize: 10, total: 1},
    loading: false,
  };
  return page;
}

function createProductEditPage(props: Record<string, LegacyAny> = {}) {
  const page = new ProductEditPage({
    account,
    history: createHistory(),
    match: {params: {organizationName: "built-in", productName: "workspace_credits"}},
    location: {mode: "edit"},
    ...props,
  }) as unknown as Harness<ProductEditPage>;
  installSynchronousSetState(page);
  page.state = {
    ...page.state,
    product: {...product},
    providers: [{name: "stripe-main", category: "Payment"}, {name: "github-oauth", category: "OAuth"}],
    organizations: [{name: "built-in"}, {name: "tenant-a"}],
  };
  return page;
}

beforeEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
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
  jestValue.spyOn(Setting, "getRequestOrganization").mockReturnValue("built-in");
  jestValue.spyOn(Setting, "isDefaultOrganizationSelected").mockReturnValue(false);
  jestValue.spyOn(Setting, "isAdminUser").mockReturnValue(true);
  jestValue.spyOn(Setting, "isLocalAdminUser").mockReturnValue(true);
  jestValue.spyOn(Setting, "isMobile").mockReturnValue(false);
  jestValue.spyOn(Setting, "goToLinkSoft").mockImplementation(() => {});
  jestValue.spyOn(Setting, "getRandomName").mockReturnValue("random");
  jestValue.spyOn(Setting, "getLanguageText").mockImplementation((value: LegacyAny) => `${value || ""}`);
  formBackendMock.getForm.mockResolvedValue({status: "ok", data: {formItems: []}});
  productBackendMock.getProducts.mockResolvedValue({status: "ok", data: [product, rechargeProduct], data2: 2});
  productBackendMock.addProduct.mockResolvedValue({status: "ok"});
  productBackendMock.updateProduct.mockResolvedValue({status: "ok"});
  productBackendMock.deleteProduct.mockResolvedValue({status: "ok"});
  productBackendMock.getProduct.mockResolvedValue({status: "ok", data: product});
  userBackendMock.getUser.mockResolvedValue({status: "ok", data: {owner: "built-in", name: "admin", cart: []}});
  userBackendMock.updateUser.mockResolvedValue({status: "ok"});
  providerBackendMock.getProviders.mockResolvedValue({status: "ok", data: [{name: "stripe-main", category: "Payment"}, {name: "github-oauth", category: "OAuth"}]});
  organizationBackendMock.getOrganizations.mockResolvedValue({status: "ok", data: [{name: "built-in"}, {name: "tenant-a"}]});
});

afterEach(() => {
  jestValue.restoreAllMocks();
  jestValue.clearAllMocks();
  cleanup();
});

test("uses TSX files for migrated product catalog pages and shared cart controls", () => {
  const srcDir = __dirname;
  const files = [
    "ProductStorePage",
    "ProductListPage",
    "ProductEditPage",
    path.join("common", "product", "CartControls"),
  ];

  files.forEach(file => {
    expect(fs.existsSync(path.join(srcDir, `${file}.tsx`))).toBe(true);
    expect(fs.existsSync(path.join(srcDir, `${file}.js`))).toBe(false);
  });
});

test("keeps quantity stepper and floating cart button interactions stable", () => {
  const onIncrease = jestValue.fn();
  const onDecrease = jestValue.fn();
  const onChange = jestValue.fn();
  const onCartClick = jestValue.fn();

  const view = render(
    <>
      <QuantityStepper value={2} min={1} max={3} onIncrease={onIncrease} onDecrease={onDecrease} onChange={onChange} />
      <FloatingCartButton itemCount={5} onClick={onCartClick} />
    </>
  );

  const buttons = view.getAllByRole("button");
  fireEvent.click(buttons[0]);
  fireEvent.click(buttons[1]);
  fireEvent.change(view.getByRole("spinbutton"), {target: {value: "3"}});
  fireEvent.click(buttons[2]);

  expect(onDecrease).toHaveBeenCalledTimes(1);
  expect(onIncrease).toHaveBeenCalledTimes(1);
  expect(onChange).toHaveBeenCalled();
  expect(onCartClick).toHaveBeenCalledTimes(1);
  expect(view.getByText("5")).not.toBeNull();
});

test("renders product store and preserves add-cart, duplicate guard, cart count and buy navigation", async() => {
  const history = createHistory();
  const view = render(
    <MemoryRouter>
      <ProductStorePage account={account} history={history} />
    </MemoryRouter>
  );

  expect(await view.findByText("Workspace Credits")).not.toBeNull();
  expect(view.getByText("Recharge Wallet")).not.toBeNull();
  expect(userBackendMock.getUser).toHaveBeenCalledWith("built-in", "admin");

  fireEvent.click(view.getByText("Add to cart"));
  await flushPromises();
  expect(userBackendMock.updateUser).toHaveBeenCalledWith("built-in", "admin", expect.objectContaining({
    cart: [expect.objectContaining({name: "workspace_credits", quantity: 1, currency: "USD"})],
  }));
  expect(Setting.showMessage).toHaveBeenCalledWith("success", "Successfully added");

  fireEvent.click(view.getAllByText("Buy")[0]);
  expect(history.push).toHaveBeenCalledWith("/products/built-in/workspace_credits/buy?quantity=1");

  const page = new ProductStorePage({account, history}) as unknown as Harness<ProductStorePage>;
  installSynchronousSetState(page);
  page.state = {...page.state, addingToCartProducts: ["workspace_credits"], productQuantities: {}, cartItemCount: 0};
  userBackendMock.getUser.mockResolvedValueOnce({status: "ok", data: {owner: "built-in", name: "admin", cart: []}});
  page.addToCart(product);
  await flushPromises();
  expect(userBackendMock.getUser).toHaveBeenCalledTimes(2);
});

test("preserves product store failure and recharge add-cart guard behavior", async() => {
  const history = createHistory();
  const page = new ProductStorePage({account, history}) as unknown as Harness<ProductStorePage>;
  installSynchronousSetState(page);
  page.state = {...page.state, addingToCartProducts: [], productQuantities: {}, cartItemCount: 0};

  userBackendMock.getUser.mockResolvedValueOnce({status: "ok", data: {owner: "built-in", name: "admin", cart: [{name: "old", currency: "CNY"}]}});
  page.addToCart(product);
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "The currency of the product you are adding is different from the currency of the items in the cart");

  userBackendMock.getUser.mockResolvedValueOnce({status: "ok", data: {owner: "built-in", name: "admin", cart: []}});
  page.addToCart(rechargeProduct);
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "Recharge products need to go to the product detail page to set custom amount");

  productBackendMock.getProducts.mockResolvedValueOnce({status: "error", msg: "list failed"});
  page.getProducts();
  await flushPromises();
  expect(page.state.loading).toBe(false);
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "list failed");
});

test("keeps product store lifecycle, empty state, quantity controls and failed update branches stable", async() => {
  const history = createHistory();
  const page = new ProductStorePage({account, history}) as unknown as Harness<ProductStorePage>;
  installSynchronousSetState(page);

  page.updateProductQuantity("workspace_credits", 4);
  expect(page.state.productQuantities.workspace_credits).toBe(4);

  page.componentDidUpdate({account: null, history} as LegacyAny);
  await flushPromises();
  expect(productBackendMock.getProducts).toHaveBeenCalled();

  userBackendMock.getUser.mockResolvedValueOnce({status: "ok", data: {owner: "built-in", name: "admin"}});
  page.getCartItemCount();
  await flushPromises();
  expect(page.state.cartItemCount).toBe(0);

  productBackendMock.getProducts.mockRejectedValueOnce(new Error("store network down"));
  page.getProducts();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("store network down"));

  userBackendMock.getUser.mockResolvedValueOnce({status: "ok", data: {owner: "built-in", name: "admin", cart: []}});
  userBackendMock.updateUser.mockResolvedValueOnce({status: "error", msg: "cart update failed"});
  page.addToCart(product);
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "cart update failed");

  userBackendMock.getUser.mockResolvedValueOnce({status: "error", msg: "user failed"});
  page.addToCart(product);
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "user failed");

  userBackendMock.getUser.mockRejectedValueOnce(new Error("user network down"));
  page.addToCart(product);
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("user network down"));

  page.state = {...page.state, loading: false, products: []};
  const emptyView = render(<MemoryRouter>{page.render()}</MemoryRouter>);
  expect(emptyView.getByText("No products available")).not.toBeNull();
  emptyView.unmount();

  const cardView = render(<MemoryRouter>{page.renderProductCard(product)}</MemoryRouter>);
  const buttons = cardView.getAllByRole("button");
  fireEvent.click(buttons[0]);
  fireEvent.click(buttons[1]);
  expect(page.state.productQuantities.workspace_credits).toBeGreaterThanOrEqual(1);
  cardView.unmount();
});

test("keeps product list creation, deletion, authorization and table actions stable", async() => {
  const history = createHistory();
  const page = createProductListPage({history});

  expect(page.newProduct()).toEqual(expect.objectContaining({
    owner: "built-in",
    name: "product_random",
    displayName: "New Product - random",
    state: "Published",
  }));

  page.addProduct();
  await flushPromises();
  expect(productBackendMock.addProduct).toHaveBeenCalledWith(expect.objectContaining({name: "product_random"}));
  expect(history.push).toHaveBeenCalledWith({pathname: "/products/built-in/product_random", mode: "add"});

  page.fetch = jestValue.fn() as unknown as typeof page.fetch;
  page.deleteProduct(0);
  await flushPromises();
  expect(productBackendMock.deleteProduct).toHaveBeenCalledWith(product);
  expect(page.fetch).toHaveBeenCalledWith(expect.objectContaining({
    pagination: expect.objectContaining({current: 1}),
  }));

  const fetchPage = createProductListPage();
  productBackendMock.getProducts.mockResolvedValueOnce({status: "error", msg: "denied"});
  jestValue.spyOn(Setting, "isResponseDenied").mockReturnValueOnce(true);
  fetchPage.fetch({pagination: {current: 1, pageSize: 20}});
  await flushPromises();
  expect(fetchPage.state.isAuthorized).toBe(false);

  const table = page.renderTable([product]) as React.ReactElement<{children: React.ReactElement<{columns: Array<{key?: string; render?: LegacyAny; title?: () => React.ReactNode}>; title: () => React.ReactNode}>}>;
  const tableElement = table.props.children;
  const actionColumn = tableElement.props.columns.find(column => column.key === "op");
  const actionView = render(<>{actionColumn?.render?.(undefined, product, 0)}</>);
  fireEvent.click(actionView.getByText("Buy"));
  expect(history.push).toHaveBeenCalledWith("/products/built-in/workspace_credits/buy");
  fireEvent.click(actionView.getByText("Edit"));
  expect(history.push).toHaveBeenCalledWith({pathname: "/products/built-in/workspace_credits", mode: "edit"});
  actionView.unmount();

  const toolbarView = render(<>{tableElement.props.title()}</>);
  fireEvent.click(toolbarView.getByText("Add"));
  expect(productBackendMock.addProduct).toHaveBeenCalledTimes(2);
});

test("keeps product list column renderers, fetch results and failure paths stable", async() => {
  const page = createProductListPage();
  const table = page.renderTable([{...product, providers: ["stripe-main", "paypal-main"]}]) as React.ReactElement<{children: React.ReactElement<{columns: Array<{key?: string; render?: LegacyAny}>; rowKey: (record: ProductRecord) => string}>}>;
  const tableElement = table.props.children;
  const columns = tableElement.props.columns;

  expect(tableElement.props.rowKey(product)).toBe("built-in/workspace_credits");
  expect(renderWithRouter(<>{columns.find(column => column.key === "name")?.render?.("workspace_credits", product, 0)}</>).getByText("workspace_credits").closest("a")?.getAttribute("href")).toBe("/products/built-in/workspace_credits");
  expect(renderWithRouter(<>{columns.find(column => column.key === "owner")?.render?.("built-in", product, 0)}</>).getByText("built-in").closest("a")?.getAttribute("href")).toBe("/organizations/built-in");
  expect(columns.find(column => column.key === "createdTime")?.render?.("2026-06-20T10:00:00Z", product, 0)).toBe(Setting.getFormattedDate("2026-06-20T10:00:00Z"));
  expect(render(<>{columns.find(column => column.key === "image")?.render?.("/img/product.png", product, 0)}</>).container.querySelector("img")?.getAttribute("src")).toBe("/img/product.png");
  const priceView = render(<>{columns.find(column => column.key === "price")?.render?.(12, product, 0)}</>);
  expect(priceView.container.textContent).toContain("$");
  expect(priceView.container.textContent).toContain("12");
  priceView.unmount();

  const providersView = renderWithRouter(<>{columns.find(column => column.key === "providers")?.render?.(["stripe-main", "paypal-main"], product, 0)}</>);
  expect(providersView.getByText("stripe-main").closest("a")?.getAttribute("href")).toBe("/providers/built-in/stripe-main");
  fireEvent.click(providersView.getAllByRole("button")[0]);
  expect(Setting.goToLinkSoft).toHaveBeenCalledWith(page, "/providers/built-in/stripe-main");
  providersView.unmount();
  expect(columns.find(column => column.key === "providers")?.render?.([], product, 0)).toBe("(empty)");

  productBackendMock.getProducts.mockResolvedValueOnce({status: "ok", data: [product], data2: 1});
  page.fetch({pagination: {current: 3, pageSize: 20}, searchedColumn: "name", searchText: "workspace", sortField: "price", sortOrder: "descend", type: "ignored"});
  await flushPromises();
  expect(productBackendMock.getProducts).toHaveBeenCalledWith("built-in", 3, 20, "type", "ignored", "price", "descend");
  expect(page.state.data).toEqual([product]);

  productBackendMock.getProducts.mockResolvedValueOnce({status: "error", msg: "fetch failed"});
  page.fetch({pagination: {current: 1, pageSize: 10}});
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "fetch failed");

  productBackendMock.addProduct.mockResolvedValueOnce({status: "error", msg: "add failed"});
  page.addProduct();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "Failed to add: add failed");

  productBackendMock.addProduct.mockRejectedValueOnce(new Error("add network down"));
  page.addProduct();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("add network down"));

  productBackendMock.deleteProduct.mockResolvedValueOnce({status: "error", msg: "delete failed"});
  page.deleteProduct(0);
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "Failed to delete: delete failed");

  productBackendMock.deleteProduct.mockRejectedValueOnce(new Error("delete network down"));
  page.deleteProduct(0);
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete network down"));
});

test("keeps product list default organization, mobile and disabled action branches stable", async() => {
  const history = createHistory();
  jestValue.spyOn(Setting, "isDefaultOrganizationSelected").mockReturnValue(true);
  const page = createProductListPage({history, account: {...account, isAdmin: false}});

  productBackendMock.getProducts.mockResolvedValueOnce({status: "ok", data: [product], data2: 1});
  page.fetch({pagination: {current: 1, pageSize: 5}, searchedColumn: "name", searchText: "workspace"});
  await flushPromises();
  expect(productBackendMock.getProducts).toHaveBeenCalledWith("", 1, 5, "name", "workspace", undefined, undefined);

  jestValue.spyOn(Setting, "isLocalAdminUser").mockReturnValue(false);
  jestValue.spyOn(Setting, "isMobile").mockReturnValue(true);
  const table = page.renderTable([{...product, tag: "auto_created_product_for_plan"}]) as React.ReactElement<{children: React.ReactElement<{columns: Array<{key?: string; fixed?: string; render?: LegacyAny}>; title: () => React.ReactNode}>}>;
  const tableElement = table.props.children;
  const actionColumn = tableElement.props.columns.find(column => column.key === "op");
  expect(actionColumn?.fixed).toBe("false");

  const actionView = render(<>{actionColumn?.render?.(undefined, {...product, tag: "auto_created_product_for_plan"}, 0)}</>);
  fireEvent.click(actionView.getByText("View"));
  expect(history.push).toHaveBeenCalledWith({pathname: "/products/built-in/workspace_credits", mode: "view"});
  expect((actionView.getByText("Delete").closest("button") as HTMLButtonElement | null)?.disabled).toBe(true);
  actionView.unmount();

  const toolbarView = render(<>{tableElement.props.title()}</>);
  expect((toolbarView.getByText("Add").closest("button") as HTMLButtonElement | null)?.disabled).toBe(true);
  toolbarView.unmount();
});

test("keeps product edit loading, provider filtering, rendering and field updates stable", async() => {
  const history = createHistory();
  const page = createProductEditPage({history});

  page.getProduct();
  await flushPromises();
  expect(page.state.product).toEqual(product);

  productBackendMock.getProduct.mockResolvedValueOnce({status: "ok", data: null});
  page.getProduct();
  await flushPromises();
  expect(history.push).toHaveBeenCalledWith("/404");

  page.getOrganizations();
  page.getPaymentProviders("built-in");
  await flushPromises();
  expect(page.state.organizations).toEqual([{name: "built-in"}, {name: "tenant-a"}]);
  expect(page.state.providers).toEqual([{name: "stripe-main", category: "Payment"}]);

  page.updateProductField("displayName", "Renamed Product");
  expect(page.state.product.displayName).toBe("Renamed Product");

  const productView = render(<MemoryRouter>{page.renderProduct()}</MemoryRouter>);
  expect(productView.getByDisplayValue("Renamed Product")).not.toBeNull();
  expect(productView.getByTestId("product-buy-preview")).not.toBeNull();
  productView.unmount();

  page.state = {...page.state, product: {...rechargeProduct, disableCustomRecharge: true}};
  const rechargeView = render(<MemoryRouter>{page.renderProduct()}</MemoryRouter>);
  expect(rechargeView.getByText("Recharge options")).not.toBeNull();
  rechargeView.unmount();
});

test("keeps product edit form handlers, modes and provider errors stable", async() => {
  const page = createProductEditPage();
  jestValue.spyOn(page, "submitProductEdit").mockImplementation(() => undefined);
  jestValue.spyOn(page, "deleteProduct").mockImplementation(() => undefined);

  page.state = {...page.state, mode: "add", product: {...product}};
  const addView = render(<MemoryRouter>{page.renderProduct()}</MemoryRouter>);
  fireEvent.click(addView.getAllByText("Save")[0]);
  fireEvent.click(addView.getAllByText("Save & Exit")[0]);
  fireEvent.click(addView.getAllByText("Cancel")[0]);
  expect(page.submitProductEdit).toHaveBeenCalledWith(false);
  expect(page.submitProductEdit).toHaveBeenCalledWith(true);
  expect(page.deleteProduct).toHaveBeenCalled();
  addView.unmount();

  page.state = {...page.state, mode: "view", product: {...product}};
  const viewMode = render(<MemoryRouter>{page.renderProduct()}</MemoryRouter>);
  expect(viewMode.queryByText("Save")).toBeNull();
  viewMode.unmount();

  providerBackendMock.getProviders.mockResolvedValueOnce({status: "error", msg: "provider failed"});
  page.getPaymentProviders("built-in");
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "provider failed");
});

test("keeps product edit inline change handlers and render empty state stable", () => {
  const page = createProductEditPage();
  page.state = {...page.state, product: {...product}};
  const form = page.renderProduct();
  const changeElements = collectElements(form, element => typeof (element.props as {onChange?: unknown}).onChange === "function");

  changeElements.forEach(element => {
    const props = element.props as LegacyAny;
    if (props.mode === "tags") {
      props.onChange(["20", "10", "bad", "20"]);
      return;
    }
    if (props.mode === "multiple") {
      props.onChange(["stripe-main"]);
      return;
    }
    if (props.virtual === false) {
      props.onChange("Draft");
      return;
    }
    if (typeof props.checked === "boolean") {
      props.onChange(true);
      return;
    }
    if (typeof props.value === "number") {
      props.onChange(123);
      return;
    }
    if (typeof props.value === "string") {
      props.onChange({target: {value: `updated-${props.value}`}});
    }
  });

  expect(page.state.product.providers).toEqual(["stripe-main"]);
  expect(page.state.product.price).toBe(123);

  page.state = {...page.state, product: {...rechargeProduct}};
  const rechargeForm = page.renderProduct();
  const rechargeChangeElements = collectElements(rechargeForm, element => typeof (element.props as {onChange?: unknown}).onChange === "function");
  rechargeChangeElements.forEach(element => {
    const props = element.props as LegacyAny;
    if (props.mode === "tags") {
      props.onChange(["20", "10", "bad", "20"]);
    }
  });
  expect(page.state.product.rechargeOptions).toEqual([10, 20]);

  page.state = {...page.state, product: null};
  const emptyRender = render(<MemoryRouter>{page.render()}</MemoryRouter>);
  expect(emptyRender.queryByTestId("product-buy-preview")).toBeNull();
  expect(emptyRender.container.textContent).toContain("Save");
});

test("keeps product edit save validations, success, failures and delete behavior stable", async() => {
  const history = createHistory();
  const page = createProductEditPage({history});

  page.setState({product: {...product, currency: ""}});
  page.submitProductEdit(false);
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "Please select a currency");

  page.setState({product: {...product, providers: []}});
  page.submitProductEdit(false);
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "Please select at least one payment provider");

  page.setState({product: {...rechargeProduct, disableCustomRecharge: true, rechargeOptions: []}});
  page.submitProductEdit(false);
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "Please add at least one recharge option when custom amount is disabled");

  page.setState({product: {...product, name: "workspace_credits_renamed"}});
  page.submitProductEdit(true);
  await flushPromises();
  expect(productBackendMock.updateProduct).toHaveBeenCalledWith("built-in", "workspace_credits", expect.objectContaining({name: "workspace_credits_renamed"}));
  expect(history.push).toHaveBeenCalledWith("/products");
  expect(Setting.showMessage).toHaveBeenCalledWith("success", "Successfully saved");

  productBackendMock.updateProduct.mockResolvedValueOnce({status: "error", msg: "save failed"});
  page.setState({productName: "workspace_credits", product: {...product, name: "bad_name"}});
  page.submitProductEdit(false);
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "Failed to save: save failed");
  expect(page.state.product.name).toBe("workspace_credits");

  productBackendMock.updateProduct.mockRejectedValueOnce(new Error("network down"));
  page.submitProductEdit(false);
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("network down"));

  productBackendMock.deleteProduct.mockResolvedValueOnce({status: "ok"});
  page.deleteProduct();
  await flushPromises();
  expect(productBackendMock.deleteProduct).toHaveBeenCalledWith(page.state.product);
  expect(history.push).toHaveBeenCalledWith("/products");

  productBackendMock.deleteProduct.mockResolvedValueOnce({status: "error", msg: "delete failed"});
  page.deleteProduct();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "Failed to delete: delete failed");

  productBackendMock.deleteProduct.mockRejectedValueOnce(new Error("delete network down"));
  page.deleteProduct();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete network down"));
});
