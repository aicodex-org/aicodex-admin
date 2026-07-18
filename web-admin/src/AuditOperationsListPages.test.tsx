import {afterEach, beforeEach, describe, expect, test, vi} from "vitest";
import React from "react";
import {cleanup, render, waitFor} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import i18next from "i18next";
import copy from "copy-to-clipboard";
import * as Setting from "./Setting";
import SessionListPage from "./SessionListPage";
import RecordListPage from "./RecordListPage";
import TokenListPage from "./TokenListPage";
import VerificationListPage from "./VerificationListPage";
import * as SessionBackend from "./backend/SessionBackend";
import * as RecordBackend from "./backend/RecordBackend";
import * as TokenBackend from "./backend/TokenBackend";
import * as VerificationBackend from "./backend/VerificationBackend";
import en from "./locales/en/data.json";
import zh from "./locales/zh/data.json";
import {fireEvent} from "@testing-library/react";

type LegacyPage = React.Component & {
  state: {
    data: unknown[];
    pagination: {
      current: number;
      pageSize: number;
      total?: number;
    };
    loading: boolean;
    searchText?: string;
    searchedColumn?: string;
    isAuthorized?: boolean;
    [key: string]: unknown;
  };
  renderTable: (records: unknown[]) => React.ReactNode;
  fetch: (params: Record<string, unknown>) => void;
  setState: (state: Partial<LegacyPage["state"]>, callback?: () => void) => void;
};

type PageClass = new(props: Record<string, unknown>) => LegacyPage;
type TokenListHarness = LegacyPage & {
  newToken: () => Record<string, unknown>;
  addToken: () => void;
  deleteToken: (index: number) => void;
};
type SessionListHarness = LegacyPage & {
  UNSAFE_componentWillMount: () => void;
  componentDidMount: () => void;
  getForm: () => void;
  handleTagClose: (index: number, sessionId: string, scope: string, event: {preventDefault: () => void; stopPropagation: () => void}) => void;
  renderSessionDrawer: () => React.ReactNode;
  openSessionDrawer: (record: Record<string, unknown>, rowIndex: number) => void;
  closeSessionDrawer: () => void;
};
type LooseMock = {
  (...args: unknown[]): unknown;
  mockResolvedValue: (value: unknown) => LooseMock;
  mockResolvedValueOnce: (value: unknown) => LooseMock;
  mockRejectedValueOnce: (value: unknown) => LooseMock;
  mockReturnValue: (value: unknown) => LooseMock;
};
type SessionBackendMock = Record<"deleteSession" | "getSessions", LooseMock>;
type RecordBackendMock = Record<"getRecords", LooseMock>;
type TokenBackendMock = Record<"addToken" | "deleteToken" | "getTokens", LooseMock>;
type VerificationBackendMock = Record<"getVerifications", LooseMock>;

const copyMock = copy as unknown as LooseMock;
const sessionBackendMock = SessionBackend as unknown as SessionBackendMock;
const recordBackendMock = RecordBackend as unknown as RecordBackendMock;
const tokenBackendMock = TokenBackend as unknown as TokenBackendMock;
const verificationBackendMock = VerificationBackend as unknown as VerificationBackendMock;
const tableBodyHeightPattern = (offset: number) => new RegExp(`calc\\((100vh - ${offset}px|-${offset}px \\+ 100vh)\\)`);

vi.mock("./backend/SessionBackend", () => {
  return {
    deleteSession: vi.fn(),
    getSessions: vi.fn(),
  };
});

vi.mock("./backend/RecordBackend", () => {
  return {
    getRecords: vi.fn(),
  };
});

vi.mock("./backend/TokenBackend", () => {
  return {
    addToken: vi.fn(),
    deleteToken: vi.fn(),
    getTokens: vi.fn(),
  };
});

vi.mock("./backend/VerificationBackend", () => {
  return {
    getVerifications: vi.fn(),
  };
});

vi.mock("copy-to-clipboard", () => {
  return {
    __esModule: true,
    default: vi.fn(() => true),
  };
});

vi.mock("./common/modal/PopconfirmModal", () => ({default: (props: {disabled?: boolean; onConfirm?: () => void}) => (
  <button type="button" data-testid="legacy-popconfirm" data-disabled={props.disabled ? "true" : "false"} onClick={() => props.onConfirm?.()}>
    delete
  </button>
)}));

vi.mock("./common/Editor", () => ({default: function EditorMock(props: {height?: string; value?: string}): JSX.Element {
  return <div data-testid="editor" data-height={props.height || ""} data-value={props.value || ""} />;
}}));

const adminAccount = {
  owner: "built-in",
  tag: "",
  isAdmin: true,
};

const sampleSession = {
  owner: "built-in",
  name: "aicodex-admin",
  application: "app-built-in",
  createdTime: "2026-06-20T10:00:00Z",
  sessionId: ["session-a"],
};

const sampleRecord = {
  id: 1,
  action: "login",
  object: "All / AICodex API 60",
  statusCode: 200,
  user: "aicodex-admin",
  organization: "built-in",
  createdTime: "2026-06-20T10:00:00Z",
};

const sampleToken = {
  owner: "admin",
  name: "token-a",
  createdTime: "2026-06-20T10:00:00Z",
  application: "app-built-in",
  organization: "built-in",
  user: "aicodex-admin",
  code: "code-a",
  accessToken: "access-token-a",
  expiresIn: 604800,
  scope: "profile",
};

const sampleVerification = {
  owner: "built-in",
  name: "verification-a",
  createdTime: "2026-06-20T10:00:00Z",
  type: "email",
  user: "aicodex-admin",
  provider: "provider-a",
  remoteAddr: "127.0.0.1",
  receiver: "receiver@example.com",
  code: "123456",
  isUsed: false,
};

function installSynchronousSetState(page: LegacyPage): void {
  page.setState = ((stateUpdate: Partial<LegacyPage["state"]>, callback?: () => void) => {
    page.state = {
      ...page.state,
      ...stateUpdate,
    };
    callback?.();
  }) as LegacyPage["setState"];
}

function createHistory() {
  return {
    push: vi.fn(),
  };
}

function flushPromises() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

function createPage(Page: PageClass, path: string, rows: unknown[], total = rows.length, stubFetch = true) {
  const page = new Page({
    account: adminAccount,
    history: createHistory(),
    match: {path, params: {}},
  });
  installSynchronousSetState(page);
  page.state = {
    ...page.state,
    data: rows,
    pagination: {
      ...page.state.pagination,
      current: 1,
      pageSize: 20,
      total,
    },
    loading: false,
    isAuthorized: true,
  };
  if (stubFetch) {
    page.fetch = vi.fn();
  }
  return page;
}

async function initI18n(): Promise<void> {
  if (!i18next.isInitialized) {
    await i18next.init({
      lng: "zh",
      fallbackLng: "en",
      resources: {en, zh},
      ns: Object.keys(en),
      keySeparator: false,
    });
    return;
  }

  Object.keys(en).forEach(namespace => {
    i18next.addResourceBundle("en", namespace, (en as Record<string, unknown>)[namespace], true, true);
    i18next.addResourceBundle("zh", namespace, (zh as Record<string, unknown>)[namespace], true, true);
  });
  await i18next.changeLanguage("zh");
}

describe("audit operations list pages", () => {
  let consoleErrorSpy: {mockRestore: () => void};

  beforeEach(async() => {
    cleanup();
    const testConsole = globalThis.console;
    const originalConsoleError = testConsole.error;
    consoleErrorSpy = vi.spyOn(testConsole, "error").mockImplementation((...args: unknown[]) => {
      originalConsoleError(...args);
    });
    localStorage.clear();
    localStorage.setItem("organization", "built-in");
    await initI18n();
    vi.spyOn(Setting, "isMobile").mockReturnValue(false);
    vi.spyOn(Setting, "isAdminUser").mockReturnValue(true);
    vi.spyOn(Setting, "isLocalAdminUser").mockReturnValue(false);
    vi.spyOn(Setting, "isDefaultOrganizationSelected").mockReturnValue(false);
    vi.spyOn(Setting, "getRandomName").mockReturnValue("abc123");
    vi.spyOn(Setting, "getFormattedDate").mockImplementation(value => String(value));
    vi.spyOn(Setting, "showMessage").mockImplementation(() => undefined);
    copyMock.mockReturnValue(true);
    sessionBackendMock.deleteSession.mockResolvedValue({status: "ok"});
    sessionBackendMock.getSessions.mockResolvedValue({status: "ok", data: [sampleSession], data2: 1});
    recordBackendMock.getRecords.mockResolvedValue({status: "ok", data: [sampleRecord], data2: 1});
    tokenBackendMock.addToken.mockResolvedValue({status: "ok"});
    tokenBackendMock.deleteToken.mockResolvedValue({status: "ok"});
    tokenBackendMock.getTokens.mockResolvedValue({status: "ok", data: [sampleToken], data2: 1});
    verificationBackendMock.getVerifications.mockResolvedValue({status: "ok", data: [sampleVerification], data2: 1});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    vi.restoreAllMocks();
    cleanup();
  });

  const listPageCases: Array<[string, PageClass, string, unknown[], string, string, string]> = [
    ["sessions", SessionListPage as unknown as PageClass, "/sessions", [sampleSession], "session-list-page-table-shell", "登录会话", "name"],
    ["records", RecordListPage as unknown as PageClass, "/records", [sampleRecord], "record-list-page-table-shell", "操作日志", "action"],
    ["tokens", TokenListPage as unknown as PageClass, "/tokens", [sampleToken], "token-list-page-table-shell", "令牌管理", "name"],
    ["verifications", VerificationListPage as unknown as PageClass, "/verifications", [sampleVerification], "verification-list-page-table-shell", "验证码记录", "name"],
  ];

  listPageCases.forEach(([name, Page, path, rows, shellClass, titleText, defaultField]) => {
    test(`uses unified list shell, search toolbar, and more filters on ${name} page`, () => {
      const page = createPage(Page, path, rows);
      const view = render(<MemoryRouter>{page.renderTable(rows)}</MemoryRouter>);

      expect(view.container.querySelector(".audit-operations-compact-summary")).toBeNull();
      expect(view.container.querySelector(".audit-operations-rail")).toBeNull();
      expect(view.container.querySelector(".enterprise-identity-rail-section")).toBeNull();
      expect(view.container.querySelector(`.enterprise-list-page-table-shell.${shellClass}`)).not.toBeNull();
      expect(view.container.querySelector(".audit-operations-list-route-body > .audit-operations-list-page-table-shell")).not.toBeNull();
      expect(view.container.querySelector(".audit-operations-list-page-table-shell")).not.toBeNull();
      expect(view.container.querySelector(".enterprise-list-table.audit-operations-list-table")).not.toBeNull();
      expect(view.container.querySelector(".enterprise-list-query-toolbar")).not.toBeNull();
      expect(view.container.querySelector(".enterprise-list-query-toolbar-title")?.textContent).toContain(titleText);
      expect(view.container.querySelector(".ant-table-filter-trigger")).toBeNull();
      expect(view.container.querySelector(".ant-table-cell-fix-left, .ant-table-cell-fix-right")).toBeNull();
      const renderedTable = view.container.querySelector(".enterprise-list-table .ant-table-content table");
      expect(renderedTable?.getAttribute("style") || "").not.toContain("max-content");
      expect(view.container.querySelector(".enterprise-list-table .ant-table-body")?.getAttribute("style") || "").toMatch(tableBodyHeightPattern(360));

      const fieldSelect = view.container.querySelector(".enterprise-list-query-toolbar-field .ant-select-selection-item");
      expect(fieldSelect?.textContent).not.toEqual("");
      expect(page.state.searchedColumn || defaultField).toBe(defaultField);

      fireEvent.click(view.getByText(/更多筛选|More filters/).closest("button") as Element);
      expect(page.state.advancedFiltersOpen).toBe(true);
      expect(view.container.querySelector(".enterprise-list-query-toolbar-advanced")).not.toBeNull();
      view.rerender(<MemoryRouter>{page.renderTable(rows)}</MemoryRouter>);
      expect(view.container.querySelector(".enterprise-list-table .ant-table-body")?.getAttribute("style") || "").toMatch(tableBodyHeightPattern(414));
    });
  });

  test("moves token add button and row actions into the unified list affordances", () => {
    const page = createPage(TokenListPage as unknown as PageClass, "/tokens", [sampleToken]) as TokenListHarness;
    const addTokenSpy = vi.spyOn(page, "addToken").mockImplementation(() => undefined);
    const deleteTokenSpy = vi.spyOn(page, "deleteToken").mockImplementation(() => undefined);
    const history = (page.props as {history: ReturnType<typeof createHistory>}).history;
    const view = render(<MemoryRouter>{page.renderTable([sampleToken])}</MemoryRouter>);

    const addButton = view.getByText(/添\s*加|Add/).closest("button") as HTMLButtonElement;
    expect(addButton.closest(".enterprise-list-query-toolbar-actions")).not.toBeNull();
    fireEvent.click(addButton);
    expect(addTokenSpy).toHaveBeenCalled();

    const rowActions = view.container.querySelector(".enterprise-list-row-actions");
    expect(rowActions).not.toBeNull();
    fireEvent.click(view.getByText(/编\s*辑|Edit/));
    expect(history.push).toHaveBeenCalledWith("/tokens/token-a");
    fireEvent.click(view.getByText(/删\s*除|Delete/));
    fireEvent.click(view.baseElement.querySelector(".ant-popconfirm-buttons .ant-btn-primary") as Element);
    expect(deleteTokenSpy).toHaveBeenCalledWith(0);
  });

  test("keeps sensitive token and verification codes out of the list columns", () => {
    const tokenPage = createPage(TokenListPage as unknown as PageClass, "/tokens", [sampleToken]);
    const tokenView = render(<MemoryRouter>{tokenPage.renderTable([sampleToken])}</MemoryRouter>);

    expect(tokenView.queryByText("code-a")).toBeNull();
    expect(tokenView.queryByText("access-token-a")).toBeNull();

    const verificationPage = createPage(VerificationListPage as unknown as PageClass, "/verifications", [sampleVerification]);
    const verificationView = render(<MemoryRouter>{verificationPage.renderTable([sampleVerification])}</MemoryRouter>);

    expect(verificationView.queryByText("123456")).toBeNull();
  });

  test("keeps session delete and fetch behavior while using the compact list shell", async() => {
    const page = createPage(SessionListPage as unknown as PageClass, "/sessions", [sampleSession], 1, false) as SessionListHarness;
    const fetchSpy = vi.spyOn(page, "fetch");
    const getFormSpy = vi.spyOn(page, "getForm").mockImplementation(() => undefined);
    const closeEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    };

    page.UNSAFE_componentWillMount();
    expect(fetchSpy).not.toHaveBeenCalled();
    page.componentDidMount();
    expect(fetchSpy).toHaveBeenCalledWith({pagination: page.state.pagination});
    expect(getFormSpy).toHaveBeenCalled();
    fetchSpy.mockClear();

    const tableView = render(
      <MemoryRouter>
        {page.renderTable([
          sampleSession,
          {...sampleSession, application: "app-secondary", sessionId: ["session-b"]},
        ])}
      </MemoryRouter>
    );
    expect(Array.from(tableView.container.querySelectorAll("tbody tr[data-row-key]")).map(row => (row as HTMLElement).getAttribute("data-row-key")))
      .toEqual(expect.arrayContaining([
        "built-in/aicodex-admin/app-built-in",
        "built-in/aicodex-admin/app-secondary",
      ]));
    tableView.unmount();

    page.handleTagClose(0, "session-a", "list", closeEvent);
    expect(closeEvent.preventDefault).toHaveBeenCalled();
    expect(closeEvent.stopPropagation).toHaveBeenCalled();
    expect(page.state.confirmTagKey).toBe("list-0-session-a");

    const multiSession = {
      ...sampleSession,
      sessionId: ["session-a", "session-b", "session-c", "session-d"],
    };
    page.state = {
      ...page.state,
      data: [multiSession],
      loading: false,
    };
    const sessionListView = render(<MemoryRouter>{page.renderTable([multiSession])}</MemoryRouter>);
    expect(sessionListView.getByText("session-a")).not.toBeNull();
    expect(sessionListView.getByText("session-b")).not.toBeNull();
    expect(sessionListView.queryByText("session-c")).toBeNull();
    expect(sessionListView.container.querySelectorAll(".session-id-list .session-id-tag-text")).toHaveLength(2);
    expect(sessionListView.baseElement.querySelector(".session-id-delete-popconfirm")).not.toBeNull();
    expect(sessionListView.getByText("+2 更多")).not.toBeNull();
    expect(sessionListView.getByText("全部删除")).not.toBeNull();
    fireEvent.click(sessionListView.getByText("全部删除"));
    expect(sessionListView.baseElement.querySelector(".session-bulk-delete-popconfirm")).not.toBeNull();
    fireEvent.click(sessionListView.getByText("+2 更多"));
    expect(page.state.sessionDrawerOpen).toBe(true);
    const drawerView = render(<MemoryRouter>{page.renderSessionDrawer()}</MemoryRouter>);
    expect(drawerView.getByText("全部会话ID")).not.toBeNull();
    expect(drawerView.getByText("session-c")).not.toBeNull();
    expect(drawerView.getByText("session-d")).not.toBeNull();
    sessionListView.unmount();

    page.closeSessionDrawer();
    expect(page.state.sessionDrawerOpen).toBe(false);
    expect(page.state.sessionDrawerRecord).toBeNull();
    expect(page.state.sessionDrawerRecordKey).toBe("");
    expect(page.state.sessionDrawerRowIndex).toBeNull();
    expect(page.state.confirmTagKey).toBeNull();
    drawerView.rerender(<MemoryRouter>{page.renderSessionDrawer()}</MemoryRouter>);
    await waitFor(() => expect(drawerView.queryByText("session-c")).toBeNull());

    const replacementSession = {...multiSession, application: "app-reopened", sessionId: ["session-new"]};
    page.openSessionDrawer(replacementSession, 0);
    drawerView.rerender(<MemoryRouter>{page.renderSessionDrawer()}</MemoryRouter>);
    expect(await drawerView.findByText("session-new")).not.toBeNull();
    expect(drawerView.queryByText("session-c")).toBeNull();
    drawerView.unmount();
    page.closeSessionDrawer();
    page.state = {...page.state, data: [multiSession]};

    (page as unknown as {deleteSession: (index: number, sessionId?: string) => void}).deleteSession(0, "session-a");
    await flushPromises();
    expect(sessionBackendMock.deleteSession).toHaveBeenCalledWith(multiSession, "session-a");
    expect(Setting.showMessage).toHaveBeenCalledWith("success", expect.any(String));
    expect(fetchSpy).toHaveBeenCalledWith(expect.objectContaining({pagination: expect.objectContaining({current: 1})}));

    sessionBackendMock.deleteSession.mockResolvedValueOnce({status: "error", msg: "delete failed"});
    (page as unknown as {deleteSession: (index: number, sessionId?: string) => void}).deleteSession(0);
    await flushPromises();
    expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete failed"));

    sessionBackendMock.deleteSession.mockRejectedValueOnce(new Error("network"));
    (page as unknown as {deleteSession: (index: number, sessionId?: string) => void}).deleteSession(0);
    await flushPromises();
    expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("network"));

    page.fetch({
      pagination: {...page.state.pagination, current: 1, pageSize: 20},
      contentType: "session",
      sortField: "name",
      sortOrder: "ascend",
    });
    await flushPromises();
    expect(sessionBackendMock.getSessions).toHaveBeenLastCalledWith("built-in", 1, 20, "contentType", "session", "name", "ascend");
    expect(page.state.data).toEqual([sampleSession]);

    sessionBackendMock.getSessions.mockResolvedValueOnce({status: "error", msg: "denied"});
    page.fetch({pagination: {...page.state.pagination, current: 1, pageSize: 20}});
    await flushPromises();
    expect(Setting.showMessage).toHaveBeenCalledWith("error", "denied");

    sessionBackendMock.getSessions.mockResolvedValueOnce({status: "error", msg: "Unauthorized operation"});
    page.fetch({pagination: {...page.state.pagination, current: 1, pageSize: 20}});
    await flushPromises();
    expect(page.state.isAuthorized).toBe(false);
  });

  test("keeps token create delete and fetch behavior", async() => {
    const history = createHistory();
    const page = new (TokenListPage as unknown as PageClass)({
      account: adminAccount,
      history,
      match: {path: "/tokens", params: {}},
    }) as TokenListHarness;
    installSynchronousSetState(page);
    page.state = {
      ...page.state,
      data: [sampleToken],
      pagination: {...page.state.pagination, current: 2, pageSize: 20, total: 1},
      loading: false,
    };

    expect(page.newToken()).toEqual(expect.objectContaining({
      name: "token_abc123",
      organization: "built-in",
      accessToken: "",
    }));

    page.addToken();
    await flushPromises();
    expect(tokenBackendMock.addToken).toHaveBeenCalledWith(expect.objectContaining({name: "token_abc123"}));
    expect(history.push).toHaveBeenCalledWith({pathname: "/tokens/token_abc123", mode: "add"});

    tokenBackendMock.addToken.mockResolvedValueOnce({status: "error", msg: "add failed"});
    page.addToken();
    await flushPromises();
    expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("add failed"));

    tokenBackendMock.addToken.mockRejectedValueOnce(new Error("add network"));
    page.addToken();
    await flushPromises();
    expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("add network"));

    page.deleteToken(0);
    await flushPromises();
    expect(tokenBackendMock.deleteToken).toHaveBeenCalledWith(sampleToken);
    expect(page.state.pagination.current).toBe(1);

    tokenBackendMock.deleteToken.mockResolvedValueOnce({status: "error", msg: "delete failed"});
    page.deleteToken(0);
    await flushPromises();
    expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete failed"));

    tokenBackendMock.deleteToken.mockRejectedValueOnce(new Error("delete network"));
    page.deleteToken(0);
    await flushPromises();
    expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete network"));

    page.fetch({
      pagination: {...page.state.pagination, current: 1, pageSize: 10},
      searchedColumn: "scope",
      searchText: "profile",
      sortField: "createdTime",
      sortOrder: "descend",
    });
    await flushPromises();
    expect(tokenBackendMock.getTokens).toHaveBeenLastCalledWith("admin", "built-in", 1, 10, "scope", "profile", "createdTime", "descend");
    expect(page.state.data).toEqual([sampleToken]);

    tokenBackendMock.getTokens.mockResolvedValueOnce({status: "error", msg: "list failed"});
    page.fetch({pagination: {...page.state.pagination, current: 1, pageSize: 10}});
    await flushPromises();
    expect(Setting.showMessage).toHaveBeenCalledWith("error", "list failed");
  });

  test("keeps record detail helpers and fetch behavior", async() => {
    const page = createPage(RecordListPage as unknown as PageClass, "/records", [sampleRecord], 1, false) as LegacyPage & {
      getDetailField: (field: string) => unknown;
      getEditorMaxWidth: () => number;
      renderDetailContent: () => React.ReactNode;
      getForm: () => void;
      UNSAFE_componentWillMount: () => void;
      componentDidMount: () => void;
    };
    page.state = {
      ...page.state,
      detailRecord: {
        ...sampleRecord,
        response: "{\"status\":\"ok\",\"accessToken\":\"response-secret\"}",
        object: "{\"owner\":\"built-in\",\"name\":\"site-a\",\"accessToken\":\"object-secret\"}",
      },
      detailShow: true,
    };
    const fetchSpy = vi.spyOn(page, "fetch").mockImplementation(() => undefined);
    const getFormSpy = vi.spyOn(page, "getForm").mockImplementation(() => undefined);

    page.UNSAFE_componentWillMount();
    expect(page.state.pagination.pageSize).toBe(20);
    page.componentDidMount();
    expect(fetchSpy).toHaveBeenCalledWith({pagination: page.state.pagination});
    expect(getFormSpy).toHaveBeenCalled();
    fetchSpy.mockRestore();

    expect(page.getDetailField("action")).toBe("login");
    expect(page.getEditorMaxWidth()).toBe("100%");
    const detailView = render(<MemoryRouter>{page.renderDetailContent()}</MemoryRouter>);
    expect(detailView.getByText("built-in / site-a")).not.toBeNull();
    const detailContent = detailView.container.querySelector(".audit-record-detail-content") as HTMLElement;
    expect(detailContent).not.toBeNull();
    expect(detailContent.style.overflowY).toBe("auto");
    expect(detailView.container.querySelector(".audit-record-detail-summary")).not.toBeNull();
    expect(detailView.container.querySelectorAll(".audit-record-detail-code-panel")).toHaveLength(2);
    const editors = detailView.getAllByTestId("editor");
    expect(editors[0].getAttribute("data-height")).toBe("180px");
    expect(editors[1].getAttribute("data-height")).toBe("");
    const copyButtons = Array.from(detailView.container.querySelectorAll(".audit-record-detail-copy-button")) as HTMLButtonElement[];
    expect(copyButtons).toHaveLength(2);
    fireEvent.click(copyButtons[1]);
    expect(copyMock).toHaveBeenCalledWith(expect.stringContaining("\"accessToken\": \"***\""));
    expect(copyMock).not.toHaveBeenCalledWith(expect.stringContaining("object-secret"));
    expect(page.state.auditDetailCopyFeedback).toMatchObject({status: "success"});
    expect(Setting.showMessage).not.toHaveBeenCalled();
    clearTimeout((page as unknown as {auditDetailCopyFeedbackTimer?: ReturnType<typeof setTimeout>}).auditDetailCopyFeedbackTimer);
    detailView.unmount();

    page.state = {
      ...page.state,
      detailShow: false,
      detailRecord: null,
    };
    const tableView = render(<MemoryRouter>{page.renderTable([sampleRecord])}</MemoryRouter>);
    const detailButtons = Array.from(tableView.container.querySelectorAll(".enterprise-list-row-actions button")) as HTMLButtonElement[];
    const detailButton = detailButtons
      .find(button => /详\s*情|Detail/.test(button.textContent || ""));
    fireEvent.click(detailButton as Element);
    expect(page.state.detailShow).toBe(true);
    expect(page.state.detailRecord).toEqual(sampleRecord);

    page.fetch({
      pagination: {...page.state.pagination, current: 1, pageSize: 20},
      method: "POST",
      sortField: "createdTime",
      sortOrder: "descend",
    });
    await flushPromises();
    expect(recordBackendMock.getRecords).toHaveBeenLastCalledWith("built-in", 1, 20, "method", "POST", "createdTime", "descend");
    expect(page.state.data).toEqual([sampleRecord]);
    expect(page.state.detailShow).toBe(false);

    recordBackendMock.getRecords.mockResolvedValueOnce({status: "error", data: "Please login first"});
    page.fetch({pagination: {...page.state.pagination, current: 1, pageSize: 20}});
    await flushPromises();
    expect(page.state.isAuthorized).toBe(false);
  });

  test("keeps verification fetch behavior and mobile formatting branches", async() => {
    const page = createPage(VerificationListPage as unknown as PageClass, "/verifications", [sampleVerification], 1, false) as LegacyPage & {
      newVerification: () => Record<string, unknown>;
    };

    expect(page.newVerification()).toEqual(expect.objectContaining({
      owner: "admin",
      name: "Verification_abc123",
    }));

    page.fetch({
      pagination: {...page.state.pagination, current: 1, pageSize: 20},
      type: "email",
      sortField: "createdTime",
      sortOrder: "ascend",
    });
    await flushPromises();
    expect(verificationBackendMock.getVerifications).toHaveBeenLastCalledWith("", "built-in", 1, 20, "type", "email", "createdTime", "ascend");
    expect(page.state.data).toEqual([sampleVerification]);

    verificationBackendMock.getVerifications.mockResolvedValueOnce({status: "error", msg: "list failed"});
    page.fetch({pagination: {...page.state.pagination, current: 1, pageSize: 20}});
    await flushPromises();
    expect(Setting.showMessage).toHaveBeenCalledWith("error", "list failed");

    verificationBackendMock.getVerifications.mockResolvedValueOnce({status: "error", msg: "Unauthorized operation"});
    page.fetch({pagination: {...page.state.pagination, current: 1, pageSize: 20}});
    await flushPromises();
    expect(page.state.isAuthorized).toBe(false);

    vi.spyOn(Setting, "isMobile").mockReturnValue(true);
    const mobileView = render(<MemoryRouter>{page.renderTable([{...sampleVerification, remoteAddr: "127.0.0.1: "}])}</MemoryRouter>);
    expect(mobileView.container.querySelector(".verification-list-page-table-shell")).not.toBeNull();
    expect(mobileView.getByText("127.0.0.1").closest("a")?.getAttribute("href")).toBe("https://db-ip.com/127.0.0.1");

    const adminOwnerView = render(<MemoryRouter>{page.renderTable([{...sampleVerification, owner: "admin"}])}</MemoryRouter>);
    expect(adminOwnerView.getByText(/\(/).textContent).toContain(i18next.t("general:empty"));
  });
});
