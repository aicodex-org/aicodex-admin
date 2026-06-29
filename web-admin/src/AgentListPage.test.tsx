/* eslint-env jest */
import React from "react";
import {act, cleanup, render} from "@testing-library/react";
import {expect, jest} from "@jest/globals";
import {MemoryRouter} from "react-router-dom";
import i18next from "i18next";
import AgentListPage from "./AgentListPage";
import * as AgentBackend from "./backend/AgentBackend";
import * as FormBackend from "./backend/FormBackend";
import * as Setting from "./Setting";
import en from "./locales/en/data.json";
import zh from "./locales/zh/data.json";

type LooseMock = {
  (...args: unknown[]): unknown;
  mockImplementation: (implementation: (...args: unknown[]) => unknown) => LooseMock;
  mockReturnValue: (value: unknown) => LooseMock;
  mockResolvedValue: (value: unknown) => LooseMock;
  mockResolvedValueOnce: (value: unknown) => LooseMock;
  mockRejectedValueOnce: (value: unknown) => LooseMock;
};

type AgentBackendMock = Record<keyof typeof AgentBackend, LooseMock>;
type FormBackendMock = Record<keyof typeof FormBackend, LooseMock>;

interface TestAgentRecord {
  owner: string;
  name: string;
  createdTime: string;
  displayName: string;
  url: string;
  token: string;
  application: string;
  [key: string]: unknown;
}

interface TestTableColumn {
  key?: string;
  fixed?: unknown;
  filterDropdown?: unknown;
  filterIcon?: unknown;
  render?: (text: unknown, record: TestAgentRecord, index: number) => React.ReactNode;
}

function getRenderedTable(node: React.ReactNode): React.ReactElement<{columns: TestTableColumn[]; title: () => React.ReactNode}> {
  const wrapper = node as React.ReactElement<{children: React.ReactNode; className?: string}>;
  expect(wrapper.props.className).toContain("agent-list-page-table-shell");
  return React.Children.only(wrapper.props.children) as React.ReactElement<{columns: TestTableColumn[]; title: () => React.ReactNode}>;
}

jest.mock("./backend/AgentBackend", () => {
  const {jest: factoryJest} = require("@jest/globals");
  return {
    getAgents: factoryJest.fn(),
    getAgent: factoryJest.fn(),
    updateAgent: factoryJest.fn(),
    addAgent: factoryJest.fn(),
    deleteAgent: factoryJest.fn(),
  };
});

jest.mock("./backend/FormBackend", () => {
  const {jest: factoryJest} = require("@jest/globals");
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

const agentBackendMock = AgentBackend as unknown as AgentBackendMock;
const formBackendMock = FormBackend as unknown as FormBackendMock;
const fs = require("fs") as {existsSync: (filePath: string) => boolean};
const path = require("path") as {join: (...parts: string[]) => string};
const {fireEvent} = require("@testing-library/react") as {
  fireEvent: {
    click: (element: Element | null) => boolean;
  };
};
let consoleErrorSpy: {mockRestore: () => void};

const adminAccount = {owner: "admin", tag: "", isAdmin: true};
const agent: TestAgentRecord = {
  owner: "engineering",
  name: "agent-one",
  createdTime: "2026-06-19T10:00:00Z",
  displayName: "Agent One",
  url: "https://agent.example.invalid/listen",
  token: "secret-token",
  application: "admin-app",
};

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

function createHistory() {
  return {
    push: jest.fn(),
  };
}

function installSynchronousSetState(page: AgentListPage) {
  page.setState = ((stateUpdate: unknown, callback?: () => void) => {
    const patch = typeof stateUpdate === "function" ? stateUpdate(page.state, page.props) : stateUpdate;
    page.state = {
      ...page.state,
      ...(patch as Record<string, unknown>),
    };
    callback?.();
  }) as typeof page.setState;
}

function createPage() {
  const page = new AgentListPage({
    account: adminAccount,
    history: createHistory(),
    match: {path: "/agents", params: {}},
  });
  installSynchronousSetState(page);
  return page;
}

function renderPage() {
  return render(
    <MemoryRouter>
      <AgentListPage
        account={adminAccount}
        history={createHistory()}
        match={{path: "/agents", params: {}}}
      />
    </MemoryRouter>
  );
}

async function flushPromises() {
  await act(async() => {
    await Promise.resolve();
  });
}

describe("AgentListPage", () => {
  beforeEach(async() => {
    await useTestLanguage("zh");
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation((message?: unknown, ...args: unknown[]) => {
      if (`${message}`.includes("ReactDOM.render is no longer supported")) {
        return;
      }

      throw new Error([message, ...args].map(item => `${item}`).join(" "));
    });
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
    jest.spyOn(Setting, "getRandomName").mockReturnValue("abc123");
    jest.spyOn(Setting, "getRequestOrganization").mockReturnValue("engineering");
    jest.spyOn(Setting, "isMobile").mockReturnValue(false);
    formBackendMock.getForm.mockResolvedValue({status: "ok", data: {formItems: []}});
    agentBackendMock.getAgents.mockResolvedValue({status: "ok", data: [agent], data2: 1});
    agentBackendMock.addAgent.mockResolvedValue({status: "ok"});
    agentBackendMock.deleteAgent.mockResolvedValue({status: "ok"});
  });

  afterEach(() => {
    cleanup();
    consoleErrorSpy.mockRestore();
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  test("is migrated from JavaScript to TSX", () => {
    expect(fs.existsSync(path.join(__dirname, "AgentListPage.tsx"))).toBe(true);
    expect(fs.existsSync(path.join(__dirname, "AgentListPage.js"))).toBe(false);
  });

  test("renders agent rows with the shared list shell", async() => {
    const view = renderPage();

    expect(await view.findByText("agent-one")).not.toBeNull();
    expect(view.container.querySelector(".llm-ai-gateway-center")).toBeNull();
    expect(view.container.querySelector(".enterprise-list-page-table-shell.agent-list-page-table-shell")).not.toBeNull();
    expect(view.container.querySelector(".enterprise-list-query-toolbar")).not.toBeNull();
    expect(view.getByText("Agent One")).not.toBeNull();
    expect(agentBackendMock.getAgents).toHaveBeenCalledWith("engineering", expect.any(Number), expect.any(Number), undefined, undefined, undefined, undefined);
    expect(formBackendMock.getForm).toHaveBeenCalled();
    expect(view.container.textContent).not.toMatch(/secret-token/);
  });

  test("creates a default agent and navigates to the edit route", async() => {
    const history = createHistory();
    const page = new AgentListPage({
      account: adminAccount,
      history,
      match: {path: "/agents", params: {}},
    });

    expect(page.newAgent()).toEqual(expect.objectContaining({
      owner: "engineering",
      name: "agent_abc123",
      displayName: "New Agent - abc123",
      url: "",
      token: "",
      application: "",
    }));

    page.addAgent();
    await flushPromises();

    expect(agentBackendMock.addAgent).toHaveBeenCalledWith(expect.objectContaining({
      owner: "engineering",
      name: "agent_abc123",
    }));
    expect(history.push).toHaveBeenCalledWith({pathname: "/agents/engineering/agent_abc123", mode: "add"});
    expect(Setting.showMessage).toHaveBeenCalledWith("success", expect.any(String));
  });

  test("fetches agents with pagination, search and sorting state", async() => {
    const page = createPage();

    page.fetch({
      pagination: {...page.state.pagination, current: 2, pageSize: 20},
      searchedColumn: "name",
      searchText: "agent",
      sortField: "createdTime",
      sortOrder: "descend",
    });
    await flushPromises();

    expect(agentBackendMock.getAgents).toHaveBeenCalledWith("engineering", 2, 20, "name", "agent", "createdTime", "descend");
    expect(page.state.loading).toBe(false);
    expect(page.state.data).toEqual([agent]);
    expect(page.state.pagination.total).toBe(1);
  });

  test("uses default pagination and empty data fallback during fetch", async() => {
    const page = createPage();
    agentBackendMock.getAgents.mockResolvedValueOnce({status: "ok", data: undefined, data2: 0});

    page.fetch();
    await flushPromises();

    expect(agentBackendMock.getAgents).toHaveBeenCalledWith("engineering", 1, 10, undefined, undefined, undefined, undefined);
    expect(page.state.data).toEqual([]);
    expect(page.state.pagination.total).toBe(0);
  });

  test("deletes agents and rolls back pagination for the last row", async() => {
    const page = createPage();
    page.fetch = jest.fn() as unknown as typeof page.fetch;
    page.state = {
      ...page.state,
      data: [agent],
      pagination: {...page.state.pagination, current: 3},
    };

    page.deleteAgent(0);
    await flushPromises();

    expect(agentBackendMock.deleteAgent).toHaveBeenCalledWith(agent);
    expect(page.fetch).toHaveBeenCalledWith(expect.objectContaining({
      pagination: expect.objectContaining({current: 2}),
    }));
    expect(Setting.showMessage).toHaveBeenCalledWith("success", expect.any(String));
  });

  test("keeps current pagination when deleting from a page with multiple rows", async() => {
    const secondAgent = {...agent, name: "agent-two"};
    const page = createPage();
    page.fetch = jest.fn() as unknown as typeof page.fetch;
    page.state = {
      ...page.state,
      data: [agent, secondAgent],
      pagination: {...page.state.pagination, current: 3},
    };

    page.deleteAgent(0);
    await flushPromises();

    expect(page.fetch).toHaveBeenCalledWith(expect.objectContaining({
      pagination: expect.objectContaining({current: 3}),
    }));
  });

  test("reports add, delete and list failures", async() => {
    const page = createPage();
    page.state = {
      ...page.state,
      data: [agent],
    };
    agentBackendMock.addAgent.mockResolvedValueOnce({status: "error", msg: "add failed"});
    agentBackendMock.addAgent.mockRejectedValueOnce(new Error("add network"));
    agentBackendMock.deleteAgent.mockResolvedValueOnce({status: "error", msg: "delete failed"});
    agentBackendMock.deleteAgent.mockRejectedValueOnce(new Error("delete network"));
    agentBackendMock.getAgents.mockResolvedValueOnce({status: "error", msg: "list failed"});

    page.addAgent();
    await flushPromises();
    expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("add failed"));

    page.addAgent();
    await flushPromises();
    expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("add network"));

    page.deleteAgent(0);
    await flushPromises();
    expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete failed"));

    page.deleteAgent(0);
    await flushPromises();
    expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete network"));

    page.fetch({pagination: {...page.state.pagination, current: 1, pageSize: 10}});
    await flushPromises();
    expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("list failed"));
  });

  test("keeps table columns, toolbar and row actions wired", () => {
    const history = createHistory();
    const page = new AgentListPage({
      account: adminAccount,
      history,
      match: {path: "/agents", params: {}},
    });
    installSynchronousSetState(page);
    jest.spyOn(page, "addAgent").mockImplementation(() => {});
    jest.spyOn(page, "deleteAgent").mockImplementation(() => {});

    const table = getRenderedTable(page.renderTable([agent]));
    const columns = table.props.columns;

    expect(columns[0].key).toBe("name");
    expect(columns[6].fixed).toBeUndefined();
    columns.forEach(column => {
      expect(column.filterDropdown).toBeUndefined();
      expect(column.filterIcon).toBeUndefined();
    });
    expect(columns[4].render?.("", agent, 0)).toBeNull();

    const actionNode = columns[6].render?.(undefined, agent, 0) as React.ReactElement<{children: React.ReactNode}>;
    const actionChildren = React.Children.toArray(actionNode.props.children) as React.ReactElement[];
    const actionView = render(<>{actionNode}</>);
    fireEvent.click(actionView.getByText(/编\s*辑|Edit/));
    expect(history.push).toHaveBeenCalledWith("/agents/engineering/agent-one");
    actionChildren[1].props.onConfirm();
    expect(page.deleteAgent).toHaveBeenCalledWith(0);
    actionView.unmount();

    const toolbarView = render(<>{table.props.title()}</>);
    fireEvent.click(toolbarView.getByText(/添\s*加|Add/));
    expect(page.addAgent).toHaveBeenCalled();
  });

  test("does not fix the action column on mobile", () => {
    jest.spyOn(Setting, "isMobile").mockReturnValue(true);
    const page = createPage();

    const table = getRenderedTable(page.renderTable([agent]));

    expect(table.props.columns[6].fixed).toBeUndefined();
  });
});
