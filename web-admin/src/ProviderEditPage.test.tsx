/* eslint-env jest */
import React from "react";
import {Input, Modal, Select, Switch} from "antd";
import {cleanup, render} from "@testing-library/react";
import {expect, jest} from "@jest/globals";
import i18next from "i18next";
import "./i18n";
import ProviderEditPage from "./ProviderEditPage";
import * as Setting from "./Setting";
import * as ProviderBackend from "./backend/ProviderBackend";
import * as OrganizationBackend from "./backend/OrganizationBackend";
import * as CertBackend from "./backend/CertBackend";
import {validateWeComProviderFields} from "./provider/WeComProviderUtils";
import en from "./locales/en/data.json";
import zh from "./locales/zh/data.json";

const {fireEvent} = require("@testing-library/react") as {fireEvent: {click: (element: Element) => boolean}};

type PageHarness = ProviderEditPage & {
  state: any;
  props: any;
  deleteProvider: () => void;
  submitProviderEdit: (exitAfterSave: boolean) => void;
  renderOrganizationOptions: () => React.ReactNode;
  renderWeComGuide: (provider: any) => React.ReactNode;
  renderProviderBasicSection: (provider: any) => React.ReactNode;
  renderProviderConfigurationContent: (provider: any) => React.ReactNode;
  renderProviderCategoryOptions: () => React.ReactNode;
  getProvider: () => void;
  getOrganizations: () => void;
  getCerts: (owner: string) => void;
  updateProviderField: (key: string, value: any) => void;
  updateUserMappingField: (key: string, value: string) => void;
  updateProviderCategory: (value: string) => void;
  updateProviderType: (value: string) => void;
  updateProviderTlsPolicy: (value: "system" | "custom-ca" | "legacy-insecure") => void;
};

jest.mock("./provider/OAuthProviderFields", () => {
  const ReactFactory = require("react");
  return {
    renderOAuthProviderFields: () => ReactFactory.createElement("div", {"data-testid": "oauth-provider-fields"}, "OAuth fields"),
  };
});

jest.mock("./provider/NotificationProviderFields", () => ({renderNotificationProviderFields: () => null}));
jest.mock("./provider/EmailProviderFields", () => ({renderEmailProviderFields: () => null}));
jest.mock("./provider/SmsProviderFields", () => ({renderSmsProviderFields: () => null}));
jest.mock("./provider/MfaProviderFields", () => ({renderMfaProviderFields: () => null}));
jest.mock("./provider/SamlProviderFields", () => ({renderSamlProviderFields: () => null}));
jest.mock("./provider/CaptchaProviderFields", () => ({renderCaptchaProviderFields: () => null}));
jest.mock("./provider/PaymentProviderFields", () => ({renderPaymentProviderFields: () => null}));
jest.mock("./provider/StorageProviderFields", () => ({renderStorageProviderFields: () => null}));
jest.mock("./provider/FaceIDProviderFields", () => ({renderFaceIdProviderFields: () => null}));
jest.mock("./provider/IDVerificationProviderFields", () => ({renderIDVerificationProviderFields: () => null}));
jest.mock("./provider/LarkProviderGuide", () => ({renderLarkProviderGuide: () => null}));

const baseProvider = {
  owner: "engineering",
  name: "github-main",
  displayName: "GitHub Main",
  category: "OAuth",
  type: "GitHub",
  clientId: "client-id",
  clientSecret: "client-secret",
  providerUrl: "https://github.com/organizations/example/settings/applications/123",
  userMapping: {
    id: "id",
    username: "username",
    displayName: "displayName",
  },
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

async function flushPromises(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 0));
}

function collectElementsByType(node: React.ReactNode, type: React.ElementType): React.ReactElement[] {
  if (!React.isValidElement(node)) {
    return [];
  }

  const current = node.type === type ? [node] : [];
  const children = (node.props as {children?: React.ReactNode}).children;
  React.Children.forEach(children, child => current.push(...collectElementsByType(child, type)));
  return current;
}

function elementProps<T>(element: React.ReactElement): T {
  return element.props as T;
}

function findElementByValue(elements: React.ReactElement[], value: unknown): React.ReactElement {
  const element = elements.find(item => elementProps<{value?: unknown}>(item).value === value);
  if (!element) {
    throw new Error(`Unable to find test element with value: ${String(value)}`);
  }
  return element;
}

function createPage(options: {mode?: "add" | "edit"} = {}): PageHarness {
  const page = new ProviderEditPage({
    match: {params: {organizationName: "engineering", providerName: "github-main"}},
    location: options.mode === "add"
      ? {state: {mode: "add", provider: {...baseProvider}}}
      : {mode: options.mode},
    history: {push: jest.fn()},
    account: {owner: "engineering", name: "admin", email: "admin@example.test", isAdmin: true},
  } as any) as unknown as PageHarness;

  page.state = {
    ...page.state,
    provider: {...baseProvider},
    organizations: [{name: "admin", displayName: "Admin"}, {name: "engineering", displayName: "Engineering"}],
    certs: [{name: "cert-main", type: "SSL"}],
    mode: options.mode ?? "edit",
  };
  page.setState = ((patch: any, callback?: () => void) => {
    const nextState = typeof patch === "function" ? patch(page.state, page.props) : patch;
    page.state = {
      ...page.state,
      ...nextState,
    };
    callback?.();
  }) as typeof page.setState;
  return page;
}

beforeEach(async() => {
  await useTestLanguage("en");
  jest.spyOn(Setting, "isMobile").mockReturnValue(false);
  jest.spyOn(Setting, "isAdminUser").mockReturnValue(true);
});

afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
});

test("renders provider edit in the shared large edit shell without duplicate legacy actions", () => {
  const page = createPage();
  const view = render(<>{page.renderProvider()}</>);

  expect(view.container.querySelector(".provider-edit-shell")).not.toBeNull();
  expect(view.container.querySelector(".provider-edit-header")).not.toBeNull();
  expect(view.container.querySelector(".provider-edit-scroll-content")).not.toBeNull();
  expect(view.container.querySelector(".provider-edit-action-bar")).not.toBeNull();
  expect(view.container.querySelector(".provider-edit-card .ant-card-head")).toBeNull();
  expect(view.getByText("Identity Source Center / Providers /")).not.toBeNull();
  expect(view.getByText("Edit Provider (GitHub Main)")).not.toBeNull();
  expect(view.getByText("Basic information")).not.toBeNull();
  expect(view.getByText("Provider configuration")).not.toBeNull();
  expect(view.getByText("Provider URL")).not.toBeNull();
  expect(view.getByTestId("oauth-provider-fields")).not.toBeNull();

  const actionButtons = Array.from(view.container.querySelectorAll(".provider-edit-action-bar button")) as HTMLButtonElement[];
  expect(actionButtons.map(button => button.textContent)).toEqual([
    "Cancel",
    "Save",
    "Save and return",
  ]);
  expect(view.queryByText("Save & Exit")).toBeNull();
});

test("renders a historical wallet provider as a non-editable cleanup state", () => {
  const page = createPage();
  page.state.provider = {
    ...baseProvider,
    category: "OAuth",
    type: "MetaMask",
  };
  const view = render(<>{page.renderProvider()}</>);
  const actionButtons = Array.from(view.container.querySelectorAll(".provider-edit-action-bar button")) as HTMLButtonElement[];

  expect(view.container.querySelector(".provider-edit-retired-alert")).not.toBeNull();
  expect(view.queryByText("Basic information")).toBeNull();
  expect(view.queryByText("Provider configuration")).toBeNull();
  expect(actionButtons.map(button => button.textContent)).toEqual(["Back", "Delete"]);
  expect(view.queryByText("Save")).toBeNull();
  expect(view.queryByText("Save and return")).toBeNull();
});

test("routes edit cancel and shell back to provider list", () => {
  const page = createPage();
  const view = render(<>{page.renderProvider()}</>);

  fireEvent.click(view.getByText("Cancel"));
  fireEvent.click(view.getByText("Back"));

  expect(page.props.history.push).toHaveBeenNthCalledWith(1, "/providers");
  expect(page.props.history.push).toHaveBeenNthCalledWith(2, "/providers");
});

test("publishes the provider display name for its workspace tab after loading and editing", async() => {
  const dispatchSpy = jest.spyOn(window, "dispatchEvent");
  const page = createPage();
  page.state.owner = "admin";
  page.state.providerName = "dingding";
  page.props.match.params.organizationName = "admin";
  jest.spyOn(ProviderBackend, "getProvider").mockResolvedValue({
    status: "ok",
    data: {...baseProvider, owner: "admin", name: "dingding", displayName: "钉钉-自建"},
  } as any);

  page.getProvider();
  await flushPromises();

  const loadedEvent = dispatchSpy.mock.calls.at(-1)?.[0] as CustomEvent | undefined;
  expect(loadedEvent?.type).toBe("aicodex.admin.workspaceTabLabelUpdate");
  expect(loadedEvent?.detail).toEqual({
    path: "/providers/admin/dingding",
    label: "Edit Provider: 钉钉-自建",
  });

  page.updateProviderField("displayName", "钉钉二号");

  const updatedEvent = dispatchSpy.mock.calls.at(-1)?.[0] as CustomEvent | undefined;
  expect(updatedEvent?.detail).toEqual({
    path: "/providers/admin/dingding",
    label: "Edit Provider: 钉钉二号",
  });
});

([
  {mode: "add" as const, actionLabel: "Cancel"},
  {mode: "edit" as const, actionLabel: "Back"},
]).forEach(({mode, actionLabel}) => {
  test(`confirms before ${actionLabel} leaves a dirty ${mode} provider without mutations`, () => {
    const page = createPage({mode});
    const addProvider = jest.spyOn(ProviderBackend, "addProvider");
    const updateProvider = jest.spyOn(ProviderBackend, "updateProvider");
    const deleteProvider = jest.spyOn(ProviderBackend, "deleteProvider");
    let confirmOptions: {onOk?: () => void} | undefined;
    const confirm = jest.spyOn(Modal, "confirm").mockImplementation(options => {
      confirmOptions = options as {onOk?: () => void};
      return {destroy: jest.fn(), update: jest.fn()} as any;
    });

    page.updateProviderField("displayName", "Changed Provider");
    const view = render(<>{page.renderProvider()}</>);
    fireEvent.click(view.getByText(actionLabel));

    expect(page.state.dirty).toBe(true);
    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({
      title: "Unsaved changes",
      content: "Current provider settings have unsaved changes. Leave without saving?",
      okText: "OK",
      cancelText: "Cancel",
      onOk: expect.any(Function),
    }));
    expect(page.props.history.push).not.toHaveBeenCalled();
    expect(addProvider).not.toHaveBeenCalled();
    expect(updateProvider).not.toHaveBeenCalled();
    expect(deleteProvider).not.toHaveBeenCalled();

    confirmOptions?.onOk?.();
    expect(page.props.history.push).toHaveBeenCalledWith("/providers");
  });
});

test("confirms before leaving after a provider mapping edit", () => {
  const page = createPage();
  const addProvider = jest.spyOn(ProviderBackend, "addProvider");
  const updateProvider = jest.spyOn(ProviderBackend, "updateProvider");
  const deleteProvider = jest.spyOn(ProviderBackend, "deleteProvider");
  const confirm = jest.spyOn(Modal, "confirm").mockImplementation(() => ({destroy: jest.fn(), update: jest.fn()}) as any);

  page.updateUserMappingField("email", "mail");
  page.handleBack();

  expect(page.state.dirty).toBe(true);
  expect(confirm).toHaveBeenCalledWith(expect.objectContaining({onOk: expect.any(Function)}));
  expect(page.props.history.push).not.toHaveBeenCalled();
  expect(addProvider).not.toHaveBeenCalled();
  expect(updateProvider).not.toHaveBeenCalled();
  expect(deleteProvider).not.toHaveBeenCalled();
});

test("keeps shared footer save actions wired to the existing provider submit method", () => {
  const page = createPage();
  const submitProviderEdit = jest.spyOn(page, "submitProviderEdit").mockImplementation(() => undefined);
  const view = render(<>{page.renderProvider()}</>);

  fireEvent.click(view.getByText("Save"));
  fireEvent.click(view.getByText("Save and return"));

  expect(submitProviderEdit).toHaveBeenNthCalledWith(1, false);
  expect(submitProviderEdit).toHaveBeenNthCalledWith(2, true);
});

test("renders provider organization options with shared admin semantics and no duplicate admin organization", () => {
  const page = createPage();
  const options = React.Children.toArray(page.renderOrganizationOptions()) as Array<React.ReactElement<any>>;

  expect(options.map(option => option.props.value)).toEqual(["admin", "engineering"]);
  expect(options[0].props.label).toBe("admin (Shared)");
  expect(options[1].props.label).toBe("Engineering");
});

test("keeps provider-specific tooltip copy available in zh and en locales", async() => {
  await useTestLanguage("en");
  expect(i18next.t("provider:Provider category - Tooltip")).toContain("OAuth sign-in");
  expect(i18next.t("provider:Email regex - Tooltip")).toContain("OAuth Provider");

  await useTestLanguage("zh");
  expect(i18next.t("provider:Provider category - Tooltip")).toContain("OAuth 登录");
  expect(i18next.t("provider:Email regex - Tooltip")).toContain("OAuth Provider");
});

test("renders WeCom setup guide as a full-width legacy form row", () => {
  const page = createPage();
  const view = render(<>{page.renderWeComGuide({type: "WeCom", subType: "Internal", method: "Normal"})}</>);

  expect(view.container.querySelector(".provider-edit-guide-row.admin-large-edit-full-width-row")).not.toBeNull();
  expect(view.getByText("WeCom web login setup")).not.toBeNull();
});

test("keeps credential labels aligned with provider category and type contracts", () => {
  const page = createPage() as any;
  const getText = (node: React.ReactNode) => {
    const view = render(<>{node}</>);
    const text = view.container.textContent || "";
    view.unmount();
    return text;
  };
  const cases = [
    [{category: "OAuth", type: "Apple"}, ["Service ID identifier", "Team ID", "Key ID", "Key text"]],
    [{category: "OAuth", type: "DingTalk"}, ["AppKey", "AppSecret", "Client ID 2", "Client secret 2"]],
    [{category: "Email", type: "SMTP"}, ["Username", "Password", "From address", "From name"]],
    [{category: "SMS", type: "Volc Engine SMS"}, ["Access key", "Secret access key", "Client ID 2", "Client secret 2"]],
    [{category: "SMS", type: "Huawei Cloud SMS"}, ["App key", "App secret", "Client ID 2", "Client secret 2"]],
    [{category: "SMS", type: "UCloud SMS"}, ["Public key", "Private Key", "Client ID 2", "Client secret 2"]],
    [{category: "SMS", type: "Msg91 SMS"}, ["Sender Id", "Auth Key", "Client ID 2", "Client secret 2"]],
    [{category: "Captcha", type: "Aliyun Captcha"}, ["Access key", "Secret access key", "Scene", "App key"]],
    [{category: "Notification", type: "DingTalk"}, ["Access key", "Secret key", "Client ID 2", "Client secret 2"]],
    [{category: "Notification", type: "WeCom"}, ["Client ID", "Endpoint", "Client ID 2", "Client secret 2"]],
    [{category: "ID Verification", type: "Alibaba Cloud"}, ["Access key", "Secret access key", "Client ID 2", "Client secret 2"]],
    [{category: "Storage", type: "Google Cloud Storage"}, ["Client ID", "Service account JSON", "Client ID 2", "Client secret 2"]],
  ] as const;

  cases.forEach(([provider, expected]) => {
    const actual = [
      getText(page.getClientIdLabel(provider)),
      getText(page.getClientSecretLabel(provider)),
      getText(page.getClientId2Label(provider)),
      getText(page.getClientSecret2Label(provider)),
    ];
    expected.forEach((label, index) => expect(actual[index]).toContain(label));
  });
});

test("keeps subtype, app-id and notification receiver fields available for supported providers", () => {
  const page = createPage() as any;

  expect(page.getProviderSubTypeOptions("WeCom").map((item: any) => item.id)).toEqual(["Internal", "Third-party"]);
  expect(page.getProviderSubTypeOptions("Infoflow").map((item: any) => item.id)).toEqual(["Internal", "Third-party"]);
  expect(page.getProviderSubTypeOptions("WeChat").map((item: any) => item.id)).toEqual(["Web", "Mobile"]);
  expect(page.getProviderSubTypeOptions("GitHub")).toEqual([]);

  const appIdProviders = [
    {category: "OAuth", type: "WeCom", subType: "Internal"},
    {category: "OAuth", type: "Infoflow"},
    {category: "OAuth", type: "AzureADB2C"},
    {category: "SMS", type: "Twilio SMS"},
    {category: "SMS", type: "Tencent Cloud SMS"},
    {category: "SMS", type: "Volc Engine SMS"},
    {category: "SMS", type: "Huawei Cloud SMS"},
    {category: "SMS", type: "Amazon SNS"},
    {category: "SMS", type: "Baidu Cloud SMS"},
    {category: "SMS", type: "Infobip SMS"},
    {category: "SMS", type: "UCloud SMS"},
    {category: "Email", type: "SUBMAIL"},
    {category: "Notification", type: "Viber"},
    {category: "Notification", type: "Line"},
    {category: "Notification", type: "CUCloud"},
  ];
  appIdProviders.forEach(provider => expect(page.getAppIdRow({...baseProvider, ...provider})).not.toBeNull());
  expect(page.getAppIdRow(baseProvider)).toBeNull();

  ["Telegram", "Custom HTTP", "Matrix"].forEach(type => {
    const view = render(<>{page.getReceiverRow({...baseProvider, type})}</>);
    expect(view.container.querySelector("input")).not.toBeNull();
    view.unmount();
  });
  const defaultReceiver = render(<>{page.getReceiverRow(baseProvider)}</>);
  expect(defaultReceiver.getByText("Test Notification")).not.toBeNull();
});

test("updates every user, email and SMS mapping field through rendered controls", () => {
  const page = createPage() as any;
  const updateMapping = jest.spyOn(page, "updateUserMappingField");
  [page.renderUserMappingInput(), page.renderEmailMappingInput(), page.renderSmsMappingInput()].forEach(node => {
    collectElementsByType(node, Input).forEach(input => {
      elementProps<{onChange: (event: {target: {value: string}}) => void}>(input).onChange({target: {value: "mapped"}});
    });
  });

  expect(updateMapping).toHaveBeenCalledWith("id", "mapped");
  expect(updateMapping).toHaveBeenCalledWith("fromAddress", "mapped");
  expect(updateMapping).toHaveBeenCalledWith("phoneNumber", "mapped");
});

test("initializes an add draft without loading or deleting a provider", async() => {
  const getProvider = jest.spyOn(ProviderBackend, "getProvider").mockResolvedValue({status: "ok", data: baseProvider} as any);
  jest.spyOn(OrganizationBackend, "getOrganizations").mockResolvedValue({status: "ok", data: []});
  jest.spyOn(CertBackend, "getCerts").mockResolvedValue({status: "ok", data: []} as any);
  const draft = {...baseProvider, userMapping: undefined};
  const page = new ProviderEditPage({
    match: {params: {organizationName: draft.owner, providerName: draft.name}},
    location: {state: {mode: "add", provider: draft}},
    history: {push: jest.fn()},
    account: {owner: draft.owner, name: "admin", isAdmin: true},
  } as any) as unknown as PageHarness;
  page.UNSAFE_componentWillMount();
  await flushPromises();

  expect(getProvider).not.toHaveBeenCalled();
  expect(page.state.provider.userMapping).toEqual(expect.objectContaining({id: "id", username: "username"}));
  expect(() => page.renderProvider()).not.toThrow();

  page.updateUserMappingField("id", "mutated-id");
  const nextDraftPage = new ProviderEditPage({
    match: {params: {organizationName: draft.owner, providerName: "next-draft"}},
    location: {state: {mode: "add", provider: {...draft, name: "next-draft", userMapping: undefined}}},
    history: {push: jest.fn()},
    account: {owner: draft.owner, name: "admin", isAdmin: true},
  } as any) as unknown as PageHarness;
  expect(nextDraftPage.state.provider.userMapping.id).toBe("id");

  const addPage = createPage({mode: "add"});
  const deleteProvider = jest.spyOn(addPage, "deleteProvider").mockImplementation(() => undefined);
  const view = render(<>{addPage.renderProvider()}</>);

  fireEvent.click(view.getByText("Cancel"));

  expect(deleteProvider).not.toHaveBeenCalled();
});

test("defaults new target Provider drafts to system without migrating edit records", () => {
  const createDraftPage = (mode: "add" | "edit", tlsPolicy?: string) => new ProviderEditPage({
    match: {params: {organizationName: "engineering", providerName: "adfs-main"}},
    location: {state: {mode, provider: {...baseProvider, type: "ADFS", name: "adfs-main", tlsPolicy}}},
    history: {push: jest.fn()},
    account: {owner: "engineering", name: "admin", isAdmin: true},
  } as any) as unknown as PageHarness;

  expect(createDraftPage("add").state.provider.tlsPolicy).toBe("system");
  expect(createDraftPage("add", "").state.provider.tlsPolicy).toBe("system");
  expect(createDraftPage("edit").state.provider.tlsPolicy).toBe("");
  expect(createDraftPage("edit", "").state.provider.tlsPolicy).toBe("");
});

([
  [{category: "OAuth", type: "ADFS"}, true],
  [{category: "Email", type: "Default"}, true],
  [{category: "Email", type: "SUBMAIL"}, true],
  [{category: "Email", type: "Custom HTTP Email"}, false],
  [{category: "Email", type: "Azure ACS"}, false],
  [{category: "OAuth", type: "GitHub"}, false],
] as Array<[{category: string; type: string}, boolean]>).forEach(([providerType, visible]) => {
  test(`shows enterprise TLS controls for ${providerType.category}/${providerType.type}: ${visible}`, () => {
    const page = createPage();
    page.state.provider = {...page.state.provider, ...providerType, tlsPolicy: "system"};
    const view = render(<>{page.renderProviderConfigurationContent(page.state.provider)}</>);

    expect(view.queryByText("TLS policy") !== null).toBe(visible);
  });
});

test("keeps legacy Provider policy empty until an explicit selection is saved", async() => {
  const page = createPage();
  page.state.provider = {...page.state.provider, type: "ADFS", tlsPolicy: "", cert: ""};
  const updateProvider = jest.spyOn(ProviderBackend, "updateProvider").mockResolvedValue({status: "ok"} as any);
  jest.spyOn(Setting, "showMessage").mockImplementation(() => undefined);
  const view = render(<>{page.renderProviderConfigurationContent(page.state.provider)}</>);

  expect(view.getByText("TLS policy pending migration")).not.toBeNull();
  page.submitProviderEdit(false);
  await flushPromises();

  expect(updateProvider).toHaveBeenCalledWith("engineering", "github-main", expect.objectContaining({tlsPolicy: ""}));
});

([
  [{tlsPolicy: "future-mode", cert: ""}, "supported TLS policy"],
  [{tlsPolicy: "custom-ca", cert: ""}, "SSL certificate"],
  [{tlsPolicy: "custom-ca", cert: "missing-ca"}, "unavailable"],
  [{tlsPolicy: "system", cert: "cert-main"}, "Clear the custom CA certificate"],
] as Array<[Record<string, unknown>, string]>).forEach(([tlsConfig, message]) => {
  test(`blocks invalid Provider TLS policy: ${String(tlsConfig.tlsPolicy)}/${String(tlsConfig.cert)}`, () => {
    const page = createPage();
    page.state.provider = {...page.state.provider, type: "ADFS", ...tlsConfig};
    const updateProvider = jest.spyOn(ProviderBackend, "updateProvider");
    const showMessage = jest.spyOn(Setting, "showMessage").mockImplementation(() => undefined);

    page.submitProviderEdit(false);

    expect(updateProvider).not.toHaveBeenCalled();
    expect(showMessage).toHaveBeenCalledWith("error", expect.stringContaining(message));
    expect(JSON.stringify(showMessage.mock.calls)).not.toContain("future-mode");
    expect(JSON.stringify(showMessage.mock.calls)).not.toContain("missing-ca");
  });
});

test("applies explicit Provider policy atomically and sends one request while saving", async() => {
  const page = createPage();
  page.state.provider = {...page.state.provider, type: "ADFS", tlsPolicy: "custom-ca", cert: "cert-main"};
  page.updateProviderTlsPolicy("system");
  expect(page.state.provider).toEqual(expect.objectContaining({tlsPolicy: "system", cert: ""}));

  let finishSave: ((value: {status: string}) => void) | undefined;
  const pendingSave = new Promise<{status: string}>(resolve => {finishSave = resolve;});
  const updateProvider = jest.spyOn(ProviderBackend, "updateProvider").mockReturnValue(pendingSave as any);
  jest.spyOn(Setting, "showMessage").mockImplementation(() => undefined);

  const realSetState = page.setState;
  page.setState = jest.fn() as unknown as typeof page.setState;
  page.submitProviderEdit(false);
  page.submitProviderEdit(false);
  expect(updateProvider).toHaveBeenCalledTimes(1);

  page.setState = realSetState;
  finishSave?.({status: "ok"});
  await flushPromises();
  expect(page.state.submitting).toBe(false);
});

([
  ["Custom HTTP Email", undefined, {fromName: "fromName", toAddress: "toAddress"}],
  ["Custom HTTP SMS", {}, {phoneNumber: "phoneNumber", content: "content"}],
  ["GitHub", undefined, {id: "id", username: "username"}],
] as Array<[string, Record<string, string> | undefined, Record<string, string>]>).forEach(([type, userMapping, expectedMapping]) => {
  test(`loads ${type} providers with the mapping required by their editor`, async() => {
    const page = createPage();
    jest.spyOn(ProviderBackend, "getProvider").mockResolvedValue({
      status: "ok",
      data: {...baseProvider, type, userMapping},
    } as any);

    page.getProvider();
    await flushPromises();

    expect(page.state.provider.userMapping).toEqual(expect.objectContaining(expectedMapping));
  });
});

test("redirects missing providers and surfaces load failures", async() => {
  const page = createPage();
  const showMessage = jest.spyOn(Setting, "showMessage").mockImplementation(() => undefined);
  const getProvider = jest.spyOn(ProviderBackend, "getProvider")
    .mockResolvedValueOnce({status: "ok", data: null} as any)
    .mockResolvedValueOnce({status: "error", data: baseProvider, msg: "not allowed"} as any);

  page.getProvider();
  await flushPromises();
  expect(page.props.history.push).toHaveBeenCalledWith("/404");

  page.getProvider();
  await flushPromises();
  expect(getProvider).toHaveBeenLastCalledWith("engineering", "github-main");
  expect(showMessage).toHaveBeenCalledWith("error", "not allowed");
});

test("loads organizations and certificates only through their allowed boundaries", async() => {
  const page = createPage();
  const getOrganizations = jest.spyOn(OrganizationBackend, "getOrganizations").mockResolvedValue({
    status: "ok",
    data: [{name: "engineering", displayName: "Engineering"}],
  });
  const getCerts = jest.spyOn(CertBackend, "getCerts").mockResolvedValue({
    status: "ok",
    data: [{name: "cert-engineering"}],
  } as any);

  page.getOrganizations();
  page.getCerts("engineering");
  await flushPromises();

  expect(page.state.organizations).toEqual([{name: "engineering", displayName: "Engineering"}]);
  expect(page.state.certs).toEqual([{name: "cert-engineering"}]);

  jest.spyOn(Setting, "isAdminUser").mockReturnValue(false);
  page.getOrganizations();
  expect(getOrganizations).toHaveBeenCalledTimes(1);

  getCerts.mockResolvedValueOnce({status: "error", data: [{name: "ignored"}]} as any);
  page.getCerts("other");
  await flushPromises();
  expect(page.state.certs).toEqual([{name: "cert-engineering"}]);
});

test("keeps owner, numeric and provider-specific defaults consistent while editing", () => {
  const page = createPage();
  const getCerts = jest.spyOn(page, "getCerts").mockImplementation(() => undefined);
  page.state.provider.cert = "old-cert";

  page.updateProviderField("owner", "platform");
  page.updateProviderField("port", "1812");
  page.state.provider.type = "WeCom";
  page.updateProviderField("displayName", "Enterprise WeCom");

  expect(page.state.provider).toEqual(expect.objectContaining({
    owner: "platform",
    cert: "",
    port: 1812,
    displayName: "Enterprise WeCom",
    subType: "Internal",
    method: "Normal",
    scopes: "snsapi_privateinfo",
  }));
  expect(getCerts).toHaveBeenCalledWith("platform");
});

test("wires every shared basic field and organization search to the provider state", () => {
  const page = createPage();
  page.state.provider = {
    ...page.state.provider,
    type: "WeCom",
    subType: "Internal",
    method: "Normal",
    scopes: "snsapi_privateinfo",
    disableSsl: false,
  };
  jest.spyOn(page, "getCerts").mockImplementation(() => undefined);
  const section = page.renderProviderBasicSection(page.state.provider);
  const inputs = collectElementsByType(section, Input);
  const selects = collectElementsByType(section, Select);
  const switches = collectElementsByType(section, Switch);

  elementProps<{onChange: (event: {target: {value: string}}) => void}>(findElementByValue(inputs, "github-main")).onChange({target: {value: "provider-renamed"}});
  elementProps<{onChange: (event: {target: {value: string}}) => void}>(findElementByValue(inputs, "GitHub Main")).onChange({target: {value: "Provider Renamed"}});
  elementProps<{onChange: (event: {target: {value: string}}) => void}>(findElementByValue(inputs, baseProvider.providerUrl)).onChange({target: {value: "https://provider.example.test"}});

  const ownerSelect = elementProps<{
    filterOption: (input: string, option?: {label?: unknown; value?: unknown}) => boolean;
    onChange: (value: string) => void;
      }>(findElementByValue(selects, "engineering"));
  expect(ownerSelect.filterOption("engine", {label: "Engineering", value: "engineering"})).toBe(true);
  expect(ownerSelect.filterOption("missing", undefined)).toBe(false);
  ownerSelect.onChange("platform");

  elementProps<{onChange: (value: string) => void}>(findElementByValue(selects, "OAuth")).onChange("OAuth");
  elementProps<{onChange: (value: string) => void}>(findElementByValue(selects, "WeCom")).onChange("WeCom");
  elementProps<{onChange: (value: string) => void}>(findElementByValue(selects, "Internal")).onChange("Third-party");
  elementProps<{onChange: (value: string) => void}>(findElementByValue(selects, "Normal")).onChange("Silent");
  elementProps<{onChange: (value: string) => void}>(findElementByValue(selects, "snsapi_privateinfo")).onChange("snsapi_userinfo");
  elementProps<{onChange: (checked: boolean) => void}>(switches[0]).onChange(true);

  expect(page.state.provider).toEqual(expect.objectContaining({
    name: "provider-renamed",
    displayName: "Provider Renamed",
    owner: "platform",
    category: "OAuth",
    type: "WeCom",
    subType: "Third-party",
    method: "Silent",
    scopes: "snsapi_userinfo",
    disableSsl: true,
    providerUrl: "https://provider.example.test",
  }));
});

test("keeps WeChat platform selection coherent as credentials change", () => {
  const page = createPage();
  page.state.provider = {
    ...page.state.provider,
    type: "WeChat",
    clientId: "",
    clientId2: "open-app",
    disableSsl: false,
  };

  page.updateProviderField("clientId", "");
  expect(page.state.provider).toEqual(expect.objectContaining({signName: "media", disableSsl: true}));

  page.state.provider.clientId = "media-app";
  page.state.provider.clientId2 = "";
  page.updateProviderField("clientId2", "");
  expect(page.state.provider).toEqual(expect.objectContaining({signName: "open", disableSsl: false}));
});

([
  ["OAuth", {type: "Google"}],
  ["Email", {type: "Default", host: "smtp.example.com", port: 465, sslMode: "Auto", receiver: "admin@example.test"}],
  ["SMS", {type: "Twilio SMS"}],
  ["Storage", {type: "AWS S3"}],
  ["SAML", {type: "Keycloak"}],
  ["Payment", {type: "PayPal"}],
  ["Captcha", {type: "Default"}],
  ["Notification", {type: "Telegram"}],
  ["Face ID", {type: "Alibaba Cloud Facebody"}],
  ["MFA", {type: "RADIUS", host: "", port: 1812}],
  ["ID Verification", {type: "Jumio", endpoint: ""}],
] as Array<[string, Record<string, unknown>]>).forEach(([category, expectedDefaults]) => {
  test(`applies meaningful defaults when switching to the ${category} category`, () => {
    const page = createPage();

    page.updateProviderCategory(category);

    expect(page.state.provider).toEqual(expect.objectContaining({category, ...expectedDefaults}));
  });
});

test("does not expose or accept the retired Web3 provider category", () => {
  const page = createPage();
  const initialProvider = {...page.state.provider};
  const options = React.Children.toArray(page.renderProviderCategoryOptions()) as React.ReactElement[];

  expect(options.map(option => option.props.value)).not.toContain("Web3");
  page.updateProviderCategory("Web3");
  expect(page.state.provider).toEqual(initialProvider);
});

([
  ["Storage", "Local File System", {domain: "https://admin.example.test"}],
  ["OAuth", "Custom OAuth", {
    customAuthUrl: "https://admin.example.test/login/oauth/authorize",
    scopes: "openid profile email",
    customTokenUrl: "https://admin.example.test/api/login/oauth/access_token",
    customUserInfoUrl: "https://admin.example.test/api/userinfo",
  }],
  ["SMS", "Custom HTTP SMS", {endpoint: "https://example.com/send-custom-http-sms", method: "GET", title: "code"}],
  ["Email", "Custom HTTP Email", {endpoint: "https://example.com/send-custom-http-email", method: "POST"}],
  ["OAuth", "WeCom", {subType: "Internal", method: "Normal", scopes: "snsapi_privateinfo"}],
  ["Notification", "Custom HTTP", {method: "GET", title: ""}],
] as Array<[string, string, Record<string, unknown>]>).forEach(([category, type, expectedDefaults]) => {
  test(`applies meaningful defaults when switching ${category} providers to ${type}`, () => {
    const page = createPage();
    page.state.provider.category = category;
    jest.spyOn(Setting, "getFullServerUrl").mockReturnValue("https://admin.example.test");

    page.updateProviderType(type);

    expect(page.state.provider).toEqual(expect.objectContaining({category, type, ...expectedDefaults}));
  });
});

test("enforces required user mappings while allowing optional mappings to be cleared", () => {
  const page = createPage();
  const showMessage = jest.spyOn(Setting, "showMessage").mockImplementation(() => undefined);

  page.updateUserMappingField("id", "");
  expect(page.state.provider.userMapping.id).toBe("id");
  expect(showMessage).toHaveBeenCalledWith("error", expect.any(String));

  page.updateUserMappingField("email", "");
  expect(page.state.provider.userMapping.email).toBeUndefined();

  page.updateUserMappingField("email", "mail");
  expect(page.state.provider.userMapping.email).toBe("mail");

  page.state.provider.type = "Custom HTTP Email";
  page.state.provider.userMapping.fromName = "fromName";
  page.updateUserMappingField("fromName", "");
  expect(page.state.provider.userMapping.fromName).toBe("fromName");
});

test("blocks invalid Lark credentials before saving", () => {
  const page = createPage();
  page.state.provider = {...page.state.provider, type: "Lark", clientId: "", clientSecret: ""};
  const updateProvider = jest.spyOn(ProviderBackend, "updateProvider");
  const showMessage = jest.spyOn(Setting, "showMessage").mockImplementation(() => undefined);

  page.submitProviderEdit(false);

  expect(updateProvider).not.toHaveBeenCalled();
  expect(showMessage).toHaveBeenCalledWith("error", expect.stringContaining("App ID"));
});

([
  [false, "/providers/platform/github-renamed"],
  [true, "/providers"],
] as Array<[boolean, string]>).forEach(([exitAfterSave, expectedPath]) => {
  test(`saves valid providers and follows the ${exitAfterSave ? "return" : "stay"} mode`, async() => {
    const page = createPage();
    page.state.provider = {...page.state.provider, owner: "platform", name: "github-renamed"};
    const updateProvider = jest.spyOn(ProviderBackend, "updateProvider").mockResolvedValue({status: "ok"} as any);
    const showMessage = jest.spyOn(Setting, "showMessage").mockImplementation(() => undefined);

    page.submitProviderEdit(exitAfterSave);
    await flushPromises();

    expect(updateProvider).toHaveBeenCalledWith("engineering", "github-main", expect.objectContaining({
      owner: "platform",
      name: "github-renamed",
    }));
    expect(page.state).toEqual(expect.objectContaining({owner: "platform", providerName: "github-renamed"}));
    expect(page.props.history.push).toHaveBeenCalledWith(expectedPath);
    expect(showMessage).toHaveBeenCalledWith("success", expect.any(String));
  });
});

test("restores the persisted name on save rejection and surfaces connection failures", async() => {
  const page = createPage();
  const showMessage = jest.spyOn(Setting, "showMessage").mockImplementation(() => undefined);
  jest.spyOn(ProviderBackend, "updateProvider")
    .mockResolvedValueOnce({status: "error", msg: "duplicate name"} as any)
    .mockRejectedValueOnce(new Error("offline"));
  page.state.provider.name = "duplicate";

  page.submitProviderEdit(false);
  await flushPromises();
  expect(page.state.provider.name).toBe("github-main");
  expect(showMessage).toHaveBeenCalledWith("error", expect.stringContaining("duplicate name"));

  page.submitProviderEdit(false);
  await flushPromises();
  expect(showMessage).toHaveBeenCalledWith("error", expect.stringContaining("offline"));
});

test("keeps an edited provider draft name when add is rejected", async() => {
  const page = createPage({mode: "add"});
  jest.spyOn(ProviderBackend, "addProvider").mockResolvedValueOnce({status: "error", msg: "duplicate"} as any);
  page.state.provider.name = "custom-draft";

  page.submitProviderEdit(false);
  await flushPromises();

  expect(page.state.provider.name).toBe("custom-draft");
});

test("creates a provider once and uses update for the next save", async() => {
  const page = createPage({mode: "add"});
  const addProvider = jest.spyOn(ProviderBackend, "addProvider").mockResolvedValue({status: "ok"} as any);
  const updateProvider = jest.spyOn(ProviderBackend, "updateProvider").mockResolvedValue({status: "ok"} as any);

  page.submitProviderEdit(false);
  await flushPromises();
  page.submitProviderEdit(false);
  await flushPromises();

  expect(addProvider).toHaveBeenCalledTimes(1);
  expect(updateProvider).toHaveBeenCalledTimes(1);
  expect(page.state.mode).toBe("edit");
  expect(page.state.providerName).toBe("github-main");
});

test("handles explicit deletion success, backend rejection and connection failure", async() => {
  const page = createPage();
  const showMessage = jest.spyOn(Setting, "showMessage").mockImplementation(() => undefined);
  jest.spyOn(ProviderBackend, "deleteProvider")
    .mockResolvedValueOnce({status: "ok"} as any)
    .mockResolvedValueOnce({status: "error", msg: "in use"} as any)
    .mockRejectedValueOnce(new Error("offline"));

  page.deleteProvider();
  await flushPromises();
  expect(page.props.history.push).toHaveBeenCalledWith("/providers");

  page.deleteProvider();
  await flushPromises();
  expect(showMessage).toHaveBeenCalledWith("error", expect.stringContaining("in use"));

  page.deleteProvider();
  await flushPromises();
  expect(showMessage).toHaveBeenCalledWith("error", expect.stringContaining("offline"));
});

describe("validateWeComProviderFields", () => {
  test("requires Agent ID for Internal + Normal mode", () => {
    const result = validateWeComProviderFields({
      type: "WeCom",
      subType: "Internal",
      method: "Normal",
      clientId: "wx-corp-id",
      clientSecret: "corp-secret",
      appId: "",
      scopes: "snsapi_privateinfo",
    }, (key: string) => key === "provider:This field is required" ? "is required" : key);

    expect(result).toBe("Agent ID is required");
  });

  test("passes when required Internal + Normal fields are present", () => {
    const result = validateWeComProviderFields({
      type: "WeCom",
      subType: "Internal",
      method: "Normal",
      clientId: "wx-corp-id",
      clientSecret: "corp-secret",
      appId: "1000001",
      scopes: "snsapi_privateinfo",
    }, (key: string) => key);

    expect(result).toBe("");
  });
});
