/* eslint-env jest */
import React from "react";
import {expect, jest} from "@jest/globals";
import {cleanup, render} from "@testing-library/react";
import type {LegacyAny} from "../types/legacyPage";
import CompoundRule from "./CompoundRule";
import * as RuleBackend from "../backend/RuleBackend";

const fs = require("fs") as {existsSync: (filePath: string) => boolean};
const path = require("path") as {join: (...parts: string[]) => string};
const {fireEvent} = require("@testing-library/react") as {
  fireEvent: {
    click: (element: Element | null) => boolean;
  };
};
let consoleErrorSpy: {mockRestore: () => void};

jest.mock("../backend/RuleBackend", () => {
  const {jest: factoryJest} = require("@jest/globals");
  return {
    getRules: factoryJest.fn(),
  };
});

type RuleExpressionRow = {
  name: string;
  operator: string;
  value: string;
};

type BackendRuleExpressionRow = {
  [key: string]: unknown;
  name?: string;
  operator?: string;
  value?: string;
};

type RuleRecord = {
  owner: string;
  name: string;
};

type CompoundRuleProps = {
  title: React.ReactNode;
  table: RuleExpressionRow[];
  owner: string;
  ruleName: string;
  onUpdateTable: (table: RuleExpressionRow[]) => void;
};

type CompoundRuleState = {
  rules: string[];
  defaultRules: RuleExpressionRow[];
};

type CompoundRuleComponent = React.Component<CompoundRuleProps, CompoundRuleState> & {
  getRules: () => Promise<void> | void;
  updateField: (table: RuleExpressionRow[], index: number, key: keyof RuleExpressionRow, value: string) => void;
  addRow: (table: RuleExpressionRow[]) => void;
  deleteRow: (table: RuleExpressionRow[], index: number) => void;
  upRow: (table: RuleExpressionRow[], index: number) => void;
  downRow: (table: RuleExpressionRow[], index: number) => void;
  restore: () => void;
  renderTable: (table: RuleExpressionRow[]) => React.ReactElement<TableElementProps>;
  UNSAFE_componentWillMount: () => void;
};

type TableColumn = {
  key?: string;
  dataIndex?: string;
  render?: (text: LegacyAny, record: RuleExpressionRow, index: number) => React.ReactElement<LegacyAny>;
};

type TableElementProps = {
  columns: TableColumn[];
  title: () => React.ReactNode;
  dataSource: RuleExpressionRow[];
};

type UpdateTableMock = ((updated: RuleExpressionRow[]) => void) & {
  mock: {
    calls: [RuleExpressionRow[]][];
  };
};

function getRulesMock() {
  return RuleBackend.getRules as LegacyAny;
}

function createCompoundRule(table: RuleExpressionRow[] = [], owner = "org-alpha", ruleName = "self-rule") {
  const onUpdateTable = jest.fn() as unknown as UpdateTableMock;
  const page = new (CompoundRule as unknown as new(props: CompoundRuleProps) => React.Component<CompoundRuleProps, CompoundRuleState>)({
    title: "Compound Rules",
    table,
    owner,
    ruleName,
    onUpdateTable,
  }) as CompoundRuleComponent;
  page.setState = jest.fn((patch: Partial<CompoundRuleState>) => {
    (page as LegacyAny).state = {...page.state, ...patch};
  }) as LegacyAny;

  return {page, onUpdateTable};
}

function latestTable(onUpdateTable: UpdateTableMock): RuleExpressionRow[] {
  return onUpdateTable.mock.calls[onUpdateTable.mock.calls.length - 1][0];
}

function clickButtonAt(container: HTMLElement, index: number) {
  const button = container.querySelectorAll("button")[index];
  if (button === undefined) {
    throw new Error(`Unable to find button at index ${index}`);
  }

  fireEvent.click(button);
}

function selectOptionValues(selectElement: React.ReactElement<LegacyAny> | undefined): string[] {
  return React.Children.toArray(selectElement?.props.children).map(child => (child as React.ReactElement<LegacyAny>).props.value);
}

beforeEach(() => {
  consoleErrorSpy = jest.spyOn(console, "error").mockImplementation((message?: unknown, ...args: unknown[]) => {
    if (`${message}`.includes("ReactDOM.render is no longer supported")) {
      return;
    }

    throw new Error([message, ...args].map(item => `${item}`).join(" "));
  });
});

afterEach(() => {
  cleanup();
  consoleErrorSpy.mockRestore();
  jest.clearAllMocks();
});

test("migrates CompoundRule from JavaScript to TSX", () => {
  expect(fs.existsSync(path.join(__dirname, "CompoundRule.tsx"))).toBe(true);
  expect(fs.existsSync(path.join(__dirname, "CompoundRule.js"))).toBe(false);
});

test("accepts RuleEditPage backend-compatible expression rows", () => {
  const rows: BackendRuleExpressionRow[] = [
    {operator: "and", value: "org-alpha/first", backendOnly: 1},
  ];
  const onUpdateTable = jest.fn() as unknown as (table: BackendRuleExpressionRow[]) => void;

  expect(new CompoundRule({
    title: "Compound Rules",
    table: rows,
    owner: "org-alpha",
    ruleName: "self-rule",
    onUpdateTable,
  }).render()).not.toBeNull();
});

test("loads rule candidates through the existing Rule API and filters the current rule", async() => {
  getRulesMock().mockResolvedValue({
    data: [
      {owner: "org-alpha", name: "self-rule"},
      {owner: "org-alpha", name: "other-rule"},
      {owner: "org-beta", name: "external-rule"},
    ] satisfies RuleRecord[],
  });

  const {page, onUpdateTable} = createCompoundRule();

  expect(onUpdateTable).toHaveBeenCalledWith([
    {name: "Start", operator: "begin", value: "rule1"},
    {name: "And", operator: "and", value: "rule2"},
  ]);

  page.UNSAFE_componentWillMount();
  await Promise.resolve();

  expect(getRulesMock()).toHaveBeenCalledWith("org-alpha");
  expect(page.state.rules).toEqual(["org-alpha/other-rule", "org-beta/external-rule"]);
  expect(page.state.rules).not.toContain("org-alpha/self-rule");

  getRulesMock().mockResolvedValue({});
  await page.getRules();
  expect(page.state.rules).toEqual([]);
});

test("keeps compound expression row operations and render callbacks wired", () => {
  const rows = [
    {name: "Start", operator: "begin", value: "org-alpha/first"},
    {name: "And", operator: "and", value: "org-alpha/second"},
  ];
  const {page, onUpdateTable} = createCompoundRule(rows);
  (page as LegacyAny).state.rules = ["org-alpha/first", "org-alpha/second", "org-alpha/third"];

  page.updateField(rows, 1, "operator", "or");
  expect(latestTable(onUpdateTable)[1].operator).toBe("or");

  page.updateField(rows, 1, "value", "org-alpha/third");
  expect(latestTable(onUpdateTable)[1].value).toBe("org-alpha/third");

  page.addRow(rows);
  expect(latestTable(onUpdateTable)).toEqual([
    rows[0],
    rows[1],
    {name: "New Item - 2", operator: "and", value: ""},
  ]);

  page.downRow(rows, 0);
  expect(latestTable(onUpdateTable).map(row => row.name)).toEqual(["And", "Start"]);

  page.upRow(rows, 1);
  expect(latestTable(onUpdateTable).map(row => row.name)).toEqual(["And", "Start"]);

  page.deleteRow(rows, 0);
  expect(latestTable(onUpdateTable)).toEqual([rows[1]]);

  page.restore();
  expect(latestTable(onUpdateTable)).toEqual([
    {name: "Start", operator: "begin", value: "rule1"},
    {name: "And", operator: "and", value: "rule2"},
  ]);

  const table = page.renderTable(rows);
  expect(table.props.columns.map(column => column.key)).toEqual(["operator", "value", "action"]);
  expect(table.props.dataSource).toBe(rows);

  const firstOperator = table.props.columns[0].render?.(rows[0].operator, rows[0], 0);
  expect(selectOptionValues(firstOperator)).toEqual(["begin"]);
  firstOperator?.props.onChange("begin");
  expect(latestTable(onUpdateTable)[0].operator).toBe("begin");

  const secondOperator = table.props.columns[0].render?.(rows[1].operator, rows[1], 1);
  expect(selectOptionValues(secondOperator)).toEqual(["and", "or"]);
  secondOperator?.props.onChange("or");
  expect(latestTable(onUpdateTable)[1].operator).toBe("or");

  const ruleSelect = table.props.columns[1].render?.(rows[1].value, rows[1], 1);
  expect(selectOptionValues(ruleSelect)).toEqual([
    "org-alpha/first",
    "org-alpha/second",
    "org-alpha/third",
  ]);
  ruleSelect?.props.onChange("org-alpha/first");
  expect(latestTable(onUpdateTable)[1].value).toBe("org-alpha/first");

  const actionView = render(<>{table.props.columns[2].render?.(undefined, rows[0], 0)}</>);
  clickButtonAt(actionView.container, 1);
  expect(latestTable(onUpdateTable).map((row: RuleExpressionRow) => row.name)).toEqual(["And", "Start"]);
  clickButtonAt(actionView.container, 2);
  expect(latestTable(onUpdateTable)).toEqual([rows[1]]);

  const secondActionView = render(<>{table.props.columns[2].render?.(undefined, rows[1], 1)}</>);
  clickButtonAt(secondActionView.container, 0);
  expect(latestTable(onUpdateTable).map((row: RuleExpressionRow) => row.name)).toEqual(["And", "Start"]);

  const titleView = render(<>{table.props.title()}</>);
  expect(titleView.getByText("Compound Rules")).not.toBeNull();
  clickButtonAt(titleView.container, 0);
  expect(latestTable(onUpdateTable)[2]).toEqual({name: "New Item - 2", operator: "and", value: ""});
  clickButtonAt(titleView.container, 1);
  expect(latestTable(onUpdateTable)[0]).toEqual({name: "Start", operator: "begin", value: "rule1"});

  expect(page.render()).not.toBeNull();
});
