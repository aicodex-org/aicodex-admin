/* eslint-env jest */
import React from "react";
import {act, cleanup, render} from "@testing-library/react";
import {expect as jestExpect, jest as jestValue} from "@jest/globals";
import i18next from "i18next";
import GroupEditPage from "./GroupEditPage";
import * as GroupBackend from "./backend/GroupBackend";
import * as OrganizationBackend from "./backend/OrganizationBackend";
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
  expect(view.getByText("alice,bob")).not.toBeNull();
  expect(groupBackendMock.getGroup).toHaveBeenCalledWith("engineering", "group-main");
  expect(groupBackendMock.getGroups).toHaveBeenCalledWith("engineering");
  expect(organizationBackendMock.getOrganizationNames).toHaveBeenCalledWith("admin");
});

test("builds parent options from sibling groups and the owning organization", () => {
  const page = createPage();

  expect(page.getParentIdOptions()).toEqual([
    {label: "Child Group", value: "group-child"},
    {label: "Engineering", value: "engineering"},
  ]);
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
  expect(getGroupsSpy).toHaveBeenCalledWith("sales");
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

test("renders top and bottom action buttons with existing callbacks", async() => {
  const {view} = renderPage({mode: "add"});

  expect(await view.findByDisplayValue("Main Group")).not.toBeNull();

  fireEvent.click(view.getAllByText("Save")[0]);
  await flushPromises();
  fireEvent.click(view.getAllByText("Save & Exit")[0]);
  await flushPromises();
  fireEvent.click(view.getAllByText("Cancel")[0]);
  await flushPromises();
  fireEvent.click(view.getAllByText("Save")[1]);
  await flushPromises();
  fireEvent.click(view.getAllByText("Save & Exit")[1]);
  await flushPromises();
  fireEvent.click(view.getAllByText("Cancel")[1]);
  await flushPromises();

  expect(groupBackendMock.updateGroup).toHaveBeenCalledTimes(4);
  expect(groupBackendMock.deleteGroup).toHaveBeenCalledTimes(2);
});
