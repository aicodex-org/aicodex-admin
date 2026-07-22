import {afterEach, expect, test, vi} from "vitest";
import React from "react";
import {cleanup, render} from "@testing-library/react";
import KeyEditPage from "./KeyEditPage";
import * as KeyBackend from "./backend/KeyBackend";
import * as Setting from "./Setting";

const draft = {owner: "engineering", name: "key_draft", displayName: "Draft", type: "Organization", organization: "engineering", application: "", user: "", accessKey: "", accessSecret: "", expireTime: "", state: "Active"};
const flushPromises = async(): Promise<void> => new Promise(resolve => setTimeout(resolve, 0));

function createPage(mode: "add" | "edit" = "edit"): any {
  const page: any = new KeyEditPage({match: {params: {organizationName: "engineering", keyName: "key_draft"}}, location: {mode, keyDraft: draft}, history: {push: vi.fn()}, account: {owner: "engineering", isAdmin: true}} as any);
  page.state = {...page.state, key: {...draft}, organizations: [], applications: [], users: []};
  page.setState = (patch: any, callback?: () => void) => {
    page.state = {...page.state, ...(typeof patch === "function" ? patch(page.state, page.props) : patch)};
    callback?.();
  };
  return page;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

test("renders a shared single-body key shell with two sections", () => {
  vi.spyOn(Setting, "isMobile").mockReturnValue(false);
  const page = createPage();
  const view = render(<>{page.renderKey()}</>);
  expect(view.container.querySelector(".key-edit-shell")).not.toBeNull();
  expect(view.container.querySelector(".key-edit-tabs")).toBeNull();
  expect(view.container.querySelector(".key-edit-card .ant-card-head")).toBeNull();
  expect(view.getByText(/Basic information|基础信息/)).not.toBeNull();
  expect(view.getByText(/Credentials and status|凭据与状态/)).not.toBeNull();
  const actionButtons = view.container.querySelectorAll<HTMLButtonElement>(".key-edit-action-bar button");
  expect(actionButtons).toHaveLength(3);

  const handleBack = vi.spyOn(page, "handleBack").mockImplementation(() => undefined);
  const submitKeyEdit = vi.spyOn(page, "submitKeyEdit").mockImplementation(() => undefined);
  view.container.querySelector<HTMLButtonElement>(".key-edit-back-button")?.click();
  actionButtons.forEach((button: HTMLButtonElement) => button.click());

  expect(handleBack).toHaveBeenCalledTimes(2);
  expect(submitKeyEdit).toHaveBeenNthCalledWith(1, false);
  expect(submitKeyEdit).toHaveBeenNthCalledWith(2, true);
});

test("renders searchable organization display names while retaining technical identifiers", () => {
  vi.spyOn(Setting, "isMobile").mockReturnValue(false);
  const page = createPage();
  page.state.key.owner = "feishu6091";
  page.state.organizations = [
    {name: "feishu6091", displayName: "飞书组织"},
    {name: "plain-org", displayName: ""},
  ];

  const options = React.Children.toArray(page.renderOrganizationOptions()) as Array<React.ReactElement<any>>;
  const view = render(<>{page.renderKey()}</>);
  const organizationSelect = view.container.querySelector(".key-edit-form-content .ant-select");

  expect(options.map(option => option.props.value)).toEqual(["feishu6091", "plain-org"]);
  expect(options.map(option => option.props.label)).toEqual(["飞书组织", "plain-org"]);
  expect(organizationSelect?.classList.contains("ant-select-show-search")).toBe(true);
  expect(organizationSelect?.querySelector(".ant-select-selection-item")?.textContent).toBe("飞书组织");
});

test("creates an add-mode key only on save and reloads generated credentials", async() => {
  const page = createPage("add");
  const addKey = vi.spyOn(KeyBackend, "addKey").mockResolvedValue({status: "ok"} as any);
  const updateKey = vi.spyOn(KeyBackend, "updateKey");
  const getKey = vi.spyOn(page, "getKey").mockImplementation(() => undefined);
  vi.spyOn(Setting, "showMessage").mockImplementation(() => undefined);
  page.submitKeyEdit(false);
  await flushPromises();
  expect(addKey).toHaveBeenCalledWith(expect.objectContaining({name: "key_draft"}));
  expect(updateKey).not.toHaveBeenCalled();
  expect(page.state.mode).toBe("edit");
  expect(page.props.history.push).toHaveBeenCalledWith("/keys/engineering/key_draft");
  expect(getKey).toHaveBeenCalled();
});

test("loads an add-mode key draft without requesting generated credentials", () => {
  const page = createPage("add");
  const getKey = vi.spyOn(KeyBackend, "getKey");
  const getApplications = vi.spyOn(page, "getApplicationsByOrganization").mockImplementation(() => undefined);
  const getUsers = vi.spyOn(page, "getUsersByOrganization").mockImplementation(() => undefined);

  page.getKey();

  expect(getKey).not.toHaveBeenCalled();
  expect(page.state.key).toEqual(draft);
  expect(getApplications).toHaveBeenCalledWith("engineering");
  expect(getUsers).toHaveBeenCalledWith("engineering");
});

test("returns from an unsaved key draft without deleting it", () => {
  const page = createPage("add");
  const deleteKey = vi.spyOn(KeyBackend, "deleteKey");

  page.handleBack();

  expect(deleteKey).not.toHaveBeenCalled();
  expect(page.props.history.push).toHaveBeenCalledWith("/keys");
});

test("keeps key edit mode on update and supports save-and-return", async() => {
  const page = createPage("edit");
  const addKey = vi.spyOn(KeyBackend, "addKey");
  const updateKey = vi.spyOn(KeyBackend, "updateKey").mockResolvedValue({status: "ok"} as any);
  vi.spyOn(Setting, "showMessage").mockImplementation(() => undefined);

  page.submitKeyEdit(true);
  await flushPromises();

  expect(addKey).not.toHaveBeenCalled();
  expect(updateKey).toHaveBeenCalledWith("engineering", "key_draft", expect.objectContaining({name: "key_draft"}));
  expect(page.props.history.push).toHaveBeenCalledWith("/keys");
});

test("prevents duplicate key saves and restores submission after failure", async() => {
  const page = createPage("add");
  let resolveRequest: ((value: any) => void) | undefined;
  const addKey = vi.spyOn(KeyBackend, "addKey").mockImplementation(() => new Promise(resolve => {
    resolveRequest = resolve;
  }) as any);
  vi.spyOn(Setting, "showMessage").mockImplementation(() => undefined);

  page.submitKeyEdit(false);
  page.submitKeyEdit(false);

  expect(addKey).toHaveBeenCalledTimes(1);
  expect(page.state.submitting).toBe(true);
  resolveRequest?.({status: "error", msg: "rejected"});
  await flushPromises();
  expect(page.state.submitting).toBe(false);
});

test("reloads a newly created key only after switching to edit mode", async() => {
  const page = createPage("add");
  vi.spyOn(KeyBackend, "addKey").mockResolvedValue({status: "ok"} as any);
  vi.spyOn(Setting, "showMessage").mockImplementation(() => undefined);
  const getKey = vi.spyOn(page, "getKey").mockImplementation(() => undefined);
  const synchronousSetState = page.setState;
  let successCallback: (() => void) | undefined;
  let setStateCalls = 0;
  page.setState = (patch: any, callback?: () => void) => {
    setStateCalls += 1;
    if (setStateCalls === 1) {
      synchronousSetState(patch, callback);
      return;
    }
    page.state = {...page.state, ...patch};
    successCallback = callback;
  };

  page.submitKeyEdit(false);
  await flushPromises();

  expect(getKey).not.toHaveBeenCalled();
  expect(successCallback).toBeDefined();
  successCallback?.();
  expect(getKey).toHaveBeenCalledTimes(1);
});
