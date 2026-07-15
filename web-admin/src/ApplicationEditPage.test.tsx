/* eslint-env jest */

import React from "react";
import {cleanup, render} from "@testing-library/react";
import {expect, jest} from "@jest/globals";
import {Modal, message} from "antd";
import i18next from "i18next";
import copy from "copy-to-clipboard";
import "./i18n";
import ApplicationEditPage from "./ApplicationEditPage";
import * as ApplicationBackend from "./backend/ApplicationBackend";
import * as CertBackend from "./backend/CertBackend";
import * as OrganizationBackend from "./backend/OrganizationBackend";
import * as ProviderBackend from "./backend/ProviderBackend";
import * as ResourceBackend from "./backend/ResourceBackend";
import * as Setting from "./Setting";
import en from "./locales/en/data.json";
import zh from "./locales/zh/data.json";

const {fireEvent} = require("@testing-library/react") as {fireEvent: {
  click: (element: Element) => boolean;
  change: (element: Element, init: {target: Record<string, unknown>}) => boolean;
}};

type LooseMock = {
  (...args: unknown[]): unknown;
  mockClear: () => LooseMock;
  mockImplementationOnce: (implementation: (...args: unknown[]) => unknown) => LooseMock;
  mockResolvedValue: (value: unknown) => LooseMock;
  mockResolvedValueOnce: (value: unknown) => LooseMock;
  mockRejectedValueOnce: (value: unknown) => LooseMock;
};

type ApplicationBackendMock = Record<"getApplication" | "addApplication" | "updateApplication" | "deleteApplication" | "getSamlMetadata", LooseMock>;
type ProviderBackendMock = Record<"getProviders", LooseMock>;
type OrganizationBackendMock = Record<"getOrganizations", LooseMock>;
type CertBackendMock = Record<"getCerts", LooseMock>;
type ResourceBackendMock = Record<"uploadResource", LooseMock>;

type PageHarness = ApplicationEditPage & {
  state: any;
  props: any;
  setState: (patch: any, callback?: () => void) => void;
  handleCancel: () => void;
  handleBack: () => void;
};

jest.mock("./backend/ApplicationBackend", () => {
  const {jest: factoryJest} = require("@jest/globals");
  return {
    getApplication: factoryJest.fn(),
    addApplication: factoryJest.fn(),
    updateApplication: factoryJest.fn(),
    deleteApplication: factoryJest.fn(),
    getSamlMetadata: factoryJest.fn(),
  };
});

jest.mock("./backend/ProviderBackend", () => {
  const {jest: factoryJest} = require("@jest/globals");
  return {getProviders: factoryJest.fn()};
});

jest.mock("./backend/OrganizationBackend", () => {
  const {jest: factoryJest} = require("@jest/globals");
  return {getOrganizations: factoryJest.fn()};
});

jest.mock("./backend/CertBackend", () => {
  const {jest: factoryJest} = require("@jest/globals");
  return {getCerts: factoryJest.fn()};
});

jest.mock("./backend/ResourceBackend", () => {
  const {jest: factoryJest} = require("@jest/globals");
  return {uploadResource: factoryJest.fn()};
});

jest.mock("copy-to-clipboard", () => {
  const {jest: factoryJest} = require("@jest/globals");
  return factoryJest.fn();
});

jest.mock("./common/Editor", () => function EditorMock() {
  return <pre data-testid="editor" />;
});

jest.mock("./common/theme/ThemeEditor", () => function ThemeEditorMock(props: {onThemeChange?: (theme: unknown) => void}) {
  return <button type="button" data-testid="theme-editor" onClick={() => props.onThemeChange?.({colorPrimary: "#1677ff"})}>ThemeEditor</button>;
});

jest.mock("./auth/SignupPage", () => function SignupPageMock() {
  return <div data-testid="signup-preview">SignupPage</div>;
});

jest.mock("./auth/LoginPage", () => function LoginPageMock() {
  return <div data-testid="login-preview">LoginPage</div>;
});

jest.mock("./auth/PromptPage", () => function PromptPageMock() {
  return <div data-testid="prompt-preview">PromptPage</div>;
});

jest.mock("antd/es/layout/layout", () => ({
  Content: ({children, ...props}: {children?: React.ReactNode}) => <main {...props}>{children}</main>,
  Header: ({children, ...props}: {children?: React.ReactNode}) => <header {...props}>{children}</header>,
}));

jest.mock("antd/es/layout/Sider", () => function SiderMock({children, width, style, ...props}: {children?: React.ReactNode; width?: number; style?: React.CSSProperties}) {
  return <aside {...props} data-width={width} style={style}>{children}</aside>;
});

const applicationBackendMock = ApplicationBackend as unknown as ApplicationBackendMock;
const providerBackendMock = ProviderBackend as unknown as ProviderBackendMock;
const organizationBackendMock = OrganizationBackend as unknown as OrganizationBackendMock;
const certBackendMock = CertBackend as unknown as CertBackendMock;
const resourceBackendMock = ResourceBackend as unknown as ResourceBackendMock;
const copyMock = copy as unknown as LooseMock;

const baseApplication = {
  owner: "engineering",
  organization: "engineering",
  organizationObj: {ipWhitelist: "10.0.0.0/24"},
  name: "portal",
  displayName: "Portal",
  category: "Default",
  type: "All",
  isShared: false,
  logo: "/logo.svg",
  title: "Portal title",
  favicon: "",
  homepageUrl: "https://example.test",
  description: "",
  tags: [],
  providers: [],
  signinMethods: [],
  signinItems: [],
  signupItems: [],
  redirectUris: ["https://example.test/callback"],
  grantTypes: ["authorization_code"],
  scopes: [],
  customScopes: [],
  tokenFields: [],
  tokenAttributes: [],
  samlAttributes: [],
  orgChoiceMode: ["None"],
  otherDomains: [],
  enableSignUp: true,
  enableSigninSession: false,
  enableAutoSignin: false,
  enableSamlPostBinding: false,
  themeData: {isEnabled: false},
};

function mockMatchMedia(query: string): MediaQueryList {
  return {
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  } as unknown as MediaQueryList;
}

async function useTestLanguage(language: string) {
  if (!i18next.isInitialized) {
    await i18next.init({
      lng: language,
      fallbackLng: "en",
      resources: {en, zh},
      ns: Object.keys(en),
      keySeparator: false,
    });
    return;
  }

  Object.entries(en).forEach(([namespace, values]) => {
    i18next.addResourceBundle("en", namespace, values, true, true);
  });
  Object.entries(zh).forEach(([namespace, values]) => {
    i18next.addResourceBundle("zh", namespace, values, true, true);
  });
  await i18next.changeLanguage(language);
}

function createPage(options: {mode?: string; application?: Record<string, unknown>; legacyAdd?: boolean} = {}): PageHarness {
  const draftApplication = {
    ...baseApplication,
    ...options.application,
  };
  const page = new ApplicationEditPage({
    match: {params: {organizationName: "engineering", applicationName: "portal"}},
    location: options.mode === "add" && !options.legacyAdd
      ? {state: {mode: "add", application: draftApplication}, search: ""}
      : {mode: options.legacyAdd ? "add" : options.mode, search: ""},
    history: {push: jest.fn()},
    account: {owner: "engineering", name: "admin"},
  } as any) as unknown as PageHarness;

  page.state = {
    ...page.state,
    application: draftApplication,
    organizations: [{name: "engineering", displayName: "Engineering"}],
    certs: [{name: "cert-main"}],
    providers: [{name: "provider-main"}],
    samlMetadata: "<xml />",
  };
  Object.defineProperty(page, "setState", {
    configurable: true,
    value: (patch: any, callback?: () => void) => {
      const nextPatch = typeof patch === "function" ? patch(page.state, page.props) : patch;
      page.state = {
        ...page.state,
        ...(nextPatch || {}),
      };
      callback?.();
    },
  });
  return page;
}

async function flushPromises() {
  await new Promise(resolve => setTimeout(resolve, 0));
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return {promise, resolve, reject};
}

type FormControlElement = React.ReactElement<{
  children?: React.ReactNode;
  value?: unknown;
  checked?: boolean;
  onChange?: (...args: any[]) => void;
}>;

function findFormControls(node: React.ReactNode, predicate: (element: FormControlElement) => boolean): FormControlElement[] {
  if (!React.isValidElement(node)) {
    return [];
  }

  const element = node as FormControlElement;
  const matched = predicate(element) ? [element] : [];
  return matched.concat(
    React.Children.toArray(element.props.children).flatMap(child => findFormControls(child, predicate))
  );
}

function getFormControlByValue(page: PageHarness, value: unknown, index = 0): FormControlElement {
  const controls = findFormControls(page.renderApplicationForm(), element => element.props.value === value && typeof element.props.onChange === "function");
  if (!controls[index]) {
    throw new Error(`未找到值为 ${String(value)} 的表单控件`);
  }
  return controls[index];
}

function getFormSwitches(page: PageHarness): FormControlElement[] {
  return findFormControls(page.renderApplicationForm(), element => element.props.checked !== undefined && typeof element.props.onChange === "function");
}

function findRenderedElements(node: React.ReactNode, predicate: (element: React.ReactElement) => boolean): React.ReactElement[] {
  if (!React.isValidElement(node)) {
    return [];
  }

  const element = node as React.ReactElement;
  const matched = predicate(element) ? [element] : [];
  const props = element.props as {children?: React.ReactNode; content?: React.ReactNode};
  const nestedNodes = [...React.Children.toArray(props.children), props.content];
  return matched.concat(nestedNodes.flatMap(child => findRenderedElements(child, predicate)));
}

beforeEach(async() => {
  await useTestLanguage("en");
  window.location.hash = "";
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: mockMatchMedia,
  });
  jest.spyOn(Setting, "isMobile").mockReturnValue(false);
  jest.spyOn(Setting, "showMessage").mockImplementation(() => {});
  jest.spyOn(message, "error").mockImplementation((() => undefined) as unknown as typeof message.error);
  jest.spyOn(Setting, "deepCopy").mockImplementation((value: unknown) => JSON.parse(JSON.stringify(value)));
  jest.spyOn(Setting, "myParseInt").mockImplementation((value: unknown) => Number.parseInt(String(value), 10));
  applicationBackendMock.getApplication.mockResolvedValue({status: "ok", data: {...baseApplication}});
  applicationBackendMock.addApplication.mockResolvedValue({status: "ok"});
  applicationBackendMock.updateApplication.mockResolvedValue({status: "ok"});
  applicationBackendMock.deleteApplication.mockResolvedValue({status: "ok"});
  applicationBackendMock.getSamlMetadata.mockResolvedValue("<xml />");
  providerBackendMock.getProviders.mockResolvedValue({status: "ok", data: [{name: "provider-main"}]});
  organizationBackendMock.getOrganizations.mockResolvedValue({status: "ok", data: [{name: "engineering"}]});
  certBackendMock.getCerts.mockResolvedValue({status: "ok", data: [{name: "cert-main"}]});
  resourceBackendMock.uploadResource.mockResolvedValue({status: "ok", data: "/resources/terms.html"});
  copyMock.mockClear();
});

afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
});

test("loads add-draft dependencies without reading a missing application", async() => {
  const draft = {...baseApplication, providers: [{name: "provider-main"}]};
  const getApplication = jest.spyOn(ApplicationBackend, "getApplication");
  const page = new ApplicationEditPage({
    match: {params: {organizationName: draft.organization, applicationName: draft.name}},
    location: {state: {mode: "add", application: draft}, search: ""},
    history: {push: jest.fn()},
    account: {owner: draft.organization, name: "admin"},
  } as any) as unknown as PageHarness;
  Object.defineProperty(page, "setState", {
    configurable: true,
    value: (patch: any) => {
      const nextPatch = typeof patch === "function" ? patch(page.state, page.props) : patch;
      page.state = {...page.state, ...(nextPatch || {})};
    },
  });

  page.UNSAFE_componentWillMount();
  await flushPromises();

  expect(getApplication).not.toHaveBeenCalled();
  expect(providerBackendMock.getProviders).toHaveBeenCalledWith(draft.organization);
  expect(certBackendMock.getCerts).toHaveBeenCalledWith(draft.organization);
  expect(page.state.providers).toEqual([{name: "provider-main"}]);
  expect(page.state.application.providers).toEqual([{name: "provider-main"}]);
});

test("preserves draft providers when saving before provider options finish loading", async() => {
  const page = createPage({mode: "add", application: {providers: [{name: "provider-main"}]}});
  page.state = {...page.state, providers: [], providersLoaded: false};

  page.submitApplicationEdit(false);
  await flushPromises();

  expect(applicationBackendMock.addApplication).toHaveBeenCalledWith(expect.objectContaining({
    providers: [{name: "provider-main"}],
  }));
  expect(page.state.mode).toBe("edit");

  page.submitApplicationEdit(false);
  await flushPromises();
  expect(applicationBackendMock.addApplication).toHaveBeenCalledTimes(1);
  expect(applicationBackendMock.updateApplication).toHaveBeenCalledTimes(1);
});

test("reloads the persisted application before allowing a second save", async() => {
  const persistedApplication = {
    ...baseApplication,
    clientId: "generated-client-id",
    clientSecret: "***",
  };
  const reloadRequest = new Promise(resolve => {
    setTimeout(() => resolve({status: "ok", data: persistedApplication}), 0);
  });
  applicationBackendMock.getApplication.mockImplementationOnce(() => reloadRequest);
  const page = createPage({mode: "add", application: {clientId: "", clientSecret: ""}});

  page.submitApplicationEdit(false);
  await Promise.resolve();
  await Promise.resolve();

  expect(page.state.mode).toBe("edit");
  expect(applicationBackendMock.getApplication).toHaveBeenCalledWith("admin", "portal");
  page.submitApplicationEdit(false);
  expect(applicationBackendMock.updateApplication).not.toHaveBeenCalled();

  await flushPromises();
  expect(page.state.application.clientId).toBe("generated-client-id");
  expect(page.state.application.clientSecret).toBe("***");

  page.submitApplicationEdit(false);
  await flushPromises();
  expect(applicationBackendMock.updateApplication).toHaveBeenCalledWith("admin", "portal", expect.objectContaining({
    clientId: "generated-client-id",
    clientSecret: "***",
  }));
});

test("ignores a successful post-create reload after the editor unmounts", async() => {
  const reloadRequest = createDeferred<unknown>();
  applicationBackendMock.getApplication.mockImplementationOnce(() => reloadRequest.promise);
  const page = createPage({mode: "add", application: {clientId: "", clientSecret: ""}});

  page.submitApplicationEdit(false);
  await Promise.resolve();
  await Promise.resolve();
  (Setting.showMessage as unknown as {mockClear: () => void}).mockClear();
  const stateBeforeUnmount = page.state;
  (page as unknown as {componentWillUnmount?: () => void}).componentWillUnmount?.();
  reloadRequest.resolve({status: "ok", data: {...baseApplication, clientId: "late-client-id", clientSecret: "***"}});
  await flushPromises();

  expect(page.state).toBe(stateBeforeUnmount);
  expect(page.state.application.clientId).toBe("");
  expect(page.state.postCreateReloadStatus).toBe("loading");
  expect(Setting.showMessage).not.toHaveBeenCalled();
});

test("ignores a rejected post-create reload after the editor unmounts", async() => {
  const reloadRequest = createDeferred<unknown>();
  applicationBackendMock.getApplication.mockImplementationOnce(() => reloadRequest.promise);
  const page = createPage({mode: "add"});

  page.submitApplicationEdit(false);
  await Promise.resolve();
  await Promise.resolve();
  (Setting.showMessage as unknown as {mockClear: () => void}).mockClear();
  const stateBeforeUnmount = page.state;
  (page as unknown as {componentWillUnmount?: () => void}).componentWillUnmount?.();
  reloadRequest.reject(new Error("late reload failure"));
  await flushPromises();

  expect(page.state).toBe(stateBeforeUnmount);
  expect(page.state.postCreateReloadStatus).toBe("loading");
  expect(Setting.showMessage).not.toHaveBeenCalled();
});

[
  {name: "business error", arrangeReload: () => applicationBackendMock.getApplication.mockResolvedValueOnce({status: "error", msg: "reload failed"})},
  {name: "missing data", arrangeReload: () => applicationBackendMock.getApplication.mockResolvedValueOnce({status: "ok", data: null})},
  {name: "network rejection", arrangeReload: () => applicationBackendMock.getApplication.mockRejectedValueOnce(new Error("reload unavailable"))},
].forEach(({name, arrangeReload}) => {
  test(`keeps update fail-closed when post-create reload has ${name}`, async() => {
    arrangeReload();
    const page = createPage({mode: "add"});

    page.submitApplicationEdit(false);
    await flushPromises();
    page.submitApplicationEdit(false);
    await flushPromises();

    expect(page.state.mode).toBe("edit");
    expect(applicationBackendMock.updateApplication).not.toHaveBeenCalled();
    page.handleCancel();
    expect(page.props.history.push).toHaveBeenCalledWith("/applications");
    expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.any(String));
  });
});

test("returns after creating without reloading an editor that is leaving", async() => {
  const page = createPage({mode: "add"});

  page.submitApplicationEdit(true);
  await flushPromises();

  expect(applicationBackendMock.addApplication).toHaveBeenCalledTimes(1);
  expect(applicationBackendMock.getApplication).not.toHaveBeenCalled();
  expect(page.props.history.push).toHaveBeenCalledWith("/applications");
});

test("keeps an edited application draft name when add is rejected", async() => {
  applicationBackendMock.addApplication.mockResolvedValueOnce({status: "error", msg: "duplicate"});
  const page = createPage({mode: "add", application: {name: "custom-draft"}});

  page.submitApplicationEdit(false);
  await flushPromises();

  expect(page.state.application.name).toBe("custom-draft");
});

test("falls back to detail loading when legacy add mode has no route draft", () => {
  const page = createPage({legacyAdd: true});
  page.UNSAFE_componentWillMount();
  expect(applicationBackendMock.getApplication).toHaveBeenCalledWith("admin", "portal");
});

test("renders application edit in the shared large edit shell with fixed tabs and action bar", () => {
  const page = createPage();
  const view = render(<>{page.renderApplication()}</>);

  expect(view.container.querySelector(".application-edit-shell")).not.toBeNull();
  expect(view.container.querySelector(".application-edit-header")).not.toBeNull();
  expect(view.container.querySelector(".application-edit-tabs")).not.toBeNull();
  expect(view.container.querySelector(".application-edit-scroll-content")).not.toBeNull();
  expect(view.container.querySelector(".application-edit-action-bar")).not.toBeNull();
  expect(view.container.querySelector(".application-edit-card .ant-card-head")).toBeNull();
  const actionButtons = Array.from(view.container.querySelectorAll(".application-edit-action-bar button")) as HTMLButtonElement[];
  expect(actionButtons.map(button => button.textContent)).toEqual([
    "Cancel",
    "Save",
    "Save and return",
  ]);
  expect(view.getByText("Application Access / Applications /")).not.toBeNull();
  expect(view.getByText("Edit Application")).not.toBeNull();
});

test("restores application edit tab from hash and writes hash on tab changes", () => {
  window.location.hash = "#providers";
  const page = createPage();
  page.state.activeMenuKey = page.getActiveTabKey();
  const view = render(<>{page.renderApplication()}</>);

  expect(view.container.querySelector(".application-edit-full-width-row")).not.toBeNull();
  fireEvent.click(view.getByText("UI Customization"));

  expect(page.state.activeMenuKey).toBe("ui-customization");
  expect(window.location.hash).toBe("#ui-customization");
});

test("renders ui customization previews as static panels without auth page side effects", () => {
  const page = createPage({
    application: {
      providers: [{name: "github", prompted: true, provider: {name: "github", displayName: "GitHub", category: "OAuth"}}],
      signinItems: [{name: "Email", visible: true}],
      signupItems: [{name: "Email", visible: true}, {name: "Display name", visible: true}],
    },
  });
  page.state.activeMenuKey = "ui-customization";
  const view = render(<>{page.renderApplication()}</>);

  expect(view.queryByTestId("signup-preview")).toBeNull();
  expect(view.queryByTestId("login-preview")).toBeNull();
  expect(view.queryByTestId("prompt-preview")).toBeNull();
  expect(view.container.querySelectorAll(".application-edit-static-preview").length).toBe(3);
  expect(view.getByText("Copy signup page URL")).not.toBeNull();
  expect(view.getByText("Copy signin page URL")).not.toBeNull();
  expect(view.getByText("Copy prompt page URL")).not.toBeNull();
  expect(view.getByText("GitHub")).not.toBeNull();
});

test("renders table-heavy tab content as full-width modules without duplicate field labels", () => {
  const page = createPage({
    application: {
      category: "Agent",
      scopes: [{name: "profile.read", displayName: "Profile Read", description: "Read profile"}],
    },
  });
  page.state.activeMenuKey = "oidc-oauth";
  const view = render(<>{page.renderApplication()}</>);
  const tableRows = Array.from(view.container.querySelectorAll(".application-edit-table-row")) as HTMLElement[];

  expect(tableRows).toHaveLength(2);
  tableRows.forEach(row => {
    expect(row.classList.contains("admin-large-edit-full-width-row")).toBe(true);
    expect(row.children).toHaveLength(1);
  });
  expect(view.container.querySelector(".application-edit-table-row > .ant-col:first-child + .ant-col")).toBeNull();
  expect(view.container.querySelectorAll(".application-edit-table-row .ant-table-title").length).toBe(2);
});

test("applies content-aware width classes to non-table application edit controls", () => {
  const page = createPage();
  let view = render(<>{page.renderApplication()}</>);

  expect(view.container.querySelectorAll(".application-edit-control-row-medium").length).toBeGreaterThanOrEqual(4);
  expect(view.container.querySelectorAll(".application-edit-control-row-compact").length).toBeGreaterThanOrEqual(2);
  expect(view.container.querySelectorAll(".application-edit-asset-row.application-edit-control-row-medium").length).toBe(2);
  expect(view.container.querySelector(".application-edit-resource-detail-row")).toBeNull();
  expect(view.container.querySelector(".application-edit-resource-detail-label")).toBeNull();

  view.unmount();
  page.state.activeMenuKey = "oidc-oauth";
  view = render(<>{page.renderApplication()}</>);

  expect(view.container.querySelectorAll(".application-edit-control-row-medium").length).toBeGreaterThanOrEqual(3);
  expect(view.container.querySelectorAll(".application-edit-control-row-compact").length).toBeGreaterThanOrEqual(4);
  expect(view.container.querySelector(".application-edit-table-row.application-edit-control-row-medium")).toBeNull();
});

test("localizes application edit unit add-ons", async() => {
  await useTestLanguage("zh");
  const page = createPage({
    application: {
      expireInHours: 168,
      refreshExpireInHours: 168,
      failedSigninLimit: 5,
      failedSigninFrozenTime: 15,
      codeResendTimeout: 0,
    },
  });
  page.state.activeMenuKey = "oidc-oauth";
  let view = render(<>{page.renderApplication()}</>);

  expect(view.getAllByText("小时").length).toBeGreaterThanOrEqual(2);

  view.unmount();
  page.state.activeMenuKey = "security";
  view = render(<>{page.renderApplication()}</>);

  expect(view.getByText("次")).not.toBeNull();
  expect(view.getByText("分钟")).not.toBeNull();
  expect(view.getByText("秒")).not.toBeNull();

  view.unmount();
  page.state.activeMenuKey = "ui-customization";
  view = render(<>{page.renderApplication()}</>);

  expect(view.getByText("页头 HTML")).not.toBeNull();
  expect(view.getByText("页脚 HTML")).not.toBeNull();
});

test("renders UI customization image URLs on the standard field axis", () => {
  const page = createPage({
    application: {
      formBackgroundUrl: "/branding/background.png",
      formBackgroundUrlMobile: "",
    },
  });
  page.state.activeMenuKey = "ui-customization";
  const view = render(<>{page.renderApplication()}</>);

  expect(view.container.querySelectorAll(".application-edit-image-url-row.application-edit-control-row-medium").length).toBe(2);
  expect(view.container.querySelector(".application-edit-resource-detail-row")).toBeNull();
  expect(view.getAllByText("Not configured").length).toBeGreaterThanOrEqual(1);
});

test("publishes the application display name for its workspace tab after loading and editing", async() => {
  const dispatchSpy = jest.spyOn(window, "dispatchEvent");
  const page = createPage({application: {displayName: "AICodex Portal"}});
  applicationBackendMock.getApplication.mockResolvedValue({
    status: "ok",
    data: {...baseApplication, displayName: "AICodex Portal"},
  });

  page.getApplication();
  await flushPromises();

  const dispatchedEvent = dispatchSpy.mock.calls.at(-1)?.[0] as CustomEvent | undefined;
  expect(dispatchedEvent?.type).toBe("aicodex.admin.workspaceTabLabelUpdate");
  expect(dispatchedEvent?.detail).toEqual({
    path: "/applications/engineering/portal",
    label: "Edit Application: AICodex Portal",
  });

  page.updateApplicationField("displayName", "Portal Updated");

  const updatedEvent = dispatchSpy.mock.calls.at(-1)?.[0] as CustomEvent | undefined;
  expect(updatedEvent?.detail).toEqual({
    path: "/applications/engineering/portal",
    label: "Edit Application: Portal Updated",
  });
});

test("marks application dirty on field updates and confirms before canceling", () => {
  const page = createPage();
  const confirmSpy = jest.spyOn(Modal, "confirm").mockImplementation((config: Parameters<typeof Modal.confirm>[0]) => {
    (config.onOk as (() => void) | undefined)?.();
    return {destroy: jest.fn(), update: jest.fn()} as ReturnType<typeof Modal.confirm>;
  });

  page.updateApplicationField("displayName", "Portal Updated");
  page.handleCancel();

  expect(page.state.dirty).toBe(true);
  expect(confirmSpy).toHaveBeenCalledWith(expect.objectContaining({
    title: "Unsaved changes",
    content: "Current application settings have unsaved changes. Leave without saving?",
    okText: "OK",
    cancelText: "Cancel",
  }));
  expect(page.props.history.push).toHaveBeenCalledWith("/applications");
});

test("normalizes nullable detail collections before the application becomes editable", async() => {
  const page = createPage();
  const responseApplication = {
    ...baseApplication,
    grantTypes: null,
    tags: null,
    providers: null,
  };
  applicationBackendMock.getApplication.mockResolvedValue({status: "ok", data: responseApplication});

  page.getApplication();
  await flushPromises();

  expect(page.state.application).toEqual(expect.objectContaining({
    grantTypes: ["authorization_code"],
    tags: [],
    providers: [],
  }));
  expect(responseApplication).toEqual(expect.objectContaining({
    grantTypes: null,
    tags: null,
    providers: null,
  }));
});

test("keeps legacy offset conversion local to the edited field", () => {
  const page = createPage();

  page.updateApplicationField("offset", "12");
  page.updateApplicationField("displayName", " Portal ");

  expect(page.state.application.offset).toBe(12);
  expect(page.state.application.displayName).toBe(" Portal ");
});

test("rejects non-HTML terms uploads and stores only the returned resource path", async() => {
  const page = createPage();
  const invalidFile = {type: "text/plain"};

  page.handleUpload({file: invalidFile});

  expect(resourceBackendMock.uploadResource).not.toHaveBeenCalled();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "Please select a HTML file");

  const htmlFile = {type: "text/html"};
  page.handleUpload({file: htmlFile});
  await flushPromises();

  expect(resourceBackendMock.uploadResource).toHaveBeenCalledWith(
    "engineering",
    "admin",
    "termsOfUse",
    "ApplicationEditPage",
    "termsOfUse/engineering/portal.html",
    htmlFile
  );
  expect(page.state.application.termsOfUse).toBe("/resources/terms.html");
  expect(page.state.uploading).toBe(false);
});

test("blocks required application fields before save and focuses the basic tab", () => {
  const page = createPage({application: {name: " ", displayName: " "}});
  page.state.activeMenuKey = "providers";
  window.location.hash = "#providers";

  page.submitApplicationEdit(false);

  expect(applicationBackendMock.updateApplication).not.toHaveBeenCalled();
  expect(page.state.activeMenuKey).toBe("basic");
  expect(window.location.hash).toBe("#basic");
  expect(page.state.fieldErrors.name).toBe("This field is required");
  expect(page.state.fieldErrors.displayName).toBe("This field is required");
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "Name: This field is required");
});

test("focuses OIDC/OAuth tab for invalid custom scopes and ignores duplicate submits", async() => {
  const page = createPage({application: {customScopes: [{scope: " ", displayName: "Broken"}]}});
  page.state.activeMenuKey = "basic";

  page.submitApplicationEdit(false);

  expect(applicationBackendMock.updateApplication).not.toHaveBeenCalled();
  expect(page.state.activeMenuKey).toBe("oidc-oauth");
  expect(window.location.hash).toBe("#oidc-oauth");

  page.state = {
    ...page.state,
    application: {...baseApplication},
    submitting: true,
  };
  page.submitApplicationEdit(false);
  await flushPromises();

  expect(applicationBackendMock.updateApplication).not.toHaveBeenCalled();
});

test("saves application, clears dirty state and keeps existing navigation semantics", async() => {
  const page = createPage();
  page.updateApplicationField("displayName", "Portal Updated");

  page.submitApplicationEdit(false);
  await flushPromises();

  expect(applicationBackendMock.updateApplication).toHaveBeenCalledWith("admin", "portal", expect.objectContaining({
    name: "portal",
    displayName: "Portal Updated",
  }));
  expect(page.state.dirty).toBe(false);
  expect(page.state.submitting).toBe(false);
  expect(page.props.history.push).toHaveBeenCalledWith("/applications/engineering/portal");
});

test("restores the route name and clears submitting state when an application update is rejected", async() => {
  const page = createPage({application: {name: "renamed-portal"}});
  applicationBackendMock.updateApplication.mockResolvedValue({status: "error", msg: "Rejected"});

  page.submitApplicationEdit(false);
  await flushPromises();

  expect(page.state.application.name).toBe("portal");
  expect(page.state.submitting).toBe(false);
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "Failed to save: Rejected");
  expect(page.props.history.push).not.toHaveBeenCalled();
});

test("clears submitting state when an application update cannot reach the server", async() => {
  const page = createPage();
  applicationBackendMock.updateApplication.mockRejectedValueOnce(new Error("Network unavailable"));

  page.submitApplicationEdit(false);
  await flushPromises();

  expect(page.state.submitting).toBe(false);
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("Failed to connect to server"));
});

test("renders configuration tabs with provider, SAML, security and reverse proxy data", () => {
  const page = createPage({
    application: {
      defaultGroup: "engineering/default",
      enableSigninSession: true,
      enableAutoSignin: true,
      samlReplyUrl: "https://example.test/saml/reply",
      enableSamlPostBinding: true,
      samlHashAlgorithm: "SHA256",
      samlAttributes: [{name: "email", nameFormat: "basic", value: "email"}],
      providers: [{name: "provider-main", provider: "provider-main", enabled: true}],
      cert: "cert-main",
      clientCert: "cert-main",
      failedSigninLimit: 5,
      failedSigninFrozenTime: 15,
      codeResendTimeout: 60,
      ipWhitelist: "10.0.0.0/24",
      domain: "portal.example.test",
      otherDomains: ["login.example.test"],
      upstreamHost: "portal.internal:8080",
      sslMode: "HTTPS Only",
      sslCert: "cert-main",
    },
  });

  page.state.activeMenuKey = "authentication";
  let view = render(<>{page.renderApplication()}</>);
  expect(view.getByText("Authentication settings")).not.toBeNull();
  expect(view.getByText("Default group")).not.toBeNull();
  view.unmount();

  page.state.activeMenuKey = "saml";
  view = render(<>{page.renderApplication()}</>);
  expect(view.getByText("SAML settings")).not.toBeNull();
  const samlReplyUrlInput = view.getByDisplayValue("https://example.test/saml/reply");
  fireEvent.change(samlReplyUrlInput, {target: {value: "https://example.test/saml/updated"}});
  expect(page.state.application.samlReplyUrl).toBe("https://example.test/saml/updated");
  const copySamlMetadataButton = view.getByText("Copy SAML metadata URL");
  fireEvent.click(copySamlMetadataButton);
  expect(copyMock).toHaveBeenCalledWith(
    `${window.location.origin}/api/saml/metadata?application=admin/portal&enablePostBinding=true`
  );
  view.unmount();

  page.state.activeMenuKey = "providers";
  view = render(<>{page.renderApplication()}</>);
  expect(view.getByText("Provider bindings")).not.toBeNull();
  expect(view.getAllByText("Providers").length).toBeGreaterThan(0);
  view.unmount();

  page.state.activeMenuKey = "security";
  view = render(<>{page.renderApplication()}</>);
  expect(view.getByText("Security settings")).not.toBeNull();
  expect(view.getByDisplayValue("10.0.0.0/24")).not.toBeNull();
  expect(view.getByText("Click to Upload")).not.toBeNull();
  view.unmount();

  page.state.activeMenuKey = "reverse-proxy";
  view = render(<>{page.renderApplication()}</>);
  expect(view.getByText("Reverse Proxy settings")).not.toBeNull();
  const domainInput = view.getByDisplayValue("portal.example.test");
  const upstreamHostInput = view.getByDisplayValue("portal.internal:8080");
  fireEvent.change(domainInput, {target: {value: "updated.example.test"}});
  fireEvent.change(upstreamHostInput, {target: {value: "updated.internal:8443"}});
  expect(page.state.application.domain).toBe("updated.example.test");
  expect(page.state.application.upstreamHost).toBe("updated.internal:8443");
});

test("updates authentication and OIDC/OAuth configuration fields in the application draft", () => {
  const page = createPage({
    application: {
      signupUrl: "https://example.test/signup",
      signinUrl: "https://example.test/signin",
      forgetUrl: "https://example.test/forget",
      affiliationUrl: "https://example.test/affiliation",
      clientId: "portal-client",
      forcedRedirectOrigin: "https://example.test",
    },
  });

  page.state.activeMenuKey = "authentication";
  let view = render(<>{page.renderApplication()}</>);
  fireEvent.change(view.getByDisplayValue("https://example.test/signup"), {target: {value: "https://example.test/join"}});
  fireEvent.change(view.getByDisplayValue("https://example.test/signin"), {target: {value: "https://example.test/login"}});
  expect(page.state.application.signupUrl).toBe("https://example.test/join");
  expect(page.state.application.signinUrl).toBe("https://example.test/login");
  view.unmount();

  page.state.activeMenuKey = "oidc-oauth";
  view = render(<>{page.renderApplication()}</>);
  fireEvent.change(view.getByDisplayValue("portal-client"), {target: {value: "portal-client-updated"}});
  fireEvent.change(view.getByDisplayValue("https://example.test"), {target: {value: "https://portal.example.test"}});
  expect(page.state.application.clientId).toBe("portal-client-updated");
  expect(page.state.application.forcedRedirectOrigin).toBe("https://portal.example.test");
});

test("updates basic application fields and rejects reserved characters in the technical name", () => {
  const page = createPage({
    application: {
      title: "Portal title",
      homepageUrl: "https://example.test",
      description: "Initial description",
    },
  });

  const view = render(<>{page.renderApplication()}</>);
  fireEvent.change(view.getByDisplayValue("Portal title"), {target: {value: "Updated portal title"}});
  fireEvent.change(view.getByDisplayValue("https://example.test"), {target: {value: "https://portal.example.test"}});
  fireEvent.change(view.getByDisplayValue("Initial description"), {target: {value: "Updated description"}});
  fireEvent.change(view.getByDisplayValue("portal"), {target: {value: "portal/name"}});

  expect(page.state.application.title).toBe("Updated portal title");
  expect(page.state.application.homepageUrl).toBe("https://portal.example.test");
  expect(page.state.application.description).toBe("Updated description");
  expect(page.state.application.name).toBe("portal");
  expect(message.error).toHaveBeenCalledWith("Invalid characters in application name: / ? : @ # & % = + ;");
});

test("keeps basic, authentication and OAuth draft settings consistent after control changes", () => {
  const page = createPage({
    application: {
      category: "Default",
      type: "All",
      isShared: false,
      cookieExpireInHours: 720,
      enableSignUp: false,
      disableSignin: false,
      enableExclusiveSignin: false,
      enableSigninSession: true,
      enableAutoSignin: true,
      enableLinkWithEmail: false,
      clientId: "portal-client",
      organizationResolutionMode: "organization_bound",
      allowedOrganizationStatus: "PENDING_REVIEW",
      apiMappingRequired: false,
      clientSecret: "client-secret",
      grantTypes: ["authorization_code"],
      tokenFormat: "JWT",
      tokenSigningMethod: "RS256",
      tokenFields: ["email"],
      expireInHours: 1,
      refreshExpireInHours: 2,
    },
  });

  page.state.activeMenuKey = "basic";
  getFormControlByValue(page, "Default").props.onChange?.("Agent");
  expect(page.state.application.category).toBe("Agent");
  expect(page.state.application.type).toBe("MCP");
  getFormControlByValue(page, "Agent").props.onChange?.("Default");
  expect(page.state.application.type).toBe("All");
  getFormControlByValue(page, "Default").props.onChange?.("Agent");
  getFormControlByValue(page, "MCP").props.onChange?.("A2A");
  expect(page.state.application.type).toBe("A2A");
  getFormSwitches(page)[0].props.onChange?.(true);
  expect(page.state.application).toEqual(expect.objectContaining({
    isShared: true,
    organizationResolutionMode: "shared_application",
  }));

  page.state.activeMenuKey = "authentication";
  getFormControlByValue(page, 720).props.onChange?.(360);
  const authenticationSwitches = getFormSwitches(page);
  authenticationSwitches[3].props.onChange?.(false);
  expect(page.state.application).toEqual(expect.objectContaining({
    enableSigninSession: false,
    enableAutoSignin: false,
  }));
  getFormSwitches(page)[4].props.onChange?.(true);
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "Please enable \"Signin session\" first before enabling \"Auto signin\"");
  expect(page.state.application.cookieExpireInHours).toBe(360);

  page.state.activeMenuKey = "oidc-oauth";
  getFormControlByValue(page, "portal-client").props.onChange?.({target: {value: "portal-client-updated"}});
  getFormControlByValue(page, "shared_application").props.onChange?.("organization_bound");
  getFormControlByValue(page, "PENDING_REVIEW").props.onChange?.("CONFIRMED");
  getFormControlByValue(page, "client-secret").props.onChange?.({target: {value: "updated-secret"}});
  getFormControlByValue(page, "JWT").props.onChange?.("JWT-Custom");
  getFormControlByValue(page, "RS256").props.onChange?.("ES256");
  getFormControlByValue(page, 1).props.onChange?.(8);
  getFormControlByValue(page, 2).props.onChange?.(16);
  expect(page.state.application).toEqual(expect.objectContaining({
    clientId: "portal-client-updated",
    isShared: false,
    allowedOrganizationStatus: "CONFIRMED",
    clientSecret: "updated-secret",
    tokenFormat: "JWT-Custom",
    tokenSigningMethod: "ES256",
    expireInHours: 8,
    refreshExpireInHours: 16,
  }));
});

test("updates protocol and security drafts through their rendered controls", () => {
  const page = createPage({
    application: {
      enableSamlCompress: false,
      enableSamlC14n10: false,
      useEmailAsSamlNameId: false,
      enableSamlPostBinding: false,
      disableSamlAttributes: false,
      enableSamlAssertionSignature: false,
      samlHashAlgorithm: "SHA1",
      cert: "cert-main",
      clientCert: "cert-main",
      failedSigninLimit: 5,
      failedSigninFrozenTime: 15,
      codeResendTimeout: 60,
      ipWhitelist: "10.0.0.0/24",
      termsOfUse: "/terms.html",
      sslMode: "HTTP",
      sslCert: "cert-main",
    },
  });

  page.state.activeMenuKey = "saml";
  getFormSwitches(page).forEach(control => control.props.onChange?.(true));
  getFormControlByValue(page, "SHA1").props.onChange?.("SHA512");
  expect(applicationBackendMock.getSamlMetadata).toHaveBeenCalledWith("admin", "portal", true);
  expect(page.state.application).toEqual(expect.objectContaining({
    enableSamlCompress: true,
    enableSamlC14n10: true,
    useEmailAsSamlNameId: true,
    enableSamlPostBinding: true,
    disableSamlAttributes: true,
    enableSamlAssertionSignature: true,
    samlHashAlgorithm: "SHA512",
  }));

  page.state.activeMenuKey = "security";
  getFormControlByValue(page, "cert-main", 1).props.onChange?.("client-cert-next");
  getFormControlByValue(page, "cert-main").props.onChange?.("token-cert-next");
  getFormControlByValue(page, 5).props.onChange?.(10);
  getFormControlByValue(page, 15).props.onChange?.(20);
  getFormControlByValue(page, 60).props.onChange?.(30);
  getFormControlByValue(page, "10.0.0.0/24").props.onChange?.({target: {value: "10.0.0.0/16"}});
  getFormControlByValue(page, "/terms.html").props.onChange?.({target: {value: "/terms-v2.html"}});
  expect(page.state.application).toEqual(expect.objectContaining({
    failedSigninLimit: 10,
    failedSigninFrozenTime: 20,
    codeResendTimeout: 30,
    cert: "token-cert-next",
    clientCert: "client-cert-next",
    ipWhitelist: "10.0.0.0/16",
    termsOfUse: "/terms-v2.html",
  }));

  page.state.activeMenuKey = "reverse-proxy";
  getFormControlByValue(page, "HTTP").props.onChange?.("HTTPS Only");
  getFormControlByValue(page, "cert-main").props.onChange?.("cert-next");
  expect(page.state.application).toEqual(expect.objectContaining({
    sslMode: "HTTPS Only",
    sslCert: "cert-next",
  }));
});

test("preserves UI customization draft values across editable controls and previews", () => {
  const page = createPage({
    application: {
      orgChoiceMode: "None",
      signupHtml: "<section>Signup</section>",
      signinHtml: "<section>Signin</section>",
      formBackgroundUrl: "https://example.test/background.png",
      formBackgroundUrlMobile: "https://example.test/background-mobile.png",
      formCss: ".signin { color: black; }",
      formCssMobile: ".signin { color: white; }",
      formOffset: 2,
      formSideHtml: "<aside>Help</aside>",
      headerHtml: "<header>Portal</header>",
      footerHtml: "<footer>Support</footer>",
      themeData: {isEnabled: true, colorPrimary: "#123456"},
    },
  });

  page.state.activeMenuKey = "ui-customization";
  getFormControlByValue(page, "None").props.onChange?.("Select");
  getFormControlByValue(page, "<section>Signup</section>").props.onChange?.({target: {value: "<section>Join</section>"}});
  getFormControlByValue(page, "<section>Signin</section>").props.onChange?.({target: {value: "<section>Login</section>"}});
  getFormControlByValue(page, "https://example.test/background.png").props.onChange?.({target: {value: "https://example.test/updated-background.png"}});
  getFormControlByValue(page, "https://example.test/background-mobile.png").props.onChange?.({target: {value: "https://example.test/updated-mobile.png"}});
  getFormControlByValue(page, ".signin { color: black; }").props.onChange?.({target: {value: ".signin { color: blue; }"}});
  getFormControlByValue(page, ".signin { color: white; }").props.onChange?.({target: {value: ".signin { color: green; }"}});
  getFormControlByValue(page, 2).props.onChange?.({target: {value: 4}});
  getFormControlByValue(page, "<aside>Help</aside>").props.onChange?.({target: {value: "<aside>Docs</aside>"}});
  getFormControlByValue(page, "<header>Portal</header>").props.onChange?.({target: {value: "<header>AICodex</header>"}});
  getFormControlByValue(page, "<footer>Support</footer>").props.onChange?.({target: {value: "<footer>Contact</footer>"}});

  expect(page.state.application).toEqual(expect.objectContaining({
    orgChoiceMode: "Select",
    signupHtml: "<section>Join</section>",
    signinHtml: "<section>Login</section>",
    formBackgroundUrl: "https://example.test/updated-background.png",
    formBackgroundUrlMobile: "https://example.test/updated-mobile.png",
    formCss: ".signin { color: blue; }",
    formCssMobile: ".signin { color: green; }",
    formOffset: 4,
    formSideHtml: "<aside>Docs</aside>",
    headerHtml: "<header>AICodex</header>",
    footerHtml: "<footer>Contact</footer>",
  }));
});

test("updates embedded UI editors and configuration tables before saving the draft", () => {
  const page = createPage({
    application: {
      enableSignUp: true,
      signupHtml: "<section>Signup</section>",
      signinHtml: "<section>Signin</section>",
      formCss: ".signin { color: black; }",
      formCssMobile: ".signin { color: white; }",
      formOffset: 4,
      formSideHtml: "<aside>Help</aside>",
      headerHtml: "<header>Portal</header>",
      footerHtml: "<footer>Support</footer>",
    },
  });
  page.state.activeMenuKey = "ui-customization";

  const editorControls = findRenderedElements(page.renderApplicationForm(), element => {
    const props = element.props as {lang?: string; onChange?: (...args: any[]) => void};
    return typeof props.onChange === "function" && ["html", "css"].includes(props.lang || "");
  });
  const tableControls = findRenderedElements(page.renderApplicationForm(), element => typeof (element.props as {onUpdateTable?: unknown}).onUpdateTable === "function");

  (editorControls[0].props as {onChange: (value: string) => void}).onChange("<section>Join</section>");
  (editorControls[1].props as {onChange: (value: string) => void}).onChange("<section>Login</section>");
  (editorControls[2].props as {onChange: (value: string) => void}).onChange(".signin { color: blue; }");
  (editorControls[3].props as {onChange: (value: string) => void}).onChange(".signin { color: green; }");
  (editorControls[4].props as {onChange: (value: string) => void}).onChange("<aside>Docs</aside>");
  (editorControls[5].props as {onChange: (value: string) => void}).onChange("<header>AICodex</header>");
  (editorControls[6].props as {onChange: (value: string) => void}).onChange("<footer>Contact</footer>");
  (tableControls[0].props as {onUpdateTable: (value: unknown[]) => void}).onUpdateTable([{name: "Password", rule: "None"}]);
  (tableControls[1].props as {onUpdateTable: (value: unknown[]) => void}).onUpdateTable([{name: "Logo", visible: true}]);
  (tableControls[2].props as {onUpdateTable: (value: unknown[]) => void}).onUpdateTable([{name: "Email", visible: true}]);
  const resetButtons = findRenderedElements(page.renderApplicationForm(), element => {
    const props = element.props as {children?: React.ReactNode; onClick?: () => void};
    return typeof props.onClick === "function" && ["Reset to Default", "Reset to Empty"].includes(String(props.children));
  });
  resetButtons.forEach(button => (button.props as {onClick: () => void}).onClick());

  expect(page.state.application).toEqual(expect.objectContaining({
    signupHtml: "<section>Join</section>",
    signinHtml: "<section>Login</section>",
    formCss: ".signin { color: blue; }",
    formCssMobile: ".signin { color: green; }",
    formSideHtml: "<aside>Docs</aside>",
    headerHtml: "<header>AICodex</header>",
    footerHtml: Setting.getEmptyFooterContent(),
    signinMethods: [{name: "Password", rule: "None"}],
    signinItems: [{name: "Logo", visible: true}],
    signupItems: [{name: "Email", visible: true}],
  }));
});

test("updates remaining basic and authentication controls without losing draft consistency", () => {
  const page = createPage({
    application: {
      name: "portal",
      displayName: "Portal",
      category: "Agent",
      type: "MCP",
      organization: "engineering",
      tags: ["internal"],
      order: 1,
      enableSignUp: false,
      disableSignin: false,
      enableExclusiveSignin: false,
      enableSigninSession: true,
      enableAutoSignin: false,
      enableLinkWithEmail: false,
      forgetUrl: "https://example.test/forget",
      affiliationUrl: "https://example.test/affiliation",
    },
  });

  page.state.activeMenuKey = "basic";
  getFormControlByValue(page, "portal").props.onChange?.({target: {value: "portal-updated"}});
  getFormControlByValue(page, "Portal").props.onChange?.({target: {value: "Portal Updated"}});
  getFormControlByValue(page, "MCP").props.onChange?.("A2A");
  getFormControlByValue(page, "engineering").props.onChange?.("platform");
  getFormControlByValue(page, 1).props.onChange?.(8);
  getFormControlByValue(page, "horizontal").props.onChange?.({target: {value: "vertical"}});

  page.state.activeMenuKey = "authentication";
  const authenticationSwitches = getFormSwitches(page);
  authenticationSwitches[0].props.onChange?.(true);
  authenticationSwitches[1].props.onChange?.(true);
  authenticationSwitches[2].props.onChange?.(true);
  authenticationSwitches[4].props.onChange?.(true);
  authenticationSwitches[5].props.onChange?.(true);
  getFormControlByValue(page, "https://example.test/forget").props.onChange?.({target: {value: "https://example.test/reset"}});
  getFormControlByValue(page, "https://example.test/affiliation").props.onChange?.({target: {value: "https://example.test/profile"}});

  expect(page.state.application).toEqual(expect.objectContaining({
    name: "portal-updated",
    displayName: "Portal Updated",
    type: "A2A",
    organization: "platform",
    order: 8,
    enableSignUp: true,
    disableSignin: true,
    enableExclusiveSignin: true,
    enableAutoSignin: true,
    enableLinkWithEmail: true,
    forgetUrl: "https://example.test/reset",
    affiliationUrl: "https://example.test/profile",
  }));
  expect(page.state.menuMode).toBe("vertical");
});

test("handles upload validation, preview copies and return actions through visible controls", async() => {
  const page = createPage({application: {redirectUris: [], isShared: true}});
  page.handleUpload({file: {type: "application/json"}});
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "Please select a HTML file");

  resourceBackendMock.uploadResource.mockResolvedValueOnce({status: "error", msg: "Rejected"});
  page.handleUpload({file: {type: "text/html"}});
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "Failed to save: Rejected");

  const previewButtons = findRenderedElements(page.renderSignupSigninPreview(), element => typeof (element.props as {onClick?: unknown}).onClick === "function");
  previewButtons.forEach(button => (button.props as {onClick: () => void}).onClick());
  const promptButtons = findRenderedElements(page.renderPromptPreview(), element => typeof (element.props as {onClick?: unknown}).onClick === "function");
  promptButtons.forEach(button => (button.props as {onClick: () => void}).onClick());
  expect(copyMock).toHaveBeenCalledWith(expect.stringContaining("/signup/oauth/authorize"));
  expect(copyMock).toHaveBeenCalledWith(expect.stringContaining("/prompt/portal"));

  const confirmSpy = jest.spyOn(Modal, "confirm").mockImplementation((config: Parameters<typeof Modal.confirm>[0]) => {
    (config.onOk as (() => void) | undefined)?.();
    return {destroy: jest.fn(), update: jest.fn()} as ReturnType<typeof Modal.confirm>;
  });
  page.state.dirty = true;
  page.handleBack();
  page.handleCancel();
  expect(confirmSpy).toHaveBeenCalledTimes(2);
  expect(page.props.history.push).toHaveBeenCalledWith("/applications");
});

test("renders conditional configuration controls for agent OAuth, SAML and UI customization drafts", () => {
  const page = createPage({
    application: {
      category: "Agent",
      type: "MCP",
      scopes: [{name: "tools.read", displayName: "Tools read"}],
      tokenFormat: "JWT-Custom",
      tokenAttributes: [{name: "tenant", value: "organization"}],
      organizationResolutionMode: "shared_application",
      allowedOrganizations: ["engineering"],
      disableSamlAttributes: true,
      enableSamlCompress: true,
      enableSamlC14n10: true,
      useEmailAsSamlNameId: true,
      enableSamlAssertionSignature: true,
      enableSignUp: true,
      formOffset: 4,
      formSideHtml: "<aside>Support</aside>",
      themeData: {isEnabled: true, colorPrimary: "#123456"},
      headerHtml: "<header>Portal</header>",
      footerHtml: "<footer>Help</footer>",
    },
  });

  page.state.activeMenuKey = "oidc-oauth";
  let view = render(<>{page.renderApplication()}</>);
  expect(view.getByText("OIDC/OAuth settings")).not.toBeNull();
  expect(view.getAllByText("Scopes").length).toBeGreaterThan(0);
  expect(view.getAllByText("Token attributes").length).toBeGreaterThan(0);
  view.unmount();

  page.state.activeMenuKey = "saml";
  view = render(<>{page.renderApplication()}</>);
  expect(view.getByText("SAML settings")).not.toBeNull();
  expect(view.queryByText("SAML attributes")).toBeNull();
  view.unmount();

  page.state.activeMenuKey = "ui-customization";
  view = render(<>{page.renderApplication()}</>);
  expect(view.getByDisplayValue("<aside>Support</aside>")).not.toBeNull();
  expect(view.getByDisplayValue("<header>Portal</header>")).not.toBeNull();
  expect(view.getByDisplayValue("<footer>Help</footer>")).not.toBeNull();
  expect(view.getByTestId("theme-editor")).not.toBeNull();
});
