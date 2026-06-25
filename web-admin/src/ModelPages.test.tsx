/* eslint-env jest */
import React from "react";
import {expect as jestExpect, jest as jestValue} from "@jest/globals";
import {cleanup, render} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import * as Setting from "./Setting";
import * as ModelBackend from "./backend/ModelBackend";
import * as OrganizationBackend from "./backend/OrganizationBackend";
import * as FormBackend from "./backend/FormBackend";
import CasbinEditor from "./CasbinEditor";
import ModelEditPage from "./ModelEditPage";
import ModelListPage from "./ModelListPage";

declare const jest: typeof jestValue;

type LooseMock = {
  (...args: unknown[]): unknown;
  mockImplementation: (implementation: (...args: unknown[]) => unknown) => LooseMock;
  mockReturnValue: (value: unknown) => LooseMock;
  mockResolvedValue: (value: unknown) => LooseMock;
  mockResolvedValueOnce: (value: unknown) => LooseMock;
  mockRejectedValueOnce: (value: unknown) => LooseMock;
};

type ModelBackendMock = Record<keyof typeof ModelBackend, LooseMock>;
type OrganizationBackendMock = Record<"getOrganizations", LooseMock>;
type FormBackendMock = Record<"getForm", LooseMock>;

type Account = {
  owner: string;
  tag: string;
  isAdmin: boolean;
};

type TestModelRecord = {
  owner: string;
  name: string;
  createdTime: string;
  displayName: string;
  description?: string;
  modelText: string;
};

type TestOrganizationRecord = {
  name: string;
};

type TestTableColumn = {
  key?: string;
  fixed?: unknown;
  render?: (text: unknown, record: TestModelRecord, index: number) => React.ReactNode;
};

type TestPagination = {
  current: number;
  pageSize: number;
  total?: number;
};

type TestModelListPage = Omit<ModelListPage, "state" | "fetch"> & {
  state: {
    data: TestModelRecord[];
    pagination: TestPagination;
    loading: boolean;
    isAuthorized: boolean;
    [key: string]: unknown;
  };
  fetch: (params: {pagination: TestPagination; [key: string]: unknown}) => void;
};

const modelBackendMock = ModelBackend as unknown as ModelBackendMock;
const organizationBackendMock = OrganizationBackend as unknown as OrganizationBackendMock;
const formBackendMock = FormBackend as unknown as FormBackendMock;
const expect = jestExpect;
const mockIframeUpdateModelText = jestValue.fn();
let mockIframeModelText = "advanced model text";
let mockDispatchIgnoredMessage = false;

const {act, fireEvent} = require("@testing-library/react") as {
  act: (callback: () => Promise<void> | void) => Promise<void>;
  fireEvent: {
    change: (element: Element | null, event: unknown) => boolean;
    click: (element: Element | null) => boolean;
  };
};

jest.mock("./backend/ModelBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    getModels: factoryJest.fn(),
    getModel: factoryJest.fn(),
    updateModel: factoryJest.fn(),
    addModel: factoryJest.fn(),
    deleteModel: factoryJest.fn(),
  };
});

jest.mock("./backend/OrganizationBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    getOrganizations: factoryJest.fn(),
  };
});

jest.mock("./backend/FormBackend", () => {
  const {jest: factoryJest} = require("@jest/globals") as {jest: typeof jestValue};
  return {
    getForm: factoryJest.fn(),
  };
});

jest.mock("./TourConfig", () => ({
  getTourVisible: () => false,
  getSteps: () => [],
  getNextUrl: () => "",
  setIsTourVisible: () => undefined,
}));

jest.mock("./IframeEditor", () => {
  const ReactFactory = require("react");
  const MockIframeEditor = ReactFactory.forwardRef((props: {initialModelText?: string; onModelTextChange?: (value: string) => void}, ref: React.Ref<unknown>) => {
    ReactFactory.useImperativeHandle(ref, () => ({
      getModelText: () => {
        if (mockDispatchIgnoredMessage) {
          globalThis.dispatchEvent(new MessageEvent("message", {data: {type: "ignored", modelText: "ignored text"}}));
        }
        globalThis.dispatchEvent(new MessageEvent("message", {data: {type: "modelUpdate", modelText: mockIframeModelText}}));
      },
      updateModelText: mockIframeUpdateModelText,
    }));
    return ReactFactory.createElement("textarea", {
      "data-testid": "advanced-editor",
      value: props.initialModelText || "",
      onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => props.onModelTextChange?.(event.target.value),
      readOnly: false,
    });
  });
  return {
    __esModule: true,
    default: MockIframeEditor,
  };
});

jest.mock("./common/Editor", () => (props: {value?: string; readOnly?: boolean; onChange?: (value: string) => void}) => (
  <textarea
    data-testid="basic-editor"
    readOnly={props.readOnly}
    value={props.value || ""}
    onChange={event => props.onChange?.(event.target.value)}
  />
));

const adminAccount: Account = {owner: "built-in", tag: "", isAdmin: true};
const model: TestModelRecord = {
  owner: "engineering",
  name: "rbac",
  createdTime: "2026-06-19T10:00:00Z",
  displayName: "RBAC Model",
  description: "model description",
  modelText: "[request_definition]\nr = sub, obj, act",
};
const builtInModel: TestModelRecord = {
  ...model,
  owner: "built-in",
  name: "api-model-built-in",
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

function createListPage(account: Account = adminAccount) {
  const page = new ModelListPage({
    account,
    history: createHistory(),
    match: {path: "/models", params: {}},
  } as React.ComponentProps<typeof ModelListPage>);
  installSynchronousSetState(page);
  return page as TestModelListPage;
}

function createEditPage(overrides: Partial<React.ComponentProps<typeof ModelEditPage>> = {}) {
  const props = {
    account: adminAccount,
    history: createHistory(),
    location: {},
    match: {params: {organizationName: "engineering", modelName: "rbac"}},
    ...overrides,
  } as React.ComponentProps<typeof ModelEditPage>;
  const page = new ModelEditPage(props);
  installSynchronousSetState(page);
  return page;
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
  mockIframeModelText = "advanced model text";
  mockDispatchIgnoredMessage = false;
  mockIframeUpdateModelText.mockClear();
  jestValue.spyOn(Setting, "showMessage").mockImplementation(() => {});
  jestValue.spyOn(Setting, "getRandomName").mockReturnValue("abc123");
  jestValue.spyOn(Setting, "isMobile").mockReturnValue(false);
  formBackendMock.getForm.mockResolvedValue({status: "ok", data: {formItems: []}});
  modelBackendMock.getModels.mockResolvedValue({status: "ok", data: [model], data2: 1});
  modelBackendMock.getModel.mockResolvedValue({status: "ok", data: model});
  modelBackendMock.addModel.mockResolvedValue({status: "ok"});
  modelBackendMock.updateModel.mockResolvedValue({status: "ok"});
  modelBackendMock.deleteModel.mockResolvedValue({status: "ok"});
  organizationBackendMock.getOrganizations.mockResolvedValue({status: "ok", data: [{name: "engineering"}]});
});

afterEach(() => {
  jestValue.restoreAllMocks();
  jestValue.clearAllMocks();
  cleanup();
});

test("migrates Casbin model page modules to TSX files", () => {
  expect(() => require.resolve("./CasbinEditor.tsx")).not.toThrow();
  expect(() => require.resolve("./ModelListPage.tsx")).not.toThrow();
  expect(() => require.resolve("./ModelEditPage.tsx")).not.toThrow();
  expect(() => require.resolve("./CasbinEditor.js")).toThrow();
  expect(() => require.resolve("./ModelListPage.js")).toThrow();
  expect(() => require.resolve("./ModelEditPage.js")).toThrow();
});

test("syncs advanced iframe text into basic editor when switching tabs", async() => {
  const onModelTextChange = jestValue.fn();
  const view = render(<CasbinEditor model={model} onModelTextChange={onModelTextChange} />);

  await act(async() => {
    fireEvent.click(view.getByText(/基础编辑器|Basic Editor/));
    await flushPromises();
  });

  const basicEditor = view.getByTestId("basic-editor") as HTMLTextAreaElement;
  expect(onModelTextChange).toHaveBeenCalledWith("advanced model text");
  expect(basicEditor.value).toBe("advanced model text");
});

test("updates basic editor text and keeps built-in models read only", async() => {
  const onModelTextChange = jestValue.fn();
  const view = render(<CasbinEditor model={model} onModelTextChange={onModelTextChange} />);

  await act(async() => {
    fireEvent.click(view.getByText(/基础编辑器|Basic Editor/));
    await flushPromises();
  });
  fireEvent.change(view.getByTestId("basic-editor"), {target: {value: "basic model text"}});
  expect(onModelTextChange).toHaveBeenCalledWith("basic model text");

  view.rerender(<CasbinEditor model={builtInModel} onModelTextChange={onModelTextChange} />);
  const readOnlyEditor = view.getByTestId("basic-editor") as HTMLTextAreaElement;
  expect(readOnlyEditor.readOnly).toBe(true);
  fireEvent.change(readOnlyEditor, {target: {value: "blocked text"}});
  expect(onModelTextChange).not.toHaveBeenCalledWith("blocked text");
});

test("ignores unrelated iframe messages and preserves built-in advanced text", async() => {
  mockDispatchIgnoredMessage = true;
  const onModelTextChange = jestValue.fn();
  const view = render(<CasbinEditor model={builtInModel} onModelTextChange={onModelTextChange} />);

  await act(async() => {
    fireEvent.click(view.getByText(/基础编辑器|Basic Editor/));
    await flushPromises();
  });

  expect(onModelTextChange).not.toHaveBeenCalled();
  expect((view.getByTestId("basic-editor") as HTMLTextAreaElement).value).toBe(builtInModel.modelText);
});

test("renders model table and keeps toolbar and action handlers", () => {
  const history = createHistory();
  const page = new ModelListPage({
    account: adminAccount,
    history,
    match: {path: "/models", params: {}},
  } as React.ComponentProps<typeof ModelListPage>);
  installSynchronousSetState(page);
  jestValue.spyOn(page, "addModel").mockImplementation(() => {});
  jestValue.spyOn(page, "deleteModel").mockImplementation(() => {});

  const tableWrapper = page.renderTable([model]) as React.ReactElement<{children: React.ReactElement<{columns: TestTableColumn[]; title: () => React.ReactNode}>}>;
  const table = tableWrapper.props.children;
  const columns = table.props.columns;

  const tableView = render(<MemoryRouter>{tableWrapper}</MemoryRouter>);
  expect(tableView.container.querySelector(".enterprise-list-page-table-shell.model-list-page-table-shell")).not.toBeNull();
  expect(tableView.container.querySelector(".ant-table")).not.toBeNull();
  tableView.unmount();

  expect(columns[0].key).toBe("name");
  expect(columns[5].fixed).toBe("right");

  const modelTextView = render(<>{columns[4].render?.(model.modelText, model, 0)}</>);
  expect(modelTextView.getByText(/\[request_definition\]/)).not.toBeNull();
  modelTextView.unmount();

  const actionNode = columns[5].render?.(undefined, model, 0) as React.ReactElement<{children: React.ReactNode}>;
  const actionChildren = React.Children.toArray(actionNode.props.children) as React.ReactElement[];
  const actionView = render(<MemoryRouter>{actionNode}</MemoryRouter>);
  fireEvent.click(actionView.getByText(/编\s*辑|Edit/));
  expect(history.push).toHaveBeenCalledWith("/models/engineering/rbac");
  actionChildren[1].props.onConfirm();
  expect(page.deleteModel).toHaveBeenCalledWith(0);
  actionView.unmount();

  const blockedActionNode = columns[5].render?.(undefined, builtInModel, 0) as React.ReactElement<{children: React.ReactNode}>;
  const blockedActionChildren = React.Children.toArray(blockedActionNode.props.children) as React.ReactElement[];
  expect(blockedActionChildren[1].props.disabled).toBe(true);

  const toolbarView = render(<>{table.props.title()}</>);
  expect(toolbarView.container.querySelector(".enterprise-list-query-toolbar")).not.toBeNull();
  expect(toolbarView.container.querySelector(".enterprise-list-query-toolbar-title")?.textContent).toMatch(/模型|Models/);
  expect(toolbarView.getByText(/添\s*加|Add/).closest(".enterprise-list-query-toolbar-actions")).not.toBeNull();
  expect(toolbarView.container.querySelector(".enterprise-list-query-toolbar-header-meta")?.className).toContain("enterprise-list-query-toolbar-header-meta-top-right");
  fireEvent.click(toolbarView.getByText(/添\s*加|Add/));
  expect(page.addModel).toHaveBeenCalled();
});

test("renders list column links and sends filtered fetch parameters", async() => {
  localStorage.setItem("organization", "All");
  const page = createListPage();
  const tableWrapper = page.renderTable([model]) as React.ReactElement<{children: React.ReactElement<{columns: TestTableColumn[]}>}>;
  const table = tableWrapper.props.children;
  const columns = table.props.columns;

  const tableView = render(<MemoryRouter>{tableWrapper}</MemoryRouter>);
  expect(tableView.container.querySelector(".ant-table")).not.toBeNull();
  tableView.unmount();

  const nameView = render(<MemoryRouter>{columns[0].render?.(model.name, model, 0)}</MemoryRouter>);
  expect(nameView.getByText("rbac").closest("a")?.getAttribute("href")).toBe("/models/engineering/rbac");
  nameView.unmount();

  const ownerView = render(<MemoryRouter>{columns[1].render?.(model.owner, model, 0)}</MemoryRouter>);
  expect(ownerView.getByText("engineering").closest("a")?.getAttribute("href")).toBe("/organizations/engineering");
  ownerView.unmount();

  expect(columns[2].render?.(model.createdTime, model, 0)).not.toBeNull();

  modelBackendMock.getModels.mockResolvedValueOnce({status: "ok", data: [model], data2: 1});
  page.fetch({
    pagination: {...page.state.pagination, current: 1, pageSize: 20},
    type: "rbac",
    sortField: "name",
    sortOrder: "ascend",
  });
  await flushPromises();

  expect(modelBackendMock.getModels).toHaveBeenLastCalledWith("", 1, 20, "type", "rbac", "name", "ascend");
  expect(page.state.data).toEqual([model]);
  expect(page.state.pagination.total).toBe(1);
});

test("keeps mobile table and edit layout branches compatible", () => {
  jestValue.spyOn(Setting, "isMobile").mockReturnValue(true);
  const listPage = createListPage();
  const tableWrapper = listPage.renderTable([model]) as React.ReactElement<{children: React.ReactElement<{columns: TestTableColumn[]}>}>;
  expect(tableWrapper.props.children.props.columns[5].fixed).toBe(false);

  const editPage = createEditPage({
    organizationName: "override-org",
    location: {mode: "add"},
  } as Partial<React.ComponentProps<typeof ModelEditPage>>);
  editPage.state = {
    ...editPage.state,
    model: {...model},
    organizations: [{name: "engineering"}],
  };

  expect(editPage.state.organizationName).toBe("override-org");
  expect(editPage.renderModel()).not.toBeNull();
});

test("creates model and navigates to the add route", async() => {
  const history = createHistory();
  const page = new ModelListPage({
    account: adminAccount,
    history,
    match: {path: "/models", params: {}},
  } as React.ComponentProps<typeof ModelListPage>);

  expect(page.newModel()).toEqual(expect.objectContaining({
    owner: "engineering",
    name: "model_abc123",
    displayName: "New Model - abc123",
    modelText: expect.stringContaining("[request_definition]"),
  }));

  page.addModel();
  await flushPromises();

  expect(modelBackendMock.addModel).toHaveBeenCalledWith(expect.objectContaining({
    owner: "engineering",
    name: "model_abc123",
  }));
  expect(history.push).toHaveBeenCalledWith({pathname: "/models/engineering/model_abc123", mode: "add"});
  expect(Setting.showMessage).toHaveBeenCalledWith("success", expect.any(String));
});

test("deletes model, refreshes pagination and reports list errors", async() => {
  const page = createListPage();
  const originalFetch = page.fetch;
  page.fetch = jestValue.fn() as unknown as typeof page.fetch;
  page.state = {
    ...page.state,
    data: [model] as TestModelRecord[],
    pagination: {...page.state.pagination, current: 2},
  };

  page.deleteModel(0);
  await flushPromises();

  expect(modelBackendMock.deleteModel).toHaveBeenCalledWith(model);
  expect(page.fetch).toHaveBeenCalledWith(expect.objectContaining({
    pagination: expect.objectContaining({current: 1}),
  }));
  expect(Setting.showMessage).toHaveBeenCalledWith("success", expect.any(String));

  page.fetch = originalFetch;
  modelBackendMock.getModels.mockResolvedValueOnce({status: "error", msg: "list failed"});
  page.fetch({pagination: {...page.state.pagination, current: 1, pageSize: 20}});
  await flushPromises();
  expect(page.state.loading).toBe(false);
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "list failed");
});

test("reports add, delete and fetch denied errors", async() => {
  const page = createListPage();
  page.state = {
    ...page.state,
    data: [model] as TestModelRecord[],
  };
  modelBackendMock.addModel.mockResolvedValueOnce({status: "error", msg: "add failed"});
  modelBackendMock.addModel.mockRejectedValueOnce(new Error("add network"));
  modelBackendMock.deleteModel.mockResolvedValueOnce({status: "error", msg: "delete failed"});
  modelBackendMock.deleteModel.mockRejectedValueOnce(new Error("delete network"));
  modelBackendMock.getModels.mockResolvedValueOnce({status: "error", msg: "Unauthorized operation"});

  page.addModel();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("add failed"));

  page.addModel();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("add network"));

  page.deleteModel(0);
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete failed"));

  page.deleteModel(0);
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete network"));

  page.fetch({pagination: {...page.state.pagination, current: 1, pageSize: 20}});
  await flushPromises();
  expect(page.state.isAuthorized).toBe(false);
});

test("loads model and organizations before rendering edit form", async() => {
  const page = createEditPage();

  page.UNSAFE_componentWillMount();
  await flushPromises();

  expect(modelBackendMock.getModel).toHaveBeenCalledWith("engineering", "rbac");
  expect(organizationBackendMock.getOrganizations).toHaveBeenCalledWith("admin");
  expect(page.state.model).toEqual(model);
  expect(page.state.organizations).toEqual([{name: "engineering"}]);

  const view = render(<MemoryRouter>{page.render()}</MemoryRouter>);
  expect(view.getByDisplayValue("rbac")).not.toBeNull();
  expect(view.getByDisplayValue("RBAC Model")).not.toBeNull();
  expect(view.getByDisplayValue("model description")).not.toBeNull();
});

test("handles edit loading errors and null-safe operations", async() => {
  const history = createHistory();
  const page = createEditPage({history} as Partial<React.ComponentProps<typeof ModelEditPage>>);

  modelBackendMock.getModel.mockResolvedValueOnce({status: "ok", data: null});
  page.getModel();
  await flushPromises();
  expect(history.push).toHaveBeenCalledWith("/404");

  modelBackendMock.getModel.mockResolvedValueOnce({status: "error", msg: "model unavailable", data: model});
  page.getModel();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", "model unavailable");

  organizationBackendMock.getOrganizations.mockResolvedValueOnce({status: "ok"});
  page.getOrganizations();
  await flushPromises();
  expect(page.state.organizations).toEqual([]);

  page.state = {
    ...page.state,
    model: null,
  };
  page.updateModelField("", "12");
  page.submitModelEdit(false);
  page.deleteModel();
  expect(page.renderModel()).toBeNull();
});

test("updates rendered edit controls and model editor callback", () => {
  const page = createEditPage();
  page.state = {
    ...page.state,
    model: {...model},
    organizations: [{name: "engineering"}],
  };

  const modelView = render(<MemoryRouter>{page.renderModel()}</MemoryRouter>);
  fireEvent.change(modelView.getByDisplayValue("rbac"), {target: {value: "renamed"}});
  fireEvent.change(modelView.getByDisplayValue("RBAC Model"), {target: {value: "Display Changed"}});
  fireEvent.change(modelView.getByDisplayValue("model description"), {target: {value: "Description Changed"}});

  expect(page.state.model?.name).toBe("renamed");
  expect(page.state.model?.displayName).toBe("Display Changed");
  expect(page.state.model?.description).toBe("Description Changed");

  const editorElement = findElementByType(page.renderModel(), CasbinEditor);
  expect(editorElement).not.toBeNull();
  (editorElement?.props as {onModelTextChange: (value: string) => void}).onModelTextChange("model text from editor");
  expect(page.state.model?.modelText).toBe("model text from editor");
});

test("saves model, exits to list and rolls back name on save failure", async() => {
  const history = createHistory();
  const page = createEditPage({history} as Partial<React.ComponentProps<typeof ModelEditPage>>);
  page.state = {
    ...page.state,
    model: {...model, name: "renamed"},
  };

  page.submitModelEdit(true);
  await flushPromises();

  expect(modelBackendMock.updateModel).toHaveBeenCalledWith("engineering", "rbac", expect.objectContaining({name: "renamed"}));
  expect(Setting.showMessage).toHaveBeenCalledWith("success", expect.any(String));
  expect(history.push).toHaveBeenCalledWith("/models");

  modelBackendMock.updateModel.mockResolvedValueOnce({status: "error", msg: "save failed"});
  page.state = {
    ...page.state,
    model: {...model, name: "bad-name"},
    modelName: "rbac",
  };

  page.submitModelEdit(false);
  await flushPromises();

  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("save failed"));
  expect(page.state.model?.name).toBe("rbac");
});

test("saves without exit and reports save and delete network errors", async() => {
  const history = createHistory();
  const page = createEditPage({history} as Partial<React.ComponentProps<typeof ModelEditPage>>);
  page.state = {
    ...page.state,
    model: {...model, name: "renamed"},
  };

  page.submitModelEdit(false);
  await flushPromises();
  expect(history.push).toHaveBeenCalledWith("/models/engineering/renamed");

  modelBackendMock.updateModel.mockRejectedValueOnce(new Error("save network"));
  page.submitModelEdit(false);
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("save network"));

  modelBackendMock.deleteModel.mockResolvedValueOnce({status: "error", msg: "delete rejected"});
  page.deleteModel();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete rejected"));

  modelBackendMock.deleteModel.mockRejectedValueOnce(new Error("delete network"));
  page.deleteModel();
  await flushPromises();
  expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete network"));
});

test("updates edit fields and cancels added model by deleting it", async() => {
  const history = createHistory();
  const page = createEditPage({
    history,
    location: {mode: "add"},
  } as Partial<React.ComponentProps<typeof ModelEditPage>>);
  page.state = {
    ...page.state,
    mode: "add",
    model: {...model},
    organizations: [{name: "engineering"} as TestOrganizationRecord],
  };

  page.updateModelField("displayName", "Updated Model");
  page.updateModelField("modelText", "updated model text");
  expect(page.state.model?.displayName).toBe("Updated Model");
  expect(page.state.model?.modelText).toBe("updated model text");

  const view = render(<MemoryRouter>{page.render()}</MemoryRouter>);
  fireEvent.click(view.getAllByText(/取\s*消|Cancel/)[0]);
  await flushPromises();

  expect(modelBackendMock.deleteModel).toHaveBeenCalledWith(expect.objectContaining({name: "rbac"}));
  expect(history.push).toHaveBeenCalledWith("/models");
});
