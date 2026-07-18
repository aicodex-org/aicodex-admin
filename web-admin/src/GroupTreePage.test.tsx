import {afterEach, beforeEach, expect, test, vi} from "vitest";
import React from "react";
import {act, render} from "@testing-library/react";
import * as GroupBackend from "./backend/GroupBackend";
import * as Setting from "./Setting";
import GroupTreePage from "./GroupTreePage";
import {type ConsoleCallSpy, getReactActWarnings} from "./testUtils/reactAsyncWarnings";
import {fireEvent} from "@testing-library/react";

let consoleErrorSpy: ConsoleCallSpy;

type LooseMock = {
  (...args: unknown[]): unknown;
  mockResolvedValue: (value: unknown) => LooseMock;
  mockResolvedValueOnce: (value: unknown) => LooseMock;
  mockRejectedValueOnce: (value: unknown) => LooseMock;
  mockImplementation: (implementation: (...args: unknown[]) => unknown) => LooseMock;
};

type GroupBackendMock = Record<"getGroups" | "addGroup" | "updateGroup" | "deleteGroup", LooseMock>;
type GroupTreePageProps = React.ComponentProps<typeof GroupTreePage>;

const groupBackendMock = GroupBackend as unknown as GroupBackendMock;

vi.mock("./backend/GroupBackend", () => {
  return {
    getGroups: vi.fn(),
    addGroup: vi.fn(),
    updateGroup: vi.fn(),
    deleteGroup: vi.fn(),
  };
});

vi.mock("./common/select/OrganizationSelect", () => ({default: (props: {initValue?: string; onChange: (value: string) => void}) => (
  <select data-testid="organization-select" value={props.initValue || ""} onChange={event => props.onChange(event.target.value)}>
    <option value="engineering">engineering</option>
    <option value="sales">sales</option>
  </select>
)}));

vi.mock("./UserListPage", () => ({default: (props: {organizationName?: string; groupName?: string}) => (
  <div data-testid="user-list">{`${props.organizationName || ""}:${props.groupName || ""}`}</div>
)}));

const treeData = [
  {
    owner: "engineering",
    key: "root",
    title: "Root Group",
    type: "Virtual",
    children: [
      {
        owner: "engineering",
        key: "child",
        title: "Child Group",
        type: "Physical",
      },
    ],
  },
];

const mockMatchMedia = (query: string): MediaQueryList => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
} as unknown as MediaQueryList);

function buildProps(overrides: Partial<GroupTreePageProps> = {}): GroupTreePageProps {
  return {
    account: {owner: "engineering", isAdmin: true},
    history: {push: vi.fn()},
    match: {params: {organizationName: "engineering"}},
    ...overrides,
  } as GroupTreePageProps;
}

function createPage(overrides: Partial<GroupTreePageProps> = {}) {
  const page = new GroupTreePage(buildProps(overrides));
  page.setState = ((stateUpdate: unknown, callback?: () => void) => {
    const patch = typeof stateUpdate === "function" ? stateUpdate(page.state, page.props) : stateUpdate;
    page.state = {
      ...page.state,
      ...(patch as Partial<typeof page.state>),
    };
    callback?.();
  }) as typeof page.setState;
  return page;
}

async function flushPromises() {
  await act(async() => {
    await new Promise(resolve => setTimeout(resolve, 0));
  });
}

beforeEach(() => {
  consoleErrorSpy = vi.spyOn(console, "error") as unknown as ConsoleCallSpy;
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: mockMatchMedia,
  });
  sessionStorage.clear();
  groupBackendMock.getGroups.mockResolvedValue({status: "ok", data: treeData});
  groupBackendMock.addGroup.mockResolvedValue({status: "ok"});
  groupBackendMock.updateGroup.mockResolvedValue({status: "ok"});
  groupBackendMock.deleteGroup.mockResolvedValue({status: "ok"});
  vi.spyOn(Setting, "isAdminUser").mockImplementation((account: unknown) => {
    return Boolean((account as {isAdmin?: boolean})?.isAdmin);
  });
  vi.spyOn(Setting, "getRandomName").mockReturnValue("seed");
  vi.spyOn(Setting, "showMessage").mockImplementation(() => {});
});

afterEach(() => {
  const actWarnings = getReactActWarnings(consoleErrorSpy.mock.calls);
  consoleErrorSpy.mockRestore();
  vi.restoreAllMocks();
  vi.clearAllMocks();
  expect(actWarnings).toEqual([]);
});

test("renders group tree route and embedded user list without changing backend boundary", async() => {
  const props = buildProps();
  const view = render(<GroupTreePage {...props} />);

  expect(await view.findByText("Root Group")).not.toBeNull();
  expect(await view.findByText("Child Group")).not.toBeNull();
  expect(view.getByTestId("user-list").textContent).toBe("engineering:");
  expect(groupBackendMock.getGroups).toHaveBeenCalledWith("engineering", true);
});

test("selects tree node and clears selected group through existing routes", async() => {
  const props = buildProps();
  const view = render(<GroupTreePage {...props} />);

  fireEvent.click(await view.findByText("Child Group"));
  expect(props.history.push).toHaveBeenCalledWith("/trees/engineering/child");

  const buttons = view.container.querySelectorAll("button");
  fireEvent.click(buttons[0]);
  expect(props.history.push).toHaveBeenCalledWith("/trees/engineering");

  fireEvent.click(buttons[1]);
  expect(groupBackendMock.addGroup).not.toHaveBeenCalled();
  expect(groupBackendMock.updateGroup).not.toHaveBeenCalled();
  expect(groupBackendMock.deleteGroup).not.toHaveBeenCalled();
  expect(props.history.push).toHaveBeenCalledWith({
    pathname: "/groups/engineering/group_seed",
    state: {
      mode: "add",
      group: expect.objectContaining({
        owner: "engineering",
        parentId: "engineering",
        isTopGroup: true,
      }),
    },
  });

  fireEvent.click(view.container.querySelector(".ant-tree-switcher")!);
});

test("switches organization for admin user and refreshes tree data", async() => {
  const props = buildProps();
  const view = render(<GroupTreePage {...props} />);

  fireEvent.change(await view.findByTestId("organization-select"), {target: {value: "sales"}});

  expect(props.history.push).toHaveBeenCalledWith("/trees/sales");
  await flushPromises();
  expect(groupBackendMock.getGroups).toHaveBeenCalledWith("sales", true);
});

test("initializes non-admin owner and hides organization selector", () => {
  const page = createPage({
    account: {owner: "alice", isAdmin: false},
    match: {params: {organizationName: "alice-org"}},
  });

  expect(page.state.owner).toBe("alice");
  const view = render(<>{page.renderOrganizationSelect()}</>);
  expect(view.queryByTestId("organization-select")).toBeNull();
});

test("renders empty state and reports group tree fetch errors", async() => {
  groupBackendMock.getGroups.mockResolvedValueOnce({status: "ok", data: []});
  const emptyView = render(<GroupTreePage {...buildProps()} />);
  await flushPromises();
  expect(emptyView.container.querySelector(".ant-empty")).not.toBeNull();
  emptyView.unmount();

  groupBackendMock.getGroups.mockResolvedValueOnce({status: "error", msg: "tree unavailable"});
  const page = createPage();

  page.getTreeData();
  await flushPromises();

  expect(Setting.showMessage).toHaveBeenCalledWith("error", "tree unavailable");
});

test("opens root and child group route drafts without persistence or success messages", () => {
  const page = createPage({match: {params: {organizationName: "engineering", groupName: "root"}}});
  page.state = {
    ...page.state,
    groupName: "root",
  };

  expect(page.newGroup(true)).toEqual(expect.objectContaining({
    owner: "engineering",
    name: "group_seed",
    displayName: "New Group - seed",
    parentId: "engineering",
    isTopGroup: true,
    isEnabled: true,
  }));
  expect(page.newGroup(false)).toEqual(expect.objectContaining({
    parentId: "root",
    isTopGroup: false,
  }));

  page.addGroup(true);
  expect(groupBackendMock.addGroup).not.toHaveBeenCalled();
  expect(groupBackendMock.updateGroup).not.toHaveBeenCalled();
  expect(groupBackendMock.deleteGroup).not.toHaveBeenCalled();

  page.addGroup(false);
  expect(groupBackendMock.addGroup).not.toHaveBeenCalled();
  expect(groupBackendMock.updateGroup).not.toHaveBeenCalled();
  expect(groupBackendMock.deleteGroup).not.toHaveBeenCalled();
  expect(page.props.history.push).toHaveBeenNthCalledWith(1, {
    pathname: "/groups/engineering/group_seed",
    state: {
      mode: "add",
      group: expect.objectContaining({
        owner: "engineering",
        parentId: "engineering",
        isTopGroup: true,
      }),
    },
  });
  expect(page.props.history.push).toHaveBeenNthCalledWith(2, {
    pathname: "/groups/engineering/group_seed",
    state: {
      mode: "add",
      group: expect.objectContaining({
        owner: "engineering",
        parentId: "root",
        isTopGroup: false,
      }),
    },
  });
  expect(sessionStorage.getItem("groupTreeUrl")).toBe(window.location.pathname);
  expect(Setting.showMessage).not.toHaveBeenCalled();
});

test("keeps selected node actions for child add edit and delete", async() => {
  const page = createPage({match: {params: {organizationName: "engineering", groupName: "leaf"}}});
  page.state = {
    ...page.state,
    groupName: "leaf",
  };
  const node = page.setTreeTitle({owner: "engineering", key: "leaf", title: "Leaf Group", type: "Virtual"});
  const view = render(<>{node.title}</>);
  const icons = view.container.querySelectorAll("svg");

  [icons[1], icons[2], icons[3]].forEach(icon => {
    fireEvent.mouseEnter(icon);
    fireEvent.mouseDown(icon);
    fireEvent.mouseUp(icon);
    fireEvent.mouseLeave(icon);
  });

  fireEvent.click(icons[1]);
  expect(groupBackendMock.addGroup).not.toHaveBeenCalled();
  expect(groupBackendMock.updateGroup).not.toHaveBeenCalled();
  expect(groupBackendMock.deleteGroup).not.toHaveBeenCalled();
  expect(page.props.history.push).toHaveBeenCalledWith({
    pathname: "/groups/engineering/group_seed",
    state: {
      mode: "add",
      group: expect.objectContaining({
        owner: "engineering",
        parentId: "leaf",
        isTopGroup: false,
      }),
    },
  });

  fireEvent.click(icons[2]);
  expect(page.props.history.push).toHaveBeenCalledWith("/groups/engineering/leaf");

  fireEvent.click(icons[3]);
  await flushPromises();
  expect(groupBackendMock.deleteGroup).toHaveBeenCalledWith({owner: "engineering", name: "leaf"});
  expect(Setting.showMessage).toHaveBeenCalledWith("success", expect.any(String));
  expect(groupBackendMock.getGroups).toHaveBeenCalledWith("engineering", true);
});

test("reports delete group server and network errors", async() => {
  const page = createPage({match: {params: {organizationName: "engineering", groupName: "leaf"}}});
  page.state = {
    ...page.state,
    groupName: "leaf",
  };

  groupBackendMock.deleteGroup.mockResolvedValueOnce({status: "error", msg: "has children"});
  const rejectedNode = page.setTreeTitle({owner: "engineering", key: "leaf", title: "Leaf Group", type: "Virtual"});
  const rejectedView = render(<>{rejectedNode.title}</>);
  fireEvent.click(rejectedView.container.querySelectorAll("svg")[3]);
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("has children"));
  rejectedView.unmount();

  groupBackendMock.deleteGroup.mockRejectedValueOnce(new Error("delete offline"));
  const offlineNode = page.setTreeTitle({owner: "engineering", key: "leaf", title: "Leaf Group", type: "Virtual"});
  const offlineView = render(<>{offlineNode.title}</>);
  fireEvent.click(offlineView.container.querySelectorAll("svg")[3]);
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete offline"));
});

test("expands all returned group tree nodes when tree data changes", () => {
  const page = createPage();
  page.state = {
    ...page.state,
    treeData,
  };

  page.setTreeExpandedKeys();

  expect(page.state.expandedKeys).toEqual(["root", "child"]);
});

test("refreshes tree data when organization or tree data changes", () => {
  const page = createPage();
  const getTreeData = vi.spyOn(page, "getTreeData").mockImplementation(() => {});
  const setTreeExpandedKeys = vi.spyOn(page, "setTreeExpandedKeys").mockImplementation(() => {});
  const previousState = {
    ...page.state,
    organizationName: "old-org",
    treeData: [],
  };
  page.state = {
    ...page.state,
    organizationName: "engineering",
    treeData,
  };

  page.componentDidUpdate(page.props, previousState);

  expect(getTreeData).toHaveBeenCalledTimes(1);
  expect(setTreeExpandedKeys).toHaveBeenCalledTimes(1);
});
