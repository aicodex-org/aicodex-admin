/* eslint-env jest */
import React from "react";
import {expect as jestExpect, jest as jestValue} from "@jest/globals";
import {cleanup, render} from "@testing-library/react";
import {Button, Input, Modal, Select, Switch} from "antd";
import * as Setting from "./Setting";
import * as RoleBackend from "./backend/RoleBackend";
import * as PermissionBackend from "./backend/PermissionBackend";
import * as OrganizationBackend from "./backend/OrganizationBackend";
import * as UserBackend from "./backend/UserBackend";
import * as GroupBackend from "./backend/GroupBackend";
import * as ModelBackend from "./backend/ModelBackend";
import * as ApplicationBackend from "./backend/ApplicationBackend";
import RoleEditPage from "./RoleEditPage";
import PermissionEditPage from "./PermissionEditPage";

declare const jest: typeof jestValue;

type LooseMock = {
  (...args: unknown[]): unknown;
  mockImplementation: (implementation: (...args: unknown[]) => unknown) => LooseMock;
  mockReturnValue: (value: unknown) => LooseMock;
  mockResolvedValue: (value: unknown) => LooseMock;
  mockResolvedValueOnce: (value: unknown) => LooseMock;
  mockRejectedValueOnce: (value: unknown) => LooseMock;
};

type RoleBackendMock = Record<keyof typeof RoleBackend, LooseMock>;
type PermissionBackendMock = Record<keyof typeof PermissionBackend, LooseMock>;
type OrganizationBackendMock = Record<"getOrganizations", LooseMock>;
type UserBackendMock = Record<"getUsers", LooseMock>;
type GroupBackendMock = Record<"getGroups", LooseMock>;
type ModelBackendMock = Record<keyof typeof ModelBackend, LooseMock>;
type ApplicationBackendMock = Record<"getApplicationsByOrganization", LooseMock>;

type Account = {
  owner: string;
  name: string;
  tag: string;
  isAdmin: boolean;
};

type RoleRecord = {
  owner: string;
  name: string;
  displayName: string;
  description: string;
  users: string[];
  groups: string[];
  roles: string[];
  domains: string[];
  isEnabled: boolean;
};

type PermissionRecord = RoleRecord & {
  model: string;
  resourceType: "Application" | "API" | "Custom" | "TreeNode";
  resources: string[];
  actions: string[];
  effect: "Allow" | "Deny";
  submitter: string;
  approver: string;
  approveTime: string;
  state: "Approved" | "Pending";
};

type ModelRecord = {
  owner: string;
  name: string;
  modelText: string;
};

type OrganizationRecord = {
  name: string;
};

type UserRecord = {
  owner: string;
  name: string;
};

type GroupRecord = {
  owner: string;
  name: string;
};

type ApplicationRecord = {
  name: string;
};

type RolePageHarness = InstanceType<typeof RoleEditPage> & {
  state: InstanceType<typeof RoleEditPage>["state"] & {
    organizationName: string;
    roleName: string;
    role: RoleRecord | null;
    organizations: OrganizationRecord[];
    mode: string;
  };
};

type PermissionPageHarness = InstanceType<typeof PermissionEditPage> & {
  state: InstanceType<typeof PermissionEditPage>["state"] & {
    organizationName: string;
    permissionName: string;
    permission: PermissionRecord | null;
    organizations: OrganizationRecord[];
    models: ModelRecord[];
    resources: ApplicationRecord[];
    model: ModelRecord | null;
    mode: string;
  };
};

const expect = jestExpect;
const roleBackendMock = RoleBackend as unknown as RoleBackendMock;
const permissionBackendMock = PermissionBackend as unknown as PermissionBackendMock;
const organizationBackendMock = OrganizationBackend as unknown as OrganizationBackendMock;
const userBackendMock = UserBackend as unknown as UserBackendMock;
const groupBackendMock = GroupBackend as unknown as GroupBackendMock;
const modelBackendMock = ModelBackend as unknown as ModelBackendMock;
const applicationBackendMock = ApplicationBackend as unknown as ApplicationBackendMock;

jest.mock("./backend/RoleBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    getRoles: factoryJest.fn(),
    getRole: factoryJest.fn(),
    updateRole: factoryJest.fn(),
    addRole: factoryJest.fn(),
    deleteRole: factoryJest.fn(),
  };
});

jest.mock("./backend/PermissionBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    getPermissions: factoryJest.fn(),
    getPermissionsBySubmitter: factoryJest.fn(),
    getPermission: factoryJest.fn(),
    updatePermission: factoryJest.fn(),
    addPermission: factoryJest.fn(),
    deletePermission: factoryJest.fn(),
  };
});

jest.mock("./backend/OrganizationBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    getOrganizations: factoryJest.fn(),
  };
});

jest.mock("./backend/UserBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    getUsers: factoryJest.fn(),
  };
});

jest.mock("./backend/GroupBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    getGroups: factoryJest.fn(),
  };
});

jest.mock("./backend/ModelBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    getModels: factoryJest.fn(),
    getModel: factoryJest.fn(),
  };
});

jest.mock("./backend/ApplicationBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    getApplicationsByOrganization: factoryJest.fn(),
  };
});

jest.mock("./TourConfig", () => ({
  getTourVisible: () => false,
  getSteps: () => [],
  getNextUrl: () => "",
  setIsTourVisible: () => undefined,
}));

jest.mock("./common/PaginateSelect", () => {
  const ReactFactory = require("react");
  return function MockPaginateSelect(props: {value?: unknown[]; disabled?: boolean; onChange?: (value: unknown[]) => void}) {
    return ReactFactory.createElement("button", {
      type: "button",
      "data-testid": "paginate-select",
      "data-disabled": props.disabled ? "true" : "false",
      onClick: () => props.onChange?.(["mocked/value"]),
    }, Array.isArray(props.value) ? props.value.join(",") : "");
  };
});

const adminAccount: Account = {owner: "built-in", name: "admin", tag: "", isAdmin: true};
const normalAccount: Account = {owner: "engineering", name: "alice", tag: "", isAdmin: false};
const role: RoleRecord = {
  owner: "engineering",
  name: "role-main",
  displayName: "Main Role",
  description: "role description",
  users: ["engineering/alice"],
  groups: ["engineering/ops"],
  roles: [],
  domains: ["domain-a"],
  isEnabled: true,
};
const permission: PermissionRecord = {
  ...role,
  name: "permission-main",
  displayName: "Main Permission",
  description: "permission description",
  model: "engineering/rbac",
  resourceType: "Application",
  resources: ["app-main"],
  actions: ["Read"],
  effect: "Allow",
  submitter: "admin",
  approver: "",
  approveTime: "",
  state: "Pending",
};
const model: ModelRecord = {
  owner: "engineering",
  name: "rbac",
  modelText: "[role_definition]\ng = _, _",
};

function flushPromises() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

function createHistory() {
  return {
    push: jestValue.fn(),
  };
}

function installSynchronousSetState<T extends React.Component>(page: T) {
  page.setState = ((stateUpdate: unknown, callback?: () => void) => {
    const patch = typeof stateUpdate === "function"
      ? (stateUpdate as (state: T["state"], props: T["props"]) => unknown)(page.state, page.props)
      : stateUpdate;
    page.state = {
      ...(page.state as Record<string, unknown>),
      ...(patch as Record<string, unknown>),
    } as T["state"];
    callback?.();
  }) as typeof page.setState;
}

function createRolePage(account: Account = adminAccount, location: Record<string, unknown> = {}) {
  const page = new RoleEditPage({
    account,
    history: createHistory(),
    location,
    match: {params: {organizationName: "engineering", roleName: "role-main"}},
  } as React.ComponentProps<typeof RoleEditPage>) as RolePageHarness;
  installSynchronousSetState(page);
  return page;
}

function createPermissionPage(account: Account = adminAccount, location: Record<string, unknown> = {}) {
  const page = new PermissionEditPage({
    account,
    history: createHistory(),
    location,
    match: {params: {organizationName: "engineering", permissionName: "permission-main"}},
  } as React.ComponentProps<typeof PermissionEditPage>) as PermissionPageHarness;
  installSynchronousSetState(page);
  return page;
}

function collectElementsByType(node: React.ReactNode, type: React.ElementType, matches: React.ReactElement[] = []) {
  if (!React.isValidElement(node)) {
    return matches;
  }
  if (node.type === type) {
    matches.push(node);
  }
  const props = node.props as {children?: React.ReactNode; title?: React.ReactNode};
  collectElementsByType(props.title, type, matches);
  React.Children.forEach(props.children, child => collectElementsByType(child, type, matches));
  return matches;
}

function collectElementsByProp(node: React.ReactNode, propName: string, matches: React.ReactElement[] = []) {
  if (!React.isValidElement(node)) {
    return matches;
  }
  const props = node.props as Record<string, unknown> & {children?: React.ReactNode; title?: React.ReactNode};
  if (propName in props) {
    matches.push(node);
  }
  collectElementsByProp(props.title, propName, matches);
  React.Children.forEach(props.children, child => collectElementsByProp(child, propName, matches));
  return matches;
}

function elementProps<T>(element: React.ReactElement): T {
  return element.props as T;
}

beforeEach(() => {
  cleanup();
  localStorage.clear();
  localStorage.setItem("organization", "engineering");
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: () => ({
      matches: false,
      addListener: jestValue.fn(),
      removeListener: jestValue.fn(),
      addEventListener: jestValue.fn(),
      removeEventListener: jestValue.fn(),
    }),
  });
  jestValue.spyOn(Setting, "showMessage").mockImplementation(() => {});
  jestValue.spyOn(Setting, "isMobile").mockReturnValue(false);
  jestValue.spyOn(Setting, "isAdminUser").mockImplementation((account: unknown) => Boolean((account as Account).isAdmin));
  jestValue.spyOn(Setting, "isLocalAdminUser").mockImplementation((account: unknown) => Boolean((account as Account).isAdmin));
  jestValue.spyOn(Setting, "getApiPaths").mockReturnValue(["/api/main"]);
  roleBackendMock.getRole.mockResolvedValue({status: "ok", data: role});
  roleBackendMock.updateRole.mockResolvedValue({status: "ok"});
  roleBackendMock.deleteRole.mockResolvedValue({status: "ok"});
  roleBackendMock.getRoles.mockResolvedValue({status: "ok", data: [role], data2: 1});
  permissionBackendMock.getPermission.mockResolvedValue({status: "ok", data: permission});
  permissionBackendMock.updatePermission.mockResolvedValue({status: "ok"});
  permissionBackendMock.deletePermission.mockResolvedValue({status: "ok"});
  organizationBackendMock.getOrganizations.mockResolvedValue({status: "ok", data: [{name: "engineering"}]});
  userBackendMock.getUsers.mockResolvedValue({status: "ok", data: [{owner: "engineering", name: "alice"}], data2: 1});
  groupBackendMock.getGroups.mockResolvedValue({status: "ok", data: [{owner: "engineering", name: "ops"}], data2: 1});
  modelBackendMock.getModels.mockResolvedValue({status: "ok", data: [model], data2: 1});
  modelBackendMock.getModel.mockResolvedValue({status: "ok", data: model});
  applicationBackendMock.getApplicationsByOrganization.mockResolvedValue({status: "ok", data: [{name: "app-main"}]});
});

afterEach(() => {
  jestValue.restoreAllMocks();
  jestValue.clearAllMocks();
  cleanup();
});

test("migrates role and permission edit page modules to TSX files", () => {
  expect(() => require.resolve("./RoleEditPage.tsx")).not.toThrow();
  expect(() => require.resolve("./PermissionEditPage.tsx")).not.toThrow();
  expect(() => require.resolve("./RoleEditPage.js")).toThrow();
  expect(() => require.resolve("./PermissionEditPage.js")).toThrow();
});

test("loads role edit data and keeps field update and save navigation", async() => {
  const page = createRolePage();
  const history = page.props.history as ReturnType<typeof createHistory>;

  page.UNSAFE_componentWillMount();
  await flushPromises();

  expect(roleBackendMock.getRole).toHaveBeenCalledWith("engineering", "role-main");
  expect(organizationBackendMock.getOrganizations).toHaveBeenCalledWith("admin");
  expect(page.state.role).toEqual(role);
  expect(page.state.organizations).toEqual([{name: "engineering"}]);

  page.updateRoleField("displayName", "Updated Role");
  page.updateRoleField("users", ["engineering/bob"]);
  page.submitRoleEdit(false);
  await flushPromises();

  expect(roleBackendMock.updateRole).toHaveBeenCalledWith("engineering", "role-main", expect.objectContaining({
    displayName: "Updated Role",
    users: ["engineering/bob"],
  }));
  expect(history.push).toHaveBeenCalledWith("/roles/engineering/role-main");

  page.state = {...page.state, role: {...role, name: "renamed-role"}};
  page.submitRoleEdit(true);
  await flushPromises();
  expect(history.push).toHaveBeenCalledWith("/roles");
});

test("keeps role edit delete, add-mode cancel and error branches", async() => {
  const page = createRolePage(adminAccount, {mode: "add"});
  const history = page.props.history as ReturnType<typeof createHistory>;
  page.state = {
    ...page.state,
    mode: "add",
    role: {...role, name: "bad-name"},
  };

  roleBackendMock.updateRole.mockResolvedValueOnce({status: "error", msg: "save failed"});
  page.submitRoleEdit(false);
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("save failed"));
  expect(page.state.role?.name).toBe("role-main");

  roleBackendMock.updateRole.mockRejectedValueOnce(new Error("save network"));
  page.submitRoleEdit(false);
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("save network"));

  page.deleteRole();
  await flushPromises();
  expect(roleBackendMock.deleteRole).toHaveBeenCalledWith(expect.objectContaining({name: "role-main"}));
  expect(history.push).toHaveBeenCalledWith("/roles");

  roleBackendMock.deleteRole.mockResolvedValueOnce({status: "error", msg: "delete failed"});
  page.deleteRole();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete failed"));

  roleBackendMock.deleteRole.mockRejectedValueOnce(new Error("delete network"));
  page.deleteRole();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete network"));

  roleBackendMock.getRole.mockResolvedValueOnce({status: "ok", data: null});
  page.getRole();
  await flushPromises();
  expect(history.push).toHaveBeenCalledWith("/404");

  roleBackendMock.getRole.mockResolvedValueOnce({status: "error", msg: "role missing", data: role});
  page.getRole();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "role missing");
});

test("renders role edit controls and selector callbacks", () => {
  const page = createRolePage();
  page.state = {
    ...page.state,
    role: {...role},
    organizations: [{name: "engineering"}],
  };

  const view = render(page.renderRole() as React.ReactElement);
  expect(view.container.querySelector(".identity-object-edit-card.role-edit-card")).not.toBeNull();
  expect(view.container.querySelector(".identity-object-edit-header")).not.toBeNull();
  expect(view.container.querySelector(".identity-object-edit-action-bar")).not.toBeNull();
  expect(view.container.querySelectorAll(".identity-object-edit-section")).toHaveLength(2);
  expect(view.container.querySelectorAll(".identity-object-edit-field-row")).toHaveLength(9);
  expect(view.getByDisplayValue("role-main")).not.toBeNull();
  expect(view.container.querySelectorAll(".identity-object-edit-action-bar .ant-btn")).toHaveLength(3);

  const paginateSelects = view.getAllByTestId("paginate-select");
  paginateSelects[0].dispatchEvent(new MouseEvent("click", {bubbles: true}));
  expect(page.state.role?.users).toEqual(["mocked/value"]);

  jestValue.spyOn(Setting, "isMobile").mockReturnValue(true);
  expect(page.renderRole()).not.toBeNull();
});

test("renders role page root with shared identity edit class", () => {
  const page = createRolePage();
  page.state = {
    ...page.state,
    role: {...role},
  };

  const view = render(page.render() as React.ReactElement);

  expect(view.container.querySelector(".identity-object-edit-page.role-edit-page")).not.toBeNull();
});

test("blocks role save before required fields are filled", () => {
  const page = createRolePage();
  page.state = {
    ...page.state,
    role: {...role, name: " ", displayName: ""},
  };

  page.submitRoleEdit(false);

  expect(roleBackendMock.updateRole).not.toHaveBeenCalled();
  expect(page.state.fieldErrors).toEqual({
    name: "此字段必填",
    displayName: "此字段必填",
  });
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "请补齐角色必填字段。");
});

test("confirms dirty role cancel and back before leaving", async() => {
  const confirmSpy = jestValue.spyOn(Modal, "confirm").mockImplementation((config) => {
    config.onOk?.();
    return {destroy: jestValue.fn(), update: jestValue.fn()};
  });
  const page = createRolePage();
  const history = page.props.history as ReturnType<typeof createHistory>;
  page.state = {
    ...page.state,
    role: {...role},
    dirty: true,
  };

  page.handleCancel();

  expect(confirmSpy).toHaveBeenCalledWith(expect.objectContaining({
    title: "当前角色有未保存修改，确认不保存并离开？",
  }));
  expect(history.push).toHaveBeenCalledWith("/roles");

  const addPage = createRolePage(adminAccount, {mode: "add"});
  addPage.state = {
    ...addPage.state,
    mode: "add",
    role: {...role},
    dirty: true,
  };
  addPage.handleBack();
  await flushPromises();

  expect(roleBackendMock.deleteRole).toHaveBeenCalledWith(expect.objectContaining({name: "role-main"}));
});

test("keeps role edit form handlers and guard branches", async() => {
  const guardedPage = createRolePage();
  expect(guardedPage.renderRole()).toBeNull();
  guardedPage.updateRoleField("name", "ignored");
  guardedPage.submitRoleEdit(false);
  guardedPage.deleteRole();
  expect(roleBackendMock.updateRole).not.toHaveBeenCalled();
  expect(roleBackendMock.deleteRole).not.toHaveBeenCalled();

  const page = createRolePage(adminAccount, {mode: "add"});
  page.state = {
    ...page.state,
    mode: "add",
    role: {...role},
    organizations: [{name: "engineering"}, {name: "security"}],
  };
  const roleView = page.renderRole();
  const selects = collectElementsByType(roleView, Select);
  elementProps<{onChange: (value: string) => void}>(selects[0]).onChange("security");
  expect(page.state.role?.owner).toBe("security");
  elementProps<{onChange: (value: string[]) => void}>(selects[1]).onChange(["domain-b"]);
  expect(page.state.role?.domains).toEqual(["domain-b"]);

  const inputs = collectElementsByType(roleView, Input);
  elementProps<{onChange: (event: {target: {value: string}}) => void}>(inputs[0]).onChange({target: {value: "role-updated"}});
  elementProps<{onChange: (event: {target: {value: string}}) => void}>(inputs[1]).onChange({target: {value: "Updated display"}});
  elementProps<{onChange: (event: {target: {value: string}}) => void}>(inputs[2]).onChange({target: {value: "Updated description"}});
  expect(page.state.role).toEqual(expect.objectContaining({
    name: "role-updated",
    displayName: "Updated display",
    description: "Updated description",
  }));

  elementProps<{onChange: (checked: boolean) => void}>(collectElementsByType(roleView, Switch)[0]).onChange(false);
  expect(page.state.role?.isEnabled).toBe(false);

  const paginateControls = collectElementsByProp(roleView, "buildFetchArgs");
  const userSelect = elementProps<{
    buildFetchArgs: (args: {page: number; pageSize: number; searchText?: string}) => unknown[];
    optionMapper: (user: UserRecord) => unknown;
    onChange: (value: string[]) => void;
      }>(paginateControls[0]);
  expect(userSelect.buildFetchArgs({page: 2, pageSize: 20, searchText: "ali"})).toEqual(["engineering", 2, 20, "name", "ali"]);
  expect(userSelect.optionMapper({owner: "engineering", name: "alice"})).toEqual(Setting.getOption("engineering/alice", "engineering/alice"));
  userSelect.onChange(["engineering/bob"]);
  expect(page.state.role?.users).toEqual(["engineering/bob"]);

  const groupSelect = elementProps<{
    buildFetchArgs: (args: {page: number; pageSize: number; searchText?: string}) => unknown[];
    optionMapper: (group: GroupRecord) => unknown;
    onChange: (value: string[]) => void;
      }>(paginateControls[1]);
  expect(groupSelect.buildFetchArgs({page: 1, pageSize: 10})).toEqual(["engineering", false, 1, 10, "", undefined, "", ""]);
  expect(groupSelect.optionMapper({owner: "engineering", name: "ops"})).toEqual(Setting.getOption("engineering/ops", "engineering/ops"));
  groupSelect.onChange(["engineering/platform"]);
  expect(page.state.role?.groups).toEqual(["engineering/platform"]);

  const roleSelect = elementProps<{
    buildFetchArgs: (args: {page: number; pageSize: number; searchText?: string}) => unknown[];
    optionMapper: (role: RoleRecord) => unknown;
    onChange: (value: string[]) => void;
      }>(paginateControls[2]);
  expect(roleSelect.buildFetchArgs({page: 1, pageSize: 10, searchText: "child"})).toEqual(["engineering", 1, 10, "name", "child", "", ""]);
  expect(roleSelect.optionMapper({...role, owner: "engineering", name: "role-main"})).toBeNull();
  expect(roleSelect.optionMapper({...role, owner: "engineering", name: "role-child"})).toEqual(Setting.getOption("engineering/role-child", "engineering/role-child"));
  roleSelect.onChange(["engineering/role-child"]);
  expect(page.state.role?.roles).toEqual(["engineering/role-child"]);

  for (const button of collectElementsByType(roleView, Button)) {
    elementProps<{onClick?: () => void}>(button).onClick?.();
    await flushPromises();
  }

  for (const button of collectElementsByType(page.render(), Button)) {
    elementProps<{onClick?: () => void}>(button).onClick?.();
    await flushPromises();
  }
  expect(roleBackendMock.updateRole).toHaveBeenCalled();
  expect(roleBackendMock.deleteRole).toHaveBeenCalled();
});

test("loads permission edit data, model and application resources", async() => {
  const page = createPermissionPage();

  page.UNSAFE_componentWillMount();
  await flushPromises();

  expect(permissionBackendMock.getPermission).toHaveBeenCalledWith("engineering", "permission-main");
  expect(organizationBackendMock.getOrganizations).toHaveBeenCalledWith("admin");
  expect(modelBackendMock.getModels).toHaveBeenCalledWith("engineering");
  expect(modelBackendMock.getModel).toHaveBeenCalledWith("engineering", "rbac");
  expect(applicationBackendMock.getApplicationsByOrganization).toHaveBeenCalledWith("admin", "engineering");
  expect(page.state.permission).toEqual(permission);
  expect(page.state.models).toEqual([model]);
  expect(page.state.resources).toEqual([{name: "app-main"}]);
  expect(page.hasRoleDefinition(model)).toBe(true);
  expect(page.hasRoleDefinition({...model, modelText: "[request_definition]"})).toBe(false);
});

test("keeps permission validation and normal submitter restriction", async() => {
  const page = createPermissionPage(normalAccount);
  page.state = {
    ...page.state,
    permission: {...permission, submitter: "other-user"},
  };

  page.submitPermissionEdit(false);
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringMatching(/normal user|普通/));
  expect(permissionBackendMock.updatePermission).not.toHaveBeenCalled();

  page.state = {...page.state, permission: {...permission, users: [], roles: []}};
  page.submitPermissionEdit(false);
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringMatching(/users and roles|用户.*角色/));

  page.state = {...page.state, permission: {...permission, resources: []}};
  page.submitPermissionEdit(false);
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringMatching(/resources|资源/));

  page.state = {...page.state, permission: {...permission, actions: []}};
  page.submitPermissionEdit(false);
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringMatching(/actions|操作/));
});

test("saves and deletes permission while preserving navigation and rollback", async() => {
  const page = createPermissionPage();
  const history = page.props.history as ReturnType<typeof createHistory>;
  page.state = {
    ...page.state,
    permission: {...permission, name: "renamed-permission"},
  };

  page.submitPermissionEdit(false);
  await flushPromises();
  expect(permissionBackendMock.updatePermission).toHaveBeenCalledWith("engineering", "permission-main", expect.objectContaining({name: "renamed-permission"}));
  expect(history.push).toHaveBeenCalledWith("/permissions/engineering/renamed-permission");

  page.submitPermissionEdit(true);
  await flushPromises();
  expect(history.push).toHaveBeenCalledWith("/permissions");

  permissionBackendMock.updatePermission.mockResolvedValueOnce({status: "error", msg: "save failed"});
  page.state = {...page.state, permission: {...permission, name: "bad-name"}};
  page.submitPermissionEdit(false);
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("save failed"));
  expect(page.state.permission?.name).toBe("renamed-permission");

  page.deletePermission();
  await flushPromises();
  expect(permissionBackendMock.deletePermission).toHaveBeenCalledWith(expect.objectContaining({name: "renamed-permission"}));
});

test("keeps permission approval and resource type edit branches", () => {
  const page = createPermissionPage();
  page.state = {
    ...page.state,
    permission: {...permission},
    organizations: [{name: "engineering"}],
    models: [model],
    resources: [{name: "app-main"}],
    model,
  };

  const permissionView = page.renderPermission();
  const renderedPermission = render(permissionView as React.ReactElement);
  expect(renderedPermission.container.querySelector(".admin-identity-object-edit-card.permission-edit-card")).not.toBeNull();
  expect(renderedPermission.container.querySelectorAll(".admin-identity-object-edit-field-row")).toHaveLength(18);
  renderedPermission.unmount();
  const selectElements = collectElementsByType(permissionView, Select);
  const stateSelect = selectElements.find(element => (element.props as {value?: string}).value === "Pending");
  expect(stateSelect).not.toBeUndefined();

  (stateSelect?.props as {onChange: (value: string) => void}).onChange("Approved");
  expect(page.state.permission?.state).toBe("Approved");
  expect(page.state.permission?.approver).toBe("admin");
  expect(page.state.permission?.approveTime).not.toBe("");

  const resourceTypeSelect = selectElements.find(element => (element.props as {value?: string}).value === "Application");
  (resourceTypeSelect?.props as {onChange: (value: string) => void}).onChange("API");
  expect(page.state.permission?.resourceType).toBe("API");
  expect(page.state.permission?.resources).toEqual([]);

  page.updatePermissionField("model", "");
  expect(modelBackendMock.getModel).not.toHaveBeenCalledWith("", undefined);
});

test("renders mobile edit layouts and alternate route prop branches", async() => {
  jestValue.spyOn(Setting, "isMobile").mockReturnValue(true);

  const rolePage = new RoleEditPage({
    account: adminAccount,
    history: createHistory(),
    match: {params: {organizationName: "engineering", roleName: "role-main"}},
    organizationName: "security",
  } as React.ComponentProps<typeof RoleEditPage>) as RolePageHarness;
  installSynchronousSetState(rolePage);
  expect(rolePage.state.organizationName).toBe("security");
  expect(rolePage.state.mode).toBe("edit");
  expect(rolePage.render()).not.toBeNull();

  roleBackendMock.getRole.mockResolvedValueOnce({status: "ok"});
  rolePage.getRole();
  await flushPromises();
  expect(rolePage.state.role).toBeNull();
  organizationBackendMock.getOrganizations.mockResolvedValueOnce({status: "ok"});
  rolePage.getOrganizations();
  await flushPromises();
  expect(rolePage.state.organizations).toEqual([]);

  const permissionPage = new PermissionEditPage({
    account: normalAccount,
    history: createHistory(),
    match: {params: {organizationName: "engineering", permissionName: "permission-main"}},
    organizationName: "security",
  } as React.ComponentProps<typeof PermissionEditPage>) as PermissionPageHarness;
  installSynchronousSetState(permissionPage);
  expect(permissionPage.state.organizationName).toBe("security");
  expect(permissionPage.state.mode).toBe("edit");
  expect(permissionPage.render()).not.toBeNull();

  permissionPage.state = {
    ...permissionPage.state,
    permission: {...permission},
    organizations: [{name: "engineering"}],
    models: [model],
    resources: [{name: "app-main"}],
    model: {...model, modelText: "[request_definition]"},
  };
  expect(permissionPage.renderPermission()).not.toBeNull();

  const stateSelect = collectElementsByType(permissionPage.renderPermission(), Select).find(select => elementProps<{value?: unknown}>(select).value === "Pending") as React.ReactElement;
  elementProps<{onChange: (value: string) => void}>(stateSelect).onChange("Pending");
  expect(permissionPage.state.permission).toEqual(expect.objectContaining({state: "Pending", approver: ""}));

  modelBackendMock.getModels.mockResolvedValueOnce({status: "ok"});
  permissionPage.getModels("engineering");
  await flushPromises();
  expect(permissionPage.state.models).toEqual([]);
  modelBackendMock.getModel.mockResolvedValueOnce({status: "ok"});
  permissionPage.getModel("engineering/rbac");
  await flushPromises();
  expect(permissionPage.state.model).toBeNull();
  applicationBackendMock.getApplicationsByOrganization.mockResolvedValueOnce({status: "ok"});
  permissionPage.getResources("engineering");
  await flushPromises();
  expect(permissionPage.state.resources).toEqual([]);
});

test("keeps permission form handlers, fetch adapters and API resource branches", async() => {
  const page = createPermissionPage(adminAccount, {mode: "add"});
  page.state = {
    ...page.state,
    mode: "add",
    permission: {...permission},
    organizations: [{name: "engineering"}, {name: "security"}],
    models: [model],
    resources: [{name: "app-main"}, {name: "app-secondary"}],
    model,
  };

  const permissionView = page.renderPermission();
  const inputs = collectElementsByType(permissionView, Input);
  elementProps<{onChange: (event: {target: {value: string}}) => void}>(inputs[0]).onChange({target: {value: "permission-updated"}});
  elementProps<{onChange: (event: {target: {value: string}}) => void}>(inputs[1]).onChange({target: {value: "Updated permission"}});
  elementProps<{onChange: (event: {target: {value: string}}) => void}>(inputs[2]).onChange({target: {value: "Updated description"}});
  elementProps<{onChange: (event: {target: {value: string}}) => void}>(inputs[3]).onChange({target: {value: "submitter-updated"}});
  elementProps<{onChange: (event: {target: {value: string}}) => void}>(inputs[4]).onChange({target: {value: "approver-updated"}});
  elementProps<{onChange: (event: {target: {value: string}}) => void}>(inputs[5]).onChange({target: {value: "2026-06-20"}});
  expect(page.state.permission).toEqual(expect.objectContaining({
    name: "permission-updated",
    displayName: "Updated permission",
    description: "Updated description",
    submitter: "submitter-updated",
    approver: "approver-updated",
    approveTime: "2026-06-20",
  }));

  const selects = collectElementsByType(permissionView, Select);
  elementProps<{onChange: (value: string) => void}>(selects.find(select => elementProps<{value?: unknown}>(select).value === "engineering") as React.ReactElement).onChange("security");
  expect(page.state.permission?.owner).toBe("security");
  expect(modelBackendMock.getModels).toHaveBeenCalledWith("security");
  expect(applicationBackendMock.getApplicationsByOrganization).toHaveBeenCalledWith("admin", "security");

  elementProps<{onChange: (value: string) => void}>(selects.find(select => elementProps<{value?: unknown}>(select).value === "engineering/rbac") as React.ReactElement).onChange("engineering/new-model");
  expect(page.state.permission?.model).toBe("engineering/new-model");
  expect(modelBackendMock.getModel).toHaveBeenCalledWith("engineering", "new-model");

  elementProps<{onChange: (value: string[]) => void}>(selects.find(select => Array.isArray(elementProps<{value?: unknown}>(select).value) && (elementProps<{value?: unknown}>(select).value as string[]).includes("domain-a")) as React.ReactElement).onChange(["*"]);
  expect(page.state.permission?.domains).toEqual(["*"]);

  elementProps<{onChange: (value: string[]) => void}>(selects.find(select => Array.isArray(elementProps<{value?: unknown}>(select).value) && (elementProps<{value?: unknown}>(select).value as string[]).includes("app-main")) as React.ReactElement).onChange(["app-secondary"]);
  expect(page.state.permission?.resources).toEqual(["app-secondary"]);

  elementProps<{onChange: (value: string[]) => void}>(selects.find(select => Array.isArray(elementProps<{value?: unknown}>(select).value) && (elementProps<{value?: unknown}>(select).value as string[]).includes("Read")) as React.ReactElement).onChange(["Write"]);
  expect(page.state.permission?.actions).toEqual(["Write"]);

  elementProps<{onChange: (value: string) => void}>(selects.find(select => elementProps<{value?: unknown}>(select).value === "Allow") as React.ReactElement).onChange("Deny");
  expect(page.state.permission?.effect).toBe("Deny");

  elementProps<{onChange: (checked: boolean) => void}>(collectElementsByType(permissionView, Switch)[0]).onChange(false);
  expect(page.state.permission?.isEnabled).toBe(false);

  const resourceTypeSelect = selects.find(select => elementProps<{value?: unknown}>(select).value === "Application") as React.ReactElement;
  elementProps<{onChange: (value: string) => void}>(resourceTypeSelect).onChange("API");
  expect(page.state.permission).toEqual(expect.objectContaining({resourceType: "API", resources: []}));
  expect(collectElementsByType(page.renderPermission(), Select).some(select => {
    const options = elementProps<{options?: Array<{value: string}>}>(select).options || [];
    return options.some(option => option.value === "/api/main");
  })).toBe(true);

  const pendingStateSelect = collectElementsByType(permissionView, Select).find(select => elementProps<{value?: unknown}>(select).value === "Pending") as React.ReactElement;
  elementProps<{onChange: (value: string) => void}>(pendingStateSelect).onChange("Approved");
  page.state = {...page.state, permission: {...page.state.permission as PermissionRecord, state: "Approved", approver: "admin", approveTime: "2026-06-20"}};
  const approvedStateSelect = collectElementsByType(page.renderPermission(), Select).find(select => elementProps<{value?: unknown}>(select).value === "Approved") as React.ReactElement;
  elementProps<{onChange: (value: string) => void}>(approvedStateSelect).onChange("Pending");
  expect(page.state.permission).toEqual(expect.objectContaining({state: "Pending", approver: "", approveTime: ""}));

  const paginateControls = collectElementsByProp(permissionView, "fetchPage");
  const userSelect = elementProps<{
    fetchPage: (...args: unknown[]) => Promise<{status: string; data?: unknown[]}>;
    buildFetchArgs: (args: {page: number; pageSize: number; searchText?: string}) => unknown[];
    onChange: (value: string[]) => void;
      }>(paginateControls[0]);
  userBackendMock.getUsers.mockResolvedValueOnce({status: "error", msg: "user failed"});
  expect(await userSelect.fetchPage("engineering", 1, 20, "", "")).toEqual({status: "error", msg: "user failed"});
  const usersPage = await userSelect.fetchPage("engineering", 1, 20, "", "");
  expect(usersPage.data?.[0]).toEqual(expect.objectContaining({value: "*"}));
  expect(userSelect.buildFetchArgs({page: 2, pageSize: 20, searchText: "ali"})).toEqual(["engineering", 2, 20, "name", "ali"]);
  userSelect.onChange(["engineering/alice"]);
  expect(page.state.permission?.users).toEqual(["engineering/alice"]);

  const groupSelect = elementProps<{
    fetchPage: (...args: unknown[]) => Promise<{status: string; data?: unknown[]}>;
    buildFetchArgs: (args: {page: number; pageSize: number; searchText?: string}) => unknown[];
    onChange: (value: string[]) => void;
      }>(paginateControls[1]);
  groupBackendMock.getGroups.mockResolvedValueOnce({status: "error", msg: "group failed"});
  expect(await groupSelect.fetchPage("engineering", false, 1, 20, "", "", "", "")).toEqual({status: "error", msg: "group failed"});
  const groupsPage = await groupSelect.fetchPage("engineering", false, 1, 20, "", "", "", "");
  expect(groupsPage.data?.[0]).toEqual(expect.objectContaining({value: "*"}));
  expect(groupSelect.buildFetchArgs({page: 1, pageSize: 10})).toEqual(["engineering", false, 1, 10, "", undefined, "", ""]);
  groupSelect.onChange(["engineering/ops"]);
  expect(page.state.permission?.groups).toEqual(["engineering/ops"]);

  const roleSelect = elementProps<{
    fetchPage: (...args: unknown[]) => Promise<{status: string; data?: unknown[]}>;
    buildFetchArgs: (args: {page: number; pageSize: number; searchText?: string}) => unknown[];
    onChange: (value: string[]) => void;
      }>(paginateControls[2]);
  roleBackendMock.getRoles.mockResolvedValueOnce({status: "error", msg: "role failed"});
  expect(await roleSelect.fetchPage("engineering", 1, 20, "", "", "", "")).toEqual({status: "error", msg: "role failed"});
  const rolesPage = await roleSelect.fetchPage("engineering", 1, 20, "", "", "", "");
  expect(rolesPage.data?.[0]).toEqual(expect.objectContaining({value: "*"}));
  expect(roleSelect.buildFetchArgs({page: 1, pageSize: 10, searchText: "role"})).toEqual(["engineering", 1, 10, "name", "role", "", ""]);
  roleSelect.onChange(["engineering/role-main"]);
  expect(page.state.permission?.roles).toEqual(["engineering/role-main"]);

  page.state = {
    ...page.state,
    permission: {
      ...page.state.permission as PermissionRecord,
      resources: ["/api/main"],
      actions: ["GET"],
    },
  };

  for (const button of collectElementsByType(permissionView, Button)) {
    elementProps<{onClick?: () => void}>(button).onClick?.();
    await flushPromises();
  }

  for (const button of collectElementsByType(page.render(), Button)) {
    elementProps<{onClick?: () => void}>(button).onClick?.();
    await flushPromises();
  }
  expect(permissionBackendMock.updatePermission).toHaveBeenCalled();
  expect(permissionBackendMock.deletePermission).toHaveBeenCalled();
});

test("keeps permission defensive and backend error branches", async() => {
  const page = createPermissionPage();
  const history = page.props.history as ReturnType<typeof createHistory>;

  expect(page.renderPermission()).toBeNull();
  expect(page.hasRoleDefinition(null)).toBe(false);
  page.updatePermissionField("name", "ignored");
  page.submitPermissionEdit(false);
  page.deletePermission();
  expect(permissionBackendMock.updatePermission).not.toHaveBeenCalled();
  expect(permissionBackendMock.deletePermission).not.toHaveBeenCalled();

  permissionBackendMock.getPermission.mockResolvedValueOnce({status: "ok", data: null});
  page.getPermission();
  await flushPromises();
  expect(history.push).toHaveBeenCalledWith("/404");

  permissionBackendMock.getPermission.mockResolvedValueOnce({status: "error", msg: "permission missing", data: permission});
  page.getPermission();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "permission missing");

  permissionBackendMock.getPermission.mockResolvedValueOnce({status: "ok"});
  page.getPermission();
  await flushPromises();
  expect(page.state.permission).toBeNull();

  modelBackendMock.getModels.mockResolvedValueOnce({status: "error", msg: "model failed"});
  page.getModels("engineering");
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "model failed");

  page.state = {...page.state, permission: {...permission}};
  permissionBackendMock.updatePermission.mockRejectedValueOnce(new Error("permission network"));
  page.submitPermissionEdit(false);
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("permission network"));

  permissionBackendMock.deletePermission.mockResolvedValueOnce({status: "error", msg: "delete failed"});
  page.deletePermission();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete failed"));

  permissionBackendMock.deletePermission.mockRejectedValueOnce(new Error("delete network"));
  page.deletePermission();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete network"));
});
