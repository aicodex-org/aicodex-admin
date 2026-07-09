/* eslint-env jest */

import React from "react";
import {cleanup, render} from "@testing-library/react";
import {expect, jest} from "@jest/globals";
import {Modal} from "antd";
import i18next from "i18next";
import "./i18n";
import ApplicationEditPage from "./ApplicationEditPage";
import * as ApplicationBackend from "./backend/ApplicationBackend";
import * as CertBackend from "./backend/CertBackend";
import * as OrganizationBackend from "./backend/OrganizationBackend";
import * as ProviderBackend from "./backend/ProviderBackend";
import * as Setting from "./Setting";
import en from "./locales/en/data.json";
import zh from "./locales/zh/data.json";

const {fireEvent} = require("@testing-library/react") as {fireEvent: {click: (element: Element) => boolean}};

type LooseMock = {
  (...args: unknown[]): unknown;
  mockClear: () => LooseMock;
  mockResolvedValue: (value: unknown) => LooseMock;
};

type ApplicationBackendMock = Record<"getApplication" | "updateApplication" | "deleteApplication" | "getSamlMetadata", LooseMock>;
type ProviderBackendMock = Record<"getProviders", LooseMock>;
type OrganizationBackendMock = Record<"getOrganizations", LooseMock>;
type CertBackendMock = Record<"getCerts", LooseMock>;

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

function createPage(options: {mode?: string; application?: Record<string, unknown>} = {}): PageHarness {
  const page = new ApplicationEditPage({
    match: {params: {organizationName: "engineering", applicationName: "portal"}},
    location: {mode: options.mode, search: ""},
    history: {push: jest.fn()},
    account: {owner: "engineering", name: "admin"},
  } as any) as unknown as PageHarness;

  page.state = {
    ...page.state,
    application: {
      ...baseApplication,
      ...options.application,
    },
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

beforeEach(async() => {
  await useTestLanguage("en");
  window.location.hash = "";
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: mockMatchMedia,
  });
  jest.spyOn(Setting, "isMobile").mockReturnValue(false);
  jest.spyOn(Setting, "showMessage").mockImplementation(() => {});
  jest.spyOn(Setting, "deepCopy").mockImplementation((value: unknown) => JSON.parse(JSON.stringify(value)));
  jest.spyOn(Setting, "myParseInt").mockImplementation((value: unknown) => Number.parseInt(String(value), 10));
  applicationBackendMock.getApplication.mockResolvedValue({status: "ok", data: {...baseApplication}});
  applicationBackendMock.updateApplication.mockResolvedValue({status: "ok"});
  applicationBackendMock.deleteApplication.mockResolvedValue({status: "ok"});
  applicationBackendMock.getSamlMetadata.mockResolvedValue("<xml />");
  providerBackendMock.getProviders.mockResolvedValue({status: "ok", data: [{name: "provider-main"}]});
  organizationBackendMock.getOrganizations.mockResolvedValue({status: "ok", data: [{name: "engineering"}]});
  certBackendMock.getCerts.mockResolvedValue({status: "ok", data: [{name: "cert-main"}]});
});

afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
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
