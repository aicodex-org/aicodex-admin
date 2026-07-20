import {afterEach, beforeEach, expect, test, vi} from "vitest";
import React from "react";
import {cleanup, render} from "@testing-library/react";
import type {LegacyAny} from "../types/legacyPage";
import WafRuleTable from "./WafRuleTable";
import IpRuleTable from "./IpRuleTable";
import UaRuleTable from "./UaRuleTable";
import IpRateRuleTable from "./IpRateRuleTable";
import type {RuleExpressionRow} from "./ruleExpressionRow";
import {getRuleExpressionText} from "./ruleExpressionRow";
import * as fs from "fs";
import * as path from "path";
import {fireEvent} from "@testing-library/react";
import {fileURLToPath} from "url";
const testFileDirectory = path.dirname(fileURLToPath(import.meta.url));

let consoleErrorSpy: {mockRestore: () => void};

type CompleteRuleExpressionRow = RuleExpressionRow & {
  name: string;
  operator: string;
  value: string;
};

type RuleTableProps = {
  title: React.ReactNode;
  table: RuleExpressionRow[];
  onUpdateTable: (table: RuleExpressionRow[]) => void;
};

type RuleTableComponent = React.Component<RuleTableProps, LegacyAny> & {
  addRow?: (table: RuleExpressionRow[]) => void;
  deleteRow?: (table: RuleExpressionRow[], index: number) => void;
  upRow?: (table: RuleExpressionRow[], index: number) => void;
  downRow?: (table: RuleExpressionRow[], index: number) => void;
  restore: () => void;
  updateField: (table: RuleExpressionRow[], index: number, key: keyof RuleExpressionRow, value: LegacyAny) => void;
  renderTable: (table: RuleExpressionRow[]) => React.ReactElement<TableElementProps>;
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

function createTable(
  Component: new(props: RuleTableProps) => React.Component<RuleTableProps, LegacyAny>,
  table: CompleteRuleExpressionRow[] = [],
  title = "Rule Table"
) {
  const onUpdateTable = vi.fn() as unknown as UpdateTableMock;
  const page = new Component({title, table, onUpdateTable}) as RuleTableComponent;
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

beforeEach(() => {
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation((message?: unknown, ...args: unknown[]) => {
    throw new Error([message, ...args].map(item => `${item}`).join(" "));
  });
});

afterEach(() => {
  cleanup();
  consoleErrorSpy.mockRestore();
  vi.clearAllMocks();
});

test("migrates all governance rule expression tables from JavaScript to TSX", () => {
  ["WafRuleTable", "IpRuleTable", "UaRuleTable", "IpRateRuleTable"].forEach(fileName => {
    expect(fs.existsSync(path.join(testFileDirectory, `${fileName}.tsx`))).toBe(true);
    expect(fs.existsSync(path.join(testFileDirectory, `${fileName}.js`))).toBe(false);
  });
});

test("accepts backend-compatible open rule expression rows", () => {
  const rows: RuleExpressionRow[] = [
    {name: "backend row", operator: "match", value: "SecRule one", backendOnly: 1},
  ];
  const onUpdateTable = vi.fn() as unknown as UpdateTableMock;
  const page = new WafRuleTable({title: "Rule Table", table: rows, onUpdateTable}) as RuleTableComponent;

  page.updateField(rows, 0, "value", "SecRule two");

  expect(latestTable(onUpdateTable)[0]).toEqual({
    name: "backend row",
    operator: "match",
    value: "SecRule two",
    backendOnly: 1,
  });
});

test("accepts RuleEditPage passthrough props without changing table behavior", () => {
  const rows: RuleExpressionRow[] = [
    {name: "backend row", operator: "match", value: "one", backendOnly: 1},
  ];
  const account = {owner: "admin"};
  const onUpdateTable = vi.fn() as unknown as UpdateTableMock;

  expect(new WafRuleTable({
    title: "WAF",
    table: rows,
    ruleName: "main-rule",
    account,
    onUpdateTable,
  }).render()).not.toBeNull();
  expect(new IpRuleTable({
    title: "IP",
    table: rows,
    ruleName: "main-rule",
    account,
    onUpdateTable,
  }).render()).not.toBeNull();
  expect(new UaRuleTable({
    title: "UA",
    table: rows,
    ruleName: "main-rule",
    account,
    onUpdateTable,
  }).render()).not.toBeNull();
  expect(new IpRateRuleTable({
    title: "IP Rate",
    table: rows,
    ruleName: "main-rule",
    account,
    onUpdateTable,
  }).render()).not.toBeNull();
});

test("normalizes backend expression field values for table inputs", () => {
  expect(getRuleExpressionText(undefined)).toBe("");
  expect(getRuleExpressionText(null)).toBe("");
  expect(getRuleExpressionText(100)).toBe("100");
});

test("keeps WAF default rules, row operations and field updates", () => {
  const empty = createTable(WafRuleTable);
  expect(empty.onUpdateTable).toHaveBeenCalledWith([
    expect.objectContaining({name: "Enable XML request body parser", operator: "match"}),
    expect.objectContaining({name: "Enable JSON request body parser", operator: "match"}),
    expect.objectContaining({name: "Verify that we've correctly processed the request body", operator: "match"}),
  ]);

  const rows = [
    {name: "first", operator: "match", value: "SecRule one"},
    {name: "second", operator: "match", value: "SecRule two"},
  ];
  const {page, onUpdateTable} = createTable(WafRuleTable, rows);

  page.addRow?.(rows);
  expect(latestTable(onUpdateTable)).toEqual([
    rows[0],
    rows[1],
    {name: "New WAF Rule - 2", operator: "match", value: ""},
  ]);

  page.updateField(rows, 0, "name", "renamed");
  expect(latestTable(onUpdateTable)[0].name).toBe("renamed");

  page.updateField(rows, 0, "value", "SecRule renamed");
  expect(latestTable(onUpdateTable)[0].value).toBe("SecRule renamed");

  page.downRow?.(rows, 0);
  expect(latestTable(onUpdateTable).map(row => row.name)).toEqual(["second", "renamed"]);

  page.upRow?.(rows, 1);
  expect(latestTable(onUpdateTable).map(row => row.name)).toEqual(["second", "renamed"]);

  page.deleteRow?.(rows, 0);
  expect(latestTable(onUpdateTable)).toEqual([rows[1]]);

  const table = page.renderTable(rows);
  expect(table.props.columns.map(column => column.key)).toEqual(["name", "value", "action"]);

  const nameInput = table.props.columns[0].render?.(rows[0].name, rows[0], 0);
  nameInput?.props.onChange({target: {value: "from render"}});
  expect(latestTable(onUpdateTable)[0].name).toBe("from render");

  const valueInput = table.props.columns[1].render?.(rows[0].value, rows[0], 0);
  valueInput?.props.onChange({target: {value: "SecRule from render"}});
  expect(latestTable(onUpdateTable)[0].value).toBe("SecRule from render");

  const firstActionView = render(<>{table.props.columns[2].render?.(undefined, rows[0], 0)}</>);
  clickButtonAt(firstActionView.container, 1);
  expect(latestTable(onUpdateTable).map((row: RuleExpressionRow) => row.name)).toEqual(["second", "from render"]);
  clickButtonAt(firstActionView.container, 2);
  expect(latestTable(onUpdateTable)).toEqual([rows[1]]);
  firstActionView.unmount();

  const secondActionView = render(<>{table.props.columns[2].render?.(undefined, rows[1], 1)}</>);
  clickButtonAt(secondActionView.container, 0);
  expect(latestTable(onUpdateTable).map((row: RuleExpressionRow) => row.name)).toEqual(["second", "from render"]);
  secondActionView.unmount();

  const titleView = render(<>{table.props.title()}</>);
  expect(titleView.getByText("Rule Table")).not.toBeNull();
  clickButtonAt(titleView.container, 0);
  expect(latestTable(onUpdateTable)).toEqual([
    rows[0],
    rows[1],
    {name: "New WAF Rule - 2", operator: "match", value: ""},
  ]);
  clickButtonAt(titleView.container, 1);
  expect(latestTable(onUpdateTable)[0].name).toBe("Enable XML request body parser");

  expect(page.render()).not.toBeNull();
});

test("keeps IP rule tags, operators, defaults and row ordering", () => {
  const empty = createTable(IpRuleTable);
  expect(empty.onUpdateTable).toHaveBeenCalledWith([
    {name: "loopback", operator: "is in", value: "127.0.0.1"},
    {name: "lan cidr", operator: "is in", value: "10.0.0.0/8,192.168.0.0/16"},
  ]);

  const rows = [
    {name: "allow", operator: "is in", value: "127.0.0.1"},
    {name: "deny", operator: "is not in", value: "10.0.0.0/8"},
  ];
  const {page, onUpdateTable} = createTable(IpRuleTable, rows);

  page.updateField(rows, 0, "value", [" 10.0.0.1 ", " 192.168.1.1 "]);
  expect(latestTable(onUpdateTable)[0].value).toBe("10.0.0.1,192.168.1.1");

  page.updateField(rows, 0, "value", "ab");
  expect(latestTable(onUpdateTable)[0].value).toBe("a,b");

  page.updateField(rows, 0, "operator", "is not in");
  expect(latestTable(onUpdateTable)[0].operator).toBe("is not in");

  page.addRow?.(rows);
  expect(latestTable(onUpdateTable)).toEqual([
    rows[0],
    rows[1],
    {name: "New IP Rule - 2", operator: "is in", value: "127.0.0.1"},
  ]);

  page.downRow?.(rows, 0);
  expect(latestTable(onUpdateTable).map(row => row.name)).toEqual(["deny", "allow"]);

  page.upRow?.(rows, 1);
  expect(latestTable(onUpdateTable).map(row => row.name)).toEqual(["deny", "allow"]);

  page.deleteRow?.(rows, 1);
  expect(latestTable(onUpdateTable)).toEqual([rows[0]]);

  const table = page.renderTable(rows);
  const nameInput = table.props.columns[0].render?.(rows[0].name, rows[0], 0);
  nameInput?.props.onChange({target: {value: "allow renamed"}});
  expect(latestTable(onUpdateTable)[0].name).toBe("allow renamed");

  const operatorSelect = table.props.columns[1].render?.(rows[0].operator, rows[0], 0);
  operatorSelect?.props.onChange("is in");
  expect(latestTable(onUpdateTable)[0].operator).toBe("is in");

  const ipTags = table.props.columns[2].render?.(rows[0].value, rows[0], 0);
  ipTags?.props.onChange([" 172.16.0.1 ", " 172.16.0.2 "]);
  expect(latestTable(onUpdateTable)[0].value).toBe("172.16.0.1,172.16.0.2");

  const emptyIpTags = table.props.columns[2].render?.("", {name: "empty", operator: "is in", value: ""}, 0);
  expect(emptyIpTags?.props.value).toEqual([]);

  const actionView = render(<>{table.props.columns[3].render?.(undefined, rows[0], 0)}</>);
  clickButtonAt(actionView.container, 1);
  expect(latestTable(onUpdateTable).map((row: RuleExpressionRow) => row.name)).toEqual(["deny", "allow renamed"]);
  clickButtonAt(actionView.container, 2);
  expect(latestTable(onUpdateTable)).toEqual([rows[1]]);

  const titleView = render(<>{table.props.title()}</>);
  clickButtonAt(titleView.container, 0);
  expect(latestTable(onUpdateTable)[2]).toEqual({name: "New IP Rule - 2", operator: "is in", value: "127.0.0.1"});
  clickButtonAt(titleView.container, 1);
  expect(latestTable(onUpdateTable)[0]).toEqual({name: "loopback", operator: "is in", value: "127.0.0.1"});

  expect(page.render()).not.toBeNull();
});

test("keeps User-Agent defaults, operator updates and blur normalization", () => {
  const empty = createTable(UaRuleTable);
  expect(empty.onUpdateTable).toHaveBeenCalledWith([
    {name: "Current User-Agent", operator: "equals", value: window.navigator.userAgent},
  ]);

  const rows = [
    {name: "current", operator: "equals", value: "Mozilla   Agent"},
    {name: "bot", operator: "contains", value: "bot"},
  ];
  const {page, onUpdateTable} = createTable(UaRuleTable, rows);

  page.addRow?.(rows);
  expect(latestTable(onUpdateTable)).toEqual([
    rows[0],
    rows[1],
    {name: "New UA Rule - 2", operator: "equals", value: ""},
  ]);

  const table = page.renderTable(rows);
  const nameInput = table.props.columns[0].render?.(rows[0].name, rows[0], 0);
  nameInput?.props.onChange({target: {value: "current renamed"}});
  expect(latestTable(onUpdateTable)[0].name).toBe("current renamed");

  const operatorSelect = table.props.columns[1].render?.(rows[0].operator, rows[0], 0);
  operatorSelect?.props.onChange("match");
  expect(latestTable(onUpdateTable)[0].operator).toBe("match");

  const valueInput = table.props.columns[2].render?.(rows[0].value, rows[0], 0);
  valueInput?.props.onChange({target: {value: "  Agent   Value  "}});
  expect(latestTable(onUpdateTable)[0].value).toBe("  Agent   Value  ");

  valueInput?.props.onBlur({target: {value: "  Agent   Value  "}});
  expect(latestTable(onUpdateTable)[0].value).toBe("Agent Value");

  page.downRow?.(rows, 0);
  expect(latestTable(onUpdateTable).map(row => row.name)).toEqual(["bot", "current renamed"]);

  page.upRow?.(rows, 1);
  expect(latestTable(onUpdateTable).map(row => row.name)).toEqual(["bot", "current renamed"]);

  page.deleteRow?.(rows, 1);
  expect(latestTable(onUpdateTable)).toEqual([rows[0]]);

  const actionView = render(<>{table.props.columns[3].render?.(undefined, rows[0], 0)}</>);
  clickButtonAt(actionView.container, 1);
  expect(latestTable(onUpdateTable).map((row: RuleExpressionRow) => row.name)).toEqual(["bot", "current renamed"]);
  clickButtonAt(actionView.container, 2);
  expect(latestTable(onUpdateTable)).toEqual([rows[1]]);

  const titleView = render(<>{table.props.title()}</>);
  clickButtonAt(titleView.container, 0);
  expect(latestTable(onUpdateTable)[2]).toEqual({name: "New UA Rule - 2", operator: "equals", value: ""});
  clickButtonAt(titleView.container, 1);
  expect(latestTable(onUpdateTable)[0]).toEqual({name: "Current User-Agent", operator: "equals", value: window.navigator.userAgent});

  expect(page.render()).not.toBeNull();
});

test("keeps IP rate restore and string conversion without row action controls", () => {
  const empty = createTable(IpRateRuleTable);
  expect(empty.onUpdateTable).toHaveBeenCalledWith([
    {name: "Default IP Rate", operator: "100", value: "6000"},
  ]);

  const rows = [
    {name: "Default IP Rate", operator: "100", value: "6000"},
  ];
  const {page, onUpdateTable} = createTable(IpRateRuleTable, rows);

  page.updateField(rows, 0, "name", "Custom IP Rate");
  expect(latestTable(onUpdateTable)[0].name).toBe("Custom IP Rate");

  page.updateField(rows, 0, "operator", 25);
  expect(latestTable(onUpdateTable)[0].operator).toBe("25");

  page.updateField(rows, 0, "value", 1200);
  expect(latestTable(onUpdateTable)[0].value).toBe("1200");

  page.updateField(rows, 0, "value", null);
  expect(latestTable(onUpdateTable)[0].value).toBe("null");

  page.restore();
  expect(latestTable(onUpdateTable)).toEqual([
    {name: "Default IP Rate", operator: "100", value: "6000"},
  ]);

  const table = page.renderTable(rows);
  expect(table.props.columns.map(column => column.key)).toEqual(["name", "operator", "value"]);
  expect(table.props.columns.some(column => column.key === "action")).toBe(false);

  const nameInput = table.props.columns[0].render?.(rows[0].name, rows[0], 0);
  nameInput?.props.onChange({target: {value: "Rendered IP Rate"}});
  expect(latestTable(onUpdateTable)[0].name).toBe("Rendered IP Rate");

  const rateInput = table.props.columns[1].render?.(rows[0].operator, rows[0], 0);
  rateInput?.props.onChange(60);
  expect(latestTable(onUpdateTable)[0].operator).toBe("60");

  const durationInput = table.props.columns[2].render?.(rows[0].value, rows[0], 0);
  durationInput?.props.onChange(1800);
  expect(latestTable(onUpdateTable)[0].value).toBe("1800");

  const titleView = render(<>{table.props.title()}</>);
  clickButtonAt(titleView.container, 0);
  expect(latestTable(onUpdateTable)).toEqual([
    {name: "Default IP Rate", operator: "100", value: "6000"},
  ]);

  expect(page.render()).not.toBeNull();
});
