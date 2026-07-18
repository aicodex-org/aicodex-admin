import {afterEach, beforeEach, expect, test, vi} from "vitest";
import React from "react";
import {Button, Input, InputNumber, Radio, Select, Switch} from "antd";
import {cleanup, render} from "@testing-library/react";
import i18next from "i18next";
import "./i18n";
import SyncerEditPage from "./SyncerEditPage";
import * as SyncerBackend from "./backend/SyncerBackend";
import * as Setting from "./Setting";
import en from "./locales/en/data.json";
import zh from "./locales/zh/data.json";
import {fireEvent} from "@testing-library/react";

type PageHarness = SyncerEditPage & {
  state: any;
  props: any;
  renderSyncer: () => React.ReactNode;
  renderSyncerForm: () => React.ReactNode;
  renderOrganizationOptions: () => React.ReactNode;
  renderEditFooter: () => React.ReactNode;
  handleBack: () => void;
  getCerts: (owner: string) => void;
  getSyncer: () => void;
  submitSyncerEdit: (exitAfterSave: boolean) => void;
  updateSyncerTlsPolicy: (value: "system" | "custom-ca" | "legacy-insecure") => void;
};

vi.mock("./common/Editor", () => ({default: function EditorMock() {
  return <pre data-testid="syncer-error-editor" />;
}}));

vi.mock("./table/SyncerTableColumnTable", () => ({default: function SyncerTableColumnTableMock(props: {onUpdateTable: (value: unknown[]) => void}) {
  return <button data-testid="syncer-table-columns" onClick={() => props.onUpdateTable([{name: "id"}])}>Update columns</button>;
}}));

const baseSyncer = {
  owner: "admin",
  organization: "engineering",
  name: "directory-main",
  type: "Database",
  databaseType: "mysql",
  sslMode: "",
  host: "db.example.test",
  port: 3306,
  user: "syncer",
  password: "secret",
  database: "identity",
  table: "users",
  tableColumns: [],
  affiliationTable: "departments",
  avatarBaseUrl: "https://assets.example.test/avatars/",
  syncInterval: 60,
  errorText: "",
  isReadOnly: false,
  isEnabled: true,
  sshType: "",
  sshHost: "ssh.example.test",
  sshPort: 22,
  sshUser: "ssh-user",
  sshPassword: "ssh-secret",
  cert: "syncer-cert",
};

async function useTestLanguage(language: string): Promise<void> {
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

async function flushPromises(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 0));
}

function collectElementsByType(node: React.ReactNode, type: React.ElementType): React.ReactElement[] {
  if (!React.isValidElement(node)) {
    return [];
  }

  const current = node.type === type ? [node] : [];
  const children = (node.props as {children?: React.ReactNode}).children;
  React.Children.forEach(children, child => current.push(...collectElementsByType(child, type)));
  return current;
}

function findElementByValue(node: React.ReactNode, type: React.ElementType, value: unknown): React.ReactElement<any> {
  const element = collectElementsByType(node, type)
    .find(candidate => (candidate.props as {value?: unknown}).value === value);
  expect(element).toBeDefined();
  return element as React.ReactElement<any>;
}

function createPage(options: {mode?: "add" | "edit"; syncer?: Record<string, unknown>; locationSyncer?: Record<string, unknown>} = {}): PageHarness {
  const page = new SyncerEditPage({
    match: {params: {syncerName: "directory-main"}},
    location: {mode: options.mode, syncer: options.locationSyncer},
    history: {push: vi.fn()},
    account: {owner: "engineering", name: "admin", isAdmin: true},
  } as any) as unknown as PageHarness;

  page.state = {
    ...page.state,
    syncer: {...baseSyncer, ...options.syncer},
    organizations: [
      {name: "engineering", displayName: "Engineering"},
      {name: "platform", displayName: "Platform"},
    ],
    certs: [{name: "syncer-cert", type: "SSL"}],
    mode: options.mode ?? "edit",
  };
  page.setState = ((patch: any, callback?: () => void) => {
    const nextState = typeof patch === "function" ? patch(page.state, page.props) : patch;
    page.state = {...page.state, ...nextState};
    callback?.();
  }) as typeof page.setState;
  return page;
}

beforeEach(async() => {
  await useTestLanguage("en");
  window.location.hash = "";
  vi.spyOn(Setting, "isMobile").mockReturnValue(false);
  vi.spyOn(Setting, "isAdminUser").mockReturnValue(true);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

test("renders Syncer in the shared tabbed edit shell without duplicate legacy actions", () => {
  const page = createPage();
  const view = render(<>{page.renderSyncer()}</>);

  expect(view.container.querySelector(".syncer-edit-shell")).not.toBeNull();
  expect(view.container.querySelector(".syncer-edit-header")).not.toBeNull();
  expect(view.container.querySelector(".syncer-edit-tabs")).not.toBeNull();
  expect(view.container.querySelector(".syncer-edit-scroll-content")).not.toBeNull();
  expect(view.container.querySelector(".syncer-edit-action-bar")).not.toBeNull();
  expect(view.container.querySelector(".syncer-edit-card .ant-card-head")).toBeNull();
  expect(view.getByText("Identity Source Center / Syncers /")).not.toBeNull();
  expect(view.getByText("Edit Syncer (directory-main)")).not.toBeNull();
  expect(view.getAllByText("Basic information")).toHaveLength(2);
  expect(view.getByText("Connection configuration")).not.toBeNull();
  expect(view.getByText("Mapping and status")).not.toBeNull();
  expect(view.container.querySelector(".syncer-edit-tab-panel-basic")).not.toBeNull();
  expect(view.container.querySelector(".syncer-edit-section-title")?.textContent).toBe("Basic information");
  expect(view.container.querySelector(".syncer-edit-tab-panel-connection")).toBeNull();
  expect(view.container.querySelector(".syncer-edit-tab-panel-mapping-status")).toBeNull();

  const actionButtons = Array.from(view.container.querySelectorAll(".syncer-edit-action-bar button")) as HTMLButtonElement[];
  expect(actionButtons.map(button => button.textContent)).toEqual(["Cancel", "Save", "Save and return"]);
  expect(view.queryByText("Save & Exit")).toBeNull();
});

test("restores known tab hashes, updates the hash on tab changes, and falls back from unknown hashes", () => {
  window.location.hash = "#connection";
  const connectionPage = createPage();
  const connectionView = render(<>{connectionPage.renderSyncer()}</>);

  expect(connectionPage.state.activeTabKey).toBe("connection");
  expect(connectionView.container.querySelector(".syncer-edit-tab-panel-connection")).not.toBeNull();
  expect(connectionView.container.querySelector(".syncer-edit-section-title")?.textContent).toBe("Connection configuration");
  fireEvent.click(connectionView.getByText("Mapping and status"));
  expect(connectionPage.state.activeTabKey).toBe("mapping-status");
  expect(window.location.hash).toBe("#mapping-status");

  connectionView.unmount();
  window.location.hash = "#not-a-syncer-tab";
  const fallbackPage = createPage();
  expect(fallbackPage.state.activeTabKey).toBe("basic");
});

test("uses a lightweight empty state for missing error information and keeps real errors readable", () => {
  const emptyPage = createPage();
  emptyPage.state.activeTabKey = "mapping-status";
  const emptyView = render(<>{emptyPage.renderSyncer()}</>);

  expect(emptyView.container.querySelector(".syncer-edit-error-empty")).not.toBeNull();
  expect(emptyView.queryByTestId("syncer-error-editor")).toBeNull();

  emptyView.unmount();
  const errorPage = createPage({syncer: {errorText: "connection refused"}});
  errorPage.state.activeTabKey = "mapping-status";
  const errorView = render(<>{errorPage.renderSyncer()}</>);
  expect(errorView.queryByTestId("syncer-error-editor")).not.toBeNull();
});

test("keeps shell actions wired to navigation and save semantics", () => {
  const editPage = createPage();
  const submitSyncerEdit = vi.spyOn(editPage, "submitSyncerEdit").mockImplementation(() => undefined);
  const editView = render(<>{editPage.renderSyncer()}</>);

  fireEvent.click(editView.getByText("Back"));
  fireEvent.click(editView.getByText("Cancel"));
  fireEvent.click(editView.getByText("Save"));
  fireEvent.click(editView.getByText("Save and return"));

  expect(editPage.props.history.push).toHaveBeenNthCalledWith(1, "/syncers");
  expect(editPage.props.history.push).toHaveBeenNthCalledWith(2, "/syncers");
  expect(submitSyncerEdit).toHaveBeenNthCalledWith(1, false);
  expect(submitSyncerEdit).toHaveBeenNthCalledWith(2, true);

  editView.unmount();
  const addPage = createPage({mode: "add"});
  const addView = render(<>{addPage.renderSyncer()}</>);
  fireEvent.click(addView.getByText("Cancel"));
  expect(addPage.props.history.push).toHaveBeenCalledWith("/syncers");
});

test("renders searchable organization display names while keeping identifiers as values", () => {
  const page = createPage();
  const getCerts = vi.spyOn(page, "getCerts").mockImplementation(() => undefined);
  page.state.syncer.cert = "old-cert";
  const options = React.Children.toArray(page.renderOrganizationOptions()) as Array<React.ReactElement<any>>;
  const select = collectElementsByType(page.renderSyncer(), Select)
    .find(element => (element.props as {value?: unknown}).value === "engineering");

  expect(options.map(option => option.props.value)).toEqual(["engineering", "platform"]);
  expect(options.map(option => option.props.label)).toEqual(["Engineering", "Platform"]);
  expect(select).toBeDefined();
  const selectProps = select?.props as {
    filterOption?: (input: string, option?: {label?: string; value?: string}) => boolean;
    onChange?: (value: string) => void;
  };
  const filterOption = selectProps.filterOption;
  expect(filterOption?.("engine", {label: "Engineering", value: "engineering"})).toBe(true);
  expect(filterOption?.("platform", {label: "Platform", value: "platform"})).toBe(true);
  expect(filterOption?.("missing", undefined)).toBe(false);
  selectProps.onChange?.("platform");
  expect(page.state.syncer).toEqual(expect.objectContaining({organization: "platform", cert: ""}));
  expect(getCerts).toHaveBeenCalledWith("platform");
});

test("keeps type switching defaults and never tests a connection automatically", () => {
  const page = createPage();
  const testSyncerDb = vi.spyOn(SyncerBackend, "testSyncerDb");
  const typeSelect = collectElementsByType(page.renderSyncer(), Select)
    .find(element => (element.props as {value?: unknown}).value === "Database");

  (typeSelect?.props as {onChange: (value: string) => void}).onChange("Keycloak");

  expect(page.state.syncer.type).toBe("Keycloak");
  expect(page.state.syncer.table).toBe("user_entity");
  expect(page.state.syncer.tableColumns.length).toBeGreaterThan(0);
  expect(testSyncerDb).not.toHaveBeenCalled();
});

test("loads an add-mode draft from navigation state without reading or writing the backend", () => {
  const draft = {...baseSyncer, name: "directory-draft", type: "Active Directory", tlsPolicy: undefined};
  const page = createPage({mode: "add", locationSyncer: draft});
  const getSyncer = vi.spyOn(SyncerBackend, "getSyncer");
  const addSyncer = vi.spyOn(SyncerBackend, "addSyncer");
  const getCerts = vi.spyOn(page, "getCerts").mockImplementation(() => undefined);

  page.getSyncer();

  expect(page.state.syncer).toEqual({...draft, tlsPolicy: "system"});
  expect(getCerts).toHaveBeenCalledWith("engineering");
  expect(getSyncer).not.toHaveBeenCalled();
  expect(addSyncer).not.toHaveBeenCalled();
});

test("normalizes loaded Active Directory absence to legacy_unmigrated without changing other Syncers", async() => {
  const activeDirectory = createPage();
  vi.spyOn(SyncerBackend, "getSyncer").mockResolvedValueOnce({
    status: "ok",
    data: {...baseSyncer, type: "Active Directory", tlsPolicy: undefined},
  } as any);
  vi.spyOn(activeDirectory, "getCerts").mockImplementation(() => undefined);
  activeDirectory.getSyncer();
  await flushPromises();
  expect(activeDirectory.state.syncer.tlsPolicy).toBe("");

  const database = createPage();
  vi.spyOn(SyncerBackend, "getSyncer").mockResolvedValueOnce({status: "ok", data: {...baseSyncer}} as any);
  vi.spyOn(database, "getCerts").mockImplementation(() => undefined);
  database.getSyncer();
  await flushPromises();
  expect(database.state.syncer.tlsPolicy).toBeUndefined();
});

([
  ["Active Directory", true],
  ["Database", false],
  ["Azure AD", false],
] as Array<[string, boolean]>).forEach(([type, visible]) => {
  test(`shows enterprise TLS controls for ${type}: ${visible}`, () => {
    const page = createPage({syncer: {type, tlsPolicy: "system"}});
    page.state.activeTabKey = "connection";
    const view = render(<>{page.renderSyncerForm()}</>);

    expect(view.queryByText("TLS policy") !== null).toBe(visible);
  });
});

test("keeps legacy Active Directory policy empty on unrelated save", async() => {
  const page = createPage({syncer: {type: "Active Directory", tlsPolicy: "", cert: ""}});
  const updateSyncer = vi.spyOn(SyncerBackend, "updateSyncer").mockResolvedValue({status: "ok"} as any);
  vi.spyOn(Setting, "showMessage").mockImplementation(() => undefined);

  page.submitSyncerEdit(false);
  await flushPromises();

  expect(updateSyncer).toHaveBeenCalledWith("admin", "directory-main", expect.objectContaining({tlsPolicy: ""}));
});

([
  [{tlsPolicy: "future-mode", cert: ""}, "supported TLS policy"],
  [{tlsPolicy: "custom-ca", cert: ""}, "SSL certificate"],
  [{tlsPolicy: "custom-ca", cert: "missing-ca"}, "unavailable"],
  [{tlsPolicy: "legacy-insecure", cert: "syncer-cert"}, "Clear the custom CA certificate"],
] as Array<[Record<string, unknown>, string]>).forEach(([tlsConfig, message]) => {
  test(`blocks invalid Syncer TLS policy: ${String(tlsConfig.tlsPolicy)}/${String(tlsConfig.cert)}`, () => {
    const page = createPage({syncer: {type: "Active Directory", ...tlsConfig}});
    const updateSyncer = vi.spyOn(SyncerBackend, "updateSyncer");
    const showMessage = vi.spyOn(Setting, "showMessage").mockImplementation(() => undefined);

    page.submitSyncerEdit(false);

    expect(updateSyncer).not.toHaveBeenCalled();
    expect(showMessage).toHaveBeenCalledWith("error", expect.stringContaining(message));
    expect(JSON.stringify(showMessage.mock.calls)).not.toContain("future-mode");
    expect(JSON.stringify(showMessage.mock.calls)).not.toContain("missing-ca");
  });
});

test("applies Syncer policy atomically and disables duplicate saves", async() => {
  const page = createPage({syncer: {type: "Active Directory", tlsPolicy: "custom-ca", cert: "syncer-cert"}});
  page.updateSyncerTlsPolicy("system");
  expect(page.state.syncer).toEqual(expect.objectContaining({tlsPolicy: "system", cert: ""}));

  let finishSave: ((value: {status: string}) => void) | undefined;
  const pendingSave = new Promise<{status: string}>(resolve => {finishSave = resolve;});
  const updateSyncer = vi.spyOn(SyncerBackend, "updateSyncer").mockReturnValue(pendingSave as any);
  vi.spyOn(Setting, "showMessage").mockImplementation(() => undefined);

  const realSetState = page.setState;
  page.setState = vi.fn() as unknown as typeof page.setState;
  page.submitSyncerEdit(false);
  page.submitSyncerEdit(true);
  expect(updateSyncer).toHaveBeenCalledTimes(1);
  page.setState = realSetState;
  page.state.submitting = true;
  const footer = render(<>{page.renderEditFooter()}</>);
  expect((footer.getByRole("button", {name: /Save$/}) as HTMLButtonElement).disabled).toBe(true);
  expect((footer.getByRole("button", {name: "Save and return"}) as HTMLButtonElement).disabled).toBe(true);

  finishSave?.({status: "ok"});
  await flushPromises();
  expect(page.state.submitting).toBe(false);
});

test("keeps database and SSH field handlers connected to the shared form state", () => {
  const page = createPage({syncer: {sshType: "password"}});
  page.state.activeTabKey = "basic";
  const basicForm = page.renderSyncerForm();
  findElementByValue(basicForm, Input, "directory-main").props.onChange({target: {value: "directory-updated"}});
  expect(page.state.syncer.name).toBe("directory-updated");

  page.state.activeTabKey = "connection";
  let connectionForm = page.renderSyncerForm();
  const databaseType = findElementByValue(connectionForm, Select, "mysql");
  databaseType.props.onChange("postgres");
  expect(page.state.syncer).toEqual(expect.objectContaining({databaseType: "postgres", sslMode: "disable"}));
  databaseType.props.onChange("mysql");
  expect(page.state.syncer.sslMode).toBe("");

  [
    [Input, "db.example.test", "db-next.example.test", "host"],
    [Input, "syncer", "syncer-next", "user"],
    [Input, "identity", "identity-next", "database"],
    [Input, "users", "users-next", "table"],
    [Input, "ssh.example.test", "ssh-next.example.test", "sshHost"],
    [Input, "ssh-user", "ssh-user-next", "sshUser"],
  ].forEach(([type, value, nextValue, field]) => {
    findElementByValue(connectionForm, type as React.ElementType, value).props.onChange({target: {value: nextValue}});
    expect(page.state.syncer[field as string]).toBe(nextValue);
  });
  findElementByValue(connectionForm, Input.Password, "secret").props.onChange({target: {value: "secret-next"}});
  findElementByValue(connectionForm, InputNumber, 3306).props.onChange(5432);
  findElementByValue(connectionForm, InputNumber, 22).props.onChange(2222);
  findElementByValue(connectionForm, Radio.Group, "password").props.onChange({target: {value: "cert"}});
  expect(page.state.syncer).toEqual(expect.objectContaining({password: "secret-next", port: 5432, sshPort: 2222, sshType: "cert"}));

  page.state.syncer.databaseType = "postgres";
  page.state.syncer.sslMode = "disable";
  connectionForm = page.renderSyncerForm();
  findElementByValue(connectionForm, Select, "disable").props.onChange("require");
  expect(page.state.syncer.sslMode).toBe("require");

  page.state.syncer.type = "Google Workspace";
  connectionForm = page.renderSyncerForm();
  findElementByValue(connectionForm, Input.TextArea, "secret-next").props.onChange({target: {value: "service-account-json"}});
  expect(page.state.syncer.password).toBe("service-account-json");
});

test("keeps mapping and status controls connected to the shared payload", () => {
  const page = createPage({syncer: {errorText: "connection refused"}});
  page.state.activeTabKey = "mapping-status";
  const form = page.renderSyncerForm();
  const view = render(<>{form}</>);

  fireEvent.click(view.getByTestId("syncer-table-columns"));
  [
    ["departments", "departments-next", "affiliationTable"],
    ["https://assets.example.test/avatars/", "https://cdn.example.test/", "avatarBaseUrl"],
  ].forEach(([value, nextValue, field]) => {
    findElementByValue(form, Input, value).props.onChange({target: {value: nextValue}});
    expect(page.state.syncer[field]).toBe(nextValue);
  });
  findElementByValue(form, InputNumber, 60).props.onChange(120);
  collectElementsByType(form, Switch).forEach(element => element.props.onChange(!element.props.checked));

  expect(page.state.syncer).toEqual(expect.objectContaining({
    tableColumns: [{name: "id"}],
    syncInterval: 120,
    isReadOnly: true,
    isEnabled: false,
  }));
});

test("reports all mocked connection-test outcomes and clears the loading state", async() => {
  const page = createPage();
  page.state.activeTabKey = "connection";
  const form = page.renderSyncerForm();
  const testButton = collectElementsByType(form, Button)
    .find(element => element.props.children === "Test Connection") as React.ReactElement<any>;
  const testSyncerDb = vi.spyOn(SyncerBackend, "testSyncerDb")
    .mockResolvedValueOnce({status: "ok"} as any)
    .mockResolvedValueOnce({status: "error", msg: "invalid credentials"} as any)
    .mockRejectedValueOnce(new Error("offline"));
  const showMessage = vi.spyOn(Setting, "showMessage").mockImplementation(() => undefined);

  for (let i = 0; i < 3; i++) {
    testButton.props.onClick();
    expect(page.state.testDbLoading).toBe(true);
    await flushPromises();
    expect(page.state.testDbLoading).toBe(false);
  }

  expect(testSyncerDb).toHaveBeenCalledTimes(3);
  expect(showMessage).toHaveBeenCalledWith("success", expect.any(String));
  expect(showMessage).toHaveBeenCalledWith("error", expect.stringContaining("invalid credentials"));
  expect(showMessage).toHaveBeenCalledWith("error", expect.stringContaining("offline"));
});

([
  [false, "/syncers/directory-renamed"],
  [true, "/syncers"],
] as Array<[boolean, string]>).forEach(([exitAfterSave, expectedPath]) => {
  test(`keeps the existing Syncer save payload and navigation for exit=${exitAfterSave}`, async() => {
    const page = createPage({syncer: {name: "directory-renamed"}});
    const updateSyncer = vi.spyOn(SyncerBackend, "updateSyncer").mockResolvedValue({status: "ok"} as any);
    vi.spyOn(Setting, "showMessage").mockImplementation(() => undefined);

    page.submitSyncerEdit(exitAfterSave);
    await flushPromises();

    expect(updateSyncer).toHaveBeenCalledWith("admin", "directory-main", expect.objectContaining({
      organization: "engineering",
      name: "directory-renamed",
      type: "Database",
      table: "users",
    }));
    expect(page.props.history.push).toHaveBeenCalledWith(expectedPath);
  });
});

test("creates add-mode Syncers only when saving and reports backend failures", async() => {
  const page = createPage({mode: "add"});
  const showMessage = vi.spyOn(Setting, "showMessage").mockImplementation(() => undefined);
  const addSyncer = vi.spyOn(SyncerBackend, "addSyncer")
    .mockResolvedValueOnce({status: "ok"} as any);

  page.submitSyncerEdit(false);
  await flushPromises();
  expect(addSyncer).toHaveBeenCalledWith(expect.objectContaining({
    name: "directory-main",
    organization: "engineering",
  }));
  expect(page.props.history.push).toHaveBeenCalledWith("/syncers/directory-main");

  const errorPage = createPage({mode: "add"});
  addSyncer.mockResolvedValueOnce({status: "error", msg: "duplicate"} as any);
  showMessage.mockClear();

  errorPage.submitSyncerEdit(true);
  await flushPromises();
  expect(showMessage).toHaveBeenCalledWith("error", expect.stringContaining("duplicate"));
});
