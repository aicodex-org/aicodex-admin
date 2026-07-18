import {afterEach, beforeEach, describe, expect, test, vi} from "vitest";
import React from "react";
import {cleanup, render} from "@testing-library/react";
import RuleTable from "./RuleTable";
import * as fs from "fs";
import * as path from "path";
import {fireEvent} from "@testing-library/react";
import {fileURLToPath} from "url";
const testFileDirectory = path.dirname(fileURLToPath(import.meta.url));

interface TestRuleRecord {
  owner: string;
  name: string;
  [key: string]: unknown;
}

interface TestRuleRow {
  owner: string;
  name: string;
}

interface TestTableColumn {
  key?: string;
  render?: (text: unknown, record: TestRuleRow, index: number) => React.ReactNode;
}

interface TestTableElementProps {
  columns: TestTableColumn[];
  title: () => React.ReactNode;
}

let consoleErrorSpy: {mockRestore: () => void};

const account = {owner: "engineering"};
const sources: TestRuleRecord[] = [
  {owner: "engineering", name: "rule-one"},
  {owner: "engineering", name: "rule-two"},
  {owner: "platform", name: "rule-three"},
];

function createTable(options: {
  rules?: string[] | null;
  onUpdateRules?: (rules: string[]) => void;
} = {}) {
  return new RuleTable({
    title: "Rules",
    account,
    sources,
    rules: options.rules === undefined ? ["engineering/rule-one", "engineering/rule-two"] : options.rules,
    onUpdateRules: options.onUpdateRules ?? vi.fn<(rules: string[]) => void>(),
  });
}

describe("RuleTable", () => {
  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation((message?: unknown, ...args: unknown[]) => {
      throw new Error([message, ...args].map(item => `${item}`).join(" "));
    });
  });

  afterEach(() => {
    cleanup();
    consoleErrorSpy.mockRestore();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  test("is migrated from JavaScript to TSX", () => {
    expect(fs.existsSync(path.join(testFileDirectory, "RuleTable.tsx"))).toBe(true);
    expect(fs.existsSync(path.join(testFileDirectory, "RuleTable.js"))).toBe(false);
  });

  test("normalizes null rule arrays to an empty selection", () => {
    const onUpdateRules = vi.fn();

    createTable({rules: null, onUpdateRules});

    expect(onUpdateRules).toHaveBeenCalledWith([]);
  });

  test("converts table rows back to owner/name rule identifiers", () => {
    const onUpdateRules = vi.fn();
    const table = createTable({onUpdateRules});

    table.updateTable([
      {owner: "engineering", name: "rule-two"},
      {owner: "platform", name: "rule-three"},
    ]);

    expect(onUpdateRules).toHaveBeenCalledWith(["engineering/rule-two", "platform/rule-three"]);
  });

  test("adds, deletes and reorders selected rule rows", () => {
    const onUpdateRules = vi.fn();
    const table = createTable({onUpdateRules});
    const selectedRows: TestRuleRow[] = [
      {owner: "engineering", name: "rule-one"},
      {owner: "engineering", name: "rule-two"},
    ];

    table.addRow(selectedRows);
    expect(onUpdateRules).toHaveBeenLastCalledWith(["engineering/rule-one", "engineering/rule-two", "engineering/"]);

    table.deleteRow(selectedRows, 0);
    expect(onUpdateRules).toHaveBeenLastCalledWith(["engineering/rule-two"]);

    table.upRow(selectedRows, 1);
    expect(onUpdateRules).toHaveBeenLastCalledWith(["engineering/rule-two", "engineering/rule-one"]);

    table.downRow(selectedRows, 0);
    expect(onUpdateRules).toHaveBeenLastCalledWith(["engineering/rule-two", "engineering/rule-one"]);

    table.addRow(undefined);
    expect(onUpdateRules).toHaveBeenLastCalledWith(["engineering/"]);
  });

  test("keeps select and toolbar handlers wired", () => {
    const onUpdateRules = vi.fn();
    const table = createTable({onUpdateRules});
    const tableElement = table.renderTable([
      {owner: "engineering", name: "rule-one"},
    ]) as React.ReactElement<TestTableElementProps>;
    const nameColumn = tableElement.props.columns.find(column => column.key === "name");
    const selectNode = nameColumn?.render?.("rule-one", {owner: "engineering", name: "rule-one"}, 0) as React.ReactElement<{onChange: (value: string) => void}>;

    selectNode.props.onChange("rule-two");
    expect(onUpdateRules).toHaveBeenLastCalledWith(["engineering/rule-two"]);

    const toolbarView = render(<>{tableElement.props.title()}</>);
    fireEvent.click(toolbarView.getByText(/添\s*加|Add/));
    expect(onUpdateRules).toHaveBeenLastCalledWith(["engineering/rule-two", "engineering/"]);
  });

  test("keeps row action buttons and render conversion wired", () => {
    const onUpdateRules = vi.fn();
    const table = createTable({onUpdateRules});
    const rows = [
      {owner: "engineering", name: "rule-one"},
      {owner: "engineering", name: "rule-two"},
    ];
    const tableElement = table.renderTable(rows) as React.ReactElement<TestTableElementProps>;
    const actionColumn = tableElement.props.columns.find(column => column.key === "action");
    const firstActionNode = actionColumn?.render?.(undefined, rows[0], 0) as React.ReactElement<{children: React.ReactNode}>;
    const firstActionButtons = React.Children.toArray(firstActionNode.props.children)
      .map(child => (child as React.ReactElement<{children: React.ReactElement<{onClick: () => void}>}>).props.children);

    firstActionButtons[1].props.onClick();
    expect(onUpdateRules).toHaveBeenLastCalledWith(["engineering/rule-two", "engineering/rule-one"]);

    firstActionButtons[2].props.onClick();
    expect(onUpdateRules).toHaveBeenLastCalledWith(["engineering/rule-two"]);

    const secondActionNode = actionColumn?.render?.(undefined, rows[1], 1) as React.ReactElement<{children: React.ReactNode}>;
    const secondActionButtons = React.Children.toArray(secondActionNode.props.children)
      .map(child => (child as React.ReactElement<{children: React.ReactElement<{onClick: () => void}>}>).props.children);

    secondActionButtons[0].props.onClick();
    expect(onUpdateRules).toHaveBeenLastCalledWith(["engineering/rule-two", "engineering/rule-one"]);

    expect(React.isValidElement(table.render())).toBe(true);
    expect(React.isValidElement(createTable({rules: null}).render())).toBe(true);
  });
});
