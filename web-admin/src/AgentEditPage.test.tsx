/* eslint-env jest */
import React from "react";
import {act, cleanup, render} from "@testing-library/react";
import {expect, jest} from "@jest/globals";
import AgentEditPage from "./AgentEditPage";
import * as AgentBackend from "./backend/AgentBackend";
import * as ApplicationBackend from "./backend/ApplicationBackend";
import * as OrganizationBackend from "./backend/OrganizationBackend";
import * as Setting from "./Setting";

type LooseMock = {
  (...args: unknown[]): unknown;
  mockResolvedValue: (value: unknown) => LooseMock;
  mockResolvedValueOnce: (value: unknown) => LooseMock;
  mockRejectedValueOnce: (value: unknown) => LooseMock;
};

type AgentBackendMock = Pick<Record<keyof typeof AgentBackend, LooseMock>, "getAgent" | "updateAgent" | "deleteAgent">;
type ApplicationBackendMock = Pick<Record<keyof typeof ApplicationBackend, LooseMock>, "getApplicationsByOrganization">;
type OrganizationBackendMock = Pick<Record<keyof typeof OrganizationBackend, LooseMock>, "getOrganizations">;

interface TestAgentRecord {
  owner: string;
  name: string;
  displayName: string;
  url: string;
  token: string;
  application: string;
}

type ElementHandler = (...args: unknown[]) => void;

interface ElementProps {
  children?: React.ReactNode;
  onChange?: ElementHandler;
  value?: unknown;
}

jest.mock("./backend/AgentBackend", () => {
  const {jest: factoryJest} = require("@jest/globals");
  return {
    getAgent: factoryJest.fn(),
    updateAgent: factoryJest.fn(),
    deleteAgent: factoryJest.fn(),
  };
});

jest.mock("./backend/ApplicationBackend", () => {
  const {jest: factoryJest} = require("@jest/globals");
  return {
    getApplicationsByOrganization: factoryJest.fn(),
  };
});

jest.mock("./backend/OrganizationBackend", () => {
  const {jest: factoryJest} = require("@jest/globals");
  return {
    getOrganizations: factoryJest.fn(),
  };
});

const agentBackendMock = AgentBackend as unknown as AgentBackendMock;
const applicationBackendMock = ApplicationBackend as unknown as ApplicationBackendMock;
const organizationBackendMock = OrganizationBackend as unknown as OrganizationBackendMock;
const fs = require("fs") as {existsSync: (filePath: string) => boolean};
const path = require("path") as {join: (...parts: string[]) => string};
const {fireEvent} = require("@testing-library/react") as {
  fireEvent: {
    change: (element: Element | null, event: unknown) => boolean;
    click: (element: Element | null) => boolean;
  };
};
let consoleErrorSpy: {mockRestore: () => void};

const adminAccount = {owner: "admin", tag: "", isAdmin: true};
const agent: TestAgentRecord = {
  owner: "engineering",
  name: "agent-one",
  displayName: "Agent One",
  url: "https://agent.example.invalid/listen",
  token: "token-one",
  application: "admin-app",
};

function createHistory() {
  return {
    push: jest.fn(),
  };
}

function createProps(options: {mode?: string; history?: ReturnType<typeof createHistory>} = {}) {
  return {
    account: adminAccount,
    history: options.history ?? createHistory(),
    location: {mode: options.mode},
    match: {params: {organizationName: "engineering", agentName: "agent-one"}},
  };
}

function createPage(options: {mode?: string; agentOverride?: Partial<TestAgentRecord>} = {}) {
  const page = new AgentEditPage(createProps({mode: options.mode}));
  page.setState = ((stateUpdate: unknown, callback?: () => void) => {
    const nextState = typeof stateUpdate === "function"
      ? (stateUpdate as (state: unknown, props: unknown) => unknown)(page.state, page.props)
      : stateUpdate;
    page.state = {...page.state, ...(nextState as Record<string, unknown>)};
    callback?.();
  }) as typeof page.setState;
  page.state = {
    ...page.state,
    agent: {
      ...agent,
      ...options.agentOverride,
    },
    organizations: [{name: "engineering"}, {name: "platform"}],
    applications: [{name: "admin-app"}],
  };
  return page;
}

function renderPage(options: {mode?: string; history?: ReturnType<typeof createHistory>} = {}) {
  const history = options.history ?? createHistory();
  const view = render(
    <AgentEditPage {...createProps({mode: options.mode, history})} />
  );
  return {history, view};
}

function getButtonByNormalizedText(container: HTMLElement, text: string): HTMLButtonElement {
  const button = Array.from(container.querySelectorAll("button")).find(item => item.textContent?.replace(/\s/g, "") === text);
  if (button === undefined) {
    throw new Error(`Unable to find button with normalized text: ${text}`);
  }

  return button;
}

function visitReactNode(node: React.ReactNode, visitor: (element: React.ReactElement) => void): void {
  if (Array.isArray(node)) {
    node.forEach(child => visitReactNode(child, visitor));
    return;
  }

  if (!React.isValidElement(node)) {
    return;
  }

  visitor(node);
  visitReactNode((node.props as ElementProps).children, visitor);
}

async function flushPromises() {
  await act(async() => {
    await Promise.resolve();
  });
}

describe("AgentEditPage", () => {
  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation((message?: unknown, ...args: unknown[]) => {
      throw new Error([message, ...args].map(item => `${item}`).join(" "));
    });
    jest.spyOn(Setting, "showMessage").mockImplementation(() => {});
    jest.spyOn(Setting, "isMobile").mockReturnValue(false);
    jest.spyOn(Setting, "isAdminUser").mockReturnValue(true);
    agentBackendMock.getAgent.mockResolvedValue({status: "ok", data: {...agent}});
    agentBackendMock.updateAgent.mockResolvedValue({status: "ok"});
    agentBackendMock.deleteAgent.mockResolvedValue({status: "ok"});
    organizationBackendMock.getOrganizations.mockResolvedValue({status: "ok", data: [{name: "engineering"}, {name: "platform"}]});
    applicationBackendMock.getApplicationsByOrganization.mockResolvedValue({status: "ok", data: [{name: "admin-app"}]});
  });

  afterEach(() => {
    cleanup();
    consoleErrorSpy.mockRestore();
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  test("is migrated from JavaScript to TSX", () => {
    expect(fs.existsSync(path.join(__dirname, "AgentEditPage.tsx"))).toBe(true);
    expect(fs.existsSync(path.join(__dirname, "AgentEditPage.js"))).toBe(false);
  });

  test("loads agent data and renders editable fields", async() => {
    const {view} = renderPage();

    expect(await view.findByDisplayValue("Agent One")).not.toBeNull();
    expect(view.getByDisplayValue("agent-one")).not.toBeNull();
    expect(view.getByDisplayValue("https://agent.example.invalid/listen")).not.toBeNull();
    expect(agentBackendMock.getAgent).toHaveBeenCalledWith("engineering", "agent-one");
    expect(organizationBackendMock.getOrganizations).toHaveBeenCalledWith("admin");
    expect(applicationBackendMock.getApplicationsByOrganization).toHaveBeenCalledWith("admin", "engineering");
  });

  test("publishes the agent display name for its workspace tab after loading and display-name edits", async() => {
    const dispatchSpy = jest.spyOn(window, "dispatchEvent");
    const page = createPage();

    page.getAgent();
    await flushPromises();

    const loadedEvent = dispatchSpy.mock.calls.at(-1)?.[0] as CustomEvent | undefined;
    expect(loadedEvent?.type).toBe("aicodex.admin.workspaceTabLabelUpdate");
    expect(loadedEvent?.detail).toEqual({
      path: "/agents/engineering/agent-one",
      label: expect.stringMatching(/Agent One$/),
    });

    const loadDispatchCount = dispatchSpy.mock.calls.length;
    page.updateAgentField("url", "https://updated.example.invalid/listen");
    expect(dispatchSpy).toHaveBeenCalledTimes(loadDispatchCount);

    page.updateAgentField("displayName", "   ");
    expect(dispatchSpy).toHaveBeenCalledTimes(loadDispatchCount + 1);
    const fallbackEvent = dispatchSpy.mock.calls.at(-1)?.[0] as CustomEvent | undefined;
    expect(fallbackEvent?.detail).toEqual({
      path: "/agents/engineering/agent-one",
      label: expect.stringMatching(/agent-one$/),
    });
  });

  test("uses scoped Gateway edit layout hooks", () => {
    const page = createPage();
    const view = render(<>{page.render()}</>);

    expect(view.container.querySelector(".admin-gateway-edit-page")).not.toBeNull();
    expect(view.container.querySelector(".admin-gateway-edit-card")).not.toBeNull();
    expect(view.container.querySelectorAll(".admin-gateway-edit-field-row")).toHaveLength(6);
  });

  test("redirects to 404 for missing agents and reports load failures", async() => {
    agentBackendMock.getAgent.mockResolvedValueOnce({status: "ok", data: null});
    const first = renderPage();
    await flushPromises();
    expect(first.history.push).toHaveBeenCalledWith("/404");

    cleanup();
    agentBackendMock.getAgent.mockResolvedValueOnce({status: "error", msg: "load failed", data: {}});
    renderPage();
    await flushPromises();
    expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("load failed"));
  });

  test("updates owner-dependent fields and reloads application choices", () => {
    const page = createPage();

    page.updateAgentField("owner", "platform");

    expect(page.state.agent?.owner).toBe("platform");
    expect(page.state.agent?.application).toBe("");
    expect(applicationBackendMock.getApplicationsByOrganization).toHaveBeenCalledWith("admin", "platform");

    page.updateAgentField("displayName", "Renamed Agent");
    expect(page.state.agent?.displayName).toBe("Renamed Agent");
  });

  test("keeps null agent guards from calling mutation APIs before load", () => {
    const page = new AgentEditPage(createProps());

    page.updateAgentField("displayName", "ignored");
    page.submitAgentEdit(false);
    page.deleteAgent();

    expect(page.renderAgent()).toBeNull();
    expect(agentBackendMock.updateAgent).not.toHaveBeenCalled();
    expect(agentBackendMock.deleteAgent).not.toHaveBeenCalled();
  });

  test("keeps edit form field handlers wired to agent state", () => {
    const page = createPage({mode: "add"});
    jest.spyOn(Setting, "isMobile").mockReturnValue(true);
    const handlers = new Map<unknown, ElementHandler>();

    visitReactNode(page.renderAgent(), (element) => {
      const props = element.props as ElementProps;
      if (props.onChange !== undefined) {
        handlers.set(props.value, props.onChange);
      }
    });

    handlers.get("engineering")?.("platform");
    handlers.get("agent-one")?.({target: {value: "agent-two"}});
    handlers.get("Agent One")?.({target: {value: "Agent Two"}});
    handlers.get("https://agent.example.invalid/listen")?.({target: {value: "https://agent-two.example.invalid/listen"}});
    handlers.get("token-one")?.({target: {value: "token-two"}});
    handlers.get("admin-app")?.("app-two");

    expect(page.state.agent).toEqual(expect.objectContaining({
      owner: "platform",
      name: "agent-two",
      displayName: "Agent Two",
      url: "https://agent-two.example.invalid/listen",
      token: "token-two",
      application: "app-two",
    }));
    expect(applicationBackendMock.getApplicationsByOrganization).toHaveBeenCalledWith("admin", "platform");
  });

  test("skips organization loading for non-admin accounts", () => {
    jest.spyOn(Setting, "isAdminUser").mockReturnValue(false);
    const page = createPage();
    organizationBackendMock.getOrganizations.mockResolvedValueOnce({status: "ok", data: [{name: "unused"}]});

    page.getOrganizations();

    expect(organizationBackendMock.getOrganizations).not.toHaveBeenCalledWith("admin");
  });

  test("saves agent edits and keeps the editor open", async() => {
    const history = createHistory();
    const {view} = renderPage({history});

    const displayNameInput = await view.findByDisplayValue("Agent One");
    fireEvent.change(displayNameInput, {target: {value: "Agent Prime"}});
    fireEvent.click(getButtonByNormalizedText(view.container, "保存"));
    await flushPromises();

    expect(agentBackendMock.updateAgent).toHaveBeenCalledWith("engineering", "agent-one", expect.objectContaining({
      displayName: "Agent Prime",
    }));
    expect(history.push).toHaveBeenCalledWith("/agents/engineering/agent-one");
    expect(Setting.showMessage).toHaveBeenCalledWith("success", expect.any(String));
  });

  test("saves and exits to the agent list", async() => {
    const history = createHistory();
    const {view} = renderPage({history});

    expect(await view.findByDisplayValue("Agent One")).not.toBeNull();
    fireEvent.click(getButtonByNormalizedText(view.container, "保存&退出"));
    await flushPromises();

    expect(agentBackendMock.updateAgent).toHaveBeenCalledWith("engineering", "agent-one", expect.objectContaining({
      name: "agent-one",
    }));
    expect(history.push).toHaveBeenCalledWith("/agents");
  });

  test("cancel in add mode deletes the draft agent", async() => {
    const history = createHistory();
    const {view} = renderPage({mode: "add", history});

    expect(await view.findByDisplayValue("Agent One")).not.toBeNull();
    fireEvent.click(getButtonByNormalizedText(view.container, "取消"));
    await flushPromises();

    expect(agentBackendMock.deleteAgent).toHaveBeenCalledWith(expect.objectContaining({
      name: "agent-one",
    }));
    expect(history.push).toHaveBeenCalledWith("/agents");
  });

  test("reports save and delete failures", async() => {
    const page = createPage();
    agentBackendMock.updateAgent.mockResolvedValueOnce({status: "error", msg: "save failed"});
    agentBackendMock.updateAgent.mockRejectedValueOnce(new Error("save network"));
    agentBackendMock.deleteAgent.mockResolvedValueOnce({status: "error", msg: "delete failed"});
    agentBackendMock.deleteAgent.mockRejectedValueOnce(new Error("delete network"));

    page.submitAgentEdit(false);
    await flushPromises();
    expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("save failed"));

    page.submitAgentEdit(false);
    await flushPromises();
    expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("save network"));

    page.deleteAgent();
    await flushPromises();
    expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete failed"));

    page.deleteAgent();
    await flushPromises();
    expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete network"));
  });
});
