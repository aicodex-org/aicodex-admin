/* eslint-env jest */
import React from "react";
import {expect as jestExpect, jest as jestValue} from "@jest/globals";
import {Button} from "antd";
import {cleanup, render} from "@testing-library/react";
import EnterpriseListQueryToolbar from "./EnterpriseListQueryToolbar";

const expect = jestExpect;
const {fireEvent} = require("@testing-library/react") as {
  fireEvent: {
    click: (element: Element | null) => boolean;
    change: (element: Element | null, event: {target: {value: string}}) => boolean;
  };
};
const fs = require("fs") as typeof import("fs");
const path = require("path") as typeof import("path");

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
  expect(view.getByText("群组").closest(".enterprise-list-query-toolbar-title")).not.toBeNull();
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
  expect(view.container.querySelector(".enterprise-list-query-toolbar-advanced")).not.toBeNull();
  expect(view.container.querySelector(".enterprise-list-query-toolbar-advanced")?.textContent).toContain("高级字段");
  expect(document.body.querySelector(".enterprise-list-query-toolbar-popover")).toBeNull();
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

test("can place contextual helper content on the side of query controls", () => {
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
      showHeader={false}
      contextPlacement="side"
      context={<span>目录健康: 3 项待关注</span>}
    />
  );

  const controls = view.container.querySelector(".enterprise-list-query-toolbar-controls");
  const sideContext = view.container.querySelector(".enterprise-list-query-toolbar-side-context");

  expect(sideContext).not.toBeNull();
  expect(sideContext?.textContent).toContain("目录健康");
  expect(controls?.contains(sideContext as Node)).toBe(true);
  expect(view.container.querySelector(".enterprise-list-query-toolbar-context")).toBeNull();
});

test("can place contextual helper content in the header meta area", () => {
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
      contextPlacement="header"
      context={<span>目录健康: 3 项待关注</span>}
      actions={<button type="button">添加</button>}
    />
  );

  const headerMeta = view.container.querySelector(".enterprise-list-query-toolbar-header-meta");
  const headerContext = view.container.querySelector(".enterprise-list-query-toolbar-header-context");

  expect(headerContext).not.toBeNull();
  expect(headerContext?.textContent).toContain("目录健康");
  expect(headerMeta?.contains(headerContext as Node)).toBe(true);
  expect(headerMeta?.querySelector(".enterprise-list-query-toolbar-actions")).not.toBeNull();
  expect(view.container.querySelector(".enterprise-list-query-toolbar-side-context")).toBeNull();
  expect(view.container.querySelector(".enterprise-list-query-toolbar-context")).toBeNull();
});

test("can stack contextual helper content below header actions on the right", () => {
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
      contextPlacement="headerBelow"
      context={<span>目录健康: 3 项待关注</span>}
      actions={<button type="button">添加</button>}
    />
  );

  const headerMeta = view.container.querySelector(".enterprise-list-query-toolbar-header-meta");
  const belowContext = view.container.querySelector(".enterprise-list-query-toolbar-header-below-context");
  const actions = view.container.querySelector(".enterprise-list-query-toolbar-actions");

  expect(belowContext).not.toBeNull();
  expect(belowContext?.textContent).toContain("目录健康");
  expect(headerMeta?.className).toContain("enterprise-list-query-toolbar-header-meta-stacked");
  expect(headerMeta?.contains(actions as Node)).toBe(true);
  expect(headerMeta?.contains(belowContext as Node)).toBe(true);
  expect(actions?.contains(belowContext as Node)).toBe(false);
  expect(view.container.querySelector(".enterprise-list-query-toolbar-header-context")).toBeNull();
  expect(view.container.querySelector(".enterprise-list-query-toolbar-side-context")).toBeNull();
  expect(view.container.querySelector(".enterprise-list-query-toolbar-context")).toBeNull();
});

test("can place header actions at the top right without requiring helper context", () => {
  const view = render(
    <EnterpriseListQueryToolbar
      title="群组"
      total={3}
      fields={[{label: "名称", value: "name"}]}
      selectedField="name"
      keyword=""
      onFieldChange={jestValue.fn()}
      onKeywordChange={jestValue.fn()}
      onSearch={jestValue.fn()}
      onReset={jestValue.fn()}
      actionsPlacement="topRight"
      actions={<button type="button">添加</button>}
    />
  );

  const headerMeta = view.container.querySelector(".enterprise-list-query-toolbar-header-meta");
  const actions = view.container.querySelector(".enterprise-list-query-toolbar-actions");

  expect(headerMeta?.className).toContain("enterprise-list-query-toolbar-header-meta-top-right");
  expect(headerMeta?.contains(actions as Node)).toBe(true);
  expect(view.container.querySelector(".enterprise-list-query-toolbar-header-below-context")).toBeNull();
  expect(view.container.querySelector(".enterprise-list-query-toolbar-header-context")).toBeNull();
  expect(view.container.querySelector(".enterprise-list-query-toolbar-side-context")).toBeNull();
});

test("list page typography uses shared semantic tokens", () => {
  const appLess = fs.readFileSync(path.join(__dirname, "..", "App.less"), "utf8") as string;

  [
    "--list-page-title-font-size",
    "--list-page-control-font-size",
    "--list-page-table-header-font-size",
    "--list-page-table-cell-font-size",
    "--list-page-secondary-font-size",
    "--list-page-action-font-size",
  ].forEach(token => {
    expect(appLess).toContain(token);
  });

  expect(appLess).toMatch(/enterprise-list-query-toolbar-header[\s\S]*ant-typography:first-child[\s\S]*font-size:\s*var\(--list-page-title-font-size\)/);
  expect(appLess).not.toMatch(/organization-identity-compact-list-heading/);
  expect(appLess).toMatch(/ant-table-thead[\s\S]*font-size:\s*var\(--list-page-table-header-font-size\)/);
  expect(appLess).toMatch(/ant-table-tbody[\s\S]*font-size:\s*var\(--list-page-table-cell-font-size\)/);
});

test("list page layout spacing uses shared semantic tokens", () => {
  const appLess = fs.readFileSync(path.join(__dirname, "..", "App.less"), "utf8") as string;

  [
    "--list-page-shell-padding",
    "--list-page-card-margin",
    "--list-page-card-padding",
    "--list-page-panel-border-color",
    "--list-page-panel-border-radius",
    "--list-page-panel-heading-padding",
    "--list-page-panel-body-padding",
    "--list-page-table-title-padding",
    "--list-page-toolbar-shell-padding-bottom",
    "--list-page-toolbar-gap",
    "--list-page-toolbar-control-gap",
    "--list-page-toolbar-context-gap",
    "--list-page-toolbar-advanced-margin-top",
    "--list-page-toolbar-advanced-padding",
    "--list-page-table-header-padding-y",
    "--list-page-table-cell-padding-y",
    "--list-page-advanced-filter-row-gap",
    "--list-page-advanced-filter-column-gap",
    "--list-page-query-field-min-width",
    "--list-page-query-keyword-width",
    "--list-page-query-filter-min-width",
    "--list-page-side-context-max-width",
    "--list-page-scrollbar-thumb-color",
    "--list-page-scrollbar-width",
    "--list-page-scrollbar-radius",
  ].forEach(token => {
    expect(appLess).toContain(token);
  });

  expect(appLess).toMatch(/enterprise-list-table\.ant-table-wrapper \.ant-table-title[\s\S]*padding:\s*var\(--list-page-table-title-padding\)\s*!important/);
  expect(appLess).toMatch(/enterprise-list-toolbar-shell[\s\S]*padding-bottom:\s*var\(--list-page-toolbar-shell-padding-bottom\)/);
  expect(appLess).toMatch(/enterprise-list-query-toolbar \{[\s\S]*gap:\s*var\(--list-page-toolbar-gap\)/);
  expect(appLess).toMatch(/enterprise-list-query-toolbar-title[\s\S]*min-width:\s*0/);
  expect(appLess).toMatch(/enterprise-list-query-toolbar-header[\s\S]*gap:\s*var\(--list-page-toolbar-control-gap\)/);
  expect(appLess).toMatch(/enterprise-list-query-toolbar-header-meta[\s\S]*gap:\s*var\(--list-page-toolbar-control-gap\)/);
  expect(appLess).toMatch(/enterprise-list-query-toolbar-header-meta-stacked[\s\S]*gap:\s*var\(--list-page-toolbar-context-gap\)/);
  expect(appLess).toMatch(/enterprise-list-query-toolbar-header-meta-stacked[\s\S]*width:\s*fit-content/);
  expect(appLess).toMatch(/enterprise-list-query-toolbar-header-meta-stacked[\s\S]*max-width:\s*min\(100%,\s*var\(--list-page-side-context-max-width\)\)/);
  expect(appLess).toMatch(/enterprise-list-query-toolbar-header-meta-top-right[\s\S]*width:\s*fit-content/);
  expect(appLess).toMatch(/enterprise-list-query-toolbar-header-meta-top-right > \.enterprise-list-query-toolbar-actions[\s\S]*align-self:\s*flex-end/);
  expect(appLess).toMatch(/enterprise-list-query-toolbar-header-meta-top-right > \.enterprise-list-query-toolbar-actions[\s\S]*transform:\s*translateY\(-12px\)/);
  expect(appLess).toMatch(/enterprise-list-query-toolbar-header-below-context[\s\S]*width:\s*fit-content/);
  expect(appLess).toMatch(/enterprise-list-query-toolbar-header-below-context[\s\S]*margin-left:\s*auto/);
  expect(appLess).toMatch(/enterprise-list-query-toolbar-header-meta-stacked > \.enterprise-list-query-toolbar-header-below-context[\s\S]*margin-top:\s*8px/);
  expect(appLess).toMatch(/organization-list-directory-context \{[\s\S]*color:\s*rgb\(100 116 139\)/);
  expect(appLess).toMatch(/organization-list-directory-context-text strong[\s\S]*font-weight:\s*600/);
  expect(appLess).toMatch(/organization-list-directory-context-link[\s\S]*font-weight:\s*500/);
  expect(appLess).toMatch(/enterprise-list-query-toolbar-controls[\s\S]*gap:\s*var\(--list-page-toolbar-control-gap\)/);
  expect(appLess).toMatch(/ant-table-thead > tr > th[\s\S]*padding-top:\s*var\(--list-page-table-header-padding-y\)/);
  expect(appLess).toMatch(/ant-table-tbody > tr > td[\s\S]*padding-top:\s*var\(--list-page-table-cell-padding-y\)/);
  expect(appLess).toMatch(/enterprise-list-page-table-shell[\s\S]*min-width:\s*0/);
  expect(appLess).toMatch(/organization-identity-compact-list-page \{[\s\S]*margin:\s*var\(--list-page-card-margin\)/);
  expect(appLess).toMatch(/organization-identity-compact-list-page \{[\s\S]*padding:\s*var\(--list-page-card-padding\)/);
  expect(appLess).toMatch(/organization-identity-compact-list-page \{[\s\S]*border:\s*1px solid var\(--list-page-panel-border-color\)/);
  expect(appLess).toMatch(/organization-identity-compact-list-page \{[\s\S]*border-radius:\s*var\(--list-page-panel-border-radius\)/);
  expect(appLess).not.toMatch(/organization-identity-compact-list-top/);
  expect(appLess).not.toMatch(/organization-identity-compact-list-page \.ant-table-wrapper/);
  expect(appLess).toMatch(/enterprise-list-query-toolbar-field[\s\S]*min-width:\s*var\(--list-page-query-field-min-width\)/);
  expect(appLess).toMatch(/enterprise-list-query-toolbar-keyword[\s\S]*width:\s*var\(--list-page-query-keyword-width\)/);
  expect(appLess).toMatch(/enterprise-list-query-toolbar-filter[\s\S]*min-width:\s*var\(--list-page-query-filter-min-width\)/);
  expect(appLess).toMatch(/enterprise-list-query-toolbar-header-context[\s\S]*max-width:\s*var\(--list-page-side-context-max-width\)/);
  expect(appLess).toMatch(/enterprise-list-query-toolbar-header-below-context[\s\S]*justify-content:\s*flex-end/);
  expect(appLess).toMatch(/enterprise-list-query-toolbar-header-below-context[\s\S]*text-align:\s*right/);
  expect(appLess).toMatch(/enterprise-list-query-toolbar-side-context[\s\S]*max-width:\s*var\(--list-page-side-context-max-width\)/);
  expect(appLess).toMatch(/enterprise-list-table\.ant-table-wrapper \.ant-table-body[\s\S]*scrollbar-color:\s*var\(--list-page-scrollbar-thumb-color\) transparent/);
  expect(appLess).toMatch(/enterprise-list-table\.ant-table-wrapper \.ant-table-body::-webkit-scrollbar[\s\S]*width:\s*var\(--list-page-scrollbar-width\)/);
  expect(appLess).toMatch(/enterprise-list-table\.ant-table-wrapper \.ant-table-body::-webkit-scrollbar-thumb[\s\S]*border-radius:\s*var\(--list-page-scrollbar-radius\)/);
  expect(appLess).not.toMatch(/\.organization-identity-compact-list-page \.ant-table-title/);
  expect(appLess).not.toMatch(/\.group-list-table\.ant-table-wrapper \.ant-table-body/);
});
