/* eslint-env jest */
import React from "react";
import {act, cleanup, render} from "@testing-library/react";
import {expect as jestExpect, jest as jestValue} from "@jest/globals";
import i18next from "i18next";
import InvitationEditPage from "./InvitationEditPage";
import * as InvitationBackend from "./backend/InvitationBackend";
import * as OrganizationBackend from "./backend/OrganizationBackend";
import * as ApplicationBackend from "./backend/ApplicationBackend";
import * as GroupBackend from "./backend/GroupBackend";
import * as Setting from "./Setting";
import en from "./locales/en/data.json";
import zh from "./locales/zh/data.json";

declare const jest: typeof jestValue;

type LooseMock = {
  (...args: unknown[]): unknown;
  mockImplementation: (implementation: (...args: unknown[]) => unknown) => LooseMock;
  mockReturnValue: (value: unknown) => LooseMock;
  mockResolvedValue: (value: unknown) => LooseMock;
  mockResolvedValueOnce: (value: unknown) => LooseMock;
  mockRejectedValueOnce: (value: unknown) => LooseMock;
};

type InvitationBackendMock = Record<"addInvitation" | "getInvitation" | "updateInvitation" | "sendInvitation", LooseMock>;
type OrganizationBackendMock = Record<"getOrganizations", LooseMock>;
type ApplicationBackendMock = Record<"getApplicationsByOrganization", LooseMock>;
type GroupBackendMock = Record<"getGroups", LooseMock>;

type PageProps = {
  account?: unknown;
  history: {push: ReturnType<typeof jestValue.fn>};
  location: {mode?: string; invitation?: TestInvitationRecord};
  match: {params: {organizationName: string; invitationName: string}};
  organizationName?: string;
};

type TestInvitationRecord = {
  owner: string;
  name: string;
  displayName: string;
  code: string;
  defaultCode: string;
  quota: number;
  usedCount: number;
  application: string;
  signupGroup: string;
  username: string;
  email: string;
  phone: string;
  state: string;
  tag?: string;
};

type PageState = {
  classes: PageProps;
  organizationName: string;
  invitationName: string;
  invitation: TestInvitationRecord | null;
  organizations: Array<{name: string; displayName?: string; defaultApplication?: string}>;
  applications: Array<{name: string}>;
  groups: Array<{owner: string; name: string}>;
  mode: string;
  emails?: string;
  showSendModal?: boolean;
  sendLoading: boolean;
  fieldErrors?: Record<"name" | "email", string | undefined>;
};

type StatePatch = Partial<PageState> | ((state: PageState, props: PageProps) => Partial<PageState> | null) | null;
type PageHarness = InstanceType<typeof InvitationEditPage> & {
  state: PageState;
  props: PageProps;
  setState: (patch: StatePatch, callback?: () => void) => void;
};

type ElementProps = {
  children?: React.ReactNode;
  disabled?: boolean;
  footer?: React.ReactElement[];
  onCancel?: () => void;
  onChange?: (value: unknown) => void;
  onClick?: (value?: unknown) => void;
  value?: unknown;
  virtual?: boolean;
  options?: Array<{label: React.ReactNode; value: string}>;
};

const expect = jestExpect;
const {fireEvent} = require("@testing-library/react") as {
  fireEvent: {
    click: (element: Element | null) => boolean;
  };
};

const copyMock = jestValue.fn();
const invitationBackendMock = InvitationBackend as unknown as InvitationBackendMock;
const organizationBackendMock = OrganizationBackend as unknown as OrganizationBackendMock;
const applicationBackendMock = ApplicationBackend as unknown as ApplicationBackendMock;
const groupBackendMock = GroupBackend as unknown as GroupBackendMock;

jest.mock("copy-to-clipboard", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return factoryJest.fn();
});

jest.mock("./backend/InvitationBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    addInvitation: factoryJest.fn(),
    getInvitation: factoryJest.fn(),
    updateInvitation: factoryJest.fn(),
    sendInvitation: factoryJest.fn(),
  };
});

jest.mock("./backend/OrganizationBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {getOrganizations: factoryJest.fn()};
});

jest.mock("./backend/ApplicationBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {getApplicationsByOrganization: factoryJest.fn()};
});

jest.mock("./backend/GroupBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {getGroups: factoryJest.fn()};
});

const baseInvitation: TestInvitationRecord = {
  owner: "engineering",
  name: "invite-main",
  displayName: "Main invitation",
  code: "code-main",
  defaultCode: "code-main",
  quota: 5,
  usedCount: 1,
  application: "All",
  signupGroup: "",
  username: "alice",
  email: "alice@example.test",
  phone: "123456789",
  state: "Active",
};

const organizations = [
  {name: "engineering", displayName: "Engineering", defaultApplication: "app-main"},
  {name: "sales", displayName: "Sales"},
];

const applications = [{name: "app-main"}, {name: "app-secondary"}];
const groups = [{owner: "engineering", name: "group-a"}, {owner: "engineering", name: "group-b"}];

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

function flushPromises() {
  return act(async() => {
    await Promise.resolve();
  });
}

function createHistory() {
  return {push: jestValue.fn()};
}

function createPage(options: {
  mode?: string;
  invitation?: Partial<TestInvitationRecord>;
} = {}): PageHarness {
  const props = {
    account: {owner: "admin", name: "admin", isAdmin: true},
    history: createHistory(),
    location: {mode: options.mode},
    match: {params: {organizationName: "engineering", invitationName: "invite-main"}},
  } as PageProps;
  const page = new InvitationEditPage(props) as PageHarness;
  page.setState = ((stateUpdate: StatePatch, callback?: () => void) => {
    const patch = typeof stateUpdate === "function" ? stateUpdate(page.state, page.props) : stateUpdate;
    if (patch !== null) {
      page.state = {
        ...page.state,
        ...(patch || {}),
      };
    }
    callback?.();
  }) as PageHarness["setState"];
  page.state = {
    ...page.state,
    invitation: {...baseInvitation, ...options.invitation},
    organizations: [...organizations],
    applications: [...applications],
    groups: [...groups],
  };
  return page;
}

function visitReactNode(node: React.ReactNode, visitor: (element: React.ReactElement<ElementProps>) => void): void {
  if (Array.isArray(node)) {
    node.forEach(child => visitReactNode(child, visitor));
    return;
  }

  if (!React.isValidElement<ElementProps>(node)) {
    return;
  }

  visitor(node);
  visitReactNode(node.props.children, visitor);
}

function setupBackend() {
  invitationBackendMock.getInvitation.mockResolvedValue({status: "ok", data: {...baseInvitation}});
  invitationBackendMock.addInvitation.mockResolvedValue({status: "ok"});
  organizationBackendMock.getOrganizations.mockResolvedValue({status: "ok", data: [...organizations]});
  applicationBackendMock.getApplicationsByOrganization.mockResolvedValue({status: "ok", data: [...applications]});
  groupBackendMock.getGroups.mockResolvedValue({status: "ok", data: [...groups]});
  invitationBackendMock.updateInvitation.mockResolvedValue({status: "ok"});
  invitationBackendMock.sendInvitation.mockResolvedValue({status: "ok"});
}

beforeEach(async() => {
  await useTestLanguage("en");
  setupBackend();
  copyMock.mockClear();
  const copyModule = require("copy-to-clipboard") as typeof copyMock;
  copyModule.mockImplementation(copyMock);
  jestValue.spyOn(Setting, "showMessage").mockImplementation(() => {});
  jestValue.spyOn(Setting, "isMobile").mockReturnValue(false);
  jestValue.spyOn(Setting, "isAdminUser").mockReturnValue(true);
  jestValue.spyOn(Setting, "getLabel").mockImplementation((label: unknown) => <span>{String(label)}</span>);
  jestValue.spyOn(Setting, "getOption").mockImplementation((label: unknown, value: unknown) => ({label, value}));
  jestValue.spyOn(Setting, "deepCopy").mockImplementation((value: unknown) => JSON.parse(JSON.stringify(value)));
  jestValue.spyOn(Setting, "myParseInt").mockImplementation((value: unknown) => Number.parseInt(String(value), 10));
});

afterEach(() => {
  cleanup();
  jestValue.restoreAllMocks();
  jestValue.clearAllMocks();
});

test("loads invitation, organizations, applications and groups", async() => {
  const page = createPage();

  page.getInvitation();
  page.getOrganizations();
  page.getApplicationsByOrganization("engineering");
  page.getGroupsByOrganization("engineering");
  await flushPromises();

  expect(invitationBackendMock.getInvitation).toHaveBeenCalledWith("engineering", "invite-main");
  expect(page.state.invitation?.name).toBe("invite-main");
  expect(organizationBackendMock.getOrganizations).toHaveBeenCalledWith("admin");
  expect(applicationBackendMock.getApplicationsByOrganization).toHaveBeenCalledWith("admin", "engineering");
  expect(groupBackendMock.getGroups).toHaveBeenCalledWith("engineering");
});

test("redirects to 404 when invitation detail is missing", async() => {
  invitationBackendMock.getInvitation.mockResolvedValueOnce({status: "ok", data: null});
  const page = createPage();
  const historyPush = page.props.history.push;

  page.getInvitation();
  await flushPromises();

  expect(historyPush).toHaveBeenCalledWith("/404");
});

test("keeps lifecycle loading and non-success group responses compatible", async() => {
  const page = createPage();
  const getInvitationSpy = jestValue.spyOn(page, "getInvitation").mockImplementation(() => undefined);
  const getOrganizationsSpy = jestValue.spyOn(page, "getOrganizations").mockImplementation(() => undefined);
  const getApplicationsSpy = jestValue.spyOn(page, "getApplicationsByOrganization").mockImplementation(() => undefined);
  const getGroupsSpy = jestValue.spyOn(page, "getGroupsByOrganization").mockImplementation(() => undefined);

  page.UNSAFE_componentWillMount();

  expect(getInvitationSpy).toHaveBeenCalledTimes(1);
  expect(getOrganizationsSpy).toHaveBeenCalledTimes(1);
  expect(getApplicationsSpy).toHaveBeenCalledWith("engineering");
  expect(getGroupsSpy).toHaveBeenCalledWith("engineering");

  getGroupsSpy.mockRestore();
  groupBackendMock.getGroups.mockResolvedValueOnce({status: "error", data: [...groups]});
  page.state = {...page.state, groups: []};
  page.getGroupsByOrganization("engineering");
  await flushPromises();
  expect(page.state.groups).toEqual([]);
});

test("keeps rendered edit controls wired to invitation state updates", () => {
  const page = createPage();
  const getApplicationsSpy = jestValue.spyOn(page, "getApplicationsByOrganization");
  const getGroupsSpy = jestValue.spyOn(page, "getGroupsByOrganization");

  visitReactNode(page.renderInvitation(), (element) => {
    const props = element.props;
    if (props.value === "engineering" && props.virtual === false) {
      props.onChange?.("sales");
    }
    if (props.value === "invite-main") {
      props.onChange?.({target: {value: "invite-renamed"}});
    }
    if (props.value === "Main invitation") {
      props.onChange?.({target: {value: "Renamed invitation"}});
    }
    if (props.value === "code-main") {
      props.onChange?.({target: {value: "code-renamed"}});
    }
    if (props.value === 5) {
      props.onChange?.(10);
    }
    if (props.value === 1) {
      props.onChange?.(2);
    }
    if (props.value === "All") {
      props.onChange?.("app-main");
    }
    if (props.value === "") {
      props.onChange?.("engineering/group-a");
    }
    if (props.value === "alice") {
      props.onChange?.({target: {value: "bob"}});
    }
    if (props.value === "alice@example.test") {
      props.onChange?.({target: {value: "bob@example.test"}});
    }
    if (props.value === "123456789") {
      props.onChange?.({target: {value: "987654321"}});
    }
    if (props.value === "Active") {
      props.onChange?.("Suspended");
    }
  });

  expect(page.state.invitation).toMatchObject({
    owner: "sales",
    name: "invite-renamed",
    displayName: "Renamed invitation",
    code: "code-renamed",
    defaultCode: "code-renamed",
    quota: 10,
    usedCount: 2,
    application: "app-main",
    signupGroup: "engineering/group-a",
    username: "bob",
    email: "bob@example.test",
    phone: "987654321",
    state: "Suspended",
  });
  expect(getApplicationsSpy).toHaveBeenCalledWith("sales");
  expect(getGroupsSpy).toHaveBeenCalledWith("sales");
});

test("uses organization display names while preserving technical organization values", () => {
  const page = createPage();
  let organizationOptions: Array<{label: React.ReactNode; value: string}> | undefined;

  visitReactNode(page.renderInvitation(), (element) => {
    if (element.props.value === "engineering" && element.props.virtual === false) {
      organizationOptions = element.props.options;
    }
  });

  expect(organizationOptions).toEqual([
    {label: "Engineering", value: "engineering"},
    {label: "Sales", value: "sales"},
  ]);
});

test("keeps regex invitation codes from replacing the explicit default code", () => {
  const page = createPage();
  let codeUpdated = false;

  visitReactNode(page.renderInvitation(), (element) => {
    if (!codeUpdated && element.props.value === "code-main") {
      codeUpdated = true;
      element.props.onChange?.({target: {value: "^code-[0-9]+$"}});
    }
  });

  expect(page.state.invitation).toMatchObject({
    code: "^code-[0-9]+$",
    defaultCode: "code-main",
  });
});

test("copies signup link for built-in or organization default application and reports missing defaults", () => {
  const page = createPage({invitation: {owner: "built-in", defaultCode: "built-code"}});

  page.copySignupLink();
  expect(copyMock).toHaveBeenCalledWith(expect.stringContaining("/signup/app-built-in?invitationCode=built-code"));
  expect(Setting.showMessage).toHaveBeenCalledWith("success", "Copied to clipboard successfully");

  copyMock.mockClear();
  page.state = {...page.state, invitation: {...baseInvitation, owner: "engineering", defaultCode: "org-code"}};
  page.copySignupLink();
  expect(copyMock).toHaveBeenCalledWith(expect.stringContaining("/signup/app-main?invitationCode=org-code"));

  copyMock.mockClear();
  page.state = {...page.state, invitation: {...baseInvitation, owner: "sales"}};
  page.copySignupLink();
  expect(copyMock).not.toHaveBeenCalled();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("sales"));
});

test("sends invitations to valid email rows and reports send failures", async() => {
  const page = createPage();
  page.state = {
    ...page.state,
    emails: "valid@example.test\ninvalid\nsecond@example.test",
    showSendModal: true,
  };
  const modal = page.renderSendEmailModal() as React.ReactElement<ElementProps>;
  const sendButton = modal.props.footer?.[0];

  sendButton?.props.onClick?.();
  expect(page.state.sendLoading).toBe(true);
  await flushPromises();

  expect(invitationBackendMock.sendInvitation).toHaveBeenCalledWith(expect.objectContaining({name: "invite-main"}), ["valid@example.test", "second@example.test"]);
  expect(page.state.sendLoading).toBe(false);
  expect(Setting.showMessage).toHaveBeenCalledWith("success", "Successfully sent");

  invitationBackendMock.sendInvitation.mockResolvedValueOnce({status: "error", msg: "send failed"});
  sendButton?.props.onClick?.();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "send failed");

  invitationBackendMock.sendInvitation.mockRejectedValueOnce(new Error("send network"));
  sendButton?.props.onClick?.();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "send network");

  modal.props.onCancel?.();
  expect(page.state.showSendModal).toBe(false);
});

test("saves invitation, supports save-exit redirects and rolls name back on failure", async() => {
  const page = createPage({invitation: {name: "invite-renamed"}});
  const historyPush = page.props.history.push;

  page.submitInvitationEdit(false);
  await flushPromises();
  expect(invitationBackendMock.updateInvitation).toHaveBeenCalledWith("engineering", "invite-main", expect.objectContaining({name: "invite-renamed"}));
  expect(historyPush).toHaveBeenCalledWith("/invitations/engineering/invite-renamed");

  page.submitInvitationEdit(true);
  await flushPromises();
  expect(historyPush).toHaveBeenLastCalledWith("/invitations");

  invitationBackendMock.updateInvitation.mockResolvedValueOnce({status: "error", msg: "duplicate"});
  page.state = {...page.state, invitation: {...baseInvitation, name: "broken"}};
  page.submitInvitationEdit(false);
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "Failed to save: duplicate");
  expect(page.state.invitation?.name).toBe("invite-renamed");

  invitationBackendMock.updateInvitation.mockRejectedValueOnce(new Error("save network"));
  page.submitInvitationEdit(false);
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("save network"));
});

test("blocks saving invitations with an invalid name or email and exposes field errors", async() => {
  const page = createPage({invitation: {name: "invite/main", email: "not-an-email"}});

  page.submitInvitationEdit(false);
  await flushPromises();

  expect(invitationBackendMock.updateInvitation).not.toHaveBeenCalled();
  expect(invitationBackendMock.addInvitation).not.toHaveBeenCalled();
  expect(page.state.fieldErrors).toEqual({
    name: "Name can only contain letters, numbers, underscores, and hyphens",
    email: "The input is not valid Email!",
  });
});

test("blocks saving invitation names that contain Chinese characters", async() => {
  const page = createPage({invitation: {name: "邀请码", email: "alice@example.test"}});

  page.submitInvitationEdit(false);
  await flushPromises();

  expect(invitationBackendMock.updateInvitation).not.toHaveBeenCalled();
  expect(invitationBackendMock.addInvitation).not.toHaveBeenCalled();
  expect(page.state.fieldErrors).toEqual({
    name: "Name can only contain letters, numbers, underscores, and hyphens",
  });
});

test("persists an invitation draft only when the add form is saved", async() => {
  const page = createPage({mode: "add", invitation: {name: "draft-invitation"}});
  const historyPush = page.props.history.push;

  page.submitInvitationEdit(false);
  await flushPromises();
  expect(invitationBackendMock.addInvitation).toHaveBeenCalledWith(expect.objectContaining({name: "draft-invitation"}));
  expect(invitationBackendMock.updateInvitation).not.toHaveBeenCalled();
  expect(historyPush).toHaveBeenCalledWith("/invitations/engineering/draft-invitation");

  page.submitInvitationEdit(true);
  await flushPromises();
  expect(historyPush).toHaveBeenLastCalledWith("/invitations");
  expect(invitationBackendMock.updateInvitation).toHaveBeenCalledWith("engineering", "draft-invitation", expect.objectContaining({name: "draft-invitation"}));
});

test("loads a route draft locally and never writes when cancelling or returning", () => {
  const draft = {...baseInvitation, name: "route-draft"};
  const props = {
    account: {owner: "admin", name: "admin", isAdmin: true},
    history: createHistory(),
    location: {state: {mode: "add", invitation: draft}},
    match: {params: {organizationName: "engineering", invitationName: "route-draft"}},
  } as PageProps;
  const page = new InvitationEditPage(props) as PageHarness;
  // 仅验证生命周期是否跳过详情读取，避免未挂载实例处理辅助 GET 回调。
  page.setState = jestValue.fn() as unknown as PageHarness["setState"];

  expect(page.state.invitation).toEqual(draft);
  page.UNSAFE_componentWillMount();
  expect(invitationBackendMock.getInvitation).not.toHaveBeenCalled();

  page.handleCancel();
  expect(page.props.history.push).toHaveBeenCalledWith("/invitations");

  let onBack: (() => void) | undefined;
  visitReactNode(page.renderInvitation(), (element) => {
    const shellProps = element.props as ElementProps & {classPrefix?: string; onBack?: () => void};
    if (shellProps.classPrefix === "invitation-edit") {
      onBack = shellProps.onBack;
    }
  });
  onBack?.();
  expect(page.props.history.push).toHaveBeenLastCalledWith("/invitations");
  expect(invitationBackendMock.addInvitation).not.toHaveBeenCalled();
  expect(invitationBackendMock.updateInvitation).not.toHaveBeenCalled();
});

test("renders modal and action buttons through the page surface", async() => {
  const page = createPage({mode: "add"});
  const view = render(<>{page.render()}</>);

  expect(view.container.querySelector(".admin-identity-object-edit-page.invitation-edit-page")).not.toBeNull();
  expect(view.container.querySelector(".admin-identity-object-edit-card.invitation-edit-card")).not.toBeNull();
  expect(view.container.querySelectorAll(".invitation-edit-field-row")).toHaveLength(14);
  fireEvent.click(view.getAllByText("Save")[0]);
  await flushPromises();
  fireEvent.click(view.getAllByText("Save and return")[0]);
  await flushPromises();
  fireEvent.click(view.getAllByText("Cancel")[0]);
  await flushPromises();

  expect(invitationBackendMock.addInvitation).toHaveBeenCalledTimes(1);
  expect(invitationBackendMock.updateInvitation).toHaveBeenCalledTimes(1);
  expect(view.getAllByText("Send").length).toBeGreaterThan(0);
});

test("renders the inline send action at the compact AntD size", () => {
  const page = createPage();
  const view = render(<>{page.render()}</>);

  expect(view.container.querySelector(".invitation-edit-send-control .ant-btn-sm")).not.toBeNull();
});

test("keeps the shared three-button footer in edit mode and cancels without writing", () => {
  const page = createPage({mode: "edit"});
  const view = render(<>{page.render()}</>);

  expect(view.getAllByText("Cancel")).toHaveLength(1);
  expect(view.getAllByText("Save")).toHaveLength(1);
  expect(view.getAllByText("Save and return")).toHaveLength(1);

  fireEvent.click(view.getByText("Cancel"));

  expect(page.props.history.push).toHaveBeenCalledWith("/invitations");
  expect(invitationBackendMock.addInvitation).not.toHaveBeenCalled();
  expect(invitationBackendMock.updateInvitation).not.toHaveBeenCalled();
});

test("keeps loading, edit title fallback and shared back navigation explicit", () => {
  const page = createPage({mode: "edit", invitation: {displayName: ""}});
  let shellTitle: React.ReactNode = null;

  visitReactNode(page.renderInvitation(), (element) => {
    const shellProps = element.props as ElementProps & {classPrefix?: string; title?: React.ReactNode};
    if (shellTitle === null && shellProps.classPrefix === "invitation-edit" && shellProps.title !== undefined) {
      shellTitle = shellProps.title;
    }
  });

  expect(shellTitle).toBe("Edit Invitation (invite-main)");
  const view = render(<>{page.render()}</>);
  fireEvent.click(view.getByText("Back"));
  expect(page.props.history.push).toHaveBeenCalledWith("/invitations");
  page.state = {...page.state, invitation: null};
  expect(page.renderInvitation()).toBeNull();
});

test("renders the shared edit shell, semantic sections and one fixed action bar", () => {
  const page = createPage({mode: "add"});
  const view = render(<>{page.render()}</>);

  expect(view.container.querySelector(".invitation-edit-shell")).not.toBeNull();
  expect(view.container.querySelector(".invitation-edit-header")).not.toBeNull();
  expect(view.container.querySelector(".invitation-edit-scroll-content")).not.toBeNull();
  expect(view.container.querySelectorAll(".invitation-edit-action-bar")).toHaveLength(1);
  expect(view.container.querySelector(".invitation-edit-card .ant-card-head")).toBeNull();
  expect(view.container.querySelectorAll(".invitation-edit-section")).toHaveLength(4);
  expect(view.container.querySelectorAll(".invitation-edit-field-row")).toHaveLength(14);
  expect(view.getByText("Organization & Accounts / Invitations /")).not.toBeNull();
  expect(view.getByText("Basic information")).not.toBeNull();
  expect(view.getByText("Invitation configuration")).not.toBeNull();
  expect(view.getByText("Registration target")).not.toBeNull();
  expect(view.getByText("Registration information")).not.toBeNull();
  expect(view.getAllByText("Save")).toHaveLength(1);
  expect(view.getAllByText("Save and return")).toHaveLength(1);
  expect(view.getAllByText("Cancel")).toHaveLength(1);
});
