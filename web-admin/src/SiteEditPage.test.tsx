/* eslint-env jest */
import React from "react";
import {act, cleanup, render} from "@testing-library/react";
import {expect, jest} from "@jest/globals";
import SiteEditPage from "./SiteEditPage";
import * as SiteBackend from "./backend/SiteBackend";
import * as RuleBackend from "./backend/RuleBackend";
import * as CertBackend from "./backend/CertBackend";
import * as ApplicationBackend from "./backend/ApplicationBackend";
import * as ProviderBackend from "./backend/ProviderBackend";
import * as OrganizationBackend from "./backend/OrganizationBackend";
import * as Setting from "./Setting";

type LooseMock = {
  (...args: unknown[]): unknown;
  mockResolvedValue: (value: unknown) => LooseMock;
  mockResolvedValueOnce: (value: unknown) => LooseMock;
  mockRejectedValueOnce: (value: unknown) => LooseMock;
  mockReturnValue: (value: unknown) => LooseMock;
};

type SiteBackendMock = Pick<Record<keyof typeof SiteBackend, LooseMock>, "getSite" | "updateSite">;
type RuleBackendMock = Pick<Record<keyof typeof RuleBackend, LooseMock>, "getRules">;
type CertBackendMock = Pick<Record<keyof typeof CertBackend, LooseMock>, "getCerts">;
type ApplicationBackendMock = Pick<Record<keyof typeof ApplicationBackend, LooseMock>, "getApplicationsByOrganization">;
type ProviderBackendMock = Pick<Record<keyof typeof ProviderBackend, LooseMock>, "getProviders">;
type OrganizationBackendMock = Pick<Record<keyof typeof OrganizationBackend, LooseMock>, "getOrganizations">;

interface TestSiteRecord {
  owner: string;
  name: string;
  displayName: string;
  tag: string;
  domain: string;
  otherDomains: string[];
  needRedirect: boolean;
  disableVerbose: boolean;
  rules: string[];
  enableAlert: boolean;
  alertInterval: number;
  alertTryTimes: number;
  alertProviders: string[];
  challenges: string[];
  host: string;
  port: number;
  hosts: string[];
  publicIp: string;
  sslMode: string;
  sslCert: string;
  casdoorApplication: string;
  status: string;
  [key: string]: unknown;
}

jest.mock("./backend/SiteBackend", () => {
  const {jest: factoryJest} = require("@jest/globals");
  return {
    getGlobalSites: factoryJest.fn(),
    getSites: factoryJest.fn(),
    getSite: factoryJest.fn(),
    updateSite: factoryJest.fn(),
    addSite: factoryJest.fn(),
    deleteSite: factoryJest.fn(),
  };
});

jest.mock("./backend/RuleBackend", () => {
  const {jest: factoryJest} = require("@jest/globals");
  return {
    getRules: factoryJest.fn(),
  };
});

jest.mock("./backend/CertBackend", () => {
  const {jest: factoryJest} = require("@jest/globals");
  return {
    getCerts: factoryJest.fn(),
  };
});

jest.mock("./backend/ApplicationBackend", () => {
  const {jest: factoryJest} = require("@jest/globals");
  return {
    getApplicationsByOrganization: factoryJest.fn(),
  };
});

jest.mock("./backend/ProviderBackend", () => {
  const {jest: factoryJest} = require("@jest/globals");
  return {
    getProviders: factoryJest.fn(),
  };
});

jest.mock("./backend/OrganizationBackend", () => {
  const {jest: factoryJest} = require("@jest/globals");
  return {
    getOrganizations: factoryJest.fn(),
  };
});

jest.mock("./table/RuleTable", () => {
  const ReactForMock = require("react");
  return function MockRuleTable(props: {title: string}) {
    return ReactForMock.createElement("div", {"data-testid": "rule-table"}, props.title);
  };
});

const siteBackendMock = SiteBackend as unknown as SiteBackendMock;
const ruleBackendMock = RuleBackend as unknown as RuleBackendMock;
const certBackendMock = CertBackend as unknown as CertBackendMock;
const applicationBackendMock = ApplicationBackend as unknown as ApplicationBackendMock;
const providerBackendMock = ProviderBackend as unknown as ProviderBackendMock;
const organizationBackendMock = OrganizationBackend as unknown as OrganizationBackendMock;
const fs = require("fs") as {existsSync: (filePath: string) => boolean};
const path = require("path") as {join: (...parts: string[]) => string};
const {fireEvent} = require("@testing-library/react") as {
  fireEvent: {
    change: (element: Element | null, event: unknown) => boolean;
  };
};

type ElementWithProps = React.ReactElement<Record<string, unknown>>;

let consoleErrorSpy: {mockRestore: () => void};

const adminAccount = {owner: "admin", tag: "", isAdmin: true};
const site: TestSiteRecord = {
  owner: "engineering",
  name: "site-one",
  displayName: "Site One",
  tag: "edge-a",
  domain: "site.example.invalid",
  otherDomains: ["www.example.invalid"],
  needRedirect: false,
  disableVerbose: false,
  rules: ["engineering/rule-one"],
  enableAlert: true,
  alertInterval: 60,
  alertTryTimes: 3,
  alertProviders: ["Email/mail"],
  challenges: ["captcha"],
  host: "backend.example.invalid",
  port: 8443,
  hosts: ["backend-a:8443"],
  publicIp: "203.0.113.10",
  sslMode: "HTTPS Only",
  sslCert: "cert-one",
  casdoorApplication: "admin-app",
  status: "Active",
};

function createHistory() {
  return {
    push: jest.fn(),
  };
}

function createProps(history = createHistory()) {
  return {
    account: adminAccount,
    history,
    match: {params: {organizationName: "engineering", siteName: "site-one"}},
  };
}

function createPage(options: {history?: ReturnType<typeof createHistory>; siteOverride?: Partial<TestSiteRecord>} = {}) {
  const page = new SiteEditPage(createProps(options.history));
  page.setState = ((stateUpdate: unknown, callback?: () => void) => {
    const nextState = typeof stateUpdate === "function"
      ? (stateUpdate as (state: unknown, props: unknown) => unknown)(page.state, page.props)
      : stateUpdate;
    page.state = {...page.state, ...(nextState as Record<string, unknown>)};
    callback?.();
  }) as typeof page.setState;
  page.state = {
    ...page.state,
    site: {
      ...site,
      ...options.siteOverride,
    },
    certs: [{name: "cert-one"}],
    rules: [{owner: "engineering", name: "rule-one"}],
    applications: [{name: "admin-app"}],
    providers: ["Email/mail"],
    organizations: [{name: "engineering"}, {name: "platform"}],
  };
  return page;
}

function flattenElements(node: React.ReactNode): ElementWithProps[] {
  const elements: ElementWithProps[] = [];
  React.Children.forEach(node, child => {
    if (!React.isValidElement(child)) {
      return;
    }

    const element = child as ElementWithProps;
    elements.push(element);
    elements.push(...flattenElements((element.props as {children?: React.ReactNode}).children));
  });
  return elements;
}

function findControlByValue(elements: ElementWithProps[], value: unknown) {
  const element = elements.find(item => {
    const props = item.props as {value?: unknown; onChange?: unknown};
    return Object.is(props.value, value) && typeof props.onChange === "function";
  });

  if (!element) {
    throw new Error(`Missing control for value: ${String(value)}`);
  }
  return element;
}

function findArrayControl(elements: ElementWithProps[], expectedItem: string) {
  const element = elements.find(item => {
    const props = item.props as {value?: unknown; onChange?: unknown};
    return Array.isArray(props.value) && props.value.includes(expectedItem) && typeof props.onChange === "function";
  });

  if (!element) {
    throw new Error(`Missing array control for value: ${expectedItem}`);
  }
  return element;
}

function callValueChange(element: ElementWithProps, value: unknown) {
  const onChange = (element.props as {onChange: (value: unknown) => void}).onChange;
  onChange(value);
}

function callInputChange(element: ElementWithProps, value: string) {
  const onChange = (element.props as {onChange: (event: {target: {value: string}}) => void}).onChange;
  onChange({target: {value}});
}

async function flushPromises() {
  await act(async() => {
    await Promise.resolve();
  });
}

describe("SiteEditPage", () => {
  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation((message?: unknown, ...args: unknown[]) => {
      if (`${message}`.includes("ReactDOM.render is no longer supported")) {
        return;
      }

      throw new Error([message, ...args].map(item => `${item}`).join(" "));
    });
    jest.spyOn(Setting, "showMessage").mockImplementation(() => {});
    jest.spyOn(Setting, "isAdminUser").mockReturnValue(true);
    siteBackendMock.getSite.mockResolvedValue({status: "ok", data: {...site}});
    siteBackendMock.updateSite.mockResolvedValue({status: "ok"});
    certBackendMock.getCerts.mockResolvedValue({status: "ok", data: [{name: "cert-one"}]});
    ruleBackendMock.getRules.mockResolvedValue({status: "ok", data: [{owner: "engineering", name: "rule-one"}]});
    applicationBackendMock.getApplicationsByOrganization.mockResolvedValue({status: "ok", data: [{name: "admin-app"}]});
    providerBackendMock.getProviders.mockResolvedValue({status: "ok", data: [
      {category: "Email", name: "mail"},
      {category: "SMS", name: "sms"},
      {category: "Storage", name: "ignored"},
    ]});
    organizationBackendMock.getOrganizations.mockResolvedValue({status: "ok", data: [{name: "engineering"}, {name: "platform"}]});
  });

  afterEach(() => {
    cleanup();
    consoleErrorSpy.mockRestore();
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  test("is migrated from JavaScript to TSX", () => {
    expect(fs.existsSync(path.join(__dirname, "SiteEditPage.tsx"))).toBe(true);
    expect(fs.existsSync(path.join(__dirname, "SiteEditPage.js"))).toBe(false);
  });

  test("loads site, rule, cert, application, provider and organization data", async() => {
    const page = createPage();

    page.getOrganizations();
    page.getSite();
    page.getCerts();
    page.getRules();
    page.getApplications();
    page.getAlertProviders();
    await flushPromises();

    expect(siteBackendMock.getSite).toHaveBeenCalledWith("engineering", "site-one");
    expect(certBackendMock.getCerts).toHaveBeenCalledWith("engineering");
    expect(ruleBackendMock.getRules).toHaveBeenCalledWith("engineering");
    expect(applicationBackendMock.getApplicationsByOrganization).toHaveBeenCalledWith("admin", "engineering");
    expect(providerBackendMock.getProviders).toHaveBeenCalled();
    expect(organizationBackendMock.getOrganizations).toHaveBeenCalledWith("admin");
    expect(page.state.providers).toEqual(["Email/mail", "SMS/sms"]);
  });

  test("calls the legacy data loaders during unsafe mount", () => {
    const page = createPage();
    jest.spyOn(page, "getOrganizations").mockImplementation(() => {});
    jest.spyOn(page, "getSite").mockImplementation(() => {});
    jest.spyOn(page, "getCerts").mockImplementation(() => {});
    jest.spyOn(page, "getRules").mockImplementation(() => {});
    jest.spyOn(page, "getApplications").mockImplementation(() => {});
    jest.spyOn(page, "getAlertProviders").mockImplementation(() => {});

    page.UNSAFE_componentWillMount();

    expect(page.getOrganizations).toHaveBeenCalled();
    expect(page.getSite).toHaveBeenCalled();
    expect(page.getCerts).toHaveBeenCalled();
    expect(page.getRules).toHaveBeenCalled();
    expect(page.getApplications).toHaveBeenCalled();
    expect(page.getAlertProviders).toHaveBeenCalled();
  });

  test("reports dependent lookup failures", async() => {
    const page = createPage();
    certBackendMock.getCerts.mockResolvedValueOnce({status: "error", msg: "cert failed"});
    ruleBackendMock.getRules.mockResolvedValueOnce({status: "error", msg: "rule failed"});
    applicationBackendMock.getApplicationsByOrganization.mockResolvedValueOnce({status: "error", msg: "app failed"});
    providerBackendMock.getProviders.mockResolvedValueOnce({status: "error", msg: "provider failed"});

    page.getCerts();
    page.getRules();
    page.getApplications();
    page.getAlertProviders();
    await flushPromises();

    expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("cert failed"));
    expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("rule failed"));
    expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("app failed"));
    expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("provider failed"));
  });

  test("renders editable fields and keeps field handlers wired to site state", () => {
    const page = createPage();
    const view = render(<>{page.renderSite()}</>);

    fireEvent.change(view.getByDisplayValue("Site One"), {target: {value: "Site Prime"}});
    fireEvent.change(view.getByDisplayValue("site.example.invalid"), {target: {value: "site-prime.example.invalid"}});

    expect(page.state.site).toEqual(expect.objectContaining({
      displayName: "Site Prime",
      domain: "site-prime.example.invalid",
    }));
    expect(view.container.textContent).toMatch(/site:Rules|治理规则|Rules/);
  });

  test("uses scoped Gateway edit layout hooks", () => {
    const page = createPage();
    const view = render(<>{page.render()}</>);

    expect(view.container.querySelector(".admin-gateway-edit-page")).not.toBeNull();
    expect(view.container.querySelector(".admin-gateway-edit-card")).not.toBeNull();
    expect(view.container.querySelectorAll(".admin-gateway-edit-field-row").length).toBeGreaterThanOrEqual(20);
  });

  test("keeps select, switch, number and RuleTable handlers wired to site state", () => {
    const page = createPage();
    const elements = flattenElements(page.renderSite());
    const switchControls = elements.filter(item => typeof (item.props as {checked?: unknown; onChange?: unknown}).checked === "boolean" && typeof (item.props as {onChange?: unknown}).onChange === "function");

    callValueChange(findControlByValue(elements, "engineering"), "platform");
    callInputChange(findControlByValue(elements, "site-one"), "site-two");
    callInputChange(findControlByValue(elements, "edge-a"), "edge-b");
    callValueChange(findArrayControl(elements, "www.example.invalid"), ["api.example.invalid"]);
    callValueChange(switchControls[0], true);
    callValueChange(switchControls[1], true);
    callValueChange(switchControls[2], false);
    callValueChange(findControlByValue(elements, 60), 120);
    callValueChange(findControlByValue(elements, 3), 5);
    callValueChange(findArrayControl(elements, "Email/mail"), ["SMS/sms"]);
    callValueChange(findArrayControl(elements, "captcha"), ["captcha", "turnstile"]);
    callInputChange(findControlByValue(elements, "backend.example.invalid"), "backend-prime.example.invalid");
    callValueChange(findControlByValue(elements, 8443), 9443);
    callValueChange(findArrayControl(elements, "backend-a:8443"), ["backend-b:9443"]);
    callInputChange(findControlByValue(elements, "203.0.113.10"), "203.0.113.11");
    callValueChange(findControlByValue(elements, "HTTPS Only"), "HTTP");
    callValueChange(findControlByValue(elements, "cert-one"), "cert-two");
    callValueChange(findControlByValue(elements, "admin-app"), "ops-app");
    callValueChange(findControlByValue(elements, "Active"), "Inactive");

    const ruleTable = elements.find(item => typeof (item.props as {onUpdateRules?: unknown}).onUpdateRules === "function");
    (ruleTable?.props as {onUpdateRules: (value: string[]) => void}).onUpdateRules(["engineering/rule-two"]);

    expect(applicationBackendMock.getApplicationsByOrganization).toHaveBeenCalledWith("admin", "platform");
    expect(page.state.site).toEqual(expect.objectContaining({
      owner: "platform",
      name: "site-two",
      tag: "edge-b",
      otherDomains: ["api.example.invalid"],
      needRedirect: true,
      disableVerbose: true,
      rules: ["engineering/rule-two"],
      enableAlert: false,
      alertInterval: 120,
      alertTryTimes: 5,
      alertProviders: ["SMS/sms"],
      challenges: ["captcha", "turnstile"],
      host: "backend-prime.example.invalid",
      port: 9443,
      hosts: ["backend-b:9443"],
      publicIp: "203.0.113.11",
      sslMode: "HTTP",
      sslCert: "cert-two",
      casdoorApplication: "ops-app",
      status: "Inactive",
    }));
  });

  test("renders alert-disabled and unloaded-site shells", () => {
    const alertDisabledPage = createPage({siteOverride: {enableAlert: false}});
    expect(flattenElements(alertDisabledPage.renderSite()).some(item => Object.is((item.props as {value?: unknown}).value, 60))).toBe(false);

    const unloadedPage = new SiteEditPage(createProps());
    expect(React.isValidElement(unloadedPage.render())).toBe(true);

    const loadedPage = createPage();
    jest.spyOn(loadedPage, "renderSite");
    loadedPage.render();
    expect(loadedPage.renderSite).toHaveBeenCalled();
  });

  test("updates owner-dependent application choices", () => {
    const page = createPage();

    page.updateSiteField("owner", "platform");
    page.getApplications("platform");

    expect(page.state.site?.owner).toBe("platform");
    expect(applicationBackendMock.getApplicationsByOrganization).toHaveBeenCalledWith("admin", "platform");
  });

  test("parses numeric legacy fields through Setting helpers", () => {
    expect(new SiteEditPage(createProps()).parseSiteField("score", "42")).toBe(42);
  });

  test("saves site edits, updates route state and reloads the saved site", async() => {
    const history = createHistory();
    const page = createPage({
      history,
      siteOverride: {owner: "platform", name: "site-two", displayName: "Site Two"},
    });
    page.getSite = jest.fn() as unknown as typeof page.getSite;

    page.submitSiteEdit();
    await flushPromises();

    expect(siteBackendMock.updateSite).toHaveBeenCalledWith("engineering", "site-one", expect.objectContaining({
      owner: "platform",
      name: "site-two",
      displayName: "Site Two",
    }));
    expect(history.push).toHaveBeenCalledWith("/sites/platform/site-two");
    expect(page.state.owner).toBe("platform");
    expect(page.state.siteName).toBe("site-two");
    expect(page.getSite).toHaveBeenCalled();
    expect(Setting.showMessage).toHaveBeenCalledWith("success", "Successfully saved");
  });

  test("reports load and save failures without changing API semantics", async() => {
    const page = createPage({siteOverride: {name: "site-renamed"}});
    siteBackendMock.getSite.mockResolvedValueOnce({status: "error", msg: "load failed"});
    siteBackendMock.updateSite.mockResolvedValueOnce({status: "error", msg: "save failed"});
    siteBackendMock.updateSite.mockRejectedValueOnce(new Error("save network"));

    page.getSite();
    await flushPromises();
    expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("load failed"));

    page.submitSiteEdit();
    await flushPromises();
    expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("save failed"));
    expect(page.state.site?.name).toBe("site-one");

    page.submitSiteEdit();
    await flushPromises();
    expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("save network"));
  });
});
