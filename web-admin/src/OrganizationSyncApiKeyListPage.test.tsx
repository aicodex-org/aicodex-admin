/* eslint-env jest */
import React from "react";
import {expect as jestExpect, jest as jestValue} from "@jest/globals";
import {render} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import copy from "copy-to-clipboard";
import * as Setting from "./Setting";
import * as FormBackend from "./backend/FormBackend";
import * as OrganizationSyncApiKeyBackend from "./backend/OrganizationSyncApiKeyBackend";
import OrganizationSyncApiKeyListPage from "./OrganizationSyncApiKeyListPage";

declare const jest: typeof jestValue;

type LooseMock = {
  (...args: unknown[]): unknown;
  mockResolvedValue: (value: unknown) => LooseMock;
  mockResolvedValueOnce: (value: unknown) => LooseMock;
  mockRejectedValueOnce: (value: unknown) => LooseMock;
};

type BackendMock = Record<keyof typeof OrganizationSyncApiKeyBackend, LooseMock>;
type FormBackendMock = Record<keyof typeof FormBackend, LooseMock>;

const backendMock = OrganizationSyncApiKeyBackend as unknown as BackendMock;
const formBackendMock = FormBackend as unknown as FormBackendMock;
const copyMock = copy as unknown as LooseMock;
const expect = jestExpect;
const {fireEvent} = require("@testing-library/react") as {
  fireEvent: {
    change: (element: Element | null, event: unknown) => boolean;
    click: (element: Element | null) => boolean;
  };
};

jest.mock("./backend/OrganizationSyncApiKeyBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    getOrganizationSyncApiKeys: factoryJest.fn(),
    addOrganizationSyncApiKey: factoryJest.fn(),
    rotateOrganizationSyncApiKey: factoryJest.fn(),
    disableOrganizationSyncApiKey: factoryJest.fn(),
    deleteOrganizationSyncApiKey: factoryJest.fn(),
  };
});

jest.mock("./backend/FormBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    getForm: factoryJest.fn(),
  };
});

jest.mock("copy-to-clipboard", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return factoryJest.fn();
});

jest.mock("./common/select/OrganizationSelect", () => (props: {initValue?: string; excludedOrganizations?: string[]; onChange: (value: string) => void}) => {
  const organizations = [
    {value: "built-in", label: "Built-in Organization"},
    {value: "engineering", label: "engineering"},
  ].filter(organization => !(props.excludedOrganizations || []).includes(organization.value));
  return (
    <select data-testid="organization-select" value={props.initValue || ""} onChange={event => props.onChange(event.target.value)}>
      {organizations.map(organization => <option key={organization.value} value={organization.value}>{organization.label}</option>)}
    </select>
  );
});

const mockMatchMedia = (query: string): MediaQueryList => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: jestValue.fn(),
  removeListener: jestValue.fn(),
  addEventListener: jestValue.fn(),
  removeEventListener: jestValue.fn(),
  dispatchEvent: jestValue.fn(),
} as unknown as MediaQueryList);

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: mockMatchMedia,
  });
  localStorage.clear();
  jestValue.spyOn(Setting, "showMessage").mockImplementation(() => {});
  formBackendMock.getForm.mockResolvedValue({status: "ok", data: {formItems: []}});
  backendMock.getOrganizationSyncApiKeys.mockResolvedValue({
    status: "ok",
    data: [],
  });
  backendMock.addOrganizationSyncApiKey.mockResolvedValue({status: "ok", data: {secret: "osak_plain_once"}});
  backendMock.rotateOrganizationSyncApiKey.mockResolvedValue({status: "ok", data: {secret: "osak_rotated_once"}});
  backendMock.disableOrganizationSyncApiKey.mockResolvedValue({status: "ok"});
  backendMock.deleteOrganizationSyncApiKey.mockResolvedValue({status: "ok"});
});

afterEach(() => {
  jestValue.restoreAllMocks();
  jestValue.clearAllMocks();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <OrganizationSyncApiKeyListPage
        account={{owner: "engineering", tag: "", isAdmin: true}}
        match={{path: "/organization-sync-api-keys", params: {}}}
      />
    </MemoryRouter>
  );
}

function flushPromises() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

function createPage() {
  const page = new OrganizationSyncApiKeyListPage({account: {owner: "engineering", tag: ""}});
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

test("renders organization sync API Keys without exposing plaintext secret", async() => {
  backendMock.getOrganizationSyncApiKeys.mockResolvedValue({
    status: "ok",
    data: [{
      owner: "engineering",
      organization: "engineering",
      name: "sync-key-main",
      displayName: "Engineering sync key",
      keyPrefix: "osak_live",
      state: "Active",
      secret: "osak_plain_should_not_render",
      lastUsedUserAgent: "gateway-sync/1.0",
    }],
  });

  const view = renderPage();
  const {container} = view;

  expect(await view.findByText("sync-key-main")).not.toBeNull();
  expect(view.getByText("Engineering sync key")).not.toBeNull();
  expect(view.getByText("osak_live")).not.toBeNull();
  expect(view.getByText("gateway-sync/1.0")).not.toBeNull();
  expect(container.textContent).not.toContain("osak_plain_should_not_render");
  expect(backendMock.getOrganizationSyncApiKeys).toHaveBeenCalledWith("engineering");
});

test("protects built-in organization before creating an API Key", () => {
  const page = createPage();
  page.state = {
    ...page.state,
    draftKey: {organization: "built-in", name: "sync-key-built-in"},
  };

  page.addKey();

  expect(backendMock.addOrganizationSyncApiKey).not.toHaveBeenCalled();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "请选择非 built-in 的业务组织");
});

test("copies issued one-time plaintext secret without storing it in list state", () => {
  const page = createPage();
  page.state = {
    ...page.state,
    issuedSecret: "osak_plain_once",
  };

  page.copyIssuedSecret();

  expect(copyMock).toHaveBeenCalledWith("osak_plain_once");
  expect(Setting.showMessage).toHaveBeenCalledWith("success", expect.any(String));
});

test("updates modal draft state and derives selected organization", () => {
  const page = createPage();

  expect(page.getSelectedOrganization()).toBe("engineering");
  expect(page.newKey()).toEqual(expect.objectContaining({
    owner: "engineering",
    organization: "engineering",
    state: "Active",
  }));

  page.openCreateModal();
  expect(page.state.createModalVisible).toBe(true);

  page.updateDraftKey("organization", "sales");
  expect(page.state.draftKey).toEqual(expect.objectContaining({
    owner: "sales",
    organization: "sales",
  }));

  page.showIssuedSecret({secret: "osak_plain_once"});
  expect(page.state.secretModalVisible).toBe(true);
  expect(page.state.issuedSecret).toBe("osak_plain_once");

  page.closeCreateModal();
  expect(page.state.createModalVisible).toBe(false);

  localStorage.setItem("organization", "All");
  const builtInPage = new OrganizationSyncApiKeyListPage({account: {owner: "built-in", tag: ""}});
  expect(builtInPage.getSelectedOrganization()).toBe("");
});

test("renders API Key state and date fallbacks", () => {
  const page = createPage();
  const activeState = render(<>{page.renderState({state: "Active"})}</>);
  expect(activeState.getByText("Active")).not.toBeNull();
  activeState.unmount();

  const expiredState = render(<>{page.renderState({state: "Active", expireTime: "2000-01-01T00:00:00Z"})}</>);
  expect(expiredState.getByText("Expired")).not.toBeNull();
  expiredState.unmount();

  const disabledState = render(<>{page.renderState({state: "Disabled"})}</>);
  expect(disabledState.getByText("Disabled")).not.toBeNull();

  expect(page.renderDate("")).toBe("-");
  expect(page.renderDate(undefined, "永不过期")).toBe("永不过期");
  expect(page.renderDate("2026-06-01T00:00:00Z")).not.toBe("-");
  expect(page.isExpired({expireTime: "2999-01-01T00:00:00Z"})).toBe(false);
});

test("creates and rotates API Keys with one-time secret response", async() => {
  const page = createPage();
  page.state = {
    ...page.state,
    createModalVisible: true,
    draftKey: {organization: "engineering", owner: "engineering", name: "sync-key-main"},
  };

  page.addKey();
  await flushPromises();

  expect(backendMock.addOrganizationSyncApiKey).toHaveBeenCalledWith(expect.objectContaining({
    organization: "engineering",
    name: "sync-key-main",
  }));
  expect(page.state.createModalVisible).toBe(false);
  expect(page.state.secretModalVisible).toBe(true);
  expect(page.state.issuedSecret).toBe("osak_plain_once");

  page.rotateKey({organization: "engineering", name: "sync-key-main"});
  await flushPromises();

  expect(backendMock.rotateOrganizationSyncApiKey).toHaveBeenCalledWith(expect.objectContaining({name: "sync-key-main"}));
  expect(page.state.issuedSecret).toBe("osak_rotated_once");
});

test("reports API Key mutation failures without mutating secrets", async() => {
  const page = createPage();
  page.state = {
    ...page.state,
    draftKey: {organization: "engineering", owner: "engineering", name: "sync-key-main"},
  };
  backendMock.addOrganizationSyncApiKey.mockResolvedValueOnce({status: "error", msg: "create failed"});
  backendMock.addOrganizationSyncApiKey.mockRejectedValueOnce(new Error("create network"));
  backendMock.rotateOrganizationSyncApiKey.mockResolvedValueOnce({status: "error", msg: "rotate failed"});
  backendMock.rotateOrganizationSyncApiKey.mockRejectedValueOnce(new Error("rotate network"));
  backendMock.disableOrganizationSyncApiKey.mockResolvedValueOnce({status: "error", msg: "disable failed"});
  backendMock.disableOrganizationSyncApiKey.mockRejectedValueOnce(new Error("disable network"));
  backendMock.deleteOrganizationSyncApiKey.mockResolvedValueOnce({status: "error", msg: "delete failed"});
  backendMock.deleteOrganizationSyncApiKey.mockRejectedValueOnce(new Error("delete network"));

  page.addKey();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("create failed"));

  page.addKey();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("create network"));

  page.rotateKey({organization: "engineering", name: "sync-key-main"});
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("rotate failed"));

  page.rotateKey({organization: "engineering", name: "sync-key-main"});
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("rotate network"));

  page.disableKey({organization: "engineering", name: "sync-key-main"});
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("disable failed"));

  page.disableKey({organization: "engineering", name: "sync-key-main"});
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("disable network"));

  page.deleteKey({organization: "engineering", name: "sync-key-main"});
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete failed"));

  page.deleteKey({organization: "engineering", name: "sync-key-main"});
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete network"));
  expect(page.state.issuedSecret).toBe("");
});

test("disables and deletes API Keys then refreshes list pagination", async() => {
  const page = createPage();
  page.state = {
    ...page.state,
    data: [{organization: "engineering", owner: "engineering", name: "sync-key-main"}],
    pagination: {...page.state.pagination, current: 2},
  };

  page.disableKey({organization: "engineering", name: "sync-key-main"});
  await flushPromises();

  expect(backendMock.disableOrganizationSyncApiKey).toHaveBeenCalledWith(expect.objectContaining({name: "sync-key-main"}));
  expect(Setting.showMessage).toHaveBeenCalledWith("success", "组织同步密钥已禁用");

  page.state = {
    ...page.state,
    data: [{organization: "engineering", owner: "engineering", name: "sync-key-main"}],
    pagination: {...page.state.pagination, current: 2},
  };
  page.deleteKey({organization: "engineering", name: "sync-key-main"});
  await flushPromises();

  expect(backendMock.deleteOrganizationSyncApiKey).toHaveBeenCalledWith(expect.objectContaining({name: "sync-key-main"}));
  expect(page.state.pagination.current).toBe(1);
  expect(Setting.showMessage).toHaveBeenCalledWith("success", expect.any(String));
});

test("renders create and one-time secret modals", () => {
  const page = createPage();
  page.state = {
    ...page.state,
    createModalVisible: true,
    secretModalVisible: true,
    issuedSecret: "osak_plain_once",
  };

  const createModal = render(<>{page.renderCreateModal()}</>);
  expect(createModal.getByText("创建组织同步密钥")).not.toBeNull();
  expect(createModal.getByText("组织")).not.toBeNull();
  expect(createModal.getByText("engineering")).not.toBeNull();
  expect(createModal.container.textContent).not.toContain("Built-in Organization");
  fireEvent.change(createModal.getByTestId("organization-select"), {target: {value: "engineering"}});
  fireEvent.change(createModal.getByDisplayValue(page.state.draftKey.name || ""), {target: {value: "sync-key-updated"}});
  fireEvent.change(createModal.getByDisplayValue(page.state.draftKey.displayName || ""), {target: {value: "Updated sync key"}});
  expect(page.state.draftKey).toEqual(expect.objectContaining({
    organization: "engineering",
    name: "sync-key-updated",
    displayName: "Updated sync key",
  }));
  createModal.unmount();

  const secretModal = render(<>{page.renderSecretModal()}</>);
  expect(secretModal.getByText("组织同步密钥明文")).not.toBeNull();
  expect(secretModal.getByText("明文只在本次创建或轮换后显示一次，请复制到网关组织同步配置中。")).not.toBeNull();
  expect(secretModal.getByDisplayValue("osak_plain_once")).not.toBeNull();
  const secretButtons = Array.from<HTMLButtonElement>(secretModal.baseElement.querySelectorAll("button"))
    .filter(button => (button.textContent || "").trim() !== "");
  fireEvent.click(secretButtons[0]);
  fireEvent.click(secretButtons[1]);
  expect(copyMock).toHaveBeenCalledWith("osak_plain_once");
  expect(page.state.secretModalVisible).toBe(false);
});

test("renders table toolbar and action handlers", () => {
  const page = createPage();
  const table = render(
    <MemoryRouter>
      {page.renderTable([{organization: "engineering", owner: "engineering", name: "sync-key-main", state: "Active"}])}
    </MemoryRouter>
  );

  expect(table.getByText("轮换")).not.toBeNull();
  expect(table.getByText("禁用")).not.toBeNull();
  expect(table.container.textContent).toContain("组织同步密钥");
  const buttons = table.container.querySelectorAll("button");
  fireEvent.click(buttons[0]);
  fireEvent.click(buttons[1]);
  expect(page.state.createModalVisible).toBe(true);
});

test("reports list fetch server and network errors", async() => {
  const page = createPage();
  backendMock.getOrganizationSyncApiKeys.mockResolvedValueOnce({
    status: "error",
    msg: "list failed",
  });

  page.fetch();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "list failed");

  backendMock.getOrganizationSyncApiKeys.mockRejectedValueOnce(new Error("offline"));
  page.fetch();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("offline"));
});

test("renders unauthorized state when API Key list request is denied", async() => {
  backendMock.getOrganizationSyncApiKeys.mockResolvedValue({
    status: "error",
    msg: "Unauthorized operation",
  });

  const view = renderPage();

  expect(await view.findByText("403 Unauthorized")).not.toBeNull();
  expect(Setting.showMessage).not.toHaveBeenCalledWith("error", "Unauthorized operation");
});
