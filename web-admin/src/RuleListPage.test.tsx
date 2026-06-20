/* eslint-env jest */
import React from "react";
import {act, cleanup, render} from "@testing-library/react";
import {expect, jest} from "@jest/globals";
import i18next from "i18next";
import RuleListPage from "./RuleListPage";
import * as RuleBackend from "./backend/RuleBackend";
import * as Setting from "./Setting";
import en from "./locales/en/data.json";
import zh from "./locales/zh/data.json";

type LooseMock = {
  (...args: unknown[]): unknown;
  mockImplementation: (implementation: (...args: unknown[]) => unknown) => LooseMock;
  mockReturnValue: (value: unknown) => LooseMock;
  mockResolvedValue: (value: unknown) => LooseMock;
  mockResolvedValueOnce: (value: unknown) => LooseMock;
};

type RuleBackendMock = Record<keyof typeof RuleBackend, LooseMock>;

interface TestRuleExpression {
  operator: string;
  value: string;
  [key: string]: unknown;
}

interface TestRuleRecord {
  owner: string;
  name: string;
  createdTime: string;
  updatedTime: string;
  type: string;
  expressions: TestRuleExpression[];
  action: string;
  statusCode: string;
  reason: string;
  [key: string]: unknown;
}

interface TestTableColumn {
  key?: string;
  render?: (text: unknown, record: TestRuleRecord, index: number) => React.ReactNode;
  sorter?: (a: TestRuleRecord, b: TestRuleRecord) => number;
}

jest.mock("./backend/RuleBackend", () => {
  const {jest: factoryJest} = require("@jest/globals");
  return {
    getRules: factoryJest.fn(),
    getRule: factoryJest.fn(),
    updateRule: factoryJest.fn(),
    addRule: factoryJest.fn(),
    deleteRule: factoryJest.fn(),
  };
});

const ruleBackendMock = RuleBackend as unknown as RuleBackendMock;
const fs = require("fs") as {existsSync: (filePath: string) => boolean};
const path = require("path") as {join: (...parts: string[]) => string};
const {fireEvent} = require("@testing-library/react") as {
  fireEvent: {
    click: (element: Element | null) => boolean;
  };
};
let consoleErrorSpy: {mockRestore: () => void};

const adminAccount = {owner: "admin", tag: "", isAdmin: true};
const rule: TestRuleRecord = {
  owner: "engineering",
  name: "rule-one",
  createdTime: "2026-06-20T10:00:00Z",
  updatedTime: "2026-06-20T11:00:00Z",
  type: "User-Agent",
  expressions: [{operator: "Contains", value: "curl/8.0.0"}],
  action: "Block",
  statusCode: "403",
  reason: "Your request is blocked.",
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

function installSynchronousSetState(page: RuleListPage) {
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
  const page = new RuleListPage({
    account: adminAccount,
    history: createHistory(),
    match: {path: "/rules", params: {}},
  });
  installSynchronousSetState(page);
  return page;
}

async function flushPromises() {
  await act(async() => {
    await Promise.resolve();
  });
}

describe("RuleListPage", () => {
  beforeEach(async() => {
    await useTestLanguage("zh");
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation((message?: unknown, ...args: unknown[]) => {
      if (`${message}`.includes("ReactDOM.render is no longer supported")) {
        return;
      }

      throw new Error([message, ...args].map(item => `${item}`).join(" "));
    });
    jest.spyOn(Setting, "showMessage").mockImplementation(() => {});
    jest.spyOn(Setting, "getRandomName").mockReturnValue("abc123");
    jest.spyOn(Setting, "getRequestOrganization").mockReturnValue("engineering");
    ruleBackendMock.getRules.mockResolvedValue({status: "ok", data: [rule], data2: 1});
    ruleBackendMock.addRule.mockResolvedValue({status: "ok"});
    ruleBackendMock.deleteRule.mockResolvedValue({status: "ok"});
  });

  afterEach(() => {
    cleanup();
    consoleErrorSpy.mockRestore();
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  test("is migrated from JavaScript to TSX", () => {
    expect(fs.existsSync(path.join(__dirname, "RuleListPage.tsx"))).toBe(true);
    expect(fs.existsSync(path.join(__dirname, "RuleListPage.js"))).toBe(false);
  });

  test("fetches rules through the existing Rule API boundary", async() => {
    const page = createPage();

    page.fetch({
      pagination: {...page.state.pagination, current: 2, pageSize: 20},
      sortField: "updatedTime",
      sortOrder: "descend",
    });
    await flushPromises();

    expect(ruleBackendMock.getRules).toHaveBeenCalledWith("admin", 2, 20, "updatedTime", "descend");
    expect(page.state.loading).toBe(false);
    expect(page.state.data).toEqual([rule]);
    expect(page.state.pagination.total).toBe(1);
  });

  test("uses default pagination and keeps loading false on list errors", async() => {
    const page = createPage();
    ruleBackendMock.getRules.mockResolvedValueOnce({status: "error", msg: "list failed"});

    page.fetch();
    await flushPromises();

    expect(ruleBackendMock.getRules).toHaveBeenCalledWith("admin", 1, 10, undefined, undefined);
    expect(page.state.loading).toBe(false);
    expect(Setting.showMessage).not.toHaveBeenCalledWith("error", expect.stringContaining("list failed"));
  });

  test("initializes legacy pagination before the first fetch", () => {
    const page = createPage();
    page.fetch = jest.fn() as unknown as typeof page.fetch;

    page.UNSAFE_componentWillMount();

    expect(page.state.pagination).toEqual(expect.objectContaining({
      current: 1,
      pageSize: 10,
    }));
    expect(page.fetch).toHaveBeenCalledWith({
      pagination: expect.objectContaining({
        current: 1,
        pageSize: 10,
      }),
    });
  });

  test("creates the legacy default User-Agent rule and refreshes the list", async() => {
    const page = createPage();
    page.fetch = jest.fn() as unknown as typeof page.fetch;

    expect(page.newRule()).toEqual(expect.objectContaining({
      owner: "engineering",
      name: "rule_abc123",
      type: "User-Agent",
      expressions: [],
      action: "Block",
      reason: "Your request is blocked.",
    }));

    page.addRule();
    await flushPromises();

    expect(ruleBackendMock.addRule).toHaveBeenCalledWith(expect.objectContaining({
      owner: "engineering",
      name: "rule_abc123",
    }));
    expect(page.fetch).toHaveBeenCalled();
    expect(Setting.showMessage).toHaveBeenCalledWith("success", "Rule added successfully");
  });

  test("reports add and delete API errors without changing payloads", async() => {
    const page = createPage();
    page.state = {
      ...page.state,
      data: [rule],
    };
    ruleBackendMock.addRule.mockResolvedValueOnce({status: "error", msg: "add failed"});
    ruleBackendMock.deleteRule.mockResolvedValueOnce({status: "error", msg: "delete failed"});

    page.addRule();
    await flushPromises();
    expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("add failed"));

    page.deleteRule(0);
    await flushPromises();
    expect(ruleBackendMock.deleteRule).toHaveBeenCalledWith(rule);
    expect(Setting.showMessage).toHaveBeenCalledWith("error", expect.stringContaining("delete failed"));
  });

  test("deletes rules and rolls back pagination for the last row", async() => {
    const page = createPage();
    page.fetch = jest.fn() as unknown as typeof page.fetch;
    page.state = {
      ...page.state,
      data: [rule],
      pagination: {...page.state.pagination, current: 3},
    };

    page.deleteRule(0);
    await flushPromises();

    expect(ruleBackendMock.deleteRule).toHaveBeenCalledWith(rule);
    expect(page.fetch).toHaveBeenCalledWith(expect.objectContaining({
      pagination: expect.objectContaining({current: 2}),
    }));
    expect(Setting.showMessage).toHaveBeenCalledWith("success", "Deleted successfully");
  });

  test("keeps current pagination when deleting from a page with multiple rows", async() => {
    const secondRule = {...rule, name: "rule-two"};
    const page = createPage();
    page.fetch = jest.fn() as unknown as typeof page.fetch;
    page.state = {
      ...page.state,
      data: [rule, secondRule],
      pagination: {...page.state.pagination, current: 3},
    };

    page.deleteRule(0);
    await flushPromises();

    expect(page.fetch).toHaveBeenCalledWith(expect.objectContaining({
      pagination: expect.objectContaining({current: 3}),
    }));
  });

  test("keeps table columns, expression tags, toolbar and row actions wired", () => {
    const history = createHistory();
    const page = new RuleListPage({
      account: adminAccount,
      history,
      match: {path: "/rules", params: {}},
    });
    installSynchronousSetState(page);
    jest.spyOn(page, "addRule").mockImplementation(() => {});
    jest.spyOn(page, "deleteRule").mockImplementation(() => {});

    const table = page.renderTable([rule]) as React.ReactElement<{columns: TestTableColumn[]; title: () => React.ReactNode}>;
    const columns = table.props.columns;

    expect(columns[1].key).toBe("name");
    expect(columns[5].key).toBe("expressions");
    const ruleLink = columns[1].render?.("rule-one", rule, 0) as React.ReactElement<{href: string; children: string}>;
    expect(ruleLink.props.href).toBe("/rules/engineering/rule-one");
    const expressionTags = columns[5].render?.(rule.expressions, rule, 0) as React.ReactElement[];
    expect(expressionTags[0].props.children).toBe("Contains curl/8.0.0");

    const actionNode = columns[9].render?.(undefined, rule, 0) as React.ReactElement<{children: React.ReactNode}>;
    const actionChildren = React.Children.toArray(actionNode.props.children) as React.ReactElement[];
    const actionView = render(<>{actionNode}</>);
    fireEvent.click(actionView.getByText(/编\s*辑|Edit/));
    expect(history.push).toHaveBeenCalledWith("/rules/engineering/rule-one");
    actionChildren[0].props.onConfirm();
    expect(page.deleteRule).toHaveBeenCalledWith(0);
    actionView.unmount();

    const toolbarView = render(<>{table.props.title()}</>);
    fireEvent.click(toolbarView.getByText(/添\s*加|Add/));
    expect(page.addRule).toHaveBeenCalled();
  });

  test("keeps table metadata renderers and sorters wired", () => {
    const page = createPage();
    const laterRule = {
      ...rule,
      name: "rule-two",
      owner: "platform",
      createdTime: "2026-06-21T10:00:00Z",
      updatedTime: "2026-06-21T11:00:00Z",
      type: "IP",
      action: "Allow",
      statusCode: "200",
      reason: "Allowed request.",
    };
    const sortableRule = {
      ...rule,
      expressions: Object.assign([...rule.expressions], {
        localeCompare: (other: unknown) => String(rule.expressions).localeCompare(String(other)),
      }),
    };
    const sortableLaterRule = {
      ...laterRule,
      expressions: Object.assign([...laterRule.expressions], {
        localeCompare: (other: unknown) => String(laterRule.expressions).localeCompare(String(other)),
      }),
    };

    const table = page.renderTable([rule]) as React.ReactElement<{columns: TestTableColumn[]}>;
    const columns = table.props.columns;

    expect(typeof columns[0].sorter?.(rule, laterRule)).toBe("number");
    expect(typeof columns[1].sorter?.(rule, laterRule)).toBe("number");
    expect(columns[2].render?.(rule.createdTime, rule, 0)).toBe(Setting.getFormattedDate(rule.createdTime));
    expect(typeof columns[2].sorter?.(rule, laterRule)).toBe("number");
    expect(columns[3].render?.(rule.updatedTime, rule, 0)).toBe(Setting.getFormattedDate(rule.updatedTime));
    expect(typeof columns[3].sorter?.(rule, laterRule)).toBe("number");

    const typeTag = columns[4].render?.("User-Agent", rule, 0) as React.ReactElement<{color: string}>;
    expect(typeTag.props.color).toBe("blue");
    expect(typeof columns[4].sorter?.(rule, laterRule)).toBe("number");
    expect(typeof columns[5].sorter?.(sortableRule, sortableLaterRule)).toBe("number");
    expect(typeof columns[6].sorter?.(rule, laterRule)).toBe("number");
    expect(typeof columns[7].sorter?.(rule, laterRule)).toBe("number");
    expect(typeof columns[8].sorter?.(rule, laterRule)).toBe("number");
  });
});
