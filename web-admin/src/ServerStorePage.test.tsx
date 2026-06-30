/* eslint-env jest */
import React from "react";
import {act, cleanup, render} from "@testing-library/react";
import {expect, jest} from "@jest/globals";
import i18next from "i18next";
import ServerStorePage from "./ServerStorePage";
import * as ServerBackend from "./backend/ServerBackend";
import * as Setting from "./Setting";
import en from "./locales/en/data.json";
import zh from "./locales/zh/data.json";

type LooseMock = {
  (...args: unknown[]): unknown;
  mockResolvedValue: (value: unknown) => LooseMock;
  mockResolvedValueOnce: (value: unknown) => LooseMock;
  mockRejectedValueOnce: (value: unknown) => LooseMock;
};

type ServerBackendMock = Pick<Record<keyof typeof ServerBackend, LooseMock>, "getOnlineServers" | "addServer">;

interface TestOnlineServer {
  id: string;
  name: string;
  nameText: string;
  tagsRaw: string[];
  tagsLower: string[];
  production: string;
  description: string;
  authentication?: string;
  website?: string;
}

interface StorePageInstance extends React.Component<StorePageProps> {
  state: {
    onlineListLoading: boolean;
    onlineServerList: TestOnlineServer[];
    creatingOnlineServerId: string;
    onlineNameFilter: string;
    onlineTagFilter: string[];
  };
  fetchOnlineServers: () => void;
  getOnlineServerName: (onlineServer: Partial<TestOnlineServer>) => string;
  createServerFromOnline: (onlineServer: Partial<TestOnlineServer>) => void;
  normalizeOnlineServers: (servers: unknown[]) => TestOnlineServer[];
  getOnlineServersFromResponse: (data: unknown) => unknown[];
  getOnlineTagOptions: () => Array<{label: string; value: string}>;
  getFilteredOnlineServers: () => TestOnlineServer[];
  renderServerCard: (server: TestOnlineServer) => React.ReactNode;
}

interface StorePageProps {
  account: {owner: string; tag?: string};
  history: {push: (...args: unknown[]) => void};
}

type ElementHandler = (...args: unknown[]) => void;

interface ElementProps {
  children?: React.ReactNode;
  onChange?: ElementHandler;
  placeholder?: unknown;
}

jest.mock("./backend/ServerBackend", () => {
  const {jest: factoryJest} = require("@jest/globals");
  return {
    getOnlineServers: factoryJest.fn(),
    addServer: factoryJest.fn(),
  };
});

const serverBackendMock = ServerBackend as unknown as ServerBackendMock;
const fs = require("fs") as {existsSync: (filePath: string) => boolean; readFileSync: (filePath: string, encoding: string) => string};
const path = require("path") as {join: (...parts: string[]) => string};
const {fireEvent} = require("@testing-library/react") as {
  fireEvent: {
    click: (element: Element | null) => boolean;
  };
};
let consoleErrorSpy: {mockRestore: () => void};

const account = {owner: "admin", tag: ""};
const rawOnlineServers = [
  {
    id: "Alpha MCP",
    name: "Alpha MCP",
    description: "Alpha tools",
    tags: ["Search", "AI"],
    endpoints: {production: "https://alpha.example.invalid/mcp"},
    authentication: {type: "oauth"},
    maintainer: {website: "alpha.example.invalid"},
  },
  {
    id: "Beta MCP",
    name: "Beta MCP",
    description: "Beta tools",
    tags: ["Storage"],
    endpoints: {production: "https://beta.example.invalid/mcp"},
    authentication: {type: "none"},
  },
  {
    id: "No Production",
    name: "No Production",
    description: "Hidden tools",
    tags: ["Hidden"],
    endpoints: {production: ""},
  },
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

function createHistory() {
  return {
    push: jest.fn(),
  };
}

function installSynchronousSetState(page: StorePageInstance) {
  page.setState = ((stateUpdate: unknown, callback?: () => void) => {
    const patch = typeof stateUpdate === "function" ? stateUpdate(page.state, page.props) : stateUpdate;
    page.state = {
      ...page.state,
      ...(patch as Record<string, unknown>),
    };
    callback?.();
  }) as typeof page.setState;
}

function createPage(history = createHistory()) {
  const page = new ServerStorePage({account, history}) as StorePageInstance;
  installSynchronousSetState(page);
  return {history, page};
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
  Object.values(node.props as Record<string, unknown>).forEach((propValue) => {
    visitReactNode(propValue as React.ReactNode, visitor);
  });
}

async function flushPromises() {
  await act(async() => {
    await Promise.resolve();
  });
}

describe("ServerStorePage", () => {
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
    jest.spyOn(Setting, "getRequestOrganization").mockReturnValue("engineering");
    jest.spyOn(Setting, "getRandomName").mockReturnValue("fallback");
    serverBackendMock.getOnlineServers.mockResolvedValue({status: "ok", data: {servers: rawOnlineServers}});
    serverBackendMock.addServer.mockResolvedValue({status: "ok"});
  });

  afterEach(() => {
    cleanup();
    consoleErrorSpy.mockRestore();
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  test("is migrated from JavaScript to TSX", () => {
    expect(fs.existsSync(path.join(__dirname, "ServerStorePage.tsx"))).toBe(true);
    expect(fs.existsSync(path.join(__dirname, "ServerStorePage.js"))).toBe(false);
  });

  test("renders online MCP servers through the existing store API", async() => {
    const view = render(<ServerStorePage account={account} history={createHistory()} />);

    expect(await view.findByText("Alpha MCP")).not.toBeNull();
    expect(view.getByText("MCP Store")).not.toBeNull();
    expect(view.container.querySelector(".admin-page-scroll-shell.server-store-page")).not.toBeNull();
    expect(view.container.querySelector(".server-store-page-header-shell .server-store-page-toolbar")).not.toBeNull();
    expect(view.container.querySelector(".server-store-page-body")).not.toBeNull();
    expect(view.container.querySelector(".server-store-page-card")).not.toBeNull();
    expect(view.container.querySelector(".server-store-page-card-add")).not.toBeNull();
    expect(view.container.querySelector(".server-store-page-card-description")).not.toBeNull();
    expect(view.container.querySelector(".server-store-page-card-tags")).not.toBeNull();
    expect(view.getByText("Alpha tools")).not.toBeNull();
    expect(view.getByText("oauth")).not.toBeNull();
    expect(view.getByText("alpha.example.invalid")).not.toBeNull();
    expect(view.queryByText("No Production")).toBeNull();
    expect(serverBackendMock.getOnlineServers).toHaveBeenCalled();
  });

  test("uses shared shell tokens instead of page-local dark surfaces", () => {
    const appLess = fs.readFileSync(path.join(__dirname, "App.less"), "utf8");
    const pageBlock = appLess.match(/\.server-store-page \{([\s\S]*?)\}/)?.[1] ?? "";
    const headerBlock = appLess.match(/\.server-store-page-header-shell \{([\s\S]*?)\}/)?.[1] ?? "";
    const toolbarBlock = appLess.match(/\.server-store-page-toolbar \{([\s\S]*?)\}/)?.[1] ?? "";
    const bodyBlock = appLess.match(/\.server-store-page-body \{([\s\S]*?)\}/)?.[1] ?? "";
    const cardBlock = appLess.match(/\.server-store-page-card\.ant-card \{([\s\S]*?)\}/)?.[1] ?? "";

    expect(pageBlock).not.toContain("padding:");
    expect(headerBlock).toContain("background: transparent");
    expect(toolbarBlock).toContain("background: var(--admin-shell-surface-bg");
    expect(bodyBlock).toContain("background: transparent");
    expect(cardBlock).toContain("background: var(--admin-shell-surface-bg");
    expect(appLess).toMatch(/\.server-store-page-card > \.ant-card-head \{[\s\S]*background-color:\s*var\(--admin-shell-surface-emphasis-bg/);
    expect(appLess).toMatch(/\.server-store-page-card-add\.ant-btn-primary \{[\s\S]*background:\s*var\(--admin-shell-info-bg/);
    expect(appLess).toMatch(/\.server-store-page \.ant-input,[\s\S]*\.server-store-page \.ant-select \.ant-select-selector \{[\s\S]*background:\s*var\(--admin-shell-surface-soft-bg/);
    expect(appLess).toMatch(/\.server-store-page \.ant-btn-default \{[\s\S]*background:\s*var\(--admin-shell-surface-soft-bg/);
    expect(appLess).toMatch(/\.server-store-page-card \.ant-tag \{[\s\S]*background:\s*var\(--admin-shell-surface-bg/);
  });

  test("normalizes response shapes, filters unusable endpoints, and exposes tag options", () => {
    const {page} = createPage();

    expect(page.getOnlineServersFromResponse({servers: rawOnlineServers})).toEqual(rawOnlineServers);
    expect(page.getOnlineServersFromResponse(rawOnlineServers)).toEqual(rawOnlineServers);
    expect(page.getOnlineServersFromResponse({data: rawOnlineServers})).toEqual(rawOnlineServers);
    expect(page.getOnlineServersFromResponse({items: rawOnlineServers})).toEqual([]);

    page.state = {
      ...page.state,
      onlineServerList: page.normalizeOnlineServers(rawOnlineServers),
    };

    expect(page.state.onlineServerList.map(server => server.name)).toEqual(["Alpha MCP", "Beta MCP"]);
    expect(page.getOnlineTagOptions()).toEqual([
      {label: "AI", value: "ai"},
      {label: "Search", value: "search"},
      {label: "Storage", value: "storage"},
    ]);
  });

  test("filters online servers by name and tag without changing backend data", () => {
    const {page} = createPage();
    page.state = {
      ...page.state,
      onlineServerList: page.normalizeOnlineServers(rawOnlineServers),
      onlineNameFilter: "alpha",
      onlineTagFilter: [],
    };

    expect(page.getFilteredOnlineServers().map(server => server.name)).toEqual(["Alpha MCP"]);

    page.state = {
      ...page.state,
      onlineNameFilter: "",
      onlineTagFilter: ["storage"],
    };

    expect(page.getFilteredOnlineServers().map(server => server.name)).toEqual(["Beta MCP"]);
  });

  test("refreshes the catalog and reports load failures", async() => {
    const {page} = createPage();
    serverBackendMock.getOnlineServers.mockResolvedValueOnce({status: "ok", data: {servers: rawOnlineServers}});

    page.fetchOnlineServers();
    await flushPromises();

    expect(page.state.onlineListLoading).toBe(false);
    expect(page.state.onlineServerList.map(server => server.name)).toEqual(["Alpha MCP", "Beta MCP"]);
    expect(page.state.onlineNameFilter).toBe("");
    expect(page.state.onlineTagFilter).toEqual([]);

    serverBackendMock.getOnlineServers.mockResolvedValueOnce({status: "error", msg: "store failed"});
    page.fetchOnlineServers();
    await flushPromises();
    expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("store failed"));

    serverBackendMock.getOnlineServers.mockRejectedValueOnce(new Error("network failed"));
    page.fetchOnlineServers();
    await flushPromises();
    expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("network failed"));
  });

  test("creates local MCP servers from online catalog entries", async() => {
    const history = createHistory();
    const {page} = createPage(history);
    const server = page.normalizeOnlineServers(rawOnlineServers)[0];

    page.createServerFromOnline(server);
    await flushPromises();

    expect(serverBackendMock.addServer).toHaveBeenCalledWith(expect.objectContaining({
      owner: "engineering",
      name: "alpha_mcp",
      displayName: "Alpha MCP",
      url: "https://alpha.example.invalid/mcp",
      application: "",
    }));
    expect(history.push).toHaveBeenCalledWith({pathname: "/servers/engineering/alpha_mcp", mode: "add"});
    expect(Setting.showMessage).toHaveBeenCalledWith("success", expect.any(String));
    expect(page.state.creatingOnlineServerId).toBe("");
  });

  test("keeps create failure behavior and production endpoint guard", async() => {
    const {page} = createPage();
    const server = page.normalizeOnlineServers(rawOnlineServers)[0];

    page.createServerFromOnline({...server, production: ""});
    expect(serverBackendMock.addServer).not.toHaveBeenCalled();
    expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.any(String));

    serverBackendMock.addServer.mockResolvedValueOnce({status: "error", msg: "add failed"});
    page.createServerFromOnline(server);
    await flushPromises();
    expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("add failed"));

    serverBackendMock.addServer.mockRejectedValueOnce(new Error("add network"));
    page.createServerFromOnline(server);
    await flushPromises();
    expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("add network"));
  });

  test("keeps toolbar actions wired", async() => {
    const view = render(<ServerStorePage account={account} history={createHistory()} />);

    expect(await view.findByText("Alpha MCP")).not.toBeNull();
    fireEvent.click(getButtonByNormalizedText(view.container, "清空"));
    fireEvent.click(getButtonByNormalizedText(view.container, "Refresh"));

    expect(serverBackendMock.getOnlineServers).toHaveBeenCalledTimes(2);
  });

  test("keeps filter field handlers and card add action wired", () => {
    const {page} = createPage();
    const server = page.normalizeOnlineServers(rawOnlineServers)[0];
    page.state = {
      ...page.state,
      onlineServerList: [server],
    };
    const handlers = new Map<unknown, ElementHandler>();

    visitReactNode(page.render(), (element) => {
      const props = element.props as ElementProps;
      if (props.onChange !== undefined) {
        handlers.set(props.placeholder, props.onChange);
      }
    });

    handlers.get("名称")?.({target: {value: "alpha"}});
    handlers.get("Tag")?.(["search"]);

    expect(page.state.onlineNameFilter).toBe("alpha");
    expect(page.state.onlineTagFilter).toEqual(["search"]);

    jest.spyOn(page, "createServerFromOnline").mockImplementation(() => {});
    const cardView = render(<>{page.renderServerCard(server)}</>);
    fireEvent.click(getButtonByNormalizedText(cardView.container, "添加"));
    expect(page.createServerFromOnline).toHaveBeenCalledWith(server);
  });

  test("renders loading and empty states", () => {
    const {page} = createPage();
    page.state = {
      ...page.state,
      onlineListLoading: true,
      onlineServerList: [],
    };
    const loadingView = render(<>{page.render()}</>);
    expect(loadingView.container.querySelector(".ant-spin")).not.toBeNull();
    loadingView.unmount();

    page.state = {
      ...page.state,
      onlineListLoading: false,
      onlineServerList: [],
    };
    const emptyView = render(<>{page.render()}</>);
    expect(emptyView.getAllByText("No data").length).toBeGreaterThan(0);
  });

  test("normalizes server names and falls back to random names", () => {
    const {page} = createPage();

    expect(page.getOnlineServerName({id: "Alpha MCP/server"})).toBe("alpha_mcp_server");
    expect(page.getOnlineServerName({id: "!!!"})).toBe("server_fallback");
    expect(page.getOnlineServerName({})).toBe("server_fallback");
  });

  test("keeps fallback rendering for sparse catalog entries", () => {
    const {page} = createPage();
    const fallbackServer = page.normalizeOnlineServers([
      {
        endpoints: {production: "https://fallback.example.invalid/mcp"},
      },
    ])[0];

    expect(fallbackServer).toEqual(expect.objectContaining({
      id: "server-0",
      name: "",
      nameText: "",
      tagsRaw: [],
      tagsLower: [],
      production: "https://fallback.example.invalid/mcp",
      description: "",
      authentication: undefined,
      website: undefined,
    }));

    const cardView = render(<>{page.renderServerCard({...fallbackServer, tagsRaw: undefined as unknown as string[]})}</>);
    expect(cardView.getAllByText("-").length).toBeGreaterThan(0);
  });
});
