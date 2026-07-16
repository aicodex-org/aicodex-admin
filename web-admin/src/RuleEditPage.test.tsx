/* eslint-env jest */
import React from "react";
import {act, cleanup, render} from "@testing-library/react";
import {expect, jest} from "@jest/globals";
import RuleEditPage from "./RuleEditPage";
import * as RuleBackend from "./backend/RuleBackend";
import * as OrganizationBackend from "./backend/OrganizationBackend";
import * as Setting from "./Setting";

type LooseMock = {
  (...args: unknown[]): unknown;
  mockResolvedValue: (value: unknown) => LooseMock;
  mockResolvedValueOnce: (value: unknown) => LooseMock;
};

type RuleBackendMock = Pick<Record<keyof typeof RuleBackend, LooseMock>, "getRule" | "updateRule">;
type OrganizationBackendMock = Pick<Record<keyof typeof OrganizationBackend, LooseMock>, "getOrganizations">;

interface TestRuleExpression {
  key?: string;
  operator?: string;
  value?: string;
  [key: string]: unknown;
}

interface TestRuleRecord {
  owner: string;
  name: string;
  type: string;
  expressions: TestRuleExpression[];
  action: string;
  statusCode: number;
  reason: string;
  isVerbose: boolean;
}

type ElementHandler = (...args: unknown[]) => void;

interface ElementProps {
  children?: React.ReactNode;
  checked?: unknown;
  onChange?: ElementHandler;
  value?: unknown;
}

interface RuleEditPageProps {
  account: Record<string, unknown>;
  history: ReturnType<typeof createHistory>;
  match: {params: {organizationName: string; ruleName: string}};
}

interface RuleEditPageState {
  owner: string;
  ruleName: string;
  rule: TestRuleRecord | null;
  organizations: Array<{name: string}>;
}

type RuleEditPageComponent = React.Component<RuleEditPageProps, RuleEditPageState> & {
  getOrganizations: () => void;
  getRule: () => void;
  renderRule: () => React.ReactNode;
  submitRuleEdit: () => void;
  updateRuleField: (key: string, value: unknown) => void;
  updateRuleFieldInExpressions: (index: number, key: string, value: unknown) => void;
};

type RuleTableProps = {
  onUpdateTable: (table: TestRuleExpression[]) => void;
  title?: string;
};

jest.mock("./backend/RuleBackend", () => {
  const {jest: factoryJest} = require("@jest/globals");
  return {
    getRule: factoryJest.fn(),
    updateRule: factoryJest.fn(),
  };
});

jest.mock("./backend/OrganizationBackend", () => {
  const {jest: factoryJest} = require("@jest/globals");
  return {
    getOrganizations: factoryJest.fn(),
  };
});

function mockCreateRuleTable(testId: string) {
  return (props: RuleTableProps) => {
    const ReactRuntime = require("react");
    return ReactRuntime.createElement(
      "button",
      {
        "data-testid": testId,
        onClick: () => props.onUpdateTable([{key: testId, value: "updated"}]),
        type: "button",
      },
      props.title ?? testId
    );
  };
}

jest.mock("./table/WafRuleTable", () => ({__esModule: true, default: mockCreateRuleTable("waf-rule-table")}));
jest.mock("./table/IpRuleTable", () => ({__esModule: true, default: mockCreateRuleTable("ip-rule-table")}));
jest.mock("./table/UaRuleTable", () => ({__esModule: true, default: mockCreateRuleTable("ua-rule-table")}));
jest.mock("./table/IpRateRuleTable", () => ({__esModule: true, default: mockCreateRuleTable("ip-rate-rule-table")}));
jest.mock("./common/CompoundRule", () => ({__esModule: true, default: mockCreateRuleTable("compound-rule")}));

const ruleBackendMock = RuleBackend as unknown as RuleBackendMock;
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
const rule: TestRuleRecord = {
  owner: "engineering",
  name: "rule-one",
  type: "IP",
  expressions: [{key: "ip", operator: "in", value: "ip-alpha"}],
  action: "Block",
  statusCode: 403,
  reason: "blocked",
  isVerbose: false,
};

function createHistory() {
  return {
    push: jest.fn(),
  };
}

function createProps(history = createHistory()): RuleEditPageProps {
  return {
    account: adminAccount,
    history,
    match: {params: {organizationName: "engineering", ruleName: "rule-one"}},
  };
}

function createPage(ruleOverride: Partial<TestRuleRecord> = {}) {
  const page = new (RuleEditPage as unknown as new(props: RuleEditPageProps) => RuleEditPageComponent)(createProps());
  page.setState = ((stateUpdate: unknown, callback?: () => void) => {
    const nextState = typeof stateUpdate === "function"
      ? (stateUpdate as (state: unknown, props: unknown) => unknown)(page.state, page.props)
      : stateUpdate;
    page.state = {...page.state, ...(nextState as Record<string, unknown>)};
    callback?.();
  }) as typeof page.setState;
  page.state = {
    ...page.state,
    rule: {
      ...rule,
      ...ruleOverride,
    },
    organizations: [{name: "engineering"}, {name: "platform"}],
  };
  return page;
}

function renderPage(history = createHistory()) {
  const view = render(<RuleEditPage {...createProps(history)} />);
  return {history, view};
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

describe("RuleEditPage", () => {
  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation((message?: unknown, ...args: unknown[]) => {
      throw new Error([message, ...args].map(item => `${item}`).join(" "));
    });
    jest.spyOn(Setting, "showMessage").mockImplementation(() => {});
    jest.spyOn(Setting, "isAdminUser").mockReturnValue(true);
    ruleBackendMock.getRule.mockResolvedValue({status: "ok", data: {...rule}});
    ruleBackendMock.updateRule.mockResolvedValue({status: "ok"});
    organizationBackendMock.getOrganizations.mockResolvedValue({status: "ok", data: [{name: "engineering"}, {name: "platform"}]});
  });

  afterEach(() => {
    cleanup();
    consoleErrorSpy.mockRestore();
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  test("is migrated from JavaScript to TSX", () => {
    expect(fs.existsSync(path.join(__dirname, "RuleEditPage.tsx"))).toBe(true);
    expect(fs.existsSync(path.join(__dirname, "RuleEditPage.js"))).toBe(false);
  });

  test("loads rule data and admin organizations", async() => {
    const {view} = renderPage();

    expect(await view.findByDisplayValue("rule-one")).not.toBeNull();
    expect(view.getByDisplayValue("blocked")).not.toBeNull();
    expect(ruleBackendMock.getRule).toHaveBeenCalledWith("engineering", "rule-one");
    expect(organizationBackendMock.getOrganizations).toHaveBeenCalledWith("admin");
  });

  test("uses scoped Gateway edit layout hooks", () => {
    const page = createPage();
    const view = render(<>{page.render()}</>);

    expect(view.container.querySelector(".admin-gateway-edit-page")).not.toBeNull();
    expect(view.container.querySelector(".admin-gateway-edit-card")).not.toBeNull();
    expect(view.container.querySelectorAll(".admin-gateway-edit-field-row")).toHaveLength(8);
  });

  test("skips organization loading for non-admin accounts", () => {
    jest.spyOn(Setting, "isAdminUser").mockReturnValue(false);
    const page = createPage();

    page.getOrganizations();

    expect(organizationBackendMock.getOrganizations).not.toHaveBeenCalledWith("admin");
  });

  test("keeps field updates and expression updates wired to rule state", () => {
    const page = createPage();

    page.updateRuleField("reason", "updated reason");
    page.updateRuleField("statusCode", 429);
    page.updateRuleField("isVerbose", true);
    page.updateRuleFieldInExpressions(0, "value", "ip-beta");
    page.updateRuleField("type", "WAF");

    expect(page.state.rule).toEqual(expect.objectContaining({
      reason: "updated reason",
      statusCode: 429,
      isVerbose: true,
      type: "WAF",
      expressions: [],
    }));
  });

  test("keeps edit form handlers wired to rule fields", () => {
    const page = createPage();
    const handlers = new Map<unknown, ElementHandler>();

    visitReactNode(page.renderRule(), (element) => {
      const props = element.props as ElementProps;
      if (props.onChange !== undefined) {
        handlers.set(props.value ?? props.checked, props.onChange);
      }
    });

    handlers.get("engineering")?.("platform");
    handlers.get("rule-one")?.({target: {value: "rule-two"}});
    handlers.get("IP")?.("User-Agent");
    handlers.get("Block")?.("Allow");
    handlers.get(403)?.(451);
    handlers.get("blocked")?.({target: {value: "legal reason"}});
    handlers.get(false)?.(true);

    expect(page.state.rule).toEqual(expect.objectContaining({
      owner: "platform",
      name: "rule-two",
      type: "User-Agent",
      expressions: [],
      action: "Allow",
      statusCode: 451,
      reason: "legal reason",
      isVerbose: true,
    }));
  });

  test("renders every rule expression component and keeps onUpdateTable callbacks", () => {
    const cases = [
      ["WAF", "waf-rule-table"],
      ["IP", "ip-rule-table"],
      ["User-Agent", "ua-rule-table"],
      ["IP Rate Limiting", "ip-rate-rule-table"],
      ["Compound", "compound-rule"],
    ] as const;

    cases.forEach(([type, testId]) => {
      cleanup();
      const page = createPage({type, expressions: []});
      const view = render(<>{page.renderRule()}</>);
      fireEvent.click(view.getByTestId(testId));
      expect(page.state.rule?.expressions).toEqual([{key: testId, value: "updated"}]);
    });
  });

  test("saves rule edits and reports backend errors with route rollback", async() => {
    const successPage = createPage({reason: "allowed"});
    successPage.submitRuleEdit();
    await flushPromises();

    expect(ruleBackendMock.updateRule).toHaveBeenCalledWith("engineering", "rule-one", expect.objectContaining({
      reason: "allowed",
    }));
    expect(Setting.showMessage).toHaveBeenCalledWith("success", "Rule updated successfully");

    const history = createHistory();
    const errorPage = new (RuleEditPage as unknown as new(props: RuleEditPageProps) => RuleEditPageComponent)(createProps(history));
    errorPage.setState = ((stateUpdate: unknown) => {
      errorPage.state = {...errorPage.state, ...(stateUpdate as Record<string, unknown>)};
    }) as typeof errorPage.setState;
    errorPage.state = {...createPage({owner: "platform", name: "renamed-rule"}).state};
    jest.spyOn(errorPage, "getRule").mockImplementation(() => {});
    ruleBackendMock.updateRule.mockResolvedValueOnce({status: "error", msg: "save failed"});

    errorPage.submitRuleEdit();
    await flushPromises();

    expect(Setting.showMessage).toHaveBeenCalledWith("error", "Rule failed to update: save failed");
    expect(history.push).toHaveBeenCalledWith("/rules/platform/renamed-rule");
    expect(errorPage.getRule).toHaveBeenCalled();
  });
});
