/* eslint-env jest */
import React from "react";
import {act, cleanup, render} from "@testing-library/react";
import {expect, jest} from "@jest/globals";
import EntryEditPage from "./EntryEditPage";
import * as EntryBackend from "./backend/EntryBackend";
import * as ApplicationBackend from "./backend/ApplicationBackend";
import * as OrganizationBackend from "./backend/OrganizationBackend";
import * as Setting from "./Setting";

type LooseMock = {
  (...args: unknown[]): unknown;
  mockResolvedValue: (value: unknown) => LooseMock;
  mockResolvedValueOnce: (value: unknown) => LooseMock;
  mockRejectedValueOnce: (value: unknown) => LooseMock;
};

type EntryBackendMock = Pick<Record<keyof typeof EntryBackend, LooseMock>, "getEntry" | "updateEntry" | "deleteEntry">;
type ApplicationBackendMock = Pick<Record<keyof typeof ApplicationBackend, LooseMock>, "getApplicationsByOrganization">;
type OrganizationBackendMock = Pick<Record<keyof typeof OrganizationBackend, LooseMock>, "getOrganizations">;

interface TestEntryRecord {
  owner: string;
  name: string;
  displayName: string;
  url: string;
  token: string;
  application: string;
  message: string;
}

type ElementHandler = (...args: unknown[]) => void;

interface ElementProps {
  children?: React.ReactNode;
  onChange?: ElementHandler;
  value?: unknown;
}

jest.mock("./backend/EntryBackend", () => {
  const {jest: factoryJest} = require("@jest/globals");
  return {
    getEntry: factoryJest.fn(),
    updateEntry: factoryJest.fn(),
    deleteEntry: factoryJest.fn(),
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

const entryBackendMock = EntryBackend as unknown as EntryBackendMock;
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
const entry: TestEntryRecord = {
  owner: "engineering",
  name: "entry-one",
  displayName: "Entry One",
  url: "https://entry.example.invalid/listen",
  token: "token-one",
  application: "admin-app",
  message: "hello",
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
    match: {params: {organizationName: "engineering", entryName: "entry-one"}},
  };
}

function createPage(options: {mode?: string; entryOverride?: Partial<TestEntryRecord>} = {}) {
  const page = new EntryEditPage(createProps({mode: options.mode}));
  page.setState = ((stateUpdate: unknown, callback?: () => void) => {
    const nextState = typeof stateUpdate === "function"
      ? (stateUpdate as (state: unknown, props: unknown) => unknown)(page.state, page.props)
      : stateUpdate;
    page.state = {...page.state, ...(nextState as Record<string, unknown>)};
    callback?.();
  }) as typeof page.setState;
  page.state = {
    ...page.state,
    entry: {
      ...entry,
      ...options.entryOverride,
    },
    organizations: [{name: "engineering"}, {name: "platform"}],
    applications: [{name: "admin-app"}],
  };
  return page;
}

function renderPage(options: {mode?: string; history?: ReturnType<typeof createHistory>} = {}) {
  const history = options.history ?? createHistory();
  const view = render(
    <EntryEditPage {...createProps({mode: options.mode, history})} />
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

describe("EntryEditPage", () => {
  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation((message?: unknown, ...args: unknown[]) => {
      if (`${message}`.includes("ReactDOM.render is no longer supported")) {
        return;
      }

      throw new Error([message, ...args].map(item => `${item}`).join(" "));
    });
    jest.spyOn(Setting, "showMessage").mockImplementation(() => {});
    jest.spyOn(Setting, "isMobile").mockReturnValue(false);
    jest.spyOn(Setting, "isAdminUser").mockReturnValue(true);
    entryBackendMock.getEntry.mockResolvedValue({status: "ok", data: {...entry}});
    entryBackendMock.updateEntry.mockResolvedValue({status: "ok"});
    entryBackendMock.deleteEntry.mockResolvedValue({status: "ok"});
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
    expect(fs.existsSync(path.join(__dirname, "EntryEditPage.tsx"))).toBe(true);
    expect(fs.existsSync(path.join(__dirname, "EntryEditPage.js"))).toBe(false);
  });

  test("loads entry data and renders editable fields", async() => {
    const {view} = renderPage();

    expect(await view.findByDisplayValue("Entry One")).not.toBeNull();
    expect(view.getByDisplayValue("entry-one")).not.toBeNull();
    expect(view.getByDisplayValue("https://entry.example.invalid/listen")).not.toBeNull();
    expect(view.getByDisplayValue("hello")).not.toBeNull();
    expect(entryBackendMock.getEntry).toHaveBeenCalledWith("engineering", "entry-one");
    expect(organizationBackendMock.getOrganizations).toHaveBeenCalledWith("admin");
    expect(applicationBackendMock.getApplicationsByOrganization).toHaveBeenCalledWith("admin", "engineering");
  });

  test("redirects to 404 for missing entries and reports load failures", async() => {
    entryBackendMock.getEntry.mockResolvedValueOnce({status: "ok", data: null});
    const first = renderPage();
    await flushPromises();
    expect(first.history.push).toHaveBeenCalledWith("/404");

    cleanup();
    entryBackendMock.getEntry.mockResolvedValueOnce({status: "error", msg: "load failed", data: {}});
    renderPage();
    await flushPromises();
    expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("load failed"));
  });

  test("updates owner-dependent fields and reloads application choices", () => {
    const page = createPage();

    page.updateEntryField("owner", "platform");

    expect(page.state.entry?.owner).toBe("platform");
    expect(page.state.entry?.application).toBe("");
    expect(applicationBackendMock.getApplicationsByOrganization).toHaveBeenCalledWith("admin", "platform");

    page.updateEntryField("displayName", "Renamed Entry");
    expect(page.state.entry?.displayName).toBe("Renamed Entry");
  });

  test("keeps null entry guards from calling mutation APIs before load", () => {
    const page = new EntryEditPage(createProps());

    page.updateEntryField("displayName", "ignored");
    page.submitEntryEdit(false);
    page.deleteEntry();

    expect(page.renderEntry()).toBeNull();
    expect(entryBackendMock.updateEntry).not.toHaveBeenCalled();
    expect(entryBackendMock.deleteEntry).not.toHaveBeenCalled();
  });

  test("keeps edit form field handlers wired to entry state", () => {
    const page = createPage({mode: "add"});
    jest.spyOn(Setting, "isMobile").mockReturnValue(true);
    const handlers = new Map<unknown, ElementHandler>();

    visitReactNode(page.renderEntry(), (element) => {
      const props = element.props as ElementProps;
      if (props.onChange !== undefined) {
        handlers.set(props.value, props.onChange);
      }
    });

    handlers.get("engineering")?.("platform");
    handlers.get("entry-one")?.({target: {value: "entry-two"}});
    handlers.get("Entry One")?.({target: {value: "Entry Two"}});
    handlers.get("https://entry.example.invalid/listen")?.({target: {value: "https://entry-two.example.invalid/listen"}});
    handlers.get("token-one")?.({target: {value: "token-two"}});
    handlers.get("admin-app")?.("app-two");
    handlers.get("hello")?.({target: {value: "updated message"}});

    expect(page.state.entry).toEqual(expect.objectContaining({
      owner: "platform",
      name: "entry-two",
      displayName: "Entry Two",
      url: "https://entry-two.example.invalid/listen",
      token: "token-two",
      application: "app-two",
      message: "updated message",
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

  test("saves entry edits and keeps the editor open", async() => {
    const history = createHistory();
    const {view} = renderPage({history});

    const displayNameInput = await view.findByDisplayValue("Entry One");
    fireEvent.change(displayNameInput, {target: {value: "Entry Prime"}});
    fireEvent.click(getButtonByNormalizedText(view.container, "保存"));
    await flushPromises();

    expect(entryBackendMock.updateEntry).toHaveBeenCalledWith("engineering", "entry-one", expect.objectContaining({
      displayName: "Entry Prime",
    }));
    expect(history.push).toHaveBeenCalledWith("/entries/engineering/entry-one");
    expect(Setting.showMessage).toHaveBeenCalledWith("success", expect.any(String));
  });

  test("saves and exits to the entry list", async() => {
    const history = createHistory();
    const {view} = renderPage({history});

    expect(await view.findByDisplayValue("Entry One")).not.toBeNull();
    fireEvent.click(getButtonByNormalizedText(view.container, "保存&退出"));
    await flushPromises();

    expect(entryBackendMock.updateEntry).toHaveBeenCalledWith("engineering", "entry-one", expect.objectContaining({
      name: "entry-one",
    }));
    expect(history.push).toHaveBeenCalledWith("/entries");
  });

  test("cancel in add mode deletes the draft entry", async() => {
    const history = createHistory();
    const {view} = renderPage({mode: "add", history});

    expect(await view.findByDisplayValue("Entry One")).not.toBeNull();
    fireEvent.click(getButtonByNormalizedText(view.container, "取消"));
    await flushPromises();

    expect(entryBackendMock.deleteEntry).toHaveBeenCalledWith(expect.objectContaining({
      name: "entry-one",
    }));
    expect(history.push).toHaveBeenCalledWith("/entries");
  });

  test("reports save and delete failures", async() => {
    const page = createPage();
    entryBackendMock.updateEntry.mockResolvedValueOnce({status: "error", msg: "save failed"});
    entryBackendMock.updateEntry.mockRejectedValueOnce(new Error("save network"));
    entryBackendMock.deleteEntry.mockResolvedValueOnce({status: "error", msg: "delete failed"});
    entryBackendMock.deleteEntry.mockRejectedValueOnce(new Error("delete network"));

    page.submitEntryEdit(false);
    await flushPromises();
    expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("save failed"));

    page.submitEntryEdit(false);
    await flushPromises();
    expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("save network"));

    page.deleteEntry();
    await flushPromises();
    expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete failed"));

    page.deleteEntry();
    await flushPromises();
    expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete network"));
  });
});
