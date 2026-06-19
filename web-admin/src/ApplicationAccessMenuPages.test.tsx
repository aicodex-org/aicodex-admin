/* eslint-env jest */
import React from "react";
import {expect, jest} from "@jest/globals";
import {cleanup, render} from "@testing-library/react";
import * as TestingLibrary from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import CertListPage from "./CertListPage";
import KeyListPage from "./KeyListPage";
import ResourceListPage from "./ResourceListPage";
import WebhookEventListPage from "./WebhookEventListPage";
import WebhookListPage from "./WebhookListPage";
import * as CertBackend from "./backend/CertBackend";
import * as KeyBackend from "./backend/KeyBackend";
import * as ResourceBackend from "./backend/ResourceBackend";
import * as WebhookBackend from "./backend/WebhookBackend";
import * as WebhookEventBackend from "./backend/WebhookEventBackend";
import * as Setting from "./Setting";
import type {LegacyAny} from "./types/legacyPage";

type AdminRouteProps = import("./types/legacyPage").AdminRouteProps;

jest.mock("./common/Editor", () => () => <pre data-testid="editor" />);

const expectAny: any = expect;
const wait = (TestingLibrary as LegacyAny).wait || (TestingLibrary as LegacyAny).waitFor;

const routeProps: AdminRouteProps = {
  account: {
    owner: "org-alpha",
    name: "admin",
    isAdmin: true,
    organization: {name: "org-alpha"},
  },
  history: {push: jest.fn()},
  match: {path: "/", params: {}},
};

function defaultListState(extra: Record<string, LegacyAny> = {}) {
  return {
    data: [],
    loading: false,
    pagination: {current: 1, pageSize: 10, total: 1},
    searchText: "",
    searchedColumn: "",
    formItems: [],
    isAuthorized: true,
    ...extra,
  };
}

function renderLegacyPageTable(page: LegacyAny, element: React.ReactElement) {
  page.state = defaultListState(page.state || {});
  return render(<MemoryRouter>{element}</MemoryRouter>);
}

function attachLegacyState(page: LegacyAny, extra: Record<string, LegacyAny> = {}): LegacyAny {
  page.state = defaultListState(extra);
  page.setState = jest.fn((patch: LegacyAny) => {
    const nextState = typeof patch === "function" ? patch(page.state, page.props) : patch;
    page.state = {
      ...page.state,
      ...nextState,
    };
  });
  return page;
}

function mockOrganizationScope() {
  jest.spyOn(Setting, "isDefaultOrganizationSelected").mockReturnValue(false);
  jest.spyOn(Setting, "getRequestOrganization").mockReturnValue("org-alpha");
}

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: () => ({
      matches: false,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }),
  });
  jest.spyOn(Setting, "showMessage").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  cleanup();
});

test("renders migrated resource list table with existing row actions", () => {
  const page = new (ResourceListPage as LegacyAny)(routeProps) as LegacyAny;
  const view = renderLegacyPageTable(page, page.renderTable([{
    owner: "org-alpha",
    provider: "provider-main",
    application: "portal-app",
    user: "admin",
    name: "avatar.png",
    fileType: "image",
    fileSize: "1024",
    url: "https://static.example.invalid/avatar.png",
  }]));

  expectAny(view.getByText("provider-main")).not.toBeNull();
  expectAny(view.getByText("portal-app")).not.toBeNull();
  expectAny(view.getByRole("button", {name: /Copy Link|复制/i})).not.toBeNull();
});

test("renders migrated cert and key list rows without exposing secrets", () => {
  const certPage = new (CertListPage as LegacyAny)(routeProps) as LegacyAny;
  const certView = renderLegacyPageTable(certPage, certPage.renderTable([{
    owner: "org-alpha",
    name: "cert_alpha",
    displayName: "Tenant Cert",
    type: "x509",
    scope: "JWT",
    cryptoAlgorithm: "RS256",
  }]));

  expectAny(certView.getByText("cert_alpha")).not.toBeNull();
  expectAny(certView.getByText("RS256")).not.toBeNull();
  certView.unmount();

  const keyPage = new (KeyListPage as LegacyAny)(routeProps) as LegacyAny;
  const keyView = renderLegacyPageTable(keyPage, keyPage.renderTable([{
    owner: "org-alpha",
    name: "key_alpha",
    displayName: "Tenant Key",
    type: "Organization",
    accessKey: "ak-safe-display",
    accessSecret: "secret-should-not-render-in-list",
    state: "Active",
  }]));

  expectAny(keyView.getByText("key_alpha")).not.toBeNull();
  expectAny(keyView.getByText("ak-safe-display")).not.toBeNull();
  expectAny(keyView.queryByText("secret-should-not-render-in-list")).toBeNull();
});

test("renders migrated webhook list row and keeps callback secret out of the table", () => {
  const page = new (WebhookListPage as LegacyAny)(routeProps) as LegacyAny;
  const view = renderLegacyPageTable(page, page.renderTable([{
    owner: "admin",
    name: "webhook_alpha",
    organization: "org-alpha",
    url: "https://callback.example.invalid/hook",
    method: "POST",
    contentType: "application/json",
    events: ["login", "signup"],
    secret: "webhook-secret-should-not-render",
    isEnabled: true,
  }]));

  expectAny(view.getByText("webhook_alpha")).not.toBeNull();
  expectAny(view.getByText("POST")).not.toBeNull();
  expectAny(view.queryByText("webhook-secret-should-not-render")).toBeNull();
});

test("renders migrated webhook event table with replay action", () => {
  const page = new WebhookEventListPage(routeProps) as LegacyAny;
  page.state = defaultListState({
    data: [{
      owner: "admin",
      name: "event_alpha",
      webhookName: "webhook_alpha",
      organization: "org-alpha",
      status: "success",
      attemptCount: 1,
      nextRetryTime: "",
    }],
    replayingId: "",
    statusFilter: "",
    sortField: "",
    sortOrder: "",
    detailShow: false,
    detailRecord: null,
  });

  const view = render(<MemoryRouter>{page.renderTable()}</MemoryRouter>);

  expectAny(view.getByText("webhook_alpha")).not.toBeNull();
  expectAny(view.getByRole("button", {name: /Replay|重放/i})).not.toBeNull();
});

test("keeps migrated list page fetch contracts and state updates", async() => {
  mockOrganizationScope();
  const params = {
    pagination: {current: 2, pageSize: 25, total: 0},
    searchedColumn: "name",
    searchText: "alpha",
    sortField: "createdTime",
    sortOrder: "descend",
  };
  const resourceBackend = jest.spyOn(ResourceBackend, "getResources").mockResolvedValue({status: "ok", data: [{owner: "org-alpha", name: "resource-alpha"}], data2: 1});
  const certBackend = jest.spyOn(CertBackend, "getCerts").mockResolvedValue({status: "ok", data: [{owner: "org-alpha", name: "cert-alpha"}], data2: 1});
  const keyBackend = jest.spyOn(KeyBackend, "getKeys").mockResolvedValue({status: "ok", data: [{owner: "org-alpha", name: "key-alpha"}], data2: 1});
  const webhookBackend = jest.spyOn(WebhookBackend, "getWebhooks").mockResolvedValue({status: "ok", data: [{owner: "admin", name: "webhook-alpha"}], data2: 1});

  const resourcePage = attachLegacyState(new (ResourceListPage as LegacyAny)(routeProps));
  resourcePage.fetch(params);
  await wait(() => expectAny(resourceBackend).toHaveBeenCalledWith("org-alpha", "admin", 2, 25, "name", "alpha", "createdTime", "descend"));
  await wait(() => expectAny(resourcePage.setState).toHaveBeenCalledWith(expect.objectContaining({data: expect.any(Array)})));

  const certPage = attachLegacyState(new (CertListPage as LegacyAny)(routeProps));
  certPage.fetch({...params, type: "SSL"});
  await wait(() => expectAny(certBackend).toHaveBeenCalledWith("org-alpha", 2, 25, "type", "SSL", "createdTime", "descend"));
  await wait(() => expectAny(certPage.setState).toHaveBeenCalledWith(expect.objectContaining({data: expect.any(Array)})));

  const keyPage = attachLegacyState(new (KeyListPage as LegacyAny)(routeProps));
  keyPage.fetch({...params, type: "Organization"});
  await wait(() => expectAny(keyBackend).toHaveBeenCalledWith("org-alpha", 2, 25, "type", "Organization", "createdTime", "descend"));
  await wait(() => expectAny(keyPage.setState).toHaveBeenCalledWith(expect.objectContaining({data: expect.any(Array)})));

  const webhookPage = attachLegacyState(new (WebhookListPage as LegacyAny)(routeProps));
  webhookPage.fetch({...params, contentType: "application/json"});
  await wait(() => expectAny(webhookBackend).toHaveBeenCalledWith("admin", "org-alpha", 2, 25, "contentType", "application/json", "createdTime", "descend"));
  await wait(() => expectAny(webhookPage.setState).toHaveBeenCalledWith(expect.objectContaining({data: expect.any(Array)})));
});

test("keeps migrated add and delete actions wired to existing backends", async() => {
  mockOrganizationScope();
  jest.spyOn(Setting, "getRandomName").mockReturnValue("fixed");
  const history = {push: jest.fn()};
  const props = {...routeProps, history};
  const addCert = jest.spyOn(CertBackend, "addCert").mockResolvedValue({status: "ok"});
  const addKey = jest.spyOn(KeyBackend, "addKey").mockResolvedValue({status: "ok"});
  const addWebhook = jest.spyOn(WebhookBackend, "addWebhook").mockResolvedValue({status: "ok"});
  const deleteResource = jest.spyOn(ResourceBackend, "deleteResource").mockResolvedValue({status: "ok"});

  const certPage = attachLegacyState(new (CertListPage as LegacyAny)(props), {owner: "org-alpha"});
  certPage.addCert();
  await wait(() => expectAny(addCert).toHaveBeenCalledWith(expect.objectContaining({
    owner: "org-alpha",
    name: "cert_fixed",
    privateKey: "",
    certificate: "",
  })));
  expectAny(history.push).toHaveBeenCalledWith({pathname: "/certs/org-alpha/cert_fixed", mode: "add"});

  const keyPage = attachLegacyState(new (KeyListPage as LegacyAny)(props));
  keyPage.addKey();
  await wait(() => expectAny(addKey).toHaveBeenCalledWith(expect.objectContaining({
    owner: "org-alpha",
    name: "key_fixed",
    accessSecret: "",
  })));
  expectAny(history.push).toHaveBeenCalledWith({pathname: "/keys/org-alpha/key_fixed", mode: "add"});

  const webhookPage = attachLegacyState(new (WebhookListPage as LegacyAny)(props));
  webhookPage.addWebhook();
  await wait(() => expectAny(addWebhook).toHaveBeenCalledWith(expect.objectContaining({
    owner: "admin",
    name: "webhook_fixed",
    organization: "org-alpha",
  })));
  expectAny(history.push).toHaveBeenCalledWith({pathname: "/webhooks/webhook_fixed", mode: "add"});

  const resourcePage = attachLegacyState(new (ResourceListPage as LegacyAny)(props), {
    data: [{owner: "org-alpha", name: "resource-alpha"}],
    pagination: {current: 2, pageSize: 10, total: 1},
  });
  resourcePage.fetch = jest.fn();
  resourcePage.deleteResource(0);

  await wait(() => expectAny(deleteResource).toHaveBeenCalledWith({owner: "org-alpha", name: "resource-alpha"}));
  expectAny(resourcePage.fetch).toHaveBeenCalledWith({pagination: expect.objectContaining({current: 1})});
});

test("keeps migrated webhook event helpers and replay behavior", async() => {
  mockOrganizationScope();
  const replayWebhookEvent = jest.spyOn(WebhookEventBackend, "replayWebhookEvent").mockResolvedValue({status: "ok", data: "queued"});
  const page = attachLegacyState(new WebhookEventListPage(routeProps) as LegacyAny, {
    statusFilter: "",
    sortField: "",
    sortOrder: "",
    detailShow: false,
    detailRecord: null,
  });
  page.fetchWebhookEvents = jest.fn();

  expectAny(page.jsonStrFormatter("{\"a\":1}")).toContain("\n");
  expectAny(page.jsonStrFormatter("not-json")).toBe("not-json");
  expectAny(page.getOrganizationFilter()).toBe("org-alpha");

  page.handleTableChange({current: 3, pageSize: 10}, {status: ["failed"]}, {field: "attemptCount", order: "descend"});
  expectAny(page.fetchWebhookEvents).toHaveBeenCalledWith(expect.objectContaining({current: 1}), "failed", "attemptCount", "descend");

  page.openDetailDrawer({owner: "admin", name: "event-alpha", webhookName: "webhook-alpha"});
  expectAny(page.state.detailShow).toBe(true);
  expectAny(page.state.detailRecord.name).toBe("event-alpha");
  page.closeDetailDrawer();
  expectAny(page.state.detailShow).toBe(false);

  page.replayWebhookEvent({owner: "admin", name: "event-alpha"});
  await wait(() => expectAny(replayWebhookEvent).toHaveBeenCalledWith("admin/event-alpha"));
  await wait(() => expectAny(page.fetchWebhookEvents).toHaveBeenCalled());
  expectAny(page.state.replayingId).toBe("");
});
