/* eslint-env jest */
import React from "react";
import {expect as jestExpect, jest as jestValue} from "@jest/globals";
import {cleanup, render} from "@testing-library/react";
import ListPageTable from "./ListPageTable";

const expect = jestExpect;
const fs = require("fs") as typeof import("fs");
const path = require("path") as typeof import("path");
const {fireEvent} = require("@testing-library/react") as {
  fireEvent: {
    click: (element: Element | null) => boolean;
  };
};

afterEach(() => {
  cleanup();
  jestValue.clearAllMocks();
});

interface TestRecord {
  id: string;
  name: string;
}

const columns = [
  {
    title: "名称",
    dataIndex: "name",
    key: "name",
  },
];

const dataSource: TestRecord[] = [
  {id: "1", name: "Alpha"},
  {id: "2", name: "Beta"},
];

test("renders shared pagination in the list table footer", () => {
  const view = render(
    <ListPageTable<TestRecord>
      columns={columns}
      dataSource={dataSource}
      rowKey="id"
      pagination={{
        current: 1,
        pageSize: 20,
        total: 42,
        showTotal: (total) => `${total} 条记录`,
      }}
    />
  );

  const frame = view.container.querySelector(".enterprise-list-table-frame");
  const footer = view.container.querySelector(".enterprise-list-pagination-footer");
  const table = view.container.querySelector(".enterprise-list-table");
  const paginationNodes = Array.from(view.container.querySelectorAll(".ant-pagination"));

  expect(frame).not.toBeNull();
  expect(table).not.toBeNull();
  expect(footer).not.toBeNull();
  expect(footer?.textContent).toContain("42 条记录");
  expect(footer?.querySelector(".ant-pagination-mini")).not.toBeNull();
  expect(paginationNodes.length).toBeGreaterThan(0);
  expect(paginationNodes.every((node) => footer?.contains(node))).toBe(true);
});

test("keeps table pagination change contract from the shared footer", () => {
  const handleChange = jestValue.fn();
  const view = render(
    <ListPageTable<TestRecord>
      columns={columns}
      dataSource={dataSource}
      rowKey="id"
      pagination={{
        current: 1,
        pageSize: 20,
        total: 42,
      }}
      onChange={handleChange}
    />
  );

  fireEvent.click(view.container.querySelector(".enterprise-list-pagination-footer .ant-pagination-item-2 a") as Element);

  expect(handleChange).toHaveBeenCalledWith(
    expect.objectContaining({
      current: 2,
      pageSize: 20,
      total: 42,
    }),
    {},
    {},
    expect.objectContaining({action: "paginate"})
  );
});

test("lets the table body fill the shared frame above the fixed pagination footer", () => {
  const appLess = fs.readFileSync(path.join(__dirname, "..", "App.less"), "utf8") as string;
  const antTableBlock = appLess.match(/\.enterprise-list-table\.ant-table-wrapper \.ant-table \{([\s\S]*?)\}/)?.[1] ?? "";
  const tableContainerBlock = appLess.match(/\.enterprise-list-table-frame > \.enterprise-list-table\.ant-table-wrapper \.ant-table-container \{([\s\S]*?)\}/)?.[1] ?? "";
  const tableBodyBlock = appLess.match(/\.enterprise-list-table-frame > \.enterprise-list-table\.ant-table-wrapper \.ant-table-body \{([\s\S]*?)\}/)?.[1] ?? "";

  expect(antTableBlock).toContain("display: flex");
  expect(antTableBlock).toContain("flex-direction: column");
  expect(tableContainerBlock).toContain("display: flex");
  expect(tableContainerBlock).toContain("flex: 1 1 auto");
  expect(tableBodyBlock).toContain("flex: 1 1 0");
  expect(tableBodyBlock).toContain("height: auto !important");
});

test("removes the empty-state placeholder divider from shared list tables", () => {
  const appLess = fs.readFileSync(path.join(__dirname, "..", "App.less"), "utf8") as string;
  const emptyPlaceholderCellBlock = appLess.match(/\.enterprise-list-table\.ant-table-wrapper \.ant-table-tbody > tr\.ant-table-placeholder > td \{([\s\S]*?)\}/)?.[1] ?? "";

  expect(emptyPlaceholderCellBlock).toContain("border-bottom: 0");
});

test("keeps the fixed pagination footer compact", () => {
  const appLess = fs.readFileSync(path.join(__dirname, "..", "App.less"), "utf8") as string;
  const footerBlock = appLess.match(/\.enterprise-list-pagination-footer \{([\s\S]*?)\}/)?.[1] ?? "";
  const miniItemBlock = appLess.match(/\.enterprise-list-pagination-footer \.ant-pagination\.ant-pagination-mini \.ant-pagination-item[\s\S]*?\{([\s\S]*?)\}/)?.[1] ?? "";

  expect(footerBlock).toContain("box-sizing: border-box");
  expect(footerBlock).toContain("align-items: flex-end");
  expect(footerBlock).toContain("min-height: 36px");
  expect(footerBlock).toContain("padding: 5px 8px 1px");
  expect(footerBlock).not.toContain("min-height: 46px");
  expect(footerBlock).not.toContain("min-height: 38px");
  expect(footerBlock).not.toContain("align-items: center");
  expect(footerBlock).not.toContain("padding: 8px 8px 0");
  expect(miniItemBlock).toContain("min-width: 28px");
  expect(miniItemBlock).toContain("margin-inline: 2px");
});

test("keeps audit operations list pages bounded so pagination stays at the card bottom", () => {
  const appLess = fs.readFileSync(path.join(__dirname, "..", "App.less"), "utf8") as string;
  const routeBodyBlock = appLess.match(/\.audit-operations-list-route-body \{([\s\S]*?)\}/)?.[1] ?? "";
  const shellBlock = appLess.match(/\.audit-operations-list-route-body > \.audit-operations-list-page-table-shell \{([\s\S]*?)\}/)?.[1] ?? "";

  expect(routeBodyBlock).toContain("display: flex");
  expect(routeBodyBlock).toContain("flex: 1 1 auto");
  expect(routeBodyBlock).toContain("min-height: 0");
  expect(routeBodyBlock).toContain("overflow: hidden");
  expect(shellBlock).toContain("flex: 1 1 auto");
  expect(shellBlock).toContain("margin-top: 0");
});
