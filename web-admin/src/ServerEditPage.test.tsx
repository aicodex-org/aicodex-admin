/* eslint-env jest */
import React from "react";
import {act, cleanup, render} from "@testing-library/react";
import {expect, jest} from "@jest/globals";
import ServerEditPage from "./ServerEditPage";
import * as ServerBackend from "./backend/ServerBackend";
import * as ApplicationBackend from "./backend/ApplicationBackend";
import * as OrganizationBackend from "./backend/OrganizationBackend";
import * as Setting from "./Setting";

type LooseMock = {
  (...args: unknown[]): unknown;
  mockResolvedValue: (value: unknown) => LooseMock;
  mockResolvedValueOnce: (value: unknown) => LooseMock;
  mockRejectedValueOnce: (value: unknown) => LooseMock;
};

type ServerBackendMock = Pick<Record<keyof typeof ServerBackend, LooseMock>, "getServer" | "updateServer" | "deleteServer">;
type ApplicationBackendMock = Pick<Record<keyof typeof ApplicationBackend, LooseMock>, "getApplicationsByOrganization">;
type OrganizationBackendMock = Pick<Record<keyof typeof OrganizationBackend, LooseMock>, "getOrganizations">;

interface TestToolRecord {
  name: string;
  description: string;
  isAllowed: boolean;
  [key: string]: unknown;
}

interface TestServerRecord {
  owner: string;
  name: string;
  displayName: string;
  url: string;
  token: string;
  application: string;
  tools: TestToolRecord[];
}

type ElementHandler = (...args: unknown[]) => void;

interface ElementProps {
  children?: React.ReactNode;
  onChange?: ElementHandler;
  onUpdateTable?: (value: TestToolRecord[]) => void;
  value?: unknown;
  tools?: TestToolRecord[];
}

jest.mock("./ToolTable", () => {
  const React = require("react");
  return function MockToolTable(props: {onUpdateTable: (value: TestToolRecord[]) => void}) {
    return React.createElement("button", {
      type: "button",
      onClick: () => props.onUpdateTable([{name: "lookup", description: "Lookup", isAllowed: false}]),
    }, "Mock ToolTable");
  };
});

jest.mock("./backend/ServerBackend", () => {
  const {jest: factoryJest} = require("@jest/globals");
  return {
    getServer: factoryJest.fn(),
    updateServer: factoryJest.fn(),
    deleteServer: factoryJest.fn(),
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

const serverBackendMock = ServerBackend as unknown as ServerBackendMock;
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
const server: TestServerRecord = {
  owner: "engineering",
  name: "server-one",
  displayName: "Server One",
  url: "https://server.example.invalid/mcp",
  token: "token-one",
  application: "admin-app",
  tools: [{name: "search", description: "Search docs", isAllowed: true}],
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
    match: {params: {organizationName: "engineering", serverName: "server-one"}},
  };
}

function createPage(options: {mode?: string; serverOverride?: Partial<TestServerRecord>} = {}) {
  const page = new ServerEditPage(createProps({mode: options.mode}));
  page.setState = ((stateUpdate: unknown, callback?: () => void) => {
    const nextState = typeof stateUpdate === "function"
      ? (stateUpdate as (state: unknown, props: unknown) => unknown)(page.state, page.props)
      : stateUpdate;
    page.state = {...page.state, ...(nextState as Record<string, unknown>)};
    callback?.();
  }) as typeof page.setState;
  page.state = {
    ...page.state,
    server: {
      ...server,
      ...options.serverOverride,
    },
    organizations: [{name: "engineering"}, {name: "platform"}],
    applications: [{name: "admin-app"}],
  };
  return page;
}

function renderPage(options: {mode?: string; history?: ReturnType<typeof createHistory>} = {}) {
  const history = options.history ?? createHistory();
  const view = render(
    <ServerEditPage {...createProps({mode: options.mode, history})} />
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

describe("ServerEditPage", () => {
  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation((message?: unknown, ...args: unknown[]) => {
      if (`${message}`.includes("ReactDOM.render is no longer supported") || `${message}`.includes("Invalid DOM property")) {
        return;
      }

      throw new Error([message, ...args].map(item => `${item}`).join(" "));
    });
    jest.spyOn(Setting, "showMessage").mockImplementation(() => {});
    jest.spyOn(Setting, "isMobile").mockReturnValue(false);
    jest.spyOn(Setting, "isAdminUser").mockReturnValue(true);
    serverBackendMock.getServer.mockResolvedValue({status: "ok", data: {...server}});
    serverBackendMock.updateServer.mockResolvedValue({status: "ok"});
    serverBackendMock.deleteServer.mockResolvedValue({status: "ok"});
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
    expect(fs.existsSync(path.join(__dirname, "ServerEditPage.tsx"))).toBe(true);
    expect(fs.existsSync(path.join(__dirname, "ServerEditPage.js"))).toBe(false);
  });

  test("loads server data and renders editable fields", async() => {
    const {view} = renderPage();

    expect(await view.findByDisplayValue("Server One")).not.toBeNull();
    expect(view.getByDisplayValue("server-one")).not.toBeNull();
    expect(view.getByDisplayValue("https://server.example.invalid/mcp")).not.toBeNull();
    expect(serverBackendMock.getServer).toHaveBeenCalledWith("engineering", "server-one");
    expect(organizationBackendMock.getOrganizations).toHaveBeenCalledWith("admin");
    expect(applicationBackendMock.getApplicationsByOrganization).toHaveBeenCalledWith("admin", "engineering");
  });

  test("redirects to 404 for missing servers and reports load failures", async() => {
    serverBackendMock.getServer.mockResolvedValueOnce({status: "ok", data: null});
    const first = renderPage();
    await flushPromises();
    expect(first.history.push).toHaveBeenCalledWith("/404");

    cleanup();
    serverBackendMock.getServer.mockResolvedValueOnce({status: "error", msg: "load failed", data: {}});
    renderPage();
    await flushPromises();
    expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("load failed"));
  });

  test("updates owner-dependent fields and reloads application choices", () => {
    const page = createPage();

    page.updateServerField("owner", "platform");

    expect(page.state.server?.owner).toBe("platform");
    expect(page.state.server?.application).toBe("");
    expect(applicationBackendMock.getApplicationsByOrganization).toHaveBeenCalledWith("admin", "platform");

    page.updateServerField("displayName", "Renamed Server");
    expect(page.state.server?.displayName).toBe("Renamed Server");
  });

  test("keeps null server guards from calling mutation APIs before load", () => {
    const page = new ServerEditPage(createProps());

    expect(() => {
      page.updateServerField("displayName", "ignored");
      page.submitServerEdit(false);
      page.deleteServer();
    }).not.toThrow();

    expect(page.renderServer()).toBeNull();
    expect(serverBackendMock.updateServer).not.toHaveBeenCalled();
    expect(serverBackendMock.deleteServer).not.toHaveBeenCalled();
  });

  test("keeps edit form field handlers and ToolTable updates wired to server state", () => {
    const page = createPage({mode: "add"});
    jest.spyOn(Setting, "isMobile").mockReturnValue(true);
    const handlers = new Map<unknown, ElementHandler>();
    let toolUpdate: ((value: TestToolRecord[]) => void) | undefined;

    visitReactNode(page.renderServer(), (element) => {
      const props = element.props as ElementProps;
      if (props.onChange !== undefined) {
        handlers.set(props.value, props.onChange);
      }
      if (props.onUpdateTable !== undefined) {
        toolUpdate = props.onUpdateTable;
      }
    });

    handlers.get("engineering")?.("platform");
    handlers.get("server-one")?.({target: {value: "server-two"}});
    handlers.get("Server One")?.({target: {value: "Server Two"}});
    handlers.get("https://server.example.invalid/mcp")?.({target: {value: "https://server-two.example.invalid/mcp"}});
    handlers.get("token-one")?.({target: {value: "token-two"}});
    handlers.get("admin-app")?.("app-two");
    toolUpdate?.([{name: "lookup", description: "Lookup", isAllowed: false}]);

    expect(page.state.server).toEqual(expect.objectContaining({
      owner: "platform",
      name: "server-two",
      displayName: "Server Two",
      url: "https://server-two.example.invalid/mcp",
      token: "token-two",
      application: "app-two",
      tools: [{name: "lookup", description: "Lookup", isAllowed: false}],
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

  test("saves server edits and keeps the editor open", async() => {
    const history = createHistory();
    const {view} = renderPage({history});

    const displayNameInput = await view.findByDisplayValue("Server One");
    fireEvent.change(displayNameInput, {target: {value: "Server Prime"}});
    fireEvent.click(getButtonByNormalizedText(view.container, "保存"));
    await flushPromises();

    expect(serverBackendMock.updateServer).toHaveBeenCalledWith("engineering", "server-one", expect.objectContaining({
      displayName: "Server Prime",
    }));
    expect(history.push).toHaveBeenCalledWith("/servers/engineering/server-one");
    expect(Setting.showMessage).toHaveBeenCalledWith("success", expect.any(String));
  });

  test("saves and exits to the server list", async() => {
    const history = createHistory();
    const {view} = renderPage({history});

    expect(await view.findByDisplayValue("Server One")).not.toBeNull();
    fireEvent.click(getButtonByNormalizedText(view.container, "保存&退出"));
    await flushPromises();

    expect(serverBackendMock.updateServer).toHaveBeenCalledWith("engineering", "server-one", expect.objectContaining({
      name: "server-one",
    }));
    expect(history.push).toHaveBeenCalledWith("/servers");
  });

  test("cancel in add mode deletes the draft server", async() => {
    const history = createHistory();
    const {view} = renderPage({mode: "add", history});

    expect(await view.findByDisplayValue("Server One")).not.toBeNull();
    fireEvent.click(getButtonByNormalizedText(view.container, "取消"));
    await flushPromises();

    expect(serverBackendMock.deleteServer).toHaveBeenCalledWith(expect.objectContaining({
      name: "server-one",
    }));
    expect(history.push).toHaveBeenCalledWith("/servers");
  });

  test("reports save and delete failures", async() => {
    const page = createPage();
    serverBackendMock.updateServer.mockResolvedValueOnce({status: "error", msg: "save failed"});
    serverBackendMock.updateServer.mockRejectedValueOnce(new Error("save network"));
    serverBackendMock.deleteServer.mockResolvedValueOnce({status: "error", msg: "delete failed"});
    serverBackendMock.deleteServer.mockRejectedValueOnce(new Error("delete network"));

    page.submitServerEdit(false);
    await flushPromises();
    expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("save failed"));

    page.submitServerEdit(false);
    await flushPromises();
    expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("save network"));

    page.deleteServer();
    await flushPromises();
    expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete failed"));

    page.deleteServer();
    await flushPromises();
    expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete network"));
  });
});
