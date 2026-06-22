/* eslint-env jest */
import React from "react";
import {expect as jestExpect, jest as jestValue} from "@jest/globals";
import {Button} from "antd";
import {cleanup, render} from "@testing-library/react";
import EnterpriseListQueryToolbar from "./EnterpriseListQueryToolbar";

declare const jest: typeof jestValue;

const expect = jestExpect;
const {fireEvent} = require("@testing-library/react") as {
  fireEvent: {
    click: (element: Element | null) => boolean;
    change: (element: Element | null, event: {target: {value: string}}) => boolean;
  };
};

afterEach(() => {
  cleanup();
  jestValue.clearAllMocks();
});

test("groups query controls, advanced filters and create actions without mixing action slots", () => {
  const onSearch = jestValue.fn();
  const onReset = jestValue.fn();
  const onKeywordChange = jestValue.fn();
  const view = render(
    <EnterpriseListQueryToolbar
      title="群组"
      total={12}
      fields={[
        {label: "名称", value: "name"},
        {label: "显示名", value: "displayName"},
      ]}
      selectedField="name"
      keyword="platform"
      onFieldChange={jestValue.fn()}
      onKeywordChange={onKeywordChange}
      onSearch={onSearch}
      onReset={onReset}
      primaryFilters={<span>类型筛选</span>}
      advancedFilters={<span>高级字段</span>}
      actions={<Button type="primary">新增群组</Button>}
    />
  );

  expect(view.getByText("群组")).not.toBeNull();
  expect(view.getByText(/12/)).not.toBeNull();
  expect(view.getByText("类型筛选")).not.toBeNull();
  expect(view.queryByText("高级字段")).toBeNull();
  expect(view.getByText("新增群组").closest(".enterprise-list-query-toolbar-actions")).not.toBeNull();

  fireEvent.change(view.getByDisplayValue("platform"), {target: {value: "runtime"}});
  fireEvent.click(view.getByText(/查\s*询|Search/));
  fireEvent.click(view.getByText(/重\s*置|Reset/));
  fireEvent.click(view.getByText(/更\s*多\s*筛\s*选|More filters/));

  expect(onKeywordChange).toHaveBeenCalledWith("runtime");
  expect(onSearch).toHaveBeenCalled();
  expect(onReset).toHaveBeenCalled();
  expect(view.getByText("高级字段")).not.toBeNull();
});

test("does not render advanced filter toggle when advanced filters are empty", () => {
  const view = render(
    <EnterpriseListQueryToolbar
      title="组织"
      total={3}
      fields={[{label: "名称", value: "name"}]}
      selectedField="name"
      keyword=""
      onFieldChange={jestValue.fn()}
      onKeywordChange={jestValue.fn()}
      onSearch={jestValue.fn()}
      onReset={jestValue.fn()}
    />
  );

  expect(view.queryByText(/更\s*多\s*筛\s*选|More filters/)).toBeNull();
  expect(view.container.querySelector(".enterprise-list-query-toolbar-advanced")).toBeNull();
});

test("does not render advanced filter toggle for empty advanced filter fragments", () => {
  const view = render(
    <EnterpriseListQueryToolbar
      title="组织"
      total={3}
      fields={[{label: "名称", value: "name"}]}
      selectedField="name"
      keyword=""
      onFieldChange={jestValue.fn()}
      onKeywordChange={jestValue.fn()}
      onSearch={jestValue.fn()}
      onReset={jestValue.fn()}
      advancedFilters={<>{""}</>}
    />
  );

  expect(view.queryByText(/更\s*多\s*筛\s*选|More filters/)).toBeNull();
  expect(view.container.querySelector(".enterprise-list-query-toolbar-advanced")).toBeNull();
});
