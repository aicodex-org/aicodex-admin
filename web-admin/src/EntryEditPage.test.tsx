import {afterEach, beforeEach, describe, expect, test, vi} from "vitest";
import React from "react";
import {act, cleanup, render} from "@testing-library/react";
import EntryEditPage from "./EntryEditPage";
import * as EntryBackend from "./backend/EntryBackend";
import * as ApplicationBackend from "./backend/ApplicationBackend";
import * as OrganizationBackend from "./backend/OrganizationBackend";
import * as Setting from "./Setting";
import * as fs from "fs";
import * as path from "path";
import {fireEvent} from "@testing-library/react";
import {fileURLToPath} from "url";
const testFileDirectory = path.dirname(fileURLToPath(import.meta.url));

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

vi.mock("./backend/EntryBackend", () => {
  return {
    getEntry: vi.fn(),
    updateEntry: vi.fn(),
    deleteEntry: vi.fn(),
  };
});

vi.mock("./backend/ApplicationBackend", () => {
  return {
    getApplicationsByOrganization: vi.fn(),
  };
});

vi.mock("./backend/OrganizationBackend", () => {
  return {
    getOrganizations: vi.fn(),
  };
});

const entryBackendMock = EntryBackend as unknown as EntryBackendMock;
const applicationBackendMock = ApplicationBackend as unknown as ApplicationBackendMock;
const organizationBackendMock = OrganizationBackend as unknown as OrganizationBackendMock;
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
    push: vi.fn(),
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
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation((message?: unknown, ...args: unknown[]) => {
      throw new Error([message, ...args].map(item => `${item}`).join(" "));
    });
    vi.spyOn(Setting, "showMessage").mockImplementation(() => {});
    vi.spyOn(Setting, "isMobile").mockReturnValue(false);
    vi.spyOn(Setting, "isAdminUser").mockReturnValue(true);
    entryBackendMock.getEntry.mockResolvedValue({status: "ok", data: {...entry}});
    entryBackendMock.updateEntry.mockResolvedValue({status: "ok"});
    entryBackendMock.deleteEntry.mockResolvedValue({status: "ok"});
    organizationBackendMock.getOrganizations.mockResolvedValue({status: "ok", data: [{name: "engineering"}, {name: "platform"}]});
    applicationBackendMock.getApplicationsByOrganization.mockResolvedValue({status: "ok", data: [{name: "admin-app"}]});
  });

  afterEach(() => {
    cleanup();
    consoleErrorSpy.mockRestore();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  test("is migrated from JavaScript to TSX", () => {
    expect(fs.existsSync(path.join(testFileDirectory, "EntryEditPage.tsx"))).toBe(true);
    expect(fs.existsSync(path.join(testFileDirectory, "EntryEditPage.js"))).toBe(false);
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

  test("publishes the entry display name for its workspace tab after loading and display-name edits", async() => {
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");
    const page = createPage();

    page.getEntry();
    await flushPromises();

    const loadedEvent = dispatchSpy.mock.calls.at(-1)?.[0] as CustomEvent | undefined;
    expect(loadedEvent?.type).toBe("aicodex.admin.workspaceTabLabelUpdate");
    expect(loadedEvent?.detail).toEqual({
      path: "/entries/engineering/entry-one",
      label: expect.stringMatching(/Entry One$/),
    });

    const loadDispatchCount = dispatchSpy.mock.calls.length;
    page.updateEntryField("message", "updated message");
    expect(dispatchSpy).toHaveBeenCalledTimes(loadDispatchCount);

    page.updateEntryField("displayName", "   ");
    expect(dispatchSpy).toHaveBeenCalledTimes(loadDispatchCount + 1);
    const fallbackEvent = dispatchSpy.mock.calls.at(-1)?.[0] as CustomEvent | undefined;
    expect(fallbackEvent?.detail).toEqual({
      path: "/entries/engineering/entry-one",
      label: expect.stringMatching(/entry-one$/),
    });
  });

  test("uses scoped Gateway edit layout hooks", () => {
    const page = createPage();
    const view = render(<>{page.render()}</>);

    expect(view.container.querySelector(".admin-gateway-edit-page")).not.toBeNull();
    expect(view.container.querySelector(".admin-gateway-edit-card")).not.toBeNull();
    expect(view.container.querySelectorAll(".admin-gateway-edit-field-row")).toHaveLength(7);
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
    vi.spyOn(Setting, "isMobile").mockReturnValue(true);
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
    vi.spyOn(Setting, "isAdminUser").mockReturnValue(false);
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
