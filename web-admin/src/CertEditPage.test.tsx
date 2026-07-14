/* eslint-env jest */
import React from "react";
import {cleanup, render} from "@testing-library/react";
import {expect, jest} from "@jest/globals";
import CertEditPage from "./CertEditPage";
import * as CertBackend from "./backend/CertBackend";
import * as Setting from "./Setting";

const draft = {owner: "engineering", name: "cert_draft", displayName: "Draft", scope: "JWT", type: "x509", cryptoAlgorithm: "RS256", bitSize: 2048, expireInYears: 10, certificate: "", privateKey: ""};
const flushPromises = async(): Promise<void> => new Promise(resolve => setTimeout(resolve, 0));

function createPage(mode: "add" | "edit" = "edit"): any {
  const page: any = new CertEditPage({match: {params: {organizationName: "engineering", certName: "cert_draft"}}, location: {mode, cert: draft}, history: {push: jest.fn()}, account: {owner: "engineering", isAdmin: true}} as any);
  page.state = {...page.state, cert: {...draft}, organizations: []};
  page.setState = (patch: any, callback?: () => void) => {
    page.state = {...page.state, ...(typeof patch === "function" ? patch(page.state, page.props) : patch)};
    callback?.();
  };
  return page;
}

afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
  window.location.hash = "";
});

test("renders a shared two-tab certificate shell with one action bar", () => {
  jest.spyOn(Setting, "isMobile").mockReturnValue(false);
  const page = createPage();
  const view = render(<>{page.renderCert()}</>);
  expect(view.container.querySelector(".cert-edit-shell")).not.toBeNull();
  expect(view.container.querySelector(".cert-edit-tabs")).not.toBeNull();
  expect(view.container.querySelector(".cert-edit-action-bar")).not.toBeNull();
  expect(view.container.querySelector(".cert-edit-card .ant-card-head")).toBeNull();
  expect(view.getAllByText(/Basic information|基础信息/).length).toBeGreaterThan(0);
  expect(view.getAllByText(/Certificate material|证书材料/).length).toBeGreaterThan(0);
  const actionButtons = view.container.querySelectorAll<HTMLButtonElement>(".cert-edit-action-bar button");
  expect(actionButtons).toHaveLength(3);

  const handleBack = jest.spyOn(page, "handleBack").mockImplementation(() => undefined);
  const submitCertEdit = jest.spyOn(page, "submitCertEdit").mockImplementation(() => undefined);
  const tabButtons = view.container.querySelectorAll<HTMLElement>(".cert-edit-tabs .ant-tabs-tab-btn");
  tabButtons[1].click();
  view.container.querySelector<HTMLButtonElement>(".cert-edit-back-button")?.click();
  actionButtons.forEach((button: HTMLButtonElement) => button.click());

  expect(page.state.activeTabKey).toBe("material");
  expect(handleBack).toHaveBeenCalledTimes(2);
  expect(submitCertEdit).toHaveBeenNthCalledWith(1, false);
  expect(submitCertEdit).toHaveBeenNthCalledWith(2, true);
});

test("uses the certificate display name in the page title with a technical-name fallback", () => {
  const page = createPage();
  const view = render(<>{page.renderCert()}</>);

  expect(view.container.querySelector(".cert-edit-title")?.textContent).toMatch(/Draft/);
  expect(view.container.querySelector(".cert-edit-title")?.textContent).not.toContain("cert_draft");

  page.state.cert.displayName = "";
  const fallbackView = render(<>{page.renderCert()}</>);
  expect(fallbackView.container.querySelector(".cert-edit-title")?.textContent).toContain("cert_draft");
});

test("renders certificate organization display names with one shared admin option", () => {
  jest.spyOn(Setting, "isMobile").mockReturnValue(false);
  jest.spyOn(Setting, "isAdminUser").mockReturnValue(true);
  const page = createPage();
  page.state.cert.owner = "feishu6091";
  page.state.organizations = [
    {name: "admin", displayName: "Duplicate admin"},
    {name: "feishu6091", displayName: "飞书组织"},
    {name: "plain-org", displayName: ""},
  ];

  const options = React.Children.toArray(page.renderOrganizationOptions()) as Array<React.ReactElement<any>>;
  const view = render(<>{page.renderCert()}</>);
  const organizationSelect = view.container.querySelector(".cert-edit-tab-panel-basic .ant-select");

  expect(options.map(option => option.props.value)).toEqual(["admin", "feishu6091", "plain-org"]);
  expect(options[0].props.label).toMatch(/admin.*(?:Shared|共享)/);
  expect(options.slice(1).map(option => option.props.label)).toEqual(["飞书组织", "plain-org"]);
  expect(organizationSelect?.classList.contains("ant-select-show-search")).toBe(true);
  expect(organizationSelect?.querySelector(".ant-select-selection-item")?.textContent).toBe("飞书组织");
});

test("creates an add-mode certificate only on save and reloads generated material", async() => {
  const page = createPage("add");
  const addCert = jest.spyOn(CertBackend, "addCert").mockResolvedValue({status: "ok"} as any);
  const updateCert = jest.spyOn(CertBackend, "updateCert");
  const getCert = jest.spyOn(page, "getCert").mockImplementation(() => undefined);
  jest.spyOn(Setting, "showMessage").mockImplementation(() => undefined);
  page.submitCertEdit(false);
  await flushPromises();
  expect(addCert).toHaveBeenCalledWith(expect.objectContaining({name: "cert_draft"}));
  expect(updateCert).not.toHaveBeenCalled();
  expect(page.state.mode).toBe("edit");
  expect(page.props.history.push).toHaveBeenCalledWith("/certs/engineering/cert_draft");
  expect(getCert).toHaveBeenCalled();
});

test("loads an add-mode certificate draft without requesting generated material", () => {
  const page = createPage("add");
  const getCert = jest.spyOn(CertBackend, "getCert");

  page.getCert();

  expect(getCert).not.toHaveBeenCalled();
  expect(page.state.cert).toEqual(draft);
});

test("publishes the certificate display name for its workspace tab after loading and editing", async() => {
  const dispatchSpy = jest.spyOn(window, "dispatchEvent");
  const page = createPage("edit");
  jest.spyOn(CertBackend, "getCert").mockResolvedValue({
    status: "ok",
    data: {...draft, displayName: "Built-in Cert"},
  } as any);

  page.getCert();
  await flushPromises();

  const loadedEvent = dispatchSpy.mock.calls.at(-1)?.[0] as CustomEvent | undefined;
  expect(loadedEvent?.type).toBe("aicodex.admin.workspaceTabLabelUpdate");
  expect(loadedEvent?.detail?.path).toBe("/certs/engineering/cert_draft");
  expect(loadedEvent?.detail?.label).toMatch(/Built-in Cert$/);

  page.updateCertField("displayName", "Built-in Cert 2");

  const updatedEvent = dispatchSpy.mock.calls.at(-1)?.[0] as CustomEvent | undefined;
  expect(updatedEvent?.detail?.path).toBe("/certs/engineering/cert_draft");
  expect(updatedEvent?.detail?.label).toMatch(/Built-in Cert 2$/);
});

test("returns from an unsaved certificate draft without deleting it", () => {
  const page = createPage("add");
  const deleteCert = jest.spyOn(CertBackend, "deleteCert");

  page.handleBack();

  expect(deleteCert).not.toHaveBeenCalled();
  expect(page.props.history.push).toHaveBeenCalledWith("/certs");
});

test("keeps certificate edit mode on update and supports save-and-return", async() => {
  const page = createPage("edit");
  const addCert = jest.spyOn(CertBackend, "addCert");
  const updateCert = jest.spyOn(CertBackend, "updateCert").mockResolvedValue({status: "ok"} as any);
  jest.spyOn(Setting, "showMessage").mockImplementation(() => undefined);

  page.submitCertEdit(true);
  await flushPromises();

  expect(addCert).not.toHaveBeenCalled();
  expect(updateCert).toHaveBeenCalledWith("engineering", "cert_draft", expect.objectContaining({name: "cert_draft"}));
  expect(page.props.history.push).toHaveBeenCalledWith("/certs");
});

test("prevents duplicate certificate saves and restores submission after failure", async() => {
  const page = createPage("add");
  let resolveRequest: ((value: any) => void) | undefined;
  const addCert = jest.spyOn(CertBackend, "addCert").mockImplementation(() => new Promise(resolve => {
    resolveRequest = resolve;
  }) as any);
  jest.spyOn(Setting, "showMessage").mockImplementation(() => undefined);

  page.submitCertEdit(false);
  page.submitCertEdit(false);

  expect(addCert).toHaveBeenCalledTimes(1);
  expect(page.state.submitting).toBe(true);
  resolveRequest?.({status: "error", msg: "rejected"});
  await flushPromises();
  expect(page.state.submitting).toBe(false);
});

test("restores only supported certificate tab hashes", () => {
  window.location.hash = "#material";
  expect(createPage().state.activeTabKey).toBe("material");

  window.location.hash = "#unknown";
  expect(createPage().state.activeTabKey).toBe("basic");
});
