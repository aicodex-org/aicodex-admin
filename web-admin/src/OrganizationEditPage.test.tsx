import {afterEach, beforeEach, describe, expect, test, vi} from "vitest";
import React from "react";
import {act, cleanup, fireEvent, render} from "@testing-library/react";
import {Input, InputNumber, Modal, Select} from "antd";
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
  addOrganization: LooseMock;
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

vi.mock("./backend/OrganizationBackend", () => {
  return {
    addOrganization: vi.fn(),
    getOrganization: vi.fn(),
    updateOrganization: vi.fn(),
    deleteOrganization: vi.fn(),
  };
});

vi.mock("./backend/ApplicationBackend", () => {
  return {
    getApplicationsByOrganization: vi.fn(),
  };
});

vi.mock("./backend/LdapBackend", () => {
  return {
    getLdaps: vi.fn(),
  };
});

vi.mock("./backend/TransactionBackend", () => {
  return {
    getTransactions: vi.fn(),
  };
});

vi.mock("./table/LdapTable", () => ({default: function LdapTableMock(props: {title?: React.ReactNode; description?: React.ReactNode; onUpdateTable?: (value: unknown[]) => void}) {
  return (
    <div>
      {props.title}
      {props.description === undefined || props.description === null ? null : <span>{String(props.description)}</span>}
      <button type="button" data-testid="ldap-table" onClick={() => props.onUpdateTable?.([{id: "ldap-1"}])}>ldap-table</button>
    </div>
  );
}}));

vi.mock("./table/AccountTable", () => ({default: function AccountTableMock(props: {onUpdateTable?: (value: unknown[]) => void}) {
  return <button type="button" onClick={() => props.onUpdateTable?.([{name: "profile"}])}>account-table</button>;
}}));

vi.mock("./table/MfaTable", () => ({default: function MfaTableMock(props: {onUpdateTable?: (value: unknown[]) => void}) {
  return <button type="button" onClick={() => props.onUpdateTable?.([{name: "mfa"}])}>mfa-table</button>;
}}));

vi.mock("./table/TransactionTable", () => ({default: function TransactionTableMock(props: {transactions?: unknown[]}) {
  return <div data-testid="transaction-table">transactions:{props.transactions?.length ?? 0}</div>;
}}));

vi.mock("./common/NavItemTree", () => ({
  NavItemTree: function NavItemTreeMock(props: {onCheck?: (checked: string[], event: unknown) => void}) {
    return <button type="button" onClick={() => props.onCheck?.(["all"], {})}>nav-tree</button>;
  },
}));

vi.mock("./common/WidgetItemTree", () => ({
  buildWidgetItemTreeData: () => [
    {key: "all", children: [{key: "tour"}, {key: "ai-assistant"}]},
  ],
  WidgetItemTree: function WidgetItemTreeMock(props: {onCheck?: (checked: string[], event: unknown) => void}) {
    return <button type="button" onClick={() => props.onCheck?.(["all"], {})}>widget-tree</button>;
  },
}));

vi.mock("./common/theme/ThemeEditor", () => ({default: function ThemeEditorMock(props: {onThemeChange?: (previousTheme: unknown, nextTheme: Record<string, unknown>) => void}) {
  return <button type="button" onClick={() => props.onThemeChange?.({}, {primaryColor: "#ffffff"})}>theme-editor</button>;
}}));

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
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as unknown as MediaQueryList;
}

function createPageInstance(options: {mode?: string; organization?: Record<string, unknown>} = {}) {
  const draftOrganization = {
    ...baseOrganization,
    name: "built-in",
    hasPrivilegeConsent: false,
    passwordObfuscatorType: "AES",
    passwordObfuscatorKey: "old-key",
    themeData: {isEnabled: true},
    ...options.organization,
  };
  const page = new OrganizationEditPage({
    account: adminAccount,
    onChangeTheme: vi.fn(),
    history: {push: vi.fn()},
    location: options.mode === "add"
      ? {state: {mode: "add", organization: draftOrganization}}
      : {mode: options.mode},
    match: {params: {organizationName: "engineering"}},
  });
  page.setState = ((stateUpdate: unknown, callback?: () => void) => {
    const nextState = typeof stateUpdate === "function"
      ? (stateUpdate as (state: unknown, props: unknown) => unknown)(page.state, page.props)
      : stateUpdate;
    page.state = {...page.state, ...(nextState as Record<string, unknown>)};
    callback?.();
  }) as typeof page.setState;
  page.state = {
    ...page.state,
    organization: draftOrganization,
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

function getSecurityTabFieldControls(page: OrganizationEditPage): React.ReactElement[] {
  const tabChildren = React.Children.toArray((page.renderSecurityTab() as React.ReactElement).props.children);
  const passwordPolicyGrid = tabChildren[1] as React.ReactElement;
  return React.Children.toArray(passwordPolicyGrid.props.children).map((row) => {
    const rowChildren = React.Children.toArray((row as React.ReactElement).props.children);
    const controlWrapper = rowChildren[1] as React.ReactElement;
    return React.Children.toArray(controlWrapper.props.children)[0] as React.ReactElement;
  });
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
  organizationBackendMock.addOrganization.mockResolvedValue({status: "ok"});
  organizationBackendMock.deleteOrganization.mockResolvedValue({status: "ok"});
}

function renderPage(options: {
  mode?: string;
  organizationName?: string;
  accountOrganizationName?: string;
} = {}) {
  const history = {push: vi.fn()};
  const onChangeTheme = vi.fn();

  const view = render(
    <OrganizationEditPage
      account={{
        ...adminAccount,
        organization: {name: options.accountOrganizationName ?? "engineering"},
      }}
      onChangeTheme={onChangeTheme}
      history={history}
      location={options.mode === "add" ? {
        state: {
          mode: "add",
          organization: {
            ...baseOrganization,
            name: options.organizationName ?? "engineering",
          },
        },
      } : {}}
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
    window.location.hash = "";
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation((message?: unknown, ...args: unknown[]) => {
      throw new Error([message, ...args].map(item => `${item}`).join(" "));
    });
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: mockMatchMedia,
    });
    vi.spyOn(Setting, "showMessage").mockImplementation(() => {});
    vi.spyOn(Setting, "isMobile").mockReturnValue(false);
    vi.spyOn(Setting, "isAdminUser").mockReturnValue(true);
    vi.spyOn(Setting, "getThemeData").mockReturnValue({theme: "engineering"});
    vi.spyOn(Obfuscator, "checkPasswordObfuscator").mockReturnValue("");
    vi.spyOn(Obfuscator, "getRandomKeyForObfuscator").mockReturnValue("generated-key");
    setupBackend();
  });

  afterEach(() => {
    cleanup();
    consoleErrorSpy.mockRestore();
    vi.restoreAllMocks();
  });

  test("loads organization data from existing backends", async() => {
    const {view} = renderPage();

    expect(await view.findByDisplayValue("Engineering")).not.toBeNull();
    expect(organizationBackendMock.getOrganization).toHaveBeenCalledWith("admin", "engineering");
    expect(applicationBackendMock.getApplicationsByOrganization).toHaveBeenCalledWith("admin", "engineering");
    expect(ldapBackendMock.getLdaps).toHaveBeenCalledWith("engineering");
    expect(transactionBackendMock.getTransactions).toHaveBeenCalledWith("engineering");
  });

  test("renders edit section navigation and action bar from loaded state", () => {
    const page = createPageInstance({organization: {displayName: "Engineering"}});
    const view = render(<>{page.render()}</>);

    expect(view.getByText("Organization & Accounts / Organizations /")).not.toBeNull();
    expect(view.getByText("Basic")).not.toBeNull();
    expect(view.getByText("Brand")).not.toBeNull();
    expect(view.getByText("Login security")).not.toBeNull();
    expect(view.getByText("Navigation menu")).not.toBeNull();
    expect(view.getByText("Account profile")).not.toBeNull();
    expect(view.getByText("Multi-factor authentication")).not.toBeNull();
    expect(view.getByText("Directory services")).not.toBeNull();
    expect(Array.from(view.container.querySelectorAll(".organization-edit-action-bar button")).map(button => button.textContent)).toEqual([
      "Cancel",
      "Save",
      "Save and return",
    ]);
  });

  test("renders the directory services section after organization load", async() => {
    const {view} = renderPage();

    expect(await view.findByDisplayValue("Engineering")).not.toBeNull();
    fireEvent.click(view.getByText("Directory services"));
    expect((await view.findByTestId("ldap-table")).textContent).toBe("ldap-table");
  });

  test("renders organization transactions in edit mode", async() => {
    setupBackend({transactions: [{name: "transaction-1"}]});
    const {view} = renderPage();

    expect(await view.findByDisplayValue("Engineering")).not.toBeNull();
    fireEvent.click(view.getByText("Transactions"));
    expect((await view.findByTestId("transaction-table")).textContent).toBe("transactions:1");
  });

  test("publishes the organization display name for its workspace tab after loading and editing", async() => {
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");
    setupBackend({organization: {...baseOrganization, name: "dingding6091", displayName: "钉钉-自建"}});
    const page = createPageInstance();
    page.state.organizationName = "dingding6091";

    page.getOrganization();
    await flushPromises();

    const loadedEvent = dispatchSpy.mock.calls.at(-1)?.[0] as CustomEvent | undefined;
    expect(loadedEvent?.type).toBe("aicodex.admin.workspaceTabLabelUpdate");
    expect(loadedEvent?.detail).toEqual({
      path: "/organizations/dingding6091",
      label: "Edit Organization: 钉钉-自建",
    });

    page.updateOrganizationField("displayName", "钉钉-自建二号");

    const updatedEvent = dispatchSpy.mock.calls.at(-1)?.[0] as CustomEvent | undefined;
    expect(updatedEvent?.detail).toEqual({
      path: "/organizations/dingding6091",
      label: "Edit Organization: 钉钉-自建二号",
    });
  });

  test("reloads organization state when switching between organization edit tabs", async() => {
    organizationBackendMock.getOrganization.mockImplementation((_owner: unknown, organizationName: unknown) => Promise.resolve({
      status: "ok",
      data: {
        ...baseOrganization,
        name: organizationName,
        displayName: organizationName === "dingding6091" ? "钉钉-自建" : "飞书-自建",
      },
    }));
    applicationBackendMock.getApplicationsByOrganization.mockResolvedValue({status: "ok", data: []});
    ldapBackendMock.getLdaps.mockResolvedValue({status: "ok", data: []});
    transactionBackendMock.getTransactions.mockResolvedValue({status: "ok", data: []});
    const history = {push: vi.fn()};
    const onChangeTheme = vi.fn();
    const {findByDisplayValue, rerender} = render(
      <OrganizationEditPage
        account={{...adminAccount, organization: {name: "feishu6091"}}}
        onChangeTheme={onChangeTheme}
        history={history}
        location={{}}
        match={{params: {organizationName: "feishu6091"}}}
      />
    );

    expect(await findByDisplayValue("飞书-自建")).not.toBeNull();

    rerender(
      <OrganizationEditPage
        account={{...adminAccount, organization: {name: "dingding6091"}}}
        onChangeTheme={onChangeTheme}
        history={history}
        location={{}}
        match={{params: {organizationName: "dingding6091"}}}
      />
    );
    await flushPromises();

    expect(await findByDisplayValue("钉钉-自建")).not.toBeNull();
    expect(organizationBackendMock.getOrganization).toHaveBeenCalledWith("admin", "dingding6091");
    expect(applicationBackendMock.getApplicationsByOrganization).toHaveBeenCalledWith("admin", "dingding6091");
    expect(ldapBackendMock.getLdaps).toHaveBeenCalledWith("dingding6091");
    expect(transactionBackendMock.getTransactions).toHaveBeenCalledWith("dingding6091");
  });

  test("scopes organization edit layout so long password labels can be styled locally", async() => {
    const {view} = renderPage();

    expect(await view.findByDisplayValue("Engineering")).not.toBeNull();
    expect(view.container.querySelector(".organization-edit-page")).not.toBeNull();
    expect(view.container.querySelector(".organization-edit-card")).not.toBeNull();
    expect(view.container.querySelector(".organization-edit-page > .organization-edit-card")).not.toBeNull();
    expect(view.container.querySelector(".organization-edit-shell")).not.toBeNull();
    expect(view.container.querySelector(".organization-edit-tabs")).not.toBeNull();
    expect(view.container.querySelector(".organization-edit-scroll-content")).not.toBeNull();
    expect(view.container.querySelector(".organization-edit-action-bar")).not.toBeNull();

    fireEvent.click(view.getByText("Login security"));
    expect(view.getByText(/Password salt/).closest(".organization-edit-page")).not.toBeNull();
    expect(view.getByText(/Password complexity options/).closest(".organization-edit-page")).not.toBeNull();
  });

  test("keeps immediate LDAP resource updates out of organization dirty state", async() => {
    const {view} = renderPage();

    expect(await view.findByDisplayValue("Engineering")).not.toBeNull();
    fireEvent.click(view.getByText("Directory services"));
    expect(view.getByText("LDAP servers are independent resources. Add, edit, and delete actions take effect immediately. User sync runs on the sync page and is not controlled by the footer Save or Cancel buttons.")).not.toBeNull();

    fireEvent.click(await view.findByTestId("ldap-table"));

    expect(view.queryByText("Unsaved changes")).toBeNull();
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
    expect(view.queryByText("Transactions")).toBeNull();
  });

  test("keeps editable field handlers wired to organization state updates", () => {
    const page = createPageInstance();

    [
      page.renderBasicTab(),
      page.renderBrandTab(),
      page.renderSecurityTab(),
      page.renderNavigationTab(),
      page.renderAccountFieldsTab(),
      page.renderMfaTab(),
      page.renderDirectoryTab(),
    ].forEach(tabContent => {
      visitReactNode(tabContent, (element) => {
        invokeEditableHandler(element.props as ElementProps);
      });
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

  test("keeps MFA section title aligned with the shared tab content edge", () => {
    const page = createPageInstance();
    const mfaTab = page.renderMfaTab() as React.ReactElement;
    const children = React.Children.toArray(mfaTab.props.children) as React.ReactElement[];

    expect(children[0].props.className).toBe("organization-edit-section-title");
    expect(children[1].props.className).toBe("organization-edit-tab-panel-narrow");
  });

  test("uses clear basic tab empty states and read-only balance affordance", () => {
    const page = createPageInstance({organization: {defaultApplication: undefined, userBalance: 12}});
    page.state = {
      ...page.state,
      applications: [],
    };
    const basicTab = page.renderBasicTab();
    const matchingElements: React.ReactElement[] = [];

    visitReactNode(basicTab, (element) => {
      const props = element.props as ElementProps & {
        className?: string;
        disabled?: boolean;
        notFoundContent?: React.ReactNode;
        placeholder?: React.ReactNode;
        title?: React.ReactNode;
      };
      if (
        props.placeholder === "No default applications" ||
        props.title === "This organization has no available applications. Create an application before selecting a default application here." ||
        props.title === "User balance is calculated from user accounts and cannot be edited on the organization page." ||
        props.className === "organization-edit-control-tooltip-wrapper" ||
        props.className === "organization-edit-disabled-field-help" ||
        props.className === "organization-edit-number-input organization-edit-number-input-right"
      ) {
        matchingElements.push(element);
      }
    });

    const defaultApplicationSelect = matchingElements.find(element => {
      const props = element.props as ElementProps & {placeholder?: React.ReactNode};
      return props.placeholder === "No default applications";
    });
    expect(defaultApplicationSelect?.props.disabled).toBe(true);
    expect(defaultApplicationSelect?.props.notFoundContent).toBe("No default applications");

    const defaultApplicationTooltip = matchingElements.find(element => {
      const props = element.props as {title?: React.ReactNode};
      return props.title === "This organization has no available applications. Create an application before selecting a default application here.";
    });
    expect(defaultApplicationTooltip).toBeDefined();

    const defaultApplicationWrapper = matchingElements.find(element => {
      const props = element.props as {className?: string; children?: React.ReactNode};
      return props.className === "organization-edit-control-tooltip-wrapper" && React.isValidElement(props.children) && props.children.type === Select;
    });
    expect(defaultApplicationWrapper).toBeDefined();

    const userBalanceTooltip = matchingElements.find(element => {
      const props = element.props as {title?: React.ReactNode};
      return props.title === "User balance is calculated from user accounts and cannot be edited on the organization page.";
    });
    expect(userBalanceTooltip).toBeDefined();

    const userBalanceWrapper = matchingElements.find(element => {
      const props = element.props as {className?: string; children?: React.ReactNode};
      return props.className === "organization-edit-disabled-field-help" && React.isValidElement(props.children) && props.children.type === InputNumber;
    });
    expect(userBalanceWrapper).toBeDefined();
    expect((userBalanceWrapper!.props.children as React.ReactElement).props.className).toBe("organization-edit-number-input organization-edit-number-input-right");
    expect((userBalanceWrapper!.props.children as React.ReactElement).props.disabled).toBe(true);
  });

  test("uses security-appropriate controls and help text on the login security tab", () => {
    const page = createPageInstance();
    const controls = getSecurityTabFieldControls(page);

    expect(controls[1].type).toBe(Input.Password);
    expect(controls[4].type).toBe(Input.Password);
    expect(controls[6].type).toBe(Input.Password);
    expect(controls[7].type).toBe(Input.Password);
    expect(controls[8].type).toBe(Input.Password);
    expect(controls[9].type).toBe(Input.TextArea);
    expect(controls[5].props.placeholder).toBe("0 means passwords never expire.");
    expect(controls[9].props.placeholder).toBe("Example: 192.168.1.10, 10.0.0.0/24");

    expect(i18next.t("organization:Password expire days - Tooltip")).toContain("0 means passwords never expire");
    expect(i18next.t("general:IP whitelist - Tooltip")).toContain("CIDR");
    expect(i18next.t("organization:Soft deletion - Tooltip")).toContain("not permanently removed");
    expect(i18next.t("application:Disable signin - Tooltip")).toContain("prevents all users");
    expect(i18next.t("general:Password obfuscator - Tooltip")).toContain("not the password hash storage");
  });

  test("renders brand asset previews with default, empty, and failure states", async() => {
    setupBackend({
      organization: {
        ...baseOrganization,
        logo: "",
        favicon: "",
        defaultAvatar: "",
        themeData: {isEnabled: false},
      },
    });

    const {view} = renderPage();

    expect(await view.findByDisplayValue("Engineering")).not.toBeNull();
    fireEvent.click(view.getByText("Brand"));

    expect(view.getByText("Using default")).not.toBeNull();
    expect(view.getAllByText("Not configured").length).toBeGreaterThanOrEqual(2);
    expect(view.getByLabelText("View logo")).not.toBeNull();
    expect(view.getAllByText("View").length).toBeGreaterThanOrEqual(1);

    fireEvent.error(view.getByAltText("Logo preview"));
    expect(view.getByText("Preview failed")).not.toBeNull();
  });

  test("shows theme summaries for global and custom brand theme modes", async() => {
    setupBackend({
      organization: {
        ...baseOrganization,
        themeData: {isEnabled: false},
      },
    });

    const {view} = renderPage();

    expect(await view.findByDisplayValue("Engineering")).not.toBeNull();
    fireEvent.click(view.getByText("Brand"));
    expect(view.getByText("Following global theme settings.")).not.toBeNull();

    fireEvent.click(view.getByText("Customize theme"));
    expect(view.getByText("This organization uses custom theme settings.")).not.toBeNull();
    expect(view.getByText("theme-editor")).not.toBeNull();
  });

  test("restores the active tab from hash and writes hash on tab changes", async() => {
    window.location.hash = "#security";

    const {view} = renderPage();

    expect(await view.findByText("Password policy")).not.toBeNull();
    fireEvent.click(view.getByText("Brand"));

    expect(window.location.hash).toBe("#brand");
    expect(await view.findByText("Brand assets")).not.toBeNull();
  });

  test("blocks save and returns to the basic tab when required organization fields are empty", async() => {
    const {view} = renderPage();

    fireEvent.change(await view.findByDisplayValue("engineering"), {target: {value: " "}});
    fireEvent.change(view.getByDisplayValue("Engineering"), {target: {value: " "}});
    fireEvent.click(view.getByText("Save"));

    expect(organizationBackendMock.updateOrganization).not.toHaveBeenCalled();
    expect(window.location.hash).toBe("#basic");
    expect(view.getAllByText("This field is required").length).toBeGreaterThanOrEqual(2);
    expect(Setting.showMessage).toHaveBeenCalledWith("error", "Name: This field is required");
  });

  test("switches to login security tab when password obfuscator validation fails", async() => {
    vi.spyOn(Obfuscator, "checkPasswordObfuscator").mockReturnValueOnce("Invalid obfuscator key");
    const {view} = renderPage();

    expect(await view.findByDisplayValue("Engineering")).not.toBeNull();
    fireEvent.click(view.getByText("Save"));

    expect(organizationBackendMock.updateOrganization).not.toHaveBeenCalled();
    expect(window.location.hash).toBe("#security");
    expect(view.getByText("Password policy")).not.toBeNull();
    expect(Setting.showMessage).toHaveBeenCalledWith("error", "Invalid obfuscator key");
  });

  test("asks for confirmation before leaving dirty edit pages", async() => {
    const confirmSpy = vi.spyOn(Modal, "confirm").mockImplementation((config: Parameters<typeof Modal.confirm>[0]) => {
      (config.onOk as (() => void) | undefined)?.();
      return {destroy: vi.fn(), update: vi.fn()} as ReturnType<typeof Modal.confirm>;
    });
    const {history, view} = renderPage();

    fireEvent.change(await view.findByDisplayValue("Engineering"), {target: {value: "Changed Engineering"}});
    fireEvent.click(view.getByText("Back"));

    expect(confirmSpy).toHaveBeenCalledWith(expect.objectContaining({
      title: "Unsaved changes",
      content: "Current organization settings have unsaved changes. Leave without saving?",
      okText: "OK",
      cancelText: "Cancel",
      onOk: expect.any(Function),
    }));
    expect(history.push).toHaveBeenCalledWith("/organizations");
  });

  test("saves organization, refreshes current theme, dispatches storage event, and navigates", async() => {
    const eventSpy = vi.spyOn(window, "dispatchEvent");
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

  test("keeps an edited organization draft name when add is rejected", async() => {
    organizationBackendMock.addOrganization.mockResolvedValueOnce({status: "error", msg: "duplicate"});
    const page = renderPage({mode: "add"});

    const nameInput = await page.view.findByDisplayValue("engineering");
    fireEvent.change(nameInput, {target: {value: "custom-draft"}});
    fireEvent.click(page.view.getAllByText("Save")[0]);
    await flushPromises();

    expect(page.view.getByDisplayValue("custom-draft")).not.toBeNull();
  });

  test("guards duplicate organization submits and updates after the first add", async() => {
    const page = createPageInstance({mode: "add", organization: {name: "custom-draft", displayName: "Custom Draft"}});
    page.state = {...page.state, submitting: false};

    page.submitOrganizationEdit(false);
    page.submitOrganizationEdit(false);
    expect(organizationBackendMock.addOrganization).toHaveBeenCalledTimes(1);
    await flushPromises();
    expect(page.state.mode).toBe("edit");

    page.submitOrganizationEdit(false);
    await flushPromises();
    expect(organizationBackendMock.addOrganization).toHaveBeenCalledTimes(1);
    expect(organizationBackendMock.updateOrganization).toHaveBeenCalledTimes(1);
  });

  test("cancel in add mode leaves without mutating the draft organization", async() => {
    const eventSpy = vi.spyOn(window, "dispatchEvent");
    const page = renderPage({mode: "add"});

    expect(await page.view.findByDisplayValue("Engineering")).not.toBeNull();
    fireEvent.click(page.view.getAllByText("Cancel")[0]);
    await flushPromises();
    expect(organizationBackendMock.addOrganization).not.toHaveBeenCalled();
    expect(organizationBackendMock.updateOrganization).not.toHaveBeenCalled();
    expect(organizationBackendMock.deleteOrganization).not.toHaveBeenCalled();
    expect(page.history.push).toHaveBeenCalledWith("/organizations");
    expect(eventSpy).not.toHaveBeenCalledWith(expect.objectContaining({type: "storageOrganizationsChanged"}));
  });
});
