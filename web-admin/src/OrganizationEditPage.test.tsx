/* eslint-env jest */
import React from "react";
import {act, cleanup, fireEvent, render} from "@testing-library/react";
import {expect, jest} from "@jest/globals";
import i18next from "i18next";
import OrganizationEditPage from "./OrganizationEditPage";
import * as OrganizationBackend from "./backend/OrganizationBackend";
import * as ApplicationBackend from "./backend/ApplicationBackend";
import * as LdapBackend from "./backend/LdapBackend";
import * as TransactionBackend from "./backend/TransactionBackend";
import * as Obfuscator from "./auth/Obfuscator";
import * as Setting from "./Setting";
import en from "./locales/en/data.json";
import zh from "./locales/zh/data.json";

type LooseMock = {
  (...args: unknown[]): unknown;
  mockClear: () => LooseMock;
  mockResolvedValue: (value: unknown) => LooseMock;
  mockResolvedValueOnce: (value: unknown) => LooseMock;
};

type OrganizationBackendMock = {
  getOrganization: LooseMock;
  updateOrganization: LooseMock;
  deleteOrganization: LooseMock;
};

type ApplicationBackendMock = {
  getApplicationsByOrganization: LooseMock;
};

type LdapBackendMock = {
  getLdaps: LooseMock;
};

type TransactionBackendMock = {
  getTransactions: LooseMock;
};

type ElementHandler = (...args: unknown[]) => void;

interface ElementProps {
  children?: React.ReactNode;
  onChange?: ElementHandler;
  onCheck?: ElementHandler;
  onUpdateTable?: ElementHandler;
  onThemeChange?: ElementHandler;
  onConfirm?: ElementHandler;
  checked?: boolean;
  value?: unknown;
  mode?: string;
  buttonStyle?: string;
  addonAfter?: string;
  precision?: number;
  options?: unknown;
}

jest.mock("./backend/OrganizationBackend", () => {
  const {jest: factoryJest} = require("@jest/globals");
  return {
    getOrganization: factoryJest.fn(),
    updateOrganization: factoryJest.fn(),
    deleteOrganization: factoryJest.fn(),
  };
});

jest.mock("./backend/ApplicationBackend", () => {
  const {jest: factoryJest} = require("@jest/globals");
  return {
    getApplicationsByOrganization: factoryJest.fn(),
  };
});

jest.mock("./backend/LdapBackend", () => {
  const {jest: factoryJest} = require("@jest/globals");
  return {
    getLdaps: factoryJest.fn(),
  };
});

jest.mock("./backend/TransactionBackend", () => {
  const {jest: factoryJest} = require("@jest/globals");
  return {
    getTransactions: factoryJest.fn(),
  };
});

jest.mock("./table/LdapTable", () => function LdapTableMock() {
  return <div data-testid="ldap-table">ldap-table</div>;
});

jest.mock("./table/AccountTable", () => function AccountTableMock(props: {onUpdateTable?: (value: unknown[]) => void}) {
  return <button type="button" onClick={() => props.onUpdateTable?.([{name: "profile"}])}>account-table</button>;
});

jest.mock("./table/MfaTable", () => function MfaTableMock(props: {onUpdateTable?: (value: unknown[]) => void}) {
  return <button type="button" onClick={() => props.onUpdateTable?.([{name: "mfa"}])}>mfa-table</button>;
});

jest.mock("./table/TransactionTable", () => function TransactionTableMock(props: {transactions?: unknown[]}) {
  return <div data-testid="transaction-table">transactions:{props.transactions?.length ?? 0}</div>;
});

jest.mock("./common/NavItemTree", () => ({
  NavItemTree: function NavItemTreeMock(props: {onCheck?: (checked: string[], event: unknown) => void}) {
    return <button type="button" onClick={() => props.onCheck?.(["all"], {})}>nav-tree</button>;
  },
}));

jest.mock("./common/WidgetItemTree", () => ({
  WidgetItemTree: function WidgetItemTreeMock(props: {onCheck?: (checked: string[], event: unknown) => void}) {
    return <button type="button" onClick={() => props.onCheck?.(["all"], {})}>widget-tree</button>;
  },
}));

jest.mock("./common/theme/ThemeEditor", () => function ThemeEditorMock(props: {onThemeChange?: (previousTheme: unknown, nextTheme: Record<string, unknown>) => void}) {
  return <button type="button" onClick={() => props.onThemeChange?.({}, {primaryColor: "#ffffff"})}>theme-editor</button>;
});

const organizationBackendMock = OrganizationBackend as unknown as OrganizationBackendMock;
const applicationBackendMock = ApplicationBackend as unknown as ApplicationBackendMock;
const ldapBackendMock = LdapBackend as unknown as LdapBackendMock;
const transactionBackendMock = TransactionBackend as unknown as TransactionBackendMock;
let consoleErrorSpy: {mockRestore: () => void};

const adminAccount = {
  owner: "admin",
  name: "admin",
  organization: {
    name: "engineering",
  },
};

const baseOrganization = {
  owner: "admin",
  name: "engineering",
  displayName: "Engineering",
  logo: "",
  logoDark: "dark-logo.png",
  favicon: "",
  websiteUrl: "https://engineering.example.invalid",
  passwordType: "plain",
  passwordSalt: "",
  passwordOptions: [],
  passwordObfuscatorType: "Plain",
  passwordObfuscatorKey: "",
  countryCodes: [],
  languages: [],
  defaultAvatar: "",
  defaultApplication: "app-main",
  userTypes: ["employee"],
  tags: ["core"],
  accountItems: [{name: "profile"}],
  mfaItems: [],
  themeData: {isEnabled: false},
  ldapAttributes: [],
  navItems: ["all"],
  userNavItems: [],
  widgetItems: ["all"],
};

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

function createPageInstance(options: {mode?: string; organization?: Record<string, unknown>} = {}) {
  const page = new OrganizationEditPage({
    account: adminAccount,
    onChangeTheme: jest.fn(),
    history: {push: jest.fn()},
    location: {mode: options.mode},
    match: {params: {organizationName: "engineering"}},
  });
  page.setState = ((stateUpdate: unknown) => {
    const nextState = typeof stateUpdate === "function"
      ? (stateUpdate as (state: unknown, props: unknown) => unknown)(page.state, page.props)
      : stateUpdate;
    page.state = {...page.state, ...(nextState as Record<string, unknown>)};
  }) as typeof page.setState;
  page.state = {
    ...page.state,
    organization: {
      ...baseOrganization,
      name: "built-in",
      hasPrivilegeConsent: false,
      passwordObfuscatorType: "AES",
      passwordObfuscatorKey: "old-key",
      themeData: {isEnabled: true},
      ...options.organization,
    },
    applications: [{name: "app-main"}],
    ldaps: [],
    transactions: [],
  };
  return page;
}

function visitReactNode(node: React.ReactNode, visitor: (element: React.ReactElement) => void): void {
  if (Array.isArray(node)) {
    node.forEach(child => visitReactNode(child, visitor));
    return;
  }

  if (!React.isValidElement(node)) {
    return;
  }

  visitor(node);
  const props = node.props as ElementProps;
  visitReactNode(props.children, visitor);
}

function invokeEditableHandler(props: ElementProps): void {
  if (props.onConfirm !== undefined) {
    props.onConfirm();
  }

  if (props.onUpdateTable !== undefined) {
    props.onUpdateTable([{name: "updated-table-item"}]);
  }

  if (props.onThemeChange !== undefined) {
    props.onThemeChange({}, {primaryColor: "#111111"});
  }

  if (props.onCheck !== undefined) {
    props.onCheck(["all"], {});
  }

  if (props.onChange === undefined) {
    return;
  }

  if (props.checked !== undefined) {
    props.onChange(!props.checked);
    return;
  }

  if (props.buttonStyle === "solid") {
    props.onChange({target: {value: true}});
    return;
  }

  if (props.mode === "multiple" || props.mode === "tags") {
    props.onChange(["updated"]);
    return;
  }

  if (props.children !== undefined && typeof props.value === "string") {
    props.onChange("updated");
    return;
  }

  if (props.options !== undefined) {
    props.onChange("updated");
    return;
  }

  if (props.addonAfter !== undefined || props.precision !== undefined || typeof props.value === "number") {
    props.onChange(7);
    return;
  }

  props.onChange({target: {value: "updated"}});
}

function setupBackend(overrides: {
  organization?: unknown;
  organizationResponse?: unknown;
  transactions?: unknown[];
} = {}) {
  organizationBackendMock.getOrganization.mockResolvedValue(overrides.organizationResponse ?? {
    status: "ok",
    data: overrides.organization ?? {...baseOrganization},
  });
  applicationBackendMock.getApplicationsByOrganization.mockResolvedValue({
    status: "ok",
    data: [{name: "app-main"}],
  });
  ldapBackendMock.getLdaps.mockResolvedValue({
    status: "ok",
    data: [],
  });
  transactionBackendMock.getTransactions.mockResolvedValue({
    status: "ok",
    data: overrides.transactions ?? [],
  });
  organizationBackendMock.updateOrganization.mockResolvedValue({status: "ok"});
  organizationBackendMock.deleteOrganization.mockResolvedValue({status: "ok"});
}

function renderPage(options: {
  mode?: string;
  organizationName?: string;
  accountOrganizationName?: string;
} = {}) {
  const history = {push: jest.fn()};
  const onChangeTheme = jest.fn();

  const view = render(
    <OrganizationEditPage
      account={{
        ...adminAccount,
        organization: {name: options.accountOrganizationName ?? "engineering"},
      }}
      onChangeTheme={onChangeTheme}
      history={history}
      location={{mode: options.mode}}
      match={{params: {organizationName: options.organizationName ?? "engineering"}}}
    />
  );

  return {history, onChangeTheme, view};
}

async function flushPromises() {
  await act(async() => {
    await Promise.resolve();
  });
}

describe("OrganizationEditPage", () => {
  beforeEach(async() => {
    await useTestLanguage("en");
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation((message?: unknown, ...args: unknown[]) => {
      if (`${message}`.includes("ReactDOM.render is no longer supported")) {
        return;
      }

      throw new Error([message, ...args].map(item => `${item}`).join(" "));
    });
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: mockMatchMedia,
    });
    jest.spyOn(Setting, "showMessage").mockImplementation(() => {});
    jest.spyOn(Setting, "isMobile").mockReturnValue(false);
    jest.spyOn(Setting, "isAdminUser").mockReturnValue(true);
    jest.spyOn(Setting, "getThemeData").mockReturnValue({theme: "engineering"});
    jest.spyOn(Obfuscator, "checkPasswordObfuscator").mockReturnValue("");
    jest.spyOn(Obfuscator, "getRandomKeyForObfuscator").mockReturnValue("generated-key");
    setupBackend();
  });

  afterEach(() => {
    cleanup();
    consoleErrorSpy.mockRestore();
    jest.restoreAllMocks();
  });

  test("loads organization data and renders edit sections with transactions in edit mode", async() => {
    setupBackend({transactions: [{name: "transaction-1"}]});

    const {view} = renderPage();

    expect(await view.findByDisplayValue("Engineering")).not.toBeNull();
    expect(view.getByTestId("ldap-table").textContent).toBe("ldap-table");
    expect(view.getByTestId("transaction-table").textContent).toBe("transactions:1");
    expect(organizationBackendMock.getOrganization).toHaveBeenCalledWith("admin", "engineering");
    expect(applicationBackendMock.getApplicationsByOrganization).toHaveBeenCalledWith("admin", "engineering");
    expect(ldapBackendMock.getLdaps).toHaveBeenCalledWith("engineering");
    expect(transactionBackendMock.getTransactions).toHaveBeenCalledWith("engineering");
  });

  test("scopes organization edit layout so long password labels can be styled locally", async() => {
    const {view} = renderPage();

    expect(await view.findByDisplayValue("Engineering")).not.toBeNull();
    expect(view.container.querySelector(".organization-edit-page")).not.toBeNull();
    expect(view.container.querySelector(".organization-edit-card")).not.toBeNull();
    expect(view.getByText(/Password salt/).closest(".organization-edit-page")).not.toBeNull();
    expect(view.getByText(/Password complexity options/).closest(".organization-edit-page")).not.toBeNull();
  });

  test("redirects to 404 when organization is missing and shows backend load errors", async() => {
    organizationBackendMock.getOrganization.mockResolvedValueOnce({status: "ok", data: null});

    const {history} = renderPage({organizationName: "missing-org"});
    await flushPromises();
    expect(history.push).toHaveBeenCalledWith("/404");

    cleanup();
    setupBackend({
      organizationResponse: {status: "error", msg: "load failed"},
    });
    renderPage();
    await flushPromises();
    expect(Setting.showMessage).toHaveBeenCalledWith("error", "load failed");
  });

  test("hides transactions in add mode even when transaction data exists", async() => {
    setupBackend({transactions: [{name: "transaction-1"}]});

    const {view} = renderPage({mode: "add"});

    expect(await view.findByDisplayValue("Engineering")).not.toBeNull();
    expect(view.queryByTestId("transaction-table")).toBeNull();
  });

  test("keeps editable field handlers wired to organization state updates", () => {
    const page = createPageInstance();

    visitReactNode(page.renderOrganization(), (element) => {
      invokeEditableHandler(element.props as ElementProps);
    });

    expect(page.state.organization.displayName).toBe("updated");
    expect(page.state.organization.logo).toBe("updated");
    expect(page.state.organization.passwordObfuscatorType).toBe("updated");
    expect(page.state.organization.passwordObfuscatorKey).toBe("updated");
    expect(page.state.organization.countryCodes).toEqual(["updated"]);
    expect(page.state.organization.languages).toEqual(["updated"]);
    expect(page.state.organization.navItems).toEqual(["all"]);
    expect(page.state.organization.widgetItems).toEqual(["all"]);
    expect(page.state.organization.accountItems).toEqual([{name: "updated-table-item"}]);
    expect(page.state.organization.mfaItems).toEqual([{name: "updated-table-item"}]);
    expect(page.state.organization.themeData).toMatchObject({isEnabled: true, primaryColor: "#111111"});
    expect(page.state.ldaps).toEqual([{name: "updated-table-item"}]);
  });

  test("saves organization, refreshes current theme, dispatches storage event, and navigates", async() => {
    const eventSpy = jest.spyOn(window, "dispatchEvent");
    const {history, onChangeTheme, view} = renderPage();

    expect(await view.findByDisplayValue("Engineering")).not.toBeNull();
    fireEvent.click(view.getAllByText("Save")[0]);
    await flushPromises();

    expect(organizationBackendMock.updateOrganization).toHaveBeenCalledWith("admin", "engineering", expect.objectContaining({
      name: "engineering",
      accountItems: [{name: "profile"}],
    }));
    expect(onChangeTheme).toHaveBeenCalledWith({theme: "engineering"});
    expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({type: "storageOrganizationsChanged"}));
    expect(history.push).toHaveBeenCalledWith("/organizations/engineering");
    expect(Setting.showMessage).toHaveBeenCalledWith("success", "Successfully saved");
  });

  test("restores original organization name when save fails", async() => {
    organizationBackendMock.updateOrganization.mockResolvedValueOnce({status: "error", msg: "duplicate"});
    const {view} = renderPage();

    const nameInput = await view.findByDisplayValue("engineering");
    fireEvent.change(nameInput, {target: {value: "renamed"}});
    fireEvent.click(view.getAllByText("Save")[0]);
    await flushPromises();

    expect(organizationBackendMock.updateOrganization).toHaveBeenCalledWith("admin", "engineering", expect.objectContaining({
      name: "renamed",
    }));
    expect(Setting.showMessage).toHaveBeenCalledWith("error", "Failed to save: duplicate");
    expect(view.getByDisplayValue("engineering")).not.toBeNull();
  });

  test("cancel in add mode deletes draft organization and reports delete failures", async() => {
    const eventSpy = jest.spyOn(window, "dispatchEvent");
    const success = renderPage({mode: "add"});

    expect(await success.view.findByDisplayValue("Engineering")).not.toBeNull();
    fireEvent.click(success.view.getAllByText("Cancel")[0]);
    await flushPromises();
    expect(organizationBackendMock.deleteOrganization).toHaveBeenCalledWith(expect.objectContaining({name: "engineering"}));
    expect(success.history.push).toHaveBeenCalledWith("/organizations");
    expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({type: "storageOrganizationsChanged"}));

    cleanup();
    setupBackend();
    organizationBackendMock.deleteOrganization.mockResolvedValueOnce({status: "error", msg: "delete failed"});
    const failure = renderPage({mode: "add"});
    expect(await failure.view.findByDisplayValue("Engineering")).not.toBeNull();
    fireEvent.click(failure.view.getAllByText("Cancel")[0]);
    await flushPromises();
    expect(Setting.showMessage).toHaveBeenCalledWith("error", "Failed to delete: delete failed");
  });
});
