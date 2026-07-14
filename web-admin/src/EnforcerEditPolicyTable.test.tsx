/* eslint-env jest */
import React from "react";
import {expect as jestExpect, jest as jestValue} from "@jest/globals";
import {cleanup, render} from "@testing-library/react";
import {Button, Input, Select} from "antd";
import {MemoryRouter} from "react-router-dom";
import * as AdapterBackend from "./backend/AdapterBackend";
import * as EnforcerBackend from "./backend/EnforcerBackend";
import * as ModelBackend from "./backend/ModelBackend";
import * as OrganizationBackend from "./backend/OrganizationBackend";
import * as Setting from "./Setting";
import EnforcerEditPage from "./EnforcerEditPage";
import PolicyTable from "./table/PolicyTable";

declare const jest: typeof jestValue;

type LooseMock = {
  (...args: unknown[]): unknown;
  mockImplementation: (implementation: (...args: unknown[]) => unknown) => LooseMock;
  mockReturnValue: (value: unknown) => LooseMock;
  mockResolvedValue: (value: unknown) => LooseMock;
  mockResolvedValueOnce: (value: unknown) => LooseMock;
  mockRejectedValueOnce: (value: unknown) => LooseMock;
};

type AdapterBackendMock = Record<keyof typeof AdapterBackend, LooseMock>;
type EnforcerBackendMock = Record<keyof typeof EnforcerBackend, LooseMock>;
type ModelBackendMock = Record<"getModels", LooseMock>;
type OrganizationBackendMock = Record<"getOrganizations", LooseMock>;

type Account = {
  owner: string;
  tag: string;
  isAdmin: boolean;
};

type EnforcerRecord = {
  owner: string;
  name: string;
  displayName: string;
  description: string;
  model: string;
  adapter: string;
  modelCfg?: Record<string, string>;
};

type PolicyRow = {
  key?: number;
  Ptype: string;
  V0?: string;
  V1?: string;
  V2?: string;
  [key: string]: unknown;
};

type PolicyTableState = {
  policyLists: PolicyRow[];
  loading: boolean;
  editingIndex: number | string;
  oldPolicy: PolicyRow | string;
  add: boolean;
  page: number;
};

type TestPolicyTable = Omit<PolicyTable, "state"> & {
  state: PolicyTableState;
  count: number;
  pageSize: number;
  getIndex: (index: number) => number;
  UNSAFE_componentWillMount: () => void;
  renderTable: (table: PolicyRow[]) => React.ReactElement | null;
  addRow: (table?: PolicyRow[]) => void;
  edit: (record: PolicyRow, index: number) => void;
  cancel: (table: PolicyRow[], index: number) => void;
  updateField: (table: PolicyRow[], index: number, key: string, value: string) => void;
  updatePolicy: (table: PolicyRow[], index: number) => void;
  addPolicy: (table: PolicyRow[], index: number) => void;
  deletePolicy: (table: PolicyRow[], index: number) => void;
};

type EnforcerEditPageState = {
  organizationName: string;
  enforcerName: string;
  enforcer: EnforcerRecord | null;
  organizations: Array<{name: string}>;
  models: Array<{owner: string; name: string}>;
  adapters: Array<{owner: string; name: string}>;
  mode: string;
  [key: string]: unknown;
};

type TestEnforcerEditPage = Omit<EnforcerEditPage, "state"> & {
  state: EnforcerEditPageState;
  UNSAFE_componentWillMount: () => void;
  getEnforcer: () => void;
  getOrganizations: () => void;
  getModels: (organizationName: string) => void;
  getAdapters: (organizationName: string) => void;
  parseEnforcerField: (key: string, value: unknown) => unknown;
  renderEnforcer: () => React.ReactElement | null;
  updateEnforcerField: (key: keyof EnforcerRecord | string, value: unknown) => void;
  submitEnforcerEdit: (exitAfterSave: boolean) => void;
  deleteEnforcer: () => void;
};

type TestColumn = {
  title?: React.ReactNode;
  render?: (text: unknown, record: PolicyRow, index: number) => React.ReactNode;
};

type ButtonLikeProps = {
  disabled?: boolean;
  onClick?: () => void;
};

type SelectLikeProps = {
  onChange?: (value: string) => void;
  value?: string;
};

type InputLikeProps = {
  onChange?: (event: {target: {value: string}}) => void;
  value?: unknown;
};

type TableLikeProps = {
  columns: TestColumn[];
  pagination: {
    onChange: (page: number) => void;
  };
  title: () => React.ReactNode;
};

const adapterBackendMock = AdapterBackend as unknown as AdapterBackendMock;
const enforcerBackendMock = EnforcerBackend as unknown as EnforcerBackendMock;
const modelBackendMock = ModelBackend as unknown as ModelBackendMock;
const organizationBackendMock = OrganizationBackend as unknown as OrganizationBackendMock;
const expect = jestExpect;

const {fireEvent} = require("@testing-library/react") as {
  fireEvent: {
    change: (element: Element | null, event: unknown) => boolean;
  };
};

jest.mock("./backend/AdapterBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    getAdapters: factoryJest.fn(),
    getPolicies: factoryJest.fn(),
    UpdatePolicy: factoryJest.fn(),
    AddPolicy: factoryJest.fn(),
    RemovePolicy: factoryJest.fn(),
  };
});

jest.mock("./backend/EnforcerBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    getEnforcer: factoryJest.fn(),
    updateEnforcer: factoryJest.fn(),
    deleteEnforcer: factoryJest.fn(),
  };
});

jest.mock("./backend/ModelBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    getModels: factoryJest.fn(),
  };
});

jest.mock("./backend/OrganizationBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    getOrganizations: factoryJest.fn(),
  };
});

const adminAccount: Account = {owner: "built-in", tag: "", isAdmin: true};
const enforcer: EnforcerRecord = {
  owner: "engineering",
  name: "main-enforcer",
  displayName: "Main Enforcer",
  description: "enforcer description",
  model: "engineering/rbac-model",
  adapter: "engineering/db-adapter",
  modelCfg: {
    p: "sub, obj, act",
    g: "_, _",
  },
};
const policy: PolicyRow = {
  key: 0,
  Ptype: "p",
  V0: "alice",
  V1: "data1",
  V2: "read",
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

function createPolicyTable(overrides: Partial<React.ComponentProps<typeof PolicyTable>> = {}) {
  const table = new PolicyTable({
    enforcer,
    modelCfg: enforcer.modelCfg,
    mode: "edit",
    ...overrides,
  } as React.ComponentProps<typeof PolicyTable>);
  installSynchronousSetState(table);
  return table as TestPolicyTable;
}

function createEditPage(overrides: Partial<React.ComponentProps<typeof EnforcerEditPage>> = {}) {
  const props = {
    account: adminAccount,
    history: createHistory(),
    location: {},
    match: {params: {organizationName: "engineering", enforcerName: "main-enforcer"}},
    ...overrides,
  } as React.ComponentProps<typeof EnforcerEditPage>;
  const page = new EnforcerEditPage(props);
  installSynchronousSetState(page);
  return page as TestEnforcerEditPage;
}

function findElementByType(node: React.ReactNode, type: React.ElementType): React.ReactElement | null {
  if (!React.isValidElement(node)) {
    return null;
  }
  if (node.type === type) {
    return node;
  }

  const props = node.props as {children?: React.ReactNode};
  let match: React.ReactElement | null = null;
  React.Children.forEach(props.children, child => {
    if (match === null) {
      match = findElementByType(child, type);
    }
  });
  return match;
}

function findElementsByType(node: React.ReactNode, type: React.ElementType): React.ReactElement[] {
  if (!React.isValidElement(node)) {
    return [];
  }

  const matches = node.type === type ? [node] : [];
  const props = node.props as {children?: React.ReactNode; title?: React.ReactNode; icon?: React.ReactNode};
  [props.children, props.title, props.icon].forEach(propNode => {
    React.Children.forEach(propNode, child => {
      matches.push(...findElementsByType(child, type));
    });
  });
  return matches;
}

beforeEach(() => {
  cleanup();
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
  jestValue.spyOn(Setting, "isAdminUser").mockReturnValue(true);
  jestValue.spyOn(Setting, "builtInObject").mockImplementation((record: unknown) => {
    return (record as {owner?: string}).owner === "built-in";
  });
  adapterBackendMock.getAdapters.mockResolvedValue({status: "ok", data: [{owner: "engineering", name: "db-adapter"}]});
  adapterBackendMock.getPolicies.mockResolvedValue({status: "ok", data: [policy]});
  adapterBackendMock.UpdatePolicy.mockResolvedValue({status: "ok"});
  adapterBackendMock.AddPolicy.mockResolvedValue({status: "ok", data: "Affected"});
  adapterBackendMock.RemovePolicy.mockResolvedValue({status: "ok"});
  enforcerBackendMock.getEnforcer.mockResolvedValue({status: "ok", data: enforcer});
  enforcerBackendMock.updateEnforcer.mockResolvedValue({status: "ok"});
  enforcerBackendMock.deleteEnforcer.mockResolvedValue({status: "ok"});
  modelBackendMock.getModels.mockResolvedValue({status: "ok", data: [{owner: "engineering", name: "rbac-model"}]});
  organizationBackendMock.getOrganizations.mockResolvedValue({status: "ok", data: [{name: "engineering"}]});
});

afterEach(() => {
  jestValue.restoreAllMocks();
  jestValue.clearAllMocks();
  cleanup();
});

test("migrates Casbin enforcer edit page and policy table modules to TSX", () => {
  expect(() => require.resolve("./EnforcerEditPage.tsx")).not.toThrow();
  expect(() => require.resolve("./table/PolicyTable.tsx")).not.toThrow();
  expect(() => require.resolve("./EnforcerEditPage.js")).toThrow();
  expect(() => require.resolve("./table/PolicyTable.js")).toThrow();
});

test("syncs policies and renders dynamic policy columns", async() => {
  const table = createPolicyTable();

  table.UNSAFE_componentWillMount();
  await flushPromises();

  expect(adapterBackendMock.getPolicies).toHaveBeenCalledWith("engineering", "main-enforcer");
  expect(table.state.policyLists).toEqual([{...policy, key: 0}]);
  expect(table.count).toBe(1);

  const tableNode = table.renderTable(table.state.policyLists) as React.ReactElement<{columns: TestColumn[]}>;
  const columns = tableNode.props.columns;
  expect(columns).toHaveLength(5);
  expect(columns.slice(1, 4).map(column => column.title)).toEqual(["sub", " obj", " act"]);
});

test("keeps policy pagination index mapping and cancel rollback behavior", () => {
  const table = createPolicyTable();
  table.state = {
    ...table.state,
    page: 2,
    policyLists: Array.from({length: 105}, (_, index) => ({key: index, Ptype: "p", V0: `user-${index}`})),
  };

  expect(table.getIndex(3)).toBe(103);

  table.state = {
    ...table.state,
    page: 1,
    policyLists: [{...policy}],
  };
  table.edit(table.state.policyLists[0], 0);
  table.updateField(table.state.policyLists, 0, "V0", "bob");
  expect(table.state.policyLists[0].V0).toBe("bob");

  table.cancel(table.state.policyLists, 0);
  expect(table.state.policyLists[0].V0).toBe("alice");
  expect(table.state.editingIndex).toBe("");
});

test("adds, saves duplicated policies and deletes policies", async() => {
  const table = createPolicyTable();
  table.state = {
    ...table.state,
    policyLists: [{...policy}],
  };

  table.addRow(table.state.policyLists);
  expect(table.state.add).toBe(true);
  expect(table.state.editingIndex).toBe(0);
  expect(table.state.policyLists[0].Ptype).toBe("p");

  adapterBackendMock.AddPolicy.mockResolvedValueOnce({status: "ok", data: "Duplicate"});
  table.addPolicy(table.state.policyLists, 0);
  await flushPromises();

  expect(adapterBackendMock.AddPolicy).toHaveBeenCalledWith("engineering", "main-enforcer", table.state.policyLists[0]);
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringMatching(/Duplicated policy rules|重复的策略/));
  expect(table.state.add).toBe(false);

  table.state = {
    ...table.state,
    policyLists: [{...policy}],
  };
  table.deletePolicy(table.state.policyLists, 0);
  await flushPromises();

  expect(adapterBackendMock.RemovePolicy).toHaveBeenCalledWith("engineering", "main-enforcer", policy);
  expect(table.state.policyLists).toEqual([]);
});

test("updates existing policy and respects disabled policy table states", async() => {
  const table = createPolicyTable();
  table.state = {
    ...table.state,
    policyLists: [{...policy, V0: "bob"}],
    oldPolicy: policy,
    editingIndex: 0,
    add: false,
  };

  table.updatePolicy(table.state.policyLists, 0);
  await flushPromises();

  expect(adapterBackendMock.UpdatePolicy).toHaveBeenCalledWith("engineering", "main-enforcer", [policy, table.state.policyLists[0]]);
  expect(table.state.editingIndex).toBe("");
  expect(Setting.showMessage).toHaveBeenCalledWith("success", expect.any(String));

  table.state = {
    ...table.state,
    policyLists: [{...policy}],
    editingIndex: "",
  };
  const normalTable = table.renderTable(table.state.policyLists) as React.ReactElement<{title: () => React.ReactNode; columns: TestColumn[]}>;
  const normalTitle = render(<>{normalTable.props.title()}</>);
  expect((normalTitle.getByText(/添\s*加|Add/).closest("button") as HTMLButtonElement).disabled).toBe(false);
  normalTitle.unmount();

  const builtInTable = createPolicyTable({enforcer: {...enforcer, owner: "built-in"}});
  builtInTable.state = {...builtInTable.state, policyLists: [{...policy}]};
  const disabledTable = builtInTable.renderTable(builtInTable.state.policyLists) as React.ReactElement<{title: () => React.ReactNode}>;
  const disabledTitle = render(<>{disabledTable.props.title()}</>);
  expect((disabledTitle.getByText(/添\s*加|Add/).closest("button") as HTMLButtonElement).disabled).toBe(true);
});

test("loads enforcer edit data and renders policy table props", async() => {
  const page = createEditPage();

  page.UNSAFE_componentWillMount();
  await flushPromises();

  expect(enforcerBackendMock.getEnforcer).toHaveBeenCalledWith("engineering", "main-enforcer", true);
  expect(organizationBackendMock.getOrganizations).toHaveBeenCalledWith("admin");
  expect(modelBackendMock.getModels).toHaveBeenCalledWith("engineering");
  expect(adapterBackendMock.getAdapters).toHaveBeenCalledWith("engineering");
  expect(page.state.enforcer).toEqual(enforcer);
  expect(page.state.models).toEqual([{owner: "engineering", name: "rbac-model"}]);
  expect(page.state.adapters).toEqual([{owner: "engineering", name: "db-adapter"}]);

  const rendered = page.renderEnforcer();
  const policyTable = findElementByType(rendered, PolicyTable);
  expect(policyTable).not.toBeNull();
  expect((policyTable?.props as {modelCfg?: Record<string, string>; mode?: string}).modelCfg).toEqual(enforcer.modelCfg);

  const view = render(<MemoryRouter>{page.render()}</MemoryRouter>);
  expect(view.getByDisplayValue("main-enforcer")).not.toBeNull();
  expect(view.getByDisplayValue("Main Enforcer")).not.toBeNull();
  expect(view.getByDisplayValue("enforcer description")).not.toBeNull();
});

test("publishes the enforcer display name for its workspace tab after loading and display-name edits", async() => {
  const dispatchSpy = jestValue.spyOn(window, "dispatchEvent");
  const page = createEditPage();
  enforcerBackendMock.getEnforcer.mockResolvedValueOnce({status: "ok", data: {...enforcer}});

  page.getEnforcer();
  await flushPromises();

  const loadedEvent = dispatchSpy.mock.calls.at(-1)?.[0] as CustomEvent | undefined;
  expect(loadedEvent?.type).toBe("aicodex.admin.workspaceTabLabelUpdate");
  expect(loadedEvent?.detail).toEqual({
    path: "/enforcers/engineering/main-enforcer",
    label: expect.stringMatching(/Main Enforcer$/),
  });

  const loadDispatchCount = dispatchSpy.mock.calls.length;
  page.updateEnforcerField("description", "updated description");
  expect(dispatchSpy).toHaveBeenCalledTimes(loadDispatchCount);

  page.updateEnforcerField("displayName", "   ");
  expect(dispatchSpy).toHaveBeenCalledTimes(loadDispatchCount + 1);
  const fallbackEvent = dispatchSpy.mock.calls.at(-1)?.[0] as CustomEvent | undefined;
  expect(fallbackEvent?.detail).toEqual({
    path: "/enforcers/engineering/main-enforcer",
    label: expect.stringMatching(/main-enforcer$/),
  });
});

test("updates enforcer fields and saves navigation paths", async() => {
  const history = createHistory();
  const page = createEditPage({history} as Partial<React.ComponentProps<typeof EnforcerEditPage>>);
  page.state = {
    ...page.state,
    enforcer: {...enforcer, name: "renamed-enforcer"},
  };

  page.updateEnforcerField("displayName", "Updated Enforcer");
  page.updateEnforcerField("description", "Updated description");
  expect(page.state.enforcer?.displayName).toBe("Updated Enforcer");
  expect(page.state.enforcer?.description).toBe("Updated description");

  page.submitEnforcerEdit(false);
  await flushPromises();

  expect(enforcerBackendMock.updateEnforcer).toHaveBeenCalledWith("engineering", "main-enforcer", expect.objectContaining({name: "renamed-enforcer"}));
  expect(history.push).toHaveBeenCalledWith("/enforcers/engineering/renamed-enforcer");

  page.submitEnforcerEdit(true);
  await flushPromises();
  expect(history.push).toHaveBeenCalledWith("/enforcers");
});

test("handles enforcer load, save rollback and cancel delete errors", async() => {
  const history = createHistory();
  const page = createEditPage({history, location: {mode: "add"}} as Partial<React.ComponentProps<typeof EnforcerEditPage>>);

  enforcerBackendMock.getEnforcer.mockResolvedValueOnce({status: "ok", data: null});
  page.getEnforcer();
  await flushPromises();
  expect(history.push).toHaveBeenCalledWith("/404");

  enforcerBackendMock.getEnforcer.mockResolvedValueOnce({status: "error", msg: "load failed", data: enforcer});
  page.getEnforcer();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "load failed");

  page.state = {
    ...page.state,
    enforcer: {...enforcer, name: "bad-name"},
  };
  enforcerBackendMock.updateEnforcer.mockResolvedValueOnce({status: "error", msg: "save failed"});
  page.submitEnforcerEdit(false);
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("save failed"));
  expect(page.state.enforcer?.name).toBe("main-enforcer");

  enforcerBackendMock.deleteEnforcer.mockResolvedValueOnce({status: "error", msg: "delete failed"});
  page.deleteEnforcer();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete failed"));

  enforcerBackendMock.deleteEnforcer.mockRejectedValueOnce(new Error("delete network"));
  page.deleteEnforcer();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete network"));
});

test("keeps policy table render callbacks and error branches wired", async() => {
  const tableWithoutModelCfg = createPolicyTable({modelCfg: undefined});
  expect(tableWithoutModelCfg.renderTable([])).toBeNull();

  const table = createPolicyTable();
  table.addRow();
  expect(table.state.policyLists).toEqual([{key: 0, Ptype: "p"}]);
  expect(table.state.add).toBe(true);

  table.cancel(table.state.policyLists, 0);
  expect(table.state.policyLists).toEqual([]);
  expect(table.state.add).toBe(false);

  table.state = {
    ...table.state,
    policyLists: [{...policy}],
    oldPolicy: policy,
    editingIndex: 0,
    add: false,
  };
  table.save(table.state.policyLists, 0);
  await flushPromises();
  expect(adapterBackendMock.UpdatePolicy).toHaveBeenCalledWith("engineering", "main-enforcer", [policy, table.state.policyLists[0]]);

  table.state = {
    ...table.state,
    policyLists: [{...policy}],
    oldPolicy: policy,
    editingIndex: 0,
    add: true,
  };
  adapterBackendMock.AddPolicy.mockResolvedValueOnce({status: "ok", data: "Affected"});
  table.save(table.state.policyLists, 0);
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("success", expect.stringMatching(/Successfully added|添加成功/));

  adapterBackendMock.getPolicies.mockResolvedValueOnce({status: "error", msg: "sync failed"});
  table.getPolicies();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("sync failed"));

  adapterBackendMock.getPolicies.mockRejectedValueOnce(new Error("sync network"));
  table.getPolicies();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("sync network"));

  adapterBackendMock.UpdatePolicy.mockResolvedValueOnce({status: "error", msg: "update failed"});
  table.updatePolicy([{...policy}], 0);
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("update failed"));

  adapterBackendMock.AddPolicy.mockResolvedValueOnce({status: "error", msg: "add failed"});
  table.addPolicy([{...policy}], 0);
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("add failed"));

  adapterBackendMock.RemovePolicy.mockResolvedValueOnce({status: "error"});
  table.deletePolicy([{...policy}], 0);
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringMatching(/Failed to delete|删除失败/));

  table.state = {
    ...table.state,
    policyLists: [{...policy}],
    editingIndex: 0,
    oldPolicy: policy,
    add: false,
    page: 1,
  };
  const renderedTable = table.renderTable(table.state.policyLists) as React.ReactElement<TableLikeProps>;
  renderedTable.props.pagination.onChange(2);
  expect(table.state.page).toBe(2);

  table.state = {...table.state, page: 1, editingIndex: 0};
  const editableTable = table.renderTable(table.state.policyLists) as React.ReactElement<TableLikeProps>;
  const ruleTypeEditor = editableTable.props.columns[0].render?.(undefined, table.state.policyLists[0], 0) as React.ReactElement<SelectLikeProps>;
  expect(ruleTypeEditor.props.value).toBe("");
  ruleTypeEditor.props.onChange?.("g");
  expect(table.state.policyLists[0].Ptype).toBe("g");

  const valueEditor = editableTable.props.columns[1].render?.(undefined, table.state.policyLists[0], 0) as React.ReactElement<InputLikeProps>;
  expect(valueEditor.props.value).toBe("");
  valueEditor.props.onChange?.({target: {value: "bob"}});
  expect(table.state.policyLists[0].V0).toBe("bob");

  const editableActions = editableTable.props.columns[editableTable.props.columns.length - 1]
    .render?.(undefined, table.state.policyLists[0], 0);
  const editableActionButtons = findElementsByType(editableActions, Button) as React.ReactElement<ButtonLikeProps>[];
  editableActionButtons[0].props.onClick?.();
  await flushPromises();
  editableActionButtons[1].props.onClick?.();
  expect(table.state.editingIndex).toBe("");

  table.state = {...table.state, policyLists: [{...policy}], editingIndex: "", oldPolicy: "", add: false};
  const viewActionsTable = table.renderTable(table.state.policyLists) as React.ReactElement<TableLikeProps>;
  const viewActions = viewActionsTable.props.columns[viewActionsTable.props.columns.length - 1]
    .render?.(undefined, table.state.policyLists[0], 0);
  const viewActionButtons = findElementsByType(viewActions, Button) as React.ReactElement<ButtonLikeProps>[];
  viewActionButtons[0].props.onClick?.();
  expect(table.state.editingIndex).toBe(0);
  viewActionButtons[1].props.onClick?.();
  await flushPromises();
  expect(adapterBackendMock.RemovePolicy).toHaveBeenCalledWith("engineering", "main-enforcer", policy);

  const titleNode = viewActionsTable.props.title();
  const titleButton = findElementsByType(titleNode, Button)[0] as React.ReactElement<ButtonLikeProps>;
  titleButton.props.onClick?.();
  expect(table.state.add).toBe(true);

  const syncNode = table.render();
  const syncButton = findElementsByType(syncNode, Button)[0] as React.ReactElement<ButtonLikeProps>;
  syncButton.props.onClick?.();
  await flushPromises();
  expect(adapterBackendMock.getPolicies).toHaveBeenCalledWith("engineering", "main-enforcer");
});

test("keeps enforcer edit callbacks and fallback branches wired", async() => {
  const history = createHistory();
  const page = createEditPage({history, location: {mode: "add"}} as Partial<React.ComponentProps<typeof EnforcerEditPage>>);
  const organizationOverridePage = createEditPage({organizationName: "platform"} as Partial<React.ComponentProps<typeof EnforcerEditPage>>);

  expect(organizationOverridePage.state.organizationName).toBe("platform");

  expect(page.renderEnforcer()).toBeNull();
  page.updateEnforcerField("name", "ignored");
  expect(page.state.enforcer).toBeNull();

  jestValue.spyOn(Setting, "myParseInt").mockReturnValue(7);
  expect(page.parseEnforcerField("", "7")).toBe(7);

  page.state = {
    ...page.state,
    enforcer: {...enforcer},
  };
  const rendered = page.renderEnforcer();
  const renderedButtons = findElementsByType(rendered, Button) as React.ReactElement<ButtonLikeProps>[];
  const renderedSelects = findElementsByType(rendered, Select) as React.ReactElement<SelectLikeProps>[];
  const renderedInputs = findElementsByType(rendered, Input) as React.ReactElement<InputLikeProps>[];

  renderedSelects[0].props.onChange?.("platform");
  expect(page.state.enforcer?.owner).toBe("platform");
  expect(modelBackendMock.getModels).toHaveBeenCalledWith("platform");
  expect(adapterBackendMock.getAdapters).toHaveBeenCalledWith("platform");

  renderedSelects[1].props.onChange?.("platform/rbac-model-v2");
  renderedSelects[2].props.onChange?.("platform/db-adapter-v2");
  expect(page.state.enforcer?.model).toBe("platform/rbac-model-v2");
  expect(page.state.enforcer?.adapter).toBe("platform/db-adapter-v2");

  renderedInputs[0].props.onChange?.({target: {value: "renamed-enforcer"}});
  renderedInputs[1].props.onChange?.({target: {value: "Renamed Enforcer"}});
  renderedInputs[2].props.onChange?.({target: {value: "renamed description"}});
  expect(page.state.enforcer?.name).toBe("renamed-enforcer");
  expect(page.state.enforcer?.displayName).toBe("Renamed Enforcer");
  expect(page.state.enforcer?.description).toBe("renamed description");

  renderedButtons[0].props.onClick?.();
  renderedButtons[1].props.onClick?.();
  renderedButtons[2].props.onClick?.();
  await flushPromises();
  expect(enforcerBackendMock.updateEnforcer).toHaveBeenCalledWith("engineering", "main-enforcer", expect.objectContaining({name: "renamed-enforcer"}));
  expect(enforcerBackendMock.deleteEnforcer).toHaveBeenCalledWith(expect.objectContaining({name: "renamed-enforcer"}));

  enforcerBackendMock.updateEnforcer.mockRejectedValueOnce(new Error("save network"));
  page.submitEnforcerEdit(false);
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("save network"));

  enforcerBackendMock.deleteEnforcer.mockResolvedValueOnce({status: "ok"});
  page.deleteEnforcer();
  await flushPromises();
  expect(history.push).toHaveBeenCalledWith("/enforcers");

  page.state = {
    ...page.state,
    enforcer: {...enforcer},
  };
  const fullPage = page.render();
  const allButtons = findElementsByType(fullPage, Button) as React.ReactElement<ButtonLikeProps>[];
  allButtons[allButtons.length - 3].props.onClick?.();
  allButtons[allButtons.length - 2].props.onClick?.();
  allButtons[allButtons.length - 1].props.onClick?.();
  await flushPromises();
  expect(enforcerBackendMock.updateEnforcer).toHaveBeenCalled();
  expect(enforcerBackendMock.deleteEnforcer).toHaveBeenCalled();
});

test("keeps enforcer edit mobile, empty response and built-in fallback branches", async() => {
  jestValue.spyOn(Setting, "isMobile").mockReturnValue(true);
  const page = createEditPage();

  organizationBackendMock.getOrganizations.mockResolvedValueOnce({status: "ok", data: undefined});
  modelBackendMock.getModels.mockResolvedValueOnce({status: "ok", data: undefined});
  adapterBackendMock.getAdapters.mockResolvedValueOnce({status: "ok", data: undefined});

  page.getOrganizations();
  page.getModels("engineering");
  page.getAdapters("engineering");
  await flushPromises();

  expect(page.state.organizations).toEqual([]);
  expect(page.state.models).toEqual([]);
  expect(page.state.adapters).toEqual([]);

  page.state = {
    ...page.state,
    enforcer: {...enforcer, owner: "built-in", name: ""},
  };

  const rendered = page.renderEnforcer();
  expect((rendered?.props as {style?: Record<string, string>}).style).toEqual({margin: "5px"});

  const renderedSelects = findElementsByType(rendered, Select) as React.ReactElement<SelectLikeProps & {disabled?: boolean}>[];
  const renderedInputs = findElementsByType(rendered, Input) as React.ReactElement<InputLikeProps & {disabled?: boolean}>[];
  expect(renderedSelects[0].props.disabled).toBe(true);
  expect(renderedSelects[1].props.disabled).toBe(true);
  expect(renderedSelects[2].props.disabled).toBe(true);
  expect(renderedInputs[0].props.disabled).toBe(true);

  page.submitEnforcerEdit(false);
  await flushPromises();
  expect(page.state.enforcerName).toBe("main-enforcer");
});
