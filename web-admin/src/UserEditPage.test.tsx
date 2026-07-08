/* eslint-env jest */

import React from "react";
import {expect as jestExpect, jest as jestValue} from "@jest/globals";
import {Modal} from "antd";
import {render} from "@testing-library/react";
import {UserEditPage} from "./UserEditPage";
import * as Setting from "./Setting";
import * as UserBackend from "./backend/UserBackend";
import * as GroupBackend from "./backend/GroupBackend";
import * as OrganizationBackend from "./backend/OrganizationBackend";
import * as ApplicationBackend from "./backend/ApplicationBackend";
import * as AuthBackend from "./auth/AuthBackend";
import * as MfaBackend from "./backend/MfaBackend";
import * as TransactionBackend from "./backend/TransactionBackend";

declare const jest: typeof jestValue;

type LooseMock = {
  (...args: unknown[]): unknown;
  mockResolvedValue: (value: unknown) => LooseMock;
  mockResolvedValueOnce: (value: unknown) => LooseMock;
  mockRejectedValueOnce: (value: unknown) => LooseMock;
};

type UserBackendMock = Record<"getUser" | "updateUser" | "deleteUser" | "verifyIdentification", LooseMock>;
type GroupBackendMock = Record<"getGroups", LooseMock>;
type OrganizationBackendMock = Record<"getOrganizations" | "getOrganization", LooseMock>;
type ApplicationBackendMock = Record<"getApplicationsByOrganization" | "getUserApplication", LooseMock>;
type AuthBackendMock = Record<"getAccount", LooseMock>;
type MfaBackendMock = Record<"DeleteMfa" | "SetPreferredMfa", LooseMock>;
type TransactionBackendMock = Record<"getTransactions", LooseMock>;

type PageProps = ConstructorParameters<typeof UserEditPage>[0];
type PageState = UserEditPage["state"];
type StatePatch = Partial<PageState> | ((state: PageState, props: PageProps) => Partial<PageState> | null) | null;
type PageHarness = UserEditPage & {
  state: PageState;
  props: PageProps;
  setState: (patch: StatePatch, callback?: () => void) => void;
};
type UserEditShellHarness = PageHarness & {
  handleCancel: () => void;
};

const expect = jestExpect;
const {fireEvent} = require("@testing-library/react") as {
  fireEvent: {
    click: (element: Element | null) => boolean;
    change: (element: Element | null, event: unknown) => boolean;
    mouseDown: (element: Element | null) => boolean;
  };
};
const userBackendMock = UserBackend as unknown as UserBackendMock;
const groupBackendMock = GroupBackend as unknown as GroupBackendMock;
const organizationBackendMock = OrganizationBackend as unknown as OrganizationBackendMock;
const applicationBackendMock = ApplicationBackend as unknown as ApplicationBackendMock;
const authBackendMock = AuthBackend as unknown as AuthBackendMock;
const mfaBackendMock = MfaBackend as unknown as MfaBackendMock;
const transactionBackendMock = TransactionBackend as unknown as TransactionBackendMock;

jest.mock("./auth/MfaSetupPage", () => ({
  EmailMfaType: "email",
  PushMfaType: "push",
  RadiusMfaType: "radius",
  SmsMfaType: "sms",
  TotpMfaType: "app",
}));

jest.mock("antd/es/layout/layout", () => ({
  Content: function ContentMock(props: {children?: React.ReactNode; style?: React.CSSProperties}) {
    return <main style={props.style}>{props.children}</main>;
  },
  Header: function HeaderMock(props: {children?: React.ReactNode; style?: React.CSSProperties}) {
    return <header style={props.style}>{props.children}</header>;
  },
}));

jest.mock("antd/es/layout/Sider", () => function SiderMock(props: {children?: React.ReactNode; style?: React.CSSProperties; width?: number}) {
  return <aside style={props.style} data-width={props.width}>{props.children}</aside>;
});

jest.mock("./backend/UserBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    getUser: factoryJest.fn(),
    updateUser: factoryJest.fn(),
    deleteUser: factoryJest.fn(),
    verifyIdentification: factoryJest.fn(),
  };
});

jest.mock("./backend/GroupBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {getGroups: factoryJest.fn()};
});

jest.mock("./backend/OrganizationBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    getOrganizations: factoryJest.fn(),
    getOrganization: factoryJest.fn(),
  };
});

jest.mock("./backend/ApplicationBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    getApplicationsByOrganization: factoryJest.fn(),
    getUserApplication: factoryJest.fn(),
  };
});

jest.mock("./auth/AuthBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {getAccount: factoryJest.fn()};
});

jest.mock("./backend/MfaBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    DeleteMfa: factoryJest.fn(),
    SetPreferredMfa: factoryJest.fn(),
  };
});

jest.mock("./backend/TransactionBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {getTransactions: factoryJest.fn()};
});

jest.mock("./common/modal/PasswordModal", () => function PasswordModalMock() {
  return <button type="button">PasswordModal</button>;
});

jest.mock("./common/modal/ResetModal", () => function ResetModalMock(props: {destType?: string}) {
  return <button type="button">{`ResetModal-${props.destType || ""}`}</button>;
});

jest.mock("./common/modal/EnableMfaModal", () => function EnableMfaModalMock(props: {onSuccess?: () => void}) {
  return <button type="button" onClick={() => props.onSuccess?.()}>EnableMfaModal</button>;
});

jest.mock("./common/modal/CropperDivModal", () => function CropperDivModalMock(props: {tag?: string}) {
  return <button type="button">{`Cropper-${props.tag || ""}`}</button>;
});

jest.mock("./common/modal/PopconfirmModal", () => function PopconfirmModalMock(props: {text?: string; onConfirm?: () => void}) {
  return <button type="button" onClick={() => props.onConfirm?.()}>{props.text || "confirm"}</button>;
});

jest.mock("./account/AccountAvatar", () => function AccountAvatarMock(props: {src?: string; alt?: string}) {
  return <img src={props.src} alt={props.alt || "avatar"} />;
});

jest.mock("./common/OAuthWidget", () => function OAuthWidgetMock(props: {onUnlinked?: () => void}) {
  return <button type="button" data-testid="oauth-widget" onClick={() => props.onUnlinked?.()}>OAuthWidget</button>;
});

jest.mock("./common/SamlWidget", () => function SamlWidgetMock(props: {onUnlinked?: () => void}) {
  return <button type="button" data-testid="saml-widget" onClick={() => props.onUnlinked?.()}>SamlWidget</button>;
});

jest.mock("./account/WeComProfileSyncPanel", () => function WeComProfileSyncPanelMock(props: {onSynced?: () => void}) {
  return <button type="button" data-testid="wecom-sync" onClick={() => props.onSynced?.()}>WeComProfileSyncPanel</button>;
});

jest.mock("./common/select/CountryCodeSelect", () => ({
  CountryCodeSelect: function CountryCodeSelectMock(props: {initValue?: string; onChange?: (value: string) => void}) {
    return (
      <select data-testid="country-code-select" value={props.initValue || ""} onChange={event => props.onChange?.(event.target.value)}>
        <option value="">empty</option>
        <option value="US">US</option>
        <option value="CN">CN</option>
      </select>
    );
  },
}));

jest.mock("./common/select/RegionSelect", () => function RegionSelectMock(props: {defaultValue?: string; onChange?: (value: string) => void}) {
  return (
    <select data-testid="region-select" value={props.defaultValue || ""} onChange={event => props.onChange?.(event.target.value)}>
      <option value="">empty</option>
      <option value="CN">CN</option>
      <option value="US">US</option>
    </select>
  );
});

jest.mock("./common/select/AffiliationSelect", () => function AffiliationSelectMock(props: {onUpdateUserField?: (key: string, value: unknown) => void}) {
  return <button type="button" data-testid="affiliation-select" onClick={() => props.onUpdateUserField?.("affiliation", "team-a")}>AffiliationSelect</button>;
});

jest.mock("./table/AddressTable", () => function AddressTableMock(props: {onUpdateTable?: (value: unknown) => void}) {
  return <button type="button" data-testid="address-table" onClick={() => props.onUpdateTable?.([{city: "Shanghai"}])}>AddressTable</button>;
});

jest.mock("./table/propertyTable", () => function PropertyTableMock(props: {onUpdateTable?: (value: unknown) => void}) {
  return <button type="button" data-testid="property-table" onClick={() => props.onUpdateTable?.({level: "gold"})}>PropertyTable</button>;
});

jest.mock("./table/MfaTable", () => function MfaTableMock(props: {onUpdateTable?: (value: unknown) => void}) {
  return <button type="button" data-testid="mfa-table" onClick={() => props.onUpdateTable?.([{mfaType: "totp"}])}>MfaTable</button>;
});

jest.mock("./table/WebauthnCredentialTable", () => function WebAuthnCredentialTableMock(props: {updateTable?: (value: unknown) => void; refresh?: () => void}) {
  return <button type="button" data-testid="webauthn-table" onClick={() => {props.updateTable?.([{id: "cred-1"}]); props.refresh?.();}}>WebAuthnCredentialTable</button>;
});

jest.mock("./table/ManagedAccountTable", () => function ManagedAccountTableMock(props: {onUpdateTable?: (value: unknown) => void}) {
  return <button type="button" data-testid="managed-account-table" onClick={() => props.onUpdateTable?.([{name: "managed"}])}>ManagedAccountTable</button>;
});

jest.mock("./table/FaceIdTable", () => function FaceIdTableMock(props: {onUpdateTable?: (value: unknown) => void}) {
  return <button type="button" data-testid="face-id-table" onClick={() => props.onUpdateTable?.([{id: "face"}])}>FaceIdTable</button>;
});

jest.mock("./table/MfaAccountTable", () => function MfaAccountTableMock(props: {onUpdateTable?: (value: unknown) => void}) {
  return <button type="button" data-testid="mfa-account-table" onClick={() => props.onUpdateTable?.([{name: "mfa-account"}])}>MfaAccountTable</button>;
});

jest.mock("./table/TransactionTable", () => function TransactionTableMock(props: {transactions?: unknown[]; embedded?: boolean}) {
  return <div data-testid="transaction-table" data-embedded={props.embedded ? "true" : "false"}>{`Transactions-${props.transactions?.length || 0}`}</div>;
});

jest.mock("./table/CartTable", () => function CartTableMock() {
  return <div data-testid="cart-table">CartTable</div>;
});

jest.mock("./table/ConsentTable", () => function ConsentTableMock(props: {onUpdateTable?: () => void}) {
  return <button type="button" data-testid="consent-table" onClick={() => props.onUpdateTable?.()}>ConsentTable</button>;
});

const accountItems = [
  "Organization", "Groups", "ID", "Name", "Display name", "Avatar", "User type", "Password", "Email", "Phone",
  "Country/Region", "Location", "Address", "Addresses", "Affiliation", "Title", "ID card type", "ID card",
  "ID card info", "Real name", "ID verification", "Homepage", "Bio", "Tag", "Language", "Gender", "Birthday",
  "Education", "Balance", "Balance credit", "Balance currency", "Cart", "Transactions", "Score", "Karma", "Ranking",
  "Signup application", "Register type", "Register source", "Roles", "Permissions", "3rd-party logins", "Properties",
  "Is admin", "Is forbidden", "Is deleted", "MFA items", "Consents", "Multi-factor authentication",
  "WebAuthn credentials", "Last change password time", "Managed accounts", "Face ID", "MFA accounts",
  "Need update password", "IP whitelist", "First name", "Last name",
].map(name => ({name, visible: true, modifyRule: "Self", viewRule: "Self"}));

const baseUser = {
  owner: "engineering",
  name: "alice",
  id: "user-id",
  displayName: "Alice",
  avatar: "https://example.test/avatar.png",
  type: "normal-user",
  email: "alice@example.test",
  countryCode: "US",
  phone: "123456",
  region: "US",
  location: "Earth",
  address: ["line1", "line2"],
  addresses: [{city: "Old"}],
  title: "Engineer",
  idCardType: "passport",
  idCard: "ID123",
  realName: "Alice Real",
  homepage: "https://example.test",
  bio: "bio",
  tag: "alpha",
  language: "en",
  gender: "female",
  birthday: "2000-01-01",
  education: "college",
  balance: 1,
  balanceCredit: 2,
  balanceCurrency: "USD",
  cart: {items: []},
  score: 3,
  karma: 4,
  ranking: 5,
  signupApplication: "app-main",
  registerType: "signup",
  registerSource: "portal",
  groups: ["engineering/group-a"],
  roles: [{name: "role-a"}],
  permissions: [{name: "permission-a"}],
  properties: {idCardFront: "front.png", idCardBack: "back.png", idCardWithPerson: "person.png"},
  isVerified: false,
  isAdmin: false,
  isForbidden: false,
  isDeleted: false,
  mfaItems: [{name: "mfa"}],
  multiFactorAuths: [{mfaType: "email", enabled: true, secret: "safe-secret", isPreferred: false}],
  webauthnCredentials: [{id: "cred-old"}],
  lastChangePasswordTime: "2026-06-01",
  managedAccounts: [{name: "managed-old"}],
  faceIds: [{id: "face-old"}],
  mfaAccounts: [{name: "mfa-account-old"}],
  mfaProps: {enabled: true},
  needUpdatePassword: false,
  ipWhitelist: "127.0.0.1",
  firstName: "Alice",
  lastName: "Liddell",
  applicationScopes: [{application: "app-main"}],
};

const application = {
  name: "app-main",
  organizationObj: {
    name: "engineering",
    accountMenu: "Horizontal",
    accountItems,
    userTypes: ["normal-user", "paid-user"],
    tags: ["alpha|甲", "beta|乙"],
    countryCodes: ["US", "CN"],
  },
  providers: [
    {name: "oauth-provider", provider: {category: "OAuth"}},
    {name: "saml-provider", provider: {category: "SAML"}},
  ],
};

function mockMatchMedia(query: string): MediaQueryList {
  return {
    matches: false,
    media: query,
    onchange: null,
    addListener: jestValue.fn(),
    removeListener: jestValue.fn(),
    addEventListener: jestValue.fn(),
    removeEventListener: jestValue.fn(),
    dispatchEvent: jestValue.fn(),
  } as unknown as MediaQueryList;
}

function createPage(propsOverride: Partial<PageProps> = {}): PageHarness {
  const history = {push: jestValue.fn()};
  const props = {
    account: {...baseUser, isAdmin: true, accessToken: "token"},
    match: {params: {organizationName: "engineering", userName: "alice"}},
    location: {search: ""},
    history,
    ...propsOverride,
  } as PageProps;
  const page = new UserEditPage(props) as unknown as PageHarness;
  page.state = {
    ...page.state,
    user: {...baseUser},
    application: {...application},
    groups: [
      {owner: "engineering", name: "group-a", displayName: "Group A", type: "Physical"},
      {owner: "engineering", name: "group-b", displayName: "Group B", type: "Virtual"},
    ],
    organizations: [{name: "engineering", displayName: "Engineering Org"}, {name: "sales", displayName: "Sales Org"}],
    applications: [{name: "app-main"}, {name: "app-secondary"}],
    loading: false,
    transactions: [{name: "tx-1"}],
    consents: [{name: "consent-1"}],
    multiFactorAuths: [...(baseUser.multiFactorAuths || [])],
  } as PageState;
  Object.defineProperty(page, "setState", {
    configurable: true,
    value: (patch: StatePatch, callback?: () => void) => {
      const nextPatch = typeof patch === "function" ? patch(page.state, page.props) : patch;
      if (nextPatch !== null) {
        page.state = {
          ...page.state,
          ...(nextPatch || {}),
        };
      }
      callback?.();
    },
  });
  return page;
}

function setActiveUserTab(page: PageHarness, tabKey: PageState["activeTabKey"]) {
  page.state = {
    ...page.state,
    activeTabKey: tabKey,
  };
}

function renderUserFormForTab(page: PageHarness, tabKey: PageState["activeTabKey"]) {
  setActiveUserTab(page, tabKey);
  return render(<>{page.renderUserForm()}</>);
}

async function flushPromises() {
  await new Promise(resolve => setTimeout(resolve, 0));
}

function collectCallbacks(node: React.ReactNode, names: string[], callbacks: Array<(value?: unknown) => unknown> = []): Array<(value?: unknown) => unknown> {
  if (Array.isArray(node)) {
    node.forEach(child => collectCallbacks(child, names, callbacks));
    return callbacks;
  }

  if (!React.isValidElement<Record<string, unknown>>(node)) {
    return callbacks;
  }

  names.forEach(name => {
    const callback = node.props[name];
    if (typeof callback === "function") {
      callbacks.push(callback as (value?: unknown) => unknown);
    }
  });
  collectCallbacks(node.props.children as React.ReactNode, names, callbacks);
  return callbacks;
}

function findReactElement(node: React.ReactNode, predicate: (element: React.ReactElement<Record<string, unknown>>) => boolean): React.ReactElement<Record<string, unknown>> | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findReactElement(child, predicate);
      if (found !== null) {
        return found;
      }
    }
    return null;
  }

  if (!React.isValidElement<Record<string, unknown>>(node)) {
    return null;
  }

  if (predicate(node)) {
    return node;
  }

  return findReactElement(node.props.children as React.ReactNode, predicate);
}

function invokeCallback(callback: (value?: unknown) => unknown) {
  const candidates: unknown[] = [
    ["engineering/group-a", "engineering/group-b"],
    {target: {value: "changed-by-callback"}},
    "changed-by-callback",
    7,
    true,
    [{name: "table-row"}],
    undefined,
  ];

  for (const candidate of candidates) {
    try {
      callback(candidate);
      return;
    } catch (error) {
      // 历史回调混用多种 AntD 签名，失败时继续尝试下一种候选参数。
    }
  }
}

function installConsoleErrorFilter() {
  const testConsole = globalThis.console;
  const originalConsoleError = testConsole.error;
  jestValue.spyOn(testConsole, "error").mockImplementation((...args: Parameters<typeof testConsole.error>) => {
    const message = String(args[0] || "");
    if (
      message.includes("ReactDOM.render is no longer supported in React 18") ||
      message.includes("[antd: Input.Group]") ||
      message.includes("[antd: Form.Item]") ||
      message.includes("not wrapped in act")
    ) {
      return;
    }
    originalConsoleError(...args);
  });
}

beforeEach(() => {
  installConsoleErrorFilter();
  window.location.hash = "";
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: mockMatchMedia,
  });
  sessionStorage.clear();
  jestValue.spyOn(Setting, "showMessage").mockImplementation(() => {});
  jestValue.spyOn(Setting, "isLocalAdminUser").mockImplementation((account: unknown) => Boolean((account as {isAdmin?: boolean} | null)?.isAdmin));
  jestValue.spyOn(Setting, "isMobile").mockReturnValue(false);
  jestValue.spyOn(Setting, "getLabel").mockImplementation((label: unknown) => <span>{String(label)}</span>);
  jestValue.spyOn(Setting, "getOption").mockImplementation((label: unknown, value: unknown) => ({label, value}));
  jestValue.spyOn(Setting, "getTags").mockImplementation((tags: string[]) => [<span key="tags">{tags.join(",")}</span>]);
  jestValue.spyOn(Setting, "deepCopy").mockImplementation((value: unknown) => JSON.parse(JSON.stringify(value)));
  jestValue.spyOn(Setting, "myParseInt").mockImplementation((value: unknown) => Number.parseInt(String(value), 10));
  jestValue.spyOn(Setting, "isProviderVisible").mockReturnValue(true);

  userBackendMock.getUser.mockResolvedValue({status: "ok", data: {...baseUser}});
  userBackendMock.updateUser.mockResolvedValue({status: "ok"});
  userBackendMock.deleteUser.mockResolvedValue({status: "ok"});
  userBackendMock.verifyIdentification.mockResolvedValue({status: "ok"});
  groupBackendMock.getGroups.mockResolvedValue({status: "ok", data: [{owner: "engineering", name: "group-a", displayName: "Group A", type: "Physical"}]});
  organizationBackendMock.getOrganizations.mockResolvedValue({status: "ok", data: [{name: "engineering", displayName: "Engineering Org"}, {name: "sales", displayName: "Sales Org"}]});
  organizationBackendMock.getOrganization.mockResolvedValue({status: "ok", data: application.organizationObj});
  applicationBackendMock.getApplicationsByOrganization.mockResolvedValue({status: "ok", data: [{name: "app-main"}]});
  applicationBackendMock.getUserApplication.mockResolvedValue({status: "ok", data: application});
  authBackendMock.getAccount.mockResolvedValue({status: "ok", data: {...baseUser}, data2: {name: "engineering"}});
  mfaBackendMock.DeleteMfa.mockResolvedValue({status: "ok", data: []});
  mfaBackendMock.SetPreferredMfa.mockResolvedValue({status: "ok", data: [{mfaType: "email", enabled: true, isPreferred: true}]});
  transactionBackendMock.getTransactions.mockResolvedValue({status: "ok", data: [{name: "tx-1"}]});
});

afterEach(() => {
  jestValue.restoreAllMocks();
  jestValue.clearAllMocks();
});

test("loads user data, transactions, organizations, applications and groups", async() => {
  const page = createPage();

  page.getUser();
  await flushPromises();

  expect(userBackendMock.getUser).toHaveBeenCalledWith("engineering", "alice");
  expect(page.state.user.displayName).toBe("Alice");
  expect(page.state.loading).toBe(false);
  expect(transactionBackendMock.getTransactions).toHaveBeenCalledWith("engineering", "", "", "user", "alice");
  expect(page.state.transactions).toEqual([{name: "tx-1"}]);

  page.getOrganizations();
  await flushPromises();
  expect(page.state.organizations).toEqual([{name: "engineering", displayName: "Engineering Org"}, {name: "sales", displayName: "Sales Org"}]);

  page.getApplicationsByOrganization("engineering");
  await flushPromises();
  expect(page.state.applications).toEqual([{name: "app-main"}]);

  page.getGroups("engineering");
  await flushPromises();
  expect(page.state.groups).toEqual([{owner: "engineering", name: "group-a", displayName: "Group A", type: "Physical"}]);
});

test("normalizes stale signup application after user and applications load", async() => {
  const emptyApplicationsPage = createPage();
  emptyApplicationsPage.state = {
    ...emptyApplicationsPage.state,
    user: null as unknown as PageState["user"],
    applications: [],
  };
  applicationBackendMock.getApplicationsByOrganization.mockResolvedValueOnce({status: "ok", data: []});
  userBackendMock.getUser.mockResolvedValueOnce({status: "ok", data: {...baseUser, signupApplication: "app-deleted"}});

  emptyApplicationsPage.getApplicationsByOrganization("engineering");
  await flushPromises();
  emptyApplicationsPage.getUser();
  await flushPromises();

  expect(emptyApplicationsPage.state.user.signupApplication).toBe("");

  const availableApplicationsPage = createPage();
  availableApplicationsPage.state = {
    ...availableApplicationsPage.state,
    user: null as unknown as PageState["user"],
    applications: [{name: "app-main"}],
    applicationsLoaded: true,
  };
  userBackendMock.getUser.mockResolvedValueOnce({status: "ok", data: {...baseUser, signupApplication: "app-deleted"}});

  availableApplicationsPage.getUser();
  await flushPromises();

  expect(availableApplicationsPage.state.user.signupApplication).toBe("app-main");
});

test("keeps signup application read-only for directory synced users", () => {
  const localUserPage = createPage();
  const localUserView = render(<>{localUserPage.renderAccountItem({name: "Signup application", visible: true})}</>);
  expect(localUserView.container.querySelector(".ant-select-disabled")).toBeNull();
  localUserView.unmount();

  ["wecom", "lark", "dingtalk"].forEach(source => {
    const syncedUserPage = createPage();
    syncedUserPage.state = {
      ...syncedUserPage.state,
      user: {
        ...syncedUserPage.state.user,
        signupApplication: "",
        [source]: `${source}-user-id`,
      },
    };
    const syncedUserView = render(<>{syncedUserPage.renderAccountItem({name: "Signup application", visible: true})}</>);
    expect(syncedUserView.container.querySelector(".ant-select-disabled")).not.toBeNull();
    expect(syncedUserView.getByText("未设置")).toBeTruthy();
    syncedUserView.unmount();
  });
});

test("shows organization display names while keeping owner identifier as submitted value", () => {
  const page = createPage();
  const getApplicationsSpy = jestValue.spyOn(page, "getApplicationsByOrganization");
  const getGroupsSpy = jestValue.spyOn(page, "getGroups");
  const organizationNode = page.renderAccountItem({name: "Organization", visible: true});
  const organizationSelect = findReactElement(organizationNode, element =>
    element.props.optionLabelProp === "label" && element.props.value === "engineering"
  );

  expect(organizationSelect).not.toBeNull();
  const options = React.Children.toArray(organizationSelect?.props.children as React.ReactNode) as Array<React.ReactElement<Record<string, unknown>>>;
  expect(options[0].props.value).toBe("engineering");
  expect(options[0].props.label).toBe("Engineering Org");
  expect(options[1].props.value).toBe("sales");
  expect(options[1].props.label).toBe("Sales Org");

  const filterOption = organizationSelect?.props.filterOption as ((input: string, option?: {label?: string; value?: string}) => boolean) | undefined;
  expect(filterOption?.("Sales Org", {label: "Sales Org", value: "sales"})).toBe(true);
  expect(filterOption?.("sales", {label: "Sales Org", value: "sales"})).toBe(true);

  const onChange = organizationSelect?.props.onChange as ((value: string) => void) | undefined;
  onChange?.("sales");

  expect(page.state.user.owner).toBe("sales");
  expect(getApplicationsSpy).toHaveBeenCalledWith("sales");
  expect(getGroupsSpy).toHaveBeenCalledWith("sales");
});

test("handles user loading 404, API error and transaction load failures", async() => {
  const page = createPage();
  const historyPush = page.props.history.push as ReturnType<typeof jestValue.fn>;

  userBackendMock.getUser.mockResolvedValueOnce({status: "ok", data: null});
  page.getUser();
  await flushPromises();
  expect(historyPush).toHaveBeenCalledWith("/404");

  userBackendMock.getUser.mockResolvedValueOnce({status: "error", msg: "load failed"});
  page.getUser();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "load failed");

  transactionBackendMock.getTransactions.mockResolvedValueOnce({status: "error", msg: "transaction failed"});
  page.getUserTransactions();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("transaction failed"));

  transactionBackendMock.getTransactions.mockRejectedValueOnce(new Error("network down"));
  page.getUserTransactions();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("network down"));
});

test("renders all configured account items and keeps table callbacks wired", () => {
  const page = createPage();
  const getUserSpy = jestValue.spyOn(page, "getUser");
  const basicView = renderUserFormForTab(page, "basic");

  expect(basicView.getByTestId("address-table")).not.toBeNull();
  expect(basicView.getByText("ResetModal-email")).not.toBeNull();
  expect(basicView.getByText("ResetModal-phone")).not.toBeNull();

  const addressInputs = basicView.container.querySelectorAll(".user-edit-address-line input") as NodeListOf<HTMLInputElement>;
  expect(addressInputs.length).toBe(2);
  fireEvent.change(addressInputs[0], {target: {value: "line 1 updated"}});
  fireEvent.change(addressInputs[1], {target: {value: "line 2 updated"}});
  expect(page.state.user.address).toEqual(["line 1 updated", "line 2 updated"]);

  fireEvent.click(basicView.getByTestId("address-table"));
  expect(page.state.user.addresses).toEqual([{city: "Shanghai"}]);
  fireEvent.click(basicView.getByTestId("property-table"));
  expect(page.state.user.properties).toEqual({level: "gold"});
  fireEvent.click(basicView.getByTestId("affiliation-select"));
  expect(page.state.user.affiliation).toBe("team-a");

  Array.from(basicView.container.querySelectorAll("input") as NodeListOf<HTMLInputElement>).forEach((input, index) => {
    fireEvent.change(input, {target: {value: `changed-${index}`}});
  });
  fireEvent.change(basicView.getByTestId("country-code-select"), {target: {value: "CN"}});
  fireEvent.change(basicView.getByTestId("region-select"), {target: {value: "CN"}});

  expect(page.state.user.countryCode).toBe("CN");
  expect(page.state.user.region).toBe("CN");
  basicView.unmount();

  const securityView = renderUserFormForTab(page, "security");
  expect(securityView.container.querySelector(".user-edit-section-password-authentication")).not.toBeNull();
  expect(securityView.getByText("PasswordModal")).not.toBeNull();
  fireEvent.click(securityView.getByTestId("mfa-table"));
  expect(page.state.user.mfaItems).toEqual([{mfaType: "totp"}]);
  fireEvent.click(securityView.getByTestId("webauthn-table"));
  expect(page.state.user.webauthnCredentials).toEqual([{id: "cred-1"}]);
  expect(getUserSpy).toHaveBeenCalled();
  fireEvent.click(securityView.getByTestId("managed-account-table"));
  expect(page.state.user.managedAccounts).toEqual([{name: "managed"}]);
  fireEvent.click(securityView.getByTestId("face-id-table"));
  expect(page.state.user.faceIds).toEqual([{id: "face"}]);
  fireEvent.click(securityView.getByTestId("mfa-account-table"));
  expect(page.state.user.mfaAccounts).toEqual([{name: "mfa-account"}]);
  securityView.unmount();

  const connectionsView = renderUserFormForTab(page, "connections");
  expect(connectionsView.getByTestId("oauth-widget")).not.toBeNull();
  expect(connectionsView.getByTestId("saml-widget")).not.toBeNull();
  fireEvent.click(connectionsView.getByTestId("oauth-widget"));
  fireEvent.click(connectionsView.getByTestId("saml-widget"));
  expect(getUserSpy.mock.calls.length).toBeGreaterThanOrEqual(3);
  connectionsView.unmount();

  const recordsView = renderUserFormForTab(page, "records");
  expect(recordsView.getByTestId("transaction-table").textContent).toContain("Transactions-1");
  expect(recordsView.getByTestId("transaction-table").getAttribute("data-embedded")).toBe("true");
  expect(recordsView.getByTestId("cart-table")).not.toBeNull();
  fireEvent.click(recordsView.getByTestId("consent-table"));
  expect(getUserSpy).toHaveBeenCalled();
});

test("renders an explicit empty state when the application has no visible third-party login providers", () => {
  const page = createPage();
  page.state = {
    ...page.state,
    application: {
      ...application,
      providers: [],
    },
  };

  const connectionsView = renderUserFormForTab(page, "connections");

  expect(connectionsView.queryByTestId("oauth-widget")).toBeNull();
  expect(connectionsView.queryByTestId("saml-widget")).toBeNull();
  expect(connectionsView.getByText("当前应用未配置可展示的第三方登录 Provider")).not.toBeNull();
  expect(connectionsView.container.querySelector(".user-edit-third-party-empty")).not.toBeNull();
  connectionsView.unmount();
});

test("invokes configured form callbacks across migrated JSX branches", async() => {
  const page = createPage();
  const getUserSpy = jestValue.spyOn(page, "getUser");
  const callbackNames = [
    "onChange",
    "onClick",
    "onConfirm",
    "onSuccess",
    "onUnlinked",
    "onUpdateTable",
    "updateTable",
    "refresh",
  ];
  const callbacks = page.getAvailableTabs().flatMap(tab => {
    setActiveUserTab(page, tab.key);
    return collectCallbacks(page.renderUserForm(), callbackNames);
  });

  callbacks.forEach(invokeCallback);
  await flushPromises();

  expect(callbacks.length).toBeGreaterThan(30);
  expect(page.state.user.displayName).toBeDefined();
  expect(getUserSpy.mock.calls.length).toBeGreaterThan(0);
});

test("updates scalar, address and parsed numeric user fields", () => {
  const page = createPage();

  page.updateUserField("displayName", "Alice Updated");
  page.updateUserField("address", "new line 1", 0);
  page.updateUserField("score", "42");
  page.updateUserField("karma", "43");
  page.updateUserField("ranking", "44");

  expect(page.state.user.displayName).toBe("Alice Updated");
  expect(page.state.user.address?.[0]).toBe("new line 1");
  expect(page.state.user.score).toBe(42);
  expect(page.state.user.karma).toBe(43);
  expect(page.state.user.ranking).toBe(44);
});

test("hides empty roles and permissions without removing populated tags", () => {
  const page = createPage();
  const populatedRolesView = render(<>{page.renderAccountItem({name: "Roles", visible: true})}</>);
  const populatedPermissionsView = render(<>{page.renderAccountItem({name: "Permissions", visible: true})}</>);

  expect(populatedRolesView.getByText("role-a")).not.toBeNull();
  expect(populatedPermissionsView.getByText("permission-a")).not.toBeNull();
  populatedRolesView.unmount();
  populatedPermissionsView.unmount();

  page.state = {
    ...page.state,
    user: {
      ...page.state.user,
      roles: [],
      permissions: [],
    },
  };

  expect(page.renderAccountItem({name: "Roles", visible: true})).toBeNull();
  expect(page.renderAccountItem({name: "Permissions", visible: true})).toBeNull();
});

test("handles return URL, account item visibility and fixed edit tabs", async() => {
  const page = createPage({location: {search: "?returnUrl=%2Faccount%23profile"}});

  page.setReturnUrl();
  expect(page.state.returnUrl).toBe("/account#profile");

  page.state = {
    ...page.state,
    application: {
      ...application,
      organizationObj: {
        ...application.organizationObj,
        accountItems: [
          {name: "Display name", visible: true, tab: "", regex: "^[A-Z].*"},
          {name: "Email", visible: true, tab: "Contact"},
          {name: "Phone", visible: false, tab: "Contact"},
          {name: "Is admin", visible: true, viewRule: "Admin", tab: "Admin"},
        ],
      },
    },
    menuMode: "Vertical",
  };

  expect(page.isAccountItemVisible({name: "Phone", visible: false})).toBe(false);
  expect(page.getAccountItemsByUserEditTab("basic").map(item => item.name)).toEqual(["Display name", "Email"]);
  expect(page.getAccountItemsByUserEditTab("access").map(item => item.name)).toEqual(["Is admin"]);
  expect(page.getAvailableTabs().map(tab => tab.key)).toEqual(["basic", "access"]);

  const accessOnlyPage = createPage();
  accessOnlyPage.state = {
    ...accessOnlyPage.state,
    application: {
      ...application,
      organizationObj: {
        ...application.organizationObj,
        accountItems: [
          {name: "Is admin", visible: true, viewRule: "Admin", tab: "Admin"},
        ],
      },
    },
    activeTabKey: "records",
  };
  expect(accessOnlyPage.getAvailableTabs().map(tab => tab.key)).toEqual(["access"]);
  expect(accessOnlyPage.getActiveTabKey()).toBe("access");
  const accessOnlyView = render(<>{accessOnlyPage.renderUserForm()}</>);
  expect(accessOnlyView.container.querySelector(".ant-switch")).not.toBeNull();
  accessOnlyView.unmount();

  const view = render(<>{page.renderEditTabs()}</>);
  const basicTab = view.getByText(/^(基础|Basic)$/);
  const accessTab = view.getByText(/^(权限管理|Authorization)$/);
  expect(basicTab).not.toBeNull();
  expect(accessTab).not.toBeNull();
  expect(view.queryByText("Contact")).toBeNull();
  expect(view.queryByText("Admin")).toBeNull();
  expect(view.container.querySelector("aside")).toBeNull();
  fireEvent.click(accessTab);
  expect(page.state.activeTabKey).toBe("access");
  view.unmount();

  (organizationBackendMock.getOrganization as unknown as {mockClear: () => void}).mockClear();
  applicationBackendMock.getUserApplication.mockResolvedValueOnce({status: "error", msg: "application failed"});
  page.getUserApplication();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "application failed");
  expect(organizationBackendMock.getOrganization).not.toHaveBeenCalled();

  applicationBackendMock.getUserApplication.mockResolvedValueOnce({status: "ok", data: application});
  page.getUserApplication();
  await flushPromises();
  expect(page.state.application?.name).toBe("app-main");

  const emptyImage = render(<>{page.renderImage(undefined, "Upload", "Set", "avatar", false)}</>);
  expect(emptyImage.getByText(/\((空|无|empty)\)/)).not.toBeNull();
  expect(page.getIdCardType("unknown")).toContain("Unknown");
  expect(page.getIdCardText("unknown")).toContain("Unknown");
});

test("renders organization-style fixed user tabs in the page shell with one fixed action bar", () => {
  const page = createPage();
  page.state = {
    ...page.state,
    application: {
      ...application,
      organizationObj: {
        ...application.organizationObj,
        accountItems: [
          {name: "Display name", visible: true, tab: "", regex: "^[A-Z].*"},
          {name: "Email", visible: true, tab: "Contact"},
          {name: "Is admin", visible: true, viewRule: "Admin", tab: "Admin"},
        ],
      },
    },
    activeTabKey: "basic",
    menuMode: "Vertical",
  };

  const view = render(<>{page.renderUser()}</>);
  expect(view.container.querySelector(".user-edit-shell")).not.toBeNull();
  expect(view.container.querySelector(".user-edit-header")).not.toBeNull();
  expect(view.container.querySelector(".user-edit-tabs")).not.toBeNull();
  expect(view.container.querySelector(".user-edit-scroll-content")).not.toBeNull();
  expect(view.container.querySelector(".user-edit-action-bar")).not.toBeNull();
  expect(view.container.querySelector("aside")).toBeNull();
  const basicTab = view.getByText(/^(基础|Basic)$/);
  const accessTab = view.getByText(/^(权限管理|Authorization)$/);
  expect(basicTab).not.toBeNull();
  expect(accessTab).not.toBeNull();
  expect(view.queryByText("Contact")).toBeNull();
  expect(view.queryByText("Admin")).toBeNull();

  fireEvent.click(accessTab);
  expect(page.state.activeTabKey).toBe("access");
  expect(window.location.hash).toBe("#access");
  expect(view.container.querySelectorAll(".user-edit-action-bar button").length).toBe(3);
});

test("groups user edit tab fields with organization-style section titles", () => {
  const page = createPage();
  page.state = {
    ...page.state,
    application: {
      ...application,
      organizationObj: {
        ...application.organizationObj,
        accountItems: [
          {name: "Organization", visible: true},
          {name: "Display name", visible: true},
          {name: "Email", visible: true},
          {name: "Properties", visible: true},
          {name: "Unimplemented custom field", visible: true},
        ],
      },
    },
    activeTabKey: "basic",
  };

  const view = render(<>{page.renderUserForm()}</>);
  const sectionTitles = [...view.container.querySelectorAll(".user-edit-section-title")].map(element => element.textContent);
  expect(sectionTitles).toHaveLength(3);
  expect(sectionTitles[0]).toMatch(/^(基础信息|Basic information)$/);
  expect(sectionTitles[1]).toMatch(/^(联系方式|Contact information)$/);
  expect(sectionTitles[2]).toMatch(/^(扩展属性|Extended properties)$/);
  expect(view.queryByText(/^(其他信息|Other information)$/)).toBeNull();
  expect(view.container.querySelector(".user-edit-section-basic-information")).not.toBeNull();
  expect(view.container.querySelector(".user-edit-section-body .user-edit-form-item-organization")).not.toBeNull();
  expect(view.container.querySelector(".user-edit-section-body .user-edit-form-item-properties")).not.toBeNull();
});

test("protects dirty cancel and ignores duplicate user saves while submitting", async() => {
  const page = createPage() as unknown as UserEditShellHarness;
  const historyPush = page.props.history.push as ReturnType<typeof jestValue.fn>;
  const confirmSpy = jestValue.spyOn(Modal, "confirm").mockImplementation((config) => {
    (config as {onOk?: () => void}).onOk?.();
    return {destroy: jestValue.fn(), update: jestValue.fn()} as never;
  });

  page.state = {
    ...page.state,
    dirty: true,
  };
  page.handleCancel();

  expect(confirmSpy).toHaveBeenCalled();
  expect(historyPush).toHaveBeenCalledWith("/users");

  (userBackendMock.updateUser as unknown as {mockClear: () => void}).mockClear();
  const submittingPage = createPage();
  submittingPage.state = {
    ...submittingPage.state,
    submitting: true,
  };

  submittingPage.submitUserEdit(false);
  await flushPromises();

  expect(userBackendMock.updateUser).not.toHaveBeenCalled();
});

test("falls back to organization settings when user has no application", async() => {
  const missingApplicationMessage = "The organization: engineering should have one application at least";
  const fallbackOrganization = {
    ...application.organizationObj,
    accountItems: [{name: "Display name", visible: true, modifyRule: "Self", viewRule: "Self"}],
  };
  const page = createPage();
  page.state = {
    ...page.state,
    application: null,
    userOrganization: null,
  };

  (Setting.showMessage as unknown as {mockClear: () => void}).mockClear();
  (organizationBackendMock.getOrganization as unknown as {mockClear: () => void}).mockClear();
  applicationBackendMock.getUserApplication.mockResolvedValueOnce({status: "error", msg: missingApplicationMessage});
  page.getUserApplication();
  await flushPromises();

  expect(organizationBackendMock.getOrganization).toHaveBeenCalledWith("admin", "engineering");
  expect(page.getUserOrganization()?.name).toBe("engineering");
  expect(Setting.showMessage).not.toHaveBeenCalledWith("error", missingApplicationMessage);

  const fallbackView = render(<>{page.renderUserForm()}</>);
  expect(fallbackView.container.querySelector("[id='Display name']")).not.toBeNull();
  expect(Setting.showMessage).not.toHaveBeenCalledWith("error", missingApplicationMessage);
  fallbackView.unmount();

  (Setting.showMessage as unknown as {mockClear: () => void}).mockClear();
  (organizationBackendMock.getOrganization as unknown as {mockClear: () => void}).mockClear();
  applicationBackendMock.getUserApplication.mockResolvedValueOnce({status: "error", msg: "application failed"});
  page.getUserApplication();
  await flushPromises();

  expect(Setting.showMessage).toHaveBeenCalledWith("error", "application failed");
  expect(organizationBackendMock.getOrganization).not.toHaveBeenCalled();

  const pendingPage = createPage();
  pendingPage.state = {
    ...pendingPage.state,
    user: null as unknown as PageState["user"],
    application: null,
    userOrganization: null,
  };
  (organizationBackendMock.getOrganization as unknown as {mockClear: () => void}).mockClear();
  applicationBackendMock.getUserApplication.mockResolvedValueOnce({status: "error", msg: missingApplicationMessage});
  pendingPage.getUserApplication();
  await flushPromises();
  expect(pendingPage.state.pendingUserApplicationError).toBe(missingApplicationMessage);
  expect(organizationBackendMock.getOrganization).not.toHaveBeenCalled();

  userBackendMock.getUser.mockResolvedValueOnce({
    status: "ok",
    data: {...baseUser},
  });
  organizationBackendMock.getOrganization.mockResolvedValueOnce({status: "ok", data: fallbackOrganization});
  pendingPage.getUser();
  await flushPromises();
  await flushPromises();

  expect(organizationBackendMock.getOrganization).toHaveBeenCalledWith("admin", "engineering");
  expect(pendingPage.state.pendingUserApplicationError).toBeNull();
  expect(pendingPage.getUserOrganization()?.name).toBe("engineering");
});

test("shows field validation for physical group conflicts", () => {
  const page = createPage();
  page.state = {
    ...page.state,
    groups: [
      {owner: "engineering", name: "group-a", displayName: "Group A", type: "Physical"},
      {owner: "engineering", name: "group-b", displayName: "Group B", type: "Physical"},
    ],
  };
  const view = render(<>{page.renderAccountItem({name: "Groups", visible: true})}</>);

  const selector = view.container.querySelector(".ant-select-selector");
  fireEvent.mouseDown(selector as Element);
  const groupBOptions = view.getAllByText("Group B");
  fireEvent.click(groupBOptions[groupBOptions.length - 1]);

  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.any(String));
});

test("keeps directory synced group membership read-only in user editor", () => {
  const page = createPage();
  page.state = {
    ...page.state,
    user: {
      ...page.state.user,
      groups: ["engineering/group-a", "engineering/wecom-dept-2"],
    },
    groups: [
      {owner: "engineering", name: "group-a", displayName: "Group A", type: "Physical"},
      {owner: "engineering", name: "wecom-dept-2", displayName: "WeCom Dept 2", type: "Virtual", isDirectorySynced: true},
    ],
  };

  const groupsNode = page.renderAccountItem({name: "Groups", visible: true});
  const syncedOption = findReactElement(groupsNode, element => element.props.value === "engineering/wecom-dept-2");
  expect(syncedOption?.props.disabled).toBe(true);

  const groupSelect = findReactElement(groupsNode, element => element.props.mode === "multiple");
  (groupSelect?.props.onChange as ((value: string[]) => void) | undefined)?.(["engineering/group-a"]);

  expect(page.state.user.groups).toEqual(["engineering/group-a", "engineering/wecom-dept-2"]);
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringMatching(/Directory synced|通讯录同步/));
});

test("saves user, supports save-exit redirects and rolls owner/name back on failure", async() => {
  const page = createPage();
  const historyPush = page.props.history.push as ReturnType<typeof jestValue.fn>;
  page.state = {...page.state, user: {...page.state.user, owner: "sales", name: "alice-new"}};

  page.submitUserEdit(false);
  await flushPromises();
  expect(userBackendMock.updateUser).toHaveBeenCalledWith("engineering", "alice", expect.objectContaining({owner: "sales", name: "alice-new"}));
  expect(historyPush).toHaveBeenCalledWith("/users/sales/alice-new");

  sessionStorage.setItem("userListUrl", "/users?organization=sales");
  page.submitUserEdit(true);
  await flushPromises();
  expect(historyPush).toHaveBeenCalledWith("/users?organization=sales");

  userBackendMock.updateUser.mockResolvedValueOnce({status: "error", msg: "save failed"});
  page.state = {...page.state, user: {...page.state.user, owner: "broken", name: "broken-name"}};
  page.submitUserEdit(false);
  await flushPromises();

  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("save failed"));
  expect(page.state.user.owner).toBe("sales");
  expect(page.state.user.name).toBe("alice-new");
});

test("deletes user or reports delete errors", async() => {
  const page = createPage();
  const historyPush = page.props.history.push as ReturnType<typeof jestValue.fn>;

  page.deleteUser();
  await flushPromises();
  expect(userBackendMock.deleteUser).toHaveBeenCalledWith(expect.objectContaining({name: "alice"}));
  expect(historyPush).toHaveBeenCalledWith("/users");

  userBackendMock.deleteUser.mockResolvedValueOnce({status: "error", msg: "delete failed"});
  page.deleteUser();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete failed"));

  userBackendMock.deleteUser.mockRejectedValueOnce(new Error("delete network"));
  page.deleteUser();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete network"));
});

test("validates identification input and refreshes user after successful verification", async() => {
  const page = createPage();
  const getUserSpy = jestValue.spyOn(page, "getUser");

  page.state = {...page.state, user: {...page.state.user, idCard: "", idCardType: "passport", realName: "Alice Real"}};
  page.handleVerifyIdentification();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.any(String));

  page.state = {...page.state, user: {...page.state.user, idCard: "ID123", idCardType: "passport", realName: ""}};
  page.handleVerifyIdentification();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.any(String));

  page.state = {...page.state, user: {...page.state.user, idCard: "ID123", idCardType: "passport", realName: "Alice Real"}};
  page.handleVerifyIdentification();
  await flushPromises();

  expect(userBackendMock.verifyIdentification).toHaveBeenCalledWith("engineering", "alice", "");
  expect(Setting.showMessage).toHaveBeenCalledWith("success", expect.any(String));
  expect(getUserSpy).toHaveBeenCalled();
});

test("deletes MFA and refreshes account after WeCom profile sync", async() => {
  const onUpdateAccount = jestValue.fn();
  const page = createPage({onUpdateAccount});
  const getUserSpy = jestValue.spyOn(page, "getUser");

  page.deleteMfa();
  await flushPromises();
  expect(mfaBackendMock.DeleteMfa).toHaveBeenCalledWith({owner: "engineering", name: "alice"});
  expect(page.state.multiFactorAuths).toEqual([]);
  expect(page.state.RemoveMfaLoading).toBe(false);

  page.handleWeComProfileSynced();
  await flushPromises();
  expect(getUserSpy).toHaveBeenCalled();
  expect(authBackendMock.getAccount).toHaveBeenCalled();
  expect(onUpdateAccount).toHaveBeenCalledWith(expect.objectContaining({
    name: "alice",
    organization: {name: "engineering"},
  }));
});

test("renders user cards, loading and not-found states without changing default buttons", () => {
  const page = createPage();
  setActiveUserTab(page, "security");
  const userView = render(<>{page.renderUser()}</>);
  expect(userView.container.querySelector(".user-edit-card")).not.toBeNull();
  expect(userView.getAllByText("PasswordModal").length).toBeGreaterThan(0);
  expect(userView.getByTestId("wecom-sync")).not.toBeNull();
  userView.unmount();

  const fullPage = createPage();
  const fullView = render(<>{fullPage.render()}</>);
  expect(fullView.container.querySelector(".user-edit-page")).not.toBeNull();
  expect(fullView.container.querySelector(".user-edit-page .user-edit-card")).not.toBeNull();
  fullView.unmount();

  const loadingPage = createPage();
  loadingPage.state = {...loadingPage.state, loading: true};
  const loadingView = render(<>{loadingPage.render()}</>);
  expect(loadingView.container.querySelector(".ant-spin")).not.toBeNull();
  loadingView.unmount();

  const notFoundPage = createPage({account: null});
  notFoundPage.state = {...notFoundPage.state, loading: false, user: null as unknown as PageState["user"]};
  const notFoundView = render(<>{notFoundPage.render()}</>);
  expect(notFoundView.getByText("404 NOT FOUND")).not.toBeNull();
});
