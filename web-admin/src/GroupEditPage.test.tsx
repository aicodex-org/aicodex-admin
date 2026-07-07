/* eslint-env jest */
import React from "react";
import {act, cleanup, render} from "@testing-library/react";
import {Modal} from "antd";
import {expect as jestExpect, jest as jestValue} from "@jest/globals";
import i18next from "i18next";
import GroupEditPage from "./GroupEditPage";
import * as GroupBackend from "./backend/GroupBackend";
import * as OrganizationBackend from "./backend/OrganizationBackend";
import * as UserBackend from "./backend/UserBackend";
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

type GroupBackendMock = Record<"getGroup" | "getGroups" | "updateGroup" | "deleteGroup", LooseMock>;
type OrganizationBackendMock = Record<"getOrganizationNames", LooseMock>;
type UserBackendMock = Record<"getUsers", LooseMock>;
type PageProps = ConstructorParameters<typeof GroupEditPage>[0];
type PageState = InstanceType<typeof GroupEditPage>["state"];
type StatePatch = Partial<PageState> | ((state: PageState, props: PageProps) => Partial<PageState> | null) | null;
type PageHarness = InstanceType<typeof GroupEditPage> & {
  state: PageState;
  props: PageProps;
  setState: (patch: StatePatch, callback?: () => void) => void;
};

type ElementProps = {
  children?: React.ReactNode;
  checked?: boolean;
  disabled?: boolean;
  onChange?: (value: unknown) => void;
  options?: Array<{label?: unknown; value?: unknown}>;
  value?: unknown;
  virtual?: boolean;
};

const expect = jestExpect;
const {fireEvent} = require("@testing-library/react") as {
  fireEvent: {
    click: (element: Element | null) => boolean;
  };
};
const groupBackendMock = GroupBackend as unknown as GroupBackendMock;
const organizationBackendMock = OrganizationBackend as unknown as OrganizationBackendMock;
const userBackendMock = UserBackend as unknown as UserBackendMock;

jest.mock("./backend/GroupBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    getGroup: factoryJest.fn(),
    getGroups: factoryJest.fn(),
    updateGroup: factoryJest.fn(),
    deleteGroup: factoryJest.fn(),
  };
});

jest.mock("./backend/OrganizationBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {getOrganizationNames: factoryJest.fn()};
});

jest.mock("./backend/UserBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {getUsers: factoryJest.fn()};
});

const baseGroup = {
  owner: "engineering",
  name: "group-main",
  displayName: "Main Group",
  type: "Virtual",
  parentId: "engineering",
  users: ["alice", "bob"],
  isEnabled: true,
};

const groups = [
  baseGroup,
  {
    owner: "engineering",
    name: "group-child",
    displayName: "Child Group",
    type: "Physical",
    parentId: "group-main",
    users: [],
    isEnabled: true,
  },
];

const organizations = [
  {name: "engineering", displayName: "Engineering"},
  {name: "sales", displayName: "Sales"},
];

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
  group?: Partial<typeof baseGroup>;
  organizationName?: string;
  groupName?: string;
} = {}): PageHarness {
  const props = {
    account: {owner: "admin", name: "admin", isAdmin: true},
    history: createHistory(),
    location: {mode: options.mode},
    match: {
      params: {
        organizationName: options.organizationName ?? "engineering",
        groupName: options.groupName ?? "group-main",
      },
    },
  } as PageProps;
  const page = new GroupEditPage(props) as PageHarness;
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
    group: {...baseGroup, ...options.group},
    groups: [...groups],
    organizations: [...organizations],
  };
  return page;
}

function renderPage(options: {mode?: string} = {}) {
  const history = createHistory();
  const view = render(
    <GroupEditPage
      account={{owner: "admin", name: "admin", isAdmin: true}}
      history={history}
      location={{mode: options.mode}}
      match={{params: {organizationName: "engineering", groupName: "group-main"}}}
    />
  );
  return {history, view};
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
  groupBackendMock.getGroup.mockResolvedValue({status: "ok", data: {...baseGroup}});
  groupBackendMock.getGroups.mockResolvedValue({status: "ok", data: [...groups]});
  organizationBackendMock.getOrganizationNames.mockResolvedValue({status: "ok", data: [...organizations]});
  userBackendMock.getUsers.mockResolvedValue({
    status: "ok",
    data: [
      {owner: "engineering", name: "alice", displayName: "Alice Display"},
      {owner: "engineering", name: "bob", realName: "Bob Real"},
    ],
  });
  groupBackendMock.updateGroup.mockResolvedValue({status: "ok"});
  groupBackendMock.deleteGroup.mockResolvedValue({status: "ok"});
}

beforeEach(async() => {
  await useTestLanguage("en");
  sessionStorage.clear();
  setupBackend();
  jestValue.spyOn(Setting, "showMessage").mockImplementation(() => {});
  jestValue.spyOn(Setting, "isMobile").mockReturnValue(false);
  jestValue.spyOn(Setting, "isAdminUser").mockReturnValue(true);
  jestValue.spyOn(Setting, "getLabel").mockImplementation((label: unknown) => <span>{String(label)}</span>);
  jestValue.spyOn(Setting, "getOption").mockImplementation((label: unknown, value: unknown) => ({label, value}));
  jestValue.spyOn(Setting, "getTags").mockImplementation((tags: string[]) => [<span key="users">{tags.join(",")}</span>]);
  jestValue.spyOn(Setting, "deepCopy").mockImplementation((value: unknown) => JSON.parse(JSON.stringify(value)));
  jestValue.spyOn(Setting, "myParseInt").mockImplementation((value: unknown) => Number.parseInt(String(value), 10));
});

afterEach(() => {
  cleanup();
  jestValue.restoreAllMocks();
  jestValue.clearAllMocks();
});

test("loads group, groups and organizations before rendering edit fields", async() => {
  const {view} = renderPage();

  expect(await view.findByDisplayValue("Main Group")).not.toBeNull();
  expect(view.container.querySelector(".identity-object-edit-page.group-edit-page")).not.toBeNull();
  expect(view.container.querySelector(".identity-object-edit-card.group-edit-card")).not.toBeNull();
  expect(view.container.querySelector(".group-edit-header")).not.toBeNull();
  expect(view.getByText("Organization & Accounts / Groups /")).not.toBeNull();
  expect(view.getByText("Edit Group (Main Group)")).not.toBeNull();
  expect(view.container.querySelector(".group-edit-action-bar")).not.toBeNull();
  expect(view.container.querySelectorAll(".group-edit-field-row")).toHaveLength(7);
  expect(await view.findByText("Alice Display")).not.toBeNull();
  expect(view.getByText("Bob Real")).not.toBeNull();
  expect(Setting.getLabel).toHaveBeenCalledWith("Group identifier", "Internal group identifier used in routes, sync mappings, and APIs. Set it carefully when creating the group.");
  expect(Setting.getLabel).toHaveBeenCalledWith("Type", "Virtual groups are logical groups. Physical groups usually map to a real department or source-directory group.");
  expect(Setting.getLabel).toHaveBeenCalledWith("Is enabled", "Controls whether this group is enabled. Turning it off does not delete the group or its member relationships.");
  expect(groupBackendMock.getGroup).toHaveBeenCalledWith("engineering", "group-main");
  expect(groupBackendMock.getGroups).toHaveBeenCalledWith("engineering");
  expect(userBackendMock.getUsers).toHaveBeenCalledWith("engineering", 1, 20, "", "", "", "", "group-main");
  expect(organizationBackendMock.getOrganizationNames).toHaveBeenCalledWith("admin");
});

test("builds parent options from sibling groups and the owning organization", () => {
  const page = createPage();

  expect(page.getParentIdOptions()).toEqual([
    {label: "Child Group", value: "group-child"},
    {label: "Engineering", value: "engineering"},
  ]);
});

test("shows read-only membership notice for directory synced groups", () => {
  const page = createPage({
    group: {
      isDirectorySynced: true,
      directorySyncSources: ["wecom"],
    } as Partial<typeof baseGroup>,
  });

  const view = render(<>{page.renderGroup()}</>);

  expect(view.getByText("Directory synced group has source-managed fields")).not.toBeNull();
  expect(view.getByText("Sync identifier, organization, type, parent group, and members are managed by the source system. Change them in the source directory and run sync again.")).not.toBeNull();
  expect(view.getByText("Sync identifier")).not.toBeNull();
  expect(view.queryByText("Manage members")).toBeNull();
});

test("locks source-managed fields for directory synced groups", () => {
  const page = createPage({
    group: {
      isDirectorySynced: true,
      directorySyncSources: ["wecom"],
    } as Partial<typeof baseGroup>,
  });
  const node = page.renderGroup();
  const disabledValues: unknown[] = [];
  const enabledValues: unknown[] = [];

  visitReactNode(node, (element) => {
    if (element.props.value !== undefined) {
      if (element.props.disabled === true) {
        disabledValues.push(element.props.value);
      } else {
        enabledValues.push(element.props.value);
      }
    }
  });

  expect(disabledValues.filter(value => value === "engineering")).toHaveLength(2);
  expect(disabledValues).toEqual(expect.arrayContaining(["group-main", "Virtual"]));
  expect(enabledValues).toEqual(expect.arrayContaining(["Main Group"]));
});

test("shows empty read-only member summary", () => {
  const page = createPage({group: {users: []}});

  const view = render(<>{page.renderGroup()}</>);

  expect(view.getByText("No current members")).not.toBeNull();
  expect(view.getByText("Current members")).not.toBeNull();
  expect(view.getByText("Manage members")).not.toBeNull();
});

test("navigates to the existing group tree member context for local groups", () => {
  const page = createPage();
  const historyPush = page.props.history.push as ReturnType<typeof jestValue.fn>;
  const view = render(<>{page.renderGroup()}</>);

  fireEvent.click(view.getByText("Manage members"));

  expect(historyPush).toHaveBeenCalledWith("/trees/engineering/group-main");
});

test("publishes a display-name workspace tab label for group edit routes", async() => {
  await useTestLanguage("en");
  const dispatchSpy = jestValue.spyOn(window, "dispatchEvent");
  const page = createPage();

  page.publishWorkspaceTabLabel(page.state.group!);

  const dispatchedEvent = dispatchSpy.mock.calls.at(-1)?.[0] as CustomEvent | undefined;
  expect(dispatchedEvent?.type).toBe("aicodex.admin.workspaceTabLabelUpdate");
  expect(dispatchedEvent?.detail).toEqual({
    path: "/groups/engineering/group-main",
    label: "Group: Main Group",
  });
});

test("shortens directory member identifiers but keeps full value in tooltip title", () => {
  const memberId = "wecom-wwe7e01c69367e67bf/wecom-user-zhangyanan";
  const page = createPage({group: {users: [memberId]}});
  page.setState({
    memberDisplayNames: {
      "wecom-user-zhangyanan": "张亚楠",
    },
  });

  const view = render(<>{page.renderGroup()}</>);

  expect(page.getMemberDisplayName(memberId)).toBe("张亚楠");
  expect(view.getByText("张亚楠")).not.toBeNull();
});

test("folds long member summaries", () => {
  const page = createPage({group: {users: Array.from({length: 12}, (_, index) => `user-${index + 1}`)}});

  const view = render(<>{page.renderGroup()}</>);

  expect(view.getByText("user-10")).not.toBeNull();
  expect(view.getByText("+2")).not.toBeNull();
  expect(view.queryByText("user-11")).toBeNull();
  expect(view.queryByText("user-12")).toBeNull();
});

test("falls back to short member identifier when member profile lookup fails", async() => {
  userBackendMock.getUsers.mockRejectedValueOnce(new Error("user lookup failed"));
  const page = createPage({group: {users: ["wecom-owner/wecom-user-fallback"]}});

  page.loadMemberDisplayNames(page.state.group!);
  await flushPromises();

  expect(page.state.memberDisplayNames).toEqual({});
  expect(page.getMemberDisplayName("wecom-owner/wecom-user-fallback")).toBe("fallback");

  page.setState({memberDisplayNames: {"wecom-user-stale": "Stale User"}});
  userBackendMock.getUsers.mockResolvedValueOnce({status: "error", msg: "lookup failed"});
  page.loadMemberDisplayNames(page.state.group!);
  await flushPromises();
  expect(page.state.memberDisplayNames).toEqual({});
});

test("keeps empty parent options and legacy parse branch stable", () => {
  const page = createPage();

  page.state = {...page.state, group: null};

  expect(page.getParentIdOptions()).toEqual([]);
  expect(page.parseGroupField("" as never, "12")).toBe(12);
});

test("keeps rendered edit controls wired to group state updates", () => {
  const page = createPage();
  const getGroupsSpy = jestValue.spyOn(page, "getGroups");
  const node = page.renderGroup();

  visitReactNode(node, (element) => {
    const props = element.props;
    if (props.value === "engineering" && props.virtual === false) {
      props.onChange?.("sales");
    }
    if (props.value === "group-main") {
      props.onChange?.({target: {value: "group-renamed"}});
    }
    if (props.value === "Main Group") {
      props.onChange?.({target: {value: "Renamed Group"}});
    }
    if (props.value === "Virtual") {
      props.onChange?.("Physical");
    }
    if (props.value === "engineering" && props.virtual === undefined) {
      props.onChange?.("group-child");
    }
    if (props.checked === true) {
      props.onChange?.(false);
    }
  });

  expect(page.state.group).toMatchObject({
    owner: "sales",
    name: "group-renamed",
    displayName: "Renamed Group",
    type: "Physical",
    parentId: "group-child",
    isEnabled: false,
  });
  expect(page.state.dirty).toBe(true);
  expect(getGroupsSpy).toHaveBeenCalledWith("sales");
});

test("blocks save before required group fields are filled", () => {
  const page = createPage({group: {name: " ", displayName: ""}});

  page.submitGroupEdit(false);

  expect(groupBackendMock.updateGroup).not.toHaveBeenCalled();
  expect(page.state.fieldErrors).toEqual({
    name: "This field is required",
    displayName: "This field is required",
  });
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "Please fill in required group fields.");
});

test("saves group with top-group marker and navigates to renamed group", async() => {
  const page = createPage({group: {name: "group-renamed", parentId: "engineering"}});
  const historyPush = page.props.history.push as ReturnType<typeof jestValue.fn>;

  page.submitGroupEdit(false);
  await flushPromises();

  expect(groupBackendMock.updateGroup).toHaveBeenCalledWith("engineering", "group-main", expect.objectContaining({
    name: "group-renamed",
    isTopGroup: true,
  }));
  expect(Setting.showMessage).toHaveBeenCalledWith("success", "Successfully saved");
  expect(page.state.groupName).toBe("group-renamed");
  expect(page.state.dirty).toBe(false);
  expect(page.state.submitting).toBe(false);
  expect(historyPush).toHaveBeenCalledWith("/groups/engineering/group-renamed");
});

test("save-exit returns to group tree URL or group list", async() => {
  const page = createPage();
  const historyPush = page.props.history.push as ReturnType<typeof jestValue.fn>;
  sessionStorage.setItem("groupTreeUrl", "/groups/tree/engineering");

  page.submitGroupEdit(true);
  await flushPromises();

  expect(historyPush).toHaveBeenCalledWith("/groups/tree/engineering");
  expect(sessionStorage.getItem("groupTreeUrl")).toBeNull();

  page.submitGroupEdit(true);
  await flushPromises();
  expect(historyPush).toHaveBeenLastCalledWith("/groups");
});

test("restores group name and reports errors when save fails", async() => {
  groupBackendMock.updateGroup.mockResolvedValueOnce({status: "error", msg: "duplicate"});
  const page = createPage({group: {name: "group-renamed"}});

  page.submitGroupEdit(false);
  await flushPromises();

  expect(Setting.showMessage).toHaveBeenCalledWith("error", "Failed to save: duplicate");
  expect(page.state.group?.name).toBe("group-main");

  groupBackendMock.updateGroup.mockRejectedValueOnce(new Error("network down"));
  page.submitGroupEdit(false);
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("network down"));
});

test("deletes groups with existing return semantics and reports failures", async() => {
  const page = createPage({mode: "add"});
  const historyPush = page.props.history.push as ReturnType<typeof jestValue.fn>;
  sessionStorage.setItem("groupTreeUrl", "/groups/tree/engineering");

  page.deleteGroup();
  await flushPromises();

  expect(groupBackendMock.deleteGroup).toHaveBeenCalledWith(expect.objectContaining({name: "group-main"}));
  expect(historyPush).toHaveBeenCalledWith("/groups/tree/engineering");
  expect(sessionStorage.getItem("groupTreeUrl")).toBeNull();

  groupBackendMock.deleteGroup.mockResolvedValueOnce({status: "error", msg: "delete failed"});
  page.deleteGroup();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "Failed to delete: delete failed");

  groupBackendMock.deleteGroup.mockRejectedValueOnce(new Error("delete network"));
  page.deleteGroup();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete network"));

  groupBackendMock.deleteGroup.mockResolvedValueOnce({status: "ok"});
  page.deleteGroup();
  await flushPromises();
  expect(historyPush).toHaveBeenLastCalledWith("/groups");
});

test("confirms dirty cancel and back before leaving", async() => {
  const confirmSpy = jestValue.spyOn(Modal, "confirm").mockImplementation((config) => {
    config.onOk?.();
    return {destroy: jestValue.fn(), update: jestValue.fn()};
  });
  const page = createPage();
  const historyPush = page.props.history.push as ReturnType<typeof jestValue.fn>;
  sessionStorage.setItem("groupTreeUrl", "/groups/tree/engineering");
  page.setState({dirty: true});

  page.handleCancel();

  expect(confirmSpy).toHaveBeenCalledWith(expect.objectContaining({
    title: "This group has unsaved changes. Leave without saving?",
  }));
  expect(historyPush).toHaveBeenCalledWith("/groups/tree/engineering");
  expect(sessionStorage.getItem("groupTreeUrl")).toBeNull();

  const addPage = createPage({mode: "add"});
  addPage.setState({dirty: true});
  addPage.handleBack();
  await flushPromises();

  expect(groupBackendMock.deleteGroup).toHaveBeenCalledWith(expect.objectContaining({name: "group-main"}));
});

test("renders one fixed action bar with existing callbacks", async() => {
  const {view} = renderPage({mode: "add"});

  expect(await view.findByDisplayValue("Main Group")).not.toBeNull();

  expect(view.getAllByText("Save")).toHaveLength(1);
  expect(view.getAllByText("Save and return")).toHaveLength(1);
  expect(view.getAllByText("Cancel")).toHaveLength(1);

  fireEvent.click(view.getByText("Save"));
  await flushPromises();
  fireEvent.click(view.getByText("Save and return"));
  await flushPromises();
  fireEvent.click(view.getByText("Cancel"));
  await flushPromises();

  expect(groupBackendMock.updateGroup).toHaveBeenCalledTimes(2);
  expect(groupBackendMock.deleteGroup).toHaveBeenCalledTimes(1);
});
